import { Task } from '../orchestrator/orchestrator';
import { ProjectContext } from '../agents/local-agent';
import { HybridModelProvider, ComplexityEstimate } from '../integration/model-providers/hybrid-provider';

/**
 * Выбор модели
 */
export interface ModelChoice {
    provider: 'local' | 'cloud' | 'cursor';
    model?: string;
    estimatedCost: number;
    reasoning: string;
    complexity: ComplexityEstimate;
}

/**
 * Статистика использования моделей
 */
export interface ModelUsageStats {
    totalCalls: number;
    byProvider: {
        local: number;
        cloud: number;
        cursor: number;
    };
    totalCost: number;
    averageCost: number;
}

/**
 * Умный выбор модели на основе сложности задачи
 * Оптимизирует затраты, выбирая подходящую модель
 */
export class SmartModelSelector {
    private hybridProvider: HybridModelProvider;
    private usageStats: ModelUsageStats;
    private monthlyBudget: number = 50; // $50 по умолчанию
    private currentMonthSpent: number = 0;
    private maxCursorCallsPerDay: number = 100;
    private cursorCallsToday: number = 0;
    private lastResetDate: Date;
    
    constructor() {
        this.hybridProvider = new HybridModelProvider();
        this.usageStats = {
            totalCalls: 0,
            byProvider: { local: 0, cloud: 0, cursor: 0 },
            totalCost: 0,
            averageCost: 0
        };
        this.lastResetDate = new Date();
    }
    
    /**
     * Выбрать оптимальную модель для задачи
     */
    async selectModel(
        task: Task,
        prompt: string,
        context?: ProjectContext
    ): Promise<ModelChoice> {
        // Сбрасываем счетчики если новый день/месяц
        this.resetCountersIfNeeded();
        
        // Проверяем бюджет
        this.checkBudgetLimits();
        
        // Оцениваем сложность через HybridProvider
        const complexity = (this.hybridProvider as any).estimateComplexity(prompt);
        
        // Определяем финальный провайдер с учетом всех факторов
        const provider = this.determineFinalProvider(complexity, task);
        
        // Оцениваем стоимость
        const estimatedCost = this.estimateCostForProvider(provider, prompt);
        
        // Формируем reasoning
        const reasoning = this.buildReasoning(complexity, provider, task);
        
        return {
            provider,
            estimatedCost,
            reasoning,
            complexity
        };
    }
    
    /**
     * Определить финальный провайдер с учетом всех факторов
     */
    private determineFinalProvider(
        complexity: ComplexityEstimate,
        task: Task
    ): 'local' | 'cloud' | 'cursor' {
        let provider = complexity.suggestedProvider;
        
        // 1. Проверяем бюджет
        if (this.currentMonthSpent >= this.monthlyBudget) {
            console.warn('SmartModelSelector: Monthly budget exceeded, switching to local');
            return 'local';
        }
        
        // 2. Проверяем лимит CursorAI вызовов
        if (provider === 'cursor' && this.cursorCallsToday >= this.maxCursorCallsPerDay) {
            console.warn('SmartModelSelector: CursorAI daily limit reached, falling back to cloud');
            provider = 'cloud';
        }
        
        // 3. Проверяем тип задачи
        if (task.type === 'quality-check' || task.type === 'analysis') {
            // Для проверки качества достаточно локальной модели
            return 'local';
        }
        
        // 4. Проверяем приоритет задачи
        if (task.priority === 'high' && provider !== 'cursor') {
            // Высокоприоритетные задачи используют лучшие модели
            provider = 'cloud';
        }
        
        // 5. Специальные случаи для CursorAI
        if (this.shouldUseCursorAI(task, complexity)) {
            provider = 'cursor';
        }
        
        return provider;
    }
    
    /**
     * Проверить, нужно ли использовать CursorAI для этой задачи
     */
    private shouldUseCursorAI(task: Task, complexity: ComplexityEstimate): boolean {
        // Используем CursorAI для:
        // 1. Консолидации решений
        if (task.description?.toLowerCase().includes('consolidate') || 
            task.description?.toLowerCase().includes('merge')) {
            return true;
        }
        
        // 2. Сложного рефакторинга
        if (complexity.factors.requiresRefactoring && complexity.score > 0.7) {
            return true;
        }
        
        // 3. Изменения множества файлов
        if (complexity.factors.requiresMultipleFiles) {
            return true;
        }
        
        // 4. Архитектурных решений
        if (complexity.factors.requiresArchitecture) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Оценить стоимость для провайдера
     */
    private estimateCostForProvider(provider: 'local' | 'cloud' | 'cursor', prompt: string): number {
        const tokens = Math.ceil(prompt.length / 4);
        
        switch (provider) {
            case 'local':
                return 0;
            case 'cloud':
                // OpenAI GPT-3.5-turbo: $0.002 / 1K tokens (input + output)
                return (tokens / 1000) * 0.004; // Учитываем вход и выход
            case 'cursor':
                // CursorAI: примерная стоимость сложного запроса
                return 0.05;
            default:
                return 0;
        }
    }
    
    /**
     * Построить обоснование выбора
     */
    private buildReasoning(
        complexity: ComplexityEstimate,
        provider: 'local' | 'cloud' | 'cursor',
        task: Task
    ): string {
        const reasons: string[] = [];
        
        // Основная причина
        reasons.push(complexity.reason);
        
        // Дополнительные факторы
        if (provider !== complexity.suggestedProvider) {
            if (this.currentMonthSpent >= this.monthlyBudget * 0.9) {
                reasons.push('Приближение к месячному бюджету');
            }
            if (this.cursorCallsToday >= this.maxCursorCallsPerDay * 0.9) {
                reasons.push('Приближение к дневному лимиту CursorAI');
            }
            if (task.priority === 'high') {
                reasons.push('Высокий приоритет задачи');
            }
        }
        
        // Факторы сложности
        if (complexity.factors.requiresRefactoring) {
            reasons.push('Требуется рефакторинг');
        }
        if (complexity.factors.requiresMultipleFiles) {
            reasons.push('Изменение нескольких файлов');
        }
        if (complexity.factors.requiresArchitecture) {
            reasons.push('Архитектурные решения');
        }
        
        return reasons.join('; ');
    }
    
    /**
     * Записать использование модели
     */
    recordUsage(choice: ModelChoice, actualCost: number): void {
        this.usageStats.totalCalls++;
        this.usageStats.byProvider[choice.provider]++;
        this.usageStats.totalCost += actualCost;
        this.usageStats.averageCost = this.usageStats.totalCost / this.usageStats.totalCalls;
        
        this.currentMonthSpent += actualCost;
        
        if (choice.provider === 'cursor') {
            this.cursorCallsToday++;
        }
        
        console.log(`SmartModelSelector: Used ${choice.provider} (cost: $${actualCost.toFixed(4)}, total this month: $${this.currentMonthSpent.toFixed(2)})`);
    }
    
    /**
     * Проверить лимиты бюджета
     */
    private checkBudgetLimits(): void {
        const usagePercentage = (this.currentMonthSpent / this.monthlyBudget) * 100;
        
        if (usagePercentage >= 90) {
            console.warn(`SmartModelSelector: ⚠️ ${usagePercentage.toFixed(0)}% of monthly budget used`);
        }
        
        if (this.currentMonthSpent >= this.monthlyBudget) {
            console.error('SmartModelSelector: 🚫 Monthly budget exceeded! Switching to local models only.');
        }
    }
    
    /**
     * Сбросить счетчики если новый день/месяц
     */
    private resetCountersIfNeeded(): void {
        const now = new Date();
        
        // Сброс дневных счетчиков
        if (now.getDate() !== this.lastResetDate.getDate()) {
            this.cursorCallsToday = 0;
            console.log('SmartModelSelector: Daily counters reset');
        }
        
        // Сброс месячных счетчиков
        if (now.getMonth() !== this.lastResetDate.getMonth()) {
            this.currentMonthSpent = 0;
            console.log('SmartModelSelector: Monthly counters reset');
        }
        
        this.lastResetDate = now;
    }
    
    /**
     * Получить статистику
     */
    getStatistics(): ModelUsageStats & {
        monthlyBudget: number;
        currentMonthSpent: number;
        budgetUsedPercentage: string;
        cursorCallsToday: number;
        cursorCallsLimit: number;
    } {
        return {
            ...this.usageStats,
            monthlyBudget: this.monthlyBudget,
            currentMonthSpent: this.currentMonthSpent,
            budgetUsedPercentage: ((this.currentMonthSpent / this.monthlyBudget) * 100).toFixed(1) + '%',
            cursorCallsToday: this.cursorCallsToday,
            cursorCallsLimit: this.maxCursorCallsPerDay
        };
    }
    
    /**
     * Настроить бюджет и лимиты
     */
    configure(config: {
        monthlyBudget?: number;
        maxCursorCallsPerDay?: number;
    }): void {
        if (config.monthlyBudget !== undefined) {
            this.monthlyBudget = config.monthlyBudget;
        }
        
        if (config.maxCursorCallsPerDay !== undefined) {
            this.maxCursorCallsPerDay = config.maxCursorCallsPerDay;
        }
    }
    
    /**
     * Получить рекомендации по оптимизации затрат
     */
    getOptimizationRecommendations(): string[] {
        const recommendations: string[] = [];
        const stats = this.getStatistics();
        
        // Проверяем распределение вызовов
        const totalCalls = stats.totalCalls;
        if (totalCalls > 0) {
            const cloudPercentage = (stats.byProvider.cloud / totalCalls) * 100;
            const cursorPercentage = (stats.byProvider.cursor / totalCalls) * 100;
            
            if (cloudPercentage > 30) {
                recommendations.push(
                    `🔹 ${cloudPercentage.toFixed(0)}% вызовов используют облачные API. ` +
                    `Рассмотрите использование локальных моделей для простых задач.`
                );
            }
            
            if (cursorPercentage > 10) {
                recommendations.push(
                    `🔹 ${cursorPercentage.toFixed(0)}% вызовов используют CursorAI. ` +
                    `Это может быть дорого. Проверьте настройки useCursorAIFor.`
                );
            }
        }
        
        // Проверяем средние затраты
        if (stats.averageCost > 0.05) {
            recommendations.push(
                `🔹 Средняя стоимость вызова: $${stats.averageCost.toFixed(4)}. ` +
                `Включите кэширование для снижения затрат.`
            );
        }
        
        // Проверяем использование бюджета
        const budgetPercentage = (this.currentMonthSpent / this.monthlyBudget) * 100;
        if (budgetPercentage > 80) {
            recommendations.push(
                `⚠️ Использовано ${budgetPercentage.toFixed(0)}% месячного бюджета. ` +
                `Переключитесь на локальные модели до конца месяца.`
            );
        }
        
        return recommendations;
    }
}
