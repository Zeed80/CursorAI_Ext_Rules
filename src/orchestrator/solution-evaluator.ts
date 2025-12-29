import { AgentSolution } from '../agents/local-agent';
import { ProjectContext } from '../agents/local-agent';
import { ProjectDependencyGraph, ImpactAnalysis } from './project-dependency-graph';
import { Task } from './orchestrator';
import { TaskDeviationController } from './task-deviation-controller';

/**
 * Результат оценки решения
 */
export interface EvaluationResult {
    solution: AgentSolution;
    score: number; // 0-1
    breakdown: {
        quality: number;
        performance: number;
        security: number;
        maintainability: number;
        compliance: number;
        dependencyImpact: number;
        architecture: number;
        taskAlignment: number; // Соответствие исходной задаче
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

/**
 * Ранжированные решения
 */
export interface RankedSolutions {
    solutions: EvaluationResult[];
    best: EvaluationResult;
    worst: EvaluationResult;
    average: {
        quality: number;
        performance: number;
        security: number;
        maintainability: number;
        compliance: number;
    };
}

/**
 * Объединенное решение
 */
export interface MergedSolution {
    id: string;
    title: string;
    description: string;
    approach: string;
    filesToModify: string[];
    codeChanges: AgentSolution['solution']['codeChanges'];
    evaluation: {
        quality: number;
        performance: number;
        security: number;
        maintainability: number;
        compliance: number;
        overallScore: number;
    };
    reasoning: string;
    sourceSolutions: string[]; // IDs исходных решений
}

/**
 * Оценщик решений
 * Оценивает решения по множественным критериям с учетом зависимостей проекта
 */
export class SolutionEvaluator {
    private dependencyGraph: ProjectDependencyGraph | null = null;
    private taskDeviationController: TaskDeviationController | null = null;

    constructor(dependencyGraph?: ProjectDependencyGraph, taskDeviationController?: TaskDeviationController) {
        this.dependencyGraph = dependencyGraph || null;
        this.taskDeviationController = taskDeviationController || null;
    }

    /**
     * Установка контроллера отклонения
     */
    setTaskDeviationController(controller: TaskDeviationController): void {
        this.taskDeviationController = controller;
    }

    /**
     * Установка графа зависимостей
     */
    setDependencyGraph(graph: ProjectDependencyGraph): void {
        this.dependencyGraph = graph;
    }

    /**
     * Оценка решения
     */
    async evaluateSolution(
        solution: AgentSolution,
        projectContext: ProjectContext,
        originalTask?: Task
    ): Promise<EvaluationResult> {
        // Базовые оценки из решения
        const baseEvaluation = solution.evaluation;

        // Анализ влияния на зависимости
        const dependencyImpact = await this.evaluateDependencyImpact(solution, projectContext);

        // Оценка соответствия архитектуре
        const architectureScore = this.evaluateArchitectureCompliance(solution, projectContext);

        // Оценка соответствия исходной задаче
        const taskAlignment = originalTask && this.taskDeviationController
            ? await this.evaluateTaskAlignment(solution, originalTask)
            : 0.5; // Нейтральная оценка, если задача не предоставлена

        // Вычисляем общий балл с учетом всех критериев
        const breakdown = {
            quality: baseEvaluation.quality,
            performance: baseEvaluation.performance,
            security: baseEvaluation.security,
            maintainability: baseEvaluation.maintainability,
            compliance: baseEvaluation.compliance,
            dependencyImpact: dependencyImpact.score,
            architecture: architectureScore,
            taskAlignment
        };

        // Взвешенный общий балл (приоритет - все сразу, taskAlignment имеет больший вес)
        const score = (
            breakdown.quality * 0.13 +
            breakdown.performance * 0.13 +
            breakdown.security * 0.13 +
            breakdown.maintainability * 0.13 +
            breakdown.compliance * 0.13 +
            breakdown.dependencyImpact * 0.13 +
            breakdown.architecture * 0.09 +
            breakdown.taskAlignment * 0.13 // Важный критерий
        );

        // Определяем сильные и слабые стороны
        const strengths = this.identifyStrengths(breakdown);
        const weaknesses = this.identifyWeaknesses(breakdown);
        const recommendations = this.generateRecommendations(breakdown, solution, projectContext);

        return {
            solution,
            score,
            breakdown,
            strengths,
            weaknesses,
            recommendations
        };
    }

    /**
     * Оценка соответствия решения исходной задаче
     */
    async evaluateTaskAlignment(solution: AgentSolution, originalTask: Task): Promise<number> {
        if (!this.taskDeviationController) {
            return 0.5; // Нейтральная оценка
        }

        try {
            const deviation = await this.taskDeviationController.checkDeviation(originalTask, solution);
            return deviation.relevance;
        } catch (error) {
            console.error('Error evaluating task alignment:', error);
            return 0.5;
        }
    }

    /**
     * Сравнение решений
     */
    async compareSolutions(
        solutions: AgentSolution[],
        projectContext: ProjectContext,
        originalTask?: Task
    ): Promise<RankedSolutions> {
        const evaluations = await Promise.all(
            solutions.map(sol => this.evaluateSolution(sol, projectContext, originalTask))
        );

        // Сортируем по общему баллу
        evaluations.sort((a, b) => b.score - a.score);

        // Вычисляем средние значения
        const average = {
            quality: evaluations.reduce((sum, e) => sum + e.breakdown.quality, 0) / evaluations.length,
            performance: evaluations.reduce((sum, e) => sum + e.breakdown.performance, 0) / evaluations.length,
            security: evaluations.reduce((sum, e) => sum + e.breakdown.security, 0) / evaluations.length,
            maintainability: evaluations.reduce((sum, e) => sum + e.breakdown.maintainability, 0) / evaluations.length,
            compliance: evaluations.reduce((sum, e) => sum + e.breakdown.compliance, 0) / evaluations.length,
            taskAlignment: evaluations.reduce((sum, e) => sum + e.breakdown.taskAlignment, 0) / evaluations.length
        };

        return {
            solutions: evaluations,
            best: evaluations[0],
            worst: evaluations[evaluations.length - 1],
            average
        };
    }

    /**
     * Объединение решений
     */
    async mergeSolutions(
        solutions: AgentSolution[],
        projectContext: ProjectContext,
        originalTask?: Task
    ): Promise<MergedSolution> {
        if (solutions.length === 0) {
            throw new Error('No solutions to merge');
        }

        if (solutions.length === 1) {
            const sol = solutions[0];
            return {
                id: `merged-${Date.now()}`,
                title: sol.solution.title,
                description: sol.solution.description,
                approach: sol.solution.approach,
                filesToModify: sol.solution.filesToModify,
                codeChanges: sol.solution.codeChanges,
                evaluation: sol.evaluation,
                reasoning: `Использовано единственное решение от ${sol.agentName}`,
                sourceSolutions: [sol.id]
            };
        }

        // Фильтруем решения с низким соответствием задаче, если задача предоставлена
        let solutionsToMerge = solutions;
        if (originalTask && this.taskDeviationController) {
            const deviationChecks = await Promise.all(
                solutions.map(async sol => ({
                    solution: sol,
                    deviation: await this.taskDeviationController!.checkDeviation(originalTask, sol)
                }))
            );

            // Оставляем только релевантные решения
            solutionsToMerge = deviationChecks
                .filter(({ deviation }) => deviation.relevance >= 0.5 && deviation.deviationLevel !== 'high')
                .map(({ solution }) => solution);

            // Если все решения отфильтрованы, используем исходные
            if (solutionsToMerge.length === 0) {
                console.warn('All solutions filtered out during merge, using original solutions');
                solutionsToMerge = solutions;
            }
        }

        // Объединяем лучшие части каждого решения
        const evaluations = await this.compareSolutions(solutionsToMerge, projectContext, originalTask);
        const bestSolution = evaluations.best.solution;

        // Объединяем файлы для изменения (уникальные)
        const allFiles = new Set<string>();
        solutionsToMerge.forEach(sol => {
            sol.solution.filesToModify.forEach(file => allFiles.add(file));
        });

        // Объединяем изменения кода, приоритизируя релевантные решения
        const mergedCodeChanges: AgentSolution['solution']['codeChanges'] = [];
        const fileChangesMap = new Map<string, AgentSolution['solution']['codeChanges'][0]>();
        
        // Сортируем решения по релевантности (если есть проверка отклонений)
        let sortedSolutions = solutionsToMerge;
        if (originalTask && this.taskDeviationController) {
            const solutionsWithRelevance = await Promise.all(
                solutionsToMerge.map(async sol => ({
                    solution: sol,
                    deviation: await this.taskDeviationController!.checkDeviation(originalTask, sol)
                }))
            );
            
            sortedSolutions = solutionsWithRelevance
                .sort((a, b) => b.deviation.relevance - a.deviation.relevance)
                .map(({ solution }) => solution);
        }
        
        sortedSolutions.forEach(sol => {
            sol.solution.codeChanges.forEach(change => {
                const existing = fileChangesMap.get(change.file);
                // Приоритизируем решения с лучшей оценкой и релевантностью
                if (!existing || sol.evaluation.overallScore > bestSolution.evaluation.overallScore) {
                    fileChangesMap.set(change.file, change);
                }
            });
        });

        mergedCodeChanges.push(...Array.from(fileChangesMap.values()));

        // Вычисляем средние оценки
        const avgEvaluation = {
            quality: evaluations.average.quality,
            performance: evaluations.average.performance,
            security: evaluations.average.security,
            maintainability: evaluations.average.maintainability,
            compliance: evaluations.average.compliance,
            overallScore: evaluations.solutions.reduce((sum, e) => sum + e.score, 0) / evaluations.solutions.length
        };

        const reasoning = `Объединено ${solutionsToMerge.length} решений (из ${solutions.length} исходных). ` +
            `Лучшее решение от ${bestSolution.agentName} использовано как основа. ` +
            `Включены лучшие элементы из всех релевантных решений.`;

        return {
            id: `merged-${Date.now()}`,
            title: `Объединенное решение: ${bestSolution.solution.title}`,
            description: `Комбинация лучших элементов из ${solutionsToMerge.length} релевантных решений`,
            approach: bestSolution.solution.approach,
            filesToModify: Array.from(allFiles),
            codeChanges: mergedCodeChanges,
            evaluation: avgEvaluation,
            reasoning,
            sourceSolutions: solutionsToMerge.map(s => s.id)
        };
    }

    /**
     * Оценка влияния на зависимости
     */
    private async evaluateDependencyImpact(
        solution: AgentSolution,
        projectContext: ProjectContext
    ): Promise<{ score: number; analysis: ImpactAnalysis | null }> {
        if (!this.dependencyGraph) {
            // Если граф зависимостей недоступен, возвращаем нейтральную оценку
            return { score: 0.5, analysis: null };
        }

        const changes = solution.solution.filesToModify.map(file => ({
            file,
            type: 'modify' as const
        }));

        const analysis = this.dependencyGraph.getImpactAnalysis(changes);

        // Оценка: меньше затронутых файлов = лучше
        let score = 1.0;
        if (analysis.totalAffected > 20) {
            score = 0.3;
        } else if (analysis.totalAffected > 10) {
            score = 0.5;
        } else if (analysis.totalAffected > 5) {
            score = 0.7;
        } else if (analysis.totalAffected > 0) {
            score = 0.9;
        }

        // Штраф за высокий уровень влияния
        if (analysis.impactLevel === 'high') {
            score *= 0.7;
        } else if (analysis.impactLevel === 'medium') {
            score *= 0.85;
        }

        return { score, analysis };
    }

    /**
     * Оценка соответствия архитектуре
     */
    private evaluateArchitectureCompliance(
        solution: AgentSolution,
        projectContext: ProjectContext
    ): number {
        const architecture = projectContext.standards?.architecture;
        if (!architecture) {
            return 0.5; // Нейтральная оценка, если архитектура не определена
        }

        // Простая эвристика: проверяем, упоминается ли архитектура в описании решения
        const solutionText = `${solution.solution.title} ${solution.solution.description} ${solution.solution.approach}`.toLowerCase();
        const architectureLower = architecture.toLowerCase();

        if (solutionText.includes(architectureLower)) {
            return 0.9;
        }

        // Проверяем соответствие паттернам проекта
        if (projectContext.patterns) {
            const matchingPatterns = projectContext.patterns.filter(pattern =>
                solutionText.includes(pattern.toLowerCase())
            );
            if (matchingPatterns.length > 0) {
                return 0.8;
            }
        }

        return 0.6; // Базовое соответствие
    }

    /**
     * Определение сильных сторон
     */
    private identifyStrengths(breakdown: EvaluationResult['breakdown']): string[] {
        const strengths: string[] = [];

        if (breakdown.quality >= 0.8) {
            strengths.push('Высокое качество кода');
        }
        if (breakdown.performance >= 0.8) {
            strengths.push('Хорошая производительность');
        }
        if (breakdown.security >= 0.8) {
            strengths.push('Высокий уровень безопасности');
        }
        if (breakdown.maintainability >= 0.8) {
            strengths.push('Хорошая поддерживаемость');
        }
        if (breakdown.compliance >= 0.8) {
            strengths.push('Полное соответствие стандартам');
        }
        if (breakdown.dependencyImpact >= 0.8) {
            strengths.push('Минимальное влияние на зависимости');
        }
        if (breakdown.architecture >= 0.8) {
            strengths.push('Соответствие архитектуре проекта');
        }
        if (breakdown.taskAlignment >= 0.8) {
            strengths.push('Высокое соответствие исходной задаче');
        }

        return strengths;
    }

    /**
     * Определение слабых сторон
     */
    private identifyWeaknesses(breakdown: EvaluationResult['breakdown']): string[] {
        const weaknesses: string[] = [];

        if (breakdown.quality < 0.6) {
            weaknesses.push('Низкое качество кода');
        }
        if (breakdown.performance < 0.6) {
            weaknesses.push('Проблемы с производительностью');
        }
        if (breakdown.security < 0.6) {
            weaknesses.push('Потенциальные проблемы безопасности');
        }
        if (breakdown.maintainability < 0.6) {
            weaknesses.push('Сложность поддержки');
        }
        if (breakdown.compliance < 0.6) {
            weaknesses.push('Неполное соответствие стандартам');
        }
        if (breakdown.dependencyImpact < 0.6) {
            weaknesses.push('Высокое влияние на зависимости');
        }
        if (breakdown.architecture < 0.6) {
            weaknesses.push('Несоответствие архитектуре проекта');
        }
        if (breakdown.taskAlignment < 0.6) {
            weaknesses.push('Низкое соответствие исходной задаче');
        }

        return weaknesses;
    }

    /**
     * Генерация рекомендаций
     */
    private generateRecommendations(
        breakdown: EvaluationResult['breakdown'],
        solution: AgentSolution,
        projectContext: ProjectContext
    ): string[] {
        const recommendations: string[] = [];

        if (breakdown.quality < 0.7) {
            recommendations.push('Улучшить качество кода: добавить комментарии, улучшить читаемость');
        }
        if (breakdown.performance < 0.7) {
            recommendations.push('Оптимизировать производительность: проверить алгоритмы, кэширование');
        }
        if (breakdown.security < 0.7) {
            recommendations.push('Усилить безопасность: проверить на уязвимости, использовать безопасные паттерны');
        }
        if (breakdown.maintainability < 0.7) {
            recommendations.push('Улучшить поддерживаемость: упростить структуру, добавить документацию');
        }
        if (breakdown.compliance < 0.7) {
            recommendations.push('Привести в соответствие стандартам проекта');
        }
        if (breakdown.dependencyImpact < 0.7) {
            recommendations.push('Уменьшить влияние на зависимости: пересмотреть архитектуру решения');
        }
        if (breakdown.architecture < 0.7) {
            recommendations.push('Привести в соответствие архитектуре проекта');
        }
        if (breakdown.taskAlignment < 0.7) {
            recommendations.push('Улучшить соответствие исходной задаче: пересмотреть требования и убедиться, что все учтены');
        }

        // Рекомендации на основе рисков решения
        if (solution.solution.dependencies.impact === 'high') {
            recommendations.push('Внимание: высокое влияние на зависимости. Рекомендуется поэтапное внедрение.');
        }

        return recommendations;
    }
}
