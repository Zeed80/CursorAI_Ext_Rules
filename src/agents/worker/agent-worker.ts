import * as vscode from 'vscode';
import { TaskQueue, QueuedTask, TaskPriority, AgentCapabilities, TaskResult } from './task-queue';
import { MessageBus, Message, MessageType } from './message-bus';
import { MCPClient } from './mcp-client';
import { LocalAgent, AgentSolution, AgentThoughts, ProjectContext } from '../local-agent';
import { Task } from '../../orchestrator/orchestrator';

/**
 * Состояние воркера
 */
export enum WorkerState {
    IDLE = 'idle',           // Ожидает задачи
    WORKING = 'working',     // Выполняет задачу
    MONITORING = 'monitoring', // Мониторит проект
    COMMUNICATING = 'communicating', // Общается с другими агентами
    STOPPED = 'stopped'      // Остановлен
}

/**
 * Конфигурация воркера
 */
export interface WorkerConfig {
    agentId: string;
    specializations: string[];
    preferredTasks: string[];
    maxConcurrentTasks: number;
    monitoringInterval: number; // Интервал мониторинга в мс
}

/**
 * Автономный агент-воркер
 * Работает в постоянном цикле:
 * 1. Проверяет очередь задач
 * 2. Выбирает подходящую задачу (Swarm)
 * 3. Выполняет задачу автономно
 * 4. Мониторит проект
 * 5. Общается с другими агентами
 */
export abstract class AgentWorker {
    protected config: WorkerConfig;
    protected state: WorkerState = WorkerState.STOPPED;
    protected isRunning: boolean = false;
    protected currentTask: QueuedTask | null = null;
    
    protected taskQueue: TaskQueue;
    protected messageBus: MessageBus;
    protected mcpClient: MCPClient;
    protected localAgent: LocalAgent;
    
    private mainLoopPromise: Promise<void> | null = null;
    private lastMonitoringTime: number = 0;
    
    constructor(
        config: WorkerConfig,
        taskQueue: TaskQueue,
        messageBus: MessageBus,
        localAgent: LocalAgent
    ) {
        this.config = config;
        this.taskQueue = taskQueue;
        this.messageBus = messageBus;
        this.localAgent = localAgent;
        this.mcpClient = new MCPClient();
    }
    
    /**
     * Запуск воркера
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log(`${this.config.agentId}: Already running`);
            return;
        }
        
        this.isRunning = true;
        this.state = WorkerState.IDLE;
        
        console.log(`${this.config.agentId}: Worker starting...`);
        
        // Регистрируем возможности агента в очереди
        const capabilities: AgentCapabilities = {
            agentId: this.config.agentId,
            specializations: this.config.specializations,
            currentLoad: 0,
            preferredTasks: this.config.preferredTasks
        };
        
        this.taskQueue.registerAgent(capabilities);
        
        // Подписываемся на сообщения
        this.setupMessageHandlers();
        
        // Отправляем событие о запуске
        await this.messageBus.publish({
            type: MessageType.AGENT_STARTED,
            from: this.config.agentId,
            payload: { capabilities }
        });
        
        // Запускаем главный цикл
        this.mainLoopPromise = this.runMainLoop();
        
        console.log(`${this.config.agentId}: Worker started`);
    }
    
    /**
     * Остановка воркера
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }
        
        console.log(`${this.config.agentId}: Worker stopping...`);
        
        this.isRunning = false;
        this.state = WorkerState.STOPPED;
        
        // Отправляем событие об остановке
        await this.messageBus.publish({
            type: MessageType.AGENT_STOPPED,
            from: this.config.agentId,
            payload: {}
        });
        
        // Отписываемся от сообщений
        this.messageBus.unsubscribeAll(this.config.agentId);
        
        // Ждем завершения главного цикла
        if (this.mainLoopPromise) {
            await this.mainLoopPromise;
        }
        
        console.log(`${this.config.agentId}: Worker stopped`);
    }
    
    /**
     * Главный цикл работы воркера
     */
    private async runMainLoop(): Promise<void> {
        while (this.isRunning) {
            try {
                // 1. Проверяем наличие задач в очереди
                const task = await this.taskQueue.dequeue(this.config.agentId);
                
                if (task) {
                    // Выполняем задачу автономно
                    await this.executeTaskAutonomously(task);
                } else {
                    // Если задач нет, выполняем мониторинг
                    await this.performMonitoring();
                }
                
                // 2. Обрабатываем сообщения от других агентов
                // (это происходит асинхронно через подписки)
                
                // 3. Небольшая пауза для снижения нагрузки
                await this.sleep(100);
                
            } catch (error: any) {
                console.error(`${this.config.agentId}: Error in main loop:`, error);
                await this.sleep(5000); // 5 секунд при ошибке
            }
        }
    }
    
    /**
     * Автономное выполнение задачи
     */
    protected async executeTaskAutonomously(task: QueuedTask): Promise<void> {
        this.currentTask = task;
        this.state = WorkerState.WORKING;
        
        console.log(`${this.config.agentId}: Executing task ${task.id}`);
        
        // Обновляем нагрузку агента
        this.taskQueue.updateAgentLoad(this.config.agentId, 1.0);
        
        // Отправляем событие о начале выполнения
        await this.messageBus.publish({
            type: MessageType.TASK_CLAIMED,
            from: this.config.agentId,
            payload: { task }
        });
        
        const startTime = Date.now();
        let success = false;
        let error: string | undefined;
        let filesChanged: string[] = [];
        
        try {
            // 1. Получаем контекст проекта через MCP
            const projectContext = await this.buildProjectContext();
            
            // 2. Агент размышляет над задачей
            const thoughts = await this.localAgent.think(task, projectContext);
            
            console.log(`${this.config.agentId}: Thoughts generated for task ${task.id}`);
            
            // 3. Агент предлагает решение
            const solution = await this.localAgent.proposeSolution(task, thoughts, projectContext);
            
            console.log(`${this.config.agentId}: Solution proposed for task ${task.id}`);
            
            // Отправляем решение в шину сообщений
            await this.messageBus.publish({
                type: MessageType.SOLUTION_PROPOSED,
                from: this.config.agentId,
                payload: { task, solution }
            });
            
            // 4. Проверяем, нужно ли подтверждение от виртуального пользователя
            // (это будет реализовано в интеграции с VirtualUser)
            const approved = await this.requestApproval(solution);
            
            if (!approved) {
                throw new Error('Solution rejected by Virtual User');
            }
            
            // 5. Применяем решение через MCP
            const executionResult = await this.localAgent.executeSolution(solution, task, projectContext);
            
            success = executionResult.success;
            filesChanged = executionResult.filesChanged || [];
            
            if (!success) {
                error = executionResult.error;
            }
            
            console.log(`${this.config.agentId}: Task ${task.id} ${success ? 'completed' : 'failed'}`);
            
        } catch (err: any) {
            console.error(`${this.config.agentId}: Task execution failed:`, err);
            success = false;
            error = err.message || 'Unknown error';
        }
        
        // 6. Отмечаем задачу как выполненную
        const duration = Date.now() - startTime;
        
        const result: TaskResult = {
            taskId: task.id,
            success,
            workerId: this.config.agentId,
            duration,
            error,
            filesChanged
        };
        
        await this.taskQueue.complete(task.id, result);
        
        // Отправляем событие о завершении
        await this.messageBus.publish({
            type: success ? MessageType.TASK_COMPLETED : MessageType.TASK_FAILED,
            from: this.config.agentId,
            payload: { task, result }
        });
        
        // Обновляем состояние
        this.currentTask = null;
        this.state = WorkerState.IDLE;
        this.taskQueue.updateAgentLoad(this.config.agentId, 0);
    }
    
    /**
     * Периодический мониторинг проекта
     */
    protected async performMonitoring(): Promise<void> {
        // Проверяем, прошло ли достаточно времени с последнего мониторинга
        const now = Date.now();
        if (now - this.lastMonitoringTime < this.config.monitoringInterval) {
            return;
        }
        
        this.state = WorkerState.MONITORING;
        this.lastMonitoringTime = now;
        
        try {
            console.log(`${this.config.agentId}: Monitoring project...`);
            
            // Мониторинг зависит от специализации агента
            await this.monitorProject();
            
        } catch (error: any) {
            console.error(`${this.config.agentId}: Monitoring error:`, error);
        }
        
        this.state = WorkerState.IDLE;
    }
    
    /**
     * Запрос подтверждения решения (будет интегрировано с VirtualUser)
     */
    protected async requestApproval(solution: AgentSolution): Promise<boolean> {
        // TODO: Интегрировать с VirtualUser
        // Пока автоматически подтверждаем
        return true;
    }
    
    /**
     * Построение контекста проекта через MCP
     */
    protected async buildProjectContext(): Promise<ProjectContext> {
        try {
            // Получаем список файлов проекта
            const files = await this.mcpClient.listFiles();
            
            // Получаем git статус
            const gitStatus = await this.mcpClient.getGitStatus();
            
            return {
                structure: {
                    files: files.slice(0, 100), // Ограничиваем для производительности
                    directories: [],
                    entryPoints: []
                },
                dependencies: {},
                patterns: [],
                standards: {},
                knowledge: {
                    git: gitStatus
                }
            };
        } catch (error: any) {
            console.error(`${this.config.agentId}: Error building context:`, error);
            return {
                structure: { files: [], directories: [], entryPoints: [] },
                dependencies: {},
                patterns: [],
                standards: {},
                knowledge: {}
            };
        }
    }
    
    /**
     * Настройка обработчиков сообщений
     */
    protected setupMessageHandlers(): void {
        // Подписываемся на вопросы от других агентов
        this.messageBus.subscribe(
            this.config.agentId,
            [MessageType.AGENT_QUESTION, MessageType.COLLABORATION_REQUEST],
            async (message) => await this.handleIncomingMessage(message)
        );
        
        // Подписываемся на немедленные задачи
        this.messageBus.subscribe(
            this.config.agentId,
            [MessageType.TASK_CREATED],
            async (message) => {
                const task = message.payload.task as QueuedTask;
                if (task.priority === TaskPriority.IMMEDIATE) {
                    // Прерываем текущую работу и берем немедленную задачу
                    console.log(`${this.config.agentId}: Received immediate task ${task.id}`);
                }
            }
        );
    }
    
    /**
     * Обработка входящих сообщений от других агентов
     */
    protected async handleIncomingMessage(message: Message): Promise<void> {
        this.state = WorkerState.COMMUNICATING;
        
        try {
            console.log(`${this.config.agentId}: Received message ${message.type} from ${message.from}`);
            
            if (message.type === MessageType.AGENT_QUESTION) {
                // Обрабатываем вопрос от другого агента
                const answer = await this.answerQuestion(message.payload);
                
                await this.messageBus.respond(message, MessageType.AGENT_ANSWER, answer);
            }
            else if (message.type === MessageType.COLLABORATION_REQUEST) {
                // Обрабатываем запрос на сотрудничество
                const response = await this.handleCollaboration(message.payload);
                
                await this.messageBus.respond(message, MessageType.COLLABORATION_RESPONSE, response);
            }
        } catch (error: any) {
            console.error(`${this.config.agentId}: Error handling message:`, error);
        }
        
        this.state = WorkerState.IDLE;
    }
    
    /**
     * Утилита для паузы
     */
    protected async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ==================== АБСТРАКТНЫЕ МЕТОДЫ ====================
    
    /**
     * Специфичный для агента мониторинг проекта
     * Должен быть реализован в наследниках
     */
    protected abstract monitorProject(): Promise<void>;
    
    /**
     * Ответ на вопрос от другого агента
     */
    protected abstract answerQuestion(question: any): Promise<any>;
    
    /**
     * Обработка запроса на сотрудничество
     */
    protected abstract handleCollaboration(request: any): Promise<any>;
    
    // ==================== ГЕТТЕРЫ ====================
    
    getState(): WorkerState {
        return this.state;
    }
    
    getCurrentTask(): QueuedTask | null {
        return this.currentTask;
    }
    
    isWorking(): boolean {
        return this.state === WorkerState.WORKING;
    }
    
    getConfig(): WorkerConfig {
        return this.config;
    }
}
