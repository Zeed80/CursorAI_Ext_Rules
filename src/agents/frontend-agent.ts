import * as vscode from 'vscode';
import { Task } from '../orchestrator/orchestrator';
import { LocalAgent, ProjectContext, SolutionOption, ExecutionResult, AgentSolution } from './local-agent';

/**
 * Frontend Developer Agent
 * Специализируется на frontend разработке (HTML, CSS, JavaScript, UI/UX)
 */
export class FrontendAgent extends LocalAgent {
    constructor(context: vscode.ExtensionContext) {
        super(
            'frontend',
            'Frontend Developer',
            'Специализируется на frontend разработке: HTML, CSS, JavaScript, UI/UX, доступность',
            context
        );
    }

    protected async analyzeTask(task: Task, projectContext: ProjectContext): Promise<{
        problem: string;
        context: string;
        constraints: string[];
    }> {
        const prompt = `Ты - опытный Frontend Developer. Проанализируй следующую задачу:

Задача: ${task.description}
Тип: ${task.type}
Приоритет: ${task.priority}

Контекст проекта:
- Стиль кода: ${projectContext.standards?.codeStyle || 'не определен'}
- Паттерны: ${projectContext.patterns?.join(', ') || 'не определены'}

Проанализируй задачу с точки зрения frontend разработки и определи:
1. Суть проблемы
2. Контекст UI/UX
3. Ограничения (доступность, производительность, браузерная совместимость)

Верни ответ в формате:
ПРОБЛЕМА: [описание проблемы]
КОНТЕКСТ: [необходимый контекст UI/UX]
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
        const prompt = `Ты - опытный Frontend Developer. Предложи 3 варианта решения следующей задачи.

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

ВАЖНО: Верни ТОЛЬКО валидный JSON массив без дополнительных комментариев и объяснений. Не добавляй никакого текста перед или после JSON.

[
  {
    "title": "Название подхода",
    "description": "Описание решения",
    "approach": "Подробный подход к frontend решению",
    "pros": ["преимущество 1", "преимущество 2"],
    "cons": ["недостаток 1", "недостаток 2"],
    "complexity": "low",
    "confidence": 0.8,
    "estimatedTime": 3600000,
    "filesToModify": ["src/components/Button.tsx", "src/styles/main.css"],
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

        // Для frontend приоритет: доступность и производительность
        const scored = options.map(opt => {
            const accessibilityScore = opt.pros.some(p => p.toLowerCase().includes('доступн')) ? 1.2 : 1.0;
            const performanceScore = opt.pros.some(p => p.toLowerCase().includes('производительн')) ? 1.1 : 1.0;
            return {
                option: opt,
                score: opt.confidence * accessibilityScore * performanceScore * (opt.complexity === 'low' ? 1.2 : opt.complexity === 'medium' ? 1.0 : 0.8)
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
        return `Ты - опытный Frontend Developer. Объясни, почему выбран следующий вариант решения:

Задача: ${task.description}
Выбранное решение: ${option.title}
Описание: ${option.description}

Объясни обоснование выбора, учитывая:
- UI/UX качество
- Доступность (WCAG 2.1 AA)
- Производительность
- Браузерная совместимость
- Поддерживаемость кода`;
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
        // Используем общий метод парсинга из LocalAgent
        const parsed = this.parseJSONOptions(text, 'FrontendAgent');
        
        if (parsed.length > 0) {
            return parsed;
        }

        return [{
            title: 'Базовое frontend решение',
            description: 'Базовый подход к решению задачи',
            approach: 'Стандартный подход',
            pros: ['Простота реализации', 'Хорошая доступность'],
            cons: ['Может потребовать доработки'],
            estimatedTime: 3600000,
            complexity: 'medium' as const,
            confidence: 0.5,
            filesToModify: [],
            risks: []
        }];
    }
}
