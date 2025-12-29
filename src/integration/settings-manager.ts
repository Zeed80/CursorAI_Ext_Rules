import * as vscode from 'vscode';
import { LanguageModelInfo } from './model-provider';

export class SettingsManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('cursor-autonomous');
    }

    getSetting<T>(key: string, defaultValue: T): T {
        return this.config.get<T>(key, defaultValue);
    }

    async updateSetting(key: string, value: any): Promise<void> {
        await this.config.update(key, value, vscode.ConfigurationTarget.Global);
        this.config = vscode.workspace.getConfiguration('cursor-autonomous');
    }

    get enableVirtualUser(): boolean {
        return this.getSetting<boolean>('enableVirtualUser', false);
    }

    get autoImprove(): boolean {
        return this.getSetting<boolean>('autoImprove', true);
    }

    get improvementInterval(): number {
        return this.getSetting<number>('improvementInterval', 86400000);
    }

    get virtualUserDecisionThreshold(): number {
        return this.getSetting<number>('virtualUserDecisionThreshold', 0.7);
    }

    get monitoringInterval(): number {
        return this.getSetting<number>('monitoringInterval', 300000);
    }

    get enableOrchestrator(): boolean {
        return this.getSetting<boolean>('enableOrchestrator', true);
    }

    /**
     * Получение выбранной модели для агента
     * Восстанавливает объект LanguageModelInfo из сохраненного modelId
     */
    async getAgentModel(agentId: string): Promise<LanguageModelInfo | undefined> {
        const agentsConfig = this.config.get<{ [key: string]: { selectedModelId?: string } }>('agents', {});
        const modelId = agentsConfig[agentId]?.selectedModelId;
        
        if (!modelId) {
            return undefined;
        }

        // Восстанавливаем объект модели из modelId
        try {
            const { ModelProvider } = await import('./model-provider');
            const model = await ModelProvider.getModelById(modelId);
            return model;
        } catch (error) {
            console.warn(`Failed to restore model for agent ${agentId} from modelId ${modelId}:`, error);
            // Возвращаем минимальный объект с modelId
            return { id: modelId };
        }
    }

    /**
     * Синхронная версия getAgentModel (для обратной совместимости)
     * Возвращает только modelId, если нужно полный объект - используйте async версию
     */
    getAgentModelSync(agentId: string): string | undefined {
        const agentsConfig = this.config.get<{ [key: string]: { selectedModelId?: string } }>('agents', {});
        return agentsConfig[agentId]?.selectedModelId;
    }

    /**
     * Установка модели для агента
     * Сохраняет только modelId (строку) вместо всего объекта для совместимости с VS Code Settings Tree
     */
    async setAgentModel(agentId: string, model: LanguageModelInfo | undefined): Promise<void> {
        const agentsConfig = this.config.get<{ [key: string]: { selectedModelId?: string } }>('agents', {});
        
        if (!agentsConfig[agentId]) {
            agentsConfig[agentId] = {};
        }

        if (model && model.id) {
            // Сохраняем только modelId (строку) для совместимости с VS Code Settings Tree
            agentsConfig[agentId].selectedModelId = model.id;
        } else {
            // Удаляем модель (автоматический выбор)
            delete agentsConfig[agentId].selectedModelId;
        }

        // Обновляем настройки - сохраняем только примитивные значения
        await this.config.update('agents', agentsConfig, vscode.ConfigurationTarget.Global);
        this.config = vscode.workspace.getConfiguration('cursor-autonomous');
    }
}
