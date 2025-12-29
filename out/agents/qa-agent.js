"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QAAgent = void 0;
const local_agent_1 = require("./local-agent");
/**
 * QA Engineer Agent
 * Специализируется на тестировании: unit, integration, e2e
 */
class QAAgent extends local_agent_1.LocalAgent {
    constructor(context) {
        super('qa', 'QA Engineer', 'Специализируется на тестировании: unit, integration, e2e, качество кода', context);
    }
    async analyzeTask(task, projectContext) {
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
    async generateOptions(task, projectContext, analysis) {
        const prompt = `Ты - опытный QA Engineer. Предложи 3 варианта решения следующей задачи.

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

ВАЖНО: Верни ТОЛЬКО валидный JSON массив без дополнительных комментариев и объяснений. Не добавляй никакого текста перед или после JSON.

[
  {
    "title": "Название подхода к тестированию",
    "description": "Описание решения",
    "approach": "Подробный подход к тестированию",
    "pros": ["преимущество 1", "преимущество 2"],
    "cons": ["недостаток 1", "недостаток 2"],
    "complexity": "low",
    "confidence": 0.8,
    "estimatedTime": 3600000,
    "filesToModify": ["tests/test1.php", "tests/test2.php"],
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
    async selectBestOption(options, task, projectContext) {
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
    buildReasoningPrompt(option, task, projectContext) {
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
        // Используем общий метод парсинга из LocalAgent
        const parsed = this.parseJSONOptions(text, 'QAAgent');
        if (parsed.length > 0) {
            return parsed;
        }
        return [{
                title: 'Базовое QA решение',
                description: 'Базовый подход к тестированию',
                approach: 'Стандартный подход к тестированию',
                pros: ['Хорошее покрытие', 'Качество тестов'],
                cons: ['Может потребовать доработки'],
                estimatedTime: 3600000,
                complexity: 'medium',
                confidence: 0.5,
                filesToModify: [],
                risks: []
            }];
    }
}
exports.QAAgent = QAAgent;
//# sourceMappingURL=qa-agent.js.map