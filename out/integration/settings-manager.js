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
exports.SettingsManager = void 0;
const vscode = __importStar(require("vscode"));
class SettingsManager {
    constructor() {
        this.config = vscode.workspace.getConfiguration('cursor-autonomous');
    }
    getSetting(key, defaultValue) {
        return this.config.get(key, defaultValue);
    }
    async updateSetting(key, value) {
        await this.config.update(key, value, vscode.ConfigurationTarget.Global);
        this.config = vscode.workspace.getConfiguration('cursor-autonomous');
    }
    get enableVirtualUser() {
        return this.getSetting('enableVirtualUser', false);
    }
    get autoImprove() {
        return this.getSetting('autoImprove', true);
    }
    get improvementInterval() {
        return this.getSetting('improvementInterval', 86400000);
    }
    get virtualUserDecisionThreshold() {
        return this.getSetting('virtualUserDecisionThreshold', 0.7);
    }
    get monitoringInterval() {
        return this.getSetting('monitoringInterval', 300000);
    }
    get enableOrchestrator() {
        return this.getSetting('enableOrchestrator', true);
    }
    /**
     * Получение выбранной модели для агента
     */
    getAgentModel(agentId) {
        const agentsConfig = this.config.get('agents', {});
        return agentsConfig[agentId]?.selectedModel;
    }
    /**
     * Установка модели для агента
     */
    async setAgentModel(agentId, model) {
        const agentsConfig = this.config.get('agents', {});
        if (!agentsConfig[agentId]) {
            agentsConfig[agentId] = {};
        }
        if (model) {
            agentsConfig[agentId].selectedModel = model;
        }
        else {
            delete agentsConfig[agentId].selectedModel;
        }
        await this.config.update('agents', agentsConfig, vscode.ConfigurationTarget.Global);
        this.config = vscode.workspace.getConfiguration('cursor-autonomous');
    }
}
exports.SettingsManager = SettingsManager;
//# sourceMappingURL=settings-manager.js.map