"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelProvider = void 0;
const cursor_api_1 = require("./cursor-api");
/**
 * Провайдер для работы с языковыми моделями CursorAI
 */
class ModelProvider {
    /**
     * Получение списка всех доступных моделей из CursorAI
     */
    static async getAvailableModels() {
        // Проверяем кэш
        const now = Date.now();
        if (this.cachedModels !== null && (now - this.cacheTimestamp) < this.CACHE_TTL) {
            return this.cachedModels;
        }
        try {
            // Получаем модели из CursorAI API
            const cursorModels = await cursor_api_1.CursorAPI.getAvailableModels();
            // Преобразуем в формат LanguageModelInfo
            // КРИТИЧЕСКИ ВАЖНО: Фильтрация GitHub Copilot и платных моделей (max, premium, opus, o1)
            const filteredModels = cursorModels
                .filter(model => {
                // Исключаем модели GitHub Copilot
                const modelId = (model.id || '').toLowerCase();
                const modelName = (model.name || model.displayName || '').toLowerCase();
                const provider = (model.provider || '').toLowerCase();
                const isCopilot = modelId.includes('github') ||
                    modelId.includes('copilot') ||
                    modelId.includes('gh-') ||
                    modelName.includes('github') ||
                    modelName.includes('copilot') ||
                    modelName.includes('gh-') ||
                    provider.includes('github') ||
                    provider.includes('copilot');
                if (isCopilot) {
                    return false;
                }
                // Исключаем платные/дорогие модели (max, premium, opus, o1 и т.д.)
                const isPremium = modelId.includes('max') ||
                    modelId.includes('premium') ||
                    modelId.includes('opus') ||
                    modelId.includes('o1') ||
                    modelId.includes('o3') ||
                    modelId.includes('advanced') ||
                    modelId.includes('pro') ||
                    modelId.includes('ultra') ||
                    modelId.includes('thinking') ||
                    modelName.includes('max') ||
                    modelName.includes('premium') ||
                    modelName.includes('opus') ||
                    modelName.includes('o1') ||
                    modelName.includes('o3');
                return !isPremium;
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
            }
            else if (cursorModels.length === 0) {
                // Логируем предупреждение только при первом получении пустого списка
                // В последующих вызовах кэш не будет null, и это не выполнится
                console.warn('ModelProvider: No models found in CursorAI. This is normal - CursorAI will auto-select models.');
            }
            else {
                console.warn('ModelProvider: All models were filtered out (GitHub Copilot models excluded)');
            }
            return this.cachedModels;
        }
        catch (error) {
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
    static async selectModel(criteria) {
        try {
            const availableModels = await this.getAvailableModels();
            // Ищем модель по критериям
            const matchedModel = availableModels.find(model => {
                if (criteria.id && model.id === criteria.id)
                    return true;
                if (criteria.vendor && model.vendor === criteria.vendor &&
                    criteria.family && model.family === criteria.family)
                    return true;
                return false;
            });
            return matchedModel;
        }
        catch (error) {
            console.error('Error selecting model:', error);
            return undefined;
        }
    }
    /**
     * Очистка кэша моделей
     */
    static clearCache() {
        this.cachedModels = null;
        this.cacheTimestamp = 0;
    }
    /**
     * Принудительное обновление кэша моделей
     * Используется для сброса кэша и повторного получения списка моделей
     */
    static forceRefresh() {
        this.cachedModels = null;
        this.cacheTimestamp = 0;
        console.log('ModelProvider cache cleared, forcing refresh');
    }
    /**
     * Проверка доступности модели
     */
    static async isModelAvailable(criteria) {
        const model = await this.selectModel(criteria);
        return model !== undefined;
    }
    /**
     * Получение модели по ID для отображения
     */
    static async getModelById(id) {
        const models = await this.getAvailableModels();
        return models.find(m => m.id === id);
    }
}
exports.ModelProvider = ModelProvider;
ModelProvider.cachedModels = null;
ModelProvider.cacheTimestamp = 0;
ModelProvider.CACHE_TTL = 300000; // 5 минут (увеличено с 1 минуты для уменьшения повторных логов)
//# sourceMappingURL=model-provider.js.map