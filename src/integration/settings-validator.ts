import { SettingsData } from '../ui/settings-panel';
import { ModelProviderType } from './model-providers/base-provider';

export interface ValidationError {
    field: string;
    message: string;
}

export class SettingsValidator {
    /**
     * Валидация всех настроек
     */
    static validate(settings: SettingsData): ValidationError[] {
        const errors: ValidationError[] = [];

        // Валидация основных настроек
        errors.push(...this.validateGeneral(settings.general));

        // Валидация провайдеров
        errors.push(...this.validateProviders(settings.providers));

        // Валидация агентов
        errors.push(...this.validateAgents(settings.agents));

        // Валидация оркестратора
        errors.push(...this.validateOrchestrator(settings.orchestrator));

        return errors;
    }

    /**
     * Валидация основных настроек
     */
    private static validateGeneral(general: SettingsData['general']): ValidationError[] {
        const errors: ValidationError[] = [];

        if (general.monitoringInterval < 60000) {
            errors.push({
                field: 'monitoringInterval',
                message: 'Интервал мониторинга должен быть не менее 60000 мс (1 минута)'
            });
        }

        if (general.improvementInterval < 3600000) {
            errors.push({
                field: 'improvementInterval',
                message: 'Интервал улучшения должен быть не менее 3600000 мс (1 час)'
            });
        }

        if (general.virtualUserDecisionThreshold < 0 || general.virtualUserDecisionThreshold > 1) {
            errors.push({
                field: 'virtualUserDecisionThreshold',
                message: 'Порог уверенности должен быть в диапазоне от 0 до 1'
            });
        }

        return errors;
    }

    /**
     * Валидация провайдеров
     */
    private static validateProviders(providers: SettingsData['providers']): ValidationError[] {
        const errors: ValidationError[] = [];

        const cloudProviders: ModelProviderType[] = ['openai', 'google', 'anthropic'];
        const localProviders: ModelProviderType[] = ['ollama', 'llm-studio'];

        for (const [providerType, config] of Object.entries(providers)) {
            if (!config) continue;

            // Проверка облачных провайдеров
            if (cloudProviders.includes(providerType as ModelProviderType)) {
                // API ключ не обязателен - можно сохранить настройки без ключа
                // Ключ будет проверяться только при попытке использовать провайдер
                
                if (config.baseUrl && !this.isValidUrl(config.baseUrl)) {
                    errors.push({
                        field: `providers.${providerType}.baseUrl`,
                        message: `Некорректный URL для провайдера ${providerType}`
                    });
                }
            }

            // Проверка локальных провайдеров
            if (localProviders.includes(providerType as ModelProviderType)) {
                if (config.enabled && config.baseUrl && !this.isValidUrl(config.baseUrl)) {
                    errors.push({
                        field: `providers.${providerType}.baseUrl`,
                        message: `Некорректный URL для провайдера ${providerType}`
                    });
                }
            }
        }

        return errors;
    }

    /**
     * Валидация агентов
     */
    private static validateAgents(agents: SettingsData['agents']): ValidationError[] {
        const errors: ValidationError[] = [];

        for (const [agentId, agentConfig] of Object.entries(agents)) {
            if (!agentConfig || !agentConfig.providerType) {
                continue; // Автоматический выбор - валидация не требуется
            }

            if (agentConfig.temperature !== undefined) {
                if (agentConfig.temperature < 0 || agentConfig.temperature > 2) {
                    errors.push({
                        field: `agents.${agentId}.temperature`,
                        message: `Temperature для агента ${agentId} должен быть в диапазоне от 0 до 2`
                    });
                }
            }

            if (agentConfig.maxTokens !== undefined) {
                if (agentConfig.maxTokens < 1) {
                    errors.push({
                        field: `agents.${agentId}.maxTokens`,
                        message: `Max Tokens для агента ${agentId} должен быть не менее 1`
                    });
                }
            }
        }

        return errors;
    }

    /**
     * Валидация настроек оркестратора
     */
    private static validateOrchestrator(orchestrator: SettingsData['orchestrator']): ValidationError[] {
        const errors: ValidationError[] = [];
        // Настройки оркестратора не требуют валидации (булевы значения)
        return errors;
    }

    /**
     * Проверка валидности URL
     */
    private static isValidUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Получить сообщение об ошибках в читаемом формате
     */
    static formatErrors(errors: ValidationError[]): string {
        if (errors.length === 0) {
            return '';
        }

        return errors.map(e => `${e.field}: ${e.message}`).join('\n');
    }
}
