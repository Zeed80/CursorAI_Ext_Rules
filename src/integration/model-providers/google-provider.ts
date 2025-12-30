/**
 * Провайдер для Google Gemini
 * Использует Google Generative AI API
 */

import axios, { AxiosInstance } from 'axios';
import { BaseModelProvider, ModelProviderType, ModelInfo, CallOptions, CallResult, ProviderConfig } from './base-provider';

interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
            role: string;
        };
        finishReason: string;
        index: number;
        safetyRatings: Array<{
            category: string;
            probability: string;
        }>;
    }>;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}

export class GoogleProvider extends BaseModelProvider {
    private axiosInstance: AxiosInstance;
    private defaultModel: string = 'gemini-pro';

    constructor(config: ProviderConfig) {
        const modelInfo: ModelInfo = {
            id: config.model || 'gemini-pro',
            name: config.model || 'Gemini Pro',
            provider: 'google',
            type: 'cloud',
            description: 'Google Gemini модель',
            maxTokens: 8192,
            supportsStreaming: true,
            costPerToken: {
                input: 0.00000025,  // $0.25 за 1M токенов
                output: 0.0000005   // $0.50 за 1M токенов
            }
        };

        super(config, modelInfo);
        this.defaultModel = config.model || 'gemini-pro';

        // Создаем axios instance для Google Generative AI API
        this.axiosInstance = axios.create({
            baseURL: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: config.timeout || 60000,
            params: {
                key: config.apiKey || ''
            }
        });
    }

    getProviderType(): ModelProviderType {
        return 'google';
    }

    async isAvailable(): Promise<boolean> {
        if (!this.config.apiKey) {
            return false;
        }

        try {
            // Проверяем доступность через список моделей
            const response = await this.axiosInstance.get('/models', {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            console.debug('GoogleProvider: Not available:', error);
            return false;
        }
    }

    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        if (!this.config.apiKey) {
            throw new Error('Google API key is not configured');
        }

        const startTime = Date.now();
        const model = options?.model || this.config.model || this.defaultModel;

        try {
            const requestBody: any = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: options?.temperature ?? this.config.temperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens ?? this.config.maxTokens ?? 1000,
                    topP: options?.topP ?? 0.95,
                    topK: 40
                }
            };

            if (options?.stopSequences && options.stopSequences.length > 0) {
                requestBody.generationConfig.stopSequences = options.stopSequences;
            }

            const response = await this.axiosInstance.post<GeminiResponse>(
                `/models/${model}:generateContent`,
                requestBody
            );
            const responseTime = Date.now() - startTime;

            if (!response.data.candidates || response.data.candidates.length === 0) {
                throw new Error('No response from Google Gemini');
            }

            const text = response.data.candidates[0].content.parts[0].text;
            const usage = response.data.usageMetadata;

            // Расчет стоимости
            let cost = 0;
            if (usage) {
                cost = (usage.promptTokenCount * this.modelInfo.costPerToken!.input) +
                       (usage.candidatesTokenCount * this.modelInfo.costPerToken!.output);
            }

            return {
                text,
                tokensUsed: usage ? {
                    input: usage.promptTokenCount,
                    output: usage.candidatesTokenCount
                } : undefined,
                cost,
                responseTime
            };
        } catch (error: any) {
            console.error('GoogleProvider: Error calling model:', error);
            if (error.response) {
                throw new Error(`Google API error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
            }
            throw new Error(`Google provider error: ${error.message}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        try {
            const response = await this.axiosInstance.get('/models');
            const models = response.data.models || [];

            return models
                .filter((model: any) => model.name.includes('gemini'))
                .map((model: any) => ({
                    id: model.name.replace('models/', ''),
                    name: model.displayName || model.name,
                    provider: 'google' as ModelProviderType,
                    type: 'cloud' as const,
                    description: `Google Gemini модель: ${model.displayName || model.name}`,
                    maxTokens: 8192,
                    supportsStreaming: true,
                    costPerToken: { input: 0.00000025, output: 0.0000005 }
                }));
        } catch (error) {
            console.error('GoogleProvider: Error getting available models:', error);
            // Возвращаем список популярных моделей по умолчанию
            return [
                {
                    id: 'gemini-pro',
                    name: 'Gemini Pro',
                    provider: 'google',
                    type: 'cloud',
                    description: 'Google Gemini Pro',
                    maxTokens: 8192,
                    supportsStreaming: true,
                    costPerToken: { input: 0.00000025, output: 0.0000005 }
                },
                {
                    id: 'gemini-pro-vision',
                    name: 'Gemini Pro Vision',
                    provider: 'google',
                    type: 'cloud',
                    description: 'Google Gemini Pro Vision',
                    maxTokens: 4096,
                    supportsStreaming: true,
                    costPerToken: { input: 0.00000025, output: 0.0000005 }
                }
            ];
        }
    }
}
