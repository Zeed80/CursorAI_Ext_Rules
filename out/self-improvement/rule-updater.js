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
exports.RuleUpdater = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class RuleUpdater {
    constructor(context, knowledgeSearcher, performanceMonitor) {
        this.context = context;
        this.knowledgeSearcher = knowledgeSearcher;
        this.performanceMonitor = performanceMonitor;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.rulesPath = workspaceFolder
            ? path.join(workspaceFolder.uri.fsPath, '.cursor', 'rules')
            : '';
    }
    /**
     * Анализ эффективности правил
     */
    async analyzeRuleEffectiveness() {
        const effectiveness = new Map();
        // Анализ метрик производительности для определения эффективности правил
        const metrics = this.performanceMonitor.getStatistics();
        // Связь правил с метриками агентов
        // В реальной реализации это будет более сложный анализ
        return effectiveness;
    }
    /**
     * Обновление правил на основе найденной информации
     */
    async updateRulesBasedOnKnowledge(topic) {
        const updates = [];
        // Поиск лучших практик
        const bestPractices = await this.knowledgeSearcher.searchBestPractices(topic);
        // Анализ текущих правил
        const currentRules = await this.getCurrentRules();
        // Создание обновлений на основе найденной информации
        for (const practice of bestPractices) {
            if (practice.relevance > 0.7) {
                const rulePath = this.findOrCreateRulePath(topic);
                updates.push({
                    rulePath,
                    action: 'update',
                    content: this.generateRuleContent(practice),
                    reason: `Based on best practice: ${practice.title}`
                });
            }
        }
        return updates;
    }
    /**
     * Создание новых правил
     */
    async createNewRules(patterns) {
        const updates = [];
        for (const pattern of patterns) {
            // Поиск информации о паттерне
            const knowledge = await this.knowledgeSearcher.searchBestPractices(pattern);
            if (knowledge.length > 0) {
                const rulePath = path.join(this.rulesPath, 'adaptive', `${pattern.toLowerCase().replace(/\s+/g, '-')}.mdc`);
                updates.push({
                    rulePath,
                    action: 'create',
                    content: this.generateRuleContent(knowledge[0]),
                    reason: `New rule based on pattern: ${pattern}`
                });
            }
        }
        return updates;
    }
    /**
     * Удаление неэффективных правил
     */
    async removeIneffectiveRules() {
        const updates = [];
        const effectiveness = await this.analyzeRuleEffectiveness();
        for (const [rulePath, score] of effectiveness) {
            if (score < 0.3) { // Низкая эффективность
                updates.push({
                    rulePath,
                    action: 'delete',
                    reason: `Low effectiveness score: ${score}`
                });
            }
        }
        return updates;
    }
    /**
     * Применение обновлений правил
     */
    async applyUpdates(updates) {
        for (const update of updates) {
            try {
                switch (update.action) {
                    case 'update':
                    case 'create':
                        if (update.content) {
                            await this.writeRule(update.rulePath, update.content);
                            console.log(`Rule ${update.action}d: ${update.rulePath}`);
                        }
                        break;
                    case 'delete':
                        await this.deleteRule(update.rulePath);
                        console.log(`Rule deleted: ${update.rulePath}`);
                        break;
                }
            }
            catch (error) {
                console.error(`Error applying update to ${update.rulePath}:`, error);
            }
        }
    }
    async getCurrentRules() {
        if (!this.rulesPath || !fs.existsSync(this.rulesPath)) {
            return [];
        }
        const rules = [];
        const files = fs.readdirSync(this.rulesPath, { recursive: true });
        for (const file of files) {
            if (typeof file === 'string' && file.endsWith('.mdc')) {
                rules.push(path.join(this.rulesPath, file));
            }
        }
        return rules;
    }
    findOrCreateRulePath(topic) {
        const fileName = `${topic.toLowerCase().replace(/\s+/g, '-')}.mdc`;
        return path.join(this.rulesPath, 'adaptive', fileName);
    }
    generateRuleContent(knowledge) {
        return `---
name: ${knowledge.title}
description: Rule based on best practice
globs: ["**/*"]
alwaysApply: false
---

# ${knowledge.title}

${knowledge.content}

## Source
${knowledge.source}: ${knowledge.url || 'N/A'}
`;
    }
    async writeRule(rulePath, content) {
        const dir = path.dirname(rulePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(rulePath, content, 'utf-8');
    }
    async deleteRule(rulePath) {
        if (fs.existsSync(rulePath)) {
            fs.unlinkSync(rulePath);
        }
    }
}
exports.RuleUpdater = RuleUpdater;
//# sourceMappingURL=rule-updater.js.map