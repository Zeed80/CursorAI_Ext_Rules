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
exports.UIIntegration = void 0;
const vscode = __importStar(require("vscode"));
const settings_manager_1 = require("./settings-manager");
class UIIntegration {
    constructor(context) {
        this.context = context;
        this.settingsManager = new settings_manager_1.SettingsManager();
    }
    /**
     * Регистрация оркестратора в UI CursorAI
     *
     * Примечание: Точная интеграция зависит от доступного CursorAI API.
     * Это базовая реализация, которая может потребовать адаптации
     * в зависимости от фактического API CursorAI.
     */
    registerOrchestrator() {
        // TODO: Интеграция с CursorAI API для регистрации оркестратора
        // в выпадающем списке агентов
        // Возможные подходы:
        // 1. Использование CursorAI Extension API (если доступен)
        // 2. Модификация конфигурации CursorAI через файлы
        // 3. Использование командной палитры для выбора оркестратора
        console.log('Registering orchestrator in CursorAI UI...');
        // Пример: добавление команды для выбора оркестратора
        this.registerOrchestratorCommand();
    }
    registerOrchestratorCommand() {
        // Регистрация команды для выбора оркестратора как агента
        // Это временное решение до получения доступа к CursorAI API
        const command = vscode.commands.registerCommand('cursor-autonomous.selectOrchestrator', async () => {
            const action = await vscode.window.showInformationMessage('Orchestrator selected as agent. Use CursorAI chat to interact with orchestrator.', 'OK');
        });
        this.context.subscriptions.push(command);
    }
    /**
     * Обновление статуса в UI
     */
    updateStatus(status) {
        // Обновление статуса работы оркестратора в UI
        console.log(`Orchestrator status: ${status}`);
    }
    /**
     * Отображение уведомлений о действиях виртуального пользователя
     */
    showVirtualUserNotification(message, type = 'info') {
        switch (type) {
            case 'info':
                vscode.window.showInformationMessage(`[Virtual User] ${message}`);
                break;
            case 'warning':
                vscode.window.showWarningMessage(`[Virtual User] ${message}`);
                break;
            case 'error':
                vscode.window.showErrorMessage(`[Virtual User] ${message}`);
                break;
        }
    }
}
exports.UIIntegration = UIIntegration;
//# sourceMappingURL=ui-integration.js.map