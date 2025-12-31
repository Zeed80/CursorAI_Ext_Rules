import * as vscode from 'vscode';
import { SelfLearningOrchestrator } from './self-learning-orchestrator';
import { SwarmOrchestrator } from './swarm-orchestrator';
import { FileWatcher } from './file-watcher';
import { HealthMonitor } from '../agents/worker/health-monitor';
import { MessageBus, MessageType, getGlobalMessageBus } from '../agents/worker/message-bus';
import { TaskPriority } from '../agents/worker/task-queue';
import { Task } from './orchestrator';

/**
 * Интеграция автономного Swarm оркестратора с существующим SelfLearningOrchestrator
 * Объединяет две системы для совместной работы:
 * - SelfLearningOrchestrator: мозговой штурм, качество, обучение
 * - SwarmOrchestrator: автономные воркеры, Swarm координация
 */
export class AutonomousOrchestratorIntegration {
    private selfLearningOrchestrator: SelfLearningOrchestrator;
    private swarmOrchestrator: SwarmOrchestrator | null = null;
    private fileWatcher: FileWatcher | null = null;
    private healthMonitor: HealthMonitor | null = null;
    private messageBus: MessageBus;
    private isEnabled: boolean = false;
    
    constructor(
        context: vscode.ExtensionContext,
        selfLearningOrchestrator: SelfLearningOrchestrator
    ) {
        this.selfLearningOrchestrator = selfLearningOrchestrator;
        this.messageBus = getGlobalMessageBus();
    }
    
    /**
     * Включить автономный режим
     */
    async enable(): Promise<void> {
        if (this.isEnabled) {
            console.log('AutonomousOrchestrator: Already enabled');
            return;
        }
        
        // Проверяем настройки
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const autonomousMode = config.get<boolean>('autonomousMode', false);
        
        if (!autonomousMode) {
            const answer = await vscode.window.showWarningMessage(
                'Автономный режим отключен в настройках. Включить его?',
                'Да', 'Открыть настройки', 'Отмена'
            );
            
            if (answer === 'Да') {
                await config.update('autonomousMode', true, vscode.ConfigurationTarget.Global);
            } else if (answer === 'Открыть настройки') {
                await vscode.commands.executeCommand('cursor-autonomous.openSettings');
                return;
            } else {
                return;
            }
        }
        
        console.log('AutonomousOrchestrator: Enabling autonomous mode...');
        
        try {
            // 1. Создаем SwarmOrchestrator с агентами из SelfLearningOrchestrator
            let localAgents = this.selfLearningOrchestrator.getLocalAgents();
            
            // Проверяем что агенты инициализированы
            if (localAgents.size === 0) {
                console.warn('AutonomousOrchestrator: No local agents available yet, waiting...');
                // Даем время на инициализацию (они инициализируются асинхронно)
                await new Promise(resolve => setTimeout(resolve, 2000));
                localAgents = this.selfLearningOrchestrator.getLocalAgents();
                
                if (localAgents.size === 0) {
                    throw new Error('No local agents available. Please configure agents in Settings.');
                }
            }
            
            console.log(`AutonomousOrchestrator: Found ${localAgents.size} local agents:`, 
                Array.from(localAgents.keys()).join(', '));
            
            this.swarmOrchestrator = new SwarmOrchestrator(
                vscode.workspace.workspaceFolders?.[0]?.uri as any,
                localAgents
            );
            
            // 2. Создаем FileWatcher
            this.fileWatcher = new FileWatcher(this.messageBus);
            
            // 3. Создаем HealthMonitor
            this.healthMonitor = new HealthMonitor();
            
            // 4. Настраиваем связь между системами
            this.setupIntegration();
            
            // 5. Запускаем компоненты
            await this.swarmOrchestrator.start();
            await this.fileWatcher.start();
            
            // 6. Запускаем HealthMonitor с воркерами
            if (this.swarmOrchestrator) {
                const workers = (this.swarmOrchestrator as any).workers; // Получаем приватное поле
                if (workers && workers.size > 0) {
                    await this.healthMonitor.start(workers);
                }
            }
            
            this.isEnabled = true;
            
            vscode.window.showInformationMessage('✅ Автономный режим активирован');
            console.log('AutonomousOrchestrator: Autonomous mode enabled');
            
        } catch (error: any) {
            console.error('AutonomousOrchestrator: Failed to enable:', error);
            vscode.window.showErrorMessage(`Ошибка активации автономного режима: ${error.message}`);
        }
    }
    
    /**
     * Выключить автономный режим
     */
    async disable(): Promise<void> {
        if (!this.isEnabled) {
            return;
        }
        
        console.log('AutonomousOrchestrator: Disabling autonomous mode...');
        
        try {
            // Останавливаем компоненты
            if (this.swarmOrchestrator) {
                await this.swarmOrchestrator.stop();
            }
            
            if (this.fileWatcher) {
                await this.fileWatcher.stop();
            }
            
            if (this.healthMonitor) {
                await this.healthMonitor.stop();
            }
            
            this.isEnabled = false;
            
            vscode.window.showInformationMessage('⏸️ Автономный режим деактивирован');
            console.log('AutonomousOrchestrator: Autonomous mode disabled');
            
        } catch (error: any) {
            console.error('AutonomousOrchestrator: Failed to disable:', error);
        }
    }
    
    /**
     * Настроить интеграцию между системами
     */
    private setupIntegration(): void {
        // 1. Подключаем FileWatcher к созданию задач
        if (this.fileWatcher) {
            this.fileWatcher.on('files:changed', async (changes: any[]) => {
                console.log(`AutonomousOrchestrator: Detected ${changes.length} file changes`);
                
                // Анализируем изменения и создаем задачи если нужно
                // Пока создаем задачу только для значительных изменений
                if (changes.length > 5) {
                    await this.createTaskFromFileChanges(changes);
                }
            });
        }
        
        // 2. Подключаем HealthMonitor к отслеживанию задач
        if (this.healthMonitor) {
            // Подписываемся на события завершения задач
            this.messageBus.subscribe(
                'health-monitor',
                [MessageType.TASK_COMPLETED, MessageType.TASK_FAILED],
                async (message) => {
                    const { result } = message.payload;
                    if (result && this.healthMonitor) {
                        this.healthMonitor.recordTaskCompleted(
                            result.workerId,
                            result.success
                        );
                    }
                }
            );
            
            // Подписываемся на события нездоровых воркеров
            this.healthMonitor.on('worker:unhealthy', (health: any) => {
                vscode.window.showWarningMessage(
                    `⚠️ Агент ${health.agentId} не отвечает`
                );
            });
            
            this.healthMonitor.on('worker:restarted', (data: any) => {
                vscode.window.showInformationMessage(
                    `✅ Агент ${data.agentId} перезапущен`
                );
            });
        }
        
        // 3. Интеграция с SelfLearningOrchestrator
        // Когда SelfLearningOrchestrator создает задачу - добавляем в SwarmQueue
        // (Это будет добавлено через обертку методов)
    }
    
    /**
     * Создать задачу из изменений файлов
     */
    private async createTaskFromFileChanges(changes: any[]): Promise<void> {
        if (!this.swarmOrchestrator) return;
        
        // Определяем тип задачи на основе изменений
        const hasTests = changes.some(c => c.file.includes('.test.') || c.file.includes('.spec.'));
        const hasConfig = changes.some(c => c.file.endsWith('.json') || c.file.endsWith('.yaml'));
        
        let taskType: 'improvement' | 'quality-check' = 'improvement';
        let description = `Проверить изменения в ${changes.length} файлах`;
        let priority = TaskPriority.LOW;
        
        if (hasTests) {
            taskType = 'quality-check';
            description = 'Проверить тесты после изменений';
            priority = TaskPriority.MEDIUM;
        } else if (hasConfig) {
            priority = TaskPriority.HIGH;
            description = 'Проверить конфигурацию после изменений';
        }
        
        await this.swarmOrchestrator.createTask({
            type: taskType,
            description,
            priority: priority === TaskPriority.HIGH ? 'high' : 'medium'
        }, priority);
    }
    
    /**
     * Создать задачу с приоритетом (публичный API)
     */
    async createTask(
        description: string,
        priority: 'immediate' | 'high' | 'medium' | 'low' = 'medium',
        type: Task['type'] = 'feature'
    ): Promise<void> {
        if (!this.swarmOrchestrator) {
            vscode.window.showWarningMessage('Автономный режим не активирован');
            return;
        }
        
        const taskPriority = this.mapPriority(priority);
        
        await this.swarmOrchestrator.createTask({
            type,
            description,
            priority: priority === 'immediate' ? 'high' : priority
        }, taskPriority);
        
        vscode.window.showInformationMessage(`📝 Задача создана с приоритетом "${priority}"`);
    }
    
    /**
     * Преобразовать строковый приоритет в TaskPriority
     */
    private mapPriority(priority: string): TaskPriority {
        switch (priority) {
            case 'immediate': return TaskPriority.IMMEDIATE;
            case 'high': return TaskPriority.HIGH;
            case 'medium': return TaskPriority.MEDIUM;
            case 'low': return TaskPriority.LOW;
            default: return TaskPriority.MEDIUM;
        }
    }
    
    /**
     * Получить статус автономной системы
     */
    getStatus() {
        if (!this.isEnabled || !this.swarmOrchestrator) {
            return {
                enabled: false,
                workers: [],
                tasks: { pending: 0, processing: 0, completed: 0 },
                health: null
            };
        }
        
        return {
            enabled: true,
            workers: this.swarmOrchestrator.getWorkersStatus(),
            tasks: this.swarmOrchestrator.getQueueStatistics(),
            health: this.healthMonitor?.getStatistics() || null,
            messageBus: this.swarmOrchestrator.getMessageBusStatistics()
        };
    }
    
    /**
     * Проверка, включен ли автономный режим
     */
    isAutonomousEnabled(): boolean {
        return this.isEnabled;
    }
}
