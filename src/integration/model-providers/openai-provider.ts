/**
 * Провайдер для OpenAI (ChatGPT)
 * Использует OpenAI REST API
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
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
    private baseUrl: string;
    private timeout: number;
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
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.timeout = config.timeout || 60000;
    }

    /**
     * Выполнить HTTP запрос через встроенные модули Node.js
     */
    private async makeRequest<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(path, this.baseUrl);
                const isHttps = url.protocol === 'https:';
                const httpModule = isHttps ? https : http;

                const port = url.port ? parseInt(url.port) : (isHttps ? 443 : 80);
                const options = {
                    hostname: url.hostname,
                    port: port,
                    path: url.pathname + url.search,
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey || ''}`
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
                    console.error(`OpenAIProvider: Request error for ${this.baseUrl}${path}:`, error);
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
                console.error(`OpenAIProvider: Error making request to ${this.baseUrl}${path}:`, error);
                reject(error);
            }
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
            const originalTimeout = this.timeout;
            this.timeout = 5000; // 5 секунд для проверки
            
            try {
                await this.makeRequest<{ data: any[] }>('/models', 'GET');
                this.timeout = originalTimeout;
                return true;
            } finally {
                this.timeout = originalTimeout;
            }
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

            const response = await this.makeRequest<OpenAIResponse>('/chat/completions', 'POST', requestBody);
            const responseTime = Date.now() - startTime;

            if (!response.choices || response.choices.length === 0) {
                throw new Error('No response from OpenAI');
            }

            const text = response.choices[0].message.content;
            const usage = response.usage;

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
            throw new Error(`OpenAI provider error: ${error.message}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        try {
            const response = await this.makeRequest<{ data: any[] }>('/models', 'GET');
            const models = response.data || [];

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
