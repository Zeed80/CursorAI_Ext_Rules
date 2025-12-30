/**
 * Провайдер для Ollama (локальные модели)
 * Использует Ollama REST API
 */

import axios, { AxiosInstance } from 'axios';
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
    private axiosInstance: AxiosInstance;
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

        // Создаем axios instance для Ollama API
        const baseUrl = config.baseUrl || 'http://localhost:11434';
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: config.timeout || 120000 // Больше таймаут для локальных моделей
        });
    }

    getProviderType(): ModelProviderType {
        return 'ollama';
    }

    async isAvailable(): Promise<boolean> {
        try {
            // Проверяем доступность через список моделей
            const response = await this.axiosInstance.get('/api/tags', {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            console.debug('OllamaProvider: Not available:', error);
            return false;
        }
    }

    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        const startTime = Date.now();
        const model = options?.model || this.config.model || this.defaultModel;

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

            const response = await this.axiosInstance.post<OllamaResponse>('/api/generate', requestBody);
            const responseTime = Date.now() - startTime;

            if (!response.data.response) {
                throw new Error('No response from Ollama');
            }

            const text = response.data.response;

            // Оценка токенов (примерно 4 символа = 1 токен)
            const inputTokens = response.data.prompt_eval_count || Math.ceil(prompt.length / 4);
            const outputTokens = response.data.eval_count || Math.ceil(text.length / 4);

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
            if (error.response) {
                throw new Error(`Ollama API error: ${error.response.status} - ${error.response.data?.error || error.message}`);
            }
            throw new Error(`Ollama provider error: ${error.message}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        try {
            const response = await this.axiosInstance.get<{ models: OllamaModel[] }>('/api/tags');
            const models = response.data.models || [];

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
}
