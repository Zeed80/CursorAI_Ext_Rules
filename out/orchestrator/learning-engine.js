"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningEngine = void 0;
/**
 * Движок самообучения
 * Анализирует успешные решения и улучшает стратегии оркестратора
 */
class LearningEngine {
    constructor(knowledgeBase) {
        this.strategies = new Map();
        this.evaluationWeights = {
            quality: 0.15,
            performance: 0.15,
            security: 0.15,
            maintainability: 0.15,
            compliance: 0.15,
            dependencyImpact: 0.15,
            architecture: 0.10
        };
        this.knowledgeBase = knowledgeBase;
        this.initializeStrategies();
    }
    /**
     * Инициализация стратегий
     */
    initializeStrategies() {
        const taskTypes = ['feature', 'bug', 'improvement', 'refactoring', 'documentation', 'quality-check'];
        taskTypes.forEach(type => {
            this.strategies.set(type, {
                taskType: type,
                preferredAgents: this.getDefaultAgents(type),
                weights: this.getDefaultWeights(type)
            });
        });
    }
    /**
     * Обучение на основе истории решений
     */
    async learn() {
        const knowledge = this.knowledgeBase.getKnowledge();
        if (!knowledge || knowledge.history.length === 0) {
            return;
        }
        console.log('Learning from decision history...');
        // Анализируем успешные решения
        const successfulDecisions = this.knowledgeBase.getSuccessfulDecisions(100);
        if (successfulDecisions.length === 0) {
            return;
        }
        // Обновляем стратегии выбора агентов
        this.updateAgentSelectionStrategies(successfulDecisions);
        // Обновляем веса критериев оценки
        this.updateEvaluationWeights(successfulDecisions);
        console.log('Learning completed');
    }
    /**
     * Получение стратегии выбора агентов для типа задачи
     */
    getAgentSelectionStrategy(taskType) {
        return this.strategies.get(taskType) || {
            taskType,
            preferredAgents: this.getDefaultAgents(taskType),
            weights: this.getDefaultWeights(taskType)
        };
    }
    /**
     * Получение весов критериев оценки
     */
    getEvaluationWeights() {
        return { ...this.evaluationWeights };
    }
    /**
     * Рекомендация агентов для задачи
     */
    recommendAgents(task, availableAgents) {
        const strategy = this.getAgentSelectionStrategy(task.type);
        // Фильтруем доступных агентов
        const preferred = strategy.preferredAgents.filter(id => availableAgents.includes(id));
        // Если есть предпочтительные агенты, возвращаем их
        if (preferred.length > 0) {
            return preferred;
        }
        // Иначе возвращаем всех доступных
        return availableAgents;
    }
    /**
     * Обновление стратегий выбора агентов
     */
    updateAgentSelectionStrategies(decisions) {
        // Группируем решения по типу задачи
        const byTaskType = new Map();
        decisions.forEach(d => {
            // Предполагаем, что taskId содержит информацию о типе задачи
            // В реальной реализации нужно получать тип задачи из истории
            const taskType = this.inferTaskType(d);
            if (!byTaskType.has(taskType)) {
                byTaskType.set(taskType, []);
            }
            byTaskType.get(taskType).push(d);
        });
        // Обновляем стратегии для каждого типа задачи
        byTaskType.forEach((decisionsForType, taskType) => {
            const agentSuccessRates = this.calculateAgentSuccessRates(decisionsForType);
            const strategy = this.strategies.get(taskType);
            if (strategy) {
                // Обновляем предпочтительных агентов на основе успешности
                strategy.preferredAgents = Array.from(agentSuccessRates.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([agentId]) => agentId);
                // Обновляем веса агентов
                strategy.weights = {};
                agentSuccessRates.forEach((rate, agentId) => {
                    strategy.weights[agentId] = rate;
                });
            }
        });
    }
    /**
     * Обновление весов критериев оценки
     */
    updateEvaluationWeights(decisions) {
        // Анализируем, какие критерии чаще всего важны в успешных решениях
        const criteriaImportance = {
            quality: 0,
            performance: 0,
            security: 0,
            maintainability: 0,
            compliance: 0,
            dependencyImpact: 0,
            architecture: 0
        };
        decisions.forEach(d => {
            // Анализируем lessons для определения важных критериев
            d.lessons.forEach(lesson => {
                const lowerLesson = lesson.toLowerCase();
                if (lowerLesson.includes('качеств'))
                    criteriaImportance.quality++;
                if (lowerLesson.includes('производительн'))
                    criteriaImportance.performance++;
                if (lowerLesson.includes('безопасн'))
                    criteriaImportance.security++;
                if (lowerLesson.includes('поддерживаем'))
                    criteriaImportance.maintainability++;
                if (lowerLesson.includes('стандарт') || lowerLesson.includes('соответств'))
                    criteriaImportance.compliance++;
                if (lowerLesson.includes('зависимост'))
                    criteriaImportance.dependencyImpact++;
                if (lowerLesson.includes('архитектур'))
                    criteriaImportance.architecture++;
            });
        });
        // Нормализуем веса
        const total = Object.values(criteriaImportance).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            Object.keys(criteriaImportance).forEach(key => {
                const importance = criteriaImportance[key];
                this.evaluationWeights[key] = importance / total;
            });
        }
    }
    /**
     * Вычисление успешности агентов
     */
    calculateAgentSuccessRates(decisions) {
        const agentStats = new Map();
        decisions.forEach(d => {
            const stats = agentStats.get(d.decision.agentId) || { success: 0, total: 0 };
            stats.total++;
            if (d.outcome.success) {
                stats.success++;
            }
            agentStats.set(d.decision.agentId, stats);
        });
        const successRates = new Map();
        agentStats.forEach((stats, agentId) => {
            successRates.set(agentId, stats.total > 0 ? stats.success / stats.total : 0);
        });
        return successRates;
    }
    /**
     * Определение типа задачи из решения
     */
    inferTaskType(decision) {
        // В реальной реализации нужно хранить тип задачи в DecisionHistory
        // Пока используем эвристику на основе reasoning
        const reasoning = decision.decision.reasoning.toLowerCase();
        if (reasoning.includes('баг') || reasoning.includes('ошибк')) {
            return 'bug';
        }
        if (reasoning.includes('улучшен') || reasoning.includes('оптимизац')) {
            return 'improvement';
        }
        if (reasoning.includes('рефакторинг') || reasoning.includes('реструктуризац')) {
            return 'refactoring';
        }
        if (reasoning.includes('документ')) {
            return 'documentation';
        }
        if (reasoning.includes('качеств') || reasoning.includes('проверк')) {
            return 'quality-check';
        }
        return 'feature';
    }
    /**
     * Получение агентов по умолчанию для типа задачи
     */
    getDefaultAgents(taskType) {
        switch (taskType) {
            case 'feature':
                return ['architect', 'backend', 'frontend', 'qa'];
            case 'bug':
                return ['backend', 'qa', 'analyst'];
            case 'improvement':
                return ['analyst', 'backend', 'devops'];
            case 'refactoring':
                return ['architect', 'backend', 'qa'];
            case 'documentation':
                return ['architect'];
            case 'quality-check':
                // Для проверки качества используются все агенты
                return ['backend', 'frontend', 'architect', 'analyst', 'devops', 'qa'];
            default:
                return ['backend'];
        }
    }
    /**
     * Получение весов по умолчанию для типа задачи
     */
    getDefaultWeights(taskType) {
        const agents = this.getDefaultAgents(taskType);
        const weight = 1.0 / agents.length;
        const weights = {};
        agents.forEach(agentId => {
            weights[agentId] = weight;
        });
        return weights;
    }
    /**
     * Сохранение стратегий
     */
    async saveStrategies() {
        // В реальной реализации сохраняем стратегии в файл
        // Пока просто логируем
        console.log('Strategies saved:', Array.from(this.strategies.entries()));
    }
    /**
     * Загрузка стратегий
     */
    async loadStrategies() {
        // В реальной реализации загружаем стратегии из файла
        // Пока используем инициализацию по умолчанию
        this.initializeStrategies();
    }
}
exports.LearningEngine = LearningEngine;
//# sourceMappingURL=learning-engine.js.map