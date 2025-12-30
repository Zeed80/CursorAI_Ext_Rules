/**
 * Провайдер для Anthropic Claude
 * Использует Anthropic API
 */

import axios, { AxiosInstance } from 'axios';
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
    private axiosInstance: AxiosInstance;
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

        // Создаем axios instance для Anthropic API
        this.axiosInstance = axios.create({
            baseURL: config.baseUrl || 'https://api.anthropic.com/v1',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey || '',
                'anthropic-version': '2023-06-01'
            },
            timeout: config.timeout || 60000
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
            // Проверяем доступность через простой запрос
            const response = await this.axiosInstance.post('/messages', {
                model: 'claude-3-sonnet-20240229',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'test' }]
            }, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error: any) {
            // 400 ошибка означает, что API доступен, но запрос некорректный (это нормально для проверки)
            if (error.response && error.response.status === 400) {
                return true;
            }
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

            const response = await this.axiosInstance.post<ClaudeResponse>('/messages', requestBody);
            const responseTime = Date.now() - startTime;

            if (!response.data.content || response.data.content.length === 0) {
                throw new Error('No response from Anthropic Claude');
            }

            const text = response.data.content[0].text;
            const usage = response.data.usage;

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
            if (error.response) {
                throw new Error(`Anthropic API error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
            }
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
}
