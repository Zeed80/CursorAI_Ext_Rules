"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousMode = void 0;
class AutonomousMode {
    constructor(context, orchestrator, virtualUser, selfImprover, settingsManager) {
        this.isRunning = false;
        this.context = context;
        this.orchestrator = orchestrator;
        this.virtualUser = virtualUser;
        this.selfImprover = selfImprover;
        this.settingsManager = settingsManager;
    }
    /**
     * Запуск автономного режима
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        console.log('Autonomous mode started');
        // Запуск всех компонентов
        await this.orchestrator.start();
        await this.virtualUser.start();
        await this.selfImprover.start();
        // Запуск цикла автономной работы
        await this.runCycle();
        // Периодическое выполнение цикла
        const interval = this.settingsManager.monitoringInterval;
        this.cycleInterval = setInterval(() => {
            this.runCycle();
        }, interval);
    }
    /**
     * Остановка автономного режима
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
            this.cycleInterval = undefined;
        }
        await this.virtualUser.stop();
        await this.selfImprover.stop();
        await this.orchestrator.stop();
        console.log('Autonomous mode stopped');
    }
    /**
     * Цикл автономной работы
     */
    async runCycle() {
        if (!this.isRunning) {
            return;
        }
        console.log('Autonomous mode: Running cycle...');
        try {
            // 1. Мониторинг проекта (виртуальный пользователь)
            // Это происходит автоматически в virtualUser через его monitoringInterval
            // 2. Самосовершенствование (self-improver)
            // Это происходит автоматически в selfImprover через его improvementInterval
            // 3. Обработка задач оркестратора
            await this.processTasks();
            console.log('Autonomous mode: Cycle completed');
        }
        catch (error) {
            console.error('Autonomous mode: Error in cycle:', error);
        }
    }
    /**
     * Обработка задач
     */
    async processTasks() {
        const tasks = this.orchestrator.getTasks();
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        for (const task of pendingTasks) {
            // Виртуальный пользователь принимает решение о выполнении задачи
            // В реальной реализации это будет более сложная логика
            console.log(`Processing task: ${task.id} - ${task.description}`);
        }
    }
    isRunningState() {
        return this.isRunning;
    }
}
exports.AutonomousMode = AutonomousMode;
//# sourceMappingURL=autonomous-mode.js.map