"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrainstormingManager = void 0;
const task_variation_generator_1 = require("./task-variation-generator");
const task_deviation_controller_1 = require("./task-deviation-controller");
/**
 * Менеджер мозгового штурма
 * Управляет процессом параллельной работы нескольких агентов над задачей
 */
class BrainstormingManager {
    constructor() {
        this.activeSessions = new Map();
        this.DEFAULT_TIMEOUT = 600000; // 10 минут
        this.taskVariationGenerator = new task_variation_generator_1.TaskVariationGenerator();
        this.taskDeviationController = new task_deviation_controller_1.TaskDeviationController();
    }
    /**
     * Инициация мозгового штурма
     */
    async initiateBrainstorming(task, agentIds, agents, projectContext, thoughtsCallback) {
        const sessionId = `brainstorm-${task.id}-${Date.now()}`;
        const session = {
            id: sessionId,
            taskId: task.id,
            originalTask: task,
            agentIds: [...agentIds],
            startedAt: new Date(),
            status: 'active',
            solutions: new Map(),
            thoughts: new Map(),
            completedAgents: new Set(),
            taskVariations: new Map(),
            deviationResults: new Map()
        };
        // Инициализируем массивы размышлений для каждого агента
        agentIds.forEach(agentId => {
            session.thoughts.set(agentId, []);
        });
        // Создаем вариации задач для каждого агента
        const taskVariations = await this.createTaskVariations(task, agentIds);
        taskVariations.forEach(variation => {
            session.taskVariations.set(variation.agentId, variation);
        });
        this.activeSessions.set(sessionId, session);
        // Запускаем работу всех агентов параллельно
        const agentPromises = agentIds.map(async (agentId) => {
            const agent = agents.get(agentId);
            if (!agent) {
                console.error(`Agent ${agentId} not found`);
                return;
            }
            // Получаем вариацию задачи для этого агента
            const variation = session.taskVariations.get(agentId);
            const taskForAgent = variation ? variation.variation : task;
            // Устанавливаем callback для размышлений
            if (thoughtsCallback) {
                agent.setThoughtsCallback((thoughts) => {
                    const agentThoughts = session.thoughts.get(agentId) || [];
                    agentThoughts.push(thoughts);
                    session.thoughts.set(agentId, agentThoughts);
                    thoughtsCallback(agentId, thoughts);
                });
            }
            try {
                // Агент размышляет над вариацией задачи
                const thoughts = await agent.think(taskForAgent, projectContext);
                const agentThoughts = session.thoughts.get(agentId) || [];
                agentThoughts.push(thoughts);
                session.thoughts.set(agentId, agentThoughts);
                // Агент предлагает решение
                const solution = await agent.proposeSolution(taskForAgent, thoughts, projectContext);
                session.solutions.set(agentId, solution);
                // Проверяем соответствие исходной задаче
                const deviation = await this.taskDeviationController.checkDeviation(task, solution);
                session.deviationResults.set(agentId, deviation);
                session.completedAgents.add(agentId);
                console.log(`Agent ${agentId} completed brainstorming for task ${task.id} (relevance: ${(deviation.relevance * 100).toFixed(0)}%)`);
            }
            catch (error) {
                console.error(`Error in agent ${agentId} brainstorming:`, error);
                session.completedAgents.add(agentId); // Помечаем как завершенного даже при ошибке
            }
        });
        // Устанавливаем таймаут
        session.timeout = setTimeout(() => {
            if (session.status === 'active') {
                console.warn(`Brainstorming session ${sessionId} timed out`);
                session.status = 'cancelled';
                this.activeSessions.delete(sessionId);
            }
        }, this.DEFAULT_TIMEOUT);
        // Ждем завершения всех агентов (или таймаута)
        await Promise.allSettled(agentPromises);
        // Очищаем таймаут
        if (session.timeout) {
            clearTimeout(session.timeout);
            session.timeout = undefined;
        }
        session.status = 'completed';
        return session;
    }
    /**
     * Ожидание завершения всех агентов
     */
    async waitForAllAgents(sessionId, timeout = this.DEFAULT_TIMEOUT) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const startTime = Date.now();
        // Ждем, пока все агенты не завершат работу
        while (session.completedAgents.size < session.agentIds.length) {
            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout waiting for agents in session ${sessionId}`);
            }
            // Проверяем каждые 100мс
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Собираем все решения
        const solutions = [];
        session.agentIds.forEach(agentId => {
            const solution = session.solutions.get(agentId);
            if (solution) {
                solutions.push(solution);
            }
        });
        return solutions;
    }
    /**
     * Консолидация решений от всех агентов
     */
    async consolidateSolutions(solutions, originalTask, deviationResults) {
        if (solutions.length === 0) {
            throw new Error('No solutions to consolidate');
        }
        // Фильтруем решения с большим отклонением, если есть проверка отклонений
        let filteredSolutions = solutions;
        if (originalTask && deviationResults) {
            filteredSolutions = solutions.filter(solution => {
                const deviation = deviationResults.get(solution.agentId);
                if (!deviation)
                    return true;
                // Исключаем решения с высоким отклонением и низкой релевантностью
                return deviation.deviationLevel !== 'high' && deviation.relevance >= 0.5;
            });
            // Если все решения отфильтрованы, используем исходные
            if (filteredSolutions.length === 0) {
                console.warn('All solutions filtered out due to deviation, using original solutions');
                filteredSolutions = solutions;
            }
        }
        // Приоритизируем релевантные решения
        if (originalTask && deviationResults) {
            filteredSolutions.sort((a, b) => {
                const deviationA = deviationResults.get(a.agentId);
                const deviationB = deviationResults.get(b.agentId);
                const relevanceA = deviationA?.relevance || 0.5;
                const relevanceB = deviationB?.relevance || 0.5;
                // Сначала по релевантности, потом по оценке
                if (Math.abs(relevanceA - relevanceB) > 0.1) {
                    return relevanceB - relevanceA;
                }
                return b.evaluation.overallScore - a.evaluation.overallScore;
            });
        }
        const consolidated = {
            id: `consolidated-${Date.now()}`,
            taskId: filteredSolutions[0].taskId,
            solutions: filteredSolutions,
            reasoning: this.generateConsolidationReasoning(filteredSolutions, deviationResults),
            timestamp: new Date()
        };
        // Выбираем лучшее решение (по релевантности и общему баллу)
        consolidated.bestSolution = filteredSolutions.reduce((best, current) => {
            if (!best) {
                return current;
            }
            // Учитываем релевантность при выборе лучшего решения
            if (originalTask && deviationResults) {
                const deviationBest = deviationResults.get(best.agentId);
                const deviationCurrent = deviationResults.get(current.agentId);
                const relevanceBest = deviationBest?.relevance || 0.5;
                const relevanceCurrent = deviationCurrent?.relevance || 0.5;
                // Комбинированный балл: релевантность * 0.4 + оценка * 0.6
                const scoreBest = relevanceBest * 0.4 + best.evaluation.overallScore * 0.6;
                const scoreCurrent = relevanceCurrent * 0.4 + current.evaluation.overallScore * 0.6;
                return scoreCurrent > scoreBest ? current : best;
            }
            return current.evaluation.overallScore > best.evaluation.overallScore ? current : best;
        });
        return consolidated;
    }
    /**
     * Создание вариаций задач для агентов
     */
    async createTaskVariations(task, agentIds) {
        try {
            return await this.taskVariationGenerator.generateVariations(task, agentIds, 1);
        }
        catch (error) {
            console.error('Error creating task variations:', error);
            // Возвращаем пустой массив, будет использована исходная задача
            return [];
        }
    }
    /**
     * Мониторинг соответствия решений исходной задаче
     */
    async monitorTaskAlignment(sessionId, originalTask) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const deviationResults = new Map();
        // Проверяем каждое решение на соответствие
        for (const [agentId, solution] of session.solutions.entries()) {
            const deviation = await this.taskDeviationController.checkDeviation(originalTask, solution);
            deviationResults.set(agentId, deviation);
            session.deviationResults.set(agentId, deviation);
        }
        return deviationResults;
    }
    /**
     * Запуск доработки при обнаружении отклонения
     */
    async triggerRefinementIfNeeded(sessionId, originalTask, agents, projectContext) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const refinedSolutions = new Map();
        // Проверяем каждое решение на необходимость доработки
        for (const [agentId, solution] of session.solutions.entries()) {
            const deviation = session.deviationResults.get(agentId);
            if (deviation && (deviation.deviationLevel === 'high' || deviation.relevance < 0.7)) {
                const agent = agents.get(agentId);
                if (agent) {
                    console.log(`Refining solution from agent ${agentId} due to deviation`);
                    // Дорабатываем решение на основе обратной связи
                    const refined = await this.refineSolution(solution, deviation.feedback, agent, originalTask, projectContext);
                    refinedSolutions.set(agentId, refined);
                    session.solutions.set(agentId, refined);
                }
            }
        }
        return refinedSolutions;
    }
    /**
     * Доработка решения на основе обратной связи
     */
    async refineSolution(solution, feedback, agent, task, projectContext) {
        // Создаем новую задачу с учетом обратной связи
        const refinedTask = {
            ...task,
            description: `${task.description}\n\nОбратная связь для доработки: ${feedback}\n\nТекущее решение: ${solution.solution.title}`
        };
        // Агент размышляет над доработанной задачей
        const thoughts = await agent.think(refinedTask, projectContext);
        // Генерируем доработанное решение
        const refinedSolution = await agent.proposeSolution(refinedTask, thoughts, projectContext);
        return refinedSolution;
    }
    /**
     * Получение сессии мозгового штурма
     */
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    /**
     * Получение статуса сессии
     */
    getSessionStatus(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return null;
        }
        return {
            status: session.status,
            completed: session.completedAgents.size,
            total: session.agentIds.length,
            solutions: session.solutions.size
        };
    }
    /**
     * Отмена сессии мозгового штурма
     */
    cancelSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.status = 'cancelled';
            if (session.timeout) {
                clearTimeout(session.timeout);
            }
            this.activeSessions.delete(sessionId);
        }
    }
    /**
     * Генерация обоснования консолидации
     */
    generateConsolidationReasoning(solutions, deviationResults) {
        if (solutions.length === 1) {
            const solution = solutions[0];
            const deviation = deviationResults?.get(solution.agentId);
            const relevanceText = deviation
                ? ` (релевантность: ${(deviation.relevance * 100).toFixed(0)}%)`
                : '';
            return `Получено одно решение от агента ${solution.agentName}${relevanceText}.`;
        }
        const agentNames = solutions.map(s => s.agentName).join(', ');
        const bestSolution = solutions.reduce((best, current) => {
            return current.evaluation.overallScore > best.evaluation.overallScore ? current : best;
        });
        let reasoning = `Получено ${solutions.length} решений от агентов: ${agentNames}. ` +
            `Лучшее решение предложено агентом ${bestSolution.agentName} ` +
            `с общим баллом ${bestSolution.evaluation.overallScore.toFixed(2)}.`;
        // Добавляем информацию о релевантности
        if (deviationResults) {
            const bestDeviation = deviationResults.get(bestSolution.agentId);
            if (bestDeviation) {
                reasoning += ` Релевантность: ${(bestDeviation.relevance * 100).toFixed(0)}%.`;
                if (bestDeviation.deviationLevel !== 'none') {
                    reasoning += ` Уровень отклонения: ${bestDeviation.deviationLevel}.`;
                }
            }
        }
        return reasoning;
    }
    /**
     * Очистка старых сессий
     */
    cleanupOldSessions(maxAge = 3600000) {
        const now = Date.now();
        const sessionsToRemove = [];
        this.activeSessions.forEach((session, sessionId) => {
            const age = now - session.startedAt.getTime();
            if (age > maxAge && session.status !== 'active') {
                sessionsToRemove.push(sessionId);
            }
        });
        sessionsToRemove.forEach(sessionId => {
            this.activeSessions.delete(sessionId);
        });
    }
    /**
     * Очистка ресурсов
     */
    dispose() {
        // Отменяем все активные сессии
        this.activeSessions.forEach((session, sessionId) => {
            this.cancelSession(sessionId);
        });
        this.activeSessions.clear();
    }
}
exports.BrainstormingManager = BrainstormingManager;
//# sourceMappingURL=brainstorming-manager.js.map