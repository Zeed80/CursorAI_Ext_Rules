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
import { QualityController, QualityReport } from '../quality/quality-controller';
import { OrchestratorLogger } from './orchestrator-logger';

export interface Task {
    id: string;
    type: 'feature' | 'bug' | 'improvement' | 'refactoring' | 'documentation' | 'quality-check' | 'analysis';
    description: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
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
    // Результаты проверки качества от QualityController
    qualityReport?: QualityReport;
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
    private qualityController: QualityController;
    protected logger: OrchestratorLogger;
    private isRunning: boolean = false;
    private tasks: Task[] = [];
    private virtualUser?: any; // VirtualUser instance (избегаем циклической зависимости)

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
        this.qualityController = new QualityController();
        this.logger = OrchestratorLogger.getInstance();
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Оркестратор уже запущен');
            return;
        }

        this.isRunning = true;
        this.logger.orchestratorStart();
        this.logger.show(); // Показываем панель Output
        
        // Инициализация агентов
        this.logger.info('Инициализация агентов...');
        await this.agentManager.initialize();
        
        // Обновляем статус оркестратора на "working"
        this.agentManager.updateAgentStatus('orchestrator', {
            status: 'working',
            lastActivity: new Date()
        });
        
        this.logger.success('Агенты инициализированы и готовы к работе');
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
        
        // Логирование начала задачи
        this.logger.taskStart(newTask.id, newTask.description);
        this.logger.info(`Приоритет: ${newTask.priority.toUpperCase()}`);
        this.logger.info(`Тип: ${newTask.type}`);
        
        // Планирование выполнения задачи
        this.logger.taskProgress(newTask.id, 'Планирование задачи...');
        await this.taskPlanner.planTask(newTask, this.agentManager);
        
        // Обновляем статус назначенного агента
        if (newTask.assignedAgent) {
            this.logger.taskProgress(newTask.id, `Назначен агент: ${newTask.assignedAgent}`);
            this.agentManager.updateAgentStatus(newTask.assignedAgent, {
                status: 'working',
                currentTask: newTask,
                lastActivity: new Date()
            });
        }
        
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
                // НОВОЕ: Проверка качества решения перед завершением
                console.log(`Orchestrator: Checking quality for task ${taskId}...`);
                
                // Создаем AgentSolution из результата для проверки качества
                const solution = this.createSolutionFromResult(task, result);
                const qualityReport = await this.qualityController.validateSolution(solution);
                
                // Сохраняем результат проверки качества в задачу
                task.qualityReport = qualityReport;
                
                if (qualityReport.passed) {
                    // Качество прошло проверку - передать VirtualUser для финального подтверждения
                    if (this.virtualUser) {
                        console.log(`Orchestrator: Sending result to VirtualUser for approval...`);
                        const proposal = this.createProposalFromResult(task, result);
                        const approved = await this.virtualUser.makeDecision(proposal);
                        
                        if (approved) {
                            task.status = 'completed';
                            this.updateTaskStatus(taskId, 'completed', true);
                            console.log(`✅ Task ${taskId} completed and approved by VirtualUser`);
                        } else {
                            task.status = 'blocked';
                            this.updateTaskStatus(taskId, 'blocked', false, 'Отклонено виртуальным пользователем');
                            console.log(`⚠️ Task ${taskId} rejected by VirtualUser`);
                        }
                    } else {
                        // VirtualUser не подключен - автоматически одобряем
                        task.status = 'completed';
                        this.updateTaskStatus(taskId, 'completed', true);
                        console.log(`✅ Task ${taskId} completed (no VirtualUser, auto-approved)`);
                    }
                    
                    // Показываем уведомление о завершении с оценкой качества
                    const filesCount = Array.isArray(result.filesChanged) ? result.filesChanged.length : (result.filesChanged || 0);
                    const message = `✅ Задача выполнена: ${task.description}\nИзменено файлов: ${filesCount}\nКачество: ${qualityReport.score}/100`;
                    vscode.window.showInformationMessage(message, 'Просмотреть изменения').then(action => {
                        if (action === 'Просмотреть изменения' && filesCount > 0) {
                            vscode.commands.executeCommand('workbench.action.showAllEditors');
                        }
                    });
                } else {
                    // Качество не прошло проверку
                    task.status = 'blocked';
                    this.updateTaskStatus(taskId, 'blocked', false, `Качество недостаточно: ${qualityReport.score}/100`);
                    
                    const issuesSummary = qualityReport.issues
                        .slice(0, 3)
                        .map(i => `- ${i.severity}: ${i.message}`)
                        .join('\n');
                    
                    const message = `⚠️ Задача выполнена, но качество недостаточно\nОценка: ${qualityReport.score}/100\nПроблемы:\n${issuesSummary}`;
                    vscode.window.showWarningMessage(message, 'Повторить с улучшениями', 'Принять как есть').then(action => {
                        if (action === 'Повторить с улучшениями') {
                            // Добавляем в описание задачи рекомендации по качеству
                            task.description += `\n\nУлучшить качество:\n${qualityReport.recommendations.join('\n')}`;
                            this.executeTask(taskId);
                        } else if (action === 'Принять как есть') {
                            task.status = 'completed';
                            this.updateTaskStatus(taskId, 'completed', true);
                        }
                    });
                }
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
     * Создать AgentSolution из результата выполнения для проверки качества
     */
    private createSolutionFromResult(task: Task, result: TaskExecutionResult): AgentSolution {
        return {
            id: `solution-${task.id}`,
            agentId: task.assignedAgent || 'orchestrator',
            agentName: task.assignedAgent || 'Orchestrator',
            taskId: task.id,
            timestamp: new Date(),
            solution: {
                title: task.description,
                description: result.message || 'Задача выполнена',
                approach: 'Автоматическое выполнение через агента',
                filesToModify: result.filesChanged || [],
                codeChanges: (result.filesChanged || []).map(file => ({
                    file,
                    type: 'modify' as const,
                    description: `Изменения в ${file}`
                })),
                dependencies: {
                    files: result.filesChanged || [],
                    impact: result.filesChanged && result.filesChanged.length > 5 ? 'high' as const : 'low' as const
                }
            },
            evaluation: {
                quality: 0.8,
                performance: 0.8,
                security: 0.8,
                maintainability: 0.8,
                compliance: 0.8,
                overallScore: 0.8
            },
            reasoning: result.message || 'Задача выполнена успешно',
            confidence: 0.8,
            estimatedTime: 0
        };
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
     * Установить VirtualUser для передачи результатов
     */
    setVirtualUser(virtualUser: any): void {
        this.virtualUser = virtualUser;
        console.log('Orchestrator: VirtualUser connected');
    }
    
    /**
     * Установить минимальный балл качества
     */
    setMinQualityScore(score: number): void {
        this.qualityController.setMinAcceptableScore(score);
        console.log(`Orchestrator: Min quality score set to ${score}`);
    }
    
    /**
     * Получить текущий минимальный балл качества
     */
    getMinQualityScore(): number {
        return this.qualityController.getMinAcceptableScore();
    }
    
    /**
     * Создать Proposal из результата выполнения для VirtualUser
     */
    private createProposalFromResult(task: Task, result: TaskExecutionResult): any {
        return {
            id: `proposal-${task.id}`,
            title: `Результат: ${task.description}`,
            description: result.message || 'Задача выполнена',
            files: result.filesChanged || [],
            risks: [],
            benefits: [
                `Изменено файлов: ${result.filesChanged?.length || 0}`,
                `Время выполнения: ${result.executionTime ? Math.round(result.executionTime / 1000) : 0}с`
            ],
            estimatedTime: result.executionTime ? `${Math.round(result.executionTime / 1000)}с` : '0с',
            confidence: 0.8
        };
    }
    
    /**
     * Очистка ресурсов
     */
    dispose(): void {
        this.taskExecutor.dispose();
    }
}
