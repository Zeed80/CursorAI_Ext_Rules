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
exports.StatusPanel = void 0;
const vscode = __importStar(require("vscode"));
class StatusPanel {
    constructor(panel, extensionUri, agentsTreeProvider) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.agentsTreeProvider = agentsTreeProvider;
        // Обновление содержимого при изменении статуса
        this.agentsTreeProvider.onDidChangeTreeData(() => {
            this.update();
        });
        // Обработка сообщений от webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'refresh':
                    this.update();
                    return;
                case 'agentClick':
                    vscode.commands.executeCommand('cursor-autonomous.showAgentDetails', message.agentId);
                    return;
                case 'sendTaskToChat':
                    this.sendTaskToChat(message.agentId, message.taskId);
                    return;
            }
        }, null, this._disposables);
        // Обновление при изменении видимости
        this._panel.onDidChangeViewState(() => {
            if (this._panel.visible) {
                this.update();
            }
        }, null, this._disposables);
        // Очистка при закрытии
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Первоначальная загрузка
        this.update();
    }
    static createOrShow(extensionUri, agentsTreeProvider) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // Если панель уже открыта, показываем её
        if (StatusPanel.currentPanel) {
            StatusPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Создаем новую панель
        const panel = vscode.window.createWebviewPanel('agentsStatus', 'Статус агентов', column || vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
        });
        StatusPanel.currentPanel = new StatusPanel(panel, extensionUri, agentsTreeProvider);
    }
    static revive(panel, extensionUri, agentsTreeProvider) {
        StatusPanel.currentPanel = new StatusPanel(panel, extensionUri, agentsTreeProvider);
    }
    dispose() {
        StatusPanel.currentPanel = undefined;
        // Очистка ресурсов
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    async update() {
        const webview = this._panel.webview;
        const agents = this.agentsTreeProvider.getAllAgents();
        this._panel.webview.html = await this.getHtmlForWebview(webview, agents);
    }
    async getHtmlForWebview(webview, agents) {
        const workingAgents = agents.filter(a => a.status === 'working');
        const idleAgents = agents.filter(a => a.status === 'idle');
        const totalTasks = agents.reduce((sum, a) => sum + a.tasksInProgress, 0);
        const completedTasks = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Статус агентов</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            margin-bottom: 20px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.8;
        }
        .agents-list {
            display: grid;
            gap: 15px;
        }
        .agent-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .agent-card:hover {
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-list-hoverBackground);
        }
        .agent-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .agent-name {
            font-weight: bold;
            font-size: 16px;
        }
        .agent-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .status-working {
            background: var(--vscode-testing-iconPassed);
            color: white;
        }
        .status-idle {
            background: var(--vscode-descriptionForeground);
            color: white;
        }
        .status-error {
            background: var(--vscode-testing-iconFailed);
            color: white;
        }
        .agent-task {
            margin-top: 10px;
            padding: 10px;
            background: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 4px;
            font-size: 14px;
        }
        .agent-stats {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            font-size: 12px;
            opacity: 0.8;
        }
        .agent-thoughts {
            margin-top: 15px;
            padding: 12px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
            font-size: 13px;
        }
        .thoughts-header {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        .thoughts-phase {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            margin-bottom: 8px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .thoughts-analysis {
            margin: 8px 0;
            padding: 8px;
            background: var(--vscode-editor-background);
            border-radius: 3px;
            font-size: 12px;
        }
        .thoughts-progress {
            margin-top: 8px;
            font-size: 11px;
            opacity: 0.8;
        }
        .refresh-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .send-to-chat-btn {
            margin-top: 10px;
            padding: 8px 16px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            width: 100%;
            transition: all 0.2s;
            display: block;
            text-align: center;
        }
        .send-to-chat-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .send-to-chat-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Статус многоагентной системы</h1>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-label">Активных агентов</div>
            <div class="stat-value">${workingAgents.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Задач в работе</div>
            <div class="stat-value">${totalTasks}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Задач выполнено</div>
            <div class="stat-value">${completedTasks}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Всего агентов</div>
            <div class="stat-value">${agents.length}</div>
        </div>
    </div>

    <div class="agents-list">
        ${(await Promise.all(agents.map(agent => this.getAgentCardHtml(agent)))).join('')}
    </div>

    <button class="refresh-btn" id="btnRefresh">Обновить</button>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function agentClick(agentId) {
            vscode.postMessage({ command: 'agentClick', agentId: agentId });
        }

        function sendTaskToChat(agentId, taskId, event) {
            event.stopPropagation(); // Предотвращаем клик по карточке агента
            vscode.postMessage({ command: 'sendTaskToChat', agentId: agentId, taskId: taskId });
        }

        // Автообновление каждые 5 секунд
        let refreshInterval = null;

        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('btnRefresh')?.addEventListener('click', refresh);

            // Добавляем обработчики для карточек агентов
            document.querySelectorAll('.agent-card').forEach(card => {
                card.addEventListener('click', function(e) {
                    const agentId = this.getAttribute('data-agent-id');
                    if (agentId) agentClick(agentId);
                });
            });

            // Добавляем обработчики для кнопок "Передать в чат"
            document.querySelectorAll('.send-to-chat-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const agentId = this.getAttribute('data-agent-id');
                    const taskId = this.getAttribute('data-task-id');
                    if (agentId && taskId) sendTaskToChat(agentId, taskId, e);
                });
            });

            // Автообновление каждые 5 секунд
            refreshInterval = setInterval(refresh, 5000);
        });
    </script>
</body>
</html>`;
    }
    async getAgentCardHtml(agent) {
        const statusClass = `status-${agent.status}`;
        const statusText = this.getStatusText(agent.status);
        // Получаем первую задачу агента (любого статуса)
        const agentTask = this.agentsTreeProvider.getFirstAgentTask(agent.id);
        const hasTask = !!agentTask;
        return `
        <div class="agent-card" data-agent-id="${agent.id}">
            <div class="agent-header">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-status ${statusClass}">${statusText}</div>
            </div>
            ${agentTask ? `
                <div class="agent-task">
                    <strong>Задача:</strong><br>
                    ${this.escapeHtml(agentTask.description)}
                    <div style="margin-top: 4px; font-size: 11px; opacity: 0.8;">
                        Статус: ${this.getTaskStatusText(agentTask.status)} | Приоритет: ${this.getTaskPriorityText(agentTask.priority)}
                    </div>
                    ${agentTask.progress ? `
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                            📝 Изменено файлов: ${agentTask.progress.filesChanged || 0}<br>
                            ⏱️ Время: ${Math.round((agentTask.progress.timeElapsed || 0) / 1000)}с
                            ${agentTask.progress.isActive ? ' ✅ Активна' : ' ⏸️ Ожидает'}
                        </div>
                    ` : ''}
                    ${agentTask.executionResult && !agentTask.executionResult.success ? `
                        <div style="margin-top: 8px; padding: 8px; background: var(--vscode-inputValidation-errorBackground); border-radius: 4px; font-size: 12px;">
                            ❌ Ошибка: ${this.escapeHtml(agentTask.executionResult.error || 'Неизвестная ошибка')}
                        </div>
                    ` : ''}
                    ${agentTask.executionResult && agentTask.executionResult.success ? `
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                            ✅ Выполнено: ${Array.isArray(agentTask.executionResult.filesChanged) ? agentTask.executionResult.filesChanged.length : 0} файлов изменено
                        </div>
                    ` : ''}
                    ${agentTask.qualityReport ? `
                        <div style="margin-top: 8px; padding: 8px; background: ${agentTask.qualityReport.passed ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)'}; opacity: 0.1; border-radius: 4px; border-left: 3px solid ${agentTask.qualityReport.passed ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)'};">
                            <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                                ${agentTask.qualityReport.passed ? '✅' : '❌'} Качество: ${agentTask.qualityReport.score}/100
                            </div>
                            ${agentTask.qualityReport.issues.length > 0 ? `
                                <div style="font-size: 11px; margin-top: 4px;">
                                    Проблем: ${agentTask.qualityReport.issues.length}
                                    ${agentTask.qualityReport.issues.slice(0, 2).map(issue => `<div>• ${issue.severity}: ${this.escapeHtml(issue.message)}</div>`).join('')}
                                    ${agentTask.qualityReport.issues.length > 2 ? `<div>... и еще ${agentTask.qualityReport.issues.length - 2}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            <button 
                class="send-to-chat-btn"
                data-agent-id="${this.escapeHtml(agent.id)}"
                data-task-id="${hasTask ? this.escapeHtml(agentTask.id) : ''}"
                title="${hasTask ? 'Передать задачу в чат CursorAI для ручной обработки' : 'Нет задачи для передачи в чат'}"
                style="margin-top: 12px; display: block; width: 100%;"
                ${hasTask ? '' : 'disabled'}
            >
                💬 Передать в чат
            </button>
            <div style="margin-top: 12px; padding: 8px; background: var(--vscode-input-background); border-radius: 4px; border: 1px solid var(--vscode-input-border); font-size: 12px; opacity: 0.8;">
                ⚙️ Настройка модели: откройте панель настроек расширения
            </div>
            ${agent.id === 'virtual-user' && agent.autonomousMode !== undefined ? `
                <div style="margin-top: 8px; padding: 8px; background: ${agent.autonomousMode ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconQueued)'}; opacity: 0.15; border-radius: 4px; border-left: 3px solid ${agent.autonomousMode ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconQueued)'};">
                    <div style="font-weight: bold; margin-bottom: 4px;">
                        ${agent.autonomousMode ? '🤖 Автономный режим' : '👤 Ручной режим'}
                    </div>
                    ${agent.confidenceThresholds ? `
                        <div style="font-size: 11px; opacity: 0.9;">
                            Автоодобрение: >${Math.round(agent.confidenceThresholds.autoApprove * 100)}%<br>
                            Запрос: ${Math.round(agent.confidenceThresholds.requestConfirmation * 100)}-${Math.round(agent.confidenceThresholds.autoApprove * 100)}%<br>
                            Автоотклонение: <${Math.round(agent.confidenceThresholds.requestConfirmation * 100)}%
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            ${agent.status === 'error' && agent.errorMessage ? `
                <div style="margin-top: 12px; padding: 12px; background: var(--vscode-inputValidation-errorBackground); border-radius: 4px; border-left: 4px solid var(--vscode-errorForeground);">
                    <strong style="color: var(--vscode-errorForeground);">❌ Ошибка:</strong><br>
                    <div style="margin-top: 4px; font-size: 12px;">${this.escapeHtml(agent.errorMessage)}</div>
                    ${agent.diagnostics ? `
                        <div style="margin-top: 8px; font-size: 11px; opacity: 0.9;">
                            <strong>Диагностика:</strong><br>
                            LLM: ${agent.diagnostics.llmAvailable ? '✅ Доступен' : '❌ Недоступен'}<br>
                            ${agent.diagnostics.llmError ? `Ошибка LLM: ${this.escapeHtml(agent.diagnostics.llmError)}<br>` : ''}
                            Регистрация: ${agent.diagnostics.agentRegistered ? '✅' : '❌'}<br>
                            Инициализация: ${agent.diagnostics.agentInitialized ? '✅' : '❌'}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            ${this.getAgentThoughtsHtml(agent)}
            <div class="agent-stats">
                <span>В работе: ${agent.tasksInProgress}</span>
                <span>Выполнено: ${agent.tasksCompleted}</span>
                ${agent.lastActivity ? `<span>Активность: ${agent.lastActivity.toLocaleTimeString()}</span>` : ''}
            </div>
        </div>
        `;
    }
    getStatusText(status) {
        const statuses = {
            'working': 'Работает',
            'idle': 'Ожидает',
            'error': 'Ошибка',
            'disabled': 'Отключен'
        };
        return statuses[status] || status;
    }
    getTaskStatusText(status) {
        const statuses = {
            'pending': 'Ожидает',
            'in-progress': 'В работе',
            'completed': 'Завершена',
            'blocked': 'Заблокирована'
        };
        return statuses[status] || status;
    }
    getTaskPriorityText(priority) {
        const priorities = {
            'high': 'Высокий',
            'medium': 'Средний',
            'low': 'Низкий'
        };
        return priorities[priority] || priority;
    }
    getAgentThoughtsHtml(agent) {
        const thoughts = agent.currentThoughts;
        if (!thoughts) {
            return '';
        }
        const phaseText = this.getPhaseText(thoughts.phase);
        const progressPercent = thoughts.progress.totalSteps > 0
            ? Math.round((thoughts.progress.currentStep / thoughts.progress.totalSteps) * 100)
            : 0;
        return `
            <div class="agent-thoughts">
                <div class="thoughts-header">💭 Размышления агента</div>
                <div class="thoughts-phase">${phaseText}</div>
                ${thoughts.analysis.problem ? `
                    <div class="thoughts-analysis">
                        <strong>Проблема:</strong> ${this.escapeHtml(thoughts.analysis.problem)}
                    </div>
                ` : ''}
                ${thoughts.selectedOption ? `
                    <div class="thoughts-analysis">
                        <strong>Выбранное решение:</strong> ${this.escapeHtml(thoughts.selectedOption.title)}<br>
                        <small>${this.escapeHtml(thoughts.selectedOption.description)}</small>
                    </div>
                ` : ''}
                ${thoughts.reasoning ? `
                    <div class="thoughts-analysis">
                        <strong>Обоснование:</strong> ${this.escapeHtml(thoughts.reasoning.substring(0, 200))}${thoughts.reasoning.length > 200 ? '...' : ''}
                    </div>
                ` : ''}
                ${thoughts.progress.totalSteps > 0 ? `
                    <div class="thoughts-progress">
                        Прогресс: ${thoughts.progress.currentStep} / ${thoughts.progress.totalSteps} (${progressPercent}%)
                    </div>
                ` : ''}
            </div>
        `;
    }
    getPhaseText(phase) {
        const phases = {
            'analyzing': '🔍 Анализ задачи',
            'brainstorming': '💡 Генерация вариантов',
            'evaluating': '⚖️ Оценка решений',
            'implementing': '⚙️ Реализация'
        };
        return phases[phase] || phase;
    }
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    async sendTaskToChat(agentId, taskId) {
        const agent = this.agentsTreeProvider.getAgentStatus(agentId);
        if (!agent) {
            vscode.window.showWarningMessage('Агент не найден');
            return;
        }
        // Получаем задачу из списка задач агента
        const agentTasks = this.agentsTreeProvider.getAgentTasks(agentId);
        const task = agentTasks.find(t => t.id === taskId);
        if (!task) {
            vscode.window.showWarningMessage('Задача не найдена или больше не назначена агенту');
            return;
        }
        // Формируем сообщение для чата
        const taskTypeEmoji = {
            'feature': '✨',
            'bug': '🐛',
            'improvement': '🔧',
            'refactoring': '♻️',
            'documentation': '📝',
            'quality-check': '🔍'
        };
        const priorityText = {
            'high': 'Высокий',
            'medium': 'Средний',
            'low': 'Низкий'
        };
        const emoji = taskTypeEmoji[task.type] || '📋';
        const priority = priorityText[task.priority] || task.priority;
        let message = `${emoji} **Задача от агента "${agent.name}"**\n\n`;
        message += `**Описание:** ${task.description}\n\n`;
        message += `**Тип:** ${task.type}\n`;
        message += `**Приоритет:** ${priority}\n`;
        message += `**Статус:** ${task.status}\n`;
        if (task.progress) {
            message += `\n**Прогресс:**\n`;
            message += `- Изменено файлов: ${task.progress.filesChanged || 0}\n`;
            message += `- Время работы: ${Math.round((task.progress.timeElapsed || 0) / 1000)}с\n`;
        }
        if (task.executionResult && !task.executionResult.success && task.executionResult.error) {
            message += `\n**Ошибка:** ${task.executionResult.error}\n`;
        }
        message += `\nПожалуйста, помогите выполнить эту задачу.`;
        try {
            // Копируем сообщение в буфер обмена
            await vscode.env.clipboard.writeText(message);
            // Пытаемся открыть чат CursorAI (если команда доступна)
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open');
            }
            catch (chatError) {
                // Команда может быть недоступна в некоторых версиях CursorAI
                console.debug('Chat command not available, message copied to clipboard:', chatError.message);
            }
            // Показываем уведомление
            const action = await vscode.window.showInformationMessage('Задача подготовлена для передачи в чат. Сообщение скопировано в буфер обмена.', 'OK');
        }
        catch (error) {
            console.warn('Failed to send task to chat:', error);
            // Fallback: просто копируем в буфер обмена
            await vscode.env.clipboard.writeText(message);
            vscode.window.showWarningMessage('Не удалось открыть чат автоматически. Сообщение скопировано в буфер обмена. Вставьте его в чат CursorAI вручную.', 'OK');
        }
    }
}
exports.StatusPanel = StatusPanel;
//# sourceMappingURL=status-panel.js.map