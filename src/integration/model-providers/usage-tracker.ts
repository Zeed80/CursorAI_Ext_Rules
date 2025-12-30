/**
 * Трекер использования провайдеров моделей
 * Отслеживает использование, стоимость и производительность
 */

import * as vscode from 'vscode';
import { ModelProviderType, CallResult } from './base-provider';

export interface UsageStats {
    provider: ModelProviderType;
    agentId: string;
    calls: number;
    totalTokens: {
        input: number;
        output: number;
    };
    totalCost: number;
    totalResponseTime: number;
    averageResponseTime: number;
    errors: number;
    lastUsed?: Date;
}

export interface ProviderUsageStats {
    provider: ModelProviderType;
    totalCalls: number;
    totalTokens: {
        input: number;
        output: number;
    };
    totalCost: number;
    averageResponseTime: number;
    successRate: number;
    agents: Map<string, UsageStats>;
}

export class UsageTracker {
    private static instance: UsageTracker;
    private stats: Map<string, UsageStats> = new Map(); // key: `${provider}-${agentId}`
    private providerStats: Map<ModelProviderType, ProviderUsageStats> = new Map();
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadStats();
    }

    /**
     * Получить экземпляр трекера (Singleton)
     */
    static getInstance(context?: vscode.ExtensionContext): UsageTracker {
        if (!UsageTracker.instance && context) {
            UsageTracker.instance = new UsageTracker(context);
        }
        return UsageTracker.instance;
    }

    /**
     * Записать использование провайдера
     */
    trackUsage(provider: ModelProviderType, agentId: string, result: CallResult, error?: Error): void {
        const key = `${provider}-${agentId}`;
        
        // Обновляем статистику агента
        let agentStats = this.stats.get(key);
        if (!agentStats) {
            agentStats = {
                provider,
                agentId,
                calls: 0,
                totalTokens: { input: 0, output: 0 },
                totalCost: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                errors: 0
            };
            this.stats.set(key, agentStats);
        }

        agentStats.calls++;
        agentStats.lastUsed = new Date();

        if (error) {
            agentStats.errors++;
        } else if (result) {
            if (result.tokensUsed) {
                agentStats.totalTokens.input += result.tokensUsed.input;
                agentStats.totalTokens.output += result.tokensUsed.output;
            }
            if (result.cost !== undefined) {
                agentStats.totalCost += result.cost;
            }
            if (result.responseTime !== undefined) {
                agentStats.totalResponseTime += result.responseTime;
                agentStats.averageResponseTime = agentStats.totalResponseTime / agentStats.calls;
            }
        }

        // Обновляем статистику провайдера
        let providerStats = this.providerStats.get(provider);
        if (!providerStats) {
            providerStats = {
                provider,
                totalCalls: 0,
                totalTokens: { input: 0, output: 0 },
                totalCost: 0,
                averageResponseTime: 0,
                successRate: 0,
                agents: new Map()
            };
            this.providerStats.set(provider, providerStats);
        }

        providerStats.totalCalls++;
        if (result && result.tokensUsed) {
            providerStats.totalTokens.input += result.tokensUsed.input;
            providerStats.totalTokens.output += result.tokensUsed.output;
        }
        if (result && result.cost !== undefined) {
            providerStats.totalCost += result.cost;
        }
        if (result && result.responseTime !== undefined) {
            const totalTime = providerStats.averageResponseTime * (providerStats.totalCalls - 1) + result.responseTime;
            providerStats.averageResponseTime = totalTime / providerStats.totalCalls;
        }

            const agentStat = providerStats.agents.get(agentId);
            const successCalls = providerStats.totalCalls - (agentStat?.errors || 0);
        providerStats.successRate = successCalls / providerStats.totalCalls;

        providerStats.agents.set(agentId, agentStats);

        // Сохраняем статистику
        this.saveStats();
    }

    /**
     * Получить статистику для агента
     */
    getAgentStats(agentId: string): UsageStats[] {
        return Array.from(this.stats.values()).filter(stat => stat.agentId === agentId);
    }

    /**
     * Получить статистику для провайдера
     */
    getProviderStats(provider: ModelProviderType): ProviderUsageStats | undefined {
        return this.providerStats.get(provider);
    }

    /**
     * Получить всю статистику
     */
    getAllStats(): {
        agents: UsageStats[];
        providers: ProviderUsageStats[];
    } {
        return {
            agents: Array.from(this.stats.values()),
            providers: Array.from(this.providerStats.values())
        };
    }

    /**
     * Получить рекомендации по оптимизации
     */
    getOptimizationRecommendations(): string[] {
        const recommendations: string[] = [];
        const stats = this.getAllStats();

        // Анализ стоимости
        const costs = stats.providers
            .filter(p => p.totalCost > 0)
            .sort((a, b) => b.totalCost - a.totalCost);

        if (costs.length > 0 && costs[0].totalCost > 10) {
            recommendations.push(
                `Высокая стоимость использования ${costs[0].provider}: $${costs[0].totalCost.toFixed(2)}. ` +
                `Рассмотрите использование локальных моделей (Ollama) для снижения затрат.`
            );
        }

        // Анализ производительности
        const slowProviders = stats.providers
            .filter(p => p.averageResponseTime > 5000)
            .sort((a, b) => b.averageResponseTime - a.averageResponseTime);

        if (slowProviders.length > 0) {
            recommendations.push(
                `Медленные ответы от ${slowProviders[0].provider}: ` +
                `${(slowProviders[0].averageResponseTime / 1000).toFixed(1)}с в среднем. ` +
                `Рассмотрите использование более быстрых моделей.`
            );
        }

        // Анализ успешности
        const lowSuccessProviders = stats.providers
            .filter(p => p.successRate < 0.9 && p.totalCalls > 10);

        if (lowSuccessProviders.length > 0) {
            recommendations.push(
                `Низкая успешность ${lowSuccessProviders[0].provider}: ` +
                `${(lowSuccessProviders[0].successRate * 100).toFixed(1)}%. ` +
                `Проверьте настройки подключения.`
            );
        }

        return recommendations;
    }

    /**
     * Сброс статистики
     */
    resetStats(): void {
        this.stats.clear();
        this.providerStats.clear();
        this.saveStats();
    }

    /**
     * Сохранение статистики
     */
    private saveStats(): void {
        try {
            const statsData = {
                agents: Array.from(this.stats.entries()),
                providers: Array.from(this.providerStats.entries()).map(([providerType, stats]) => {
                    const { provider, ...restStats } = stats;
                    return {
                        provider: providerType,
                        ...restStats,
                        agents: Array.from(stats.agents.entries())
                    };
                })
            };

            this.context.globalState.update('modelProviderUsageStats', statsData);
        } catch (error) {
            console.error('UsageTracker: Error saving stats:', error);
        }
    }

    /**
     * Загрузка статистики
     */
    private loadStats(): void {
        try {
            const statsData = this.context.globalState.get<{
                agents: [string, UsageStats][];
                providers: Array<{
                    provider: ModelProviderType;
                    agents: [string, UsageStats][];
                } & Omit<ProviderUsageStats, 'agents'>>;
            }>('modelProviderUsageStats');

            if (statsData) {
                // Восстанавливаем статистику агентов
                for (const [key, stats] of statsData.agents) {
                    this.stats.set(key, stats);
                }

                // Восстанавливаем статистику провайдеров
                for (const providerData of statsData.providers) {
                    const { provider: providerType, agents, ...rest } = providerData;
                    const providerStats: ProviderUsageStats = {
                        ...rest,
                        provider: providerType,
                        agents: new Map(agents)
                    };
                    this.providerStats.set(providerType, providerStats);
                }
            }
        } catch (error) {
            console.error('UsageTracker: Error loading stats:', error);
        }
    }
}
