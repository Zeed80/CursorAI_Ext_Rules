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
exports.ProjectKnowledgeBase = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * База знаний проекта
 * Хранит всю информацию о проекте для самообучаемого оркестратора
 */
class ProjectKnowledgeBase {
    constructor() {
        this.knowledge = null;
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.knowledgePath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config', 'project-knowledge.json')
            : '';
    }
    /**
     * Инициализация базы знаний
     */
    async initialize() {
        await this.loadKnowledge();
        if (!this.knowledge) {
            // Создаем новую базу знаний
            this.knowledge = this.createEmptyKnowledge();
            await this.saveKnowledge();
        }
    }
    /**
     * Получение базы знаний
     */
    getKnowledge() {
        return this.knowledge;
    }
    /**
     * Обновление структуры проекта
     */
    updateStructure(structure) {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }
        this.knowledge.structure = structure;
        this.knowledge.lastUpdated = new Date();
    }
    /**
     * Обновление графа зависимостей
     */
    updateDependencies(dependencies) {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }
        this.knowledge.dependencies = dependencies;
        this.knowledge.lastUpdated = new Date();
    }
    /**
     * Обновление профиля проекта
     */
    updateProfile(profile) {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }
        this.knowledge.profile = profile;
        this.knowledge.standards = {
            codeStyle: profile.codeStyle,
            architecture: profile.architecture,
            patterns: profile.patterns,
            conventions: {}
        };
        this.knowledge.lastUpdated = new Date();
    }
    /**
     * Добавление паттерна кода
     */
    addPattern(pattern) {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }
        const existing = this.knowledge.patterns.find(p => p.name === pattern.name);
        if (existing) {
            // Обновляем существующий паттерн
            existing.files = [...new Set([...existing.files, ...pattern.files])];
            existing.frequency += pattern.frequency;
            existing.effectiveness = (existing.effectiveness + pattern.effectiveness) / 2;
        }
        else {
            this.knowledge.patterns.push(pattern);
        }
        this.knowledge.lastUpdated = new Date();
    }
    /**
     * Добавление записи в историю решений
     */
    addDecision(decision) {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }
        this.knowledge.history.push(decision);
        // Ограничиваем размер истории (последние 1000 записей)
        if (this.knowledge.history.length > 1000) {
            this.knowledge.history = this.knowledge.history.slice(-1000);
        }
        // Обновляем метрики
        this.updateMetrics();
        this.knowledge.lastUpdated = new Date();
    }
    /**
     * Получение истории решений
     */
    getHistory(limit) {
        if (!this.knowledge) {
            return [];
        }
        const history = [...this.knowledge.history].reverse(); // Новые сначала
        return limit ? history.slice(0, limit) : history;
    }
    /**
     * Получение успешных решений
     */
    getSuccessfulDecisions(limit) {
        if (!this.knowledge) {
            return [];
        }
        const successful = this.knowledge.history
            .filter(d => d.outcome.success)
            .sort((a, b) => b.outcome.quality - a.outcome.quality);
        return limit ? successful.slice(0, limit) : successful;
    }
    /**
     * Получение метрик проекта
     */
    getMetrics() {
        if (!this.knowledge) {
            return this.createEmptyMetrics();
        }
        return this.knowledge.metrics;
    }
    /**
     * Получение паттернов проекта
     */
    getPatterns() {
        if (!this.knowledge) {
            return [];
        }
        return this.knowledge.patterns.sort((a, b) => b.effectiveness - a.effectiveness);
    }
    /**
     * Получение стандартов проекта
     */
    getStandards() {
        if (!this.knowledge) {
            return { patterns: [], conventions: {} };
        }
        return this.knowledge.standards;
    }
    /**
     * Обновление метрик
     */
    updateMetrics() {
        if (!this.knowledge) {
            return;
        }
        const history = this.knowledge.history;
        const totalTasks = history.length;
        const completedTasks = history.filter(d => d.outcome.success).length;
        const averageExecutionTime = history.length > 0
            ? history.reduce((sum, d) => sum + d.outcome.executionTime, 0) / history.length
            : 0;
        const averageQuality = history.length > 0
            ? history.reduce((sum, d) => sum + d.outcome.quality, 0) / history.length
            : 0;
        const successRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
        // Находим наиболее эффективных агентов
        const agentStats = new Map();
        history.forEach(d => {
            const stats = agentStats.get(d.decision.agentId) || { success: 0, total: 0 };
            stats.total++;
            if (d.outcome.success) {
                stats.success++;
            }
            agentStats.set(d.decision.agentId, stats);
        });
        const mostEffectiveAgents = Array.from(agentStats.entries())
            .map(([agentId, stats]) => ({
            agentId,
            successRate: stats.total > 0 ? stats.success / stats.total : 0
        }))
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 5);
        this.knowledge.metrics = {
            totalTasks,
            completedTasks,
            averageExecutionTime,
            averageQuality,
            successRate,
            mostEffectiveAgents,
            commonPatterns: this.knowledge.patterns.slice(0, 10),
            lastUpdated: new Date()
        };
    }
    /**
     * Создание пустой базы знаний
     */
    createEmptyKnowledge() {
        return {
            structure: {
                files: [],
                directories: [],
                entryPoints: []
            },
            dependencies: null,
            patterns: [],
            standards: {
                patterns: [],
                conventions: {}
            },
            history: [],
            metrics: this.createEmptyMetrics(),
            profile: null,
            lastUpdated: new Date()
        };
    }
    /**
     * Создание пустых метрик
     */
    createEmptyMetrics() {
        return {
            totalTasks: 0,
            completedTasks: 0,
            averageExecutionTime: 0,
            averageQuality: 0,
            successRate: 0,
            mostEffectiveAgents: [],
            commonPatterns: [],
            lastUpdated: new Date()
        };
    }
    /**
     * Загрузка базы знаний из файла
     */
    async loadKnowledge() {
        if (!this.knowledgePath || !fs.existsSync(this.knowledgePath)) {
            this.knowledge = null;
            return;
        }
        try {
            const content = fs.readFileSync(this.knowledgePath, 'utf-8');
            const parsed = JSON.parse(content);
            // Преобразуем даты из строк
            if (parsed.history) {
                parsed.history = parsed.history.map((d) => ({
                    ...d,
                    timestamp: new Date(d.timestamp)
                }));
            }
            if (parsed.metrics) {
                parsed.metrics.lastUpdated = new Date(parsed.metrics.lastUpdated);
            }
            parsed.lastUpdated = new Date(parsed.lastUpdated);
            this.knowledge = parsed;
        }
        catch (error) {
            console.error('Error loading project knowledge:', error);
            this.knowledge = null;
        }
    }
    /**
     * Сохранение базы знаний в файл
     */
    async saveKnowledge() {
        if (!this.knowledgePath || !this.knowledge) {
            return;
        }
        try {
            const dir = path.dirname(this.knowledgePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.knowledgePath, JSON.stringify(this.knowledge, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Error saving project knowledge:', error);
        }
    }
    /**
     * Автоматическое сохранение (периодическое)
     */
    startAutoSave(interval = 60000) {
        return setInterval(() => {
            this.saveKnowledge().catch(err => {
                console.error('Error in auto-save:', err);
            });
        }, interval);
    }
}
exports.ProjectKnowledgeBase = ProjectKnowledgeBase;
//# sourceMappingURL=project-knowledge-base.js.map