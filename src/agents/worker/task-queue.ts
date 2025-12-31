import { Task } from '../../orchestrator/orchestrator';
import { EventEmitter } from 'events';

/**
 * Приоритет задачи
 */
export enum TaskPriority {
    IMMEDIATE = 'immediate',  // Прерывает текущую работу
    HIGH = 'high',            // Выполнить в первую очередь
    MEDIUM = 'medium',        // Обычная очередь
    LOW = 'low'               // Выполнить когда свободны
}

/**
 * Расширенная задача с приоритетом и метаданными
 */
export interface QueuedTask extends Task {
    priority: TaskPriority;
    queuedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    assignedWorker?: string;
    attempts: number;
    maxAttempts: number;
}

/**
 * Результат выполнения задачи
 */
export interface TaskResult {
    taskId: string;
    success: boolean;
    workerId: string;
    duration: number;
    error?: string;
    filesChanged?: string[];
}

/**
 * Возможности агента (для Swarm coordination)
 */
export interface AgentCapabilities {
    agentId: string;
    specializations: string[];  // backend, frontend, architect, qa, devops
    currentLoad: number;        // 0-1, текущая нагрузка
    preferredTasks: string[];   // Типы задач, которые предпочитает
}

/**
 * Приоритетная очередь задач для автономных агентов
 * Реализует Swarm coordination - агенты сами выбирают задачи
 */
export class TaskQueue extends EventEmitter {
    private queues: Map<TaskPriority, QueuedTask[]>;
    private processing: Map<string, QueuedTask>; // taskId -> task
    private completed: Map<string, TaskResult>;
    private agentCapabilities: Map<string, AgentCapabilities>; // agentId -> capabilities
    
    constructor() {
        super();
        
        this.queues = new Map([
            [TaskPriority.IMMEDIATE, []],
            [TaskPriority.HIGH, []],
            [TaskPriority.MEDIUM, []],
            [TaskPriority.LOW, []]
        ]);
        
        this.processing = new Map();
        this.completed = new Map();
        this.agentCapabilities = new Map();
    }
    
    /**
     * Зарегистрировать возможности агента (для Swarm coordination)
     */
    registerAgent(capabilities: AgentCapabilities): void {
        this.agentCapabilities.set(capabilities.agentId, capabilities);
        console.log(`TaskQueue: Registered agent ${capabilities.agentId} with specializations: ${capabilities.specializations.join(', ')}`);
    }
    
    /**
     * Обновить нагрузку агента
     */
    updateAgentLoad(agentId: string, load: number): void {
        const capabilities = this.agentCapabilities.get(agentId);
        if (capabilities) {
            capabilities.currentLoad = load;
        }
    }
    
    /**
     * Добавить задачу в очередь
     */
    async enqueue(
        task: Omit<Task, 'id' | 'status' | 'createdAt'>,
        priority: TaskPriority = TaskPriority.MEDIUM
    ): Promise<QueuedTask> {
        const queuedTask: QueuedTask = {
            ...task as Task,
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'pending',
            createdAt: new Date(),
            priority,
            queuedAt: new Date(),
            attempts: 0,
            maxAttempts: 3
        };
        
        const queue = this.queues.get(priority);
        if (queue) {
            queue.push(queuedTask);
            this.sortQueue(priority);
        }
        
        console.log(`TaskQueue: Enqueued task ${queuedTask.id} with priority ${priority}`);
        
        // Отправляем событие о новой задаче
        this.emit('task:added', queuedTask);
        
        // Если немедленная задача - отправляем специальное событие
        if (priority === TaskPriority.IMMEDIATE) {
            this.emit('task:immediate', queuedTask);
        }
        
        return queuedTask;
    }
    
    /**
     * Получить задачу для выполнения (Swarm coordination)
     * Агент сам выбирает наиболее подходящую задачу
     */
    async dequeue(agentId: string): Promise<QueuedTask | null> {
        const capabilities = this.agentCapabilities.get(agentId);
        if (!capabilities) {
            console.warn(`TaskQueue: Agent ${agentId} not registered`);
            return null;
        }
        
        // Проверяем текущую нагрузку агента
        if (capabilities.currentLoad >= 1.0) {
            return null; // Агент перегружен
        }
        
        // Ищем наиболее подходящую задачу по приоритетам
        for (const priority of [TaskPriority.IMMEDIATE, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW]) {
            const queue = this.queues.get(priority);
            if (!queue || queue.length === 0) continue;
            
            // Swarm intelligence: выбираем задачу, которая лучше всего подходит агенту
            const suitableTask = this.findSuitableTask(queue, capabilities);
            
            if (suitableTask) {
                // Удаляем из очереди
                const index = queue.indexOf(suitableTask);
                queue.splice(index, 1);
                
                // Помечаем как обрабатываемую
                suitableTask.status = 'in-progress';
                suitableTask.assignedWorker = agentId;
                suitableTask.startedAt = new Date();
                suitableTask.attempts++;
                
                this.processing.set(suitableTask.id, suitableTask);
                
                console.log(`TaskQueue: Agent ${agentId} claimed task ${suitableTask.id} (${priority})`);
                
                // Отправляем событие
                this.emit('task:claimed', { task: suitableTask, agentId });
                
                return suitableTask;
            }
        }
        
        return null;
    }
    
    /**
     * Найти подходящую задачу для агента (Swarm intelligence)
     */
    private findSuitableTask(
        queue: QueuedTask[],
        capabilities: AgentCapabilities
    ): QueuedTask | null {
        let bestTask: QueuedTask | null = null;
        let bestScore = -1;
        
        for (const task of queue) {
            const score = this.calculateTaskScore(task, capabilities);
            if (score > bestScore) {
                bestScore = score;
                bestTask = task;
            }
        }
        
        return bestTask;
    }
    
    /**
     * Рассчитать оценку соответствия задачи агенту
     */
    private calculateTaskScore(
        task: QueuedTask,
        capabilities: AgentCapabilities
    ): number {
        let score = 0;
        
        // 1. Проверяем специализацию агента
        if (task.assignedAgent && capabilities.specializations.includes(task.assignedAgent)) {
            score += 50; // Задача назначена этому типу агента
        }
        
        // 2. Проверяем предпочтения агента
        if (task.type && capabilities.preferredTasks.includes(task.type)) {
            score += 30; // Агент предпочитает такие задачи
        }
        
        // 3. Учитываем нагрузку агента (чем меньше нагрузка, тем лучше)
        score += (1 - capabilities.currentLoad) * 20;
        
        // 4. Учитываем время ожидания задачи
        const waitTime = Date.now() - task.queuedAt.getTime();
        const waitMinutes = waitTime / (1000 * 60);
        score += Math.min(waitMinutes, 10); // Максимум 10 баллов за ожидание
        
        return score;
    }
    
    /**
     * Отметить задачу как выполненную
     */
    async complete(taskId: string, result: Omit<TaskResult, 'taskId'>): Promise<void> {
        const task = this.processing.get(taskId);
        if (!task) {
            console.warn(`TaskQueue: Task ${taskId} not found in processing`);
            return;
        }
        
        // Обновляем статус задачи
        task.status = result.success ? 'completed' : 'blocked';
        task.completedAt = new Date();
        
        // Перемещаем из processing в completed
        this.processing.delete(taskId);
        
        const taskResult: TaskResult = {
            ...result,
            taskId
        };
        
        this.completed.set(taskId, taskResult);
        
        // Обновляем нагрузку агента
        this.updateAgentLoad(result.workerId, 0);
        
        console.log(`TaskQueue: Task ${taskId} completed by ${result.workerId} (${result.success ? 'success' : 'failed'})`);
        
        // Отправляем событие
        this.emit('task:completed', { task, result: taskResult });
        
        // Если задача провалилась и еще есть попытки - возвращаем в очередь
        if (!result.success && task.attempts < task.maxAttempts) {
            console.log(`TaskQueue: Re-queueing failed task ${taskId} (attempt ${task.attempts}/${task.maxAttempts})`);
            await this.enqueue(task, task.priority);
        }
    }
    
    /**
     * Отменить задачу
     */
    async cancel(taskId: string, reason?: string): Promise<void> {
        // Ищем задачу в очередях
        for (const [priority, queue] of this.queues.entries()) {
            const index = queue.findIndex(t => t.id === taskId);
            if (index !== -1) {
                const task = queue[index];
                queue.splice(index, 1);
                
                task.status = 'cancelled';
                console.log(`TaskQueue: Cancelled task ${taskId}${reason ? `: ${reason}` : ''}`);
                
                this.emit('task:cancelled', { task, reason });
                return;
            }
        }
        
        // Ищем в processing
        const task = this.processing.get(taskId);
        if (task) {
            task.status = 'cancelled';
            this.processing.delete(taskId);
            
            console.log(`TaskQueue: Cancelled in-progress task ${taskId}${reason ? `: ${reason}` : ''}`);
            this.emit('task:cancelled', { task, reason });
        }
    }
    
    /**
     * Получить все задачи в очереди
     */
    getPending(): QueuedTask[] {
        const allTasks: QueuedTask[] = [];
        for (const queue of this.queues.values()) {
            allTasks.push(...queue);
        }
        return allTasks;
    }
    
    /**
     * Получить задачи в обработке
     */
    getProcessing(): QueuedTask[] {
        return Array.from(this.processing.values());
    }
    
    /**
     * Получить завершенные задачи
     */
    getCompleted(): TaskResult[] {
        return Array.from(this.completed.values());
    }
    
    /**
     * Получить статистику
     */
    getStatistics() {
        return {
            pending: this.getPending().length,
            processing: this.processing.size,
            completed: this.completed.size,
            byPriority: {
                immediate: this.queues.get(TaskPriority.IMMEDIATE)?.length || 0,
                high: this.queues.get(TaskPriority.HIGH)?.length || 0,
                medium: this.queues.get(TaskPriority.MEDIUM)?.length || 0,
                low: this.queues.get(TaskPriority.LOW)?.length || 0
            },
            agents: this.agentCapabilities.size
        };
    }
    
    /**
     * Сортировать очередь по времени добавления
     */
    private sortQueue(priority: TaskPriority): void {
        const queue = this.queues.get(priority);
        if (queue) {
            queue.sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());
        }
    }
    
    /**
     * Очистить старые завершенные задачи
     */
    cleanup(maxAge: number = 3600000): void {
        const now = Date.now();
        const toRemove: string[] = [];
        
        for (const [taskId, result] of this.completed.entries()) {
            const task = this.processing.get(taskId);
            if (task && task.completedAt) {
                const age = now - task.completedAt.getTime();
                if (age > maxAge) {
                    toRemove.push(taskId);
                }
            }
        }
        
        for (const taskId of toRemove) {
            this.completed.delete(taskId);
        }
        
        if (toRemove.length > 0) {
            console.log(`TaskQueue: Cleaned up ${toRemove.length} old completed tasks`);
        }
    }
}
