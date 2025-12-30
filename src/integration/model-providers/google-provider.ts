/**
 * Провайдер для Google Gemini
 * Использует Google Generative AI API
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
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
    private baseUrl: string;
    private timeout: number;
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
        this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        this.timeout = config.timeout || 60000;
    }

    /**
     * Выполнить HTTP запрос через встроенные модули Node.js
     */
    private async makeRequest<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(path, this.baseUrl);
                // Добавляем API ключ в query параметры
                url.searchParams.set('key', this.config.apiKey || '');
                
                const isHttps = url.protocol === 'https:';
                const httpModule = isHttps ? https : http;

                const port = url.port ? parseInt(url.port) : (isHttps ? 443 : 80);
                const options = {
                    hostname: url.hostname,
                    port: port,
                    path: url.pathname + url.search,
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                };

                const req = httpModule.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk.toString();
                    });

                    res.on('end', () => {
                        try {
                            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                                const parsed = JSON.parse(data);
                                resolve(parsed as T);
                            } else {
                                reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${data}`));
                            }
                        } catch (error: any) {
                            reject(new Error(`Failed to parse response: ${error.message}, body: ${data}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error(`GoogleProvider: Request error for ${this.baseUrl}${path}:`, error);
                    reject(error);
                });

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error(`Request timeout after ${this.timeout}ms`));
                });

                if (body) {
                    req.write(JSON.stringify(body));
                }

                req.end();
            } catch (error: any) {
                console.error(`GoogleProvider: Error making request to ${this.baseUrl}${path}:`, error);
                reject(error);
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
            const originalTimeout = this.timeout;
            this.timeout = 5000; // 5 секунд для проверки
            
            try {
                await this.makeRequest<{ models: any[] }>('/models', 'GET');
                this.timeout = originalTimeout;
                return true;
            } finally {
                this.timeout = originalTimeout;
            }
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

            const response = await this.makeRequest<GeminiResponse>(
                `/models/${model}:generateContent`,
                'POST',
                requestBody
            );
            const responseTime = Date.now() - startTime;

            if (!response.candidates || response.candidates.length === 0) {
                throw new Error('No response from Google Gemini');
            }

            const text = response.candidates[0].content.parts[0].text;
            const usage = response.usageMetadata;

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
            throw new Error(`Google provider error: ${error.message}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        try {
            const response = await this.makeRequest<{ models: any[] }>('/models', 'GET');
            const models = response.models || [];

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

    updateConfig(config: Partial<ProviderConfig>): void {
        super.updateConfig(config);
        
        if (config.baseUrl) {
            this.baseUrl = config.baseUrl;
        }
        
        if (config.timeout !== undefined) {
            this.timeout = config.timeout;
        }
        
        if (config.model) {
            this.defaultModel = config.model;
        }
    }
}
