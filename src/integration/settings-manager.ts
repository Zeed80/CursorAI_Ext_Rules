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
     */
    getAgentModel(agentId: string): LanguageModelInfo | undefined {
        const agentsConfig = this.config.get<{ [key: string]: { selectedModel?: LanguageModelInfo } }>('agents', {});
        return agentsConfig[agentId]?.selectedModel;
    }

    /**
     * Установка модели для агента
     */
    async setAgentModel(agentId: string, model: LanguageModelInfo | undefined): Promise<void> {
        const agentsConfig = this.config.get<{ [key: string]: { selectedModel?: LanguageModelInfo } }>('agents', {});
        
        if (!agentsConfig[agentId]) {
            agentsConfig[agentId] = {};
        }

        if (model) {
            agentsConfig[agentId].selectedModel = model;
        } else {
            delete agentsConfig[agentId].selectedModel;
        }

        await this.config.update('agents', agentsConfig, vscode.ConfigurationTarget.Global);
        this.config = vscode.workspace.getConfiguration('cursor-autonomous');
    }
}
