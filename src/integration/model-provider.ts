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
    private static cachedModels: LanguageModelInfo[] | null = null;
    private static cacheTimestamp: number = 0;
    private static readonly CACHE_TTL = 60000; // 1 минута

    /**
     * Получение списка всех доступных моделей из CursorAI
     */
    static async getAvailableModels(): Promise<LanguageModelInfo[]> {
        // Проверяем кэш
        const now = Date.now();
        if (this.cachedModels && (now - this.cacheTimestamp) < this.CACHE_TTL) {
            return this.cachedModels;
        }

        try {
            // Получаем модели из CursorAI API
            const cursorModels = await CursorAPI.getAvailableModels();

            // Преобразуем в формат LanguageModelInfo
            this.cachedModels = cursorModels.map(model => ({
                vendor: model.vendor || model.provider,
                id: model.id,
                family: model.family,
                displayName: model.displayName || model.name,
                provider: model.provider
            }));

            this.cacheTimestamp = now;
            return this.cachedModels;
        } catch (error: any) {
            console.error('Error getting available models from CursorAI:', error);
            // Возвращаем пустой массив при ошибке
            return [];
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
    static clearCache(): void {
        this.cachedModels = null;
        this.cacheTimestamp = 0;
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
