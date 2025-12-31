import * as vscode from 'vscode';
import { AgentSolution } from '../agents/local-agent';
import { Task } from '../orchestrator/orchestrator';
import { CursorAPI } from './cursor-api';

/**
 * Консолидированное решение от CursorAI
 */
export interface ConsolidatedSolutionFromCursor {
    id: string;
    consolidated: AgentSolution;
    reasoning: string;
    confidence: number;
    improvements: string[];
    timestamp: Date;
}

/**
 * Интеграция с CursorAI Chat для консолидации решений
 * Использует CursorAI Chat API для объединения решений от нескольких агентов
 */
export class CursorChatIntegration {
    /**
     * Консолидировать решения от нескольких агентов через CursorAI Chat
     */
    async consolidateSolutions(
        task: Task,
        solutions: AgentSolution[]
    ): Promise<ConsolidatedSolutionFromCursor> {
        // Проверяем настройки
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const cursorIntegration = config.get('cursorIntegration', { useChat: true });
        
        if (!cursorIntegration.useChat) {
            console.log('CursorChatIntegration: disabled, returning first solution');
            // Возвращаем первое решение без консолидации
            return {
                id: `consolidated-${Date.now()}`,
                consolidated: solutions[0],
                reasoning: 'CursorAI Chat integration disabled',
                confidence: solutions[0].evaluation.overallScore,
                improvements: [],
                timestamp: new Date()
            };
        }
        
        if (solutions.length === 0) {
            throw new Error('No solutions to consolidate');
        }
        
        if (solutions.length === 1) {
            // Если только одно решение - возвращаем его
            return {
                id: `consolidated-${Date.now()}`,
                consolidated: solutions[0],
                reasoning: 'Only one solution available, no consolidation needed',
                confidence: solutions[0].evaluation.overallScore,
                improvements: [],
                timestamp: new Date()
            };
        }
        
        console.log(`CursorChatIntegration: Consolidating ${solutions.length} solutions for task ${task.id}`);
        
        // Формируем промпт для CursorAI Chat
        const prompt = this.buildConsolidationPrompt(task, solutions);
        
        try {
            // Отправляем в CursorAI Chat через API
            // TODO: Реализовать sendChatMessage в CursorAPI
            // Пока используем заглушку
            const response = await this.sendChatMessageFallback(prompt);
            
            // Парсим ответ
            const consolidated = this.parseConsolidatedSolution(response, task, solutions);
            
            console.log(`CursorChatIntegration: Consolidated solution with confidence ${(consolidated.confidence * 100).toFixed(0)}%`);
            
            return consolidated;
            
        } catch (error: any) {
            console.error('CursorChatIntegration: Failed to consolidate:', error);
            
            // Fallback: возвращаем лучшее решение
            const bestSolution = solutions.reduce((best, current) => {
                return current.evaluation.overallScore > best.evaluation.overallScore ? current : best;
            });
            
            return {
                id: `consolidated-fallback-${Date.now()}`,
                consolidated: bestSolution,
                reasoning: 'CursorAI consolidation failed, using best solution as fallback',
                confidence: bestSolution.evaluation.overallScore,
                improvements: ['Fallback used due to consolidation error'],
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Построить промпт для консолидации
     */
    private buildConsolidationPrompt(task: Task, solutions: AgentSolution[]): string {
        let prompt = `# Консолидация решений от агентов\n\n`;
        prompt += `## Задача\n`;
        prompt += `**Тип**: ${task.type}\n`;
        prompt += `**Описание**: ${task.description}\n`;
        prompt += `**Приоритет**: ${task.priority}\n\n`;
        
        prompt += `## Решения от агентов\n\n`;
        
        solutions.forEach((solution, index) => {
            prompt += `### Решение ${index + 1} (от ${solution.agentName})\n\n`;
            prompt += `**Оценка**: ${(solution.evaluation.overallScore * 100).toFixed(0)}%\n`;
            prompt += `**Уверенность**: ${(solution.confidence * 100).toFixed(0)}%\n\n`;
            
            prompt += `**Описание решения**:\n${solution.solution.title}\n\n`;
            prompt += `${solution.solution.description}\n\n`;
            
            prompt += `**Рассуждение**:\n${solution.reasoning}\n\n`;
            
            // Шаги из codeChanges
            if (solution.solution.codeChanges && solution.solution.codeChanges.length > 0) {
                prompt += `**Изменения кода**:\n`;
                solution.solution.codeChanges.forEach((change, idx) => {
                    prompt += `${idx + 1}. ${change.file}: ${change.description}\n`;
                });
                prompt += `\n`;
            }
            
            prompt += `---\n\n`;
        });
        
        prompt += `## Задача консолидации\n\n`;
        prompt += `Проанализируй все предложенные решения и создай **единое оптимальное решение**, которое:\n`;
        prompt += `1. Берет лучшие идеи из каждого решения\n`;
        prompt += `2. Устраняет противоречия между решениями\n`;
        prompt += `3. Оптимизирует подход для достижения цели\n`;
        prompt += `4. Сохраняет все важные детали\n\n`;
        
        prompt += `Верни результат в формате JSON:\n`;
        prompt += `\`\`\`json\n`;
        prompt += `{\n`;
        prompt += `  "title": "Заголовок консолидированного решения",\n`;
        prompt += `  "description": "Подробное описание",\n`;
        prompt += `  "steps": ["Шаг 1", "Шаг 2", ...],\n`;
        prompt += `  "reasoning": "Обоснование выбора и консолидации",\n`;
        prompt += `  "confidence": 0.95,\n`;
        prompt += `  "improvements": ["Улучшение 1", "Улучшение 2", ...]\n`;
        prompt += `}\n`;
        prompt += `\`\`\`\n`;
        
        return prompt;
    }
    
    /**
     * Распарсить консолидированное решение из ответа CursorAI
     */
    private parseConsolidatedSolution(
        response: string,
        task: Task,
        originalSolutions: AgentSolution[]
    ): ConsolidatedSolutionFromCursor {
        // Извлекаем JSON из ответа
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (!jsonMatch) {
            throw new Error('Failed to parse JSON from CursorAI response');
        }
        
        const parsed = JSON.parse(jsonMatch[1]);
        
        // Создаем консолидированное решение на основе первого решения
        const baseSolution = originalSolutions[0];
        
        const consolidated: AgentSolution = {
            ...baseSolution,
            id: `consolidated-${Date.now()}`,
            agentId: 'cursor-consolidator',
            agentName: 'CursorAI Consolidator',
            solution: {
                title: parsed.title,
                description: parsed.description,
                approach: parsed.reasoning || baseSolution.solution.approach,
                filesToModify: baseSolution.solution.filesToModify,
                codeChanges: baseSolution.solution.codeChanges,
                dependencies: baseSolution.solution.dependencies
            },
            reasoning: parsed.reasoning,
            confidence: parsed.confidence,
            evaluation: {
                ...baseSolution.evaluation,
                overallScore: parsed.confidence
            }
        };
        
        return {
            id: `consolidated-${Date.now()}`,
            consolidated,
            reasoning: parsed.reasoning,
            confidence: parsed.confidence,
            improvements: parsed.improvements || [],
            timestamp: new Date()
        };
    }
    
    /**
     * Улучшить решение через CursorAI Chat
     */
    async improveSolution(
        solution: AgentSolution,
        feedback: string
    ): Promise<AgentSolution> {
        console.log(`CursorChatIntegration: Improving solution ${solution.id} with feedback`);
        
        const prompt = this.buildImprovementPrompt(solution, feedback);
        
        try {
            // TODO: Реализовать sendChatMessage в CursorAPI
            const response = await this.sendChatMessageFallback(prompt);
            
            const improved = this.parseImprovedSolution(response, solution);
            
            console.log(`CursorChatIntegration: Solution improved`);
            
            return improved;
            
        } catch (error: any) {
            console.error('CursorChatIntegration: Failed to improve solution:', error);
            return solution; // Возвращаем исходное при ошибке
        }
    }
    
    /**
     * Построить промпт для улучшения решения
     */
    private buildImprovementPrompt(solution: AgentSolution, feedback: string): string {
        let prompt = `# Улучшение решения\n\n`;
        prompt += `## Текущее решение\n\n`;
        prompt += `**Заголовок**: ${solution.solution.title}\n\n`;
        prompt += `**Описание**: ${solution.solution.description}\n\n`;
        prompt += `**Рассуждение**: ${solution.reasoning}\n\n`;
        
        prompt += `## Обратная связь\n\n`;
        prompt += `${feedback}\n\n`;
        
        prompt += `## Задача\n\n`;
        prompt += `Доработай решение с учетом обратной связи.\n\n`;
        prompt += `Верни результат в том же JSON формате:\n`;
        prompt += `\`\`\`json\n`;
        prompt += `{\n`;
        prompt += `  "title": "...",\n`;
        prompt += `  "description": "...",\n`;
        prompt += `  "steps": [...],\n`;
        prompt += `  "reasoning": "..."\n`;
        prompt += `}\n`;
        prompt += `\`\`\`\n`;
        
        return prompt;
    }
    
    /**
     * Распарсить улучшенное решение
     */
    private parseImprovedSolution(
        response: string,
        originalSolution: AgentSolution
    ): AgentSolution {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (!jsonMatch) {
            return originalSolution;
        }
        
        const parsed = JSON.parse(jsonMatch[1]);
        
        return {
            ...originalSolution,
            id: `improved-${originalSolution.id}`,
            solution: {
                ...originalSolution.solution,
                title: parsed.title,
                description: parsed.description,
                approach: parsed.reasoning || originalSolution.solution.approach
            },
            reasoning: parsed.reasoning
        };
    }
    
    /**
     * Fallback для sendChatMessage (временная заглушка)
     */
    private async sendChatMessageFallback(prompt: string): Promise<string> {
        // Простая заглушка - возвращаем JSON шаблон
        return `\`\`\`json
{
  "title": "Консолидированное решение",
  "description": "Объединение предложенных решений с учетом лучших практик",
  "reasoning": "Выбраны наиболее эффективные подходы из каждого решения",
  "confidence": 0.85,
  "improvements": ["Улучшена структура", "Добавлена обработка ошибок"]
}
\`\`\``;
    }
}
