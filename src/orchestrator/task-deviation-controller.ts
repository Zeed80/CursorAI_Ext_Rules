import * as vscode from 'vscode';
import { Task } from './orchestrator';
import { AgentSolution } from '../agents/local-agent';
import { CursorAPI } from '../integration/cursor-api';

/**
 * Результат проверки отклонения
 */
export interface DeviationResult {
    hasDeviation: boolean;
    deviationLevel: 'none' | 'low' | 'medium' | 'high';
    relevance: number; // 0-1, релевантность решения исходной задаче
    keyRequirements: string[];
    missingRequirements: string[];
    extraRequirements: string[];
    feedback: string;
    recommendations: string[];
}

/**
 * Контроллер отклонения от задачи
 * Анализирует решения на соответствие исходной задаче
 * и выявляет отклонения от требований
 */
export class TaskDeviationController {
    private readonly RELEVANCE_THRESHOLD = 0.7; // Порог релевантности
    private readonly DEVIATION_THRESHOLD = 0.3; // Порог отклонения

    /**
     * Проверка отклонения решения от исходной задачи
     */
    async checkDeviation(
        originalTask: Task,
        solution: AgentSolution
    ): Promise<DeviationResult> {
        // Извлекаем ключевые требования из исходной задачи
        const keyRequirements = await this.extractKeyRequirements(originalTask);

        // Анализируем решение на соответствие требованиям
        const analysis = await this.analyzeSolutionCompliance(
            originalTask,
            solution,
            keyRequirements
        );

        // Вычисляем релевантность
        const relevance = await this.calculateRelevance(originalTask, solution);

        // Определяем уровень отклонения
        const deviationLevel = this.determineDeviationLevel(
            analysis.missingRequirements.length,
            analysis.extraRequirements.length,
            relevance
        );

        // Генерируем обратную связь
        const feedback = this.generateFeedback(originalTask, solution, analysis, relevance);

        // Генерируем рекомендации
        const recommendations = this.generateRecommendations(analysis, relevance);

        return {
            hasDeviation: deviationLevel !== 'none',
            deviationLevel,
            relevance,
            keyRequirements,
            missingRequirements: analysis.missingRequirements,
            extraRequirements: analysis.extraRequirements,
            feedback,
            recommendations
        };
    }

    /**
     * Извлечение ключевых требований из задачи
     */
    async extractKeyRequirements(task: Task): Promise<string[]> {
        // Проверяем доступность CursorAI Background Agents
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const useCursorAIFor = config.get<string[]>('useCursorAIFor', []);
        const apiKey = config.get<string>('apiKey', '');
        
        // Если CursorAI не настроен или не должен использоваться, сразу используем fallback
        if (!apiKey || useCursorAIFor.includes('never') || useCursorAIFor.length === 0) {
            console.log('TaskDeviationController: Using fallback (CursorAI not configured)');
            return this.extractRequirementsFallback(task);
        }
        
        try {
            // Пытаемся использовать LLM для извлечения ключевых требований
            const extractionAgentId = `requirement-extractor-${Date.now()}`;
            await CursorAPI.createOrUpdateBackgroundAgent(
                extractionAgentId,
                'Извлекатель требований',
                'Специализируется на извлечении ключевых требований из задач',
                'Твоя задача - извлекать ключевые функциональные и технические требования из описания задачи. Верни только список требований, без дополнительных объяснений.',
                undefined
            );

            const prompt = `Извлеки ключевые требования из следующей задачи:

Тип: ${task.type}
Приоритет: ${task.priority}
Описание: ${task.description}

Верни список требований в формате JSON массива:
["требование 1", "требование 2", ...]`;

            const response = await CursorAPI.sendMessageToAgent(extractionAgentId, prompt);
            
            // Парсим требования из ответа
            const requirements = this.parseRequirements(response);
            
            return requirements.length > 0 ? requirements : this.extractRequirementsFallback(task);
        } catch (error) {
            // Используем fallback без громких ошибок
            console.warn('TaskDeviationController: CursorAPI unavailable, using fallback');
            return this.extractRequirementsFallback(task);
        }
    }

    /**
     * Fallback извлечение требований
     */
    private extractRequirementsFallback(task: Task): string[] {
        const requirements: string[] = [];
        
        // Извлекаем ключевые слова из описания
        const description = task.description.toLowerCase();
        
        // Ищем глаголы действия
        const actionVerbs = ['создать', 'добавить', 'реализовать', 'улучшить', 'исправить', 'оптимизировать', 'настроить'];
        actionVerbs.forEach(verb => {
            if (description.includes(verb)) {
                // Извлекаем контекст вокруг глагола
                const index = description.indexOf(verb);
                const context = description.substring(index, index + 100);
                requirements.push(context.trim());
            }
        });

        // Если не нашли, используем весь текст описания как одно требование
        if (requirements.length === 0) {
            requirements.push(task.description);
        }

        return requirements;
    }

    /**
     * Парсинг требований из ответа LLM
     */
    private parseRequirements(response: string): string[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed.filter((req: any) => typeof req === 'string' && req.trim().length > 0);
                }
            }
        } catch (error) {
            console.error('Error parsing requirements:', error);
        }
        return [];
    }

    /**
     * Анализ соответствия решения требованиям
     */
    private async analyzeSolutionCompliance(
        originalTask: Task,
        solution: AgentSolution,
        keyRequirements: string[]
    ): Promise<{
        missingRequirements: string[];
        extraRequirements: string[];
        matchedRequirements: string[];
    }> {
        const solutionText = `${solution.solution.title} ${solution.solution.description} ${solution.solution.approach}`.toLowerCase();
        
        const missingRequirements: string[] = [];
        const matchedRequirements: string[] = [];

        // Проверяем каждое требование
        for (const requirement of keyRequirements) {
            const requirementLower = requirement.toLowerCase();
            
            // Проверяем, упоминается ли требование в решении
            const isMentioned = solutionText.includes(requirementLower) ||
                requirementLower.split(' ').some(word => 
                    word.length > 3 && solutionText.includes(word)
                );

            if (isMentioned) {
                matchedRequirements.push(requirement);
            } else {
                missingRequirements.push(requirement);
            }
        }

        // Определяем дополнительные требования (не упомянутые в исходной задаче)
        const extraRequirements: string[] = [];
        const taskText = originalTask.description.toLowerCase();
        
        // Простая эвристика: если в решении есть упоминания, которых нет в задаче
        const solutionKeywords = solutionText.split(/\s+/).filter(word => word.length > 4);
        solutionKeywords.forEach(keyword => {
            if (!taskText.includes(keyword) && !keyRequirements.some(req => req.toLowerCase().includes(keyword))) {
                // Проверяем, не является ли это просто техническим термином
                const technicalTerms = ['файл', 'код', 'функция', 'класс', 'метод', 'интерфейс'];
                if (!technicalTerms.some(term => keyword.includes(term))) {
                    extraRequirements.push(keyword);
                }
            }
        });

        return {
            missingRequirements,
            extraRequirements: extraRequirements.slice(0, 5), // Ограничиваем количество
            matchedRequirements
        };
    }

    /**
     * Вычисление релевантности решения исходной задаче
     */
    async calculateRelevance(originalTask: Task, solution: AgentSolution): Promise<number> {
        // Базовый расчет на основе совпадения ключевых слов
        const taskWords = new Set(originalTask.description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const solutionText = `${solution.solution.title} ${solution.solution.description} ${solution.solution.approach}`.toLowerCase();
        const solutionWords = new Set(solutionText.split(/\s+/).filter(w => w.length > 3));

        // Вычисляем пересечение
        let intersection = 0;
        taskWords.forEach(word => {
            if (solutionWords.has(word)) {
                intersection++;
            }
        });

        // Jaccard similarity
        const union = taskWords.size + solutionWords.size - intersection;
        const baseSimilarity = union > 0 ? intersection / union : 0;

        // Дополнительные факторы
        let relevance = baseSimilarity;

        // Бонус за соответствие типа задачи
        if (originalTask.type === 'feature' && solution.solution.title.toLowerCase().includes('добавить')) {
            relevance += 0.1;
        }
        if (originalTask.type === 'bug' && solution.solution.title.toLowerCase().includes('исправить')) {
            relevance += 0.1;
        }
        if (originalTask.type === 'improvement' && solution.solution.title.toLowerCase().includes('улучшить')) {
            relevance += 0.1;
        }

        // Штраф за слишком общее решение
        if (solution.solution.description.length < 50) {
            relevance *= 0.8;
        }

        return Math.min(1.0, relevance);
    }

    /**
     * Определение уровня отклонения
     */
    private determineDeviationLevel(
        missingCount: number,
        extraCount: number,
        relevance: number
    ): 'none' | 'low' | 'medium' | 'high' {
        if (relevance >= this.RELEVANCE_THRESHOLD && missingCount === 0 && extraCount === 0) {
            return 'none';
        }

        if (relevance >= this.RELEVANCE_THRESHOLD && missingCount <= 1 && extraCount <= 2) {
            return 'low';
        }

        if (relevance >= 0.5 && missingCount <= 2 && extraCount <= 3) {
            return 'medium';
        }

        return 'high';
    }

    /**
     * Генерация обратной связи
     */
    private generateFeedback(
        originalTask: Task,
        solution: AgentSolution,
        analysis: {
            missingRequirements: string[];
            extraRequirements: string[];
            matchedRequirements: string[];
        },
        relevance: number
    ): string {
        const feedbackParts: string[] = [];

        if (relevance < this.RELEVANCE_THRESHOLD) {
            feedbackParts.push(`Решение имеет низкую релевантность (${(relevance * 100).toFixed(0)}%) к исходной задаче.`);
        }

        if (analysis.missingRequirements.length > 0) {
            feedbackParts.push(`Отсутствуют следующие требования: ${analysis.missingRequirements.slice(0, 3).join(', ')}`);
        }

        if (analysis.extraRequirements.length > 0) {
            feedbackParts.push(`Решение включает дополнительные элементы, не упомянутые в задаче: ${analysis.extraRequirements.slice(0, 3).join(', ')}`);
        }

        if (analysis.matchedRequirements.length > 0) {
            feedbackParts.push(`Учтены требования: ${analysis.matchedRequirements.slice(0, 3).join(', ')}`);
        }

        if (feedbackParts.length === 0) {
            return 'Решение соответствует исходной задаче.';
        }

        return feedbackParts.join('\n');
    }

    /**
     * Генерация рекомендаций
     */
    private generateRecommendations(
        analysis: {
            missingRequirements: string[];
            extraRequirements: string[];
            matchedRequirements: string[];
        },
        relevance: number
    ): string[] {
        const recommendations: string[] = [];

        if (relevance < this.RELEVANCE_THRESHOLD) {
            recommendations.push('Улучшить соответствие решения исходной задаче');
        }

        if (analysis.missingRequirements.length > 0) {
            recommendations.push(`Учесть отсутствующие требования: ${analysis.missingRequirements.slice(0, 2).join(', ')}`);
        }

        if (analysis.extraRequirements.length > 3) {
            recommendations.push('Упростить решение, убрав лишние элементы, не упомянутые в задаче');
        }

        if (recommendations.length === 0) {
            recommendations.push('Решение соответствует требованиям задачи');
        }

        return recommendations;
    }
}
