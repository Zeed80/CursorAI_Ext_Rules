import * as vscode from 'vscode';
import { SettingsManager } from '../integration/settings-manager';
import { AgentConsultation, Task } from './orchestrator';
import { LocalAgent, AgentThoughts } from '../agents/local-agent';
import { LanguageModelInfo } from '../integration/model-provider';

export interface AgentInfo {
    id: string;
    name: string;
    status: 'idle' | 'working' | 'error' | 'disabled';
    currentTask?: Task;
    tasksCompleted: number;
    tasksInProgress: number;
    lastActivity?: Date;
    currentThoughts?: AgentThoughts;
    errorMessage?: string; // Сообщение об ошибке, если агент не работает
    diagnostics?: {
        llmAvailable: boolean;
        llmError?: string;
        agentRegistered: boolean;
        agentInitialized: boolean;
        lastCheckTime?: Date;
    };
    selectedModel?: LanguageModelInfo; // Выбранная языковая модель
}

export class AgentManager {
    private context: vscode.ExtensionContext;
    private settingsManager: SettingsManager;
    private agents: Map<string, any> = new Map();
    private localAgents: Map<string, LocalAgent> = new Map();
    private agentsStatus: Map<string, AgentInfo> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        settingsManager: SettingsManager
    ) {
        this.context = context;
        this.settingsManager = settingsManager;
        this.initializeAgentsStatus();
    }

    private initializeAgentsStatus(): void {
        const defaultAgents: AgentInfo[] = [
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
            this.agentsStatus.set(agent.id, agent);
        }
    }

    async initialize(): Promise<void> {
        console.log('Initializing agents...');
        
        // Инициализация агентов будет происходить по требованию
        // Здесь можно загрузить конфигурацию агентов
    }

    async stop(): Promise<void> {
        console.log('Stopping agents...');
        this.agents.clear();
    }

    /**
     * Обновление статуса агента
     */
    updateAgentStatus(agentId: string, status: Partial<AgentInfo>): void {
        const agent = this.agentsStatus.get(agentId);
        if (agent) {
            Object.assign(agent, status);
            if (status.status === 'working') {
                agent.lastActivity = new Date();
            }
        }
    }

    /**
     * Получение статуса агента
     */
    getAgentStatus(agentId: string): AgentInfo | undefined {
        return this.agentsStatus.get(agentId);
    }

    /**
     * Получение всех статусов агентов
     */
    getAllAgentsStatus(): AgentInfo[] {
        return Array.from(this.agentsStatus.values());
    }

    /**
     * Обновление статусов на основе задач
     */
    updateStatusFromTasks(tasks: Task[]): void {
        for (const agent of this.agentsStatus.values()) {
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
    }

    /**
     * Консультация с агентом
     */
    async consultAgent(agentId: string, consultation: AgentConsultation): Promise<string> {
        // Пробуем использовать локального агента
        const localAgent = this.localAgents.get(agentId);
        if (localAgent) {
            // Используем метод callLLM локального агента
            return await (localAgent as any).callLLM(consultation.question);
        }
        
        console.log(`Agent ${agentId} consultation: ${consultation.question}`);
        
        // Симуляция ответа агента
        return `Agent ${agentId} response to: ${consultation.question}`;
    }

    /**
     * Получение агента
     */
    getAgent(agentId: string): any {
        return this.localAgents.get(agentId) || this.agents.get(agentId);
    }

    /**
     * Регистрация агента
     */
    registerAgent(agentId: string, agent: any): void {
        this.agents.set(agentId, agent);
    }

    /**
     * Регистрация локального агента
     */
    registerLocalAgent(agent: LocalAgent): void {
        this.localAgents.set(agent.getId(), agent);
        
        // Обновляем статус агента
        const agentInfo = this.agentsStatus.get(agent.getId());
        if (agentInfo) {
            agentInfo.name = agent.getName();
        } else {
            this.agentsStatus.set(agent.getId(), {
                id: agent.getId(),
                name: agent.getName(),
                status: 'idle',
                tasksCompleted: 0,
                tasksInProgress: 0
            });
        }
    }

    /**
     * Получение локального агента
     */
    getLocalAgent(agentId: string): LocalAgent | undefined {
        return this.localAgents.get(agentId);
    }

    /**
     * Получение всех локальных агентов
     */
    getAllLocalAgents(): LocalAgent[] {
        return Array.from(this.localAgents.values());
    }

    /**
     * Обновление размышлений агента
     */
    updateAgentThoughts(agentId: string, thoughts: AgentThoughts): void {
        const agent = this.agentsStatus.get(agentId);
        if (agent) {
            agent.currentThoughts = thoughts;
            agent.lastActivity = new Date();
        }
    }

    /**
     * Получение размышлений агента
     */
    getAgentThoughts(agentId: string): AgentThoughts | undefined {
        const agent = this.agentsStatus.get(agentId);
        return agent?.currentThoughts;
    }
}
