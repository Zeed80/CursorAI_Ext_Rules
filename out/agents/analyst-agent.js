"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalystAgent = void 0;
const local_agent_1 = require("./local-agent");
/**
 * Data Analyst Agent
 * Специализируется на анализе данных, производительности, оптимизации
 */
class AnalystAgent extends local_agent_1.LocalAgent {
    constructor(context) {
        super('analyst', 'Data Analyst', 'Специализируется на анализе: производительность, оптимизация, метрики, данные', context);
    }
    async analyzeTask(task, projectContext) {
        const prompt = `Ты - опытный Data Analyst. Проанализируй следующую задачу с точки зрения производительности и оптимизации:

Задача: ${task.description}
Тип: ${task.type}
Приоритет: ${task.priority}

Проанализируй задачу и определи:
1. Аспекты производительности и оптимизации
2. Контекст данных и метрик
3. Ограничения производительности

Верни ответ в формате:
ПРОБЛЕМА: [описание проблемы с точки зрения производительности]
КОНТЕКСТ: [контекст данных и метрик]
ОГРАНИЧЕНИЯ: [список ограничений производительности, каждое с новой строки]`;
        const response = await this.callLLM(prompt);
        const analysis = this.parseAnalysis(response);
        return {
            problem: analysis.problem || task.description,
            context: analysis.context || '',
            constraints: analysis.constraints || []
        };
    }
    async generateOptions(task, projectContext, analysis) {
        const prompt = `Ты - опытный Data Analyst. Предложи 3 варианта оптимизации для следующей задачи.

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

ВАЖНО: Верни ТОЛЬКО валидный JSON массив без дополнительных комментариев и объяснений. Не добавляй никакого текста перед или после JSON.

[
  {
    "title": "Название подхода оптимизации",
    "description": "Описание решения",
    "approach": "Подробный подход к оптимизации",
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
    async selectBestOption(options, task, projectContext) {
        if (options.length === 0) {
            throw new Error('No options available');
        }
        if (options.length === 1) {
            return options[0];
        }
        // Для аналитика приоритет: производительность
        const scored = options.map(opt => {
            const performanceScore = opt.pros.some(p => p.toLowerCase().includes('производительн')) ? 1.3 : 1.0;
            return {
                option: opt,
                score: opt.confidence * performanceScore
            };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored[0].option;
    }
    // Используем базовую реализацию из LocalAgent, которая выполняет реальные изменения
    buildReasoningPrompt(option, task, projectContext) {
        return `Ты - опытный Data Analyst. Объясни, почему выбран следующий вариант оптимизации:

Задача: ${task.description}
Выбранное решение: ${option.title}
Описание: ${option.description}

Объясни обоснование выбора, учитывая:
- Улучшение производительности
- Эффективность использования ресурсов
- Масштабируемость решения`;
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
            // Логируем полный ответ для отладки
            console.log('AnalystAgent parseOptions - Raw response:', text);
            // Пытаемся распарсить весь текст как JSON
            try {
                const parsed = JSON.parse(text.trim());
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
            catch (e) {
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
        }
        catch (error) {
            console.error('AnalystAgent: Error parsing options:', error);
            console.error('AnalystAgent: Response text was:', text.substring(0, 500));
        }
        return [{
                title: 'Базовое решение оптимизации',
                description: 'Базовый подход к оптимизации',
                approach: 'Стандартная оптимизация',
                pros: ['Улучшение производительности'],
                cons: ['Может потребовать доработки'],
                estimatedTime: 3600000,
                complexity: 'medium',
                confidence: 0.5,
                filesToModify: [],
                risks: []
            }];
    }
}
exports.AnalystAgent = AnalystAgent;
//# sourceMappingURL=analyst-agent.js.map