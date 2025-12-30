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

export type ApiVersion = 'v0' | 'cloud-agents' | 'auto';

export class CursorAPI {
    private static apiKey: string | undefined;
    private static apiBaseUrl: string = 'https://api.cursor.com';
    private static apiVersion: ApiVersion = 'auto';
    private static detectedApiVersion: ApiVersion | null = null;
    private static isInitialized: boolean = false;
    private static backgroundAgentIds: Map<string, string> = new Map(); // agentId -> backgroundAgentId

    /**
     * Инициализация API
     */
    static initialize(apiKey?: string, baseUrl?: string, apiVersion?: ApiVersion): void {
        // Пробуем получить API ключ из разных источников (синхронно)
        // Асинхронный поиск будет выполнен при первом запросе
        // Проверяем, что ключ не пустой
        if (apiKey && apiKey.trim().length > 0) {
            this.apiKey = apiKey.trim();
        } else {
            this.apiKey = process.env.CURSOR_API_KEY && process.env.CURSOR_API_KEY.trim().length > 0 
                ? process.env.CURSOR_API_KEY.trim() 
                : undefined;
        }
        
        // Также пробуем синхронные источники
        if (!this.apiKey) {
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            const configApiKey = config.get<string>('apiKey');
            // Проверяем, что ключ не пустой
            if (configApiKey && configApiKey.trim().length > 0) {
                this.apiKey = configApiKey.trim();
            }
        }
        
        if (!this.apiKey) {
            const cursorConfig = vscode.workspace.getConfiguration('cursor');
            const cursorApiKey = cursorConfig.get<string>('apiKey') || 
                         cursorConfig.get<string>('api.apiKey') ||
                         cursorConfig.get<string>('auth.apiKey');
            // Проверяем, что ключ не пустой
            if (cursorApiKey && cursorApiKey.trim().length > 0) {
                this.apiKey = cursorApiKey.trim();
            }
        }
        
        if (baseUrl) {
            this.apiBaseUrl = baseUrl;
        }
        if (apiVersion) {
            this.apiVersion = apiVersion;
        } else {
            // Получаем из настроек
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            const configVersion = config.get<ApiVersion>('apiVersion', 'auto');
            this.apiVersion = configVersion;
        }
        
        if (this.apiKey) {
            this.isInitialized = true;
            console.log(`CursorAPI initialized with API key, version: ${this.apiVersion}`);
        } else {
            this.isInitialized = false;
            console.warn('CursorAPI: No API key provided, using fallback methods');
        }
    }

    /**
     * Получение API ключа из всех возможных источников
     */
    private static async getApiKeyFromAllSources(): Promise<string | undefined> {
        // 1. Переменная окружения
        if (process.env.CURSOR_API_KEY && process.env.CURSOR_API_KEY.trim().length > 0) {
            console.log('Found CURSOR_API_KEY in environment variables');
            return process.env.CURSOR_API_KEY.trim();
        }

        // 2. Настройки расширения
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const extensionApiKey = config.get<string>('apiKey');
        if (extensionApiKey && extensionApiKey.trim().length > 0) {
            console.log('Found API key in extension settings');
            return extensionApiKey.trim();
        }

        // 3. Настройки Cursor IDE (пробуем разные возможные ключи)
        const cursorConfig = vscode.workspace.getConfiguration('cursor');
        const cursorApiKey = cursorConfig.get<string>('apiKey') || 
                            cursorConfig.get<string>('api.apiKey') ||
                            cursorConfig.get<string>('auth.apiKey');
        if (cursorApiKey && cursorApiKey.trim().length > 0) {
            console.log('Found API key in Cursor IDE settings');
            return cursorApiKey.trim();
        }

        // 4. Пробуем прочитать из файла настроек Cursor напрямую
        try {
            const settingsFile = await this.findCursorSettingsFile();
            if (settingsFile) {
                const fs = require('fs');
                if (fs.existsSync(settingsFile.fsPath)) {
                    const settingsContent = fs.readFileSync(settingsFile.fsPath, 'utf8');
                    const settings = JSON.parse(settingsContent);
                    
                    // Проверяем различные возможные пути к API ключу
                    const possiblePaths = [
                        settings.cursor?.apiKey,
                        settings.cursor?.api?.apiKey,
                        settings.cursor?.auth?.apiKey,
                        settings['cursor.apiKey'],
                        settings['cursor.api.apiKey'],
                        settings['cursor.auth.apiKey'],
                        // Также проверяем в корне настроек (могут быть без префикса cursor)
                        settings.apiKey,
                        settings.api?.apiKey,
                        settings.auth?.apiKey
                    ];
                    
                    for (const key of possiblePaths) {
                        if (key && typeof key === 'string' && key.trim().length > 0) {
                            console.log('Found API key in Cursor settings file');
                            return key.trim();
                        }
                    }
                }
            }
        } catch (error: any) {
            // Игнорируем ошибки чтения файла
            console.debug('Failed to read API key from Cursor settings file:', error.message);
        }

        return undefined;
    }

    /**
     * Автоматическое определение версии API
     */
    private static async detectApiVersion(): Promise<ApiVersion> {
        if (this.detectedApiVersion) {
            return this.detectedApiVersion;
        }

        // Пробуем Cloud Agents API
        try {
            const testUrl = `${this.apiBaseUrl}/cloud-agents/models`;
            const headers: { [key: string]: string } = {
                'Content-Type': 'application/json',
            };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            if (typeof fetch !== 'undefined') {
                const response = await fetch(testUrl, {
                    method: 'GET',
                    headers
                });
                if (response.ok) {
                    this.detectedApiVersion = 'cloud-agents';
                    console.log('Detected Cloud Agents API');
                    return 'cloud-agents';
                }
            }
        } catch (error) {
            // Продолжаем проверку v0
        }

        // Пробуем v0 API
        try {
            const testUrl = `${this.apiBaseUrl}/v0/models`;
            const headers: { [key: string]: string } = {
                'Content-Type': 'application/json',
            };
            if (this.apiKey) {
                // Basic Auth для v0
                headers['Authorization'] = `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
            }

            if (typeof fetch !== 'undefined') {
                const response = await fetch(testUrl, {
                    method: 'GET',
                    headers
                });
                if (response.ok) {
                    this.detectedApiVersion = 'v0';
                    console.log('Detected v0 API');
                    return 'v0';
                }
            }
        } catch (error) {
            // API недоступен
        }

        // По умолчанию используем v0
        this.detectedApiVersion = 'v0';
        return 'v0';
    }

    /**
     * Получение текущей версии API
     */
    private static async getApiVersion(): Promise<ApiVersion> {
        if (this.apiVersion === 'auto') {
            return await this.detectApiVersion();
        }
        return this.apiVersion;
    }

    /**
     * Выполнение HTTP запроса
     * Использует fetch если доступен, иначе fallback на https модуль
     */
    private static async request<T>(endpoint: string, options: ApiRequestOptions = {}, useApiVersion?: ApiVersion): Promise<T> {
        const apiVersion = useApiVersion || await this.getApiVersion();
        
        // Определяем базовый URL в зависимости от версии API
        let baseUrl = this.apiBaseUrl;
        if (apiVersion === 'v0' && !endpoint.startsWith('/v0/')) {
            baseUrl = `${this.apiBaseUrl}/v0`;
        } else if (apiVersion === 'cloud-agents' && !endpoint.startsWith('/cloud-agents/')) {
            baseUrl = `${this.apiBaseUrl}`;
        }
        
        const url = `${baseUrl}${endpoint}`;
        const headers: { [key: string]: string } = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Аутентификация в зависимости от версии API
        // Обновляем API ключ перед запросом, если он еще не установлен
        if (!this.apiKey || this.apiKey.trim().length === 0) {
            // Пробуем получить из синхронных источников
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            const configApiKey = config.get<string>('apiKey');
            // Проверяем, что ключ не пустой
            if (configApiKey && configApiKey.trim().length > 0) {
                this.apiKey = configApiKey.trim();
            }
            
            if (!this.apiKey) {
                const cursorConfig = vscode.workspace.getConfiguration('cursor');
                const cursorApiKey = cursorConfig.get<string>('apiKey') || 
                             cursorConfig.get<string>('api.apiKey') ||
                             cursorConfig.get<string>('auth.apiKey');
                // Проверяем, что ключ не пустой
                if (cursorApiKey && cursorApiKey.trim().length > 0) {
                    this.apiKey = cursorApiKey.trim();
                }
            }
            
            if (!this.apiKey && process.env.CURSOR_API_KEY && process.env.CURSOR_API_KEY.trim().length > 0) {
                this.apiKey = process.env.CURSOR_API_KEY.trim();
            }
            
            if (this.apiKey) {
                this.isInitialized = true;
            }
        }
        
        if (this.apiKey) {
            if (apiVersion === 'v0') {
                // Basic Auth для v0 API: формат YOUR_API_KEY: (с двоеточием)
                // Это соответствует curl -u YOUR_API_KEY: https://api.cursor.com/v0/models
                const authString = `${this.apiKey}:`;
                headers['Authorization'] = `Basic ${Buffer.from(authString).toString('base64')}`;
                console.debug(`Using Basic Auth for v0 API (key length: ${this.apiKey.length})`);
            } else {
                // Bearer Auth для Cloud Agents API
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                console.debug(`Using Bearer Auth for Cloud Agents API (key length: ${this.apiKey.length})`);
            }
        } else {
            console.warn('No API key available for request');
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
                    // Пытаемся получить детали ошибки из ответа
                    let errorMessage = `HTTP error! status: ${response.status}`;
                    try {
                        const errorData = await response.json() as any;
                        if (errorData && (errorData.error || errorData.message)) {
                            errorMessage += `: ${errorData.error || errorData.message}`;
                        }
                        console.error('API Error Details:', {
                            status: response.status,
                            statusText: response.statusText,
                            body: errorData,
                            requestBody: options.body
                        });
                    } catch (e) {
                        // Не удалось распарсить JSON ошибки
                        const text = await response.text().catch(() => '');
                        console.error('API Error (text):', {
                            status: response.status,
                            statusText: response.statusText,
                            body: text,
                            requestBody: options.body
                        });
                        errorMessage += `: ${text || response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                return data as T;
            } catch (error) {
                console.error('API request failed (fetch):', error);
                throw error;
            }
        } else {
            // Fallback на https модуль для старых версий Node.js
            return this.requestWithHttps<T>(url, options, headers, apiVersion);
        }
    }

    /**
     * Fallback метод для HTTP запросов через https модуль
     */
    private static async requestWithHttps<T>(url: string, options: ApiRequestOptions, headers: { [key: string]: string }, apiVersion?: ApiVersion): Promise<T> {
        const version = apiVersion || await this.getApiVersion();
        
        // Обновляем аутентификацию если нужно
        if (this.apiKey && !headers['Authorization']) {
            if (version === 'v0') {
                headers['Authorization'] = `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
            } else {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
        }
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

        // Попытка регистрации через API
        if (this.isInitialized) {
            try {
                const apiVersion = await this.getApiVersion();
                
                if (apiVersion === 'v0') {
                    // v0 API использует /v0/agents
                    const response = await this.request<any>('/v0/agents', {
                        method: 'POST',
                        body: {
                            prompt: {
                                text: agent.description
                            },
                            source: {
                                repository: '', // Будет заполнено при создании агента
                                ref: 'main'
                            },
                            enabled: agent.enabled
                        }
                    }, 'v0');
                    
                    console.log('Agent registered via v0 API:', response);
                    return true;
                } else {
                    // Cloud Agents API - регистрация через правила (Cloud Agents запускается через launch)
                    console.log('Cloud Agents API: registration via rules');
                }
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
     * Теперь возвращает Promise для совместимости
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
     * Получение списка моделей через API
     * Использует правильные endpoints согласно документации
     */
    static async getModelsViaAPI(): Promise<CursorModel[]> {
        // Проверяем и обновляем API ключ перед запросом
        const apiKey = this.getApiKey();
        if (!apiKey) {
            console.warn('No API key found, cannot fetch models via API');
            return [];
        }

        // Обновляем isInitialized если ключ был найден
        if (!this.isInitialized && apiKey) {
            this.isInitialized = true;
            this.apiKey = apiKey;
        }

        const apiVersion = await this.getApiVersion();

        // Пробуем Cloud Agents API
        if (apiVersion === 'cloud-agents') {
            try {
                const response = await this.request<{ models: Array<{id: string, provider?: string, context_window?: number, type?: string}> }>(
                    '/cloud-agents/models',
                    {},
                    'cloud-agents'
                );
                
                if (response && response.models && Array.isArray(response.models)) {
                    console.log(`Found ${response.models.length} models via Cloud Agents API`);
                    return response.models.map(m => ({
                        id: m.id,
                        name: m.id,
                        provider: m.provider || this.getProviderFromModelName(m.id),
                        displayName: m.id
                    }));
                }
            } catch (error: any) {
                console.debug('Cloud Agents API models request failed:', error.message);
            }
        }

        // Fallback на v0 API (основной метод согласно документации)
        try {
            console.log('Trying v0 API /v0/models with Basic Auth');
            const response = await this.request<{ models: string[] }>(
                '/v0/models',
                {},
                'v0'
            );
            
            if (response && response.models && Array.isArray(response.models)) {
                console.log(`Found ${response.models.length} models via v0 API`);
                return response.models
                    .filter(id => !this.isGitHubCopilotModel(id, id))
                    .map(id => ({
                        id,
                        name: id,
                        provider: this.getProviderFromModelName(id),
                        displayName: id
                    }));
            }
        } catch (error: any) {
            console.error('v0 API models request failed:', error.message);
            console.error('Error details:', {
                status: (error as any).status,
                statusText: (error as any).statusText,
                message: error.message
            });
        }

        return [];
    }

    /**
     * Получение списка доступных моделей из CursorAI
     * Использует ТОЛЬКО модели CursorAI, исключает модели GitHub Copilot
     * Сначала пробует API, потом fallback на IDE настройки
     */
    static async getAvailableModels(): Promise<CursorModel[]> {
        try {
            console.log('CursorAPI.getAvailableModels() called');
            console.log('Environment:', {
                hasCursorGlobal: typeof (global as any).cursor !== 'undefined',
                hasVscodeLM: typeof vscode.lm !== 'undefined',
                workspaceFolders: vscode.workspace.workspaceFolders?.length
            });
            
            // ПРИОРИТЕТ 1: Получение моделей через API
            if (this.isInitialized) {
                const apiModels = await this.getModelsViaAPI();
                if (apiModels.length > 0) {
                    console.log(`Found ${apiModels.length} models via API`);
                    return apiModels;
                }
            }

            // ПРИОРИТЕТ 2: Пробуем Cursor IDE API (если запущены в Cursor IDE)
            const cursorIDEModels = await this.getCursorIDEModels();
            if (cursorIDEModels.length > 0) {
                const filteredModels: CursorModel[] = [];
                for (const model of cursorIDEModels) {
                    // Получаем id и name из модели (может быть строкой или объектом)
                    let modelId: string;
                    let modelName: string;
                    
                    if (typeof model === 'string') {
                        const trimmedName = model.trim();
                        modelId = trimmedName;
                        modelName = trimmedName;
                    } else {
                        // Уже объект CursorModel, используем его данные
                        modelId = model.id || model.name || '';
                        modelName = model.name || model.displayName || model.id || '';
                    }
                    
                    // Проверяем, что это не GitHub Copilot модель
                    if (!this.isGitHubCopilotModel(modelId, modelName)) {
                        filteredModels.push({
                            id: modelId,
                            name: modelName,
                            displayName: modelName,
                            provider: typeof model === 'string' ? this.getProviderFromModelName(modelId) : (model.provider || this.getProviderFromModelName(modelId))
                        });
                    }
                }
                
                if (filteredModels.length > 0) {
                    console.log(`Found ${filteredModels.length} CursorAI models from Cursor IDE API`);
                    return filteredModels;
                }
            }

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
                                // КРИТИЧЕСКИ ВАЖНО: Исключаем модели GitHub Copilot - используем только модели CursorAI
                                .filter(name => !this.isGitHubCopilotModel(name, name))
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
                            // КРИТИЧЕСКИ ВАЖНО: Исключаем модели GitHub Copilot - используем только модели CursorAI
                            .filter(name => !this.isGitHubCopilotModel(name, name))
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
            // Используем только валидные ключи, чтобы избежать предупреждений VS Code
            const cursorConfig = vscode.workspace.getConfiguration('cursor');
            let modelNames: string[] = [];
            
            // Проверяем только валидные ключи (без паттернов, которые могут вызвать предупреждения)
            const configKeys = [
                'modelNames',
                'models'
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
            
            // Дополнительно проверяем вложенные объекты через безопасный доступ
            try {
                const cursorSettings = cursorConfig.get<any>('chat', null);
                if (cursorSettings && typeof cursorSettings === 'object') {
                    if (Array.isArray(cursorSettings.models)) {
                        modelNames = cursorSettings.models;
                    } else if (Array.isArray(cursorSettings.modelNames)) {
                        modelNames = cursorSettings.modelNames;
                    }
                }
            } catch (e) {
                // Игнорируем ошибки доступа к вложенным настройкам
            }
            
            // Если нашли модели в настройках, возвращаем их (только CursorAI модели)
            if (modelNames.length > 0) {
                const models: CursorModel[] = modelNames
                    .filter(name => name && typeof name === 'string' && name.trim().length > 0)
                    // КРИТИЧЕСКИ ВАЖНО: Исключаем модели GitHub Copilot - используем только модели CursorAI
                    .filter(name => !this.isGitHubCopilotModel(name, name))
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
            
            // Вариант 4: Fallback на Language Model API VS Code (с фильтрацией GitHub Copilot)
            try {
                // Проверяем доступность Language Model API
                if (vscode.lm && typeof vscode.lm.selectChatModels === 'function') {
                    try {
                        // Пытаемся получить модели через Language Model API
                        const lmModels = await vscode.lm.selectChatModels({});
                        
                        if (lmModels && lmModels.length > 0) {
                            const models: CursorModel[] = lmModels
                                // КРИТИЧЕСКИ ВАЖНО: Исключаем модели GitHub Copilot - используем только модели CursorAI
                                .filter(model => !this.isGitHubCopilotModel(model.id, model.name))
                                .map(model => {
                                    const modelId = model.id || model.name || 'unknown';
                                    const modelName = model.name || model.id || 'unknown';
                                    
                                    return {
                                        id: modelId,
                                        name: modelName,
                                        displayName: modelName,
                                        provider: this.getProviderFromModelName(modelId)
                                    };
                                });
                            
                            if (models.length > 0) {
                                console.log(`Found ${models.length} models via Language Model API (filtered):`, models.map(m => m.id));
                                return models;
                            }
                        }
                    } catch (lmError: any) {
                        console.debug('Language Model API not available or failed:', lmError.message);
                    }
                }
            } catch (lmApiError: any) {
                console.debug('Language Model API check failed:', lmApiError.message);
            }
            
            // Если модели не найдены, возвращаем пустой массив
            // Это нормально - CursorAI будет автоматически выбирать модели
            console.log('No models found in CursorAI via API or settings. This is normal.');
            console.log('CursorAI will automatically select appropriate models for agents.');
            console.log('Tried methods: Cursor IDE API, CursorAI commands, settings file, VS Code settings');
            console.log('Note: Warnings about "chat.*", "mcp", "GitHub.copilot" patterns are from other extensions/Cursor IDE, not this extension.');
            return [];
            
        } catch (error: any) {
            console.error('Failed to get models from CursorAI:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            return [];
        }
    }

    /**
     * Получение моделей через Cursor IDE API
     * Используется если расширение запущено в Cursor IDE
     * Возвращает массив строк или массив объектов CursorModel
     */
    private static async getCursorIDEModels(): Promise<(string | CursorModel)[]> {
        try {
            // Проверяем наличие глобального объекта Cursor
            if (typeof (global as any).cursor !== 'undefined') {
                const cursorApi = (global as any).cursor;
                
                // Пытаемся получить модели через Cursor API
                if (typeof cursorApi.getAvailableModels === 'function') {
                    const models = await cursorApi.getAvailableModels();
                    if (Array.isArray(models) && models.length > 0) {
                        console.log(`Got ${models.length} models from Cursor IDE API`);
                        return models as any;
                    }
                }
                
                // Пробуем через cursor.chat
                if (cursorApi.chat && typeof cursorApi.chat.getAvailableModels === 'function') {
                    const models = await cursorApi.chat.getAvailableModels();
                    if (Array.isArray(models) && models.length > 0) {
                        console.log(`Got ${models.length} models from Cursor IDE Chat API`);
                        return models as any;
                    }
                }
            }
            
            return [];
        } catch (error: any) {
            console.debug('Cursor IDE API not available:', error.message);
            return [];
        }
    }

    /**
     * Проверка, является ли модель GitHub Copilot
     * КРИТИЧЕСКИ ВАЖНО: GitHub Copilot модели НИКОГДА не должны использоваться
     * Используем только модели активные в CursorAI
     */
    private static isGitHubCopilotModel(modelId: string | undefined, modelName: string | undefined): boolean {
        if (!modelId && !modelName) {
            return false;
        }
        
        const id = (modelId || '').toLowerCase();
        const name = (modelName || '').toLowerCase();
        const combined = `${id} ${name}`.toLowerCase();
        
        // Строгая фильтрация всех возможных вариантов GitHub Copilot
        const copilotPatterns = [
            'github',
            'copilot',
            'gh-',
            'gh_',
            'github-copilot',
            'github_copilot',
            'copilot-chat',
            'copilot_chat',
            'githubcopilot',
            'ghcopilot',
            'microsoft-github',
            'microsoft_github'
        ];
        
        return copilotPatterns.some(pattern => 
            id.includes(pattern) || 
            name.includes(pattern) || 
            combined.includes(pattern)
        );
    }

    /**
     * Проверка, является ли модель платной/дорогой
     * Исключаем модели типа max, premium, opus, o1 и т.д.
     */
    private static isPremiumModel(modelId: string | undefined, modelName: string | undefined): boolean {
        if (!modelId && !modelName) {
            return false;
        }
        
        const id = (modelId || '').toLowerCase();
        const name = (modelName || '').toLowerCase();
        const combined = `${id} ${name}`.toLowerCase();
        
        // Паттерны платных/дорогих моделей
        const premiumPatterns = [
            'max',           // gpt-4o-max, claude-max
            'premium',       // premium модели
            'opus',          // Claude Opus - самый дорогой
            'o1',            // OpenAI o1, o1-preview - очень дорогой reasoning model
            'o3',            // OpenAI o3
            'advanced',      // advanced модели
            'pro',           // pro модели
            'ultra',         // ultra модели
            'thinking',      // thinking модели (обычно дорогие)
            'claude-4',      // Claude 4 (если есть, обычно дороже чем 3.5)
            'gpt-4-turbo',   // GPT-4 Turbo может быть дороже
            'gpt-4-32k'      // GPT-4 с большим контекстом
        ];
        
        return premiumPatterns.some(pattern => 
            id.includes(pattern) || 
            name.includes(pattern) || 
            combined.includes(pattern)
        );
    }

    /**
     * Определение провайдера модели по её имени
     */
    private static getProviderFromModelName(modelName: string): string {
        const lowerName = modelName.toLowerCase();
        
        // Исключаем GitHub Copilot
        if (this.isGitHubCopilotModel(modelName, modelName)) {
            return 'github-copilot-excluded';
        }
        
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
     * Фильтрация моделей, исключая платные/дорогие
     */
    static filterFreeModels(models: CursorModel[]): CursorModel[] {
        return models.filter(model => {
            const modelId = model.id || '';
            const modelName = model.name || model.displayName || '';
            return !this.isPremiumModel(modelId, modelName);
        });
    }

    /**
     * Выбор бесплатной/дешевой модели по умолчанию
     * Приоритет: Cursor Small/Fast > Claude Sonnet/Haiku > GPT-4o (не max) > другие
     */
    static selectDefaultFreeModel(models: CursorModel[]): CursorModel | undefined {
        const freeModels = this.filterFreeModels(models);
        
        if (freeModels.length === 0) {
            return undefined;
        }

        // Приоритет 1: Cursor Small/Fast (обычно бесплатные или очень дешевые)
        const cursorModel = freeModels.find(m => {
            const id = (m.id || '').toLowerCase();
            return id.includes('cursor-small') || id.includes('cursor-fast') || id.includes('cursor-small') || id.includes('small');
        });
        if (cursorModel) {
            return cursorModel;
        }

        // Приоритет 2: Claude Sonnet или Haiku (дешевле чем Opus)
        const claudeModel = freeModels.find(m => {
            const id = (m.id || '').toLowerCase();
            return (id.includes('sonnet') || id.includes('haiku')) && !id.includes('opus');
        });
        if (claudeModel) {
            return claudeModel;
        }

        // Приоритет 3: GPT-4o (но не max)
        const gpt4oModel = freeModels.find(m => {
            const id = (m.id || '').toLowerCase();
            return id.includes('gpt-4o') && !id.includes('max');
        });
        if (gpt4oModel) {
            return gpt4oModel;
        }

        // Приоритет 4: GPT-3.5 (обычно дешевле)
        const gpt35Model = freeModels.find(m => {
            const id = (m.id || '').toLowerCase();
            return id.includes('gpt-3.5') || id.includes('gpt3.5');
        });
        if (gpt35Model) {
            return gpt35Model;
        }

        // Приоритет 5: Любая другая бесплатная модель
        return freeModels[0];
    }

    /**
     * Установка модели для агента
     */
    static async setAgentModel(agentId: string, modelId: string): Promise<boolean> {
        if (this.isInitialized) {
            try {
                const apiVersion = await this.getApiVersion();
                const backgroundAgentId = this.backgroundAgentIds.get(agentId) || 
                    vscode.workspace.getConfiguration('cursor-autonomous').get<string>(`agents.${agentId}.backgroundAgentId`);
                
                if (backgroundAgentId) {
                    if (apiVersion === 'v0') {
                        // v0 API: отправляем followup с новой моделью
                        try {
                            await this.request(`/v0/agents/${backgroundAgentId}/followup`, {
                                method: 'POST',
                                body: {
                                    prompt: {
                                        text: 'Update model'
                                    },
                                    model: modelId
                                }
                            }, 'v0');
                            console.log(`v0 Agent ${backgroundAgentId} model updated to ${modelId}`);
                            return true;
                        } catch (error: any) {
                            console.warn('Failed to update model via v0 API:', error.message);
                        }
                    } else {
                        // Cloud Agents API: пересоздаем агента с новой моделью
                        // Получаем информацию об агенте из настроек
                        const config = vscode.workspace.getConfiguration('cursor-autonomous');
                        const agentConfig = config.get<{ name?: string, description?: string, instructions?: string }>(`agents.${agentId}`, {});
                        
                        if (agentConfig.name && agentConfig.description) {
                            const newAgentId = await this.createOrUpdateBackgroundAgent(
                                agentId,
                                agentConfig.name,
                                agentConfig.description,
                                agentConfig.instructions || agentConfig.description,
                                modelId
                            );
                            if (newAgentId) {
                                return true;
                            }
                        }
                    }
                }
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
                const apiVersion = await this.getApiVersion();
                
                if (apiVersion === 'v0') {
                    // v0 API: используем followup для отправки сообщения
                    const requestBody: any = {
                        prompt: {
                            text: message
                        }
                    };
                    
                    if (modelId) {
                        requestBody.model = modelId;
                    }
                    
                    const response = await this.request<{ response?: string, messages?: Array<{text: string}> }>(`/v0/agents/${backgroundAgentId}/followup`, {
                        method: 'POST',
                        body: requestBody
                    }, 'v0');
                    
                    // Парсим ответ из разных возможных форматов
                    if (response.response) {
                        return response.response;
                    } else if (response.messages && response.messages.length > 0) {
                        return response.messages[response.messages.length - 1].text;
                    }
                } else {
                    // Cloud Agents API: используем conversation endpoint
                    const requestBody: any = { message: message };
                    
                    const response = await this.request<{ response: string }>(`/cloud-agents/${backgroundAgentId}/conversation`, {
                        method: 'POST',
                        body: requestBody
                    }, 'cloud-agents');
                    
                    return response.response || '';
                }
            } catch (error: any) {
                console.warn(`Failed to send message via background agent ${backgroundAgentId}:`, error.message);
                // Продолжаем с fallback
            }
        }

        // Последний fallback: выбрасываем ошибку вместо возврата заглушки
        // Это позволит агентам правильно обработать отсутствие ответа от API
        throw new Error(`Failed to send message to agent ${agentId}. Background agent not available and no fallback method succeeded.`);
    }

    /**
     * Получение статуса агента
     */
    static async getAgentStatus(agentId: string): Promise<'active' | 'inactive' | 'error'> {
        if (this.isInitialized) {
            try {
                const apiVersion = await this.getApiVersion();
                const backgroundAgentId = this.backgroundAgentIds.get(agentId) || 
                    vscode.workspace.getConfiguration('cursor-autonomous').get<string>(`agents.${agentId}.backgroundAgentId`);
                
                if (backgroundAgentId) {
                    if (apiVersion === 'v0') {
                        // v0 API: получаем статус через /v0/agents/{id}
                        const response = await this.request<{ status?: string; model?: string }>(`/v0/agents/${backgroundAgentId}`, {}, 'v0');
                        if (response.status) {
                            const status = response.status.toLowerCase();
                            // Логируем информацию о модели, если она есть в ответе
                            if (response.model) {
                                console.log(`Agent ${agentId} (${backgroundAgentId}) status: ${status}, model: ${response.model}`);
                            }
                            if (status === 'running' || status === 'active') return 'active';
                            if (status === 'failed' || status === 'error') return 'error';
                            return 'inactive';
                        }
                    } else {
                        // Cloud Agents API: используем /cloud-agents/status/{id}
                        const response = await this.request<{ status?: string; model?: string }>(`/cloud-agents/status/${backgroundAgentId}`, {}, 'cloud-agents');
                        if (response.status) {
                            const status = response.status.toLowerCase();
                            // Логируем информацию о модели, если она есть в ответе
                            if (response.model) {
                                console.log(`Agent ${agentId} (${backgroundAgentId}) status: ${status}, model: ${response.model}`);
                            }
                            if (status === 'running' || status === 'active') return 'active';
                            if (status === 'failed' || status === 'error') return 'error';
                            return 'inactive';
                        }
                    }
                }
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
     * Получение информации о назначенной модели агента
     */
    static async getAgentModelInfo(agentId: string): Promise<{ model?: string; status?: string } | null> {
        if (this.isInitialized) {
            try {
                const apiVersion = await this.getApiVersion();
                const backgroundAgentId = this.backgroundAgentIds.get(agentId) || 
                    vscode.workspace.getConfiguration('cursor-autonomous').get<string>(`agents.${agentId}.backgroundAgentId`);
                
                if (backgroundAgentId) {
                    if (apiVersion === 'v0') {
                        const response = await this.request<{ model?: string; status?: string }>(`/v0/agents/${backgroundAgentId}`, {}, 'v0');
                        return response || null;
                    } else {
                        const response = await this.request<{ model?: string; status?: string }>(`/cloud-agents/status/${backgroundAgentId}`, {}, 'cloud-agents');
                        return response || null;
                    }
                }
            } catch (error: any) {
                console.debug(`Failed to get model info for agent ${agentId}:`, error.message);
            }
        }
        return null;
    }

    /**
     * Получение списка фоновых агентов
     */
    static async listBackgroundAgents(): Promise<any[]> {
        if (this.isInitialized) {
            try {
                const apiVersion = await this.getApiVersion();
                
                if (apiVersion === 'v0') {
                    // v0 API не имеет endpoint для списка агентов, возвращаем пустой массив
                    return [];
                } else {
                    // Cloud Agents API может иметь endpoint для списка, но он не документирован
                    // Возвращаем пустой массив
                    return [];
                }
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
                const apiVersion = await this.getApiVersion();
                
                if (apiVersion === 'v0') {
                    const response = await this.request<any>(`/v0/agents/${agentId}`, {
                        method: 'GET'
                    }, 'v0');
                    return response;
                } else {
                    // Cloud Agents API: используем status endpoint
                    const response = await this.request<any>(`/cloud-agents/status/${agentId}`, {
                        method: 'GET'
                    }, 'cloud-agents');
                    return response;
                }
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
                const apiVersion = await this.getApiVersion();
                
                if (apiVersion === 'v0') {
                    // v0 API: используем POST /v0/agents для создания агента
                    // Если агент существует и указана модель, отправляем followup для обновления модели
                    // Если модель не указана (undefined), не обновляем - используем режим auto
                    if (existingBackgroundAgentId && modelId) {
                        try {
                            // Отправляем followup с новой моделью только если модель указана
                            await this.request<any>(`/v0/agents/${existingBackgroundAgentId}/followup`, {
                                method: 'POST',
                                body: {
                                    prompt: {
                                        text: instructions
                                    },
                                    model: modelId
                                }
                            }, 'v0');
                            
                            console.log(`✅ v0 Agent ${existingBackgroundAgentId} model updated:`);
                            console.log(`   - Agent ID: ${existingBackgroundAgentId}`);
                            console.log(`   - Local Agent ID: ${agentId}`);
                            console.log(`   - New Model: ${modelId}`);
                            return existingBackgroundAgentId;
                        } catch (error: any) {
                            console.debug(`Failed to update v0 agent model:`, error.message);
                            // Продолжаем создание нового агента
                        }
                    } else if (existingBackgroundAgentId && !modelId) {
                        // Если агент существует, но модель не указана - используем режим auto
                        // Не обновляем агента, просто возвращаем существующий ID
                        console.log(`✅ v0 Agent ${existingBackgroundAgentId} using auto mode:`);
                        console.log(`   - Agent ID: ${existingBackgroundAgentId}`);
                        console.log(`   - Local Agent ID: ${agentId}`);
                        console.log(`   - Model: auto (CursorAI will automatically select model)`);
                        return existingBackgroundAgentId;
                    }
                    
                    // Создаем нового агента через v0 API
                    try {
                        // Формируем тело запроса согласно документации
                        // Для локальной работы репозиторий не требуется
                        const createBody: any = {
                            prompt: {
                                text: instructions || description
                            },
                            target: {
                                autoCreatePr: false
                            }
                        };
                        
                        // Добавляем модель ТОЛЬКО если она явно указана
                        // Если modelId = undefined, не передаем поле model - CursorAI сам выберет модель (режим auto)
                        if (modelId && modelId.trim().length > 0) {
                            createBody.model = modelId;
                            console.log(`Creating v0 agent for ${agentId} with explicit model: ${modelId}`);
                        } else {
                            console.log(`Creating v0 agent for ${agentId} with auto mode (CursorAI will automatically select model)`);
                        }
                        
                        console.log('Creating v0 agent with body:', JSON.stringify(createBody, null, 2));
                        
                        const response = await this.request<{ id: string; status?: string; model?: string }>('/v0/agents', {
                            method: 'POST',
                            body: createBody
                        }, 'v0');
                        
                        if (response && response.id !== undefined && response.id !== null) {
                            // Преобразуем ID в строку для единообразия (handle может быть числом 0, что валидно)
                            const agentIdStr = String(response.id);
                            this.backgroundAgentIds.set(agentId, agentIdStr);
                            
                            // Логируем информацию о созданном агенте
                            const assignedModel = response.model || (modelId ? modelId : 'auto (CursorAI will select)');
                            const agentStatus = response.status || 'unknown';
                            
                            console.log(`✅ v0 Agent created successfully:`);
                            console.log(`   - Agent ID: ${agentIdStr}`);
                            console.log(`   - Local Agent ID: ${agentId}`);
                            console.log(`   - Status: ${agentStatus}`);
                            console.log(`   - Model: ${assignedModel}`);
                            console.log(`   - Instructions: ${(instructions || description).substring(0, 100)}...`);
                            
                            // Сохраняем ID в настройках только для постоянных агентов (не временных)
                            if (!agentId.startsWith('variation-generator-')) {
                                const config = vscode.workspace.getConfiguration('cursor-autonomous');
                                await config.update(`agents.${agentId}.backgroundAgentId`, agentIdStr, vscode.ConfigurationTarget.Global);
                            }
                            
                            return agentIdStr;
                        }
                    } catch (error: any) {
                        console.error(`❌ Failed to create v0 agent for ${agentId}:`, error.message);
                        console.error('Error details:', {
                            agentId,
                            modelId: modelId || 'auto',
                            error: error.message,
                            stack: error.stack
                        });
                    }
                } else {
                    // Cloud Agents API: используем POST /cloud-agents/launch
                    // Cloud Agents запускается для конкретной задачи, поэтому создаем новый каждый раз
                    try {
                        // Для локальной работы репозиторий не требуется
                        const launchBody: any = {
                            instructions: instructions || description
                        };
                        
                        // Добавляем модель ТОЛЬКО если она явно указана
                        // Если modelId = undefined, не передаем поле model_id - CursorAI сам выберет модель (режим auto)
                        if (modelId && modelId.trim().length > 0) {
                            launchBody.model_id = modelId;
                            console.log(`Creating Cloud Agent for ${agentId} with explicit model: ${modelId}`);
                        } else {
                            console.log(`Creating Cloud Agent for ${agentId} with auto mode (CursorAI will automatically select model)`);
                        }
                        
                        console.log('Creating Cloud Agent with body:', JSON.stringify(launchBody, null, 2));
                        
                        const response = await this.request<{ agent_id: string; model?: string; status?: string }>('/cloud-agents/launch', {
                            method: 'POST',
                            body: launchBody
                        }, 'cloud-agents');
                        
                        if (response && response.agent_id !== undefined && response.agent_id !== null) {
                            // Преобразуем ID в строку для единообразия
                            const agentIdStr = String(response.agent_id);
                            this.backgroundAgentIds.set(agentId, agentIdStr);
                            
                            // Логируем информацию о созданном агенте
                            const assignedModel = response.model || (modelId ? modelId : 'auto (CursorAI will select)');
                            const agentStatus = response.status || 'unknown';
                            
                            console.log(`✅ Cloud Agent launched successfully:`);
                            console.log(`   - Agent ID: ${agentIdStr}`);
                            console.log(`   - Local Agent ID: ${agentId}`);
                            console.log(`   - Status: ${agentStatus}`);
                            console.log(`   - Model: ${assignedModel}`);
                            console.log(`   - Instructions: ${(instructions || description).substring(0, 100)}...`);
                            
                            // Сохраняем ID в настройках только для постоянных агентов (не временных)
                            if (!agentId.startsWith('variation-generator-')) {
                                const config = vscode.workspace.getConfiguration('cursor-autonomous');
                                await config.update(`agents.${agentId}.backgroundAgentId`, agentIdStr, vscode.ConfigurationTarget.Global);
                            }
                            
                            return agentIdStr;
                        }
                    } catch (error: any) {
                        console.error(`❌ Failed to launch Cloud Agent for ${agentId}:`, error.message);
                        console.error('Error details:', {
                            agentId,
                            modelId: modelId || 'auto',
                            error: error.message,
                            stack: error.stack
                        });
                    }
                }
            } catch (error: any) {
                console.error('Failed to create/update background agent via API:', error.message);
            }
        }

        // Fallback: сохранение в настройках расширения только для постоянных агентов (не временных)
        if (!agentId.startsWith('variation-generator-') && existingBackgroundAgentId) {
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            await config.update(`agents.${agentId}.backgroundAgentId`, existingBackgroundAgentId, vscode.ConfigurationTarget.Global);
        }
        
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
     * Обновляет кэшированный ключ, если он изменился
     */
    static getApiKey(): string | undefined {
        // Если ключ уже есть, возвращаем его
        if (this.apiKey && this.apiKey.trim().length > 0) {
            return this.apiKey;
        }

        // Пробуем получить из синхронных источников
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const configApiKey = config.get<string>('apiKey');
        // Проверяем, что ключ не пустой
        if (configApiKey && configApiKey.trim().length > 0) {
            this.apiKey = configApiKey.trim();
        }
        
        if (!this.apiKey) {
            const cursorConfig = vscode.workspace.getConfiguration('cursor');
            const cursorApiKey = cursorConfig.get<string>('apiKey') || 
                         cursorConfig.get<string>('api.apiKey') ||
                         cursorConfig.get<string>('auth.apiKey');
            // Проверяем, что ключ не пустой
            if (cursorApiKey && cursorApiKey.trim().length > 0) {
                this.apiKey = cursorApiKey.trim();
            }
        }
        
        if (!this.apiKey && process.env.CURSOR_API_KEY && process.env.CURSOR_API_KEY.trim().length > 0) {
            this.apiKey = process.env.CURSOR_API_KEY.trim();
        }
        
        if (this.apiKey) {
            this.isInitialized = true;
        }
        
        return this.apiKey;
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
