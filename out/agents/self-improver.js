"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfImprover = void 0;
const performance_monitor_1 = require("../self-improvement/performance-monitor");
const knowledge_searcher_1 = require("../self-improvement/knowledge-searcher");
const rule_updater_1 = require("../self-improvement/rule-updater");
const agent_optimizer_1 = require("../self-improvement/agent-optimizer");
class SelfImprover {
    constructor(context, orchestrator, settingsManager) {
        this.isRunning = false;
        this.context = context;
        this.orchestrator = orchestrator;
        this.settingsManager = settingsManager;
        this.performanceMonitor = new performance_monitor_1.PerformanceMonitor(context, settingsManager);
        this.knowledgeSearcher = new knowledge_searcher_1.KnowledgeSearcher(context, settingsManager);
        this.ruleUpdater = new rule_updater_1.RuleUpdater(context, this.knowledgeSearcher, this.performanceMonitor);
        this.agentOptimizer = new agent_optimizer_1.AgentOptimizer(context, this.performanceMonitor, this.knowledgeSearcher);
    }
    async start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        console.log('Self-Improver started');
        // Первоначальный анализ
        await this.improve();
        // Периодическое самосовершенствование
        const interval = this.settingsManager.improvementInterval;
        this.improvementInterval = setInterval(() => {
            this.improve();
        }, interval);
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.improvementInterval) {
            clearInterval(this.improvementInterval);
            this.improvementInterval = undefined;
        }
        console.log('Self-Improver stopped');
    }
    /**
     * Основной процесс самосовершенствования
     */
    async improve() {
        if (!this.isRunning) {
            return;
        }
        console.log('Self-Improver: Starting improvement cycle...');
        try {
            // 1. Анализ производительности
            const problems = this.performanceMonitor.identifyProblematicPatterns();
            console.log(`Found ${problems.length} problematic patterns`);
            // 2. Поиск знаний для решения проблем
            const improvements = [];
            for (const problem of problems) {
                const solutions = await this.knowledgeSearcher.searchSolutions(problem);
                if (solutions.length > 0) {
                    improvements.push(solutions[0].title);
                }
            }
            // 3. Обновление правил
            await this.updateRules();
            // 4. Оптимизация агентов
            await this.optimizeAgents();
            // 5. Поиск новых подходов
            await this.searchNewApproaches();
            console.log('Self-Improver: Improvement cycle completed');
        }
        catch (error) {
            console.error('Self-Improver: Error in improvement cycle:', error);
        }
    }
    /**
     * Обновление правил
     */
    async updateRules() {
        console.log('Self-Improver: Updating rules...');
        // Анализ эффективности правил
        const effectiveness = await this.ruleUpdater.analyzeRuleEffectiveness();
        // Обновление неэффективных правил
        const ineffectiveRules = await this.ruleUpdater.removeIneffectiveRules();
        if (ineffectiveRules.length > 0) {
            await this.ruleUpdater.applyUpdates(ineffectiveRules);
            console.log(`Removed ${ineffectiveRules.length} ineffective rules`);
        }
        // Поиск новых практик для обновления правил
        const topics = ['code quality', 'error handling', 'security', 'performance'];
        for (const topic of topics) {
            const updates = await this.ruleUpdater.updateRulesBasedOnKnowledge(topic);
            if (updates.length > 0) {
                await this.ruleUpdater.applyUpdates(updates);
                console.log(`Updated rules for topic: ${topic}`);
            }
        }
    }
    /**
     * Оптимизация агентов
     */
    async optimizeAgents() {
        console.log('Self-Improver: Optimizing agents...');
        const agentIds = ['backend', 'frontend', 'architect', 'analyst', 'devops', 'qa'];
        for (const agentId of agentIds) {
            const optimization = await this.agentOptimizer.generateOptimizations(agentId);
            if (optimization.optimizations.length > 0) {
                console.log(`Agent ${agentId}: ${optimization.optimizations.length} optimizations found`);
                console.log(`Expected improvement: ${Math.round(optimization.expectedImprovement * 100)}%`);
                // Применение оптимизаций
                // В реальной реализации это будет обновление промптов и алгоритмов агентов
            }
        }
    }
    /**
     * Поиск новых подходов
     */
    async searchNewApproaches() {
        console.log('Self-Improver: Searching for new approaches...');
        const technologies = ['AI agents', 'autonomous systems', 'self-improving code'];
        for (const tech of technologies) {
            const approaches = await this.knowledgeSearcher.searchNewApproaches(tech);
            if (approaches.length > 0) {
                console.log(`Found ${approaches.length} new approaches for ${tech}`);
                // Анализ и применение новых подходов
                // В реальной реализации это будет более сложная логика
            }
        }
    }
    isRunningState() {
        return this.isRunning;
    }
    dispose() {
        this.stop();
    }
}
exports.SelfImprover = SelfImprover;
//# sourceMappingURL=self-improver.js.map