import * as vscode from 'vscode';
import { PerformanceMonitor, AgentMetrics } from './performance-monitor';
import { KnowledgeSearcher } from './knowledge-searcher';

export interface AgentOptimization {
    agentId: string;
    optimizations: string[];
    expectedImprovement: number; // 0-1
}

export class AgentOptimizer {
    private context: vscode.ExtensionContext;
    private performanceMonitor: PerformanceMonitor;
    private knowledgeSearcher: KnowledgeSearcher;

    constructor(
        context: vscode.ExtensionContext,
        performanceMonitor: PerformanceMonitor,
        knowledgeSearcher: KnowledgeSearcher
    ) {
        this.context = context;
        this.performanceMonitor = performanceMonitor;
        this.knowledgeSearcher = knowledgeSearcher;
    }

    /**
     * Оптимизация промптов агентов
     */
    async optimizePrompts(agentId: string): Promise<string[]> {
        const optimizations: string[] = [];
        const metrics = this.performanceMonitor.getAgentMetrics(agentId);

        if (!metrics) {
            return optimizations;
        }

        // Анализ проблемных метрик
        if (metrics.successRate < 0.7) {
            // Поиск лучших практик для улучшения успешности
            const bestPractices = await this.knowledgeSearcher.searchBestPractices(
                `${agentId} agent prompt optimization`
            );
            
            if (bestPractices.length > 0) {
                optimizations.push(`Update prompt based on: ${bestPractices[0].title}`);
            }
        }

        if (metrics.codeQuality < 0.7) {
            // Поиск практик для улучшения качества кода
            const practices = await this.knowledgeSearcher.searchBestPractices(
                `${agentId} code quality improvement`
            );
            
            if (practices.length > 0) {
                optimizations.push(`Improve code quality guidelines: ${practices[0].title}`);
            }
        }

        return optimizations;
    }

    /**
     * Улучшение алгоритмов работы
     */
    async improveAlgorithms(agentId: string): Promise<string[]> {
        const improvements: string[] = [];
        const metrics = this.performanceMonitor.getAgentMetrics(agentId);

        if (!metrics) {
            return improvements;
        }

        // Оптимизация производительности
        if (metrics.averageExecutionTime > 30000) { // > 30 секунд
            const solutions = await this.knowledgeSearcher.searchSolutions(
                `${agentId} performance optimization`
            );
            
            if (solutions.length > 0) {
                improvements.push(`Optimize execution time: ${solutions[0].title}`);
            }
        }

        // Улучшение обработки ошибок
        if (metrics.errorCount > 5) {
            const solutions = await this.knowledgeSearcher.searchSolutions(
                `${agentId} error handling improvement`
            );
            
            if (solutions.length > 0) {
                improvements.push(`Improve error handling: ${solutions[0].title}`);
            }
        }

        return improvements;
    }

    /**
     * Адаптация под специфику проекта
     */
    async adaptToProject(agentId: string): Promise<string[]> {
        const adaptations: string[] = [];

        // Анализ проекта для адаптации
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return adaptations;
        }

        // Определение технологий проекта
        const technologies = await this.detectProjectTechnologies();
        
        for (const tech of technologies) {
            // Поиск специфичных практик для технологии
            const practices = await this.knowledgeSearcher.searchBestPractices(
                `${agentId} ${tech} best practices`
            );
            
            if (practices.length > 0) {
                adaptations.push(`Adapt for ${tech}: ${practices[0].title}`);
            }
        }

        return adaptations;
    }

    /**
     * Оптимизация взаимодействия между агентами
     */
    async optimizeAgentInteraction(): Promise<string[]> {
        const optimizations: string[] = [];

        // Анализ метрик всех агентов
        const metrics = this.performanceMonitor.getStatistics();
        const problems = this.performanceMonitor.identifyProblematicPatterns();

        // Поиск решений для проблем взаимодействия
        for (const problem of problems) {
            const solutions = await this.knowledgeSearcher.searchSolutions(problem);
            
            if (solutions.length > 0) {
                optimizations.push(`Fix interaction issue: ${solutions[0].title}`);
            }
        }

        return optimizations;
    }

    /**
     * Генерация оптимизаций для агента
     */
    async generateOptimizations(agentId: string): Promise<AgentOptimization> {
        const optimizations: string[] = [];

        // Оптимизация промптов
        const promptOpts = await this.optimizePrompts(agentId);
        optimizations.push(...promptOpts);

        // Улучшение алгоритмов
        const algoOpts = await this.improveAlgorithms(agentId);
        optimizations.push(...algoOpts);

        // Адаптация под проект
        const adaptOpts = await this.adaptToProject(agentId);
        optimizations.push(...adaptOpts);

        // Оценка ожидаемого улучшения
        const expectedImprovement = this.estimateImprovement(agentId, optimizations.length);

        return {
            agentId,
            optimizations,
            expectedImprovement
        };
    }

    private async detectProjectTechnologies(): Promise<string[]> {
        const technologies: string[] = [];
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (!workspaceFolder) {
            return technologies;
        }

        // Проверка package.json для Node.js проектов
        const packageJson = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
        try {
            const content = await vscode.workspace.fs.readFile(packageJson);
            const data = JSON.parse(Buffer.from(content).toString('utf-8'));
            technologies.push('Node.js');
            
            if (data.dependencies?.react) technologies.push('React');
            if (data.dependencies?.vue) technologies.push('Vue');
            if (data.dependencies?.['@angular/core']) technologies.push('Angular');
        } catch (error) {
            // Файл не существует
        }

        // Проверка composer.json для PHP проектов
        const composerJson = vscode.Uri.joinPath(workspaceFolder.uri, 'composer.json');
        try {
            const content = await vscode.workspace.fs.readFile(composerJson);
            const data = JSON.parse(Buffer.from(content).toString('utf-8'));
            technologies.push('PHP');
            
            if (data.require?.['laravel/framework']) technologies.push('Laravel');
            if (data.require?.['symfony/symfony']) technologies.push('Symfony');
        } catch (error) {
            // Файл не существует
        }

        return technologies;
    }

    private estimateImprovement(agentId: string, optimizationCount: number): number {
        // Простая оценка улучшения на основе количества оптимизаций
        const baseImprovement = Math.min(0.3, optimizationCount * 0.1);
        
        const metrics = this.performanceMonitor.getAgentMetrics(agentId);
        if (metrics) {
            // Чем хуже текущие метрики, тем больше потенциал улучшения
            const currentScore = (metrics.successRate + metrics.codeQuality) / 2;
            const potentialImprovement = (1 - currentScore) * 0.5;
            
            return Math.min(1, baseImprovement + potentialImprovement);
        }

        return baseImprovement;
    }
}
