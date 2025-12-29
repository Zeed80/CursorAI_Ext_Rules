"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevOpsAgent = void 0;
const local_agent_1 = require("./local-agent");
/**
 * DevOps Engineer Agent
 * Специализируется на DevOps: Docker, деплой, инфраструктура
 */
class DevOpsAgent extends local_agent_1.LocalAgent {
    constructor(context) {
        super('devops', 'DevOps Engineer', 'Специализируется на DevOps: Docker, деплой, инфраструктура, CI/CD', context);
    }
    async analyzeTask(task, projectContext) {
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
    async generateOptions(task, projectContext, analysis) {
        const prompt = `Ты - опытный DevOps Engineer. Предложи 3 варианта решения следующей задачи.

ПРОБЛЕМА: ${analysis.problem}
КОНТЕКСТ: ${analysis.context}
ОГРАНИЧЕНИЯ:
${analysis.constraints.map(c => `- ${c}`).join('\n')}

ВАЖНО: Верни ТОЛЬКО валидный JSON массив без дополнительных комментариев и объяснений. Не добавляй никакого текста перед или после JSON.

[
  {
    "title": "Название подхода",
    "description": "Описание решения",
    "approach": "Подробный подход к DevOps решению",
    "pros": ["преимущество 1", "преимущество 2"],
    "cons": ["недостаток 1", "недостаток 2"],
    "complexity": "low",
    "confidence": 0.8,
    "estimatedTime": 3600000,
    "filesToModify": ["docker-compose.yml", ".env"],
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
    buildReasoningPrompt(option, task, projectContext) {
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
        const parsed = this.parseJSONOptions(text, 'DevOpsAgent');
        if (parsed.length > 0) {
            return parsed;
        }
        return [{
                title: 'Базовое DevOps решение',
                description: 'Базовый подход к DevOps задаче',
                approach: 'Стандартный DevOps подход',
                pros: ['Надежность', 'Безопасность'],
                cons: ['Может потребовать доработки'],
                estimatedTime: 3600000,
                complexity: 'medium',
                confidence: 0.5,
                filesToModify: [],
                risks: []
            }];
    }
}
exports.DevOpsAgent = DevOpsAgent;
//# sourceMappingURL=devops-agent.js.map