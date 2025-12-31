/**
 * Кэш промптов с LRU (Least Recently Used) стратегией
 * Уменьшает затраты на повторяющиеся запросы
 */
export class PromptCache {
    private cache: Map<string, { value: string; timestamp: number; hits: number }>;
    private maxSize: number;
    private ttl: number; // Time to live in milliseconds
    
    constructor(maxSize: number = 100, ttlMinutes: number = 60) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMinutes * 60 * 1000;
    }
    
    /**
     * Получить значение из кэша
     */
    get(key: string): string | null {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }
        
        // Проверяем TTL
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        // Обновляем статистику
        item.hits++;
        item.timestamp = Date.now();
        
        return item.value;
    }
    
    /**
     * Сохранить значение в кэш
     */
    set(key: string, value: string): void {
        // Если кэш полон - удаляем старые элементы
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            hits: 0
        });
    }
    
    /**
     * Удалить старый элемент (LRU)
     */
    private evictLRU(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        
        for (const [key, item] of this.cache.entries()) {
            if (item.timestamp < oldestTime) {
                oldestTime = item.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * Очистить кэш
     */
    clear(): void {
        this.cache.clear();
    }
    
    /**
     * Статистика
     */
    getStatistics() {
        const totalHits = Array.from(this.cache.values())
            .reduce((sum, item) => sum + item.hits, 0);
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            totalHits,
            hitRate: totalHits > 0 ? ((totalHits / this.cache.size) * 100).toFixed(1) + '%' : '0%'
        };
    }
}

/**
 * Батчер запросов для объединения нескольких запросов в один
 */
export class RequestBatcher {
    private queue: Array<{ prompt: string; resolve: (value: string) => void; reject: (error: any) => void }> = [];
    private timer?: NodeJS.Timeout;
    private batchDelay: number = 100; // ms
    private maxBatchSize: number = 5;
    
    /**
     * Добавить запрос в очередь
     */
    async add(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.queue.push({ prompt, resolve, reject });
            
            if (this.queue.length >= this.maxBatchSize) {
                this.flush();
            } else if (!this.timer) {
                this.timer = setTimeout(() => this.flush(), this.batchDelay);
            }
        });
    }
    
    /**
     * Выполнить все запросы в очереди
     */
    private async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        
        if (this.queue.length === 0) {
            return;
        }
        
        const batch = this.queue.splice(0, this.maxBatchSize);
        
        // Здесь должна быть логика объединения запросов
        // Пока просто возвращаем заглушку
        for (const item of batch) {
            item.resolve(`Batched response for: ${item.prompt.substring(0, 50)}...`);
        }
    }
}

/**
 * Мониторинг затрат
 */
export class CostMonitor {
    private costs: Array<{ date: Date; provider: string; cost: number; prompt: string }> = [];
    private maxHistory: number = 1000;
    
    /**
     * Записать затраты
     */
    record(provider: string, cost: number, prompt: string): void {
        this.costs.push({
            date: new Date(),
            provider,
            cost,
            prompt: prompt.substring(0, 100)
        });
        
        // Ограничиваем историю
        if (this.costs.length > this.maxHistory) {
            this.costs.shift();
        }
    }
    
    /**
     * Получить статистику за период
     */
    getStatistics(periodDays: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - periodDays);
        
        const recentCosts = this.costs.filter(c => c.date >= cutoffDate);
        
        const totalCost = recentCosts.reduce((sum, c) => sum + c.cost, 0);
        
        const byProvider: Record<string, number> = {};
        for (const cost of recentCosts) {
            byProvider[cost.provider] = (byProvider[cost.provider] || 0) + cost.cost;
        }
        
        return {
            totalCost,
            averageCost: recentCosts.length > 0 ? totalCost / recentCosts.length : 0,
            byProvider,
            callCount: recentCosts.length,
            periodDays
        };
    }
    
    /**
     * Получить топ дорогих запросов
     */
    getTopExpensive(limit: number = 10) {
        return this.costs
            .sort((a, b) => b.cost - a.cost)
            .slice(0, limit)
            .map(c => ({
                provider: c.provider,
                cost: c.cost,
                date: c.date,
                promptPreview: c.prompt
            }));
    }
}
