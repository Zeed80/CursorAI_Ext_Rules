import * as vscode from 'vscode';
import { Task } from './orchestrator';
import { LocalAgent, AgentSolution, AgentThoughts, ProjectContext } from '../agents/local-agent';
import { TaskVariationGenerator, TaskVariation } from './task-variation-generator';
import { TaskDeviationController, DeviationResult } from './task-deviation-controller';

/**
 * Сессия мозгового штурма
 */
export interface BrainstormingSession {
    id: string;
    taskId: string;
    originalTask: Task;
    agentIds: string[];
    startedAt: Date;
    status: 'active' | 'completed' | 'cancelled';
    solutions: Map<string, AgentSolution>;
    thoughts: Map<string, AgentThoughts[]>;
    completedAgents: Set<string>;
    taskVariations: Map<string, TaskVariation>; // agentId -> variation
    deviationResults: Map<string, DeviationResult>; // agentId -> deviation
    timeout?: NodeJS.Timeout;
}

/**
 * Консолидированное решение
 */
export interface ConsolidatedSolution {
    id: string;
    taskId: string;
    solutions: AgentSolution[];
    merged?: AgentSolution;
    bestSolution?: AgentSolution;
    reasoning: string;
    timestamp: Date;
}

/**
 * Менеджер мозгового штурма
 * Управляет процессом параллельной работы нескольких агентов над задачей
 */
export class BrainstormingManager {
    private activeSessions: Map<string, BrainstormingSession> = new Map();
    private readonly DEFAULT_TIMEOUT = 600000; // 10 минут
    private taskVariationGenerator: TaskVariationGenerator;
    private taskDeviationController: TaskDeviationController;

    constructor() {
        this.taskVariationGenerator = new TaskVariationGenerator();
        this.taskDeviationController = new TaskDeviationController();
    }

    /**
     * Инициация мозгового штурма
     */
    async initiateBrainstorming(
        task: Task,
        agentIds: string[],
        agents: Map<string, LocalAgent>,
        projectContext: ProjectContext,
        thoughtsCallback?: (agentId: string, thoughts: AgentThoughts) => void
    ): Promise<BrainstormingSession> {
        const sessionId = `brainstorm-${task.id}-${Date.now()}`;
        
        const session: BrainstormingSession = {
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
            } catch (error) {
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
    async waitForAllAgents(sessionId: string, timeout: number = this.DEFAULT_TIMEOUT): Promise<AgentSolution[]> {
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
        const solutions: AgentSolution[] = [];
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
    async consolidateSolutions(
        solutions: AgentSolution[],
        originalTask?: Task,
        deviationResults?: Map<string, DeviationResult>
    ): Promise<ConsolidatedSolution> {
        if (solutions.length === 0) {
            throw new Error('No solutions to consolidate');
        }

        // Фильтруем решения с большим отклонением, если есть проверка отклонений
        let filteredSolutions = solutions;
        if (originalTask && deviationResults) {
            filteredSolutions = solutions.filter(solution => {
                const deviation = deviationResults.get(solution.agentId);
                if (!deviation) return true;
                
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

        const consolidated: ConsolidatedSolution = {
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
    private async createTaskVariations(
        task: Task,
        agentIds: string[]
    ): Promise<TaskVariation[]> {
        try {
            return await this.taskVariationGenerator.generateVariations(task, agentIds, 1);
        } catch (error) {
            console.error('Error creating task variations:', error);
            // Возвращаем пустой массив, будет использована исходная задача
            return [];
        }
    }

    /**
     * Мониторинг соответствия решений исходной задаче
     */
    async monitorTaskAlignment(
        sessionId: string,
        originalTask: Task
    ): Promise<Map<string, DeviationResult>> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const deviationResults = new Map<string, DeviationResult>();

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
    async triggerRefinementIfNeeded(
        sessionId: string,
        originalTask: Task,
        agents: Map<string, LocalAgent>,
        projectContext: ProjectContext
    ): Promise<Map<string, AgentSolution>> {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const refinedSolutions = new Map<string, AgentSolution>();

        // Проверяем каждое решение на необходимость доработки
        for (const [agentId, solution] of session.solutions.entries()) {
            const deviation = session.deviationResults.get(agentId);
            
            if (deviation && (deviation.deviationLevel === 'high' || deviation.relevance < 0.7)) {
                const agent = agents.get(agentId);
                if (agent) {
                    console.log(`Refining solution from agent ${agentId} due to deviation`);
                    
                    // Дорабатываем решение на основе обратной связи
                    const refined = await this.refineSolution(
                        solution,
                        deviation.feedback,
                        agent,
                        originalTask,
                        projectContext
                    );
                    
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
    async refineSolution(
        solution: AgentSolution,
        feedback: string,
        agent: LocalAgent,
        task: Task,
        projectContext: ProjectContext
    ): Promise<AgentSolution> {
        // Создаем новую задачу с учетом обратной связи
        const refinedTask: Task = {
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
    getSession(sessionId: string): BrainstormingSession | undefined {
        return this.activeSessions.get(sessionId);
    }

    /**
     * Получение статуса сессии
     */
    getSessionStatus(sessionId: string): {
        status: BrainstormingSession['status'];
        completed: number;
        total: number;
        solutions: number;
    } | null {
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
    cancelSession(sessionId: string): void {
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
    private generateConsolidationReasoning(
        solutions: AgentSolution[],
        deviationResults?: Map<string, DeviationResult>
    ): string {
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
    cleanupOldSessions(maxAge: number = 3600000): void {
        const now = Date.now();
        const sessionsToRemove: string[] = [];

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
    dispose(): void {
        // Отменяем все активные сессии
        this.activeSessions.forEach((session, sessionId) => {
            this.cancelSession(sessionId);
        });
        this.activeSessions.clear();
    }
}
