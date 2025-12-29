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
     * Очистка ресурсов
     */
    dispose() {
        this.taskExecutor.dispose();
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=orchestrator.js.map