import * as vscode from 'vscode';
import { SettingsManager } from '../integration/settings-manager';
import { ModelProviderManager } from '../integration/model-providers/provider-manager';
import { ModelProviderType, ModelInfo } from '../integration/model-providers/base-provider';
import { UsageTracker } from '../integration/model-providers/usage-tracker';
import { SettingsValidator } from '../integration/settings-validator';

export interface SettingsData {
    general: {
        apiKey: string;
        enableVirtualUser: boolean;
        autoImprove: boolean;
        monitoringInterval: number;
        improvementInterval: number;
        virtualUserDecisionThreshold: number;
        enableOrchestrator: boolean;
    };
    providers: {
        [key in ModelProviderType]?: {
            apiKey?: string;
            baseUrl?: string;
            enabled?: boolean;
        };
    };
    agents: {
        [agentId: string]: {
            providerType?: ModelProviderType;
            modelId?: string;
            temperature?: number;
            maxTokens?: number;
        };
    };
    orchestrator: {
        useCursorAIForRefinement: boolean;
        cursorAIRefinementOnlyForCritical: boolean;
    };
}

export class SettingsPanel {
    private static currentPanel: SettingsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _settingsManager: SettingsManager;
    private readonly _modelProviderManager: ModelProviderManager;
    private readonly _usageTracker: UsageTracker | undefined;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        settingsManager: SettingsManager,
        modelProviderManager: ModelProviderManager,
        usageTracker?: UsageTracker
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._settingsManager = settingsManager;
        this._modelProviderManager = modelProviderManager;
        this._usageTracker = usageTracker;

        // Обработка сообщений от webview
        this._panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this._disposables
        );

        // Обновление при изменении видимости
        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this.update();
                }
            },
            null,
            this._disposables
        );

        // Очистка при закрытии
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Первоначальная загрузка
        this.update();
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        settingsManager: SettingsManager,
        modelProviderManager: ModelProviderManager,
        usageTracker?: UsageTracker
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Если панель уже открыта, показываем её
        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Создаем новую панель
        const panel = vscode.window.createWebviewPanel(
            'settingsPanel',
            'Настройки CursorAI Autonomous',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );

        SettingsPanel.currentPanel = new SettingsPanel(
            panel,
            extensionUri,
            settingsManager,
            modelProviderManager,
            usageTracker
        );
    }

    public static revive(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        settingsManager: SettingsManager,
        modelProviderManager: ModelProviderManager,
        usageTracker?: UsageTracker
    ): void {
        SettingsPanel.currentPanel = new SettingsPanel(
            panel,
            extensionUri,
            settingsManager,
            modelProviderManager,
            usageTracker
        );
    }

    public dispose(): void {
        SettingsPanel.currentPanel = undefined;

        // Очистка ресурсов
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async update(): Promise<void> {
        const webview = this._panel.webview;
        this._panel.webview.html = await this.getWebviewContent(webview);
    }

    private async handleMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'loadSettings':
                await this.loadSettings();
                return;
            case 'saveSettings':
                await this.saveSettings(message.settings);
                return;
            case 'testProvider':
                await this.testProviderConnection(message.providerType);
                return;
            case 'getModels':
                await this.getModelsForProvider(message.providerType);
                return;
            case 'refresh':
                this.update();
                return;
        }
    }

    private async loadSettings(): Promise<void> {
        try {
            const settings: SettingsData = {
                general: {
                    apiKey: this._settingsManager.getSetting<string>('apiKey', ''),
                    enableVirtualUser: this._settingsManager.enableVirtualUser,
                    autoImprove: this._settingsManager.autoImprove,
                    monitoringInterval: this._settingsManager.monitoringInterval,
                    improvementInterval: this._settingsManager.improvementInterval,
                    virtualUserDecisionThreshold: this._settingsManager.virtualUserDecisionThreshold,
                    enableOrchestrator: this._settingsManager.enableOrchestrator
                },
                providers: {},
                agents: {},
                orchestrator: {
                    useCursorAIForRefinement: this._settingsManager.getSetting<boolean>('useCursorAIForRefinement', false),
                    cursorAIRefinementOnlyForCritical: this._settingsManager.getSetting<boolean>('cursorAIRefinementOnlyForCritical', true)
                }
            };

            // Загружаем настройки провайдеров
            const providerTypes: ModelProviderType[] = ['openai', 'google', 'anthropic', 'ollama', 'llm-studio', 'cursorai'];
            for (const providerType of providerTypes) {
                const config = this._settingsManager.getProviderConfig(providerType);
                settings.providers[providerType] = {
                    apiKey: config.apiKey,
                    baseUrl: config.baseUrl,
                    enabled: config.enabled !== false
                };
            }

            // Загружаем настройки агентов
            const agentIds = ['backend', 'frontend', 'architect', 'analyst', 'devops', 'qa', 'orchestrator', 'virtual-user'];
            for (const agentId of agentIds) {
                const model = await this._settingsManager.getAgentModel(agentId);
                const modelConfig = this._settingsManager.getAgentModelConfig(agentId);
                settings.agents[agentId] = {
                    providerType: modelConfig.model as ModelProviderType | undefined,
                    modelId: model?.id,
                    temperature: modelConfig.modelConfig?.temperature,
                    maxTokens: modelConfig.modelConfig?.maxTokens
                };
            }

            // Добавляем статистику если доступна
            const statistics = this._usageTracker ? this.getStatisticsData() : null;
            if (statistics) {
                (settings as any).statistics = statistics;
            }

            // Отправляем настройки в webview
            this._panel.webview.postMessage({
                command: 'settingsLoaded',
                settings: settings
            });
        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'error',
                message: `Ошибка загрузки настроек: ${error.message}`
            });
        }
    }

    private async saveSettings(settings: SettingsData): Promise<void> {
        try {
            // Валидация настроек перед сохранением
            const validationErrors = SettingsValidator.validate(settings);
            if (validationErrors.length > 0) {
                const errorMessage = SettingsValidator.formatErrors(validationErrors);
                this._panel.webview.postMessage({
                    command: 'error',
                    message: `Ошибки валидации:\n${errorMessage}`
                });
                vscode.window.showErrorMessage(`Ошибки валидации настроек:\n${errorMessage}`);
                return;
            }

            // Сохраняем основные настройки
            await this._settingsManager.updateSetting('apiKey', settings.general.apiKey);
            await this._settingsManager.updateSetting('enableVirtualUser', settings.general.enableVirtualUser);
            await this._settingsManager.updateSetting('autoImprove', settings.general.autoImprove);
            await this._settingsManager.updateSetting('monitoringInterval', settings.general.monitoringInterval);
            await this._settingsManager.updateSetting('improvementInterval', settings.general.improvementInterval);
            await this._settingsManager.updateSetting('virtualUserDecisionThreshold', settings.general.virtualUserDecisionThreshold);
            await this._settingsManager.updateSetting('enableOrchestrator', settings.general.enableOrchestrator);

            // Сохраняем настройки провайдеров
            for (const [providerType, config] of Object.entries(settings.providers)) {
                if (config) {
                    await this._settingsManager.updateProviderConfig(providerType as ModelProviderType, {
                        apiKey: config.apiKey,
                        baseUrl: config.baseUrl,
                        enabled: config.enabled
                    });
                }
            }

            // Сохраняем настройки агентов
            for (const [agentId, agentConfig] of Object.entries(settings.agents)) {
                if (agentConfig.providerType) {
                    await this._settingsManager.setAgentModelProvider(agentId, agentConfig.providerType, {
                        temperature: agentConfig.temperature,
                        maxTokens: agentConfig.maxTokens
                    });
                }
            }

            // Сохраняем настройки оркестратора
            await this._settingsManager.updateSetting('useCursorAIForRefinement', settings.orchestrator.useCursorAIForRefinement);
            await this._settingsManager.updateSetting('cursorAIRefinementOnlyForCritical', settings.orchestrator.cursorAIRefinementOnlyForCritical);

            this._panel.webview.postMessage({
                command: 'settingsSaved',
                success: true
            });

            vscode.window.showInformationMessage('Настройки успешно сохранены');
        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'error',
                message: `Ошибка сохранения настроек: ${error.message}`
            });
            vscode.window.showErrorMessage(`Ошибка сохранения настроек: ${error.message}`);
        }
    }

    private async testProviderConnection(providerType: string): Promise<void> {
        try {
            const provider = this._modelProviderManager.getProvider(providerType as ModelProviderType);
            if (!provider) {
                this._panel.webview.postMessage({
                    command: 'providerTestResult',
                    providerType: providerType,
                    success: false,
                    message: 'Провайдер не найден'
                });
                return;
            }

            const isAvailable = await provider.isAvailable();
            this._panel.webview.postMessage({
                command: 'providerTestResult',
                providerType: providerType,
                success: isAvailable,
                message: isAvailable ? 'Подключение успешно' : 'Подключение не удалось'
            });
        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'providerTestResult',
                providerType: providerType,
                success: false,
                message: `Ошибка: ${error.message}`
            });
        }
    }

    private async getModelsForProvider(providerType: string): Promise<void> {
        try {
            const provider = this._modelProviderManager.getProvider(providerType as ModelProviderType);
            if (!provider) {
                this._panel.webview.postMessage({
                    command: 'modelsLoaded',
                    providerType: providerType,
                    models: []
                });
                return;
            }

            const models = await provider.getAvailableModels();
            this._panel.webview.postMessage({
                command: 'modelsLoaded',
                providerType: providerType,
                models: models
            });
        } catch (error: any) {
            this._panel.webview.postMessage({
                command: 'error',
                message: `Ошибка загрузки моделей: ${error.message}`
            });
        }
    }

    private async getWebviewContent(webview: vscode.Webview): Promise<string> {
        // Получаем статистику использования
        const statistics = this._usageTracker ? this.getStatisticsData() : null;
        
        // Получаем список агентов
        const agentNames: { [key: string]: string } = {
            'backend': 'Backend Developer',
            'frontend': 'Frontend Developer',
            'architect': 'Software Architect',
            'analyst': 'Data Analyst',
            'devops': 'DevOps Engineer',
            'qa': 'QA Engineer',
            'orchestrator': 'Orchestrator',
            'virtual-user': 'Virtual User'
        };

        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Настройки CursorAI Autonomous</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
        }
        .header {
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            background: transparent;
            border: none;
            color: var(--vscode-foreground);
            font-size: 14px;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s;
        }
        .tab:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .tab.active {
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-focusBorder);
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            font-size: 13px;
        }
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group input[type="url"],
        .form-group select {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-size: 13px;
        }
        .form-group input[type="checkbox"] {
            margin-right: 8px;
        }
        .form-group .help-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        .provider-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .provider-card h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-left: 10px;
        }
        .status-indicator.available {
            background: var(--vscode-testing-iconPassed);
        }
        .status-indicator.unavailable {
            background: var(--vscode-testing-iconFailed);
        }
        .test-button {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 10px;
        }
        .test-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .save-button {
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-top: 20px;
        }
        .save-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .agent-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .agent-card h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .error-message {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            display: none;
        }
        .success-message {
            color: var(--vscode-testing-iconPassed);
            background: var(--vscode-inputValidation-infoBackground);
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            display: none;
        }
        .statistics-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .statistics-table th,
        .statistics-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .statistics-table th {
            background: var(--vscode-list-hoverBackground);
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚙️ Настройки CursorAI Autonomous</h1>
    </div>

    <div class="tabs">
        <button class="tab active" data-tab="general">Основные</button>
        <button class="tab" data-tab="providers">Провайдеры</button>
        <button class="tab" data-tab="agents">Агенты</button>
        <button class="tab" data-tab="orchestrator">Оркестратор</button>
        <button class="tab" data-tab="statistics">Статистика</button>
    </div>

    <div class="error-message" id="errorMessage"></div>
    <div class="success-message" id="successMessage"></div>

    <!-- Основные настройки -->
    <div class="tab-content active" id="tab-general">
        <div class="form-group">
            <label for="apiKey">API ключ CursorAI</label>
            <input type="text" id="apiKey" placeholder="Введите API ключ">
            <div class="help-text">API ключ для доступа к CursorAI Background Agents API</div>
        </div>

        <div class="form-group">
            <label>
                <input type="checkbox" id="enableVirtualUser">
                Включить виртуального пользователя
            </label>
            <div class="help-text">Автономный режим работы системы</div>
        </div>

        <div class="form-group">
            <label>
                <input type="checkbox" id="autoImprove">
                Включить автоматическое самосовершенствование
            </label>
            <div class="help-text">Система будет автоматически улучшать свою работу</div>
        </div>

        <div class="form-group">
            <label>
                <input type="checkbox" id="enableOrchestrator">
                Включить оркестратор
            </label>
            <div class="help-text">Включить оркестратор в селекторе агентов</div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="monitoringInterval">Интервал мониторинга (мс)</label>
                <input type="number" id="monitoringInterval" min="60000" step="1000">
                <div class="help-text">Интервал мониторинга проекта (по умолчанию: 300000 = 5 минут)</div>
            </div>

            <div class="form-group">
                <label for="improvementInterval">Интервал улучшения (мс)</label>
                <input type="number" id="improvementInterval" min="3600000" step="1000">
                <div class="help-text">Интервал самосовершенствования (по умолчанию: 86400000 = 24 часа)</div>
            </div>
        </div>

        <div class="form-group">
            <label for="virtualUserDecisionThreshold">Порог уверенности виртуального пользователя</label>
            <input type="number" id="virtualUserDecisionThreshold" min="0" max="1" step="0.1">
            <div class="help-text">Порог уверенности для решений виртуального пользователя (0-1, по умолчанию: 0.7)</div>
        </div>
    </div>

    <!-- Провайдеры -->
    <div class="tab-content" id="tab-providers">
        <div id="providersList"></div>
    </div>

    <!-- Агенты -->
    <div class="tab-content" id="tab-agents">
        <div id="agentsList"></div>
    </div>

    <!-- Оркестратор -->
    <div class="tab-content" id="tab-orchestrator">
        <div class="form-group">
            <label>
                <input type="checkbox" id="useCursorAIForRefinement">
                Использовать CursorAI для финальной обработки решений
            </label>
            <div class="help-text">Опциональная финальная обработка лучшего решения через CursorAI</div>
        </div>

        <div class="form-group">
            <label>
                <input type="checkbox" id="cursorAIRefinementOnlyForCritical">
                Использовать CursorAI только для критических задач
            </label>
            <div class="help-text">Применять CursorAI рефайнинг только для задач с высоким приоритетом</div>
        </div>
    </div>

    <!-- Статистика -->
    <div class="tab-content" id="tab-statistics">
        <div id="statisticsContent">
            <p>Статистика использования будет отображаться здесь</p>
        </div>
    </div>

    <button class="save-button" id="saveButton">Сохранить настройки</button>

    <script>
        const vscode = acquireVsCodeApi();
        let currentSettings = null;

        // Инициализация
        document.addEventListener('DOMContentLoaded', function() {
            initializeTabs();
            initializeForm();
            loadSettings();
        });

        function initializeTabs() {
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const targetTab = tab.getAttribute('data-tab');
                    
                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(tc => tc.classList.remove('active'));
                    
                    tab.classList.add('active');
                    document.getElementById(\`tab-\${targetTab}\`).classList.add('active');
                });
            });
        }

        function initializeForm() {
            document.getElementById('saveButton').addEventListener('click', saveSettings);
        }

        function loadSettings() {
            vscode.postMessage({ command: 'loadSettings' });
        }

        function saveSettings() {
            const settings = {
                general: {
                    apiKey: document.getElementById('apiKey').value,
                    enableVirtualUser: document.getElementById('enableVirtualUser').checked,
                    autoImprove: document.getElementById('autoImprove').checked,
                    monitoringInterval: parseInt(document.getElementById('monitoringInterval').value) || 300000,
                    improvementInterval: parseInt(document.getElementById('improvementInterval').value) || 86400000,
                    virtualUserDecisionThreshold: parseFloat(document.getElementById('virtualUserDecisionThreshold').value) || 0.7,
                    enableOrchestrator: document.getElementById('enableOrchestrator').checked
                },
                providers: collectProviderSettings(),
                agents: collectAgentSettings(),
                orchestrator: {
                    useCursorAIForRefinement: document.getElementById('useCursorAIForRefinement').checked,
                    cursorAIRefinementOnlyForCritical: document.getElementById('cursorAIRefinementOnlyForCritical').checked
                }
            };

            vscode.postMessage({ command: 'saveSettings', settings: settings });
        }

        function collectProviderSettings() {
            const providers = {};
            const providerTypes = ['openai', 'google', 'anthropic', 'ollama', 'llm-studio', 'cursorai'];
            
            providerTypes.forEach(providerType => {
                const apiKeyEl = document.getElementById(\`provider-\${providerType}-apiKey\`);
                const baseUrlEl = document.getElementById(\`provider-\${providerType}-baseUrl\`);
                const enabledEl = document.getElementById(\`provider-\${providerType}-enabled\`);
                
                if (apiKeyEl || baseUrlEl || enabledEl) {
                    providers[providerType] = {
                        apiKey: apiKeyEl ? apiKeyEl.value : undefined,
                        baseUrl: baseUrlEl ? baseUrlEl.value : undefined,
                        enabled: enabledEl ? enabledEl.checked : true
                    };
                }
            });
            
            return providers;
        }

        function collectAgentSettings() {
            const agents = {};
            const agentIds = ['backend', 'frontend', 'architect', 'analyst', 'devops', 'qa', 'orchestrator', 'virtual-user'];
            
            agentIds.forEach(agentId => {
                const providerEl = document.getElementById(\`agent-\${agentId}-provider\`);
                const modelEl = document.getElementById(\`agent-\${agentId}-model\`);
                const temperatureEl = document.getElementById(\`agent-\${agentId}-temperature\`);
                const maxTokensEl = document.getElementById(\`agent-\${agentId}-maxTokens\`);
                
                if (providerEl && providerEl.value) {
                    agents[agentId] = {
                        providerType: providerEl.value,
                        modelId: modelEl ? modelEl.value : undefined,
                        temperature: temperatureEl ? parseFloat(temperatureEl.value) : undefined,
                        maxTokens: maxTokensEl ? parseInt(maxTokensEl.value) : undefined
                    };
                }
            });
            
            return agents;
        }

        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }

        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        }

        function testProvider(providerType) {
            vscode.postMessage({ command: 'testProvider', providerType: providerType });
        }

        function getModelsForProvider(providerType) {
            vscode.postMessage({ command: 'getModels', providerType: providerType });
        }

        // Обработка сообщений от extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'settingsLoaded':
                    currentSettings = message.settings;
                    populateForm(message.settings);
                    break;
                case 'settingsSaved':
                    showSuccess('Настройки успешно сохранены');
                    break;
                case 'error':
                    showError(message.message);
                    break;
                case 'providerTestResult':
                    handleProviderTestResult(message.providerType, message.success, message.message);
                    break;
                case 'modelsLoaded':
                    handleModelsLoaded(message.providerType, message.models);
                    break;
            }
        });

        function populateForm(settings) {
            // Заполняем основные настройки
            document.getElementById('apiKey').value = settings.general.apiKey || '';
            document.getElementById('enableVirtualUser').checked = settings.general.enableVirtualUser;
            document.getElementById('autoImprove').checked = settings.general.autoImprove;
            document.getElementById('monitoringInterval').value = settings.general.monitoringInterval || 300000;
            document.getElementById('improvementInterval').value = settings.general.improvementInterval || 86400000;
            document.getElementById('virtualUserDecisionThreshold').value = settings.general.virtualUserDecisionThreshold || 0.7;
            document.getElementById('enableOrchestrator').checked = settings.general.enableOrchestrator;

            // Заполняем настройки оркестратора
            document.getElementById('useCursorAIForRefinement').checked = settings.orchestrator.useCursorAIForRefinement;
            document.getElementById('cursorAIRefinementOnlyForCritical').checked = settings.orchestrator.cursorAIRefinementOnlyForCritical;

            // Заполняем провайдеры и агенты (будет реализовано в следующих шагах)
            populateProviders(settings.providers);
            populateAgents(settings.agents);
            populateStatistics();
        }

        function populateProviders(providers) {
            const providersList = document.getElementById('providersList');
            if (!providersList) return;

            const providerConfigs = {
                'openai': { name: 'OpenAI (ChatGPT)', needsApiKey: true, defaultBaseUrl: 'https://api.openai.com/v1' },
                'google': { name: 'Google (Gemini)', needsApiKey: true, defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
                'anthropic': { name: 'Anthropic (Claude)', needsApiKey: true, defaultBaseUrl: 'https://api.anthropic.com/v1' },
                'ollama': { name: 'Ollama (Local)', needsApiKey: false, defaultBaseUrl: 'http://localhost:11434' },
                'llm-studio': { name: 'LLM Studio (Local)', needsApiKey: false, defaultBaseUrl: 'http://localhost:1234/v1' },
                'cursorai': { name: 'CursorAI', needsApiKey: false, defaultBaseUrl: '' }
            };

            let html = '';
            for (const [providerType, config] of Object.entries(providerConfigs)) {
                const providerData = providers[providerType] || {};
                const statusId = \`provider-\${providerType}-status\`;
                
                html += \`
                    <div class="provider-card">
                        <h3>
                            \${config.name}
                            <span class="status-indicator unavailable" id="\${statusId}"></span>
                        </h3>
                        \${config.needsApiKey ? \`
                            <div class="form-group">
                                <label for="provider-\${providerType}-apiKey">API ключ</label>
                                <input type="text" id="provider-\${providerType}-apiKey" 
                                       value="\${providerData.apiKey || ''}" 
                                       placeholder="Введите API ключ">
                            </div>
                        \` : ''}
                        <div class="form-group">
                            <label for="provider-\${providerType}-baseUrl">Base URL</label>
                            <input type="url" id="provider-\${providerType}-baseUrl" 
                                   value="\${providerData.baseUrl || config.defaultBaseUrl}" 
                                   placeholder="\${config.defaultBaseUrl}">
                        </div>
                        \${providerType !== 'cursorai' ? \`
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="provider-\${providerType}-enabled" 
                                           \${providerData.enabled !== false ? 'checked' : ''}>
                                    Включить провайдер
                                </label>
                            </div>
                        \` : ''}
                        <button class="test-button" onclick="testProvider('\${providerType}')">
                            Тест подключения
                        </button>
                    </div>
                \`;
            }

            providersList.innerHTML = html;
        }

        function populateAgents(agents) {
            const agentsList = document.getElementById('agentsList');
            if (!agentsList) return;

            const agentNames = {
                'backend': 'Backend Developer',
                'frontend': 'Frontend Developer',
                'architect': 'Software Architect',
                'analyst': 'Data Analyst',
                'devops': 'DevOps Engineer',
                'qa': 'QA Engineer',
                'orchestrator': 'Orchestrator',
                'virtual-user': 'Virtual User'
            };

            const providerTypes = ['cursorai', 'openai', 'google', 'anthropic', 'ollama', 'llm-studio'];

            let html = '';
            for (const [agentId, agentName] of Object.entries(agentNames)) {
                const agentData = agents[agentId] || {};
                
                html += \`
                    <div class="agent-card">
                        <h3>\${agentName}</h3>
                        <div class="form-group">
                            <label for="agent-\${agentId}-provider">Провайдер</label>
                            <select id="agent-\${agentId}-provider" onchange="onAgentProviderChange('\${agentId}', this.value)">
                                <option value="">Автоматический выбор</option>
                                \${providerTypes.map(pt => \`
                                    <option value="\${pt}" \${agentData.providerType === pt ? 'selected' : ''}>\${pt}</option>
                                \`).join('')}
                            </select>
                        </div>
                        <div class="form-group" id="agent-\${agentId}-model-group" style="display: \${agentData.providerType ? 'block' : 'none'}">
                            <label for="agent-\${agentId}-model">Модель</label>
                            <select id="agent-\${agentId}-model">
                                <option value="">Автоматический выбор</option>
                            </select>
                            <div class="help-text">Загрузка моделей...</div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="agent-\${agentId}-temperature">Temperature</label>
                                <input type="number" id="agent-\${agentId}-temperature" 
                                       min="0" max="2" step="0.1" 
                                       value="\${agentData.temperature || 0.7}">
                                <div class="help-text">Температура модели (0-2)</div>
                            </div>
                            <div class="form-group">
                                <label for="agent-\${agentId}-maxTokens">Max Tokens</label>
                                <input type="number" id="agent-\${agentId}-maxTokens" 
                                       min="1" step="100" 
                                       value="\${agentData.maxTokens || 1000}">
                                <div class="help-text">Максимальное количество токенов</div>
                            </div>
                        </div>
                    </div>
                \`;
            }

            agentsList.innerHTML = html;

            // Загружаем модели для агентов с выбранными провайдерами
            for (const agentId of Object.keys(agentNames)) {
                const providerEl = document.getElementById(\`agent-\${agentId}-provider\`);
                if (providerEl && providerEl.value) {
                    onAgentProviderChange(agentId, providerEl.value);
                }
            }
        }

        function populateStatistics() {
            const statisticsContent = document.getElementById('statisticsContent');
            if (!statisticsContent) return;

            if (!currentSettings || !currentSettings.statistics || currentSettings.statistics.length === 0) {
                statisticsContent.innerHTML = '<p>Статистика использования пока недоступна. Начните использовать агенты для сбора статистики.</p>';
                return;
            }

            let html = '<table class="statistics-table"><thead><tr>';
            html += '<th>Провайдер</th><th>Вызовов</th><th>Токенов (вход/выход)</th><th>Стоимость ($)</th><th>Среднее время (мс)</th><th>Успешность (%)</th>';
            html += '</tr></thead><tbody>';

            currentSettings.statistics.forEach(stat => {
                html += '<tr>';
                html += \`<td>\${stat.provider}</td>\`;
                html += \`<td>\${stat.totalCalls || 0}</td>\`;
                html += \`<td>\${stat.totalTokens?.input || 0} / \${stat.totalTokens?.output || 0}</td>\`;
                html += \`<td>\${(stat.totalCost || 0).toFixed(4)}</td>\`;
                html += \`<td>\${Math.round(stat.averageResponseTime || 0)}</td>\`;
                html += \`<td>\${((stat.successRate || 0) * 100).toFixed(1)}</td>\`;
                html += '</tr>';
            });

            html += '</tbody></table>';
            statisticsContent.innerHTML = html;
        }

        function handleProviderTestResult(providerType, success, message) {
            const statusEl = document.getElementById(\`provider-\${providerType}-status\`);
            if (statusEl) {
                statusEl.className = \`status-indicator \${success ? 'available' : 'unavailable'}\`;
                statusEl.title = message;
            }
            
            if (success) {
                showSuccess(\`Провайдер \${providerType}: \${message}\`);
            } else {
                showError(\`Провайдер \${providerType}: \${message}\`);
            }
        }

        function handleModelsLoaded(providerType, models) {
            // Обновляем селекты моделей для всех агентов с этим провайдером
            const agentIds = ['backend', 'frontend', 'architect', 'analyst', 'devops', 'qa', 'orchestrator', 'virtual-user'];
            
            agentIds.forEach(agentId => {
                const providerEl = document.getElementById(\`agent-\${agentId}-provider\`);
                if (providerEl && providerEl.value === providerType) {
                    const modelEl = document.getElementById(\`agent-\${agentId}-model\`);
                    const modelGroup = document.getElementById(\`agent-\${agentId}-model-group\`);
                    
                    if (modelEl && modelGroup) {
                        modelEl.innerHTML = '<option value="">Автоматический выбор</option>';
                        models.forEach(model => {
                            const option = document.createElement('option');
                            option.value = model.id;
                            option.textContent = \`\${model.name} (\${model.provider})\`;
                            modelEl.appendChild(option);
                        });
                        
                        // Восстанавливаем выбранную модель если есть
                        if (currentSettings && currentSettings.agents[agentId] && currentSettings.agents[agentId].modelId) {
                            modelEl.value = currentSettings.agents[agentId].modelId;
                        }
                    }
                }
            });
        }

        function onAgentProviderChange(agentId, providerType) {
            const modelGroup = document.getElementById(\`agent-\${agentId}-model-group\`);
            if (modelGroup) {
                modelGroup.style.display = providerType ? 'block' : 'none';
                if (providerType) {
                    getModelsForProvider(providerType);
                }
            }
        }
    </script>
</body>
</html>`;
    }

    private getStatisticsData(): any {
        if (!this._usageTracker) {
            return null;
        }

        const providerTypes: ModelProviderType[] = ['openai', 'google', 'anthropic', 'ollama', 'llm-studio', 'cursorai'];
        const stats: any[] = [];

        for (const providerType of providerTypes) {
            const providerStats = this._usageTracker.getProviderStats(providerType);
            if (providerStats) {
                stats.push({
                    provider: providerType,
                    totalCalls: providerStats.totalCalls,
                    totalTokens: providerStats.totalTokens,
                    totalCost: providerStats.totalCost,
                    averageResponseTime: providerStats.averageResponseTime,
                    successRate: providerStats.successRate
                });
            }
        }

        return stats;
    }
}
