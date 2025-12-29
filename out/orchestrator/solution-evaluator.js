"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolutionEvaluator = void 0;
/**
 * Оценщик решений
 * Оценивает решения по множественным критериям с учетом зависимостей проекта
 */
class SolutionEvaluator {
    constructor(dependencyGraph) {
        this.dependencyGraph = null;
        this.dependencyGraph = dependencyGraph || null;
    }
    /**
     * Установка графа зависимостей
     */
    setDependencyGraph(graph) {
        this.dependencyGraph = graph;
    }
    /**
     * Оценка решения
     */
    async evaluateSolution(solution, projectContext) {
        // Базовые оценки из решения
        const baseEvaluation = solution.evaluation;
        // Анализ влияния на зависимости
        const dependencyImpact = await this.evaluateDependencyImpact(solution, projectContext);
        // Оценка соответствия архитектуре
        const architectureScore = this.evaluateArchitectureCompliance(solution, projectContext);
        // Вычисляем общий балл с учетом всех критериев
        const breakdown = {
            quality: baseEvaluation.quality,
            performance: baseEvaluation.performance,
            security: baseEvaluation.security,
            maintainability: baseEvaluation.maintainability,
            compliance: baseEvaluation.compliance,
            dependencyImpact: dependencyImpact.score,
            architecture: architectureScore
        };
        // Взвешенный общий балл (приоритет - все сразу)
        const score = (breakdown.quality * 0.15 +
            breakdown.performance * 0.15 +
            breakdown.security * 0.15 +
            breakdown.maintainability * 0.15 +
            breakdown.compliance * 0.15 +
            breakdown.dependencyImpact * 0.15 +
            breakdown.architecture * 0.10);
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
     * Сравнение решений
     */
    async compareSolutions(solutions, projectContext) {
        const evaluations = await Promise.all(solutions.map(sol => this.evaluateSolution(sol, projectContext)));
        // Сортируем по общему баллу
        evaluations.sort((a, b) => b.score - a.score);
        // Вычисляем средние значения
        const average = {
            quality: evaluations.reduce((sum, e) => sum + e.breakdown.quality, 0) / evaluations.length,
            performance: evaluations.reduce((sum, e) => sum + e.breakdown.performance, 0) / evaluations.length,
            security: evaluations.reduce((sum, e) => sum + e.breakdown.security, 0) / evaluations.length,
            maintainability: evaluations.reduce((sum, e) => sum + e.breakdown.maintainability, 0) / evaluations.length,
            compliance: evaluations.reduce((sum, e) => sum + e.breakdown.compliance, 0) / evaluations.length
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
    async mergeSolutions(solutions, projectContext) {
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
        // Объединяем лучшие части каждого решения
        const evaluations = await this.compareSolutions(solutions, projectContext);
        const bestSolution = evaluations.best.solution;
        // Объединяем файлы для изменения (уникальные)
        const allFiles = new Set();
        solutions.forEach(sol => {
            sol.solution.filesToModify.forEach(file => allFiles.add(file));
        });
        // Объединяем изменения кода
        const mergedCodeChanges = [];
        const fileChangesMap = new Map();
        solutions.forEach(sol => {
            sol.solution.codeChanges.forEach(change => {
                const existing = fileChangesMap.get(change.file);
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
        const reasoning = `Объединено ${solutions.length} решений. ` +
            `Лучшее решение от ${bestSolution.agentName} использовано как основа. ` +
            `Включены лучшие элементы из всех решений.`;
        return {
            id: `merged-${Date.now()}`,
            title: `Объединенное решение: ${bestSolution.solution.title}`,
            description: `Комбинация лучших элементов из ${solutions.length} решений`,
            approach: bestSolution.solution.approach,
            filesToModify: Array.from(allFiles),
            codeChanges: mergedCodeChanges,
            evaluation: avgEvaluation,
            reasoning,
            sourceSolutions: solutions.map(s => s.id)
        };
    }
    /**
     * Оценка влияния на зависимости
     */
    async evaluateDependencyImpact(solution, projectContext) {
        if (!this.dependencyGraph) {
            // Если граф зависимостей недоступен, возвращаем нейтральную оценку
            return { score: 0.5, analysis: null };
        }
        const changes = solution.solution.filesToModify.map(file => ({
            file,
            type: 'modify'
        }));
        const analysis = this.dependencyGraph.getImpactAnalysis(changes);
        // Оценка: меньше затронутых файлов = лучше
        let score = 1.0;
        if (analysis.totalAffected > 20) {
            score = 0.3;
        }
        else if (analysis.totalAffected > 10) {
            score = 0.5;
        }
        else if (analysis.totalAffected > 5) {
            score = 0.7;
        }
        else if (analysis.totalAffected > 0) {
            score = 0.9;
        }
        // Штраф за высокий уровень влияния
        if (analysis.impactLevel === 'high') {
            score *= 0.7;
        }
        else if (analysis.impactLevel === 'medium') {
            score *= 0.85;
        }
        return { score, analysis };
    }
    /**
     * Оценка соответствия архитектуре
     */
    evaluateArchitectureCompliance(solution, projectContext) {
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
            const matchingPatterns = projectContext.patterns.filter(pattern => solutionText.includes(pattern.toLowerCase()));
            if (matchingPatterns.length > 0) {
                return 0.8;
            }
        }
        return 0.6; // Базовое соответствие
    }
    /**
     * Определение сильных сторон
     */
    identifyStrengths(breakdown) {
        const strengths = [];
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
        return strengths;
    }
    /**
     * Определение слабых сторон
     */
    identifyWeaknesses(breakdown) {
        const weaknesses = [];
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
        return weaknesses;
    }
    /**
     * Генерация рекомендаций
     */
    generateRecommendations(breakdown, solution, projectContext) {
        const recommendations = [];
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
        // Рекомендации на основе рисков решения
        if (solution.solution.dependencies.impact === 'high') {
            recommendations.push('Внимание: высокое влияние на зависимости. Рекомендуется поэтапное внедрение.');
        }
        return recommendations;
    }
}
exports.SolutionEvaluator = SolutionEvaluator;
//# sourceMappingURL=solution-evaluator.js.map