/**
 * Провайдер для Ollama (локальные модели)
 * Использует Ollama REST API
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { BaseModelProvider, ModelProviderType, ModelInfo, CallOptions, CallResult, ProviderConfig } from './base-provider';

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        parent_model: string;
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}

export class OllamaProvider extends BaseModelProvider {
    private baseUrl: string;
    private timeout: number;
    private defaultModel: string = 'llama2';

    constructor(config: ProviderConfig) {
        const modelInfo: ModelInfo = {
            id: config.model || 'llama2',
            name: config.model || 'Llama 2',
            provider: 'ollama',
            type: 'local',
            description: 'Ollama локальная модель',
            maxTokens: 4096,
            supportsStreaming: true,
            costPerToken: {
                input: 0,  // Локальные модели бесплатны
                output: 0
            }
        };

        super(config, modelInfo);
        this.defaultModel = config.model || 'llama2';
        this.baseUrl = config.baseUrl || 'http://localhost:11434';
        this.timeout = config.timeout || 120000;
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
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                };
                
                console.log(`OllamaProvider: Making ${method} request to ${url.hostname}:${port}${url.pathname}`);

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
                    console.error(`OllamaProvider: Request error for ${this.baseUrl}${path}:`, error);
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
                console.error(`OllamaProvider: Error making request to ${this.baseUrl}${path}:`, error);
                reject(error);
            }
        });
    }

    getProviderType(): ModelProviderType {
        return 'ollama';
    }

    async isAvailable(): Promise<boolean> {
        try {
            console.log(`OllamaProvider: Checking availability at ${this.baseUrl}/api/tags`);
            // Используем короткий таймаут для проверки доступности
            const originalTimeout = this.timeout;
            this.timeout = 5000; // 5 секунд для проверки
            
            try {
                // Проверяем доступность через список моделей
                const response = await this.makeRequest<{ models: OllamaModel[] }>('/api/tags', 'GET');
                console.log(`OllamaProvider: Available! Response received, models count: ${response.models?.length || 0}`);
                this.timeout = originalTimeout; // Восстанавливаем таймаут
                return true;
            } finally {
                this.timeout = originalTimeout; // Восстанавливаем таймаут в любом случае
            }
        } catch (error: any) {
            const errorMsg = error.message || String(error);
            console.error(`OllamaProvider: Not available at ${this.baseUrl}:`, errorMsg);
            if (error.code) {
                console.error(`OllamaProvider: Error code: ${error.code}`);
            }
            return false;
        }
    }

    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        const startTime = Date.now();
        const model = options?.model || this.config.model || this.defaultModel;

        console.log(`OllamaProvider: Calling model "${model}"`);
        console.log(`OllamaProvider: options.model = ${options?.model}`);
        console.log(`OllamaProvider: this.config.model = ${this.config.model}`);
        console.log(`OllamaProvider: this.defaultModel = ${this.defaultModel}`);
        console.log(`OllamaProvider: Selected model = ${model}`);

        try {
            const requestBody: any = {
                model: model,
                prompt: prompt,
                stream: false
            };

            if (options?.temperature !== undefined) {
                requestBody.options = {
                    temperature: options.temperature
                };
            } else if (this.config.temperature !== undefined) {
                requestBody.options = {
                    temperature: this.config.temperature
                };
            }

            if (options?.maxTokens !== undefined) {
                if (!requestBody.options) {
                    requestBody.options = {};
                }
                requestBody.options.num_predict = options.maxTokens;
            } else if (this.config.maxTokens !== undefined) {
                if (!requestBody.options) {
                    requestBody.options = {};
                }
                requestBody.options.num_predict = this.config.maxTokens;
            }

            if (options?.topP !== undefined) {
                if (!requestBody.options) {
                    requestBody.options = {};
                }
                requestBody.options.top_p = options.topP;
            }

            if (options?.stopSequences && options.stopSequences.length > 0) {
                requestBody.options = requestBody.options || {};
                requestBody.options.stop = options.stopSequences;
            }

            const response = await this.makeRequest<OllamaResponse>('/api/generate', 'POST', requestBody);
            const responseTime = Date.now() - startTime;

            if (!response.response) {
                throw new Error('No response from Ollama');
            }

            const text = response.response;

            // Оценка токенов (примерно 4 символа = 1 токен)
            const inputTokens = response.prompt_eval_count || Math.ceil(prompt.length / 4);
            const outputTokens = response.eval_count || Math.ceil(text.length / 4);

            return {
                text,
                tokensUsed: {
                    input: inputTokens,
                    output: outputTokens
                },
                cost: 0, // Локальные модели бесплатны
                responseTime
            };
        } catch (error: any) {
            console.error('OllamaProvider: Error calling model:', error);
            throw new Error(`Ollama provider error: ${error.message || error}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        try {
            console.log(`OllamaProvider: Getting available models from ${this.baseUrl}/api/tags`);
            const response = await this.makeRequest<{ models: OllamaModel[] }>('/api/tags', 'GET');
            const models = response.models || [];
            console.log(`OllamaProvider: Found ${models.length} models`);

            return models.map((model: OllamaModel) => ({
                id: model.name,
                name: model.name,
                provider: 'ollama' as ModelProviderType,
                type: 'local' as const,
                description: `Ollama модель: ${model.name} (${model.details?.parameter_size || 'unknown'})`,
                maxTokens: 4096,
                supportsStreaming: true,
                costPerToken: { input: 0, output: 0 }
            }));
        } catch (error) {
            console.error('OllamaProvider: Error getting available models:', error);
            // Возвращаем список популярных моделей по умолчанию
            return [
                {
                    id: 'llama2',
                    name: 'Llama 2',
                    provider: 'ollama',
                    type: 'local',
                    description: 'Meta Llama 2',
                    maxTokens: 4096,
                    supportsStreaming: true,
                    costPerToken: { input: 0, output: 0 }
                },
                {
                    id: 'mistral',
                    name: 'Mistral',
                    provider: 'ollama',
                    type: 'local',
                    description: 'Mistral AI модель',
                    maxTokens: 4096,
                    supportsStreaming: true,
                    costPerToken: { input: 0, output: 0 }
                },
                {
                    id: 'codellama',
                    name: 'CodeLlama',
                    provider: 'ollama',
                    type: 'local',
                    description: 'CodeLlama для программирования',
                    maxTokens: 4096,
                    supportsStreaming: true,
                    costPerToken: { input: 0, output: 0 }
                }
            ];
        }
    }

    updateConfig(config: Partial<ProviderConfig>): void {
        console.log(`OllamaProvider: Updating config:`, JSON.stringify(config));
        console.log(`OllamaProvider: Current config before update:`, JSON.stringify(this.config));
        
        super.updateConfig(config);
        
        console.log(`OllamaProvider: Current config after update:`, JSON.stringify(this.config));
        
        // Обновляем baseUrl если изменился
        if (config.baseUrl) {
            this.baseUrl = config.baseUrl;
            console.log(`OllamaProvider: Updated baseURL to ${this.baseUrl}`);
        }
        
        // Обновляем timeout если изменился
        if (config.timeout !== undefined) {
            this.timeout = config.timeout;
            console.log(`OllamaProvider: Updated timeout to ${this.timeout}ms`);
        }
        
        // Обновляем defaultModel если изменился
        if (config.model) {
            this.defaultModel = config.model;
            console.log(`OllamaProvider: Updated defaultModel to ${this.defaultModel}`);
        }
    }
}
