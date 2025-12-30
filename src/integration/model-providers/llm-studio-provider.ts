/**
 * Провайдер для LLM Studio
 * LLM Studio обычно использует Ollama под капотом, поэтому это обертка над OllamaProvider
 * или может использовать собственный API, если доступен
 */

import { BaseModelProvider, ModelProviderType, ModelInfo, CallOptions, CallResult, ProviderConfig } from './base-provider';
import { OllamaProvider } from './ollama-provider';

export class LLMStudioProvider extends BaseModelProvider {
    private ollamaProvider: OllamaProvider;
    private defaultModel: string = 'llama2';

    constructor(config: ProviderConfig) {
        const modelInfo: ModelInfo = {
            id: config.model || 'llama2',
            name: config.model || 'LLM Studio Model',
            provider: 'llm-studio',
            type: 'local',
            description: 'LLM Studio локальная модель',
            maxTokens: 4096,
            supportsStreaming: true,
            costPerToken: {
                input: 0,  // Локальные модели бесплатны
                output: 0
            }
        };

        super(config, modelInfo);
        this.defaultModel = config.model || 'llama2';

        // LLM Studio обычно работает на том же порту, что и Ollama, или на другом порту
        // По умолчанию используем стандартный порт Ollama, но можно настроить
        const llmStudioConfig: ProviderConfig = {
            ...config,
            baseUrl: config.baseUrl || 'http://localhost:11434' // LLM Studio может использовать другой порт
        };

        // Используем OllamaProvider под капотом, так как LLM Studio обычно совместим с Ollama API
        this.ollamaProvider = new OllamaProvider(llmStudioConfig);
    }

    getProviderType(): ModelProviderType {
        return 'llm-studio';
    }

    async isAvailable(): Promise<boolean> {
        // Проверяем доступность через Ollama API
        return await this.ollamaProvider.isAvailable();
    }

    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        // Делегируем вызов OllamaProvider
        const result = await this.ollamaProvider.call(prompt, options);
        
        // Обновляем информацию о провайдере в результате
        return {
            ...result,
            // Можно добавить дополнительную обработку, специфичную для LLM Studio
        };
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        const models = await this.ollamaProvider.getAvailableModels();
        
        // Преобразуем модели для отображения как LLM Studio модели
        return models.map(model => ({
            ...model,
            provider: 'llm-studio' as ModelProviderType,
            description: `LLM Studio модель: ${model.name}`
        }));
    }

    updateConfig(config: Partial<ProviderConfig>): void {
        super.updateConfig(config);
        // Обновляем конфигурацию OllamaProvider
        this.ollamaProvider.updateConfig(config);
    }
}
