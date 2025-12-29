import * as vscode from 'vscode';
import { Task } from '../orchestrator/orchestrator';
import { LocalAgent, ProjectContext, SolutionOption, ExecutionResult, AgentSolution } from './local-agent';

/**
 * QA Engineer Agent
 * Специализируется на тестировании: unit, integration, e2e
 */
export class QAAgent extends LocalAgent {
    constructor(context: vscode.ExtensionContext) {
        super(
            'qa',
            'QA Engineer',
            'Специализируется на тестировании: unit, integration, e2e, качество кода',
            context
        );
    }

    protected async analyzeTask(task: Task, projectContext: ProjectContext): Promise<{
        problem: string;
        context: string;
        constraints: string[];
    }> {
        const prompt = `Ты - опытный QA Engineer. Проанализируй следующую задачу с точки зрения тестирования и качества:

Задача: ${task.description}
Тип: ${task.type}
Приоритет: ${task.priority}

Проанализируй задачу и определи:
1. Аспекты тестирования и качества
2. Контекст тестирования
3. Ограничения (покрытие, типы тестов)

Верни ответ в формате:
ПРОБЛЕМА: [описание проблемы с точки зрения QA]
КОНТЕКСТ: [контекст тестирования]
ОГРАНИЧЕНИЯ: [список ограничений, каждое с новой строки]`;

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
        const prompt = `Ты - опытный QA Engineer. Предложи 3 варианта решения следующей задачи:

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

Для каждого варианта укажи:
1. Название подхода к тестированию
2. Описание решения
3. Преимущества (покрытие, качество)
4. Недостатки
5. Оценка сложности (low/medium/high)
6. Оценка уверенности (0-1)
7. Оценка времени (в миллисекундах)
8. Файлы тестов, которые нужно создать/изменить
9. Риски тестирования

Верни ответ в формате JSON массив.`;

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

        // Для QA приоритет: покрытие и качество
        const scored = options.map(opt => {
            const coverageScore = opt.pros.some(p => p.toLowerCase().includes('покрыт')) ? 1.3 : 1.0;
            const qualityScore = opt.pros.some(p => p.toLowerCase().includes('качеств')) ? 1.2 : 1.0;
            return {
                option: opt,
                score: opt.confidence * coverageScore * qualityScore
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
        return `Ты - опытный QA Engineer. Объясни, почему выбран следующий вариант тестирования:

Задача: ${task.description}
Выбранное решение: ${option.title}
Описание: ${option.description}

Объясни обоснование выбора, учитывая:
- Покрытие тестами
- Качество тестов
- Поддерживаемость тестов
- Производительность тестов`;
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
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (error) {
            console.error('Error parsing options:', error);
        }

        return [{
            title: 'Базовое QA решение',
            description: 'Базовый подход к тестированию',
            approach: 'Стандартный подход к тестированию',
            pros: ['Хорошее покрытие', 'Качество тестов'],
            cons: ['Может потребовать доработки'],
            estimatedTime: 3600000,
            complexity: 'medium' as const,
            confidence: 0.5,
            filesToModify: [],
            risks: []
        }];
    }
}
