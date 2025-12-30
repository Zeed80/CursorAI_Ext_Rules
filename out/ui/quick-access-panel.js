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
exports.QuickAccessPanel = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Панель быстрого доступа к инструментам
 */
class QuickAccessPanel {
    constructor(context) {
        this.context = context;
    }
    /**
     * Показать панель быстрого доступа
     */
    show() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }
        this.panel = vscode.window.createWebviewPanel('cursorAutonomousQuickAccess', 'CursorAI - Быстрый доступ', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        this.panel.webview.html = this.getWebviewContent();
        // Обработка сообщений от webview
        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'executeCommand':
                    vscode.commands.executeCommand(message.commandId);
                    break;
            }
        }, null, this.context.subscriptions);
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.context.subscriptions);
    }
    getWebviewContent() {
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
        <button class="button" id="btnStartOrchestrator">
            ▶ Запустить оркестратор
            <span class="shortcut">Ctrl+Shift+A</span>
        </button>
        <button class="button" id="btnStopOrchestrator">
            ⏹ Остановить оркестратор
        </button>
        <button class="button" id="btnToggleVirtualUser">
            👤 Переключить виртуального пользователя
            <span class="shortcut">Ctrl+Shift+V</span>
        </button>
    </div>

    <div class="button-group">
        <h3>Анализ и улучшение</h3>
        <button class="button" id="btnAnalyzeProject">
            🔍 Анализ проекта
            <span class="shortcut">Ctrl+Shift+P</span>
        </button>
        <button class="button" id="btnShowStatus">
            ℹ Статус системы
        </button>
    </div>

    <div class="button-group">
        <h3>Настройки</h3>
        <button class="button" id="btnOpenSettings">
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
        const statusInterval = setInterval(updateStatus, 5000);

        // Добавляем обработчики событий после загрузки DOM
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('btnStartOrchestrator')?.addEventListener('click', function() {
                executeCommand('cursor-autonomous.startOrchestrator');
            });

            document.getElementById('btnStopOrchestrator')?.addEventListener('click', function() {
                executeCommand('cursor-autonomous.stopOrchestrator');
            });

            document.getElementById('btnToggleVirtualUser')?.addEventListener('click', function() {
                executeCommand('cursor-autonomous.toggleVirtualUser');
            });

            document.getElementById('btnAnalyzeProject')?.addEventListener('click', function() {
                executeCommand('cursor-autonomous.analyzeProject');
            });

            document.getElementById('btnShowStatus')?.addEventListener('click', function() {
                executeCommand('cursor-autonomous.showStatus');
            });

            document.getElementById('btnOpenSettings')?.addEventListener('click', function() {
                executeCommand('cursor-autonomous.openSettings');
            });

            // Начальное обновление статуса
            updateStatus();
        });
    </script>
</body>
</html>`;
    }
    dispose() {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}
exports.QuickAccessPanel = QuickAccessPanel;
//# sourceMappingURL=quick-access-panel.js.map