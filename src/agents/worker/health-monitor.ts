import { AgentWorker, WorkerState } from './agent-worker';
import { EventEmitter } from 'events';

/**
 * Информация о здоровье воркера
 */
export interface WorkerHealth {
    agentId: string;
    isHealthy: boolean;
    state: WorkerState;
    lastActivity: Date;
    uptime: number;          // Время работы в мс
    tasksCompleted: number;
    tasksFailed: number;
    errors: string[];
    warnings: string[];
}

/**
 * Мониторинг здоровья воркеров
 * Отслеживает состояние и автоматически перезапускает при проблемах
 */
export class HealthMonitor extends EventEmitter {
    private workers: Map<string, AgentWorker>;
    private healthRecords: Map<string, WorkerHealth>;
    private isRunning: boolean = false;
    private monitoringInterval?: NodeJS.Timeout;
    private checkInterval: number = 10000; // 10 секунд
    private maxInactivityTime: number = 300000; // 5 минут
    private restartAttempts: Map<string, number>;
    private maxRestartAttempts: number = 3;
    
    constructor() {
        super();
        this.workers = new Map();
        this.healthRecords = new Map();
        this.restartAttempts = new Map();
    }
    
    /**
     * Запуск мониторинга
     */
    async start(workers: Map<string, AgentWorker>): Promise<void> {
        this.workers = workers;
        this.isRunning = true;
        
        // Инициализируем записи о здоровье
        for (const [agentId, worker] of workers.entries()) {
            this.healthRecords.set(agentId, {
                agentId,
                isHealthy: true,
                state: worker.getState(),
                lastActivity: new Date(),
                uptime: 0,
                tasksCompleted: 0,
                tasksFailed: 0,
                errors: [],
                warnings: []
            });
        }
        
        // Запускаем периодические проверки
        this.monitoringInterval = setInterval(() => {
            this.performHealthChecks();
        }, this.checkInterval);
        
        console.log(`HealthMonitor: Started monitoring ${workers.size} workers`);
    }
    
    /**
     * Остановка мониторинга
     */
    async stop(): Promise<void> {
        this.isRunning = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        
        console.log('HealthMonitor: Stopped');
    }
    
    /**
     * Выполнить проверку здоровья всех воркеров
     */
    private async performHealthChecks(): Promise<void> {
        if (!this.isRunning) return;
        
        for (const [agentId, worker] of this.workers.entries()) {
            const health = await this.checkWorkerHealth(agentId, worker);
            
            if (!health.isHealthy) {
                console.warn(`HealthMonitor: Worker ${agentId} is unhealthy`);
                
                // Отправляем событие
                this.emit('worker:unhealthy', health);
                
                // Пытаемся перезапустить
                await this.attemptRestart(agentId, worker, health);
            }
        }
    }
    
    /**
     * Проверить здоровье конкретного воркера
     */
    private async checkWorkerHealth(
        agentId: string,
        worker: AgentWorker
    ): Promise<WorkerHealth> {
        const existingHealth = this.healthRecords.get(agentId);
        const now = new Date();
        
        const health: WorkerHealth = {
            agentId,
            isHealthy: true,
            state: worker.getState(),
            lastActivity: existingHealth?.lastActivity || now,
            uptime: existingHealth?.uptime || 0,
            tasksCompleted: existingHealth?.tasksCompleted || 0,
            tasksFailed: existingHealth?.tasksFailed || 0,
            errors: existingHealth?.errors || [],
            warnings: existingHealth?.warnings || []
        };
        
        // Проверяем состояние
        if (worker.getState() === WorkerState.STOPPED) {
            health.isHealthy = false;
            health.errors.push('Worker is stopped');
        }
        
        // Проверяем активность (зависает ли воркер)
        const inactivityTime = now.getTime() - health.lastActivity.getTime();
        if (inactivityTime > this.maxInactivityTime && worker.isWorking()) {
            health.isHealthy = false;
            health.errors.push(`Worker inactive for ${Math.floor(inactivityTime / 1000)}s while working`);
        }
        
        // Проверяем количество ошибок
        if (health.tasksFailed > health.tasksCompleted * 0.5) {
            health.warnings.push(`High failure rate: ${health.tasksFailed}/${health.tasksCompleted + health.tasksFailed}`);
        }
        
        // Обновляем uptime
        if (existingHealth) {
            health.uptime = now.getTime() - existingHealth.lastActivity.getTime();
        }
        
        // Сохраняем обновленное здоровье
        this.healthRecords.set(agentId, health);
        
        return health;
    }
    
    /**
     * Попытка перезапуска воркера
     */
    private async attemptRestart(
        agentId: string,
        worker: AgentWorker,
        health: WorkerHealth
    ): Promise<void> {
        const attempts = this.restartAttempts.get(agentId) || 0;
        
        if (attempts >= this.maxRestartAttempts) {
            console.error(`HealthMonitor: Max restart attempts reached for ${agentId}`);
            this.emit('worker:failed', { agentId, health });
            return;
        }
        
        console.log(`HealthMonitor: Restarting worker ${agentId} (attempt ${attempts + 1}/${this.maxRestartAttempts})`);
        
        try {
            // Останавливаем
            await worker.stop();
            
            // Ждем немного
            await this.sleep(2000);
            
            // Запускаем снова
            await worker.start();
            
            // Сбрасываем счетчик попыток при успехе
            this.restartAttempts.set(agentId, 0);
            
            // Сбрасываем ошибки
            health.errors = [];
            health.isHealthy = true;
            health.lastActivity = new Date();
            this.healthRecords.set(agentId, health);
            
            this.emit('worker:restarted', { agentId, health });
            
            console.log(`HealthMonitor: Successfully restarted worker ${agentId}`);
        } catch (error: any) {
            console.error(`HealthMonitor: Failed to restart worker ${agentId}:`, error);
            this.restartAttempts.set(agentId, attempts + 1);
        }
    }
    
    /**
     * Обновить активность воркера (вызывается извне при выполнении задач)
     */
    updateActivity(agentId: string): void {
        const health = this.healthRecords.get(agentId);
        if (health) {
            health.lastActivity = new Date();
            this.healthRecords.set(agentId, health);
        }
    }
    
    /**
     * Зарегистрировать выполненную задачу
     */
    recordTaskCompleted(agentId: string, success: boolean): void {
        const health = this.healthRecords.get(agentId);
        if (health) {
            if (success) {
                health.tasksCompleted++;
            } else {
                health.tasksFailed++;
            }
            health.lastActivity = new Date();
            this.healthRecords.set(agentId, health);
        }
    }
    
    /**
     * Зарегистрировать ошибку
     */
    recordError(agentId: string, error: string): void {
        const health = this.healthRecords.get(agentId);
        if (health) {
            health.errors.push(`${new Date().toISOString()}: ${error}`);
            // Ограничиваем количество ошибок в истории
            if (health.errors.length > 10) {
                health.errors.shift();
            }
            this.healthRecords.set(agentId, health);
        }
    }
    
    /**
     * Получить здоровье всех воркеров
     */
    getAllHealth(): WorkerHealth[] {
        return Array.from(this.healthRecords.values());
    }
    
    /**
     * Получить здоровье конкретного воркера
     */
    getWorkerHealth(agentId: string): WorkerHealth | null {
        return this.healthRecords.get(agentId) || null;
    }
    
    /**
     * Получить статистику
     */
    getStatistics() {
        const all = this.getAllHealth();
        const healthy = all.filter(h => h.isHealthy).length;
        const unhealthy = all.filter(h => !h.isHealthy).length;
        const totalCompleted = all.reduce((sum, h) => sum + h.tasksCompleted, 0);
        const totalFailed = all.reduce((sum, h) => sum + h.tasksFailed, 0);
        
        return {
            total: all.length,
            healthy,
            unhealthy,
            tasksCompleted: totalCompleted,
            tasksFailed: totalFailed,
            successRate: totalCompleted + totalFailed > 0 
                ? (totalCompleted / (totalCompleted + totalFailed) * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }
    
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
