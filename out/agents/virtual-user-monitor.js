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
exports.ProjectMonitor = void 0;
const vscode = __importStar(require("vscode"));
class ProjectMonitor {
    constructor(context, settingsManager) {
        this.context = context;
        this.settingsManager = settingsManager;
    }
    /**
     * Анализ состояния проекта
     */
    async analyzeProjectState() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        // Анализ качества кода
        const codeQuality = await this.analyzeCodeQuality();
        // Анализ покрытия тестами
        const testCoverage = await this.analyzeTestCoverage();
        // Анализ документации
        const documentation = await this.analyzeDocumentation();
        // Анализ производительности
        const performance = await this.analyzePerformance();
        this.projectState = {
            codeQuality,
            testCoverage,
            documentation,
            performance,
            lastAnalyzed: new Date()
        };
        return this.projectState;
    }
    /**
     * Выявление проблем
     */
    async detectIssues() {
        const issues = [];
        const state = this.projectState || await this.analyzeProjectState();
        // Проблемы с качеством кода
        if (state.codeQuality < 0.7) {
            issues.push('Низкое качество кода - требуется рефакторинг');
        }
        // Проблемы с тестами
        if (state.testCoverage < 0.5) {
            issues.push('Низкое покрытие тестами - требуется добавить тесты');
        }
        // Проблемы с документацией
        if (state.documentation < 0.6) {
            issues.push('Недостаточная документация - требуется улучшить документацию');
        }
        // Проблемы с производительностью
        if (state.performance < 0.7) {
            issues.push('Проблемы с производительностью - требуется оптимизация');
        }
        // Поиск TODO и FIXME
        const todos = await this.findTODOs();
        issues.push(...todos);
        return issues;
    }
    /**
     * Предложения по улучшению
     */
    async suggestImprovements() {
        const improvements = [];
        const state = this.projectState || await this.analyzeProjectState();
        // Улучшения на основе метрик
        if (state.codeQuality < 0.9) {
            improvements.push('Улучшить качество кода через рефакторинг');
        }
        if (state.testCoverage < 0.8) {
            improvements.push('Увеличить покрытие тестами до 80%+');
        }
        if (state.documentation < 0.8) {
            improvements.push('Улучшить документацию проекта');
        }
        // Анализ паттернов для улучшений
        const patternImprovements = await this.analyzePatterns();
        improvements.push(...patternImprovements);
        return improvements;
    }
    /**
     * Предложения новых фич
     */
    async suggestNewFeatures() {
        const features = [];
        // Анализ кода для выявления возможных фич
        const codebase = await this.analyzeCodebase();
        // Поиск комментариев о будущих фичах
        const futureFeatures = await this.findFutureFeatures();
        features.push(...futureFeatures);
        // Анализ зависимостей для предложения интеграций
        const integrations = await this.suggestIntegrations();
        features.push(...integrations);
        return features;
    }
    /**
     * Выявление проблем производительности
     */
    async detectPerformanceIssues() {
        const issues = [];
        // Поиск медленных запросов
        const slowQueries = await this.findSlowQueries();
        issues.push(...slowQueries);
        // Поиск неоптимальных алгоритмов
        const inefficientCode = await this.findInefficientCode();
        issues.push(...inefficientCode);
        return issues;
    }
    async analyzeCodeQuality() {
        // Простой анализ качества кода
        // В реальной реализации можно использовать линтеры, анализаторы кода
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return 0.5;
        }
        // Подсчет файлов с ошибками линтера
        const allDiagnostics = vscode.languages.getDiagnostics();
        let totalIssues = 0;
        let totalFiles = 0;
        for (const [uri, fileDiagnostics] of allDiagnostics) {
            totalFiles++;
            totalIssues += fileDiagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length;
        }
        // Качество = 1 - (количество ошибок / количество файлов * коэффициент)
        const quality = Math.max(0, Math.min(1, 1 - (totalIssues / Math.max(totalFiles, 1) * 0.1)));
        return quality;
    }
    async analyzeTestCoverage() {
        // Анализ покрытия тестами
        // В реальной реализации можно использовать инструменты покрытия
        const testFiles = await vscode.workspace.findFiles('**/*.test.{ts,js}', null, 100);
        const sourceFiles = await vscode.workspace.findFiles('**/*.{ts,js}', '**/node_modules/**', 100);
        if (sourceFiles.length === 0) {
            return 0;
        }
        // Простая оценка: отношение тестовых файлов к исходным
        const coverage = Math.min(1, testFiles.length / sourceFiles.length * 2);
        return coverage;
    }
    async analyzeDocumentation() {
        // Анализ документации
        const docFiles = await vscode.workspace.findFiles('**/*.{md,mdx}', '**/node_modules/**', 50);
        const sourceFiles = await vscode.workspace.findFiles('**/*.{ts,js}', '**/node_modules/**', 100);
        if (sourceFiles.length === 0) {
            return 0.5;
        }
        // Оценка: отношение документации к коду
        const docRatio = docFiles.length / sourceFiles.length;
        const documentation = Math.min(1, docRatio * 2);
        return documentation;
    }
    async analyzePerformance() {
        // Базовая оценка производительности
        // В реальной реализации можно использовать профилирование
        return 0.8; // Временная оценка
    }
    async findTODOs() {
        const todos = [];
        const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**', 100);
        for (const file of files.slice(0, 20)) { // Ограничение для производительности
            try {
                const content = await vscode.workspace.fs.readFile(file);
                const text = Buffer.from(content).toString('utf-8');
                const todoMatches = text.matchAll(/TODO[:\s]+(.+)/gi);
                for (const match of todoMatches) {
                    todos.push(match[1]?.trim() || 'TODO found');
                }
            }
            catch (error) {
                // Пропускаем файлы с ошибками
            }
        }
        return todos;
    }
    async analyzePatterns() {
        // Анализ паттернов кода для предложения улучшений
        return [];
    }
    async analyzeCodebase() {
        // Анализ кодовой базы
        return {};
    }
    async findFutureFeatures() {
        const features = [];
        const files = await vscode.workspace.findFiles('**/*.{md,ts,js}', '**/node_modules/**', 50);
        for (const file of files.slice(0, 10)) {
            try {
                const content = await vscode.workspace.fs.readFile(file);
                const text = Buffer.from(content).toString('utf-8');
                const featureMatches = text.matchAll(/(?:feature|фича|планируется)[:\s]+(.+)/gi);
                for (const match of featureMatches) {
                    features.push(match[1]?.trim() || '');
                }
            }
            catch (error) {
                // Пропускаем файлы с ошибками
            }
        }
        return features.filter(f => f.length > 0);
    }
    async suggestIntegrations() {
        // Предложения интеграций на основе зависимостей
        return [];
    }
    async findSlowQueries() {
        // Поиск медленных запросов
        return [];
    }
    async findInefficientCode() {
        // Поиск неоптимального кода
        return [];
    }
    dispose() {
        // Очистка ресурсов
    }
}
exports.ProjectMonitor = ProjectMonitor;
//# sourceMappingURL=virtual-user-monitor.js.map