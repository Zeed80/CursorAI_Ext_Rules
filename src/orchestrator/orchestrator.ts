import * as vscode from 'vscode';
import { SettingsManager } from '../integration/settings-manager';
import { AgentManager } from './agent-manager';
import { TaskPlanner } from './task-planner';
import { ProjectAnalyzer } from './project-analyzer';
import { RuleGenerator } from './rule-generator';
import { TaskAnalytics, AnalyticsReport } from './task-analytics';
import { TaskExecutor, TaskExecutionResult } from './task-executor';
import { QualityCheckResult } from './quality-checker';
import { AgentSolution } from '../agents/local-agent';
import { ModelProviderManager } from '../integration/model-providers/provider-manager';

export interface Task {
    id: string;
    type: 'feature' | 'bug' | 'improvement' | 'refactoring' | 'documentation' | 'quality-check';
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    assignedAgent?: string;
    createdAt: Date;
    // Расширенные поля для отслеживания прогресса
    progress?: {
        filesChanged: number;
        timeElapsed: number;
        isActive: boolean;
        lastActivity?: Date;
    };
    executionResult?: TaskExecutionResult;
    // Для задач проверки качества
    parentTaskId?: string; // ID родительской задачи проверки качества
    qualityCheckResults?: QualityCheckResult[];
}

export interface AgentConsultation {
    agentId: string;
    question: string;
    context: string;
}

export class Orchestrator {
    private context: vscode.ExtensionContext;
    protected settingsManager: SettingsManager;
    private agentManager: AgentManager;
    private taskPlanner: TaskPlanner;
    protected projectAnalyzer: ProjectAnalyzer;
    private ruleGenerator: RuleGenerator;
    private taskAnalytics: TaskAnalytics;
    private taskExecutor: TaskExecutor;
    private isRunning: boolean = false;
    private tasks: Task[] = [];

    constructor(
        context: vscode.ExtensionContext,
        settingsManager: SettingsManager
    ) {
        this.context = context;
        this.settingsManager = settingsManager;
        this.agentManager = new AgentManager(context, settingsManager);
        this.taskPlanner = new TaskPlanner();
        this.projectAnalyzer = new ProjectAnalyzer();
        this.ruleGenerator = new RuleGenerator();
        this.taskAnalytics = new TaskAnalytics(context, settingsManager);
        this.taskExecutor = new TaskExecutor(context, this.taskAnalytics);
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('Orchestrator is already running');
            return;
        }

        this.isRunning = true;
        console.log('Orchestrator started');
        
        // Инициализация агентов
        await this.agentManager.initialize();
        
        // Обновляем статус оркестратора на "working"
        this.agentManager.updateAgentStatus('orchestrator', {
            status: 'working',
            lastActivity: new Date()
        });
        
        console.log('Agents initialized and ready');
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        console.log('Orchestrator stopped');
        
        // Остановка агентов
        await this.agentManager.stop();
    }

    isRunningState(): boolean {
        return this.isRunning;
    }

    /**
     * Анализ проекта
     */
    async analyzeProject(): Promise<void> {
        console.log('Orchestrator: Analyzing project...');
        
        try {
            // Анализ проекта через ProjectAnalyzer
            const profile = await this.projectAnalyzer.analyzeProject();
            console.log('Project profile:', profile);

            // Генерация правил на основе анализа
            const rules = await this.ruleGenerator.generateRulesFromProfile();
            await this.ruleGenerator.saveRules(rules);

            console.log(`Orchestrator: Project analyzed, ${rules.length} rules generated`);
        } catch (error) {
            console.error('Error analyzing project:', error);
            throw error;
        }
    }

    /**
     * Создание задачи
     */
    async createTask(task: Omit<Task, 'id' | 'status' | 'createdAt'>): Promise<Task> {
        const newTask: Task = {
            ...task,
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'pending',
            createdAt: new Date()
        };

        this.tasks.push(newTask);
        
        // Планирование выполнения задачи
        await this.taskPlanner.planTask(newTask, this.agentManager);
        
        // Обновляем статус назначенного агента
        if (newTask.assignedAgent) {
            this.agentManager.updateAgentStatus(newTask.assignedAgent, {
                status: 'working',
                currentTask: newTask,
                lastActivity: new Date()
            });
        }
        
        console.log(`Task created: ${newTask.id} - ${newTask.description} (assigned to: ${newTask.assignedAgent})`);
        
        // Начинаем отслеживание задачи в аналитике
        this.taskAnalytics.trackTaskStart(newTask);
        
        // Автоматически начинаем выполнение задачи
        await this.executeTask(newTask.id);
        
        return newTask;
    }

    /**
     * Выполнение задачи
     */
    async executeTask(taskId: string): Promise<void> {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.error(`Task ${taskId} not found`);
            return;
        }

        if (task.status === 'completed') {
            return;
        }

        task.status = 'in-progress';
        task.progress = {
            filesChanged: 0,
            timeElapsed: 0,
            isActive: true,
            lastActivity: new Date()
        };

        console.log(`Executing task: ${task.id} - ${task.description}`);

        // Обновляем статус агента
        if (task.assignedAgent) {
            this.agentManager.updateAgentStatus(task.assignedAgent, {
                status: 'working',
                currentTask: task,
                lastActivity: new Date()
            });
        }

        // Реальное выполнение задачи через TaskExecutor
        try {
            const result = await this.taskExecutor.executeTask(task);
            task.executionResult = result;

            if (result.success) {
                task.status = 'completed';
                this.updateTaskStatus(taskId, 'completed', true);
                
                // Показываем уведомление о завершении
                const filesCount = Array.isArray(result.filesChanged) ? result.filesChanged.length : (result.filesChanged || 0);
                const message = `✅ Задача выполнена: ${task.description}\nИзменено файлов: ${filesCount}`;
                vscode.window.showInformationMessage(message, 'Просмотреть изменения').then(action => {
                    if (action === 'Просмотреть изменения' && filesCount > 0) {
                        // Можно открыть список измененных файлов
                        vscode.commands.executeCommand('workbench.action.showAllEditors');
                    }
                });
            } else {
                task.status = 'blocked';
                this.updateTaskStatus(taskId, 'blocked', false, result.error);
                
                const message = `⚠️ Задача не выполнена: ${task.description}\nПричина: ${result.error || 'Неизвестная ошибка'}`;
                vscode.window.showWarningMessage(message, 'Повторить').then(action => {
                    if (action === 'Повторить') {
                        this.executeTask(taskId);
                    }
                });
            }
        } catch (error: any) {
            console.error(`Error executing task ${taskId}:`, error);
            task.status = 'blocked';
            task.executionResult = {
                success: false,
                error: error.message || 'Ошибка выполнения'
            };
            this.updateTaskStatus(taskId, 'blocked', false, error.message);
            
            vscode.window.showErrorMessage(
                `❌ Ошибка выполнения задачи: ${task.description}\n${error.message}`
            );
        }
    }

    /**
     * Консультация с агентом
     */
    async consultAgent(agentId: string, consultation: AgentConsultation): Promise<string> {
        console.log(`Consulting agent ${agentId}: ${consultation.question}`);
        
        // Получение ответа от агента
        const response = await this.agentManager.consultAgent(agentId, consultation);
        
        return response;
    }

    /**
     * Получение списка задач
     */
    getTasks(): Task[] {
        return [...this.tasks];
    }

    /**
     * Получение задачи по ID
     */
    getTask(taskId: string): Task | undefined {
        return this.tasks.find(t => t.id === taskId);
    }

    /**
     * Получение статуса агентов
     */
    getAgentsStatus(): any[] {
        // Обновление статусов на основе задач
        this.agentManager.updateStatusFromTasks(this.tasks);
        return this.agentManager.getAllAgentsStatus();
    }

    /**
     * Обновление статуса агента
     */
    updateAgentStatus(agentId: string, status: Partial<any>): void {
        this.agentManager.updateAgentStatus(agentId, status);
    }

    /**
     * Получение статистики
     */
    getStatistics(): {
        totalTasks: number;
        tasksInProgress: number;
        tasksCompleted: number;
        tasksPending: number;
        activeAgents: number;
        totalAgents: number;
    } {
        const tasksInProgress = this.tasks.filter(t => t.status === 'in-progress').length;
        const tasksCompleted = this.tasks.filter(t => t.status === 'completed').length;
        const tasksPending = this.tasks.filter(t => t.status === 'pending').length;
        const agents = this.agentManager.getAllAgentsStatus();
        const activeAgents = agents.filter(a => a.status === 'working').length;

        return {
            totalTasks: this.tasks.length,
            tasksInProgress,
            tasksCompleted,
            tasksPending,
            activeAgents,
            totalAgents: agents.length
        };
    }

    /**
     * Обновление статуса задачи (с отслеживанием в аналитике)
     */
    updateTaskStatus(taskId: string, status: Task['status'], isSuccessful: boolean = true, errorMessage?: string): void {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.error(`Task ${taskId} not found`);
            return;
        }

        const oldStatus = task.status;
        task.status = status;

        // Отслеживание в аналитике
        if (oldStatus !== 'completed' && status === 'completed') {
            this.taskAnalytics.trackTaskComplete(task, isSuccessful, errorMessage);
        } else if (status === 'blocked' || (status === 'in-progress' && !isSuccessful)) {
            this.taskAnalytics.trackTaskError(task, errorMessage || 'Unknown error');
        }
    }

    /**
     * Получение аналитического отчета
     */
    getAnalyticsReport(startDate?: Date, endDate?: Date): AnalyticsReport {
        // Создаем Map с именами агентов
        const agentNames = new Map<string, string>();
        const agents = this.agentManager.getAllAgentsStatus();
        for (const agent of agents) {
            agentNames.set(agent.id, agent.name);
        }

        return this.taskAnalytics.generateReport(startDate, endDate, agentNames);
    }

    /**
     * Получение статистики по типам задач
     */
    getStatisticsByType() {
        return this.taskAnalytics.getStatisticsByType();
    }

    /**
     * Получение статистики по агентам
     */
    getStatisticsByAgent() {
        const agentNames = new Map<string, string>();
        const agents = this.agentManager.getAllAgentsStatus();
        for (const agent of agents) {
            agentNames.set(agent.id, agent.name);
        }
        return this.taskAnalytics.getStatisticsByAgent(agentNames);
    }

    /**
     * Получение метрик задачи
     */
    getTaskMetrics(taskId: string) {
        return this.taskAnalytics.getTaskMetrics(taskId);
    }

    /**
     * Остановка выполнения задачи
     */
    cancelTask(taskId: string): void {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status === 'in-progress') {
            this.taskExecutor.cancelTaskExecution(taskId);
            task.status = 'blocked';
            task.progress = undefined;
            
            if (task.assignedAgent) {
                this.agentManager.updateAgentStatus(task.assignedAgent, {
                    status: 'idle',
                    currentTask: undefined,
                    lastActivity: new Date()
                });
            }
        }
    }

    /**
     * Получение AgentManager
     */
    getAgentManager(): AgentManager {
        return this.agentManager;
    }

    /**
     * Выбор лучшего решения из предложенных агентами
     */
    async selectBestSolution(solutions: AgentSolution[]): Promise<AgentSolution> {
        if (solutions.length === 0) {
            throw new Error('No solutions provided');
        }

        if (solutions.length === 1) {
            return solutions[0];
        }

        // Оцениваем решения по нескольким критериям
        const scoredSolutions = solutions.map(solution => {
            let score = 0;

            // Оценка качества (0-1) * 0.3
            score += (solution.evaluation.quality || 0.5) * 0.3;

            // Оценка уверенности (0-1) * 0.25
            score += solution.confidence * 0.25;

            // Оценка общего балла (0-1) * 0.25
            score += solution.evaluation.overallScore * 0.25;

            // Обратная оценка сложности (меньше сложность = выше балл) * 0.1
            const complexityScore = solution.solution.codeChanges.reduce((sum, change) => {
                const lines = change.estimatedLines || 50;
                return sum + (lines > 200 ? 0.3 : lines > 100 ? 0.6 : 1.0);
            }, 0) / solution.solution.codeChanges.length;
            score += complexityScore * 0.1;

            // Оценка влияния на зависимости (меньше влияние = выше балл) * 0.1
            const impactScore = solution.solution.dependencies.impact === 'low' ? 1.0 :
                              solution.solution.dependencies.impact === 'medium' ? 0.6 : 0.3;
            score += impactScore * 0.1;

            return { solution, score };
        });

        // Сортируем по убыванию балла
        scoredSolutions.sort((a, b) => b.score - a.score);

        console.log(`Orchestrator: Selected best solution from ${solutions.length} options. Score: ${scoredSolutions[0].score.toFixed(2)}`);

        return scoredSolutions[0].solution;
    }

    /**
     * Опциональная финальная обработка решения через CursorAI
     * Используется только для критических задач или если включено в настройках
     */
    async refineSolutionWithCursorAI(solution: AgentSolution, task: Task): Promise<AgentSolution> {
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const useCursorAIForRefinement = config.get<boolean>('useCursorAIForRefinement', false);
        const onlyForCriticalTasks = config.get<boolean>('cursorAIRefinementOnlyForCritical', true);

        // Проверяем, нужно ли использовать CursorAI
        if (!useCursorAIForRefinement) {
            return solution; // Возвращаем решение без изменений
        }

        if (onlyForCriticalTasks && task.priority !== 'high') {
            return solution; // Используем только для критических задач
        }

        try {
            const manager = ModelProviderManager.getInstance();
            const cursorAIProvider = manager.getProvider('cursorai');

            if (!cursorAIProvider) {
                console.warn('Orchestrator: CursorAI provider not available for refinement');
                return solution;
            }

            const isAvailable = await cursorAIProvider.isAvailable();
            if (!isAvailable) {
                console.warn('Orchestrator: CursorAI provider not available');
                return solution;
            }

            // Формируем промпт для улучшения решения
            const refinementPrompt = `Ты - опытный архитектор программного обеспечения. 

Задача: ${task.description}
Тип задачи: ${task.type}
Приоритет: ${task.priority}

Предложенное решение:
Название: ${solution.solution.title}
Описание: ${solution.solution.description}
Подход: ${solution.solution.approach}
Файлы для изменения: ${solution.solution.filesToModify.join(', ')}

Оценка решения:
- Качество: ${solution.evaluation.quality}
- Производительность: ${solution.evaluation.performance}
- Безопасность: ${solution.evaluation.security}
- Поддерживаемость: ${solution.evaluation.maintainability}
- Соответствие стандартам: ${solution.evaluation.compliance}
- Общий балл: ${solution.evaluation.overallScore}

Проверь решение и предложи улучшения, если они необходимы. 
Верни улучшенное решение в том же формате, или подтверди, что решение оптимально.`;

            const result = await cursorAIProvider.call(refinementPrompt, {
                temperature: 0.3, // Низкая температура для более точных ответов
                maxTokens: 2000
            });

            // Парсим улучшенное решение из ответа (упрощенная версия)
            // В реальной реализации здесь должен быть более сложный парсинг
            if (result.text && result.text.length > 100) {
                // Если ответ достаточно детальный, считаем, что решение было улучшено
                console.log('Orchestrator: Solution refined with CursorAI');
                // Можно добавить более детальную обработку ответа для обновления solution
            }

            return solution;
        } catch (error: any) {
            console.error('Orchestrator: Error refining solution with CursorAI:', error);
            return solution; // Возвращаем исходное решение при ошибке
        }
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        this.taskExecutor.dispose();
    }
}
