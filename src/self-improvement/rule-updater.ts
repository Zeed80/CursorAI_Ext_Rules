import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeSearcher } from './knowledge-searcher';
import { PerformanceMonitor } from './performance-monitor';

export interface RuleUpdate {
    rulePath: string;
    action: 'update' | 'create' | 'delete';
    content?: string;
    reason: string;
}

export class RuleUpdater {
    private context: vscode.ExtensionContext;
    private knowledgeSearcher: KnowledgeSearcher;
    private performanceMonitor: PerformanceMonitor;
    private rulesPath: string;

    constructor(
        context: vscode.ExtensionContext,
        knowledgeSearcher: KnowledgeSearcher,
        performanceMonitor: PerformanceMonitor
    ) {
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
    async analyzeRuleEffectiveness(): Promise<Map<string, number>> {
        const effectiveness = new Map<string, number>();
        
        // Анализ метрик производительности для определения эффективности правил
        const metrics = this.performanceMonitor.getStatistics();
        
        // Связь правил с метриками агентов
        // В реальной реализации это будет более сложный анализ
        
        return effectiveness;
    }

    /**
     * Обновление правил на основе найденной информации
     */
    async updateRulesBasedOnKnowledge(topic: string): Promise<RuleUpdate[]> {
        const updates: RuleUpdate[] = [];

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
    async createNewRules(patterns: string[]): Promise<RuleUpdate[]> {
        const updates: RuleUpdate[] = [];

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
    async removeIneffectiveRules(): Promise<RuleUpdate[]> {
        const updates: RuleUpdate[] = [];
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
    async applyUpdates(updates: RuleUpdate[]): Promise<void> {
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
            } catch (error) {
                console.error(`Error applying update to ${update.rulePath}:`, error);
            }
        }
    }

    private async getCurrentRules(): Promise<string[]> {
        if (!this.rulesPath || !fs.existsSync(this.rulesPath)) {
            return [];
        }

        const rules: string[] = [];
        const files = fs.readdirSync(this.rulesPath, { recursive: true });
        
        for (const file of files) {
            if (typeof file === 'string' && file.endsWith('.mdc')) {
                rules.push(path.join(this.rulesPath, file));
            }
        }

        return rules;
    }

    private findOrCreateRulePath(topic: string): string {
        const fileName = `${topic.toLowerCase().replace(/\s+/g, '-')}.mdc`;
        return path.join(this.rulesPath, 'adaptive', fileName);
    }

    private generateRuleContent(knowledge: any): string {
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

    private async writeRule(rulePath: string, content: string): Promise<void> {
        const dir = path.dirname(rulePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(rulePath, content, 'utf-8');
    }

    private async deleteRule(rulePath: string): Promise<void> {
        if (fs.existsSync(rulePath)) {
            fs.unlinkSync(rulePath);
        }
    }
}
