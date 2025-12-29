import * as vscode from 'vscode';
import { CursorAPI, CursorModel } from './cursor-api';

/**
 * Информация о языковой модели
 */
export interface LanguageModelInfo {
    vendor?: string;
    id?: string;
    family?: string;
    version?: string;
    displayName?: string;
    provider?: string;
}

/**
 * Провайдер для работы с языковыми моделями CursorAI
 */
export class ModelProvider {
    public static cachedModels: LanguageModelInfo[] | null = null;
    public static cacheTimestamp: number = 0;
    public static readonly CACHE_TTL = 300000; // 5 минут (увеличено с 1 минуты для уменьшения повторных логов)

    /**
     * Получение списка всех доступных моделей из CursorAI
     */
    static async getAvailableModels(): Promise<LanguageModelInfo[]> {
        // Проверяем кэш
        const now = Date.now();
        if (this.cachedModels !== null && (now - this.cacheTimestamp) < this.CACHE_TTL) {
            return this.cachedModels;
        }

        try {
            // Получаем модели из CursorAI API
            const cursorModels = await CursorAPI.getAvailableModels();

            // Преобразуем в формат LanguageModelInfo
            // КРИТИЧЕСКИ ВАЖНО: Дополнительная фильтрация GitHub Copilot моделей
            const filteredModels = cursorModels
                .filter(model => {
                    // Исключаем модели GitHub Copilot
                    const modelId = (model.id || '').toLowerCase();
                    const modelName = (model.name || model.displayName || '').toLowerCase();
                    const provider = (model.provider || '').toLowerCase();
                    
                    return !modelId.includes('github') &&
                           !modelId.includes('copilot') &&
                           !modelId.includes('gh-') &&
                           !modelName.includes('github') &&
                           !modelName.includes('copilot') &&
                           !modelName.includes('gh-') &&
                           !provider.includes('github') &&
                           !provider.includes('copilot');
                })
                .map(model => ({
                    vendor: model.vendor || model.provider,
                    id: model.id,
                    family: model.family,
                    displayName: model.displayName || model.name,
                    provider: model.provider
                }));

            // ВСЕГДА кэшируем результат (даже пустой массив)
            this.cachedModels = filteredModels;
            this.cacheTimestamp = now;

            // Логируем только при первом получении (когда только что установили кэш)
            if (filteredModels.length > 0) {
                console.log(`ModelProvider: Found ${filteredModels.length} models available`);
            } else if (cursorModels.length === 0) {
                // Логируем предупреждение только при первом получении пустого списка
                // В последующих вызовах кэш не будет null, и это не выполнится
                console.warn('ModelProvider: No models found in CursorAI. This is normal - CursorAI will auto-select models.');
            } else {
                console.warn('ModelProvider: All models were filtered out (GitHub Copilot models excluded)');
            }

            return this.cachedModels;
        } catch (error: any) {
            console.error('Error getting available models from CursorAI:', error);
            // Кэшируем пустой результат при ошибке на период TTL
            // Это предотвращает бесконечный цикл ошибок
            if (this.cachedModels === null) {
                this.cachedModels = [];
                this.cacheTimestamp = now;
            }
            // Возвращаем кэшированный результат или пустой массив
            return this.cachedModels || [];
        }
    }

    /**
     * Выбор модели по критериям (для совместимости, но теперь используем CursorAI)
     * Возвращает информацию о модели, а не сам объект модели
     */
    static async selectModel(criteria: LanguageModelInfo): Promise<LanguageModelInfo | undefined> {
        try {
            const availableModels = await this.getAvailableModels();
            
            // Ищем модель по критериям
            const matchedModel = availableModels.find(model => {
                if (criteria.id && model.id === criteria.id) return true;
                if (criteria.vendor && model.vendor === criteria.vendor && 
                    criteria.family && model.family === criteria.family) return true;
                return false;
            });
            
            return matchedModel;
        } catch (error: any) {
            console.error('Error selecting model:', error);
            return undefined;
        }
    }

    /**
     * Очистка кэша моделей
     */
    public static clearCache(): void {
        this.cachedModels = null;
        this.cacheTimestamp = 0;
    }

    /**
     * Принудительное обновление кэша моделей
     * Используется для сброса кэша и повторного получения списка моделей
     */
    public static forceRefresh(): void {
        this.cachedModels = null;
        this.cacheTimestamp = 0;
        console.log('ModelProvider cache cleared, forcing refresh');
    }

    /**
     * Проверка доступности модели
     */
    static async isModelAvailable(criteria: LanguageModelInfo): Promise<boolean> {
        const model = await this.selectModel(criteria);
        return model !== undefined;
    }

    /**
     * Получение модели по ID для отображения
     */
    static async getModelById(id: string): Promise<LanguageModelInfo | undefined> {
        const models = await this.getAvailableModels();
        return models.find(m => m.id === id);
    }
}
