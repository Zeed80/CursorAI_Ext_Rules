import { Task } from './orchestrator';
import { CursorAPI } from '../integration/cursor-api';

/**
 * Вариация задачи
 */
export interface TaskVariation {
    id: string;
    originalTaskId: string;
    variation: Task;
    agentId: string;
    emphasis: string[]; // акценты (performance, security, simplicity, architecture, quality)
    similarity: number; // 0-1, схожесть с исходной задачей
    reasoning: string;
}

/**
 * Генератор вариаций задач
 * Создает различные формулировки одной задачи для разных агентов,
 * сохраняя суть и ключевые требования
 */
export class TaskVariationGenerator {
    private variationCache: Map<string, TaskVariation[]> = new Map();
    private readonly CACHE_TTL = 3600000; // 1 час

    /**
     * Генерация вариаций задачи для списка агентов
     */
    async generateVariations(
        task: Task,
        agentIds: string[],
        count: number = 1
    ): Promise<TaskVariation[]> {
        const cacheKey = `${task.id}-${agentIds.join(',')}-${count}`;
        
        // Проверяем кэш
        const cached = this.variationCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const variations: TaskVariation[] = [];

        // Генерируем вариации для каждого агента
        for (const agentId of agentIds) {
            for (let i = 0; i < count; i++) {
                const variation = await this.generateAgentSpecificVariation(task, agentId, i);
                variations.push(variation);
            }
        }

        // Кэшируем результат
        this.variationCache.set(cacheKey, variations);

        return variations;
    }

    /**
     * Генерация вариации задачи для конкретного агента
     */
    async generateAgentSpecificVariation(
        task: Task,
        agentId: string,
        variationIndex: number = 0
    ): Promise<TaskVariation> {
        // Определяем стратегию вариации на основе специализации агента
        const strategy = this.getVariationStrategy(agentId, variationIndex);
        
        // Генерируем промпт для создания вариации
        const prompt = this.buildVariationPrompt(task, strategy);

        try {
            // Используем CursorAPI для генерации вариации через специального агента
            // Создаем временного агента для генерации вариаций
            const variationAgentId = `variation-generator-${Date.now()}`;
            await CursorAPI.createOrUpdateBackgroundAgent(
                variationAgentId,
                'Генератор вариаций задач',
                'Специализируется на создании различных формулировок задач с сохранением их сути',
                'Твоя задача - создавать различные формулировки задач, сохраняя их суть и ключевые требования. Адаптируй формулировку под специализацию агента, но не меняй функциональные требования.',
                undefined // Автоматический выбор модели
            );

            // Генерируем вариацию через LLM
            const variationText = await CursorAPI.sendMessageToAgent(variationAgentId, prompt);
            
            // Парсим вариацию из ответа
            const variation = this.parseVariationResponse(variationText, task, agentId, strategy);

            // Вычисляем схожесть с исходной задачей
            const similarity = await this.calculateSimilarity(task, variation.variation);

            return {
                ...variation,
                similarity
            };
        } catch (error) {
            console.error(`Error generating variation for agent ${agentId}:`, error);
            
            // Fallback: создаем простую вариацию на основе стратегии
            return this.createFallbackVariation(task, agentId, strategy);
        }
    }

    /**
     * Получение стратегии вариации для агента
     */
    private getVariationStrategy(agentId: string, variationIndex: number): {
        focus: string[];
        approach: string;
        description: string;
    } {
        const strategies: { [key: string]: { focus: string[]; approach: string; description: string }[] } = {
            'backend': [
                { focus: ['performance', 'security'], approach: 'технический', description: 'С акцентом на производительность и безопасность серверной части' },
                { focus: ['maintainability', 'scalability'], approach: 'архитектурный', description: 'С акцентом на поддерживаемость и масштабируемость' }
            ],
            'frontend': [
                { focus: ['user-experience', 'performance'], approach: 'пользовательский', description: 'С акцентом на пользовательский опыт и производительность интерфейса' },
                { focus: ['accessibility', 'simplicity'], approach: 'качественный', description: 'С акцентом на доступность и простоту использования' }
            ],
            'architect': [
                { focus: ['architecture', 'scalability'], approach: 'системный', description: 'С акцентом на архитектуру системы и масштабируемость' },
                { focus: ['design-patterns', 'maintainability'], approach: 'паттерновый', description: 'С акцентом на паттерны проектирования и поддерживаемость' }
            ],
            'analyst': [
                { focus: ['metrics', 'performance'], approach: 'аналитический', description: 'С акцентом на метрики и анализ производительности' },
                { focus: ['optimization', 'data'], approach: 'оптимизационный', description: 'С акцентом на оптимизацию и работу с данными' }
            ],
            'qa': [
                { focus: ['quality', 'testing'], approach: 'тестовый', description: 'С акцентом на качество и тестирование' },
                { focus: ['reliability', 'compliance'], approach: 'надежный', description: 'С акцентом на надежность и соответствие стандартам' }
            ],
            'devops': [
                { focus: ['deployment', 'infrastructure'], approach: 'инфраструктурный', description: 'С акцентом на развертывание и инфраструктуру' },
                { focus: ['automation', 'monitoring'], approach: 'автоматизационный', description: 'С акцентом на автоматизацию и мониторинг' }
            ]
        };

        const agentStrategies = strategies[agentId] || [
            { focus: ['general'], approach: 'общий', description: 'Общий подход к решению задачи' }
        ];

        const strategyIndex = variationIndex % agentStrategies.length;
        return agentStrategies[strategyIndex];
    }

    /**
     * Построение промпта для генерации вариации
     */
    private buildVariationPrompt(
        task: Task,
        strategy: { focus: string[]; approach: string; description: string }
    ): string {
        return `Создай вариацию следующей задачи, сохраняя её суть и ключевые требования:

ИСХОДНАЯ ЗАДАЧА:
Тип: ${task.type}
Приоритет: ${task.priority}
Описание: ${task.description}

ТРЕБОВАНИЯ К ВАРИАЦИИ:
- Сохрани все функциональные требования
- Сохрани все технические ограничения
- Сохрани приоритет задачи
- Адаптируй формулировку под ${strategy.approach} подход
- Сделай акцент на: ${strategy.focus.join(', ')}
- ${strategy.description}

ВАЖНО:
- Не меняй суть задачи
- Не добавляй новые функциональные требования
- Не меняй приоритет
- Только измени формулировку и акценты

Верни вариацию в формате JSON:
{
  "type": "${task.type}",
  "priority": "${task.priority}",
  "description": "новая формулировка задачи с сохранением всех требований"
}`;
    }

    /**
     * Парсинг ответа LLM в вариацию задачи
     */
    private parseVariationResponse(
        response: string,
        originalTask: Task,
        agentId: string,
        strategy: { focus: string[]; approach: string; description: string }
    ): TaskVariation {
        try {
            // Пытаемся найти JSON в ответе
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                const variation: Task = {
                    ...originalTask,
                    description: parsed.description || originalTask.description
                };

                return {
                    id: `variation-${originalTask.id}-${agentId}-${Date.now()}`,
                    originalTaskId: originalTask.id,
                    variation,
                    agentId,
                    emphasis: strategy.focus,
                    similarity: 0.8, // Будет пересчитано позже
                    reasoning: `Вариация создана с ${strategy.approach} подходом, акцент на ${strategy.focus.join(', ')}`
                };
            }
        } catch (error) {
            console.error('Error parsing variation response:', error);
        }

        // Fallback: используем исходную задачу с небольшими изменениями
        return this.createFallbackVariation(originalTask, agentId, strategy);
    }

    /**
     * Создание fallback вариации
     */
    private createFallbackVariation(
        task: Task,
        agentId: string,
        strategy: { focus: string[]; approach: string; description: string }
    ): TaskVariation {
        // Создаем простую вариацию, добавляя акценты в описание
        const emphasisText = strategy.focus.map(f => {
            const translations: { [key: string]: string } = {
                'performance': 'производительность',
                'security': 'безопасность',
                'simplicity': 'простота',
                'architecture': 'архитектура',
                'quality': 'качество',
                'maintainability': 'поддерживаемость',
                'scalability': 'масштабируемость',
                'user-experience': 'пользовательский опыт',
                'accessibility': 'доступность',
                'testing': 'тестирование',
                'reliability': 'надежность',
                'deployment': 'развертывание',
                'infrastructure': 'инфраструктура',
                'automation': 'автоматизация',
                'monitoring': 'мониторинг',
                'metrics': 'метрики',
                'optimization': 'оптимизация',
                'data': 'данные',
                'design-patterns': 'паттерны проектирования',
                'compliance': 'соответствие стандартам',
                'general': 'общий подход'
            };
            return translations[f] || f;
        }).join(', ');

        const variationDescription = `${task.description}\n\n[Акцент: ${emphasisText}]`;

        const variation: Task = {
            ...task,
            description: variationDescription
        };

        return {
            id: `variation-${task.id}-${agentId}-${Date.now()}`,
            originalTaskId: task.id,
            variation,
            agentId,
            emphasis: strategy.focus,
            similarity: 0.9, // Высокая схожесть для fallback
            reasoning: `Fallback вариация с акцентом на ${emphasisText}`
        };
    }

    /**
     * Вычисление схожести между исходной и вариацией задачи
     */
    async calculateSimilarity(original: Task, variation: Task): Promise<number> {
        // Простая эвристика на основе сравнения описаний
        const originalWords = new Set(original.description.toLowerCase().split(/\s+/));
        const variationWords = new Set(variation.description.toLowerCase().split(/\s+/));

        // Вычисляем пересечение слов
        let intersection = 0;
        originalWords.forEach(word => {
            if (variationWords.has(word)) {
                intersection++;
            }
        });

        // Jaccard similarity
        const union = originalWords.size + variationWords.size - intersection;
        const similarity = union > 0 ? intersection / union : 0;

        // Дополнительные проверки
        let bonus = 0;
        
        // Проверяем совпадение типа
        if (original.type === variation.type) bonus += 0.1;
        
        // Проверяем совпадение приоритета
        if (original.priority === variation.priority) bonus += 0.1;

        return Math.min(1.0, similarity + bonus);
    }

    /**
     * Очистка кэша
     */
    clearCache(): void {
        this.variationCache.clear();
    }

    /**
     * Очистка старых записей из кэша
     */
    cleanupCache(maxAge: number = this.CACHE_TTL): void {
        // В текущей реализации кэш не имеет временных меток,
        // поэтому просто очищаем весь кэш
        this.clearCache();
    }
}
