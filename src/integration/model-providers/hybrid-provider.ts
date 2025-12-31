import * as vscode from 'vscode';
import { IModelProvider, CallOptions, CallResult, ModelProviderType, ModelInfo, ProviderConfig } from './base-provider';
import { ModelProviderManager } from './provider-manager';
import { Task } from '../../orchestrator/orchestrator';

/**
 * Оценка сложности задачи
 */
export interface ComplexityEstimate {
    score: number;          // 0-1, где 0 - простая, 1 - сложная
    reason: string;
    suggestedProvider: 'local' | 'cloud' | 'cursor';
    factors: {
        promptLength: number;
        requiresContext: boolean;
        requiresMultipleFiles: boolean;
        requiresRefactoring: boolean;
        requiresArchitecture: boolean;
    };
}

/**
 * Гибридный провайдер моделей
 * Использует локальные модели для простых задач,
 * облачные для средних, CursorAI для сложных
 */
export class HybridModelProvider implements IModelProvider {
    private localProvider: IModelProvider | null = null;
    private cloudProvider: IModelProvider | null = null;
    private cursorProvider: IModelProvider | null = null;
    private modelProviderManager: ModelProviderManager;
    
    // Настройки
    private preferLocal: boolean = true;
    private useCursorAIFor: string[] = ['consolidation', 'complex-refactoring', 'file-editing'];
    private hybridEnabled: boolean = true;
    private monthlyBudget: number = 50;
    private maxCursorCallsPerDay: number = 100;
    
    // Статистика
    private stats = {
        localCalls: 0,
        cloudCalls: 0,
        cursorCalls: 0,
        fallbacks: 0
    };
    
    constructor() {
        this.modelProviderManager = ModelProviderManager.getInstance();
        this.loadSettings();
        this.initializeProviders();
    }
    
    /**
     * Загрузить настройки из конфигурации
     */
    private loadSettings(): void {
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const hybridMode = config.get('hybridMode', {
            enabled: true,
            preferLocal: true,
            monthlyBudget: 50,
            maxCursorCallsPerDay: 100
        });
        
        this.hybridEnabled = hybridMode.enabled;
        this.preferLocal = hybridMode.preferLocal;
        this.monthlyBudget = hybridMode.monthlyBudget;
        this.maxCursorCallsPerDay = hybridMode.maxCursorCallsPerDay;
        
        // Загружаем настройки использования CursorAI
        const useCursorAIFor = config.get<string[]>('useCursorAIFor', [
            'consolidation', 'complex-refactoring', 'file-editing'
        ]);
        this.useCursorAIFor = useCursorAIFor;
        
        console.log('HybridModelProvider: Settings loaded', {
            enabled: this.hybridEnabled,
            preferLocal: this.preferLocal,
            budget: this.monthlyBudget,
            useCursorAIFor: this.useCursorAIFor
        });
    }
    
    /**
     * Инициализация провайдеров
     */
    private async initializeProviders(): Promise<void> {
        // Локальные провайдеры (Ollama, LLM Studio)
        this.localProvider = 
            this.modelProviderManager.getProvider('ollama') ||
            this.modelProviderManager.getProvider('llm-studio') ||
            null;
        
        // Облачные провайдеры
        this.cloudProvider = 
            this.modelProviderManager.getProvider('openai') ||
            this.modelProviderManager.getProvider('google') ||
            this.modelProviderManager.getProvider('anthropic') ||
            null;
        
        // CursorAI провайдер
        this.cursorProvider = this.modelProviderManager.getProvider('cursorai') || null;
    }
    
    /**
     * Вызов модели с умным выбором провайдера
     */
    async call(prompt: string, options?: CallOptions): Promise<CallResult> {
        // Если гибридный режим выключен, используем только локальные модели
        if (!this.hybridEnabled) {
            if (this.localProvider && await this.localProvider.isAvailable()) {
                return await this.localProvider.call(prompt, options);
            }
            throw new Error('Hybrid mode disabled and no local provider available');
        }
        
        // Оцениваем сложность
        const complexity = this.estimateComplexity(prompt, options);
        
        console.log(`HybridProvider: Complexity ${(complexity.score * 100).toFixed(0)}% - ${complexity.suggestedProvider}`);
        
        // Выбираем провайдера на основе сложности
        let result: CallResult | null = null;
        
        try {
            switch (complexity.suggestedProvider) {
                case 'local':
                    result = await this.callLocal(prompt, options);
                    break;
                case 'cloud':
                    result = await this.callCloud(prompt, options);
                    break;
                case 'cursor':
                    result = await this.callCursor(prompt, options);
                    break;
            }
            
            if (result) {
                return result;
            }
        } catch (error: any) {
            console.warn(`HybridProvider: ${complexity.suggestedProvider} failed, trying fallback:`, error.message);
            this.stats.fallbacks++;
        }
        
        // Fallback chain: local → cloud → cursor
        result = await this.fallbackChain(prompt, options, complexity.suggestedProvider);
        
        if (!result) {
            throw new Error('All providers failed');
        }
        
        return result;
    }
    
    /**
     * Оценка сложности задачи
     */
    private estimateComplexity(prompt: string, options?: CallOptions): ComplexityEstimate {
        let score = 0;
        const factors = {
            promptLength: prompt.length,
            requiresContext: false,
            requiresMultipleFiles: false,
            requiresRefactoring: false,
            requiresArchitecture: false
        };
        
        // 1. Длина промпта (вес: 0.2)
        if (prompt.length > 5000) {
            score += 0.3;
        } else if (prompt.length > 2000) {
            score += 0.15;
        }
        
        // 2. Ключевые слова сложных задач (вес: 0.3)
        const complexKeywords = {
            refactor: 0.25,
            architecture: 0.3,
            design: 0.2,
            'multiple files': 0.25,
            consolidate: 0.2,
            integrate: 0.2,
            optimize: 0.15,
            'complex': 0.2
        };
        
        for (const [keyword, weight] of Object.entries(complexKeywords)) {
            if (prompt.toLowerCase().includes(keyword)) {
                score += weight;
                
                if (keyword === 'refactor') factors.requiresRefactoring = true;
                if (keyword === 'architecture' || keyword === 'design') factors.requiresArchitecture = true;
                if (keyword === 'multiple files') factors.requiresMultipleFiles = true;
            }
        }
        
        // 3. Требуется ли контекст (вес: 0.2)
        if (prompt.includes('project') || prompt.includes('codebase') || prompt.includes('entire')) {
            score += 0.2;
            factors.requiresContext = true;
        }
        
        // 4. Количество требований (вес: 0.3)
        const requirements = prompt.match(/\d+\.|•|-\s/g);
        if (requirements) {
            if (requirements.length > 5) {
                score += 0.3;
            } else if (requirements.length > 3) {
                score += 0.15;
            }
        }
        
        // Нормализуем score
        score = Math.min(1, score);
        
        // Определяем провайдера
        let suggestedProvider: 'local' | 'cloud' | 'cursor';
        let reason: string;
        
        if (score < 0.3) {
            suggestedProvider = 'local';
            reason = 'Простая задача - используем локальную модель (бесплатно)';
        } else if (score < 0.7) {
            suggestedProvider = 'cloud';
            reason = 'Средняя сложность - используем облачную API ($0.01-0.05)';
        } else {
            suggestedProvider = 'cursor';
            reason = 'Сложная задача - используем CursorAI (Pro план)';
        }
        
        // Проверяем настройки пользователя
        if (!this.preferLocal && suggestedProvider === 'local') {
            suggestedProvider = 'cloud';
            reason = 'Настройки: предпочтение облачным моделям';
        }
        
        return {
            score,
            reason,
            suggestedProvider,
            factors
        };
    }
    
    /**
     * Вызов локальной модели
     */
    private async callLocal(prompt: string, options?: CallOptions): Promise<CallResult | null> {
        if (!this.localProvider) {
            return null;
        }
        
        try {
            this.stats.localCalls++;
            const result = await this.localProvider.call(prompt, options);
            
            // Локальные модели бесплатны
            result.cost = 0;
            
            return result;
        } catch (error) {
            console.error('HybridProvider: Local provider failed:', error);
            return null;
        }
    }
    
    /**
     * Вызов облачной модели
     */
    private async callCloud(prompt: string, options?: CallOptions): Promise<CallResult | null> {
        if (!this.cloudProvider) {
            return null;
        }
        
        try {
            this.stats.cloudCalls++;
            const result = await this.cloudProvider.call(prompt, options);
            
            // Оценка стоимости (примерная)
            result.cost = this.estimateCostInternal(prompt, 'cloud');
            
            return result;
        } catch (error) {
            console.error('HybridProvider: Cloud provider failed:', error);
            return null;
        }
    }
    
    /**
     * Вызов CursorAI
     */
    private async callCursor(prompt: string, options?: CallOptions): Promise<CallResult | null> {
        if (!this.cursorProvider) {
            console.warn('HybridProvider: CursorAI provider not available');
            return null;
        }
        
        try {
            this.stats.cursorCalls++;
            const result = await this.cursorProvider.call(prompt, options);
            
            result.cost = this.estimateCostInternal(prompt, 'cursor');
            
            return result;
        } catch (error) {
            console.error('HybridProvider: CursorAI provider failed:', error);
            return null;
        }
    }
    
    /**
     * Fallback chain для надежности
     */
    private async fallbackChain(
        prompt: string,
        options: CallOptions | undefined,
        failedProvider: string
    ): Promise<CallResult | null> {
        const chain = ['local', 'cloud', 'cursor'].filter(p => p !== failedProvider);
        
        for (const provider of chain) {
            try {
                let result: CallResult | null = null;
                
                switch (provider) {
                    case 'local':
                        result = await this.callLocal(prompt, options);
                        break;
                    case 'cloud':
                        result = await this.callCloud(prompt, options);
                        break;
                    case 'cursor':
                        result = await this.callCursor(prompt, options);
                        break;
                }
                
                if (result) {
                    console.log(`HybridProvider: Fallback to ${provider} succeeded`);
                    return result;
                }
            } catch (error) {
                console.warn(`HybridProvider: Fallback to ${provider} failed`);
            }
        }
        
        return null;
    }
    
    /**
     * Оценка стоимости вызова (внутренний метод)
     */
    private estimateCostInternal(prompt: string, provider: 'local' | 'cloud' | 'cursor'): number {
        const tokens = Math.ceil(prompt.length / 4); // Примерная оценка
        
        switch (provider) {
            case 'local':
                return 0;
            case 'cloud':
                // OpenAI GPT-3.5: ~$0.002 / 1K tokens
                return (tokens / 1000) * 0.002;
            case 'cursor':
                // CursorAI: ~$0.05 за сложный запрос (примерно)
                return 0.05;
            default:
                return 0;
        }
    }
    
    /**
     * Проверка доступности
     */
    async isAvailable(): Promise<boolean> {
        // Доступен, если доступен хотя бы один провайдер
        const localAvailable = this.localProvider ? await this.localProvider.isAvailable() : false;
        const cloudAvailable = this.cloudProvider ? await this.cloudProvider.isAvailable() : false;
        const cursorAvailable = this.cursorProvider ? await this.cursorProvider.isAvailable() : false;
        
        return localAvailable || cloudAvailable || cursorAvailable;
    }
    
    /**
     * Получить тип провайдера
     */
    getProviderType(): ModelProviderType {
        return 'cursorai'; // Используем cursorai как базовый тип
    }
    
    /**
     * Получить информацию о модели
     */
    getModelInfo(): ModelInfo {
        return {
            id: 'hybrid',
            name: 'Hybrid Model Provider',
            provider: 'cursorai',
            type: 'cursorai',
            description: 'Smart model selection (local → cloud → cursor)',
            supportsStreaming: false
        };
    }
    
    /**
     * Оценить стоимость запроса (интерфейс IModelProvider)
     */
    estimateCost(prompt: string, options?: CallOptions): number {
        // Используем оценку для облачных моделей по умолчанию
        return this.estimateCostInternal(prompt, 'cloud');
    }
    
    /**
     * Получить список доступных моделей
     */
    async getAvailableModels(): Promise<ModelInfo[]> {
        return [{
            id: 'hybrid',
            name: 'Hybrid Model',
            provider: 'cursorai',
            type: 'cursorai'
        }];
    }
    
    /**
     * Обновить конфигурацию
     */
    updateConfig(config: ProviderConfig): void {
        // Заглушка - конфигурация управляется через настройки
    }
    
    /**
     * Получить конфигурацию
     */
    getConfig(): ProviderConfig {
        return {
            model: 'hybrid',
            temperature: 0.7
        };
    }
    
    /**
     * Настроить предпочтения
     */
    setPreferences(preferences: {
        preferLocal?: boolean;
        useCursorAIFor?: string[];
    }): void {
        if (preferences.preferLocal !== undefined) {
            this.preferLocal = preferences.preferLocal;
        }
        
        if (preferences.useCursorAIFor) {
            this.useCursorAIFor = preferences.useCursorAIFor;
        }
    }
    
    /**
     * Получить статистику
     */
    getStatistics() {
        const total = this.stats.localCalls + this.stats.cloudCalls + this.stats.cursorCalls;
        
        return {
            ...this.stats,
            total,
            localPercentage: total > 0 ? ((this.stats.localCalls / total) * 100).toFixed(1) + '%' : '0%',
            cloudPercentage: total > 0 ? ((this.stats.cloudCalls / total) * 100).toFixed(1) + '%' : '0%',
            cursorPercentage: total > 0 ? ((this.stats.cursorCalls / total) * 100).toFixed(1) + '%' : '0%',
            fallbackRate: total > 0 ? ((this.stats.fallbacks / total) * 100).toFixed(1) + '%' : '0%'
        };
    }
    
    /**
     * Сброс статистики
     */
    resetStatistics(): void {
        this.stats = {
            localCalls: 0,
            cloudCalls: 0,
            cursorCalls: 0,
            fallbacks: 0
        };
    }
}
