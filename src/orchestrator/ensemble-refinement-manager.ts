import { Task } from './orchestrator';
import { LocalAgent, AgentSolution, ProjectContext } from '../agents/local-agent';
import { SolutionEvaluator, EvaluationResult } from './solution-evaluator';
import { TaskDeviationController, DeviationResult } from './task-deviation-controller';

/**
 * Предложение по улучшению от модели
 */
export interface ImprovementSuggestion {
    agentId: string;
    agentName: string;
    suggestion: string;
    targetAspect: 'quality' | 'performance' | 'security' | 'maintainability' | 'compliance' | 'taskAlignment';
    confidence: number; // 0-1
    reasoning: string;
    priority: 'low' | 'medium' | 'high';
}

/**
 * Результат ансамблевой доработки
 */
export interface EnsembleRefinementResult {
    originalSolution: AgentSolution;
    refinedSolution: AgentSolution;
    suggestions: ImprovementSuggestion[];
    appliedSuggestions: string[];
    improvementScore: number; // Улучшение оценки (0-1)
    evaluationBefore: EvaluationResult;
    evaluationAfter: EvaluationResult;
    reasoning: string;
}

/**
 * Менеджер ансамблевой доработки решений
 * Координирует доработку решения несколькими моделями
 */
export class EnsembleRefinementManager {
    private solutionEvaluator: SolutionEvaluator;
    private deviationController: TaskDeviationController;

    constructor(
        solutionEvaluator: SolutionEvaluator,
        deviationController: TaskDeviationController
    ) {
        this.solutionEvaluator = solutionEvaluator;
        this.deviationController = deviationController;
    }

    /**
     * Инициация ансамблевой доработки решения
     */
    async initiateEnsembleRefinement(
        solution: AgentSolution,
        originalTask: Task,
        agents: Map<string, LocalAgent>,
        projectContext: ProjectContext
    ): Promise<EnsembleRefinementResult> {
        // Оцениваем исходное решение
        const evaluationBefore = await this.solutionEvaluator.evaluateSolution(solution, projectContext);

        // Выбираем лучших агентов для доработки
        const selectedAgents = this.selectAgentsForRefinement(solution, agents, originalTask);

        // Собираем предложения по улучшению от разных моделей
        const suggestions = await this.collectImprovementSuggestions(
            solution,
            originalTask,
            selectedAgents,
            projectContext
        );

        // Ранжируем и фильтруем предложения
        const rankedSuggestions = this.rankSuggestions(suggestions, evaluationBefore);

        // Консолидируем улучшения в финальное решение
        const refinedSolution = await this.consolidateImprovements(
            solution,
            rankedSuggestions,
            originalTask,
            projectContext
        );

        // Валидируем доработанное решение
        const validation = await this.validateRefinedSolution(refinedSolution, originalTask, projectContext);

        // Оцениваем доработанное решение
        const evaluationAfter = await this.solutionEvaluator.evaluateSolution(refinedSolution, projectContext);

        // Вычисляем улучшение
        const improvementScore = Math.max(0, evaluationAfter.score - evaluationBefore.score);

        // Определяем примененные предложения
        const appliedSuggestions = rankedSuggestions
            .filter(s => s.priority === 'high' || s.confidence > 0.7)
            .map(s => s.suggestion);

        return {
            originalSolution: solution,
            refinedSolution: validation.isValid ? refinedSolution : solution,
            suggestions: rankedSuggestions,
            appliedSuggestions,
            improvementScore,
            evaluationBefore,
            evaluationAfter,
            reasoning: this.generateRefinementReasoning(
                rankedSuggestions,
                improvementScore,
                validation
            )
        };
    }

    /**
     * Сбор предложений по улучшению от разных моделей
     */
    async collectImprovementSuggestions(
        solution: AgentSolution,
        originalTask: Task,
        agents: Map<string, LocalAgent>,
        projectContext: ProjectContext
    ): Promise<ImprovementSuggestion[]> {
        const suggestions: ImprovementSuggestion[] = [];

        // Запускаем сбор предложений параллельно от всех агентов
        const suggestionPromises = Array.from(agents.entries()).map(async ([agentId, agent]) => {
            try {
                const suggestion = await this.getImprovementSuggestion(
                    solution,
                    originalTask,
                    agent,
                    agentId,
                    projectContext
                );
                return suggestion;
            } catch (error) {
                console.error(`Error getting suggestion from agent ${agentId}:`, error);
                return null;
            }
        });

        const results = await Promise.allSettled(suggestionPromises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                suggestions.push(result.value);
            }
        });

        return suggestions;
    }

    /**
     * Получение предложения по улучшению от конкретного агента
     */
    private async getImprovementSuggestion(
        solution: AgentSolution,
        originalTask: Task,
        agent: LocalAgent,
        agentId: string,
        projectContext: ProjectContext
    ): Promise<ImprovementSuggestion | null> {
        // Определяем аспект для улучшения на основе специализации агента
        const targetAspect = this.getTargetAspectForAgent(agentId);

        // Строим промпт для получения предложения
        const prompt = this.buildImprovementPrompt(solution, originalTask, targetAspect);

        try {
            // Используем метод callLLM агента для получения предложения
            const response = await (agent as any).callLLM(prompt);

            // Парсим предложение из ответа
            const suggestion = this.parseImprovementSuggestion(
                response,
                agentId,
                agent.getName(),
                targetAspect
            );

            return suggestion;
        } catch (error) {
            console.error(`Error getting improvement suggestion from ${agentId}:`, error);
            return null;
        }
    }

    /**
     * Определение целевого аспекта для агента
     */
    private getTargetAspectForAgent(agentId: string): ImprovementSuggestion['targetAspect'] {
        const aspectMap: { [key: string]: ImprovementSuggestion['targetAspect'] } = {
            'backend': 'performance',
            'frontend': 'quality',
            'architect': 'maintainability',
            'analyst': 'performance',
            'qa': 'quality',
            'devops': 'security'
        };

        return aspectMap[agentId] || 'quality';
    }

    /**
     * Построение промпта для получения предложения по улучшению
     */
    private buildImprovementPrompt(
        solution: AgentSolution,
        originalTask: Task,
        targetAspect: ImprovementSuggestion['targetAspect']
    ): string {
        const aspectTranslations: { [key: string]: string } = {
            'quality': 'качество кода',
            'performance': 'производительность',
            'security': 'безопасность',
            'maintainability': 'поддерживаемость',
            'compliance': 'соответствие стандартам',
            'taskAlignment': 'соответствие задаче'
        };

        return `Проанализируй следующее решение и предложи конкретные улучшения в области ${aspectTranslations[targetAspect]}:

ИСХОДНАЯ ЗАДАЧА:
${originalTask.description}

РЕШЕНИЕ:
Название: ${solution.solution.title}
Описание: ${solution.solution.description}
Подход: ${solution.solution.approach}

ОЦЕНКА:
- Качество: ${solution.evaluation.quality}
- Производительность: ${solution.evaluation.performance}
- Безопасность: ${solution.evaluation.security}
- Поддерживаемость: ${solution.evaluation.maintainability}
- Соответствие стандартам: ${solution.evaluation.compliance}

Предложи конкретное улучшение в области ${aspectTranslations[targetAspect]}. 
Верни ответ в формате JSON:
{
  "suggestion": "конкретное предложение по улучшению",
  "reasoning": "обоснование предложения",
  "confidence": 0.8,
  "priority": "high"
}`;
    }

    /**
     * Парсинг предложения по улучшению из ответа
     */
    private parseImprovementSuggestion(
        response: string,
        agentId: string,
        agentName: string,
        targetAspect: ImprovementSuggestion['targetAspect']
    ): ImprovementSuggestion {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                return {
                    agentId,
                    agentName,
                    suggestion: parsed.suggestion || 'Улучшить решение',
                    targetAspect,
                    confidence: Math.min(1.0, Math.max(0.0, parsed.confidence || 0.7)),
                    reasoning: parsed.reasoning || 'Предложение от агента',
                    priority: parsed.priority || 'medium'
                };
            }
        } catch (error) {
            console.error('Error parsing improvement suggestion:', error);
        }

        // Fallback
        return {
            agentId,
            agentName,
            suggestion: 'Улучшить решение',
            targetAspect,
            confidence: 0.5,
            reasoning: 'Общее предложение по улучшению',
            priority: 'medium'
        };
    }

    /**
     * Ранжирование предложений
     */
    private rankSuggestions(
        suggestions: ImprovementSuggestion[],
        evaluation: EvaluationResult
    ): ImprovementSuggestion[] {
        return suggestions
            .map(suggestion => {
                // Вычисляем приоритет на основе оценки и уверенности
                let priorityScore = suggestion.confidence;
                
                // Бонус за высокий приоритет
                if (suggestion.priority === 'high') priorityScore += 0.3;
                if (suggestion.priority === 'medium') priorityScore += 0.1;

                // Бонус за аспекты с низкой оценкой
                const aspectScore = evaluation.breakdown[suggestion.targetAspect] || 0.5;
                if (aspectScore < 0.6) priorityScore += 0.2;

                return { ...suggestion, priorityScore };
            })
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .map(({ priorityScore, ...suggestion }) => suggestion);
    }

    /**
     * Консолидация улучшений в финальное решение
     */
    private async consolidateImprovements(
        originalSolution: AgentSolution,
        suggestions: ImprovementSuggestion[],
        originalTask: Task,
        projectContext: ProjectContext
    ): Promise<AgentSolution> {
        // Берем топ-3 предложения
        const topSuggestions = suggestions.slice(0, 3);

        // Создаем описание улучшений
        const improvementsText = topSuggestions
            .map(s => `- [${s.targetAspect}] ${s.suggestion} (${s.reasoning})`)
            .join('\n');

        // Создаем задачу для доработки
        const refinementTask: Task = {
            ...originalTask,
            description: `${originalTask.description}\n\nУЛУЧШЕНИЯ:\n${improvementsText}\n\nТекущее решение: ${originalSolution.solution.title}\n${originalSolution.solution.description}`
        };

        // Используем агента, создавшего исходное решение, для доработки
        // В реальной реализации нужно получить агента по agentId
        // Здесь используем упрощенный подход - создаем новое решение с улучшениями

        const refinedSolution: AgentSolution = {
            ...originalSolution,
            id: `refined-${originalSolution.id}`,
            timestamp: new Date(),
            solution: {
                ...originalSolution.solution,
                description: `${originalSolution.solution.description}\n\nУлучшения:\n${improvementsText}`,
                approach: `${originalSolution.solution.approach}\n\nПрименены улучшения: ${topSuggestions.map(s => s.suggestion).join('; ')}`
            },
            reasoning: `${originalSolution.reasoning}\n\nДоработано на основе предложений: ${topSuggestions.map(s => `${s.agentName}: ${s.suggestion}`).join('; ')}`
        };

        return refinedSolution;
    }

    /**
     * Валидация доработанного решения
     */
    async validateRefinedSolution(
        solution: AgentSolution,
        originalTask: Task,
        projectContext: ProjectContext
    ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Проверяем соответствие исходной задаче
        const deviation = await this.deviationController.checkDeviation(originalTask, solution);
        
        if (deviation.relevance < 0.7) {
            errors.push(`Низкая релевантность решения: ${(deviation.relevance * 100).toFixed(0)}%`);
        }

        if (deviation.missingRequirements.length > 0) {
            warnings.push(`Отсутствуют требования: ${deviation.missingRequirements.slice(0, 2).join(', ')}`);
        }

        // Проверяем, что решение не стало хуже
        const evaluation = await this.solutionEvaluator.evaluateSolution(solution, projectContext);
        
        if (evaluation.score < 0.5) {
            errors.push('Оценка решения слишком низкая');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Выбор агентов для доработки
     */
    private selectAgentsForRefinement(
        solution: AgentSolution,
        agents: Map<string, LocalAgent>,
        originalTask: Task
    ): Map<string, LocalAgent> {
        const selected = new Map<string, LocalAgent>();

        // Выбираем агентов на основе типа задачи и слабых сторон решения
        const weakAspects: string[] = [];
        
        if (solution.evaluation.quality < 0.7) weakAspects.push('qa', 'frontend');
        if (solution.evaluation.performance < 0.7) weakAspects.push('backend', 'analyst');
        if (solution.evaluation.security < 0.7) weakAspects.push('backend', 'devops');
        if (solution.evaluation.maintainability < 0.7) weakAspects.push('architect', 'backend');
        if (solution.evaluation.compliance < 0.7) weakAspects.push('qa', 'architect');

        // Добавляем агентов, соответствующих слабым аспектам
        weakAspects.forEach(agentId => {
            const agent = agents.get(agentId);
            if (agent && !selected.has(agentId)) {
                selected.set(agentId, agent);
            }
        });

        // Если не выбрали никого, берем всех доступных (кроме создателя решения)
        if (selected.size === 0) {
            agents.forEach((agent, agentId) => {
                if (agentId !== solution.agentId) {
                    selected.set(agentId, agent);
                }
            });
        }

        // Ограничиваем количество агентов (максимум 4)
        const selectedArray = Array.from(selected.entries()).slice(0, 4);
        selected.clear();
        selectedArray.forEach(([id, agent]) => selected.set(id, agent));

        return selected;
    }

    /**
     * Генерация обоснования доработки
     */
    private generateRefinementReasoning(
        suggestions: ImprovementSuggestion[],
        improvementScore: number,
        validation: { isValid: boolean; errors: string[]; warnings: string[] }
    ): string {
        const parts: string[] = [];

        parts.push(`Получено ${suggestions.length} предложений по улучшению.`);

        if (improvementScore > 0.1) {
            parts.push(`Оценка решения улучшена на ${(improvementScore * 100).toFixed(1)}%.`);
        }

        if (suggestions.length > 0) {
            const topSuggestion = suggestions[0];
            parts.push(`Лучшее предложение от ${topSuggestion.agentName}: ${topSuggestion.suggestion}`);
        }

        if (!validation.isValid) {
            parts.push(`Внимание: обнаружены проблемы при валидации: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
            parts.push(`Предупреждения: ${validation.warnings.join(', ')}`);
        }

        return parts.join('\n');
    }
}
