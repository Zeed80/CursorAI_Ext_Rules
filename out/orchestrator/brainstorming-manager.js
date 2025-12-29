"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrainstormingManager = void 0;
/**
 * Менеджер мозгового штурма
 * Управляет процессом параллельной работы нескольких агентов над задачей
 */
class BrainstormingManager {
    constructor() {
        this.activeSessions = new Map();
        this.DEFAULT_TIMEOUT = 600000; // 10 минут
    }
    /**
     * Инициация мозгового штурма
     */
    async initiateBrainstorming(task, agentIds, agents, projectContext, thoughtsCallback) {
        const sessionId = `brainstorm-${task.id}-${Date.now()}`;
        const session = {
            id: sessionId,
            taskId: task.id,
            agentIds: [...agentIds],
            startedAt: new Date(),
            status: 'active',
            solutions: new Map(),
            thoughts: new Map(),
            completedAgents: new Set()
        };
        // Инициализируем массивы размышлений для каждого агента
        agentIds.forEach(agentId => {
            session.thoughts.set(agentId, []);
        });
        this.activeSessions.set(sessionId, session);
        // Запускаем работу всех агентов параллельно
        const agentPromises = agentIds.map(async (agentId) => {
            const agent = agents.get(agentId);
            if (!agent) {
                console.error(`Agent ${agentId} not found`);
                return;
            }
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
                // Агент размышляет над задачей
                const thoughts = await agent.think(task, projectContext);
                const agentThoughts = session.thoughts.get(agentId) || [];
                agentThoughts.push(thoughts);
                session.thoughts.set(agentId, agentThoughts);
                // Агент предлагает решение
                const solution = await agent.proposeSolution(task, thoughts, projectContext);
                session.solutions.set(agentId, solution);
                session.completedAgents.add(agentId);
                console.log(`Agent ${agentId} completed brainstorming for task ${task.id}`);
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
    async consolidateSolutions(solutions) {
        if (solutions.length === 0) {
            throw new Error('No solutions to consolidate');
        }
        const consolidated = {
            id: `consolidated-${Date.now()}`,
            taskId: solutions[0].taskId,
            solutions,
            reasoning: this.generateConsolidationReasoning(solutions),
            timestamp: new Date()
        };
        // Выбираем лучшее решение (по общему баллу)
        consolidated.bestSolution = solutions.reduce((best, current) => {
            if (!best) {
                return current;
            }
            return current.evaluation.overallScore > best.evaluation.overallScore ? current : best;
        });
        return consolidated;
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
    generateConsolidationReasoning(solutions) {
        if (solutions.length === 1) {
            return `Получено одно решение от агента ${solutions[0].agentName}.`;
        }
        const agentNames = solutions.map(s => s.agentName).join(', ');
        const bestSolution = solutions.reduce((best, current) => {
            return current.evaluation.overallScore > best.evaluation.overallScore ? current : best;
        });
        return `Получено ${solutions.length} решений от агентов: ${agentNames}. ` +
            `Лучшее решение предложено агентом ${bestSolution.agentName} ` +
            `с общим баллом ${bestSolution.evaluation.overallScore.toFixed(2)}.`;
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