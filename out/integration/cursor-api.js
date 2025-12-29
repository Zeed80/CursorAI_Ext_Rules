"use strict";
/**
 * Интеграция с CursorAI API
 *
 * Этот модуль предоставляет интерфейс для взаимодействия с CursorAI API,
 * включая Background Agents API и интеграцию через правила.
 */
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
exports.CursorAPI = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const url_1 = require("url");
class CursorAPI {
    /**
     * Инициализация API
     */
    static initialize(apiKey, baseUrl) {
        this.apiKey = apiKey || process.env.CURSOR_API_KEY;
        if (baseUrl) {
            this.apiBaseUrl = baseUrl;
        }
        if (this.apiKey) {
            this.isInitialized = true;
            console.log('CursorAPI initialized with API key');
        }
        else {
            this.isInitialized = false;
            console.warn('CursorAPI: No API key provided, using fallback methods');
        }
    }
    /**
     * Выполнение HTTP запроса
     * Использует fetch если доступен, иначе fallback на https модуль
     */
    static async request(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        // Используем fetch если доступен (Node.js 18+)
        if (typeof fetch !== 'undefined') {
            try {
                const fetchOptions = {
                    method: options.method || 'GET',
                    headers,
                };
                if (options.body) {
                    fetchOptions.body = JSON.stringify(options.body);
                }
                const response = await fetch(url, fetchOptions);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                return data;
            }
            catch (error) {
                console.error('API request failed (fetch):', error);
                throw error;
            }
        }
        else {
            // Fallback на https модуль для старых версий Node.js
            return this.requestWithHttps(url, options, headers);
        }
    }
    /**
     * Fallback метод для HTTP запросов через https модуль
     */
    static requestWithHttps(url, options, headers) {
        return new Promise((resolve, reject) => {
            try {
                const urlObj = new url_1.URL(url);
                const isHttps = urlObj.protocol === 'https:';
                const httpModule = isHttps ? https : http;
                const requestOptions = {
                    hostname: urlObj.hostname,
                    port: urlObj.port || (isHttps ? 443 : 80),
                    path: urlObj.pathname + urlObj.search,
                    method: options.method || 'GET',
                    headers
                };
                const req = httpModule.request(requestOptions, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        try {
                            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                                const parsed = JSON.parse(data);
                                resolve(parsed);
                            }
                            else {
                                reject(new Error(`HTTP error! status: ${res.statusCode}`));
                            }
                        }
                        catch (error) {
                            reject(new Error(`Failed to parse response: ${error}`));
                        }
                    });
                });
                req.on('error', (error) => {
                    reject(error);
                });
                if (options.body) {
                    req.write(JSON.stringify(options.body));
                }
                req.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Регистрация кастомного агента в CursorAI через Background Agents API
     *
     * @param agent Информация об агенте
     */
    static async registerAgent(agent) {
        console.log(`Registering agent: ${agent.name}`);
        // Попытка регистрации через Background Agents API
        if (this.isInitialized) {
            try {
                const response = await this.request('/agents', {
                    method: 'POST',
                    body: {
                        name: agent.name,
                        description: agent.description,
                        enabled: agent.enabled
                    }
                });
                console.log('Agent registered via API:', response);
                return true;
            }
            catch (error) {
                console.warn('Failed to register agent via API, using fallback:', error.message);
            }
        }
        // Fallback: регистрация через правила и конфигурацию
        return await this.registerAgentViaRules(agent);
    }
    /**
     * Регистрация агента через правила (fallback метод)
     */
    static async registerAgentViaRules(agent) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return false;
        }
        // Создание правила для агента
        const rulePath = vscode.Uri.joinPath(workspaceFolder.uri, '.cursor', 'rules', 'agents', `${agent.id}.mdc`);
        const ruleContent = `---
name: ${agent.name}
description: ${agent.description}
globs: ["**/*"]
alwaysApply: ${agent.enabled}
---

# ${agent.name}

${agent.description}

## Инструкции для AI

Этот агент автоматически активируется при работе с проектом.
Агент специализируется на: ${agent.description}

## Контекст агента

- **ID**: ${agent.id}
- **Тип**: Локальный агент расширения CursorAI Autonomous
- **Статус**: ${agent.enabled ? 'Активен' : 'Неактивен'}

## Использование

Этот агент является частью системы автономных агентов расширения.
При работе с задачами, связанными с областью специализации агента, 
используй его знания и опыт для принятия решений.

---
*Зарегистрировано: ${new Date().toISOString()}*
*Расширение: CursorAI Autonomous Extension v0.1.0*
`;
        try {
            await vscode.workspace.fs.writeFile(rulePath, Buffer.from(ruleContent, 'utf-8'));
            console.log(`Agent registered via rules: ${rulePath.fsPath}`);
            return true;
        }
        catch (error) {
            console.error('Error registering agent via rules:', error);
            return false;
        }
    }
    /**
     * Получение пути к user data директории CursorAI
     */
    static getCursorUserDataPath() {
        try {
            const platform = process.platform;
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            if (!homeDir) {
                return null;
            }
            if (platform === 'win32') {
                // Windows: %APPDATA%\Cursor\User
                const appData = process.env.APPDATA;
                if (appData) {
                    return `${appData}\\Cursor\\User`;
                }
            }
            else if (platform === 'darwin') {
                // macOS: ~/Library/Application Support/Cursor/User
                return `${homeDir}/Library/Application Support/Cursor/User`;
            }
            else {
                // Linux: ~/.config/Cursor/User
                return `${homeDir}/.config/Cursor/User`;
            }
            return null;
        }
        catch (error) {
            console.error('Failed to get Cursor user data path:', error);
            return null;
        }
    }
    /**
     * Поиск файла настроек CursorAI
     */
    static async findCursorSettingsFile() {
        const pathsToCheck = [];
        // 1. User settings CursorAI
        const userDataPath = this.getCursorUserDataPath();
        if (userDataPath) {
            pathsToCheck.push(`${userDataPath}/settings.json`);
        }
        // 2. Workspace settings
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            pathsToCheck.push(vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'settings.json').fsPath);
        }
        // 3. User settings через VS Code API (может быть CursorAI settings)
        try {
            const config = vscode.workspace.getConfiguration('cursor');
            // Проверяем, есть ли настройки cursor
            if (config) {
                // VS Code API уже предоставляет доступ к настройкам
                // Но мы также попробуем прочитать файл напрямую
            }
        }
        catch (e) {
            // Игнорируем
        }
        // Пробуем прочитать файлы
        for (const path of pathsToCheck) {
            try {
                const uri = vscode.Uri.file(path);
                await vscode.workspace.fs.stat(uri);
                console.log(`Found CursorAI settings file: ${path}`);
                return uri;
            }
            catch (error) {
                // Файл не существует, пробуем следующий
                console.debug(`Settings file not found: ${path}`);
            }
        }
        console.warn('CursorAI settings file not found in any standard location');
        return null;
    }
    /**
     * Парсинг моделей из JSON настроек
     */
    static parseModelsFromSettings(settings) {
        const modelNames = [];
        // Проверяем различные возможные структуры
        if (settings.cursor) {
            const cursorSettings = settings.cursor;
            // cursor.modelNames (массив)
            if (Array.isArray(cursorSettings.modelNames)) {
                modelNames.push(...cursorSettings.modelNames);
            }
            // cursor.models (массив или объект)
            if (Array.isArray(cursorSettings.models)) {
                modelNames.push(...cursorSettings.models);
            }
            else if (cursorSettings.models) {
                if (Array.isArray(cursorSettings.models.modelNames)) {
                    modelNames.push(...cursorSettings.models.modelNames);
                }
                if (Array.isArray(cursorSettings.models.list)) {
                    modelNames.push(...cursorSettings.models.list);
                }
            }
            // cursor.chat.models или cursor.chat.modelNames
            if (cursorSettings.chat) {
                if (Array.isArray(cursorSettings.chat.models)) {
                    modelNames.push(...cursorSettings.chat.models);
                }
                if (Array.isArray(cursorSettings.chat.modelNames)) {
                    modelNames.push(...cursorSettings.chat.modelNames);
                }
            }
        }
        // Удаляем дубликаты и фильтруем
        return Array.from(new Set(modelNames))
            .filter(name => name && typeof name === 'string' && name.trim().length > 0)
            .map(name => name.trim());
    }
    /**
     * Получение списка доступных моделей из CursorAI
     * Использует ТОЛЬКО модели CursorAI, исключает модели GitHub Copilot
     */
    static async getAvailableModels() {
        try {
            // НЕ используем Language Model API VS Code, так как он может возвращать модели GitHub Copilot
            // Используем только команды CursorAI и настройки CursorAI
            // Вариант 1: Пробуем получить через команды CursorAI (только CursorAI модели)
            const cursorCommands = [
                'cursor.getModels',
                'cursor.listModels',
                'cursor.models.list',
                'cursor.chat.getModels',
                'cursor.chat.listModels'
            ];
            for (const cmd of cursorCommands) {
                try {
                    const result = await vscode.commands.executeCommand(cmd);
                    if (result) {
                        let modelNames = [];
                        if (Array.isArray(result)) {
                            modelNames = result;
                        }
                        else if (result.models && Array.isArray(result.models)) {
                            modelNames = result.models;
                        }
                        else if (result.list && Array.isArray(result.list)) {
                            modelNames = result.list;
                        }
                        else if (typeof result === 'string') {
                            modelNames = [result];
                        }
                        if (modelNames.length > 0) {
                            const models = modelNames
                                .filter(name => name && typeof name === 'string' && name.trim().length > 0)
                                // Исключаем модели GitHub Copilot
                                .filter(name => {
                                const lowerName = name.toLowerCase();
                                return !lowerName.includes('github') &&
                                    !lowerName.includes('copilot') &&
                                    !lowerName.includes('gh-');
                            })
                                .map(name => {
                                const trimmedName = name.trim();
                                return {
                                    id: trimmedName,
                                    name: trimmedName,
                                    displayName: trimmedName,
                                    provider: this.getProviderFromModelName(trimmedName)
                                };
                            });
                            if (models.length > 0) {
                                console.log(`Found ${models.length} CursorAI models via command ${cmd}:`, models.map(m => m.id));
                                return models;
                            }
                        }
                    }
                }
                catch (cmdError) {
                    // Команда не доступна, пробуем следующую
                    console.debug(`CursorAI command ${cmd} not available`);
                }
            }
            // Вариант 2: Пробуем получить из файла настроек CursorAI
            const settingsFile = await this.findCursorSettingsFile();
            if (settingsFile) {
                try {
                    const settingsContent = await vscode.workspace.fs.readFile(settingsFile);
                    const settings = JSON.parse(settingsContent.toString());
                    const modelNames = this.parseModelsFromSettings(settings);
                    if (modelNames.length > 0) {
                        const models = modelNames
                            // Исключаем модели GitHub Copilot
                            .filter(name => {
                            const lowerName = name.toLowerCase();
                            return !lowerName.includes('github') &&
                                !lowerName.includes('copilot') &&
                                !lowerName.includes('gh-');
                        })
                            .map(name => {
                            return {
                                id: name,
                                name: name,
                                displayName: name,
                                provider: this.getProviderFromModelName(name)
                            };
                        });
                        if (models.length > 0) {
                            console.log(`Found ${models.length} CursorAI models from settings file:`, models.map(m => m.id));
                            return models;
                        }
                    }
                }
                catch (error) {
                    console.warn('Failed to read or parse CursorAI settings file:', error.message);
                }
            }
            // Вариант 3: Пробуем получить из настроек через VS Code API
            const cursorConfig = vscode.workspace.getConfiguration('cursor');
            let modelNames = [];
            // Проверяем различные возможные ключи
            const configKeys = [
                'modelNames',
                'models',
                'chat.models',
                'chat.modelNames',
                'models.list',
                'models.modelNames'
            ];
            for (const key of configKeys) {
                try {
                    const value = cursorConfig.get(key, null);
                    if (value) {
                        if (Array.isArray(value)) {
                            modelNames = value;
                            break;
                        }
                        else if (typeof value === 'string') {
                            modelNames = value.split(',').map((s) => s.trim());
                            break;
                        }
                        else if (typeof value === 'object' && value.modelNames && Array.isArray(value.modelNames)) {
                            modelNames = value.modelNames;
                            break;
                        }
                        else if (typeof value === 'object' && value.list && Array.isArray(value.list)) {
                            modelNames = value.list;
                            break;
                        }
                    }
                }
                catch (e) {
                    // Продолжаем проверку
                }
            }
            // Если нашли модели в настройках, возвращаем их (только CursorAI модели)
            if (modelNames.length > 0) {
                const models = modelNames
                    .filter(name => name && typeof name === 'string' && name.trim().length > 0)
                    // Исключаем модели GitHub Copilot
                    .filter(name => {
                    const lowerName = name.toLowerCase();
                    return !lowerName.includes('github') &&
                        !lowerName.includes('copilot') &&
                        !lowerName.includes('gh-');
                })
                    .map(name => {
                    const trimmedName = name.trim();
                    return {
                        id: trimmedName,
                        name: trimmedName,
                        displayName: trimmedName,
                        provider: this.getProviderFromModelName(trimmedName)
                    };
                });
                if (models.length > 0) {
                    console.log(`Found ${models.length} CursorAI models from VS Code settings:`, models.map(m => m.id));
                    return models;
                }
            }
            // Если модели не найдены, возвращаем пустой массив
            console.warn('No models found in CursorAI. Models will be selected automatically by CursorAI.');
            return [];
        }
        catch (error) {
            console.error('Failed to get models from CursorAI:', error);
            return [];
        }
    }
    /**
     * Определение провайдера модели по её имени
     */
    static getProviderFromModelName(modelName) {
        const lowerName = modelName.toLowerCase();
        if (lowerName.includes('gpt') || lowerName.includes('openai')) {
            return 'openai';
        }
        else if (lowerName.includes('claude') || lowerName.includes('anthropic')) {
            return 'anthropic';
        }
        else if (lowerName.includes('gemini') || lowerName.includes('google')) {
            return 'google';
        }
        else if (lowerName.includes('cursor')) {
            return 'cursor';
        }
        return 'unknown';
    }
    /**
     * Установка модели для агента
     */
    static async setAgentModel(agentId, modelId) {
        if (this.isInitialized) {
            try {
                await this.request(`/agents/${agentId}`, {
                    method: 'PATCH',
                    body: {
                        model: modelId
                    }
                });
                return true;
            }
            catch (error) {
                console.warn('Failed to set model via API:', error.message);
            }
        }
        // Fallback: сохранение в конфигурации
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        await config.update(`agents.${agentId}.model`, modelId, vscode.ConfigurationTarget.Workspace);
        return true;
    }
    /**
     * Отправка сообщения агенту через Background Agents API
     * Если модель не указана, CursorAI автоматически выберет модель
     */
    static async sendMessageToAgent(agentId, message, modelId) {
        // Проверяем, есть ли фоновый агент для этого agentId
        let backgroundAgentId = this.backgroundAgentIds.get(agentId);
        // Если нет в кэше, пытаемся загрузить из настроек
        if (!backgroundAgentId) {
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            backgroundAgentId = config.get(`agents.${agentId}.backgroundAgentId`);
            if (backgroundAgentId) {
                this.backgroundAgentIds.set(agentId, backgroundAgentId);
            }
        }
        // Если есть фоновый агент, используем его для отправки сообщения
        if (backgroundAgentId && this.isInitialized) {
            try {
                const requestBody = { message: message };
                const response = await this.request(`/background-agents/${backgroundAgentId}/messages`, {
                    method: 'POST',
                    body: requestBody
                });
                return response.response || '';
            }
            catch (error) {
                console.warn(`Failed to send message via background agent ${backgroundAgentId}:`, error.message);
                // Продолжаем с fallback
            }
        }
        // Fallback: используем старый API
        if (this.isInitialized) {
            try {
                const requestBody = { message: message };
                if (modelId) {
                    requestBody.model = modelId;
                }
                const response = await this.request(`/agents/${agentId}/messages`, {
                    method: 'POST',
                    body: requestBody
                });
                return response.response || '';
            }
            catch (error) {
                console.warn('Failed to send message via API:', error.message);
            }
        }
        // Последний fallback: возвращаем заглушку
        return `Agent ${agentId} received message: ${message}. Model: ${modelId || 'auto'}`;
    }
    /**
     * Получение статуса агента
     */
    static async getAgentStatus(agentId) {
        if (this.isInitialized) {
            try {
                const response = await this.request(`/agents/${agentId}/status`);
                return response.status || 'inactive';
            }
            catch (error) {
                console.warn('Failed to get status via API:', error.message);
            }
        }
        // Fallback: проверка через конфигурацию
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const enabled = config.get(`agents.${agentId}.enabled`, false);
        return enabled ? 'active' : 'inactive';
    }
    /**
     * Получение списка фоновых агентов
     */
    static async listBackgroundAgents() {
        if (this.isInitialized) {
            try {
                const response = await this.request('/background-agents', {
                    method: 'GET'
                });
                return response.agents || [];
            }
            catch (error) {
                console.warn('Failed to list background agents via API:', error.message);
            }
        }
        return [];
    }
    /**
     * Получение фонового агента по ID
     */
    static async getBackgroundAgent(agentId) {
        if (this.isInitialized) {
            try {
                const response = await this.request(`/background-agents/${agentId}`, {
                    method: 'GET'
                });
                return response;
            }
            catch (error) {
                console.debug(`Background agent ${agentId} not found:`, error.message);
                return null;
            }
        }
        return null;
    }
    /**
     * Создание или обновление фонового агента CursorAI
     * @param agentId ID нашего агента
     * @param name Имя агента
     * @param description Описание агента
     * @param instructions Инструкции для агента
     * @param modelId ID модели (опционально, для автоматического выбора не указывать)
     * @returns ID созданного/обновленного фонового агента или null
     */
    static async createOrUpdateBackgroundAgent(agentId, name, description, instructions, modelId) {
        // Проверяем, есть ли уже созданный фоновый агент для этого agentId
        const existingBackgroundAgentId = this.backgroundAgentIds.get(agentId);
        if (this.isInitialized) {
            try {
                // Если агент существует, обновляем его
                if (existingBackgroundAgentId) {
                    try {
                        const updateBody = {
                            name: name,
                            description: description,
                            instructions: instructions,
                            enabled: true
                        };
                        if (modelId) {
                            updateBody.model = modelId;
                        }
                        const response = await this.request(`/background-agents/${existingBackgroundAgentId}`, {
                            method: 'PATCH',
                            body: updateBody
                        });
                        console.log(`Background agent ${existingBackgroundAgentId} updated for agent ${agentId}`);
                        return existingBackgroundAgentId;
                    }
                    catch (error) {
                        // Если агент не найден, создадим новый
                        console.debug(`Background agent ${existingBackgroundAgentId} not found, creating new one:`, error.message);
                        this.backgroundAgentIds.delete(agentId);
                    }
                }
                // Создаем нового агента
                const createBody = {
                    name: name,
                    description: description,
                    instructions: instructions,
                    enabled: true
                };
                if (modelId) {
                    createBody.model = modelId;
                }
                const response = await this.request('/background-agents', {
                    method: 'POST',
                    body: createBody
                });
                if (response && response.id) {
                    this.backgroundAgentIds.set(agentId, response.id);
                    console.log(`Background agent ${response.id} created for agent ${agentId} with model ${modelId || 'auto'}`);
                    return response.id;
                }
            }
            catch (error) {
                console.error('Failed to create/update background agent via API:', error.message);
            }
        }
        // Fallback: сохранение в настройках расширения
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        await config.update(`agents.${agentId}.backgroundAgentId`, existingBackgroundAgentId || null, vscode.ConfigurationTarget.Global);
        return existingBackgroundAgentId || null;
    }
    /**
     * Создание Background Agent через API (legacy метод, используйте createOrUpdateBackgroundAgent)
     */
    static async createBackgroundAgent(config) {
        const agentId = config.name.toLowerCase().replace(/\s+/g, '-');
        const backgroundAgentId = await this.createOrUpdateBackgroundAgent(agentId, config.name, config.description, config.instructions, config.model);
        return backgroundAgentId !== null;
    }
    /**
     * Получение API ключа из настроек
     */
    static getApiKey() {
        if (this.apiKey) {
            return this.apiKey;
        }
        // Попытка получить из настроек VS Code
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        return config.get('apiKey') || process.env.CURSOR_API_KEY;
    }
    /**
     * Проверка доступности API
     */
    static async checkApiAvailability() {
        if (!this.isInitialized) {
            return false;
        }
        try {
            await this.request('/health');
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.CursorAPI = CursorAPI;
CursorAPI.apiBaseUrl = 'https://api.cursor.com/v0';
CursorAPI.isInitialized = false;
CursorAPI.backgroundAgentIds = new Map(); // agentId -> backgroundAgentId
//# sourceMappingURL=cursor-api.js.map