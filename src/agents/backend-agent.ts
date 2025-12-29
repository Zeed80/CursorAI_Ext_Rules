import * as vscode from 'vscode';
import { Task } from '../orchestrator/orchestrator';
import { LocalAgent, ProjectContext, SolutionOption, ExecutionResult, AgentSolution } from './local-agent';

/**
 * Backend Developer Agent
 * Специализируется на backend разработке (PHP, PostgreSQL, API, серверная логика)
 */
export class BackendAgent extends LocalAgent {
    constructor(context: vscode.ExtensionContext) {
        super(
            'backend',
            'Backend Developer',
            'Специализируется на backend разработке: PHP, PostgreSQL, API, серверная логика, безопасность',
            context
        );
    }

    protected async analyzeTask(task: Task, projectContext: ProjectContext): Promise<{
        problem: string;
        context: string;
        constraints: string[];
    }> {
        const prompt = `Ты - опытный Backend Developer. Проанализируй следующую задачу:

Задача: ${task.description}
Тип: ${task.type}
Приоритет: ${task.priority}

Контекст проекта:
- Архитектура: ${projectContext.standards?.architecture || 'не определена'}
- Стиль кода: ${projectContext.standards?.codeStyle || 'не определен'}
- Паттерны: ${projectContext.patterns?.join(', ') || 'не определены'}

Проанализируй задачу и определи:
1. Суть проблемы
2. Контекст, необходимый для решения
3. Ограничения и требования

Верни ответ в формате:
ПРОБЛЕМА: [описание проблемы]
КОНТЕКСТ: [необходимый контекст]
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
        const prompt = `Ты - опытный Backend Developer. Предложи 3 варианта решения следующей задачи.

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

Тип задачи: ${task.type}
Приоритет: ${task.priority}

ВАЖНО: Верни ТОЛЬКО валидный JSON массив без дополнительных комментариев и объяснений. Не добавляй никакого текста перед или после JSON.

[
  {
    "title": "Название подхода",
    "description": "Описание решения",
    "approach": "Подробный подход к реализации",
    "pros": ["преимущество 1", "преимущество 2"],
    "cons": ["недостаток 1", "недостаток 2"],
    "complexity": "low",
    "confidence": 0.8,
    "estimatedTime": 3600000,
    "filesToModify": ["src/file1.php", "src/file2.php"],
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

        // Выбираем вариант с наивысшей уверенностью и наименьшей сложностью
        const scored = options.map(opt => ({
            option: opt,
            score: opt.confidence * (opt.complexity === 'low' ? 1.2 : opt.complexity === 'medium' ? 1.0 : 0.8)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored[0].option;
    }

    // Используем базовую реализацию из LocalAgent, которая выполняет реальные изменения
    // Можно переопределить для специфичной логики backend агента

    protected buildReasoningPrompt(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): string {
        return `Ты - опытный Backend Developer. Объясни, почему выбран следующий вариант решения:

Задача: ${task.description}
Выбранное решение: ${option.title}
Описание: ${option.description}
Подход: ${option.approach}

Преимущества:
${option.pros.map(p => `- ${p}`).join('\n')}

Недостатки:
${option.cons.map(c => `- ${c}`).join('\n')}

Сложность: ${option.complexity}
Уверенность: ${option.confidence}

Объясни обоснование выбора этого решения, учитывая:
- Соответствие стандартам проекта
- Безопасность
- Производительность
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
        const parsed = this.parseJSONOptions(text, 'BackendAgent');
        
        if (parsed.length > 0) {
            return parsed;
        }

        // Возвращаем вариант по умолчанию
        return [{
            title: 'Базовое решение',
            description: 'Базовый подход к решению задачи',
            approach: 'Стандартный подход',
            pros: ['Простота реализации'],
            cons: ['Может потребовать доработки'],
            estimatedTime: 3600000,
            complexity: 'medium' as const,
            confidence: 0.5,
            filesToModify: [],
            risks: []
        }];
    }
}
