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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const self_learning_orchestrator_1 = require("./orchestrator/self-learning-orchestrator");
const settings_manager_1 = require("./integration/settings-manager");
const ui_integration_1 = require("./integration/ui-integration");
const virtual_user_1 = require("./agents/virtual-user");
const self_improver_1 = require("./agents/self-improver");
const rules_integration_1 = require("./storage/rules-integration");
const cursor_api_1 = require("./integration/cursor-api");
const agents_status_tree_1 = require("./ui/agents-status-tree");
const status_panel_1 = require("./ui/status-panel");
const analytics_panel_1 = require("./ui/analytics-panel");
let orchestrator;
let virtualUser;
let selfImprover;
let statusBarItem;
let agentsStatusTreeProvider;
let statusUpdateInterval;
function activate(context) {
    console.log('CursorAI Autonomous Extension is now active!');
    // Инициализация компонентов
    const settingsManager = new settings_manager_1.SettingsManager();
    const uiIntegration = new ui_integration_1.UIIntegration(context);
    // Инициализация CursorAI API
    const apiKey = settingsManager.getSetting('apiKey', undefined);
    cursor_api_1.CursorAPI.initialize(apiKey);
    // Проверка доступности API
    cursor_api_1.CursorAPI.checkApiAvailability().then(available => {
        if (available) {
            console.log('CursorAI API is available');
        }
        else {
            console.log('CursorAI API not available, using fallback methods');
        }
    });
    // Инициализация TreeView для статуса агентов ПЕРЕД созданием оркестратора
    agentsStatusTreeProvider = new agents_status_tree_1.AgentsStatusTreeProvider();
    // Инициализация самообучаемого оркестратора ПЕРЕД регистрацией команд
    orchestrator = new self_learning_orchestrator_1.SelfLearningOrchestrator(context, settingsManager, agentsStatusTreeProvider);
    const agentsTreeView = vscode.window.createTreeView('cursorAutonomousAgents', {
        treeDataProvider: agentsStatusTreeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(agentsTreeView);
    // Регистрация ВСЕХ команд ДО создания кнопок в статус-баре
    // Это критически важно для работы расширения
    const quickMenu = vscode.commands.registerCommand('cursor-autonomous.quickMenu', async () => {
        const items = [
            {
                label: '$(play) Запустить оркестратор',
                description: 'Запустить систему оркестрации агентов',
                detail: 'Начать координацию работы агентов'
            },
            {
                label: '$(stop) Остановить оркестратор',
                description: 'Остановить работу оркестратора',
                detail: 'Прекратить координацию агентов'
            },
            {
                label: '$(person) Включить виртуального пользователя',
                description: 'Активировать автономный режим',
                detail: 'Виртуальный пользователь будет принимать решения автоматически'
            },
            {
                label: '$(person-off) Выключить виртуального пользователя',
                description: 'Деактивировать автономный режим',
                detail: 'Вернуться к ручному управлению'
            },
            {
                label: '$(search) Анализ проекта',
                description: 'Проанализировать структуру и технологии проекта',
                detail: 'Определить тип проекта и сгенерировать правила'
            },
            {
                label: '$(add) Создать задачу',
                description: 'Создать новую задачу для агентов',
                detail: 'Создать задачу и отправить её в чат CursorAI'
            },
            {
                label: '$(info) Статус системы',
                description: 'Показать текущий статус всех компонентов',
                detail: 'Оркестратор, виртуальный пользователь, самосовершенствование'
            },
            {
                label: '$(dashboard) Панель статуса',
                description: 'Открыть детальную панель статуса агентов',
                detail: 'Просмотр всех агентов и их задач'
            },
            {
                label: '$(graph) Аналитика задач',
                description: 'Просмотр аналитики и метрик выполнения задач',
                detail: 'Статистика по типам задач, агентам и рекомендации'
            },
            {
                label: '$(settings) Настройки',
                description: 'Открыть настройки расширения',
                detail: 'Настроить интервалы, пороги и режимы работы'
            }
        ];
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Выберите действие (Ctrl+Shift+A для быстрого доступа)',
            ignoreFocusOut: true
        });
        if (selected) {
            switch (selected.label) {
                case '$(play) Запустить оркестратор':
                    await vscode.commands.executeCommand('cursor-autonomous.startOrchestrator');
                    break;
                case '$(stop) Остановить оркестратор':
                    await vscode.commands.executeCommand('cursor-autonomous.stopOrchestrator');
                    break;
                case '$(person) Включить виртуального пользователя':
                    await vscode.commands.executeCommand('cursor-autonomous.enableVirtualUser');
                    break;
                case '$(person-off) Выключить виртуального пользователя':
                    await vscode.commands.executeCommand('cursor-autonomous.disableVirtualUser');
                    break;
                case '$(search) Анализ проекта':
                    await vscode.commands.executeCommand('cursor-autonomous.analyzeProject');
                    break;
                case '$(add) Создать задачу':
                    await vscode.commands.executeCommand('cursor-autonomous.createTask');
                    break;
                case '$(info) Статус системы':
                    await vscode.commands.executeCommand('cursor-autonomous.showStatus');
                    break;
                case '$(dashboard) Панель статуса':
                    await vscode.commands.executeCommand('cursor-autonomous.showStatusPanel');
                    break;
                case '$(graph) Аналитика задач':
                    await vscode.commands.executeCommand('cursor-autonomous.showAnalytics');
                    break;
                case '$(settings) Настройки':
                    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:cursor-autonomous.cursor-ai-autonomous-extension');
                    break;
            }
        }
    });
    const toggleVirtualUser = vscode.commands.registerCommand('cursor-autonomous.toggleVirtualUser', async () => {
        try {
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            const isEnabled = config.get('enableVirtualUser', false);
            if (isEnabled) {
                await vscode.commands.executeCommand('cursor-autonomous.disableVirtualUser');
            }
            else {
                await vscode.commands.executeCommand('cursor-autonomous.enableVirtualUser');
            }
        }
        catch (error) {
            console.error('Error in toggleVirtualUser:', error);
            vscode.window.showErrorMessage(`Ошибка переключения виртуального пользователя: ${error}`);
        }
    });
    // Явная проверка регистрации команды
    console.log('Command toggleVirtualUser registered:', toggleVirtualUser ? 'YES' : 'NO');
    const startOrchestrator = vscode.commands.registerCommand('cursor-autonomous.startOrchestrator', async () => {
        if (orchestrator) {
            await orchestrator.start();
            updateStatusBar('active');
            vscode.window.showInformationMessage('Orchestrator started');
        }
    });
    const stopOrchestrator = vscode.commands.registerCommand('cursor-autonomous.stopOrchestrator', async () => {
        if (orchestrator) {
            await orchestrator.stop();
            updateStatusBar('stopped');
            vscode.window.showInformationMessage('Orchestrator stopped');
        }
    });
    const enableVirtualUser = vscode.commands.registerCommand('cursor-autonomous.enableVirtualUser', async () => {
        await settingsManager.updateSetting('enableVirtualUser', true);
        if (!virtualUser && orchestrator) {
            virtualUser = new virtual_user_1.VirtualUser(context, orchestrator, settingsManager);
            context.subscriptions.push(virtualUser);
        }
        if (virtualUser) {
            if (!virtualUser.isRunningState()) {
                await virtualUser.start();
            }
        }
        else if (orchestrator) {
            virtualUser = new virtual_user_1.VirtualUser(context, orchestrator, settingsManager);
            context.subscriptions.push(virtualUser);
            await virtualUser.start();
        }
        updateStatusBar('virtual-user');
        vscode.window.showInformationMessage('Virtual User mode enabled - Автономный режим активен');
    });
    const disableVirtualUser = vscode.commands.registerCommand('cursor-autonomous.disableVirtualUser', async () => {
        await settingsManager.updateSetting('enableVirtualUser', false);
        if (virtualUser) {
            await virtualUser.stop();
            virtualUser.dispose();
            virtualUser = undefined;
        }
        updateStatusBar('active');
        vscode.window.showInformationMessage('Virtual User mode disabled');
    });
    const showStatus = vscode.commands.registerCommand('cursor-autonomous.showStatus', () => {
        const status = {
            orchestrator: orchestrator?.isRunningState() ? 'Running' : 'Stopped',
            virtualUser: virtualUser ? 'Enabled' : 'Disabled',
            selfImprover: selfImprover ? 'Enabled' : 'Disabled'
        };
        vscode.window.showInformationMessage(`Orchestrator: ${status.orchestrator}\n` +
            `Virtual User: ${status.virtualUser}\n` +
            `Self-Improvement: ${status.selfImprover}`);
    });
    const analyzeProject = vscode.commands.registerCommand('cursor-autonomous.analyzeProject', async () => {
        if (orchestrator) {
            vscode.window.showInformationMessage('Analyzing project...');
            await orchestrator.analyzeProject();
            vscode.window.showInformationMessage('Project analysis completed');
        }
    });
    // Команда для запуска проверки качества проекта
    const runQualityCheck = vscode.commands.registerCommand('cursor-autonomous.runQualityCheck', async () => {
        if (!orchestrator) {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
            return;
        }
        // Выбор области проверки
        const scope = await vscode.window.showQuickPick([
            { label: 'full', description: 'Полная проверка качества' },
            { label: 'code', description: 'Проверка качества кода' },
            { label: 'architecture', description: 'Проверка архитектуры' },
            { label: 'performance', description: 'Проверка производительности' },
            { label: 'security', description: 'Проверка безопасности' }
        ], {
            placeHolder: 'Выберите область проверки качества'
        });
        if (!scope)
            return;
        try {
            if (!orchestrator) {
                vscode.window.showErrorMessage('Оркестратор не инициализирован');
                return;
            }
            // Создаем задачу проверки качества
            const task = await orchestrator.createTask({
                type: 'quality-check',
                description: `Проверка качества проекта (${scope.description})`,
                priority: 'high'
            });
            vscode.window.showInformationMessage(`Задача проверки качества создана: ${task.id}. Запускается проверка...`);
            // Выполняем задачу проверки качества
            await orchestrator.executeTask(task.id);
            // Показываем результаты после завершения
            setTimeout(async () => {
                if (!orchestrator)
                    return;
                const updatedTask = orchestrator.getTasks().find(t => t.id === task.id);
                if (updatedTask && updatedTask.executionResult?.success) {
                    const report = updatedTask.qualityCheckResults || [];
                    const message = `Проверка качества завершена!\n\n` +
                        `Найдено проблем: ${report.length}\n` +
                        `Результаты сохранены в задаче ${task.id}`;
                    vscode.window.showInformationMessage(message, 'Показать отчет').then(action => {
                        if (action === 'Показать отчет') {
                            // Открываем панель статуса с результатами
                            vscode.commands.executeCommand('cursor-autonomous.showStatusPanel');
                        }
                    });
                }
            }, 2000);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Ошибка запуска проверки качества: ${error.message}`);
        }
    });
    // Команда для создания задачи
    const createTask = vscode.commands.registerCommand('cursor-autonomous.createTask', async () => {
        if (!orchestrator) {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
            return;
        }
        // Запрос типа задачи
        const taskType = await vscode.window.showQuickPick([
            { label: 'feature', description: 'Новая функция' },
            { label: 'bug', description: 'Исправление бага' },
            { label: 'improvement', description: 'Улучшение' },
            { label: 'refactoring', description: 'Рефакторинг' },
            { label: 'documentation', description: 'Документация' },
            { label: 'quality-check', description: 'Проверка качества проекта' }
        ], {
            placeHolder: 'Выберите тип задачи'
        });
        if (!taskType)
            return;
        // Запрос описания задачи
        const description = await vscode.window.showInputBox({
            prompt: 'Опишите задачу',
            placeHolder: 'Например: Добавить функцию поиска по проекту'
        });
        if (!description)
            return;
        // Запрос приоритета
        const priority = await vscode.window.showQuickPick([
            { label: 'high', description: 'Высокий' },
            { label: 'medium', description: 'Средний' },
            { label: 'low', description: 'Низкий' }
        ], {
            placeHolder: 'Выберите приоритет'
        });
        if (!priority)
            return;
        try {
            // Создание задачи
            const task = await orchestrator.createTask({
                type: taskType.label,
                description: description,
                priority: priority.label
            });
            vscode.window.showInformationMessage(`Задача создана: ${task.id}. Запускается мозговой штурм...`);
            // Выполнение задачи с мозговым штурмом и отображением размышлений
            await orchestrator.executeTaskWithBrainstorming(task.id, (agentId, thoughts) => {
                // Обновляем размышления в UI
                if (agentsStatusTreeProvider) {
                    agentsStatusTreeProvider.updateAgentThoughts(agentId, thoughts);
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Ошибка создания задачи: ${error.message}`);
        }
    });
    // Функция отправки задачи в чат CursorAI
    async function sendTaskToChat(task, orchestrator) {
        try {
            // Формируем сообщение для чата
            const agentName = task.assignedAgent ?
                orchestrator.getAgentsStatus().find((a) => a.id === task.assignedAgent)?.name || task.assignedAgent :
                'Оркестратор';
            const message = `🎯 **Задача создана**

**Тип:** ${task.type}
**Приоритет:** ${task.priority}
**Описание:** ${task.description}
**Назначен:** ${agentName}
**ID:** ${task.id}

Пожалуйста, выполните эту задачу.`;
            // Пытаемся открыть чат и отправить сообщение
            try {
                // Пытаемся использовать команду CursorAI для открытия чата
                await vscode.commands.executeCommand('workbench.action.chat.open');
                // Небольшая задержка для открытия чата
                await new Promise(resolve => setTimeout(resolve, 500));
                // Альтернатива: показываем сообщение пользователю
                const action = await vscode.window.showInformationMessage(`Задача создана и назначена агенту: ${agentName}`, 'Скопировать в буфер обмена', 'Открыть панель задач');
                if (action === 'Скопировать в буфер обмена') {
                    await vscode.env.clipboard.writeText(message);
                    vscode.window.showInformationMessage('Сообщение скопировано в буфер обмена. Вставьте его в чат CursorAI (Ctrl+L).');
                }
                else if (action === 'Открыть панель задач') {
                    // Показываем панель статуса с задачами
                    await vscode.commands.executeCommand('cursor-autonomous.showStatusPanel');
                }
            }
            catch (chatError) {
                // Если не удалось открыть чат, показываем сообщение
                console.warn('Could not open chat:', chatError);
                await vscode.env.clipboard.writeText(message);
                vscode.window.showInformationMessage('Задача создана. Сообщение скопировано в буфер обмена. Вставьте его в чат CursorAI (Ctrl+L).', 'OK');
            }
        }
        catch (error) {
            console.error('Error sending task to chat:', error);
            vscode.window.showWarningMessage(`Задача создана, но не удалось отправить в чат: ${error.message}`);
        }
    }
    const showStatusPanel = vscode.commands.registerCommand('cursor-autonomous.showStatusPanel', () => {
        if (agentsStatusTreeProvider) {
            status_panel_1.StatusPanel.createOrShow(context.extensionUri, agentsStatusTreeProvider);
        }
    });
    const showAnalytics = vscode.commands.registerCommand('cursor-autonomous.showAnalytics', () => {
        if (orchestrator) {
            analytics_panel_1.AnalyticsPanel.createOrShow(context.extensionUri, orchestrator);
        }
        else {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
        }
    });
    const refreshAgentsStatus = vscode.commands.registerCommand('cursor-autonomous.refreshAgentsStatus', () => {
        updateAgentsStatus();
        if (agentsStatusTreeProvider) {
            agentsStatusTreeProvider.refresh();
        }
    });
    // Команда для выбора модели агента
    const selectAgentModel = vscode.commands.registerCommand('cursor-autonomous.selectAgentModel', async (item) => {
        if (!orchestrator || !agentsStatusTreeProvider) {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
            return;
        }
        let agentId;
        // Если передан TreeItem, извлекаем agentId из него
        if (item instanceof vscode.TreeItem) {
            // Проверяем, есть ли у TreeItem свойство agent (AgentTreeItem)
            const treeItem = item;
            if (treeItem.agent && treeItem.agent.id) {
                agentId = treeItem.agent.id;
            }
            else {
                // Пытаемся извлечь из label или description
                agentId = item.label;
            }
        }
        else if (typeof item === 'string') {
            agentId = item;
        }
        // Если agentId не передан, запрашиваем у пользователя
        if (!agentId) {
            const agents = agentsStatusTreeProvider.getAllAgents();
            const agentItems = agents.map(agent => ({
                label: agent.name,
                description: agent.id,
                agentId: agent.id
            }));
            const selected = await vscode.window.showQuickPick(agentItems, {
                placeHolder: 'Выберите агента для настройки модели'
            });
            if (!selected)
                return;
            agentId = selected.agentId;
        }
        try {
            // Получаем список доступных моделей
            const { ModelProvider } = await Promise.resolve().then(() => __importStar(require('./integration/model-provider')));
            const availableModels = await ModelProvider.getAvailableModels();
            if (availableModels.length === 0) {
                vscode.window.showWarningMessage('Нет доступных языковых моделей CursorAI. Убедитесь, что CursorAI настроен и модели доступны.');
                return;
            }
            // Получаем текущую модель агента
            const { SettingsManager } = await Promise.resolve().then(() => __importStar(require('./integration/settings-manager')));
            const settingsManager = new SettingsManager();
            const currentModel = settingsManager.getAgentModel(agentId);
            // Формируем список для выбора
            const modelItems = [
                {
                    label: '$(circle-slash) Автоматический выбор',
                    description: 'CursorAI автоматически выберет модель',
                    model: undefined
                },
                ...availableModels.map(model => ({
                    label: `$(robot) ${model.displayName || `${model.vendor || ''} ${model.family || model.id || ''}`.trim()}`,
                    description: model.id || model.family || '',
                    detail: model.vendor ? `Провайдер: ${model.vendor}` : undefined,
                    model: model
                }))
            ];
            // Выделяем текущую модель
            const currentIndex = currentModel
                ? modelItems.findIndex(item => item.model &&
                    item.model.id === currentModel.id &&
                    item.model.vendor === currentModel.vendor)
                : 0;
            const selected = await vscode.window.showQuickPick(modelItems, {
                placeHolder: `Выберите модель для агента ${agentId}`,
                canPickMany: false
            });
            if (selected === undefined)
                return;
            // Сохраняем выбранную модель
            await settingsManager.setAgentModel(agentId, selected.model);
            // Получаем информацию об агенте для создания фонового агента
            const agent = orchestrator.getAgentManager().getLocalAgent(agentId);
            if (agent) {
                agent.setSelectedModel(selected.model);
                // Создаем или обновляем фонового агента CursorAI с указанной моделью
                try {
                    const { CursorAPI } = await Promise.resolve().then(() => __importStar(require('./integration/cursor-api')));
                    const agentName = agent.getName();
                    const agentDescription = agent.getDescription();
                    const agentInstructions = `Ты - ${agentName}. ${agentDescription}\n\n` +
                        `Твоя задача - помогать пользователю в разработке, предоставляя детальные и точные ответы.`;
                    const modelId = selected.model ? selected.model.id : undefined;
                    const backgroundAgentId = await CursorAPI.createOrUpdateBackgroundAgent(agentId, agentName, agentDescription, agentInstructions, modelId);
                    if (backgroundAgentId) {
                        console.log(`Background agent ${backgroundAgentId} created/updated for agent ${agentId}`);
                    }
                    else {
                        console.warn(`Failed to create/update background agent for agent ${agentId}`);
                    }
                }
                catch (error) {
                    console.error(`Error creating/updating background agent for agent ${agentId}:`, error);
                    // Продолжаем выполнение, даже если не удалось создать фонового агента
                }
            }
            // Обновляем статус агента
            agentsStatusTreeProvider.updateAgentStatus(agentId, {
                selectedModel: selected.model
            });
            const modelName = selected.model
                ? selected.model.displayName || `${selected.model.vendor || ''} ${selected.model.family || selected.model.id || ''}`.trim()
                : 'Автоматический выбор';
            vscode.window.showInformationMessage(`Модель для агента ${agentId} установлена: ${modelName}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Ошибка при выборе модели: ${error.message}`);
        }
    });
    context.subscriptions.push(selectAgentModel);
    const showAgentDetails = vscode.commands.registerCommand('cursor-autonomous.showAgentDetails', async (item) => {
        let agentId;
        // Если передан TreeItem, извлекаем agentId из него
        if (item instanceof vscode.TreeItem) {
            const treeItem = item;
            if (treeItem.agent && treeItem.agent.id) {
                agentId = treeItem.agent.id;
            }
            else {
                agentId = item.label;
            }
        }
        else if (typeof item === 'string') {
            agentId = item;
        }
        if (!agentId) {
            const agents = agentsStatusTreeProvider?.getAllAgents() || [];
            const items = agents.map(a => ({
                label: a.name,
                description: a.status === 'working' ? `Работает: ${a.currentTask?.description.substring(0, 50)}...` : 'Ожидает',
                agentId: a.id
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Выберите агента для просмотра деталей'
            });
            if (selected) {
                agentId = selected.agentId;
            }
            else {
                return;
            }
        }
        const agent = agentsStatusTreeProvider?.getAgentStatus(agentId);
        if (agent) {
            const tasks = orchestrator?.getTasks().filter(t => t.assignedAgent === agentId) || [];
            let message = `**${agent.name}**\n\n` +
                `Статус: ${getStatusText(agent.status)}\n` +
                `Задач в работе: ${agent.tasksInProgress}\n` +
                `Задач выполнено: ${agent.tasksCompleted}\n`;
            if (agent.selectedModel) {
                message += `\n**Выбранная модель:** ${agent.selectedModel.displayName || agent.selectedModel.id}\n`;
            }
            else {
                message += `\n**Выбранная модель:** По умолчанию (автоматический выбор)\n`;
            }
            message += (agent.currentTask ? `\n**Текущая задача:**\n${agent.currentTask.description}` : '') +
                (tasks.length > 0 ? `\n\n**Все задачи агента:**\n${tasks.map(t => `- ${t.description} (${t.status})`).join('\n')}` : '');
            const action = await vscode.window.showInformationMessage(message, { modal: true }, 'Выбрать модель');
            if (action === 'Выбрать модель') {
                vscode.commands.executeCommand('cursor-autonomous.selectAgentModel', agentId);
            }
        }
    });
    // Создание статус-бара с быстрым меню
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'cursor-autonomous.quickMenu';
    statusBarItem.text = '$(robot) CursorAI';
    statusBarItem.tooltip = 'CursorAI Autonomous - Быстрое меню (Ctrl+Shift+A)';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Создание дополнительных кнопок в статус-баре
    // ВАЖНО: команда toggleVirtualUser уже зарегистрирована выше (строка 132)
    const virtualUserButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    virtualUserButton.command = 'cursor-autonomous.toggleVirtualUser';
    virtualUserButton.text = '$(person) Virtual User';
    virtualUserButton.tooltip = 'Переключить виртуального пользователя (Ctrl+Shift+V)';
    // Показываем кнопку - команда уже зарегистрирована выше
    virtualUserButton.show();
    // Проверка доступности команды (асинхронно, для отладки)
    Promise.resolve(vscode.commands.getCommands()).then(commands => {
        const commandExists = commands.includes('cursor-autonomous.toggleVirtualUser');
        console.log('toggleVirtualUser command available:', commandExists);
        if (!commandExists) {
            console.error('ERROR: toggleVirtualUser command not found!');
            console.log('Available cursor-autonomous commands:', commands.filter(c => c.startsWith('cursor-autonomous')).join(', '));
        }
    });
    context.subscriptions.push(virtualUserButton);
    // Регистрация всех команд
    context.subscriptions.push(startOrchestrator, stopOrchestrator, toggleVirtualUser, enableVirtualUser, disableVirtualUser, showStatus, analyzeProject, createTask, runQualityCheck, showStatusPanel, showAnalytics, refreshAgentsStatus, showAgentDetails);
    const analyzeButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    analyzeButton.command = 'cursor-autonomous.analyzeProject';
    analyzeButton.text = '$(search) Analyze';
    analyzeButton.tooltip = 'Анализ проекта (Ctrl+Shift+P)';
    analyzeButton.show();
    context.subscriptions.push(analyzeButton);
    const statusPanelButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 97);
    statusPanelButton.command = 'cursor-autonomous.showStatusPanel';
    statusPanelButton.text = '$(dashboard) Status';
    statusPanelButton.tooltip = 'Панель статуса агентов (Ctrl+Shift+S)';
    statusPanelButton.show();
    context.subscriptions.push(statusPanelButton);
    // Автообновление статуса агентов
    startStatusUpdates();
    // Инициализация виртуального пользователя (если включен)
    if (settingsManager.getSetting('enableVirtualUser', false)) {
        virtualUser = new virtual_user_1.VirtualUser(context, orchestrator, settingsManager);
        context.subscriptions.push(virtualUser);
        // Автоматический запуск виртуального пользователя
        virtualUser.start().catch(err => {
            console.error('Error starting virtual user:', err);
        });
    }
    // Инициализация системы самосовершенствования
    if (settingsManager.getSetting('autoImprove', true)) {
        selfImprover = new self_improver_1.SelfImprover(context, orchestrator, settingsManager);
        context.subscriptions.push(selfImprover);
        // Автоматический запуск самосовершенствования
        selfImprover.start().catch(err => {
            console.error('Error starting self-improver:', err);
        });
    }
    // Регистрация всех команд в subscriptions
    context.subscriptions.push(quickMenu, toggleVirtualUser, startOrchestrator, stopOrchestrator, enableVirtualUser, disableVirtualUser, showStatus, analyzeProject, createTask, showStatusPanel, showAnalytics, refreshAgentsStatus, showAgentDetails);
    // Логирование для отладки
    console.log('All commands registered. toggleVirtualUser:', toggleVirtualUser ? 'registered' : 'NOT registered');
    // Регистрация оркестратора в UI CursorAI
    uiIntegration.registerOrchestrator();
    // Интеграция существующих правил
    const rulesIntegration = new rules_integration_1.RulesIntegration();
    if (rulesIntegration.rulesExist()) {
        const extensionPath = context.extensionPath;
        rulesIntegration.copyRulesToExtension(extensionPath).catch(err => {
            console.error('Error copying rules:', err);
        });
    }
    else {
        // Автоматическая адаптация правил при первом запуске
        rulesIntegration.adaptRulesToProject().catch(err => {
            console.error('Error adapting rules:', err);
        });
    }
    // Регистрация для очистки при деактивации
    context.subscriptions.push({
        dispose: () => {
            rulesIntegration.dispose();
        }
    });
    // Автоматический запуск оркестратора при активации
    // Запускаем с небольшой задержкой, чтобы все компоненты успели инициализироваться
    setTimeout(async () => {
        try {
            if (orchestrator) {
                await orchestrator.start();
                updateStatusBar('active');
                console.log('Orchestrator auto-started on activation');
                // Обновляем статусы агентов после запуска
                updateAgentsStatus();
            }
        }
        catch (error) {
            console.error('Error auto-starting orchestrator:', error);
        }
    }, 1000);
    // Обновление статус-бара при изменении настроек
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('cursor-autonomous')) {
            updateStatusBar();
        }
    }));
    // Периодическое обновление статус-бара
    const statusBarUpdateInterval = setInterval(() => {
        updateStatusBar();
        updateAgentsStatus();
    }, 5000); // Обновление каждые 5 секунд
    context.subscriptions.push({
        dispose: () => clearInterval(statusBarUpdateInterval)
    });
    // Первоначальное обновление статус-бара
    updateStatusBar();
    updateAgentsStatus();
}
function startStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    statusUpdateInterval = setInterval(() => {
        updateAgentsStatus();
    }, 3000); // Обновление каждые 3 секунды
}
function updateAgentsStatus() {
    if (!orchestrator || !agentsStatusTreeProvider) {
        return;
    }
    // Обновление статуса оркестратора
    if (orchestrator.isRunningState()) {
        agentsStatusTreeProvider.updateAgentStatus('orchestrator', { status: 'working' });
    }
    else {
        agentsStatusTreeProvider.updateAgentStatus('orchestrator', { status: 'idle' });
    }
    // Обновление статуса виртуального пользователя
    if (virtualUser) {
        const isRunning = virtualUser.isRunningState?.() || false;
        agentsStatusTreeProvider.updateAgentStatus('virtual-user', {
            status: isRunning ? 'working' : 'idle'
        });
    }
    // Обновление задач
    const tasks = orchestrator.getTasks();
    agentsStatusTreeProvider.updateTasks(tasks);
    // Обновление статусов агентов на основе задач
    const agentsStatus = orchestrator.getAgentsStatus();
    for (const agentStatus of agentsStatus) {
        agentsStatusTreeProvider.updateAgentStatus(agentStatus.id, agentStatus);
        // Обновляем размышления, если они есть
        if (agentStatus.currentThoughts) {
            agentsStatusTreeProvider.updateAgentThoughts(agentStatus.id, agentStatus.currentThoughts);
        }
    }
}
function getStatusText(status) {
    const statuses = {
        'working': 'Работает',
        'idle': 'Ожидает',
        'error': 'Ошибка',
        'disabled': 'Отключен'
    };
    return statuses[status] || status;
}
function updateStatusBar(status) {
    if (!statusBarItem)
        return;
    const config = vscode.workspace.getConfiguration('cursor-autonomous');
    const virtualUserEnabled = config.get('enableVirtualUser', false);
    const orchestratorEnabled = config.get('enableOrchestrator', true);
    const isOrchestratorRunning = orchestrator?.isRunningState() || false;
    if (virtualUserEnabled && isOrchestratorRunning) {
        statusBarItem.text = '$(robot) CursorAI $(check)';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        statusBarItem.tooltip = 'Автономный режим активен - Виртуальный пользователь работает';
    }
    else if (isOrchestratorRunning) {
        statusBarItem.text = '$(robot) CursorAI';
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = 'Оркестратор работает - Нажмите для быстрого меню (Ctrl+Shift+A)';
    }
    else {
        statusBarItem.text = '$(robot) CursorAI $(circle-slash)';
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = 'Оркестратор остановлен - Нажмите для быстрого меню (Ctrl+Shift+A)';
    }
}
function deactivate() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = undefined;
    }
    if (orchestrator) {
        orchestrator.stop();
        orchestrator.dispose();
    }
    if (virtualUser) {
        virtualUser.stop();
        virtualUser.dispose();
    }
    if (selfImprover) {
        selfImprover.stop();
        selfImprover.dispose();
    }
}
//# sourceMappingURL=extension.js.map