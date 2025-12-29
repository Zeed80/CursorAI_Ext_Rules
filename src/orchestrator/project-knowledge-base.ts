import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectProfile } from './project-analyzer';
import { DependencyGraph } from './project-dependency-graph';

/**
 * Паттерн кода
 */
export interface CodePattern {
    name: string;
    description: string;
    files: string[];
    frequency: number;
    effectiveness: number; // 0-1
}

/**
 * Стандарты кода
 */
export interface CodeStandards {
    codeStyle?: string;
    architecture?: string;
    patterns: string[];
    conventions: { [key: string]: string };
}

/**
 * История решений
 */
export interface DecisionHistory {
    id: string;
    taskId: string;
    timestamp: Date;
    decision: {
        type: 'selected' | 'merged' | 'refined';
        solutionId: string;
        agentId: string;
        reasoning: string;
    };
    outcome: {
        success: boolean;
        executionTime: number;
        filesChanged: number;
        quality: number; // 0-1
        issues: string[];
    };
    lessons: string[];
}

/**
 * Метрики проекта
 */
export interface ProjectMetrics {
    totalTasks: number;
    completedTasks: number;
    averageExecutionTime: number;
    averageQuality: number;
    successRate: number;
    mostEffectiveAgents: { agentId: string; successRate: number }[];
    commonPatterns: CodePattern[];
    lastUpdated: Date;
}

/**
 * База знаний проекта
 */
export interface ProjectKnowledge {
    structure: {
        files: string[];
        directories: string[];
        entryPoints: string[];
    };
    dependencies: DependencyGraph | null;
    patterns: CodePattern[];
    standards: CodeStandards;
    history: DecisionHistory[];
    metrics: ProjectMetrics;
    profile: ProjectProfile | null;
    lastUpdated: Date;
}

/**
 * База знаний проекта
 * Хранит всю информацию о проекте для самообучаемого оркестратора
 */
export class ProjectKnowledgeBase {
    private workspaceFolder: vscode.WorkspaceFolder | undefined;
    private knowledgePath: string;
    private knowledge: ProjectKnowledge | null = null;

    constructor() {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.knowledgePath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config', 'project-knowledge.json')
            : '';
    }

    /**
     * Инициализация базы знаний
     */
    async initialize(): Promise<void> {
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
    getKnowledge(): ProjectKnowledge | null {
        return this.knowledge;
    }

    /**
     * Обновление структуры проекта
     */
    updateStructure(structure: ProjectKnowledge['structure']): void {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }

        this.knowledge.structure = structure;
        this.knowledge.lastUpdated = new Date();
    }

    /**
     * Обновление графа зависимостей
     */
    updateDependencies(dependencies: DependencyGraph | null): void {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }

        this.knowledge.dependencies = dependencies;
        this.knowledge.lastUpdated = new Date();
    }

    /**
     * Обновление профиля проекта
     */
    updateProfile(profile: ProjectProfile): void {
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
    addPattern(pattern: CodePattern): void {
        if (!this.knowledge) {
            this.knowledge = this.createEmptyKnowledge();
        }

        const existing = this.knowledge.patterns.find(p => p.name === pattern.name);
        if (existing) {
            // Обновляем существующий паттерн
            existing.files = [...new Set([...existing.files, ...pattern.files])];
            existing.frequency += pattern.frequency;
            existing.effectiveness = (existing.effectiveness + pattern.effectiveness) / 2;
        } else {
            this.knowledge.patterns.push(pattern);
        }

        this.knowledge.lastUpdated = new Date();
    }

    /**
     * Добавление записи в историю решений
     */
    addDecision(decision: DecisionHistory): void {
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
    getHistory(limit?: number): DecisionHistory[] {
        if (!this.knowledge) {
            return [];
        }

        const history = [...this.knowledge.history].reverse(); // Новые сначала
        return limit ? history.slice(0, limit) : history;
    }

    /**
     * Получение успешных решений
     */
    getSuccessfulDecisions(limit?: number): DecisionHistory[] {
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
    getMetrics(): ProjectMetrics {
        if (!this.knowledge) {
            return this.createEmptyMetrics();
        }

        return this.knowledge.metrics;
    }

    /**
     * Получение паттернов проекта
     */
    getPatterns(): CodePattern[] {
        if (!this.knowledge) {
            return [];
        }

        return this.knowledge.patterns.sort((a, b) => b.effectiveness - a.effectiveness);
    }

    /**
     * Получение стандартов проекта
     */
    getStandards(): CodeStandards {
        if (!this.knowledge) {
            return { patterns: [], conventions: {} };
        }

        return this.knowledge.standards;
    }

    /**
     * Обновление метрик
     */
    private updateMetrics(): void {
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
        const agentStats = new Map<string, { success: number; total: number }>();
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
    private createEmptyKnowledge(): ProjectKnowledge {
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
    private createEmptyMetrics(): ProjectMetrics {
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
    private async loadKnowledge(): Promise<void> {
        if (!this.knowledgePath || !fs.existsSync(this.knowledgePath)) {
            this.knowledge = null;
            return;
        }

        try {
            const content = fs.readFileSync(this.knowledgePath, 'utf-8');
            const parsed = JSON.parse(content);
            
            // Преобразуем даты из строк
            if (parsed.history) {
                parsed.history = parsed.history.map((d: any) => ({
                    ...d,
                    timestamp: new Date(d.timestamp)
                }));
            }
            if (parsed.metrics) {
                parsed.metrics.lastUpdated = new Date(parsed.metrics.lastUpdated);
            }
            parsed.lastUpdated = new Date(parsed.lastUpdated);

            this.knowledge = parsed as ProjectKnowledge;
        } catch (error) {
            console.error('Error loading project knowledge:', error);
            this.knowledge = null;
        }
    }

    /**
     * Сохранение базы знаний в файл
     */
    async saveKnowledge(): Promise<void> {
        if (!this.knowledgePath || !this.knowledge) {
            return;
        }

        try {
            const dir = path.dirname(this.knowledgePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(
                this.knowledgePath,
                JSON.stringify(this.knowledge, null, 2),
                'utf-8'
            );
        } catch (error) {
            console.error('Error saving project knowledge:', error);
        }
    }

    /**
     * Автоматическое сохранение (периодическое)
     */
    startAutoSave(interval: number = 60000): NodeJS.Timeout {
        return setInterval(() => {
            this.saveKnowledge().catch(err => {
                console.error('Error in auto-save:', err);
            });
        }, interval);
    }
}
