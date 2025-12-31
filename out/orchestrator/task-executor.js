"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecutor = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Исполнитель задач
 * Отвечает за реальное выполнение задач через CursorAI Chat
 */
class TaskExecutor {
    constructor(context, taskAnalytics) {
        this.activeExecutions = new Map();
        this.fileWatchers = new Map();
        this.context = context;
        this.taskAnalytics = taskAnalytics;
    }
    /**
     * Выполнение задачи
     */
    async executeTask(task) {
        console.log(`TaskExecutor: Starting execution of task ${task.id}`);
        try {
            // Отправляем задачу в CursorAI Chat
            const chatMessage = this.formatTaskForChat(task);
            await this.sendToChat(chatMessage);
            // Начинаем мониторинг изменений файлов
            const monitorPromise = this.monitorTaskExecution(task);
            // Ждем выполнения с таймаутом
            const timeout = this.getTaskTimeout(task);
            const result = await Promise.race([
                monitorPromise,
                this.createTimeout(timeout)
            ]);
            if (result === 'timeout') {
                return {
                    success: false,
                    error: `Задача не завершена в течение ${timeout / 1000} секунд`,
                    message: 'Таймаут выполнения задачи'
                };
            }
            return result;
        }
        catch (error) {
            console.error(`TaskExecutor: Error executing task ${task.id}:`, error);
            return {
                success: false,
                error: error.message || 'Неизвестная ошибка',
                message: 'Ошибка выполнения задачи'
            };
        }
    }
    /**
     * Форматирование задачи для отправки в чат
     */
    formatTaskForChat(task) {
        const agentName = task.assignedAgent || 'Оркестратор';
        const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        const typeEmoji = this.getTypeEmoji(task.type);
        return `${typeEmoji} **Задача: ${task.description}**

**Тип:** ${task.type}
**Приоритет:** ${priorityEmoji} ${task.priority}
**Назначен:** ${agentName}
**ID:** ${task.id}

**Инструкции:**
1. Проанализируй задачу и определи необходимые изменения
2. Выполни все необходимые изменения в коде
3. Убедись, что код соответствует стандартам проекта
4. Проверь, что все зависимости обновлены

**Важно:** После выполнения задачи сообщи о результате.`;
    }
    /**
     * Получение эмодзи для типа задачи
     */
    getTypeEmoji(type) {
        const emojis = {
            'feature': '✨',
            'bug': '🐛',
            'improvement': '🔧',
            'refactoring': '♻️',
            'documentation': '📝',
            'quality-check': '🔍',
            'analysis': '📊'
        };
        return emojis[type] || '📋';
    }
    /**
     * Отправка сообщения в CursorAI Chat
     */
    async sendToChat(message) {
        try {
            // Копируем сообщение в буфер обмена
            await vscode.env.clipboard.writeText(message);
            console.log('TaskExecutor: Message copied to clipboard, checking integration settings...');
            // Проверяем настройки интеграции
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            const cursorIntegration = config.get('cursorIntegration', {
                useChat: true,
                useComposer: false,
                useTab: false,
                autoApplyComposer: false
            });
            let success = false;
            // Пробуем Composer, если включен
            if (cursorIntegration.useComposer) {
                console.log('TaskExecutor: Trying Cursor Composer...');
                success = await this.sendToComposer(message);
                if (success) {
                    vscode.window.showInformationMessage('✅ Задача отправлена в Cursor Composer', 'OK');
                    return;
                }
            }
            // Пробуем Chat, если включен (по умолчанию)
            if (cursorIntegration.useChat || !cursorIntegration.useComposer) {
                console.log('TaskExecutor: Trying Cursor Chat...');
                const chatOpened = await this.openCursorChat();
                if (chatOpened) {
                    // Чат открыт, пытаемся автоматически отправить сообщение
                    const sent = await this.sendMessageToChat(message);
                    if (sent) {
                        vscode.window.showInformationMessage('✅ Задача отправлена в Cursor Chat', 'OK');
                        return;
                    }
                    else {
                        // Не удалось автоматически отправить, но чат открыт
                        vscode.window.showInformationMessage('📋 Чат Cursor открыт. Вставьте задачу из буфера обмена (Ctrl+V / Cmd+V)', 'OK');
                        return;
                    }
                }
            }
            // Если ничего не сработало
            vscode.window.showWarningMessage('Задача подготовлена для передачи в чат. Сообщение скопировано в буфер обмена. Откройте Cursor Chat или Composer вручную и вставьте (Ctrl+V / Cmd+V).', 'Понятно');
        }
        catch (error) {
            console.error('TaskExecutor: Failed to send to chat:', error);
            // Fallback: просто копируем в буфер обмена
            await vscode.env.clipboard.writeText(message);
            vscode.window.showWarningMessage('Не удалось открыть чат автоматически. Сообщение скопировано в буфер обмена. Откройте Cursor Chat и вставьте вручную.', 'OK');
        }
    }
    /**
     * Отправка задачи в Cursor Composer
     */
    async sendToComposer(message) {
        try {
            // Команды для открытия Composer
            const composerCommands = [
                'composer.startComposerPrompt', // Основная команда Composer
                'cursor.composer', // Альтернативная команда
                'aichat.startComposer' // Еще один вариант
            ];
            for (const command of composerCommands) {
                try {
                    console.log(`TaskExecutor: Trying Composer command: ${command}`);
                    await vscode.commands.executeCommand(command, message);
                    console.log(`TaskExecutor: Successfully opened Composer with: ${command}`);
                    // Даем время Composer'у открыться
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // Проверяем настройку автоприменения
                    const config = vscode.workspace.getConfiguration('cursor-autonomous');
                    const cursorIntegration = config.get('cursorIntegration', { autoApplyComposer: false });
                    if (cursorIntegration.autoApplyComposer) {
                        // Пытаемся автоматически применить изменения
                        try {
                            await vscode.commands.executeCommand('composer.acceptAll');
                            console.log('TaskExecutor: Auto-applied Composer changes');
                        }
                        catch (acceptError) {
                            console.debug('TaskExecutor: Auto-apply not available');
                        }
                    }
                    return true;
                }
                catch (error) {
                    console.debug(`TaskExecutor: Composer command ${command} not available:`, error.message);
                    continue;
                }
            }
            console.warn('TaskExecutor: No Composer command worked');
            return false;
        }
        catch (error) {
            console.error('TaskExecutor: Failed to send to Composer:', error);
            return false;
        }
    }
    /**
     * Открытие Cursor Chat
     * Пробует различные команды для открытия чата
     */
    async openCursorChat() {
        // Список возможных команд для открытия чата в Cursor
        const chatCommands = [
            'aichat.newaiconversation', // Основная команда Cursor Chat
            'cursor.newChat', // Альтернативная команда
            'workbench.panel.chat.view.copilot.focus', // GitHub Copilot Chat (может быть в Cursor)
            'workbench.action.chat.open' // Общая команда VS Code
        ];
        for (const command of chatCommands) {
            try {
                console.log(`TaskExecutor: Trying command: ${command}`);
                await vscode.commands.executeCommand(command);
                await new Promise(resolve => setTimeout(resolve, 500)); // Даем время на открытие
                console.log(`TaskExecutor: Successfully executed: ${command}`);
                return true;
            }
            catch (error) {
                console.debug(`TaskExecutor: Command ${command} not available:`, error.message);
                continue;
            }
        }
        console.warn('TaskExecutor: No chat command worked');
        return false;
    }
    /**
     * Отправка сообщения в открытый чат
     * Пытается автоматически отправить сообщение
     */
    async sendMessageToChat(message) {
        try {
            // Даем время чату открыться
            await new Promise(resolve => setTimeout(resolve, 800));
            // Пытаемся отправить сообщение через команды
            const sendCommands = [
                'aichat.sendMessage', // Если есть такая команда
                'chat.action.submit', // Альтернативная команда
                'workbench.action.chat.submit' // VS Code команда
            ];
            for (const command of sendCommands) {
                try {
                    console.log(`TaskExecutor: Trying send command: ${command}`);
                    await vscode.commands.executeCommand(command, message);
                    console.log(`TaskExecutor: Successfully sent message with: ${command}`);
                    return true;
                }
                catch (error) {
                    console.debug(`TaskExecutor: Send command ${command} not available:`, error.message);
                    continue;
                }
            }
            // Если команды не работают, пробуем симулировать вставку и Enter
            console.log('TaskExecutor: Trying paste and enter simulation...');
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            await new Promise(resolve => setTimeout(resolve, 200));
            // Пытаемся нажать Enter для отправки
            await vscode.commands.executeCommand('type', { text: '\n' });
            console.log('TaskExecutor: Paste and enter simulation completed');
            return true;
        }
        catch (error) {
            console.error('TaskExecutor: Failed to send message to chat:', error);
            return false;
        }
    }
    /**
     * Мониторинг выполнения задачи
     * Отслеживает изменения файлов как индикатор прогресса
     */
    async monitorTaskExecution(task) {
        return new Promise((resolve) => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                resolve({
                    success: false,
                    error: 'Рабочая область не найдена'
                });
                return;
            }
            const startTime = Date.now();
            const changedFiles = new Set();
            let lastChangeTime = startTime;
            const checkInterval = 5000; // Проверка каждые 5 секунд
            const inactivityTimeout = 300000; // 5 минут без изменений = завершение
            // Создаем файловый watcher
            const pattern = new vscode.RelativePattern(workspaceFolder, '**/*');
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            watcher.onDidCreate((uri) => {
                changedFiles.add(uri.fsPath);
                lastChangeTime = Date.now();
                console.log(`TaskExecutor: File created: ${uri.fsPath}`);
            });
            watcher.onDidChange((uri) => {
                changedFiles.add(uri.fsPath);
                lastChangeTime = Date.now();
                console.log(`TaskExecutor: File changed: ${uri.fsPath}`);
            });
            watcher.onDidDelete((uri) => {
                changedFiles.add(uri.fsPath);
                lastChangeTime = Date.now();
                console.log(`TaskExecutor: File deleted: ${uri.fsPath}`);
            });
            this.fileWatchers.set(task.id, watcher);
            // Периодическая проверка активности
            const checkIntervalId = setInterval(() => {
                const now = Date.now();
                const timeSinceLastChange = now - lastChangeTime;
                const totalTime = now - startTime;
                // Если прошло много времени без изменений, считаем задачу завершенной
                if (timeSinceLastChange > inactivityTimeout && changedFiles.size > 0) {
                    clearInterval(checkIntervalId);
                    watcher.dispose();
                    this.fileWatchers.delete(task.id);
                    const filesArray = Array.from(changedFiles);
                    resolve({
                        success: true,
                        message: `Задача выполнена. Изменено файлов: ${filesArray.length}`,
                        filesChanged: filesArray,
                        codeChanges: filesArray.length
                    });
                }
                // Обновляем статус задачи
                this.updateTaskProgress(task, {
                    filesChanged: changedFiles.size,
                    timeElapsed: totalTime,
                    isActive: timeSinceLastChange < inactivityTimeout
                });
            }, checkInterval);
            // Сохраняем интервал для возможной отмены
            this.activeExecutions.set(task.id, checkIntervalId);
        });
    }
    /**
     * Обновление прогресса задачи
     */
    updateTaskProgress(task, progress) {
        // Обновляем статус в UI через события
        const progressMessage = `Задача "${task.description}": изменено файлов ${progress.filesChanged}, прошло ${Math.round(progress.timeElapsed / 1000)}с`;
        // Можно отправить событие для обновления UI
        vscode.commands.executeCommand('cursor-autonomous.refreshAgentsStatus');
    }
    /**
     * Создание таймаута
     */
    createTimeout(ms) {
        return new Promise(resolve => {
            setTimeout(() => resolve('timeout'), ms);
        });
    }
    /**
     * Получение таймаута для задачи в зависимости от приоритета
     */
    getTaskTimeout(task) {
        const timeouts = {
            'immediate': 300000, // 5 минут
            'high': 600000, // 10 минут
            'medium': 900000, // 15 минут
            'low': 1200000 // 20 минут
        };
        return timeouts[task.priority] || 900000;
    }
    /**
     * Отмена выполнения задачи
     */
    cancelTaskExecution(taskId) {
        const intervalId = this.activeExecutions.get(taskId);
        if (intervalId) {
            clearInterval(intervalId);
            this.activeExecutions.delete(taskId);
        }
        const watcher = this.fileWatchers.get(taskId);
        if (watcher) {
            watcher.dispose();
            this.fileWatchers.delete(taskId);
        }
    }
    /**
     * Очистка ресурсов
     */
    dispose() {
        // Отменяем все активные выполнения
        for (const [taskId, intervalId] of this.activeExecutions) {
            clearInterval(intervalId);
        }
        this.activeExecutions.clear();
        // Закрываем все watchers
        for (const [taskId, watcher] of this.fileWatchers) {
            watcher.dispose();
        }
        this.fileWatchers.clear();
    }
}
exports.TaskExecutor = TaskExecutor;
//# sourceMappingURL=task-executor.js.map