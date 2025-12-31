/**
 * Провайдер для моделей CursorAI
 * Обертка над существующим CursorAPI
 */

import { BaseModelProvider, IModelProvider, ModelProviderType, ModelInfo, CallOptions, CallResult, ProviderConfig } from './base-provider';
import { CursorAPI } from '../cursor-api';
import { LanguageModelInfo } from '../model-provider';

export class CursorAIProvider extends BaseModelProvider {
    private agentId: string;

    constructor(config: ProviderConfig, agentId: string = 'default') {
        const modelInfo: ModelInfo = {
            id: 'cursorai-auto',
            name: 'CursorAI Auto',
            provider: 'cursorai',
            type: 'cursorai',
            description: 'Автоматический выбор модели CursorAI',
            supportsStreaming: false
        };

        super(config, modelInfo);
        this.agentId = agentId;

        // Инициализируем CursorAPI если есть API ключ
        if (config.apiKey) {
            CursorAPI.initialize(config.apiKey, config.baseUrl);
        }
    }

    /**
     * Переопределяем updateConfig для обновления CursorAPI
     */
    updateConfig(config: Partial<ProviderConfig>): void {
        super.updateConfig(config);
        
        // Реинициализируем CursorAPI с новым API ключом
        if (this.config.apiKey) {
            CursorAPI.initialize(this.config.apiKey, this.config.baseUrl);
        }
    }

    getProviderType(): ModelProviderType {
        return 'cursorai';
    }

    async isAvailable(): Promise<boolean> {
        try {
            console.log('CursorAIProvider.isAvailable: Checking availability...');
            
            // Проверяем, инициализирован ли CursorAPI
            const apiKey = CursorAPI.getApiKey();
            console.log('CursorAIProvider.isAvailable: API key check:', {
                hasApiKey: !!apiKey,
                apiKeyLength: apiKey?.length || 0,
                configApiKey: !!this.config.apiKey,
                configApiKeyLength: this.config.apiKey?.length || 0
            });
            
            if (!apiKey) {
                console.warn('CursorAIProvider.isAvailable: No API key found');
                return false;
            }

            // Пробуем получить список моделей
            console.log('CursorAIProvider.isAvailable: Fetching models...');
            const models = await CursorAPI.getAvailableModels();
            console.log('CursorAIProvider.isAvailable: Models fetched:', models.length);
            return models.length > 0;
        } catch (error) {
            console.error('CursorAIProvider.isAvailable: Error:', error);
            return false;
        }
    }

    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        const startTime = Date.now();

        try {
            // Убеждаемся, что фоновый агент создан
            const agentInstructions = `Ты - AI помощник. Твоя задача - помогать пользователю в разработке, предоставляя детальные и точные ответы.`;
            
            const modelId = options?.model || this.config.model;
            await CursorAPI.createOrUpdateBackgroundAgent(
                this.agentId,
                'AI Assistant',
                'AI помощник для разработки',
                agentInstructions,
                modelId
            );

            // Отправляем сообщение через CursorAPI
            const response = await CursorAPI.sendMessageToAgent(this.agentId, prompt, modelId);
            
            const responseTime = Date.now() - startTime;

            // Оценка токенов (примерно 4 символа = 1 токен)
            const inputTokens = Math.ceil(prompt.length / 4);
            const outputTokens = Math.ceil(response.length / 4);

            return {
                text: response,
                tokensUsed: {
                    input: inputTokens,
                    output: outputTokens
                },
                responseTime
            };
        } catch (error: any) {
            console.error('CursorAIProvider: Error calling model:', error);
            throw new Error(`CursorAI provider error: ${error.message}`);
        }
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        try {
            const cursorModels = await CursorAPI.getAvailableModels();
            
            return cursorModels.map((model: CursorModel) => ({
                id: model.id || 'unknown',
                name: model.displayName || model.name || model.id || 'unknown',
                provider: 'cursorai' as ModelProviderType,
                type: 'cursorai' as const,
                description: `CursorAI модель: ${model.displayName || model.name}`,
                supportsStreaming: false
            }));
        } catch (error) {
            console.error('CursorAIProvider: Error getting available models:', error);
            return [];
        }
    }
}

// Тип для совместимости
interface CursorModel {
    id: string;
    name?: string;
    displayName?: string;
    provider?: string;
    vendor?: string;
    family?: string;
}
