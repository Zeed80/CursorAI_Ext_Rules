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
                case 'selectModel':
                    vscode.commands.executeCommand('cursor-autonomous.selectAgentModel', message.agentId);
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
        // Получаем список доступных моделей один раз для всех агентов
        const { ModelProvider } = await Promise.resolve().then(() => __importStar(require('../integration/model-provider')));
        const availableModels = await ModelProvider.getAvailableModels();
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
        ${(await Promise.all(agents.map(agent => this.getAgentCardHtml(agent, availableModels)))).join('')}
    </div>

    <button class="refresh-btn" onclick="refresh()">Обновить</button>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function agentClick(agentId) {
            vscode.postMessage({ command: 'agentClick', agentId: agentId });
        }

        function selectModel(agentId, modelValue) {
            if (modelValue) {
                const model = JSON.parse(modelValue);
                vscode.postMessage({ command: 'selectModel', agentId: agentId, model: model });
            }
        }

        function sendTaskToChat(agentId, taskId, event) {
            event.stopPropagation(); // Предотвращаем клик по карточке агента
            vscode.postMessage({ command: 'sendTaskToChat', agentId: agentId, taskId: taskId });
        }

        // Автообновление каждые 5 секунд
        setInterval(refresh, 5000);
    </script>
</body>
</html>`;
    }
    getModelOptions(agent, availableModels) {
        let options = '';
        const currentModelId = agent.selectedModel
            ? `${agent.selectedModel.vendor || ''}:${agent.selectedModel.id || agent.selectedModel.family || ''}`
            : '';
        for (const model of availableModels) {
            const modelId = `${model.vendor || ''}:${model.id || model.family || ''}`;
            const modelName = model.displayName || `${model.vendor || ''} ${model.family || model.id || ''}`.trim();
            const selected = modelId === currentModelId ? 'selected' : '';
            options += `<option value="${this.escapeHtml(JSON.stringify(model))}" ${selected}>${this.escapeHtml(modelName)}</option>`;
        }
        return options;
    }
    async getAgentCardHtml(agent, availableModels) {
        const statusClass = `status-${agent.status}`;
        const statusText = this.getStatusText(agent.status);
        return `
        <div class="agent-card" onclick="agentClick('${agent.id}')">
            <div class="agent-header">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-status ${statusClass}">${statusText}</div>
            </div>
            ${agent.currentTask ? `
                <div class="agent-task">
                    <strong>Текущая задача:</strong><br>
                    ${agent.currentTask.description}
                    ${agent.currentTask.progress ? `
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                            📝 Изменено файлов: ${agent.currentTask.progress.filesChanged || 0}<br>
                            ⏱️ Время: ${Math.round((agent.currentTask.progress.timeElapsed || 0) / 1000)}с
                            ${agent.currentTask.progress.isActive ? ' ✅ Активна' : ' ⏸️ Ожидает'}
                        </div>
                    ` : ''}
                    ${agent.currentTask.executionResult && !agent.currentTask.executionResult.success ? `
                        <div style="margin-top: 8px; padding: 8px; background: var(--vscode-inputValidation-errorBackground); border-radius: 4px; font-size: 12px;">
                            ❌ Ошибка: ${agent.currentTask.executionResult.error || 'Неизвестная ошибка'}
                        </div>
                    ` : ''}
                    ${agent.currentTask.executionResult && agent.currentTask.executionResult.success ? `
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                            ✅ Выполнено: ${Array.isArray(agent.currentTask.executionResult.filesChanged) ? agent.currentTask.executionResult.filesChanged.length : 0} файлов изменено
                        </div>
                    ` : ''}
                    <button 
                        class="send-to-chat-btn" 
                        onclick="sendTaskToChat('${agent.id}', '${agent.currentTask.id}', event)"
                        title="Передать задачу в чат CursorAI для ручной обработки"
                    >
                        💬 Передать в чат
                    </button>
                </div>
            ` : ''}
            <div class="agent-model-selector" style="margin-top: 12px; padding: 8px; background: var(--vscode-input-background); border-radius: 4px; border: 1px solid var(--vscode-input-border);">
                <label style="display: block; margin-bottom: 4px; font-size: 12px; opacity: 0.9;">Модель:</label>
                <select 
                    id="model-select-${agent.id}" 
                    style="width: 100%; padding: 4px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 2px; font-size: 12px;"
                    onchange="selectModel('${agent.id}', this.value)"
                >
                    <option value="">Автоматический выбор</option>
                    ${this.getModelOptions(agent, availableModels)}
                </select>
            </div>
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
        if (!agent || !agent.currentTask || agent.currentTask.id !== taskId) {
            vscode.window.showWarningMessage('Задача не найдена или больше не активна');
            return;
        }
        const task = agent.currentTask;
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
            // Открываем чат CursorAI
            await vscode.commands.executeCommand('workbench.action.chat.open');
            // Небольшая задержка для открытия чата
            await new Promise(resolve => setTimeout(resolve, 500));
            // Копируем сообщение в буфер обмена
            await vscode.env.clipboard.writeText(message);
            // Показываем уведомление
            const action = await vscode.window.showInformationMessage('Задача подготовлена для передачи в чат. Сообщение скопировано в буфер обмена.', 'Открыть чат', 'OK');
            if (action === 'Открыть чат') {
                vscode.window.showInformationMessage('Вставьте сообщение из буфера обмена в чат CursorAI (Ctrl+V или Cmd+V)', 'OK');
            }
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