"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendAgent = void 0;
const local_agent_1 = require("./local-agent");
/**
 * Frontend Developer Agent
 * Специализируется на frontend разработке (HTML, CSS, JavaScript, UI/UX)
 */
class FrontendAgent extends local_agent_1.LocalAgent {
    constructor(context) {
        super('frontend', 'Frontend Developer', 'Специализируется на frontend разработке: HTML, CSS, JavaScript, UI/UX, доступность', context);
    }
    async analyzeTask(task, projectContext) {
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
    async generateOptions(task, projectContext, analysis) {
        const prompt = `Ты - опытный Frontend Developer. Предложи 3 варианта решения следующей задачи:

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

Тип задачи: ${task.type}
Приоритет: ${task.priority}

Для каждого варианта укажи:
1. Название подхода
2. Описание решения
3. Преимущества (UI/UX, производительность)
4. Недостатки
5. Оценка сложности (low/medium/high)
6. Оценка уверенности (0-1)
7. Оценка времени (в миллисекундах)
8. Файлы, которые нужно изменить
9. Риски (браузерная совместимость, доступность)

Верни ответ в формате JSON массив.`;
        const response = await this.callLLM(prompt);
        const options = this.parseOptions(response);
        return options.map((opt, index) => ({
            id: `option-${task.id}-${index}`,
            ...opt
        }));
    }
    async selectBestOption(options, task, projectContext) {
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
    buildReasoningPrompt(option, task, projectContext) {
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
    parseAnalysis(text) {
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
    parseOptions(text) {
        try {
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return Array.isArray(parsed) ? parsed : [];
            }
        }
        catch (error) {
            console.error('Error parsing options:', error);
        }
        return [{
                title: 'Базовое frontend решение',
                description: 'Базовый подход к решению задачи',
                approach: 'Стандартный подход',
                pros: ['Простота реализации', 'Хорошая доступность'],
                cons: ['Может потребовать доработки'],
                estimatedTime: 3600000,
                complexity: 'medium',
                confidence: 0.5,
                filesToModify: [],
                risks: []
            }];
    }
}
exports.FrontendAgent = FrontendAgent;
//# sourceMappingURL=frontend-agent.js.map