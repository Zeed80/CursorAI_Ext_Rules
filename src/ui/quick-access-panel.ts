import * as vscode from 'vscode';

/**
 * Панель быстрого доступа к инструментам
 */
export class QuickAccessPanel {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Показать панель быстрого доступа
     */
    show(): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'cursorAutonomousQuickAccess',
            'CursorAI - Быстрый доступ',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getWebviewContent();

        // Обработка сообщений от webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'executeCommand':
                        vscode.commands.executeCommand(message.commandId);
                        break;
                }
            },
            null,
            this.context.subscriptions
        );

        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
            },
            null,
            this.context.subscriptions
        );
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CursorAI - Быстрый доступ</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .button {
            display: block;
            width: 100%;
            padding: 12px;
            margin: 8px 0;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button:active {
            opacity: 0.8;
        }
        .button-group {
            margin: 16px 0;
        }
        .button-group h3 {
            margin: 0 0 8px 0;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--vscode-descriptionForeground);
        }
        .status {
            padding: 8px;
            margin: 8px 0;
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            font-size: 12px;
        }
        .shortcut {
            float: right;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
        }
    </style>
</head>
<body>
    <h2>🚀 CursorAI Autonomous - Быстрый доступ</h2>
    
    <div class="status" id="status">
        Загрузка статуса...
    </div>

    <div class="button-group">
        <h3>Основные действия</h3>
        <button class="button" onclick="executeCommand('cursor-autonomous.startOrchestrator')">
            ▶ Запустить оркестратор
            <span class="shortcut">Ctrl+Shift+A</span>
        </button>
        <button class="button" onclick="executeCommand('cursor-autonomous.stopOrchestrator')">
            ⏹ Остановить оркестратор
        </button>
        <button class="button" onclick="executeCommand('cursor-autonomous.toggleVirtualUser')">
            👤 Переключить виртуального пользователя
            <span class="shortcut">Ctrl+Shift+V</span>
        </button>
    </div>

    <div class="button-group">
        <h3>Анализ и улучшение</h3>
        <button class="button" onclick="executeCommand('cursor-autonomous.analyzeProject')">
            🔍 Анализ проекта
            <span class="shortcut">Ctrl+Shift+P</span>
        </button>
        <button class="button" onclick="executeCommand('cursor-autonomous.showStatus')">
            ℹ Статус системы
        </button>
    </div>

    <div class="button-group">
        <h3>Настройки</h3>
        <button class="button" onclick="executeCommand('workbench.action.openSettings', '@ext:cursor-autonomous.cursor-ai-autonomous-extension')">
            ⚙ Настройки расширения
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function executeCommand(commandId, ...args) {
            vscode.postMessage({
                command: 'executeCommand',
                commandId: commandId,
                args: args
            });
        }

        // Обновление статуса
        function updateStatus() {
            executeCommand('cursor-autonomous.showStatus');
        }

        // Обновление статуса каждые 5 секунд
        setInterval(updateStatus, 5000);
        updateStatus();
    </script>
</body>
</html>`;
    }

    dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}
