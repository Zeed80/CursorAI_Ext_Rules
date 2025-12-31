import * as vscode from 'vscode';

/**
 * Централизованный логгер для оркестратора
 * Выводит информацию в Output Channel для пользователя
 */
export class OrchestratorLogger {
    private static instance: OrchestratorLogger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('CursorAI Autonomous', { log: true });
    }

    static getInstance(): OrchestratorLogger {
        if (!OrchestratorLogger.instance) {
            OrchestratorLogger.instance = new OrchestratorLogger();
        }
        return OrchestratorLogger.instance;
    }

    /**
     * Показать панель Output
     */
    show(): void {
        this.outputChannel.show(true); // true = сохранить фокус на редакторе
    }

    /**
     * Очистить лог
     */
    clear(): void {
        this.outputChannel.clear();
    }

    /**
     * Общий лог
     */
    log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    /**
     * Информация
     */
    info(message: string): void {
        this.log(`ℹ️  ${message}`);
    }

    /**
     * Успех
     */
    success(message: string): void {
        this.log(`✅ ${message}`);
    }

    /**
     * Предупреждение
     */
    warn(message: string): void {
        this.log(`⚠️  ${message}`);
    }

    /**
     * Ошибка
     */
    error(message: string, error?: Error): void {
        this.log(`❌ ${message}`);
        if (error) {
            this.log(`   Детали: ${error.message}`);
            if (error.stack) {
                const stackLines = error.stack.split('\n').slice(1, 4); // Первые 3 строки стека
                stackLines.forEach(line => this.log(`   ${line.trim()}`));
            }
        }
    }

    /**
     * Начало задачи
     */
    taskStart(taskId: string, description: string): void {
        this.log('');
        this.log(`🚀 Начало задачи: ${taskId}`);
        this.log(`   Описание: ${description}`);
        this.log('');
    }

    /**
     * Прогресс задачи
     */
    taskProgress(taskId: string, message: string): void {
        this.log(`   📊 [${taskId}] ${message}`);
    }

    /**
     * Завершение задачи
     */
    taskComplete(taskId: string, filesChanged: number, timeElapsed: number): void {
        this.log('');
        this.success(`Задача завершена: ${taskId}`);
        this.log(`   Изменено файлов: ${filesChanged}`);
        this.log(`   Время выполнения: ${(timeElapsed / 1000).toFixed(2)}с`);
        this.log('');
    }

    /**
     * Ошибка задачи
     */
    taskError(taskId: string, error: Error): void {
        this.log('');
        this.error(`Ошибка выполнения задачи: ${taskId}`, error);
        this.log('');
    }

    /**
     * Действие агента
     */
    agentAction(agentId: string, action: string): void {
        this.log(`   🤖 [${agentId}] ${action}`);
    }

    /**
     * Начало работы оркестратора
     */
    orchestratorStart(): void {
        this.log('═══════════════════════════════════════════════════════════');
        this.success('Оркестратор запущен');
        this.log('═══════════════════════════════════════════════════════════');
    }

    /**
     * Остановка оркестратора
     */
    orchestratorStop(): void {
        this.log('═══════════════════════════════════════════════════════════');
        this.info('Оркестратор остановлен');
        this.log('═══════════════════════════════════════════════════════════');
    }

    /**
     * Результат проверки качества
     */
    qualityCheck(score: number, passed: boolean): void {
        const emoji = passed ? '✅' : '❌';
        this.log(`   ${emoji} Оценка качества: ${score.toFixed(1)}/100 (${passed ? 'ПРОЙДЕНО' : 'НЕ ПРОЙДЕНО'})`);
    }

    /**
     * Список измененных файлов
     */
    filesChanged(files: string[]): void {
        if (files.length === 0) {
            this.warn('Файлы не были изменены');
            return;
        }
        
        this.log('   📝 Изменены файлы:');
        files.forEach(file => {
            this.log(`      - ${file}`);
        });
    }

    /**
     * Заголовок раздела
     */
    section(title: string): void {
        this.log('');
        this.log(`┌─────────────────────────────────────────────────────────┐`);
        this.log(`│  ${title.padEnd(55)}│`);
        this.log(`└─────────────────────────────────────────────────────────┘`);
    }
}
