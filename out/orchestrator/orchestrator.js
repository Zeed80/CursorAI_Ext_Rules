"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const vscode = __importStar(require("vscode"));
const agent_manager_1 = require("./agent-manager");
const task_planner_1 = require("./task-planner");
const project_analyzer_1 = require("./project-analyzer");
const rule_generator_1 = require("./rule-generator");
const task_analytics_1 = require("./task-analytics");
const task_executor_1 = require("./task-executor");
const provider_manager_1 = require("../integration/model-providers/provider-manager");
const quality_controller_1 = require("../quality/quality-controller");
class Orchestrator {
    constructor(context, settingsManager) {
        this.isRunning = false;
        this.tasks = [];
        this.context = context;
        this.settingsManager = settingsManager;
        this.agentManager = new agent_manager_1.AgentManager(context, settingsManager);
        this.taskPlanner = new task_planner_1.TaskPlanner();
        this.projectAnalyzer = new project_analyzer_1.ProjectAnalyzer();
        this.ruleGenerator = new rule_generator_1.RuleGenerator();
        this.taskAnalytics = new task_analytics_1.TaskAnalytics(context, settingsManager);
        this.taskExecutor = new task_executor_1.TaskExecutor(context, this.taskAnalytics);
        this.qualityController = new quality_controller_1.QualityController();
    }
    async start() {
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
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        console.log('Orchestrator stopped');
        // Остановка агентов
        await this.agentManager.stop();
    }
    isRunningState() {
        return this.isRunning;
    }
    /**
     * Анализ проекта
     */
    async analyzeProject() {
        console.log('Orchestrator: Analyzing project...');
        try {
            // Анализ проекта через ProjectAnalyzer
            const profile = await this.projectAnalyzer.analyzeProject();
            console.log('Project profile:', profile);
            // Генерация правил на основе анализа
            const rules = await this.ruleGenerator.generateRulesFromProfile();
            await this.ruleGenerator.saveRules(rules);
            console.log(`Orchestrator: Project analyzed, ${rules.length} rules generated`);
        }
        catch (error) {
            console.error('Error analyzing project:', error);
            throw error;
        }
    }
    /**
     * Создание задачи
     */
    async createTask(task) {
        const newTask = {
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
    async executeTask(taskId) {
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
                        }
                        else {
                            task.status = 'blocked';
                            this.updateTaskStatus(taskId, 'blocked', false, 'Отклонено виртуальным пользователем');
                            console.log(`⚠️ Task ${taskId} rejected by VirtualUser`);
                        }
                    }
                    else {
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
                }
                else {
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
                        }
                        else if (action === 'Принять как есть') {
                            task.status = 'completed';
                            this.updateTaskStatus(taskId, 'completed', true);
                        }
                    });
                }
            }
            else {
                task.status = 'blocked';
                this.updateTaskStatus(taskId, 'blocked', false, result.error);
                const message = `⚠️ Задача не выполнена: ${task.description}\nПричина: ${result.error || 'Неизвестная ошибка'}`;
                vscode.window.showWarningMessage(message, 'Повторить').then(action => {
                    if (action === 'Повторить') {
                        this.executeTask(taskId);
                    }
                });
            }
        }
        catch (error) {
            console.error(`Error executing task ${taskId}:`, error);
            task.status = 'blocked';
            task.executionResult = {
                success: false,
                error: error.message || 'Ошибка выполнения'
            };
            this.updateTaskStatus(taskId, 'blocked', false, error.message);
            vscode.window.showErrorMessage(`❌ Ошибка выполнения задачи: ${task.description}\n${error.message}`);
        }
    }
    /**
     * Консультация с агентом
     */
    async consultAgent(agentId, consultation) {
        console.log(`Consulting agent ${agentId}: ${consultation.question}`);
        // Получение ответа от агента
        const response = await this.agentManager.consultAgent(agentId, consultation);
        return response;
    }
    /**
     * Получение списка задач
     */
    getTasks() {
        return [...this.tasks];
    }
    /**
     * Получение задачи по ID
     */
    getTask(taskId) {
        return this.tasks.find(t => t.id === taskId);
    }
    /**
     * Получение статуса агентов
     */
    getAgentsStatus() {
        // Обновление статусов на основе задач
        this.agentManager.updateStatusFromTasks(this.tasks);
        return this.agentManager.getAllAgentsStatus();
    }
    /**
     * Обновление статуса агента
     */
    updateAgentStatus(agentId, status) {
        this.agentManager.updateAgentStatus(agentId, status);
    }
    /**
     * Получение статистики
     */
    getStatistics() {
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
    updateTaskStatus(taskId, status, isSuccessful = true, errorMessage) {
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
        }
        else if (status === 'blocked' || (status === 'in-progress' && !isSuccessful)) {
            this.taskAnalytics.trackTaskError(task, errorMessage || 'Unknown error');
        }
    }
    /**
     * Получение аналитического отчета
     */
    getAnalyticsReport(startDate, endDate) {
        // Создаем Map с именами агентов
        const agentNames = new Map();
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
        const agentNames = new Map();
        const agents = this.agentManager.getAllAgentsStatus();
        for (const agent of agents) {
            agentNames.set(agent.id, agent.name);
        }
        return this.taskAnalytics.getStatisticsByAgent(agentNames);
    }
    /**
     * Получение метрик задачи
     */
    getTaskMetrics(taskId) {
        return this.taskAnalytics.getTaskMetrics(taskId);
    }
    /**
     * Создать AgentSolution из результата выполнения для проверки качества
     */
    createSolutionFromResult(task, result) {
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
                    type: 'modify',
                    description: `Изменения в ${file}`
                })),
                dependencies: {
                    files: result.filesChanged || [],
                    impact: result.filesChanged && result.filesChanged.length > 5 ? 'high' : 'low'
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
    cancelTask(taskId) {
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
    getAgentManager() {
        return this.agentManager;
    }
    /**
     * Выбор лучшего решения из предложенных агентами
     */
    async selectBestSolution(solutions) {
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
    async refineSolutionWithCursorAI(solution, task) {
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const useCursorAIForRefinement = config.get('useCursorAIForRefinement', false);
        const onlyForCriticalTasks = config.get('cursorAIRefinementOnlyForCritical', true);
        // Проверяем, нужно ли использовать CursorAI
        if (!useCursorAIForRefinement) {
            return solution; // Возвращаем решение без изменений
        }
        if (onlyForCriticalTasks && task.priority !== 'high') {
            return solution; // Используем только для критических задач
        }
        try {
            const manager = provider_manager_1.ModelProviderManager.getInstance();
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
        }
        catch (error) {
            console.error('Orchestrator: Error refining solution with CursorAI:', error);
            return solution; // Возвращаем исходное решение при ошибке
        }
    }
    /**
     * Установить VirtualUser для передачи результатов
     */
    setVirtualUser(virtualUser) {
        this.virtualUser = virtualUser;
        console.log('Orchestrator: VirtualUser connected');
    }
    /**
     * Установить минимальный балл качества
     */
    setMinQualityScore(score) {
        this.qualityController.setMinAcceptableScore(score);
        console.log(`Orchestrator: Min quality score set to ${score}`);
    }
    /**
     * Получить текущий минимальный балл качества
     */
    getMinQualityScore() {
        return this.qualityController.getMinAcceptableScore();
    }
    /**
     * Создать Proposal из результата выполнения для VirtualUser
     */
    createProposalFromResult(task, result) {
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
    dispose() {
        this.taskExecutor.dispose();
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=orchestrator.js.map