import * as vscode from 'vscode';
import { TaskQueue, TaskPriority, QueuedTask } from '../agents/worker/task-queue';
import { MessageBus, getGlobalMessageBus } from '../agents/worker/message-bus';
import { AgentWorker, WorkerConfig, WorkerState } from '../agents/worker/agent-worker';
import { Task } from './orchestrator';
import { LocalAgent } from '../agents/local-agent';
import { BackendAgent } from '../agents/backend-agent';
import { FrontendAgent } from '../agents/frontend-agent';
import { ArchitectAgent } from '../agents/architect-agent';
import { AnalystAgent } from '../agents/analyst-agent';
import { DevOpsAgent } from '../agents/devops-agent';
import { QAAgent } from '../agents/qa-agent';

/**
 * Конкретная реализация AgentWorker для каждого агента
 */
class ConcreteAgentWorker extends AgentWorker {
    protected async monitorProject(): Promise<void> {
        // Специфичный мониторинг для каждого агента
        // Пока оставляем пустым - будет реализовано позже
    }
    
    protected async answerQuestion(question: any): Promise<any> {
        // Ответ на вопрос от другого агента
        return { answer: 'Processing...', confidence: 0.5 };
    }
    
    protected async handleCollaboration(request: any): Promise<any> {
        // Обработка запроса на сотрудничество
        return { accepted: true, message: 'Ready to collaborate' };
    }
}

/**
 * SwarmOrchestrator - координатор роя агентов
 * Управляет воркерами, но не командует напрямую (Swarm intelligence)
 */
export class SwarmOrchestrator {
    private context: vscode.ExtensionContext;
    private taskQueue: TaskQueue;
    private messageBus: MessageBus;
    private workers: Map<string, AgentWorker>;
    private localAgents: Map<string, LocalAgent>;
    private isRunning: boolean = false;
    
    constructor(context: vscode.ExtensionContext, localAgents: Map<string, LocalAgent>) {
        this.context = context;
        this.taskQueue = new TaskQueue();
        this.messageBus = getGlobalMessageBus();
        this.workers = new Map();
        this.localAgents = localAgents;
    }
    
    /**
     * Запуск Swarm оркестратора
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('SwarmOrchestrator: Already running');
            return;
        }
        
        this.isRunning = true;
        console.log('SwarmOrchestrator: Starting...');
        
        // Создаем воркеров для каждого агента
        await this.createWorkers();
        
        // Запускаем всех воркеров
        await this.startAllWorkers();
        
        // Запускаем автоматическую очистку старых задач
        this.startCleanupJob();
        
        console.log('SwarmOrchestrator: Started with ' + this.workers.size + ' workers');
    }
    
    /**
     * Остановка Swarm оркестратора
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }
        
        console.log('SwarmOrchestrator: Stopping...');
        
        this.isRunning = false;
        
        // Останавливаем всех воркеров
        await this.stopAllWorkers();
        
        console.log('SwarmOrchestrator: Stopped');
    }
    
    /**
     * Создать воркеров для каждого агента
     */
    private async createWorkers(): Promise<void> {
        const workerConfigs: WorkerConfig[] = [
            {
                agentId: 'backend',
                specializations: ['backend', 'api', 'database', 'server'],
                preferredTasks: ['bug', 'feature', 'improvement', 'refactoring'],
                maxConcurrentTasks: 1,
                monitoringInterval: 30000 // 30 секунд
            },
            {
                agentId: 'frontend',
                specializations: ['frontend', 'ui', 'ux', 'components'],
                preferredTasks: ['bug', 'feature', 'improvement', 'ui'],
                maxConcurrentTasks: 1,
                monitoringInterval: 30000
            },
            {
                agentId: 'architect',
                specializations: ['architecture', 'design', 'planning', 'refactoring'],
                preferredTasks: ['feature', 'refactoring', 'architecture', 'planning'],
                maxConcurrentTasks: 1,
                monitoringInterval: 60000 // 1 минута
            },
            {
                agentId: 'analyst',
                specializations: ['analysis', 'performance', 'metrics', 'optimization'],
                preferredTasks: ['improvement', 'optimization', 'analysis'],
                maxConcurrentTasks: 1,
                monitoringInterval: 60000
            },
            {
                agentId: 'devops',
                specializations: ['devops', 'deployment', 'infrastructure', 'ci-cd'],
                preferredTasks: ['deployment', 'infrastructure', 'optimization'],
                maxConcurrentTasks: 1,
                monitoringInterval: 60000
            },
            {
                agentId: 'qa',
                specializations: ['qa', 'testing', 'quality', 'validation'],
                preferredTasks: ['quality-check', 'testing', 'validation'],
                maxConcurrentTasks: 1,
                monitoringInterval: 45000 // 45 секунд
            }
        ];
        
        for (const config of workerConfigs) {
            const localAgent = this.localAgents.get(config.agentId);
            if (!localAgent) {
                console.warn(`SwarmOrchestrator: Local agent ${config.agentId} not found, skipping`);
                continue;
            }
            
            const worker = new ConcreteAgentWorker(
                config,
                this.taskQueue,
                this.messageBus,
                localAgent
            );
            
            this.workers.set(config.agentId, worker);
            console.log(`SwarmOrchestrator: Created worker for ${config.agentId}`);
        }
    }
    
    /**
     * Запустить всех воркеров
     */
    private async startAllWorkers(): Promise<void> {
        const startPromises: Promise<void>[] = [];
        
        for (const [agentId, worker] of this.workers.entries()) {
            startPromises.push(
                worker.start().catch(error => {
                    console.error(`SwarmOrchestrator: Failed to start worker ${agentId}:`, error);
                })
            );
        }
        
        await Promise.allSettled(startPromises);
    }
    
    /**
     * Остановить всех воркеров
     */
    private async stopAllWorkers(): Promise<void> {
        const stopPromises: Promise<void>[] = [];
        
        for (const worker of this.workers.values()) {
            stopPromises.push(worker.stop());
        }
        
        await Promise.allSettled(stopPromises);
    }
    
    /**
     * Создать новую задачу
     */
    async createTask(
        task: Omit<Task, 'id' | 'status' | 'createdAt'>,
        priority: TaskPriority = TaskPriority.MEDIUM
    ): Promise<QueuedTask> {
        const queuedTask = await this.taskQueue.enqueue(task, priority);
        
        console.log(`SwarmOrchestrator: Created task ${queuedTask.id} with priority ${priority}`);
        
        return queuedTask;
    }
    
    /**
     * Отменить задачу
     */
    async cancelTask(taskId: string, reason?: string): Promise<void> {
        await this.taskQueue.cancel(taskId, reason);
        console.log(`SwarmOrchestrator: Cancelled task ${taskId}`);
    }
    
    /**
     * Получить статус всех воркеров
     */
    getWorkersStatus(): Array<{
        agentId: string;
        state: WorkerState;
        currentTask: QueuedTask | null;
        isWorking: boolean;
    }> {
        const statuses: Array<{
            agentId: string;
            state: WorkerState;
            currentTask: QueuedTask | null;
            isWorking: boolean;
        }> = [];
        
        for (const [agentId, worker] of this.workers.entries()) {
            statuses.push({
                agentId,
                state: worker.getState(),
                currentTask: worker.getCurrentTask(),
                isWorking: worker.isWorking()
            });
        }
        
        return statuses;
    }
    
    /**
     * Получить статистику очереди задач
     */
    getQueueStatistics() {
        return this.taskQueue.getStatistics();
    }
    
    /**
     * Получить все задачи
     */
    getTasks() {
        return {
            pending: this.taskQueue.getPending(),
            processing: this.taskQueue.getProcessing(),
            completed: this.taskQueue.getCompleted()
        };
    }
    
    /**
     * Получить статистику MessageBus
     */
    getMessageBusStatistics() {
        return this.messageBus.getStatistics();
    }
    
    /**
     * Запустить автоматическую очистку старых задач
     */
    private startCleanupJob(): void {
        setInterval(() => {
            if (this.isRunning) {
                this.taskQueue.cleanup(3600000); // Очистка задач старше 1 часа
            }
        }, 600000); // Каждые 10 минут
    }
    
    /**
     * Получить состояние оркестратора
     */
    isRunningState(): boolean {
        return this.isRunning;
    }
    
    /**
     * Получить количество работающих воркеров
     */
    getActiveWorkersCount(): number {
        let count = 0;
        for (const worker of this.workers.values()) {
            if (worker.isWorking()) {
                count++;
            }
        }
        return count;
    }
}
