"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskAnalytics = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Система аналитики задач
 * Собирает и анализирует метрики выполнения задач для оптимизации работы агентов
 */
class TaskAnalytics {
    constructor(context, settingsManager) {
        this.metrics = new Map();
        this.taskHistory = [];
        this.context = context;
        this.settingsManager = settingsManager;
        this.loadMetrics();
    }
    /**
     * Начало отслеживания задачи
     */
    trackTaskStart(task) {
        const metrics = {
            taskId: task.id,
            type: task.type,
            priority: task.priority,
            assignedAgent: task.assignedAgent,
            createdAt: task.createdAt,
            startedAt: new Date(),
            status: 'in-progress',
            isSuccessful: false,
            retryCount: 0
        };
        this.metrics.set(task.id, metrics);
        this.saveMetrics();
    }
    /**
     * Отслеживание завершения задачи
     */
    trackTaskComplete(task, isSuccessful = true, errorMessage) {
        const metrics = this.metrics.get(task.id);
        if (!metrics) {
            console.warn(`Task metrics not found for task ${task.id}`);
            return;
        }
        metrics.completedAt = new Date();
        metrics.status = task.status;
        metrics.isSuccessful = isSuccessful;
        metrics.errorMessage = errorMessage;
        if (metrics.startedAt) {
            metrics.executionTime = metrics.completedAt.getTime() - metrics.startedAt.getTime();
            metrics.actualTime = metrics.executionTime;
        }
        // Перемещаем в историю
        this.taskHistory.push(metrics);
        this.metrics.delete(task.id);
        // Ограничиваем размер истории (последние 1000 задач)
        if (this.taskHistory.length > 1000) {
            this.taskHistory = this.taskHistory.slice(-1000);
        }
        this.saveMetrics();
    }
    /**
     * Отслеживание ошибки задачи
     */
    trackTaskError(task, errorMessage) {
        const metrics = this.metrics.get(task.id);
        if (!metrics) {
            return;
        }
        metrics.retryCount++;
        metrics.errorMessage = errorMessage;
        this.saveMetrics();
    }
    /**
     * Получение метрик задачи
     */
    getTaskMetrics(taskId) {
        return this.metrics.get(taskId) ||
            this.taskHistory.find(m => m.taskId === taskId);
    }
    /**
     * Статистика по типам задач
     */
    getStatisticsByType() {
        const typeMap = new Map();
        // Группируем задачи по типам
        for (const metrics of this.taskHistory) {
            if (!typeMap.has(metrics.type)) {
                typeMap.set(metrics.type, []);
            }
            typeMap.get(metrics.type).push(metrics);
        }
        const statistics = [];
        for (const [type, tasks] of typeMap) {
            const completed = tasks.filter(t => t.status === 'completed' && t.isSuccessful).length;
            const failed = tasks.filter(t => !t.isSuccessful || t.status === 'blocked').length;
            const inProgress = tasks.filter(t => t.status === 'in-progress').length;
            const executionTimes = tasks
                .filter(t => t.executionTime !== undefined)
                .map(t => t.executionTime);
            const averageExecutionTime = executionTimes.length > 0
                ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
                : 0;
            const successRate = tasks.length > 0
                ? completed / tasks.length
                : 0;
            statistics.push({
                type,
                total: tasks.length,
                completed,
                failed,
                inProgress,
                averageExecutionTime,
                successRate,
                totalExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0)
            });
        }
        return statistics.sort((a, b) => b.total - a.total);
    }
    /**
     * Статистика по агентам
     */
    getStatisticsByAgent(agentNames = new Map()) {
        const agentMap = new Map();
        // Группируем задачи по агентам
        for (const metrics of this.taskHistory) {
            if (!metrics.assignedAgent)
                continue;
            if (!agentMap.has(metrics.assignedAgent)) {
                agentMap.set(metrics.assignedAgent, []);
            }
            agentMap.get(metrics.assignedAgent).push(metrics);
        }
        const statistics = [];
        for (const [agentId, tasks] of agentMap) {
            const completed = tasks.filter(t => t.status === 'completed' && t.isSuccessful).length;
            const failed = tasks.filter(t => !t.isSuccessful || t.status === 'blocked').length;
            const executionTimes = tasks
                .filter(t => t.executionTime !== undefined)
                .map(t => t.executionTime);
            const averageExecutionTime = executionTimes.length > 0
                ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
                : 0;
            const successRate = tasks.length > 0
                ? completed / tasks.length
                : 0;
            // Группировка по типам
            const tasksByType = new Map();
            for (const task of tasks) {
                tasksByType.set(task.type, (tasksByType.get(task.type) || 0) + 1);
            }
            // Группировка по приоритетам
            const tasksByPriority = new Map();
            for (const task of tasks) {
                tasksByPriority.set(task.priority, (tasksByPriority.get(task.priority) || 0) + 1);
            }
            statistics.push({
                agentId,
                agentName: agentNames.get(agentId) || agentId,
                totalTasks: tasks.length,
                completedTasks: completed,
                failedTasks: failed,
                averageExecutionTime,
                successRate,
                tasksByType,
                tasksByPriority
            });
        }
        return statistics.sort((a, b) => b.totalTasks - a.totalTasks);
    }
    /**
     * Генерация аналитического отчета
     */
    generateReport(startDate, endDate, agentNames = new Map()) {
        const now = new Date();
        const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 дней назад
        const end = endDate || now;
        // Фильтруем задачи по периоду
        const periodTasks = this.taskHistory.filter(task => task.createdAt >= start && task.createdAt <= end);
        const completed = periodTasks.filter(t => t.status === 'completed' && t.isSuccessful).length;
        const failed = periodTasks.filter(t => !t.isSuccessful || t.status === 'blocked').length;
        const executionTimes = periodTasks
            .filter(t => t.executionTime !== undefined)
            .map(t => t.executionTime);
        const averageExecutionTime = executionTimes.length > 0
            ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
            : 0;
        const successRate = periodTasks.length > 0
            ? completed / periodTasks.length
            : 0;
        // Статистика по приоритетам
        const priorityStats = {
            high: this.calculatePriorityStats(periodTasks, 'high'),
            medium: this.calculatePriorityStats(periodTasks, 'medium'),
            low: this.calculatePriorityStats(periodTasks, 'low')
        };
        // Тренды
        const trends = this.calculateTrends(periodTasks, start, end);
        // Рекомендации
        const recommendations = this.generateRecommendations(periodTasks);
        return {
            period: { start, end },
            overall: {
                totalTasks: periodTasks.length,
                completedTasks: completed,
                failedTasks: failed,
                successRate,
                averageExecutionTime,
                totalExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0)
            },
            byType: this.getStatisticsByType(),
            byAgent: this.getStatisticsByAgent(agentNames),
            byPriority: priorityStats,
            trends,
            recommendations
        };
    }
    /**
     * Расчет статистики по приоритету
     */
    calculatePriorityStats(tasks, priority) {
        const priorityTasks = tasks.filter(t => t.priority === priority);
        const completed = priorityTasks.filter(t => t.status === 'completed' && t.isSuccessful).length;
        const executionTimes = priorityTasks
            .filter(t => t.executionTime !== undefined)
            .map(t => t.executionTime);
        return {
            total: priorityTasks.length,
            averageTime: executionTimes.length > 0
                ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
                : 0,
            successRate: priorityTasks.length > 0
                ? completed / priorityTasks.length
                : 0
        };
    }
    /**
     * Расчет трендов
     */
    calculateTrends(tasks, start, end) {
        const tasksPerDay = new Map();
        const successRatePerDay = new Map();
        const averageTimePerDay = new Map();
        // Группируем по дням
        for (const task of tasks) {
            const dateKey = task.createdAt.toISOString().split('T')[0];
            // Задачи в день
            tasksPerDay.set(dateKey, (tasksPerDay.get(dateKey) || 0) + 1);
            // Успешность
            if (!successRatePerDay.has(dateKey)) {
                successRatePerDay.set(dateKey, { total: 0, successful: 0 });
            }
            const sr = successRatePerDay.get(dateKey);
            sr.total++;
            if (task.isSuccessful) {
                sr.successful++;
            }
            // Среднее время
            if (task.executionTime !== undefined) {
                if (!averageTimePerDay.has(dateKey)) {
                    averageTimePerDay.set(dateKey, { total: 0, sum: 0 });
                }
                const at = averageTimePerDay.get(dateKey);
                at.total++;
                at.sum += task.executionTime;
            }
        }
        // Преобразуем в массивы
        const tasksPerDayArray = Array.from(tasksPerDay.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        const successRateOverTime = Array.from(successRatePerDay.entries())
            .map(([date, data]) => ({
            date,
            rate: data.total > 0 ? data.successful / data.total : 0
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
        const averageTimeOverTime = Array.from(averageTimePerDay.entries())
            .map(([date, data]) => ({
            date,
            time: data.total > 0 ? data.sum / data.total : 0
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return {
            tasksPerDay: tasksPerDayArray,
            successRateOverTime,
            averageTimeOverTime
        };
    }
    /**
     * Генерация рекомендаций на основе данных
     */
    generateRecommendations(tasks) {
        const recommendations = [];
        // Анализ успешности по типам
        const typeStats = this.getStatisticsByType();
        for (const stat of typeStats) {
            if (stat.successRate < 0.5 && stat.total > 5) {
                recommendations.push(`Низкая успешность задач типа "${stat.type}" (${Math.round(stat.successRate * 100)}%). ` +
                    `Рекомендуется пересмотреть подход к выполнению таких задач.`);
            }
        }
        // Анализ времени выполнения
        const slowTasks = tasks.filter(t => t.executionTime !== undefined && t.executionTime > 300000 // > 5 минут
        );
        if (slowTasks.length > 0) {
            recommendations.push(`Обнаружено ${slowTasks.length} задач с временем выполнения > 5 минут. ` +
                `Рекомендуется разбить сложные задачи на более мелкие.`);
        }
        // Анализ ошибок
        const failedTasks = tasks.filter(t => !t.isSuccessful);
        if (failedTasks.length > tasks.length * 0.2) {
            recommendations.push(`Высокий процент неудачных задач (${Math.round(failedTasks.length / tasks.length * 100)}%). ` +
                `Рекомендуется провести анализ причин ошибок.`);
        }
        // Анализ распределения по агентам
        const agentStats = this.getStatisticsByAgent();
        const unbalancedAgents = agentStats.filter(a => a.totalTasks > 0 && a.successRate < 0.6);
        if (unbalancedAgents.length > 0) {
            recommendations.push(`Обнаружены агенты с низкой успешностью: ${unbalancedAgents.map(a => a.agentName).join(', ')}. ` +
                `Рекомендуется пересмотреть назначение задач или улучшить работу этих агентов.`);
        }
        if (recommendations.length === 0) {
            recommendations.push('Система работает стабильно. Рекомендации не требуются.');
        }
        return recommendations;
    }
    /**
     * Загрузка метрик из хранилища
     */
    async loadMetrics() {
        const storagePath = this.context.globalStorageUri;
        const metricsFile = vscode.Uri.joinPath(storagePath, 'task-analytics.json');
        try {
            const content = await vscode.workspace.fs.readFile(metricsFile);
            const data = JSON.parse(Buffer.from(content).toString('utf-8'));
            // Восстанавливаем историю задач
            this.taskHistory = (data.taskHistory || []).map((item) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
                completedAt: item.completedAt ? new Date(item.completedAt) : undefined
            }));
            // Восстанавливаем активные метрики
            const activeMetrics = (data.activeMetrics || []).map((item) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                startedAt: item.startedAt ? new Date(item.startedAt) : undefined
            }));
            for (const metric of activeMetrics) {
                this.metrics.set(metric.taskId, metric);
            }
        }
        catch (error) {
            // Файл не существует, используем значения по умолчанию
            console.log('Task analytics file not found, using defaults');
        }
    }
    /**
     * Сохранение метрик в хранилище
     */
    async saveMetrics() {
        const storagePath = this.context.globalStorageUri;
        const metricsFile = vscode.Uri.joinPath(storagePath, 'task-analytics.json');
        const data = {
            taskHistory: this.taskHistory.map(m => ({
                ...m,
                createdAt: m.createdAt.toISOString(),
                startedAt: m.startedAt?.toISOString(),
                completedAt: m.completedAt?.toISOString()
            })),
            activeMetrics: Array.from(this.metrics.values()).map(m => ({
                ...m,
                createdAt: m.createdAt.toISOString(),
                startedAt: m.startedAt?.toISOString()
            }))
        };
        await vscode.workspace.fs.writeFile(metricsFile, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));
    }
    /**
     * Очистка старых данных
     */
    async cleanupOldData(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        this.taskHistory = this.taskHistory.filter(task => task.createdAt >= cutoffDate);
        await this.saveMetrics();
    }
}
exports.TaskAnalytics = TaskAnalytics;
//# sourceMappingURL=task-analytics.js.map