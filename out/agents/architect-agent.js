"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectAgent = void 0;
const local_agent_1 = require("./local-agent");
/**
 * Software Architect Agent
 * Специализируется на архитектуре, проектировании, планировании фич
 */
class ArchitectAgent extends local_agent_1.LocalAgent {
    constructor(context) {
        super('architect', 'Software Architect', 'Специализируется на архитектуре: проектирование, планирование, паттерны проектирования, масштабируемость', context);
    }
    async analyzeTask(task, projectContext) {
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
    async generateOptions(task, projectContext, analysis) {
        const prompt = `Ты - опытный Software Architect. Предложи 3 архитектурных варианта решения следующей задачи:

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

Тип задачи: ${task.type}
Приоритет: ${task.priority}

Для каждого варианта укажи:
1. Название архитектурного подхода
2. Описание архитектурного решения
3. Преимущества (масштабируемость, поддерживаемость, гибкость)
4. Недостатки
5. Оценка сложности (low/medium/high)
6. Оценка уверенности (0-1)
7. Оценка времени (в миллисекундах)
8. Файлы/модули, которые нужно изменить
9. Архитектурные риски

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
    buildReasoningPrompt(option, task, projectContext) {
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
                title: 'Базовое архитектурное решение',
                description: 'Базовый архитектурный подход',
                approach: 'Стандартный архитектурный паттерн',
                pros: ['Простота реализации', 'Хорошая масштабируемость'],
                cons: ['Может потребовать доработки'],
                estimatedTime: 7200000,
                complexity: 'medium',
                confidence: 0.5,
                filesToModify: [],
                risks: []
            }];
    }
}
exports.ArchitectAgent = ArchitectAgent;
//# sourceMappingURL=architect-agent.js.map