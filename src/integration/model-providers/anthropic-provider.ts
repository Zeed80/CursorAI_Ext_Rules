/**
 * Провайдер для Anthropic Claude
 * Использует Anthropic API
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { BaseModelProvider, ModelProviderType, ModelInfo, CallOptions, CallResult, ProviderConfig } from './base-provider';

interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    content: Array<{
        type: string;
        text: string;
    }>;
    model: string;
    stop_reason: string;
    stop_sequence?: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

export class AnthropicProvider extends BaseModelProvider {
    private baseUrl: string;
    private timeout: number;
    private defaultModel: string = 'claude-3-sonnet-20240229';

    constructor(config: ProviderConfig) {
        const modelInfo: ModelInfo = {
            id: config.model || 'claude-3-sonnet-20240229',
            name: config.model || 'Claude 3 Sonnet',
            provider: 'anthropic',
            type: 'cloud',
            description: 'Anthropic Claude модель',
            maxTokens: 4096,
            supportsStreaming: true,
            costPerToken: {
                input: 0.000003,   // $3 за 1M токенов
                output: 0.000015   // $15 за 1M токенов
            }
        };

        super(config, modelInfo);
        this.defaultModel = config.model || 'claude-3-sonnet-20240229';
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
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
                        'x-api-key': this.config.apiKey || '',
                        'anthropic-version': '2023-06-01'
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
                            // Anthropic может вернуть 400 для проверки доступности (это нормально)
                            if (res.statusCode && (res.statusCode === 200 || (res.statusCode === 400 && method === 'POST' && path === '/messages'))) {
                                if (res.statusCode === 200) {
                                    const parsed = JSON.parse(data);
                                    resolve(parsed as T);
                                } else {
                                    // 400 означает, что API доступен, но запрос некорректный
                                    resolve({} as T);
                                }
                            } else {
                                reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${data}`));
                            }
                        } catch (error: any) {
                            reject(new Error(`Failed to parse response: ${error.message}, body: ${data}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error(`AnthropicProvider: Request error for ${this.baseUrl}${path}:`, error);
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
                console.error(`AnthropicProvider: Error making request to ${this.baseUrl}${path}:`, error);
                reject(error);
            }
        });
    }

    getProviderType(): ModelProviderType {
        return 'anthropic';
    }

    async isAvailable(): Promise<boolean> {
        if (!this.config.apiKey) {
            return false;
        }

        try {
            const originalTimeout = this.timeout;
            this.timeout = 5000; // 5 секунд для проверки
            
            try {
                // Проверяем доступность через простой запрос
                await this.makeRequest('/messages', 'POST', {
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'test' }]
                });
                this.timeout = originalTimeout;
                return true;
            } catch (error: any) {
                // 400 ошибка означает, что API доступен, но запрос некорректный (это нормально для проверки)
                if (error.message && error.message.includes('400')) {
                    this.timeout = originalTimeout;
                    return true;
                }
                throw error;
            } finally {
                this.timeout = originalTimeout;
            }
        } catch (error) {
            console.debug('AnthropicProvider: Not available:', error);
            return false;
        }
    }

    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        if (!this.config.apiKey) {
            throw new Error('Anthropic API key is not configured');
        }

        const startTime = Date.now();
        const model = options?.model || this.config.model || this.defaultModel;

        try {
            const requestBody: any = {
                model: model,
                max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 1000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            };

            if (options?.temperature !== undefined) {
                requestBody.temperature = options.temperature;
            } else if (this.config.temperature !== undefined) {
                requestBody.temperature = this.config.temperature;
            }

            if (options?.topP !== undefined) {
                requestBody.top_p = options.topP;
            }

            if (options?.stopSequences && options.stopSequences.length > 0) {
                requestBody.stop_sequences = options.stopSequences;
            }

            const response = await this.makeRequest<ClaudeResponse>('/messages', 'POST', requestBody);
            const responseTime = Date.now() - startTime;

            if (!response.content || response.content.length === 0) {
                throw new Error('No response from Anthropic Claude');
            }

            const text = response.content[0].text;
            const usage = response.usage;

            // Расчет стоимости
            const cost = (usage.input_tokens * this.modelInfo.costPerToken!.input) +
                        (usage.output_tokens * this.modelInfo.costPerToken!.output);

            return {
                text,
                tokensUsed: {
                    input: usage.input_tokens,
                    output: usage.output_tokens
                },
                cost,
                responseTime
            };
        } catch (error: any) {
            console.error('AnthropicProvider: Error calling model:', error);
            throw new Error(`Anthropic provider error: ${error.message}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        // Anthropic API не предоставляет endpoint для списка моделей
        // Возвращаем список известных моделей
        return [
            {
                id: 'claude-3-opus-20240229',
                name: 'Claude 3 Opus',
                provider: 'anthropic',
                type: 'cloud',
                description: 'Anthropic Claude 3 Opus (самая мощная модель)',
                maxTokens: 4096,
                supportsStreaming: true,
                costPerToken: { input: 0.000015, output: 0.000075 }
            },
            {
                id: 'claude-3-sonnet-20240229',
                name: 'Claude 3 Sonnet',
                provider: 'anthropic',
                type: 'cloud',
                description: 'Anthropic Claude 3 Sonnet (баланс качества и скорости)',
                maxTokens: 4096,
                supportsStreaming: true,
                costPerToken: { input: 0.000003, output: 0.000015 }
            },
            {
                id: 'claude-3-haiku-20240307',
                name: 'Claude 3 Haiku',
                provider: 'anthropic',
                type: 'cloud',
                description: 'Anthropic Claude 3 Haiku (быстрая и дешевая)',
                maxTokens: 4096,
                supportsStreaming: true,
                costPerToken: { input: 0.00000025, output: 0.00000125 }
            }
        ];
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
