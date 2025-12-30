/**
 * Менеджер провайдеров моделей
 * Управляет всеми провайдерами, их регистрацией и выбором
 */

import * as vscode from 'vscode';
import { IModelProvider, ModelProviderType, ProviderConfig, ModelInfo, CallOptions, CallResult } from './base-provider';
import { SettingsManager } from '../settings-manager';

export class ModelProviderManager {
    private static instance: ModelProviderManager;
    private providers: Map<ModelProviderType, IModelProvider> = new Map();
    private settingsManager: SettingsManager;
    private defaultProviderType: ModelProviderType = 'cursorai';

    private constructor() {
        this.settingsManager = new SettingsManager();
    }

    /**
     * Получить экземпляр менеджера (Singleton)
     */
    static getInstance(): ModelProviderManager {
        if (!ModelProviderManager.instance) {
            ModelProviderManager.instance = new ModelProviderManager();
        }
        return ModelProviderManager.instance;
    }

    /**
     * Зарегистрировать провайдер
     */
    registerProvider(provider: IModelProvider): void {
        const type = provider.getProviderType();
        this.providers.set(type, provider);
        console.log(`ModelProviderManager: Registered provider ${type}`);
    }

    /**
     * Получить провайдер по типу
     */
    getProvider(type: ModelProviderType): IModelProvider | undefined {
        return this.providers.get(type);
    }

    /**
     * Получить провайдер для агента
     * Использует настройки агента для определения провайдера
     */
    async getProviderForAgent(agentId: string): Promise<IModelProvider | undefined> {
        try {
            // Получаем настройки провайдера для агента
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            const agentConfig = config.get<{ model?: string; modelConfig?: ProviderConfig }>(`agents.${agentId}`, {});
            
            console.log(`ModelProviderManager: Getting provider for agent ${agentId}, config:`, JSON.stringify(agentConfig));
            
            const providerType = (agentConfig.model || this.defaultProviderType) as ModelProviderType;
            const provider = this.getProvider(providerType);

            if (provider && agentConfig.modelConfig) {
                // Обновляем конфигурацию провайдера из настроек
                console.log(`ModelProviderManager: Updating provider ${providerType} config for agent ${agentId}:`, JSON.stringify(agentConfig.modelConfig));
                provider.updateConfig(agentConfig.modelConfig);
            }

            // Проверяем доступность провайдера
            if (provider) {
                const isAvailable = await provider.isAvailable();
                if (!isAvailable) {
                    console.warn(`ModelProviderManager: Provider ${providerType} is not available for agent ${agentId}, trying fallback`);
                    return this.getFallbackProvider(providerType);
                }
                return provider;
            }

            // Fallback на провайдер по умолчанию
            return this.getFallbackProvider(providerType);
        } catch (error) {
            console.error(`ModelProviderManager: Error getting provider for agent ${agentId}:`, error);
            return this.getFallbackProvider('cursorai');
        }
    }

    /**
     * Получить fallback провайдер
     * Приоритет: локальные > облачные > CursorAI
     */
    private async getFallbackProvider(excludedType: ModelProviderType): Promise<IModelProvider | undefined> {
        const priority: ModelProviderType[] = ['ollama', 'llm-studio', 'openai', 'google', 'anthropic', 'cursorai'];
        
        for (const type of priority) {
            if (type === excludedType) continue;
            
            const provider = this.getProvider(type);
            if (provider) {
                const isAvailable = await provider.isAvailable();
                if (isAvailable) {
                    console.log(`ModelProviderManager: Using fallback provider ${type}`);
                    return provider;
                }
            }
        }

        // Последний резерв - CursorAI
        return this.getProvider('cursorai');
    }

    /**
     * Вызвать модель для агента
     */
    async callForAgent(agentId: string, prompt: string, options?: CallOptions): Promise<CallResult> {
        const provider = await this.getProviderForAgent(agentId);
        
        if (!provider) {
            throw new Error(`No available provider found for agent ${agentId}`);
        }

        console.log(`ModelProviderManager: Calling provider ${provider.getProviderType()} for agent ${agentId} with options:`, JSON.stringify(options));

        try {
            return await provider.call(prompt, options);
        } catch (error: any) {
            console.error(`ModelProviderManager: Error calling provider for agent ${agentId}:`, error);
            
            // Пробуем fallback
            const fallbackProvider = await this.getFallbackProvider(provider.getProviderType());
            if (fallbackProvider) {
                console.log(`ModelProviderManager: Trying fallback provider for agent ${agentId}`);
                return await fallbackProvider.call(prompt, options);
            }
            
            throw error;
        }
    }

    /**
     * Получить все зарегистрированные провайдеры
     */
    getAllProviders(): IModelProvider[] {
        return Array.from(this.providers.values());
    }

    /**
     * Получить все доступные модели из всех провайдеров
     */
    async getAllAvailableModels(): Promise<ModelInfo[]> {
        const models: ModelInfo[] = [];
        
        for (const provider of this.providers.values()) {
            try {
                const isAvailable = await provider.isAvailable();
                if (isAvailable) {
                    const providerModels = await provider.getAvailableModels();
                    models.push(...providerModels);
                }
            } catch (error) {
                console.debug(`ModelProviderManager: Error getting models from ${provider.getProviderType()}:`, error);
            }
        }

        return models;
    }

    /**
     * Установить провайдер по умолчанию
     */
    setDefaultProvider(type: ModelProviderType): void {
        this.defaultProviderType = type;
    }

    /**
     * Получить провайдер по умолчанию
     */
    getDefaultProvider(): ModelProviderType {
        return this.defaultProviderType;
    }
}
