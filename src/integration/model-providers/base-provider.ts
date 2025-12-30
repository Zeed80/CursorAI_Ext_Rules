/**
 * Базовый интерфейс для провайдеров языковых моделей
 * Обеспечивает единообразный интерфейс для работы с разными моделями
 */

/**
 * Тип провайдера модели
 */
export type ModelProviderType = 'cursorai' | 'openai' | 'google' | 'anthropic' | 'ollama' | 'llm-studio';

/**
 * Информация о модели
 */
export interface ModelInfo {
    id: string;
    name: string;
    provider: ModelProviderType;
    type: 'cloud' | 'local' | 'cursorai';
    description?: string;
    maxTokens?: number;
    supportsStreaming?: boolean;
    costPerToken?: {
        input: number;  // стоимость за токен входных данных
        output: number; // стоимость за токен выходных данных
    };
}

/**
 * Опции для вызова модели
 */
export interface CallOptions {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    model?: string; // конкретная модель для использования
}

/**
 * Результат вызова модели
 */
export interface CallResult {
    text: string;
    tokensUsed?: {
        input: number;
        output: number;
    };
    cost?: number;
    responseTime?: number;
}

/**
 * Конфигурация провайдера
 */
export interface ProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    retries?: number;
    [key: string]: any; // для дополнительных настроек
}

/**
 * Интерфейс провайдера языковой модели
 */
export interface IModelProvider {
    /**
     * Получить тип провайдера
     */
    getProviderType(): ModelProviderType;

    /**
     * Получить информацию о модели
     */
    getModelInfo(): ModelInfo;

    /**
     * Вызвать модель с промптом
     */
    call(prompt: string, options?: CallOptions): Promise<CallResult>;

    /**
     * Проверить доступность провайдера
     */
    isAvailable(): Promise<boolean>;

    /**
     * Оценить стоимость запроса
     */
    estimateCost(prompt: string, options?: CallOptions): number;

    /**
     * Получить список доступных моделей
     */
    getAvailableModels(): Promise<ModelInfo[]>;

    /**
     * Обновить конфигурацию провайдера
     */
    updateConfig(config: Partial<ProviderConfig>): void;

    /**
     * Получить текущую конфигурацию
     */
    getConfig(): ProviderConfig;
}

/**
 * Базовый класс для провайдеров моделей
 * Предоставляет общую функциональность
 */
export abstract class BaseModelProvider implements IModelProvider {
    protected config: ProviderConfig;
    protected modelInfo: ModelInfo;

    constructor(config: ProviderConfig, modelInfo: ModelInfo) {
        this.config = { ...config };
        this.modelInfo = modelInfo;
    }

    abstract getProviderType(): ModelProviderType;
    abstract call(prompt: string, options?: CallOptions): Promise<CallResult>;
    abstract isAvailable(): Promise<boolean>;
    abstract getAvailableModels(): Promise<ModelInfo[]>;

    getModelInfo(): ModelInfo {
        return { ...this.modelInfo };
    }

    estimateCost(prompt: string, options?: CallOptions): number {
        // Базовая оценка: примерно 4 символа = 1 токен
        const estimatedTokens = Math.ceil(prompt.length / 4);
        const maxOutputTokens = options?.maxTokens || this.config.maxTokens || 1000;
        const totalTokens = estimatedTokens + maxOutputTokens;

        if (this.modelInfo.costPerToken) {
            const inputCost = estimatedTokens * this.modelInfo.costPerToken.input;
            const outputCost = maxOutputTokens * this.modelInfo.costPerToken.output;
            return inputCost + outputCost;
        }

        return 0; // Неизвестная стоимость
    }

    updateConfig(config: Partial<ProviderConfig>): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): ProviderConfig {
        return { ...this.config };
    }
}
