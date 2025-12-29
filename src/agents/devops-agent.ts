import * as vscode from 'vscode';
import { Task } from '../orchestrator/orchestrator';
import { LocalAgent, ProjectContext, SolutionOption, ExecutionResult, AgentSolution } from './local-agent';

/**
 * DevOps Engineer Agent
 * Специализируется на DevOps: Docker, деплой, инфраструктура
 */
export class DevOpsAgent extends LocalAgent {
    constructor(context: vscode.ExtensionContext) {
        super(
            'devops',
            'DevOps Engineer',
            'Специализируется на DevOps: Docker, деплой, инфраструктура, CI/CD',
            context
        );
    }

    protected async analyzeTask(task: Task, projectContext: ProjectContext): Promise<{
        problem: string;
        context: string;
        constraints: string[];
    }> {
        const prompt = `Ты - опытный DevOps Engineer. Проанализируй следующую задачу с точки зрения инфраструктуры и деплоя:

Задача: ${task.description}
Тип: ${task.type}
Приоритет: ${task.priority}

Проанализируй задачу и определи:
1. Аспекты инфраструктуры и деплоя
2. Контекст инфраструктуры
3. Ограничения (безопасность, доступность, масштабируемость)

Верни ответ в формате:
ПРОБЛЕМА: [описание проблемы с точки зрения DevOps]
КОНТЕКСТ: [контекст инфраструктуры]
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
        const prompt = `Ты - опытный DevOps Engineer. Предложи 3 варианта решения следующей задачи:

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

Для каждого варианта укажи:
1. Название подхода
2. Описание решения
3. Преимущества (надежность, безопасность, масштабируемость)
4. Недостатки
5. Оценка сложности (low/medium/high)
6. Оценка уверенности (0-1)
7. Оценка времени (в миллисекундах)
8. Файлы конфигурации, которые нужно изменить
9. Риски деплоя

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

        // Для DevOps приоритет: надежность и безопасность
        const scored = options.map(opt => {
            const reliabilityScore = opt.pros.some(p => p.toLowerCase().includes('надежн')) ? 1.3 : 1.0;
            const securityScore = opt.pros.some(p => p.toLowerCase().includes('безопасн')) ? 1.2 : 1.0;
            return {
                option: opt,
                score: opt.confidence * reliabilityScore * securityScore
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
        return `Ты - опытный DevOps Engineer. Объясни, почему выбран следующий вариант:

Задача: ${task.description}
Выбранное решение: ${option.title}
Описание: ${option.description}

Объясни обоснование выбора, учитывая:
- Надежность инфраструктуры
- Безопасность
- Масштабируемость
- Простота деплоя`;
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
            title: 'Базовое DevOps решение',
            description: 'Базовый подход к DevOps задаче',
            approach: 'Стандартный DevOps подход',
            pros: ['Надежность', 'Безопасность'],
            cons: ['Может потребовать доработки'],
            estimatedTime: 3600000,
            complexity: 'medium' as const,
            confidence: 0.5,
            filesToModify: [],
            risks: []
        }];
    }
}
