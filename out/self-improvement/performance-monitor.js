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
exports.PerformanceMonitor = void 0;
const vscode = __importStar(require("vscode"));
class PerformanceMonitor {
    constructor(context, settingsManager) {
        this.context = context;
        this.settingsManager = settingsManager;
        this.metrics = {
            agents: new Map(),
            overallSuccessRate: 0,
            overallCodeQuality: 0,
            totalErrors: 0,
            lastAnalyzed: new Date()
        };
        this.loadMetrics();
    }
    /**
     * Отслеживание метрик агента
     */
    trackAgentMetrics(agentId, metrics) {
        const existing = this.metrics.agents.get(agentId) || {
            agentId,
            successRate: 0,
            averageExecutionTime: 0,
            codeQuality: 0,
            errorCount: 0,
            totalTasks: 0,
            lastUpdated: new Date()
        };
        // Обновление метрик
        if (metrics.successRate !== undefined) {
            existing.successRate = this.calculateMovingAverage(existing.successRate, metrics.successRate, existing.totalTasks);
        }
        if (metrics.averageExecutionTime !== undefined) {
            existing.averageExecutionTime = this.calculateMovingAverage(existing.averageExecutionTime, metrics.averageExecutionTime, existing.totalTasks);
        }
        if (metrics.codeQuality !== undefined) {
            existing.codeQuality = this.calculateMovingAverage(existing.codeQuality, metrics.codeQuality, existing.totalTasks);
        }
        if (metrics.errorCount !== undefined) {
            existing.errorCount += metrics.errorCount;
        }
        existing.totalTasks++;
        existing.lastUpdated = new Date();
        this.metrics.agents.set(agentId, existing);
        this.updateOverallMetrics();
        this.saveMetrics();
    }
    /**
     * Анализ успешности решений
     */
    analyzeSuccessRate(agentId) {
        const agentMetrics = this.metrics.agents.get(agentId);
        return agentMetrics?.successRate || 0;
    }
    /**
     * Выявление проблемных паттернов
     */
    identifyProblematicPatterns() {
        const problems = [];
        for (const [agentId, metrics] of this.metrics.agents) {
            // Низкая успешность
            if (metrics.successRate < 0.5) {
                problems.push(`Agent ${agentId}: Low success rate (${Math.round(metrics.successRate * 100)}%)`);
            }
            // Много ошибок
            if (metrics.errorCount > 10) {
                problems.push(`Agent ${agentId}: High error count (${metrics.errorCount})`);
            }
            // Низкое качество кода
            if (metrics.codeQuality < 0.6) {
                problems.push(`Agent ${agentId}: Low code quality (${Math.round(metrics.codeQuality * 100)}%)`);
            }
            // Медленное выполнение
            if (metrics.averageExecutionTime > 60000) { // > 1 минута
                problems.push(`Agent ${agentId}: Slow execution (${Math.round(metrics.averageExecutionTime / 1000)}s)`);
            }
        }
        return problems;
    }
    /**
     * Получение статистики
     */
    getStatistics() {
        return { ...this.metrics };
    }
    /**
     * Получение метрик агента
     */
    getAgentMetrics(agentId) {
        return this.metrics.agents.get(agentId);
    }
    calculateMovingAverage(current, newValue, count) {
        // Экспоненциальное скользящее среднее
        const alpha = 0.3; // Коэффициент сглаживания
        return alpha * newValue + (1 - alpha) * current;
    }
    updateOverallMetrics() {
        const agents = Array.from(this.metrics.agents.values());
        if (agents.length === 0) {
            return;
        }
        // Общая успешность
        this.metrics.overallSuccessRate = agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length;
        // Общее качество кода
        this.metrics.overallCodeQuality = agents.reduce((sum, a) => sum + a.codeQuality, 0) / agents.length;
        // Общее количество ошибок
        this.metrics.totalErrors = agents.reduce((sum, a) => sum + a.errorCount, 0);
        this.metrics.lastAnalyzed = new Date();
    }
    async loadMetrics() {
        const storagePath = this.context.globalStorageUri;
        const metricsFile = vscode.Uri.joinPath(storagePath, 'performance-metrics.json');
        try {
            const content = await vscode.workspace.fs.readFile(metricsFile);
            const data = JSON.parse(Buffer.from(content).toString('utf-8'));
            // Восстановление Map из массива
            this.metrics.agents = new Map(data.agents || []);
            this.metrics.overallSuccessRate = data.overallSuccessRate || 0;
            this.metrics.overallCodeQuality = data.overallCodeQuality || 0;
            this.metrics.totalErrors = data.totalErrors || 0;
        }
        catch (error) {
            // Файл не существует, используем значения по умолчанию
            console.log('Performance metrics file not found, using defaults');
        }
    }
    async saveMetrics() {
        const storagePath = this.context.globalStorageUri;
        const metricsFile = vscode.Uri.joinPath(storagePath, 'performance-metrics.json');
        // Преобразование Map в массив для сериализации
        const data = {
            agents: Array.from(this.metrics.agents.entries()),
            overallSuccessRate: this.metrics.overallSuccessRate,
            overallCodeQuality: this.metrics.overallCodeQuality,
            totalErrors: this.metrics.totalErrors,
            lastAnalyzed: this.metrics.lastAnalyzed.toISOString()
        };
        await vscode.workspace.fs.writeFile(metricsFile, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
//# sourceMappingURL=performance-monitor.js.map