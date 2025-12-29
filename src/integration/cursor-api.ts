/**
 * Интеграция с CursorAI API
 * 
 * Этот модуль предоставляет интерфейс для взаимодействия с CursorAI API,
 * включая Background Agents API и интеграцию через правила.
 */

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface CursorAgent {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

export interface CursorModel {
    id: string;
    name: string;
    provider?: string;
    vendor?: string;
    family?: string;
    displayName?: string;
}

export interface BackgroundAgentConfig {
    name: string;
    description: string;
    instructions: string;
    model?: string;
    enabled: boolean;
}

interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    headers?: { [key: string]: string };
}

export class CursorAPI {
    private static apiKey: string | undefined;
    private static apiBaseUrl: string = 'https://api.cursor.com/v0';
    private static isInitialized: boolean = false;
    private static backgroundAgentIds: Map<string, string> = new Map(); // agentId -> backgroundAgentId

    /**
     * Инициализация API
     */
    static initialize(apiKey?: string, baseUrl?: string): void {
        this.apiKey = apiKey || process.env.CURSOR_API_KEY;
        if (baseUrl) {
            this.apiBaseUrl = baseUrl;
        }
        
        if (this.apiKey) {
            this.isInitialized = true;
            console.log('CursorAPI initialized with API key');
        } else {
            this.isInitialized = false;
            console.warn('CursorAPI: No API key provided, using fallback methods');
        }
    }

    /**
     * Выполнение HTTP запроса
     * Использует fetch если доступен, иначе fallback на https модуль
     */
    private static async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const headers: { [key: string]: string } = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        // Используем fetch если доступен (Node.js 18+)
        if (typeof fetch !== 'undefined') {
            try {
                const fetchOptions: RequestInit = {
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
                return data as T;
            } catch (error) {
                console.error('API request failed (fetch):', error);
                throw error;
            }
        } else {
            // Fallback на https модуль для старых версий Node.js
            return this.requestWithHttps<T>(url, options, headers);
        }
    }

    /**
     * Fallback метод для HTTP запросов через https модуль
     */
    private static requestWithHttps<T>(url: string, options: ApiRequestOptions, headers: { [key: string]: string }): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                const urlObj = new URL(url);
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
                                resolve(parsed as T);
                            } else {
                                reject(new Error(`HTTP error! status: ${res.statusCode}`));
                            }
                        } catch (error) {
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
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Регистрация кастомного агента в CursorAI через Background Agents API
     * 
     * @param agent Информация об агенте
     */
    static async registerAgent(agent: CursorAgent): Promise<boolean> {
        console.log(`Registering agent: ${agent.name}`);

        // Попытка регистрации через Background Agents API
        if (this.isInitialized) {
            try {
                const response = await this.request<any>('/agents', {
                    method: 'POST',
                    body: {
                        name: agent.name,
                        description: agent.description,
                        enabled: agent.enabled
                    }
                });
                
                console.log('Agent registered via API:', response);
                return true;
            } catch (error: any) {
                console.warn('Failed to register agent via API, using fallback:', error.message);
            }
        }

        // Fallback: регистрация через правила и конфигурацию
        return await this.registerAgentViaRules(agent);
    }

    /**
     * Регистрация агента через правила (fallback метод)
     */
    private static async registerAgentViaRules(agent: CursorAgent): Promise<boolean> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return false;
        }

        // Создание правила для агента
        const rulePath = vscode.Uri.joinPath(
            workspaceFolder.uri,
            '.cursor',
            'rules',
            'agents',
            `${agent.id}.mdc`
        );

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
            await vscode.workspace.fs.writeFile(
                rulePath,
                Buffer.from(ruleContent, 'utf-8')
            );
            console.log(`Agent registered via rules: ${rulePath.fsPath}`);
            return true;
        } catch (error) {
            console.error('Error registering agent via rules:', error);
            return false;
        }
    }

    /**
     * Получение пути к user data директории CursorAI
     */
    private static getCursorUserDataPath(): string | null {
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
            } else if (platform === 'darwin') {
                // macOS: ~/Library/Application Support/Cursor/User
                return `${homeDir}/Library/Application Support/Cursor/User`;
            } else {
                // Linux: ~/.config/Cursor/User
                return `${homeDir}/.config/Cursor/User`;
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get Cursor user data path:', error);
            return null;
        }
    }

    /**
     * Поиск файла настроек CursorAI
     */
    private static async findCursorSettingsFile(): Promise<vscode.Uri | null> {
        const pathsToCheck: string[] = [];
        
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
        } catch (e) {
            // Игнорируем
        }
        
        // Пробуем прочитать файлы
        for (const path of pathsToCheck) {
            try {
                const uri = vscode.Uri.file(path);
                await vscode.workspace.fs.stat(uri);
                console.log(`Found CursorAI settings file: ${path}`);
                return uri;
            } catch (error) {
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
    private static parseModelsFromSettings(settings: any): string[] {
        const modelNames: string[] = [];
        
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
            } else if (cursorSettings.models) {
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
    static async getAvailableModels(): Promise<CursorModel[]> {
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
                    const result = await vscode.commands.executeCommand<any>(cmd);
                    if (result) {
                        let modelNames: string[] = [];
                        
                        if (Array.isArray(result)) {
                            modelNames = result;
                        } else if (result.models && Array.isArray(result.models)) {
                            modelNames = result.models;
                        } else if (result.list && Array.isArray(result.list)) {
                            modelNames = result.list;
                        } else if (typeof result === 'string') {
                            modelNames = [result];
                        }
                        
                        if (modelNames.length > 0) {
                            const models: CursorModel[] = modelNames
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
                } catch (cmdError) {
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
                        const models: CursorModel[] = modelNames
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
                } catch (error: any) {
                    console.warn('Failed to read or parse CursorAI settings file:', error.message);
                }
            }
            
            // Вариант 3: Пробуем получить из настроек через VS Code API
            const cursorConfig = vscode.workspace.getConfiguration('cursor');
            let modelNames: string[] = [];
            
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
                    const value = cursorConfig.get<any>(key, null);
                    if (value) {
                        if (Array.isArray(value)) {
                            modelNames = value;
                            break;
                        } else if (typeof value === 'string') {
                            modelNames = value.split(',').map((s: string) => s.trim());
                            break;
                        } else if (typeof value === 'object' && value.modelNames && Array.isArray(value.modelNames)) {
                            modelNames = value.modelNames;
                            break;
                        } else if (typeof value === 'object' && value.list && Array.isArray(value.list)) {
                            modelNames = value.list;
                            break;
                        }
                    }
                } catch (e) {
                    // Продолжаем проверку
                }
            }
            
            // Если нашли модели в настройках, возвращаем их (только CursorAI модели)
            if (modelNames.length > 0) {
                const models: CursorModel[] = modelNames
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
            
        } catch (error: any) {
            console.error('Failed to get models from CursorAI:', error);
            return [];
        }
    }

    /**
     * Определение провайдера модели по её имени
     */
    private static getProviderFromModelName(modelName: string): string {
        const lowerName = modelName.toLowerCase();
        if (lowerName.includes('gpt') || lowerName.includes('openai')) {
            return 'openai';
        } else if (lowerName.includes('claude') || lowerName.includes('anthropic')) {
            return 'anthropic';
        } else if (lowerName.includes('gemini') || lowerName.includes('google')) {
            return 'google';
        } else if (lowerName.includes('cursor')) {
            return 'cursor';
        }
        return 'unknown';
    }

    /**
     * Установка модели для агента
     */
    static async setAgentModel(agentId: string, modelId: string): Promise<boolean> {
        if (this.isInitialized) {
            try {
                await this.request(`/agents/${agentId}`, {
                    method: 'PATCH',
                    body: {
                        model: modelId
                    }
                });
                return true;
            } catch (error: any) {
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
    static async sendMessageToAgent(agentId: string, message: string, modelId?: string): Promise<string> {
        // Проверяем, есть ли фоновый агент для этого agentId
        let backgroundAgentId = this.backgroundAgentIds.get(agentId);
        
        // Если нет в кэше, пытаемся загрузить из настроек
        if (!backgroundAgentId) {
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            backgroundAgentId = config.get<string>(`agents.${agentId}.backgroundAgentId`);
            if (backgroundAgentId) {
                this.backgroundAgentIds.set(agentId, backgroundAgentId);
            }
        }
        
        // Если есть фоновый агент, используем его для отправки сообщения
        if (backgroundAgentId && this.isInitialized) {
            try {
                const requestBody: any = { message: message };
                
                const response = await this.request<{ response: string }>(`/background-agents/${backgroundAgentId}/messages`, {
                    method: 'POST',
                    body: requestBody
                });
                return response.response || '';
            } catch (error: any) {
                console.warn(`Failed to send message via background agent ${backgroundAgentId}:`, error.message);
                // Продолжаем с fallback
            }
        }
        
        // Fallback: используем старый API
        if (this.isInitialized) {
            try {
                const requestBody: any = { message: message };
                if (modelId) {
                    requestBody.model = modelId;
                }
                
                const response = await this.request<{ response: string }>(`/agents/${agentId}/messages`, {
                    method: 'POST',
                    body: requestBody
                });
                return response.response || '';
            } catch (error: any) {
                console.warn('Failed to send message via API:', error.message);
            }
        }

        // Последний fallback: возвращаем заглушку
        return `Agent ${agentId} received message: ${message}. Model: ${modelId || 'auto'}`;
    }

    /**
     * Получение статуса агента
     */
    static async getAgentStatus(agentId: string): Promise<'active' | 'inactive' | 'error'> {
        if (this.isInitialized) {
            try {
                const response = await this.request<{ status: 'active' | 'inactive' | 'error' }>(`/agents/${agentId}/status`);
                return response.status || 'inactive';
            } catch (error: any) {
                console.warn('Failed to get status via API:', error.message);
            }
        }

        // Fallback: проверка через конфигурацию
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const enabled = config.get<boolean>(`agents.${agentId}.enabled`, false);
        return enabled ? 'active' : 'inactive';
    }

    /**
     * Получение списка фоновых агентов
     */
    static async listBackgroundAgents(): Promise<any[]> {
        if (this.isInitialized) {
            try {
                const response = await this.request<{ agents: any[] }>('/background-agents', {
                    method: 'GET'
                });
                return response.agents || [];
            } catch (error: any) {
                console.warn('Failed to list background agents via API:', error.message);
            }
        }
        return [];
    }

    /**
     * Получение фонового агента по ID
     */
    static async getBackgroundAgent(agentId: string): Promise<any | null> {
        if (this.isInitialized) {
            try {
                const response = await this.request<any>(`/background-agents/${agentId}`, {
                    method: 'GET'
                });
                return response;
            } catch (error: any) {
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
    static async createOrUpdateBackgroundAgent(
        agentId: string,
        name: string,
        description: string,
        instructions: string,
        modelId?: string
    ): Promise<string | null> {
        // Проверяем, есть ли уже созданный фоновый агент для этого agentId
        const existingBackgroundAgentId = this.backgroundAgentIds.get(agentId);
        
        if (this.isInitialized) {
            try {
                // Если агент существует, обновляем его
                if (existingBackgroundAgentId) {
                    try {
                        const updateBody: any = {
                            name: name,
                            description: description,
                            instructions: instructions,
                            enabled: true
                        };
                        
                        if (modelId) {
                            updateBody.model = modelId;
                        }
                        
                        const response = await this.request<any>(`/background-agents/${existingBackgroundAgentId}`, {
                            method: 'PATCH',
                            body: updateBody
                        });
                        
                        console.log(`Background agent ${existingBackgroundAgentId} updated for agent ${agentId}`);
                        return existingBackgroundAgentId;
                    } catch (error: any) {
                        // Если агент не найден, создадим новый
                        console.debug(`Background agent ${existingBackgroundAgentId} not found, creating new one:`, error.message);
                        this.backgroundAgentIds.delete(agentId);
                    }
                }
                
                // Создаем нового агента
                const createBody: any = {
                    name: name,
                    description: description,
                    instructions: instructions,
                    enabled: true
                };
                
                if (modelId) {
                    createBody.model = modelId;
                }
                
                const response = await this.request<{ id: string }>('/background-agents', {
                    method: 'POST',
                    body: createBody
                });
                
                if (response && response.id) {
                    this.backgroundAgentIds.set(agentId, response.id);
                    console.log(`Background agent ${response.id} created for agent ${agentId} with model ${modelId || 'auto'}`);
                    return response.id;
                }
            } catch (error: any) {
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
    static async createBackgroundAgent(config: BackgroundAgentConfig): Promise<boolean> {
        const agentId = config.name.toLowerCase().replace(/\s+/g, '-');
        const backgroundAgentId = await this.createOrUpdateBackgroundAgent(
            agentId,
            config.name,
            config.description,
            config.instructions,
            config.model
        );
        return backgroundAgentId !== null;
    }

    /**
     * Получение API ключа из настроек
     */
    static getApiKey(): string | undefined {
        if (this.apiKey) {
            return this.apiKey;
        }

        // Попытка получить из настроек VS Code
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        return config.get<string>('apiKey') || process.env.CURSOR_API_KEY;
    }

    /**
     * Проверка доступности API
     */
    static async checkApiAvailability(): Promise<boolean> {
        if (!this.isInitialized) {
            return false;
        }

        try {
            await this.request('/health');
            return true;
        } catch (error) {
            return false;
        }
    }
}
