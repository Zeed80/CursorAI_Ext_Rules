import * as vscode from 'vscode';
import { Task } from '../orchestrator/orchestrator';
import { LocalAgent, ProjectContext, SolutionOption, ExecutionResult, AgentSolution } from './local-agent';

/**
 * Software Architect Agent
 * Специализируется на архитектуре, проектировании, планировании фич
 */
export class ArchitectAgent extends LocalAgent {
    constructor(context: vscode.ExtensionContext) {
        super(
            'architect',
            'Software Architect',
            'Специализируется на архитектуре: проектирование, планирование, паттерны проектирования, масштабируемость',
            context
        );
    }

    protected async analyzeTask(task: Task, projectContext: ProjectContext): Promise<{
        problem: string;
        context: string;
        constraints: string[];
    }> {
        const prompt = `Ты - опытный Software Architect. Проанализируй следующую задачу с точки зрения архитектуры:

Задача: ${task.description}
Тип: ${task.type}
Приоритет: ${task.priority}

Контекст проекта:
- Архитектура: ${projectContext.standards?.architecture || 'не определена'}
- Паттерны: ${projectContext.patterns?.join(', ') || 'не определены'}
- Структура: ${projectContext.structure.directories.join(', ')}

Проанализируй задачу и определи:
1. Архитектурные аспекты проблемы
2. Контекст архитектуры проекта
3. Архитектурные ограничения и требования (масштабируемость, поддерживаемость)

Верни ответ в формате:
ПРОБЛЕМА: [архитектурное описание проблемы]
КОНТЕКСТ: [архитектурный контекст]
ОГРАНИЧЕНИЯ: [список архитектурных ограничений, каждое с новой строки]`;

        const response = await this.callLLM(prompt);
        const analysis = this.parseAnalysis(response);

        return {
            problem: analysis.problem || task.description,
            context: analysis.context || '',
            constraints: analysis.constraints || []
        };
    }

    protected async generateOptions(
        task: Task,
        projectContext: ProjectContext,
        analysis: { problem: string; context: string; constraints: string[] }
    ): Promise<SolutionOption[]> {
        const prompt = `Ты - опытный Software Architect. Предложи 3 архитектурных варианта решения следующей задачи.

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

ВАЖНО: Верни ТОЛЬКО валидный JSON массив без дополнительных комментариев и объяснений. Не добавляй никакого текста перед или после JSON.

[
  {
    "title": "Название архитектурного подхода",
    "description": "Описание архитектурного решения",
    "approach": "Подробный архитектурный подход",
    "pros": ["преимущество 1", "преимущество 2"],
    "cons": ["недостаток 1", "недостаток 2"],
    "complexity": "low",
    "confidence": 0.8,
    "estimatedTime": 7200000,
    "filesToModify": ["src/module1.ts", "src/module2.ts"],
    "risks": ["риск 1", "риск 2"]
  }
]`;

        const response = await this.callLLM(prompt);
        const options = this.parseOptions(response);

        return options.map((opt, index) => ({
            id: `option-${task.id}-${index}`,
            ...opt
        }));
    }

    protected async selectBestOption(
        options: SolutionOption[],
        task: Task,
        projectContext: ProjectContext
    ): Promise<SolutionOption> {
        if (options.length === 0) {
            throw new Error('No options available');
        }

        if (options.length === 1) {
            return options[0];
        }

        // Для архитектора приоритет: масштабируемость и поддерживаемость
        const scored = options.map(opt => {
            const scalabilityScore = opt.pros.some(p => p.toLowerCase().includes('масштабируем')) ? 1.3 : 1.0;
            const maintainabilityScore = opt.pros.some(p => p.toLowerCase().includes('поддерживаем')) ? 1.2 : 1.0;
            return {
                option: opt,
                score: opt.confidence * scalabilityScore * maintainabilityScore
            };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0].option;
    }

    // Используем базовую реализацию из LocalAgent, которая выполняет реальные изменения

    protected buildReasoningPrompt(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): string {
        return `Ты - опытный Software Architect. Объясни, почему выбран следующий архитектурный вариант:

Задача: ${task.description}
Выбранное решение: ${option.title}
Описание: ${option.description}

Объясни обоснование выбора, учитывая:
- Соответствие архитектуре проекта
- Масштабируемость
- Поддерживаемость
- Гибкость
- Производительность`;
    }

    private parseAnalysis(text: string): { problem: string; context: string; constraints: string[] } {
        const problemMatch = text.match(/ПРОБЛЕМА:\s*(.+?)(?=КОНТЕКСТ:|$)/is);
        const contextMatch = text.match(/КОНТЕКСТ:\s*(.+?)(?=ОГРАНИЧЕНИЯ:|$)/is);
        const constraintsMatch = text.match(/ОГРАНИЧЕНИЯ:\s*([\s\S]+?)(?=\n\n|$)/is);

        const constraints = constraintsMatch
            ? constraintsMatch[1].split('\n').map(c => c.replace(/^[-*]\s*/, '').trim()).filter(c => c.length > 0)
            : [];

        return {
            problem: problemMatch ? problemMatch[1].trim() : '',
            context: contextMatch ? contextMatch[1].trim() : '',
            constraints
        };
    }

    private parseOptions(text: string): Omit<SolutionOption, 'id'>[] {
        try {
            // Логируем полный ответ для отладки
            console.log('ArchitectAgent parseOptions - Raw response:', text);

            // Пытаемся распарсить весь текст как JSON
            try {
                const parsed = JSON.parse(text.trim());
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (e) {
                // Если не сработало, пробуем найти JSON массив в тексте
            }

            // Ищем JSON массив в тексте
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error('ArchitectAgent: Error parsing options:', error);
            console.error('ArchitectAgent: Response text was:', text.substring(0, 500));
        }

        return [{
            title: 'Базовое архитектурное решение',
            description: 'Базовый архитектурный подход',
            approach: 'Стандартный архитектурный паттерн',
            pros: ['Простота реализации', 'Хорошая масштабируемость'],
            cons: ['Может потребовать доработки'],
            estimatedTime: 7200000,
            complexity: 'medium' as const,
            confidence: 0.5,
            filesToModify: [],
            risks: []
        }];
    }
}
