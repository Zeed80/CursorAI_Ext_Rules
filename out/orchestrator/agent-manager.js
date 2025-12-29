"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = void 0;
class AgentManager {
    constructor(context, settingsManager) {
        this.agents = new Map();
        this.localAgents = new Map();
        this.agentsStatus = new Map();
        this.context = context;
        this.settingsManager = settingsManager;
        this.initializeAgentsStatus();
    }
    initializeAgentsStatus() {
        const defaultAgents = [
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
    async initialize() {
        console.log('Initializing agents...');
        // Инициализация агентов будет происходить по требованию
        // Здесь можно загрузить конфигурацию агентов
    }
    async stop() {
        console.log('Stopping agents...');
        this.agents.clear();
    }
    /**
     * Обновление статуса агента
     */
    updateAgentStatus(agentId, status) {
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
    getAgentStatus(agentId) {
        return this.agentsStatus.get(agentId);
    }
    /**
     * Получение всех статусов агентов
     */
    getAllAgentsStatus() {
        return Array.from(this.agentsStatus.values());
    }
    /**
     * Обновление статусов на основе задач
     */
    updateStatusFromTasks(tasks) {
        for (const agent of this.agentsStatus.values()) {
            agent.tasksInProgress = tasks.filter(t => t.assignedAgent === agent.id && t.status === 'in-progress').length;
            agent.tasksCompleted = tasks.filter(t => t.assignedAgent === agent.id && t.status === 'completed').length;
            const currentTask = tasks.find(t => t.assignedAgent === agent.id && t.status === 'in-progress');
            agent.currentTask = currentTask;
            if (currentTask) {
                agent.status = 'working';
            }
            else if (agent.tasksInProgress === 0 && agent.status === 'working') {
                agent.status = 'idle';
            }
        }
    }
    /**
     * Консультация с агентом
     */
    async consultAgent(agentId, consultation) {
        // Пробуем использовать локального агента
        const localAgent = this.localAgents.get(agentId);
        if (localAgent) {
            // Используем метод callLLM локального агента
            return await localAgent.callLLM(consultation.question);
        }
        console.log(`Agent ${agentId} consultation: ${consultation.question}`);
        // Симуляция ответа агента
        return `Agent ${agentId} response to: ${consultation.question}`;
    }
    /**
     * Получение агента
     */
    getAgent(agentId) {
        return this.localAgents.get(agentId) || this.agents.get(agentId);
    }
    /**
     * Регистрация агента
     */
    registerAgent(agentId, agent) {
        this.agents.set(agentId, agent);
    }
    /**
     * Регистрация локального агента
     */
    registerLocalAgent(agent) {
        this.localAgents.set(agent.getId(), agent);
        // Обновляем статус агента
        const agentInfo = this.agentsStatus.get(agent.getId());
        if (agentInfo) {
            agentInfo.name = agent.getName();
        }
        else {
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
    getLocalAgent(agentId) {
        return this.localAgents.get(agentId);
    }
    /**
     * Получение всех локальных агентов
     */
    getAllLocalAgents() {
        return Array.from(this.localAgents.values());
    }
    /**
     * Обновление размышлений агента
     */
    updateAgentThoughts(agentId, thoughts) {
        const agent = this.agentsStatus.get(agentId);
        if (agent) {
            agent.currentThoughts = thoughts;
            agent.lastActivity = new Date();
        }
    }
    /**
     * Получение размышлений агента
     */
    getAgentThoughts(agentId) {
        const agent = this.agentsStatus.get(agentId);
        return agent?.currentThoughts;
    }
}
exports.AgentManager = AgentManager;
//# sourceMappingURL=agent-manager.js.map