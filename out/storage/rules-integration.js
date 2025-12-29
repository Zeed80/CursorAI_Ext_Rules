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
exports.RulesIntegration = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const project_analyzer_1 = require("../orchestrator/project-analyzer");
const rule_generator_1 = require("../orchestrator/rule-generator");
const rules_versioning_1 = require("./rules-versioning");
/**
 * Интеграция существующих правил из .cursor/rules в расширение
 * с поддержкой автоматической адаптации и мониторинга изменений
 */
class RulesIntegration {
    constructor() {
        this.rulesCache = new Map();
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.rulesPath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'rules')
            : '';
        this.configPath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config')
            : '';
        this.projectAnalyzer = new project_analyzer_1.ProjectAnalyzer();
        this.ruleGenerator = new rule_generator_1.RuleGenerator();
        this.rulesVersioning = new rules_versioning_1.RulesVersioning();
        // Инициализация мониторинга изменений
        this.initializeFileWatcher();
    }
    /**
     * Копирование правил в расширение
     */
    async copyRulesToExtension(extensionPath) {
        if (!this.rulesPath || !fs.existsSync(this.rulesPath)) {
            console.log('Rules directory not found, skipping integration');
            return;
        }
        const targetPath = path.join(extensionPath, '.cursor', 'rules');
        // Создание целевой директории
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        // Копирование всех правил
        await this.copyDirectory(this.rulesPath, targetPath);
        console.log(`Rules copied from ${this.rulesPath} to ${targetPath}`);
    }
    /**
     * Получение списка правил
     */
    getRulesList() {
        if (!this.rulesPath || !fs.existsSync(this.rulesPath)) {
            return [];
        }
        const rules = [];
        this.getFilesRecursive(this.rulesPath, rules);
        return rules;
    }
    /**
     * Загрузка правила
     */
    async loadRule(rulePath) {
        const fullPath = path.isAbsolute(rulePath)
            ? rulePath
            : path.join(this.rulesPath, rulePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Rule not found: ${fullPath}`);
        }
        return fs.readFileSync(fullPath, 'utf-8');
    }
    /**
     * Проверка существования правил
     */
    rulesExist() {
        return this.rulesPath !== '' && fs.existsSync(this.rulesPath);
    }
    /**
     * Автоматическая адаптация правил под проект
     */
    async adaptRulesToProject() {
        console.log('RulesIntegration: Starting automatic rule adaptation...');
        try {
            // Анализ проекта
            const profile = await this.projectAnalyzer.analyzeProject();
            console.log('Project profile:', profile);
            // Генерация правил на основе профиля
            const generatedRules = await this.ruleGenerator.generateRulesFromProfile();
            // Сохранение правил с версионированием
            for (const rule of generatedRules) {
                // Проверка изменений перед созданием версии
                const hasChanges = await this.rulesVersioning.hasChanges(rule.path, rule.content);
                if (hasChanges) {
                    // Создание версии перед сохранением
                    await this.rulesVersioning.createVersion(rule.path, rule.content, rule.reason);
                }
            }
            await this.ruleGenerator.saveRules(generatedRules);
            // Обновление индекса правил
            await this.updateRulesIndex();
            // Логирование изменений
            await this.logAdaptation({
                type: 'auto-adaptation',
                rulesGenerated: generatedRules.length,
                profile: profile
            });
            console.log(`RulesIntegration: Generated ${generatedRules.length} rules`);
        }
        catch (error) {
            console.error('Error adapting rules:', error);
        }
    }
    /**
     * Мониторинг изменений в проекте для автоматической адаптации
     */
    initializeFileWatcher() {
        if (!this.workspaceFolder) {
            return;
        }
        // Отслеживание изменений в конфигурационных файлах
        const configPattern = new vscode.RelativePattern(this.workspaceFolder, '{package.json,composer.json,requirements.txt,go.mod,Cargo.toml,docker-compose.yml}');
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(configPattern);
        this.fileWatcher.onDidChange(async (uri) => {
            console.log(`Config file changed: ${uri.fsPath}`);
            // Задержка перед адаптацией, чтобы избежать множественных вызовов
            setTimeout(() => {
                this.adaptRulesToProject().catch(err => {
                    console.error('Error in auto-adaptation:', err);
                });
            }, 2000);
        });
        this.fileWatcher.onDidCreate(async (uri) => {
            console.log(`Config file created: ${uri.fsPath}`);
            setTimeout(() => {
                this.adaptRulesToProject().catch(err => {
                    console.error('Error in auto-adaptation:', err);
                });
            }, 2000);
        });
    }
    /**
     * Обновление индекса правил
     */
    async updateRulesIndex() {
        if (!this.rulesPath) {
            return;
        }
        const indexPath = path.join(this.rulesPath, 'rules-index.mdc');
        const rules = this.getRulesList();
        let indexContent = `---
name: Rules Index
description: Автоматически сгенерированный индекс правил
globs: ["**/*"]
alwaysApply: false
---

# Индекс правил

## Всего правил: ${rules.length}

## Список правил:

`;
        for (const rulePath of rules) {
            const relativePath = path.relative(this.rulesPath, rulePath);
            indexContent += `- [${path.basename(rulePath)}](${relativePath})\n`;
        }
        indexContent += `\n---\n*Обновлено: ${new Date().toISOString()}*\n`;
        try {
            fs.writeFileSync(indexPath, indexContent, 'utf-8');
            console.log('Rules index updated');
        }
        catch (error) {
            console.error('Error updating rules index:', error);
        }
    }
    /**
     * Логирование адаптации правил
     */
    async logAdaptation(data) {
        if (!this.configPath) {
            return;
        }
        const logPath = path.join(this.configPath, 'adaptation-log.json');
        let log = {
            adaptations: [],
            lastAdaptation: new Date().toISOString(),
            totalAdaptations: 0
        };
        // Загрузка существующего лога
        if (fs.existsSync(logPath)) {
            try {
                const content = fs.readFileSync(logPath, 'utf-8');
                log = JSON.parse(content);
            }
            catch (error) {
                console.warn('Error loading adaptation log:', error);
            }
        }
        // Добавление новой записи
        log.adaptations.push({
            date: new Date().toISOString(),
            type: data.type,
            rulesGenerated: data.rulesGenerated,
            profile: data.profile
        });
        log.lastAdaptation = new Date().toISOString();
        log.totalAdaptations = log.adaptations.length;
        // Сохранение лога
        try {
            if (!fs.existsSync(this.configPath)) {
                fs.mkdirSync(this.configPath, { recursive: true });
            }
            fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Error saving adaptation log:', error);
        }
    }
    /**
     * Получение истории адаптаций
     */
    getAdaptationHistory() {
        if (!this.configPath) {
            return [];
        }
        const logPath = path.join(this.configPath, 'adaptation-log.json');
        if (!fs.existsSync(logPath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(logPath, 'utf-8');
            const log = JSON.parse(content);
            return log.adaptations || [];
        }
        catch (error) {
            console.error('Error loading adaptation history:', error);
            return [];
        }
    }
    /**
     * Очистка кэша правил
     */
    clearCache() {
        this.rulesCache.clear();
    }
    /**
     * Освобождение ресурсов
     */
    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.clearCache();
    }
    async copyDirectory(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }
        const files = fs.readdirSync(source);
        for (const file of files) {
            const sourcePath = path.join(source, file);
            const targetPath = path.join(target, file);
            const stat = fs.statSync(sourcePath);
            if (stat.isDirectory()) {
                await this.copyDirectory(sourcePath, targetPath);
            }
            else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }
    getFilesRecursive(dir, files) {
        if (!fs.existsSync(dir)) {
            return;
        }
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                this.getFilesRecursive(fullPath, files);
            }
            else if (item.endsWith('.mdc') || item.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    }
}
exports.RulesIntegration = RulesIntegration;
//# sourceMappingURL=rules-integration.js.map