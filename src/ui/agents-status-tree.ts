import * as vscode from 'vscode';
import { Task } from '../orchestrator/orchestrator';
import { AgentThoughts } from '../agents/local-agent';
import { LanguageModelInfo } from '../integration/model-provider';

export interface AgentStatus {
    id: string;
    name: string;
    status: 'idle' | 'working' | 'error' | 'disabled';
    currentTask?: Task;
    tasksCompleted: number;
    tasksInProgress: number;
    lastActivity?: Date;
    currentThoughts?: AgentThoughts;
    errorMessage?: string; // Сообщение об ошибке, если агент не работает
    diagnostics?: AgentDiagnostics; // Диагностическая информация
    selectedModel?: LanguageModelInfo; // Выбранная языковая модель
}

export interface AgentDiagnostics {
    llmAvailable: boolean;
    llmError?: string;
    agentRegistered: boolean;
    agentInitialized: boolean;
    lastCheckTime?: Date;
}

export class AgentsStatusTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private agents: Map<string, AgentStatus> = new Map();
    private tasks: Task[] = [];

    constructor() {
        // Инициализация стандартных агентов
        this.initializeAgents();
    }

    private initializeAgents(): void {
        const defaultAgents: AgentStatus[] = [
            { id: 'orchestrator', name: 'Оркестратор', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'backend', name: 'Backend Developer', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'frontend', name: 'Frontend Developer', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'architect', name: 'Software Architect', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'analyst', name: 'Data Analyst', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'devops', name: 'DevOps Engineer', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'qa', name: 'QA Engineer', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'virtual-user', name: 'Виртуальный пользователь', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
            { id: 'self-improver', name: 'Система самосовершенствования', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 }
        ];

        for (const agent of defaultAgents) {
            this.agents.set(agent.id, agent);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateAgentStatus(agentId: string, status: Partial<AgentStatus>): void {
        const agent = this.agents.get(agentId);
        if (agent) {
            Object.assign(agent, status);
            if (status.status === 'working') {
                agent.lastActivity = new Date();
            }
            this.refresh();
        }
    }

    updateAgentThoughts(agentId: string, thoughts: AgentThoughts): void {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.currentThoughts = thoughts;
            agent.lastActivity = new Date();
            this.refresh();
        }
    }

    updateTasks(tasks: Task[]): void {
        this.tasks = tasks;
        
        // Обновление статистики агентов
        for (const agent of this.agents.values()) {
            agent.tasksInProgress = tasks.filter(t => 
                t.assignedAgent === agent.id && t.status === 'in-progress'
            ).length;
            agent.tasksCompleted = tasks.filter(t => 
                t.assignedAgent === agent.id && t.status === 'completed'
            ).length;
            
            const currentTask = tasks.find(t => 
                t.assignedAgent === agent.id && t.status === 'in-progress'
            );
            agent.currentTask = currentTask;
            
            if (currentTask) {
                agent.status = 'working';
            } else if (agent.tasksInProgress === 0 && agent.status === 'working') {
                agent.status = 'idle';
            }
        }
        
        this.refresh();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            // Корневые элементы - агенты
            return Promise.resolve(
                Array.from(this.agents.values()).map(agent => 
                    new AgentTreeItem(agent, vscode.TreeItemCollapsibleState.Collapsed)
                )
            );
        } else if (element instanceof AgentTreeItem) {
            // Дочерние элементы - задачи агента
            const agent = element.agent;
            const agentTasks = this.tasks.filter(t => t.assignedAgent === agent.id);
            
            if (agentTasks.length === 0) {
                return Promise.resolve([
                    new AgentTreeItem(
                        { id: 'no-tasks', name: 'Нет задач', status: 'idle', tasksCompleted: 0, tasksInProgress: 0 },
                        vscode.TreeItemCollapsibleState.None
                    )
                ]);
            }

            return Promise.resolve(
                agentTasks.map(task => 
                    new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None)
                )
            );
        }

        return Promise.resolve([]);
    }

    getAgentStatus(agentId: string): AgentStatus | undefined {
        return this.agents.get(agentId);
    }

    getAllAgents(): AgentStatus[] {
        return Array.from(this.agents.values());
    }

    /**
     * Получение задач агента (любого статуса)
     */
    getAgentTasks(agentId: string): Task[] {
        return this.tasks.filter(t => t.assignedAgent === agentId);
    }

    /**
     * Получение первой задачи агента (для передачи в чат)
     */
    getFirstAgentTask(agentId: string): Task | undefined {
        const agentTasks = this.getAgentTasks(agentId);
        // Приоритет: pending > in-progress > blocked > completed
        return agentTasks.find(t => t.status === 'pending') ||
               agentTasks.find(t => t.status === 'in-progress') ||
               agentTasks.find(t => t.status === 'blocked') ||
               agentTasks[0];
    }
}

class AgentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly agent: AgentStatus,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(agent.name, collapsibleState);
        
        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.iconPath = this.getIcon();
        this.contextValue = 'agent';
    }

    private getTooltip(): string {
        let tooltip = `${this.agent.name}\n`;
        tooltip += `Статус: ${this.getStatusText()}\n`;
        tooltip += `Задач в работе: ${this.agent.tasksInProgress}\n`;
        tooltip += `Задач выполнено: ${this.agent.tasksCompleted}`;
        
        if (this.agent.currentTask) {
            tooltip += `\n\nТекущая задача: ${this.agent.currentTask.description}`;
        }
        
        if (this.agent.lastActivity) {
            tooltip += `\nПоследняя активность: ${this.agent.lastActivity.toLocaleTimeString()}`;
        }

        // Добавляем информацию об ошибках
        if (this.agent.status === 'error' && this.agent.errorMessage) {
            tooltip += `\n\n❌ Ошибка: ${this.agent.errorMessage}`;
        }

        // Добавляем диагностическую информацию
        if (this.agent.diagnostics) {
            tooltip += `\n\nДиагностика:`;
            tooltip += `\n  LLM доступен: ${this.agent.diagnostics.llmAvailable ? '✅' : '❌'}`;
            if (this.agent.diagnostics.llmError) {
                tooltip += `\n  LLM ошибка: ${this.agent.diagnostics.llmError}`;
            }
            tooltip += `\n  Агент зарегистрирован: ${this.agent.diagnostics.agentRegistered ? '✅' : '❌'}`;
            tooltip += `\n  Агент инициализирован: ${this.agent.diagnostics.agentInitialized ? '✅' : '❌'}`;
            if (this.agent.diagnostics.lastCheckTime) {
                tooltip += `\n  Последняя проверка: ${this.agent.diagnostics.lastCheckTime.toLocaleTimeString()}`;
            }
        }

        // Добавляем информацию о выбранной модели
        if (this.agent.selectedModel) {
            const modelName = this.agent.selectedModel.displayName || 
                            `${this.agent.selectedModel.vendor || ''} ${this.agent.selectedModel.family || this.agent.selectedModel.id || ''}`.trim();
            tooltip += `\n\nМодель: ${modelName || 'Не указана'}`;
        }
        
        return tooltip;
    }

    private getDescription(): string {
        const parts: string[] = [];
        
        if (this.agent.currentTask) {
            parts.push(`Работает: ${this.agent.currentTask.description.substring(0, 30)}...`);
        } else {
            parts.push(this.getStatusText());
        }
        
        if (this.agent.tasksInProgress > 0) {
            parts.push(`(${this.agent.tasksInProgress} в работе)`);
        }

        // Добавляем краткую информацию об ошибке в описание
        if (this.agent.status === 'error' && this.agent.errorMessage) {
            const shortError = this.agent.errorMessage.length > 40 
                ? this.agent.errorMessage.substring(0, 40) + '...' 
                : this.agent.errorMessage;
            parts.push(`❌ ${shortError}`);
        }

        // Добавляем информацию о модели
        if (this.agent.selectedModel) {
            const modelName = this.agent.selectedModel.displayName || 
                            `${this.agent.selectedModel.family || this.agent.selectedModel.id || ''}`.trim();
            if (modelName) {
                parts.push(`🤖 ${modelName}`);
            }
        }
        
        return parts.join(' ');
    }

    private getStatusText(): string {
        switch (this.agent.status) {
            case 'working': return 'Работает';
            case 'idle': return 'Ожидает';
            case 'error': return 'Ошибка';
            case 'disabled': return 'Отключен';
            default: return 'Неизвестно';
        }
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.agent.status) {
            case 'working':
                return new vscode.ThemeIcon('sync', new vscode.ThemeColor('charts.blue'));
            case 'idle':
                return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.grey'));
            case 'error':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
            case 'disabled':
                return new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('charts.grey'));
            default:
                return new vscode.ThemeIcon('question');
        }
    }
}

class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly task: Task,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(task.description, collapsibleState);
        
        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.iconPath = this.getIcon();
        this.contextValue = 'task';
    }

    private getTooltip(): string {
        let tooltip = `Задача: ${this.task.description}\n`;
        tooltip += `Тип: ${this.getTypeText()}\n`;
        tooltip += `Приоритет: ${this.getPriorityText()}\n`;
        tooltip += `Статус: ${this.getStatusText()}\n`;
        tooltip += `Создана: ${this.task.createdAt.toLocaleString()}`;
        
        return tooltip;
    }

    private getDescription(): string {
        let description = this.getStatusText();
        
        // Добавляем информацию о прогрессе для задач в работе
        if (this.task.status === 'in-progress' && this.task.progress) {
            const files = this.task.progress.filesChanged || 0;
            const time = Math.round(this.task.progress.timeElapsed / 1000);
            description += ` (${files} файлов, ${time}с)`;
        }
        
        // Добавляем информацию о результате для завершенных задач
        if (this.task.status === 'completed' && this.task.executionResult) {
            const files = Array.isArray(this.task.executionResult.filesChanged) 
                ? this.task.executionResult.filesChanged.length 
                : (this.task.executionResult.filesChanged || 0);
            description += ` (${files} файлов)`;
        }
        
        // Добавляем информацию об ошибке для заблокированных задач
        if (this.task.status === 'blocked' && this.task.executionResult?.error) {
            const error = this.task.executionResult.error.substring(0, 30);
            description += `: ${error}...`;
        }
        
        description += ` • ${this.getPriorityText()}`;
        return description;
    }

    private getTypeText(): string {
        const types: { [key: string]: string } = {
            'feature': 'Новая функция',
            'bug': 'Исправление бага',
            'improvement': 'Улучшение',
            'refactoring': 'Рефакторинг',
            'documentation': 'Документация'
        };
        return types[this.task.type] || this.task.type;
    }

    private getPriorityText(): string {
        const priorities: { [key: string]: string } = {
            'high': 'Высокий',
            'medium': 'Средний',
            'low': 'Низкий'
        };
        return priorities[this.task.priority] || this.task.priority;
    }

    private getStatusText(): string {
        const statuses: { [key: string]: string } = {
            'pending': 'Ожидает',
            'in-progress': 'В работе',
            'completed': 'Завершена',
            'blocked': 'Заблокирована'
        };
        return statuses[this.task.status] || this.task.status;
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.task.status) {
            case 'in-progress':
                return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
            case 'completed':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            case 'blocked':
                return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.red'));
            case 'pending':
            default:
                return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.grey'));
        }
    }
}
