/**
 * Инициализатор провайдеров моделей
 * Регистрирует все провайдеры в ModelProviderManager
 */

import * as vscode from 'vscode';
import { ModelProviderManager } from './provider-manager';
import { CursorAIProvider } from './cursorai-provider';
import { OpenAIProvider } from './openai-provider';
import { GoogleProvider } from './google-provider';
import { AnthropicProvider } from './anthropic-provider';
import { OllamaProvider } from './ollama-provider';
import { LLMStudioProvider } from './llm-studio-provider';
import { ProviderConfig } from './base-provider';
import { SettingsManager } from '../settings-manager';
import { CursorAPI } from '../cursor-api';

export class ProvidersInitializer {
    /**
     * Инициализация всех провайдеров
     */
    static async initialize(context: vscode.ExtensionContext): Promise<void> {
        const manager = ModelProviderManager.getInstance();
        const settingsManager = new SettingsManager();

        // Получаем глобальные настройки провайдеров
        const providersConfig = vscode.workspace.getConfiguration('cursor-autonomous').get<{
            [key: string]: any;
        }>('providers', {});

        // Регистрируем CursorAI провайдер
        if (providersConfig.cursorai?.enabled !== false) {
            // Приоритет: providersConfig.cursorai.apiKey > общий apiKey
            const cursorApiKey = providersConfig.cursorai?.apiKey || settingsManager.getSetting<string>('apiKey', '');
            
            const cursorAIConfig: ProviderConfig = {
                apiKey: cursorApiKey,
                baseUrl: providersConfig.cursorai?.baseUrl || 'https://api.cursor.com'
            };
            
            // Инициализируем CursorAPI если есть API ключ
            if (cursorApiKey) {
                CursorAPI.initialize(cursorApiKey, cursorAIConfig.baseUrl);
            }
            
            const cursorAIProvider = new CursorAIProvider(cursorAIConfig, 'default');
            manager.registerProvider(cursorAIProvider);
            console.log('ProvidersInitializer: CursorAI provider registered with API key:', cursorApiKey ? 'present' : 'missing');
        }

        // Регистрируем OpenAI провайдер
        if (providersConfig.openai) {
            const openAIConfig: ProviderConfig = {
                apiKey: providersConfig.openai.apiKey,
                baseUrl: providersConfig.openai.baseUrl || 'https://api.openai.com/v1',
                timeout: 60000
            };
            if (openAIConfig.apiKey) {
                const openAIProvider = new OpenAIProvider(openAIConfig);
                manager.registerProvider(openAIProvider);
                console.log('ProvidersInitializer: OpenAI provider registered');
            }
        }

        // Регистрируем Google провайдер
        if (providersConfig.google) {
            const googleConfig: ProviderConfig = {
                apiKey: providersConfig.google.apiKey,
                baseUrl: providersConfig.google.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
                timeout: 60000
            };
            if (googleConfig.apiKey) {
                const googleProvider = new GoogleProvider(googleConfig);
                manager.registerProvider(googleProvider);
                console.log('ProvidersInitializer: Google provider registered');
            }
        }

        // Регистрируем Anthropic провайдер
        if (providersConfig.anthropic) {
            const anthropicConfig: ProviderConfig = {
                apiKey: providersConfig.anthropic.apiKey,
                baseUrl: providersConfig.anthropic.baseUrl || 'https://api.anthropic.com/v1',
                timeout: 60000
            };
            if (anthropicConfig.apiKey) {
                const anthropicProvider = new AnthropicProvider(anthropicConfig);
                manager.registerProvider(anthropicProvider);
                console.log('ProvidersInitializer: Anthropic provider registered');
            }
        }

        // Регистрируем Ollama провайдер (всегда, даже если не включен)
        // Это нужно для возможности проверки подключения в настройках
        const ollamaConfig: ProviderConfig = {
            baseUrl: providersConfig.ollama?.baseUrl || 'http://localhost:11434',
            timeout: 120000,
            enabled: providersConfig.ollama?.enabled !== false
        };
        const ollamaProvider = new OllamaProvider(ollamaConfig);
        manager.registerProvider(ollamaProvider);
        console.log('ProvidersInitializer: Ollama provider registered with baseUrl:', ollamaConfig.baseUrl);

        // Регистрируем LLM Studio провайдер (всегда, даже если не включен)
        const llmStudioConfig: ProviderConfig = {
            baseUrl: providersConfig['llm-studio']?.baseUrl || 'http://localhost:1234/v1',
            timeout: 120000,
            enabled: providersConfig['llm-studio']?.enabled !== false
        };
        const llmStudioProvider = new LLMStudioProvider(llmStudioConfig);
        manager.registerProvider(llmStudioProvider);
        console.log('ProvidersInitializer: LLM Studio provider registered with baseUrl:', llmStudioConfig.baseUrl);

        // Устанавливаем провайдер по умолчанию
        const defaultProvider = providersConfig.defaultProvider || 'cursorai';
        manager.setDefaultProvider(defaultProvider as any);

        console.log(`ProvidersInitializer: All providers initialized. Default: ${defaultProvider}`);
    }
}
