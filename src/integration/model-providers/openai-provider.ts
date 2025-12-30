/**
 * Провайдер для OpenAI (ChatGPT)
 * Использует OpenAI REST API
 */

import axios, { AxiosInstance } from 'axios';
import { BaseModelProvider, ModelProviderType, ModelInfo, CallOptions, CallResult, ProviderConfig } from './base-provider';

interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class OpenAIProvider extends BaseModelProvider {
    private axiosInstance: AxiosInstance;
    private defaultModel: string = 'gpt-3.5-turbo';

    constructor(config: ProviderConfig) {
        const modelInfo: ModelInfo = {
            id: config.model || 'gpt-3.5-turbo',
            name: config.model || 'GPT-3.5 Turbo',
            provider: 'openai',
            type: 'cloud',
            description: 'OpenAI ChatGPT модель',
            maxTokens: 4096,
            supportsStreaming: true,
            costPerToken: {
                input: 0.0000015,  // $0.0015 за 1K токенов
                output: 0.000002   // $0.002 за 1K токенов
            }
        };

        super(config, modelInfo);
        this.defaultModel = config.model || 'gpt-3.5-turbo';

        // Создаем axios instance с базовым URL и заголовками
        this.axiosInstance = axios.create({
            baseURL: config.baseUrl || 'https://api.openai.com/v1',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey || ''}`
            },
            timeout: config.timeout || 60000
        });
    }

    getProviderType(): ModelProviderType {
        return 'openai';
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
            console.debug('OpenAIProvider: Not available:', error);
            return false;
        }
    }

    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API key is not configured');
        }

        const startTime = Date.now();
        const model = options?.model || this.config.model || this.defaultModel;

        try {
            const requestBody: any = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: options?.temperature ?? this.config.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 1000
            };

            if (options?.topP !== undefined) {
                requestBody.top_p = options.topP;
            }
            if (options?.frequencyPenalty !== undefined) {
                requestBody.frequency_penalty = options.frequencyPenalty;
            }
            if (options?.presencePenalty !== undefined) {
                requestBody.presence_penalty = options.presencePenalty;
            }
            if (options?.stopSequences && options.stopSequences.length > 0) {
                requestBody.stop = options.stopSequences;
            }

            const response = await this.axiosInstance.post<OpenAIResponse>('/chat/completions', requestBody);
            const responseTime = Date.now() - startTime;

            if (!response.data.choices || response.data.choices.length === 0) {
                throw new Error('No response from OpenAI');
            }

            const text = response.data.choices[0].message.content;
            const usage = response.data.usage;

            // Расчет стоимости
            const cost = (usage.prompt_tokens * this.modelInfo.costPerToken!.input) +
                        (usage.completion_tokens * this.modelInfo.costPerToken!.output);

            return {
                text,
                tokensUsed: {
                    input: usage.prompt_tokens,
                    output: usage.completion_tokens
                },
                cost,
                responseTime
            };
        } catch (error: any) {
            console.error('OpenAIProvider: Error calling model:', error);
            if (error.response) {
                throw new Error(`OpenAI API error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
            }
            throw new Error(`OpenAI provider error: ${error.message}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        try {
            const response = await this.axiosInstance.get('/models');
            const models = response.data.data || [];

            return models
                .filter((model: any) => model.id.includes('gpt'))
                .map((model: any) => ({
                    id: model.id,
                    name: model.id,
                    provider: 'openai' as ModelProviderType,
                    type: 'cloud' as const,
                    description: `OpenAI модель: ${model.id}`,
                    maxTokens: model.context_window || 4096,
                    supportsStreaming: true,
                    costPerToken: this.getCostForModel(model.id)
                }));
        } catch (error) {
            console.error('OpenAIProvider: Error getting available models:', error);
            // Возвращаем список популярных моделей по умолчанию
            return [
                {
                    id: 'gpt-4',
                    name: 'GPT-4',
                    provider: 'openai',
                    type: 'cloud',
                    description: 'OpenAI GPT-4',
                    maxTokens: 8192,
                    supportsStreaming: true,
                    costPerToken: { input: 0.00003, output: 0.00006 }
                },
                {
                    id: 'gpt-3.5-turbo',
                    name: 'GPT-3.5 Turbo',
                    provider: 'openai',
                    type: 'cloud',
                    description: 'OpenAI GPT-3.5 Turbo',
                    maxTokens: 4096,
                    supportsStreaming: true,
                    costPerToken: { input: 0.0000015, output: 0.000002 }
                }
            ];
        }
    }

    private getCostForModel(modelId: string): { input: number; output: number } {
        // Стоимость токенов для разных моделей OpenAI
        if (modelId.includes('gpt-4')) {
            return { input: 0.00003, output: 0.00006 };
        } else if (modelId.includes('gpt-3.5-turbo')) {
            return { input: 0.0000015, output: 0.000002 };
        }
        return { input: 0.0000015, output: 0.000002 }; // По умолчанию
    }
}
