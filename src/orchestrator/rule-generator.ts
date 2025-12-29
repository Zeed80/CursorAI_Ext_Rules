import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectProfile, ProjectAnalyzer } from './project-analyzer';

export interface GeneratedRule {
    path: string;
    content: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}

export class RuleGenerator {
    private workspaceFolder: vscode.WorkspaceFolder | undefined;
    private rulesPath: string;
    private projectAnalyzer: ProjectAnalyzer;

    constructor() {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.rulesPath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'rules')
            : '';
        this.projectAnalyzer = new ProjectAnalyzer();
    }

    /**
     * Генерация правил на основе профиля проекта
     */
    async generateRulesFromProfile(): Promise<GeneratedRule[]> {
        const profile = await this.projectAnalyzer.loadProfile();
        
        if (!profile) {
            console.log('No project profile found, analyzing project first...');
            await this.projectAnalyzer.analyzeProject();
            return await this.generateRulesFromProfile();
        }

        const rules: GeneratedRule[] = [];

        // Генерация правил для языков
        for (const language of profile.languages) {
            const languageRule = await this.generateLanguageRule(language, profile);
            if (languageRule) {
                rules.push(languageRule);
            }
        }

        // Генерация правил для фреймворков
        for (const framework of profile.frameworks) {
            const frameworkRule = await this.generateFrameworkRule(framework, profile);
            if (frameworkRule) {
                rules.push(frameworkRule);
            }
        }

        // Генерация правил для архитектуры
        if (profile.architecture) {
            const architectureRule = await this.generateArchitectureRule(profile.architecture, profile);
            if (architectureRule) {
                rules.push(architectureRule);
            }
        }

        // Генерация правил для паттернов
        for (const pattern of profile.patterns) {
            const patternRule = await this.generatePatternRule(pattern, profile);
            if (patternRule) {
                rules.push(patternRule);
            }
        }

        return rules;
    }

    /**
     * Генерация правила для языка
     */
    private async generateLanguageRule(language: string, profile: ProjectProfile): Promise<GeneratedRule | null> {
        const rulePath = path.join(this.rulesPath, 'adaptive', `${language.toLowerCase()}-project.mdc`);
        
        let content = `---
name: ${language} Project Rules
description: Автоматически сгенерированные правила для ${language} проекта
globs: ["**/*.${this.getLanguageExtension(language)}"]
alwaysApply: true
---

# Правила для ${language} проекта

## Обнаруженные технологии
- Язык: ${language}
- Фреймворки: ${profile.frameworks.join(', ') || 'Не обнаружены'}
- Архитектура: ${profile.architecture || 'Не определена'}
- Стиль кода: ${profile.codeStyle || 'Не определен'}

`;

        // Добавление специфичных правил для языка
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'typescript':
                content += this.generateJavaScriptRules(profile);
                break;
            case 'php':
                content += this.generatePHPRules(profile);
                break;
            case 'python':
                content += this.generatePythonRules(profile);
                break;
            default:
                content += `## Общие правила для ${language}\n\nСледуй лучшим практикам для ${language}.\n`;
        }

        return {
            path: rulePath,
            content,
            reason: `Автоматически сгенерировано на основе анализа проекта (${language})`,
            priority: 'high'
        };
    }

    /**
     * Генерация правила для фреймворка
     */
    private async generateFrameworkRule(framework: string, profile: ProjectProfile): Promise<GeneratedRule | null> {
        const rulePath = path.join(this.rulesPath, 'adaptive', `${framework.toLowerCase().replace(/\s+/g, '-')}-framework.mdc`);
        
        const content = `---
name: ${framework} Framework Rules
description: Правила для работы с ${framework}
globs: ["**/*"]
alwaysApply: false
---

# Правила для ${framework}

## Обнаруженный фреймворк
- Фреймворк: ${framework}
- Языки: ${profile.languages.join(', ')}
- Архитектура: ${profile.architecture || 'Не определена'}

## Рекомендации
- Используй паттерны ${framework}
- Следуй официальной документации ${framework}
- Применяй best practices для ${framework}

## Примеры
[Примеры будут добавлены на основе анализа кода]

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: `Автоматически сгенерировано для фреймворка ${framework}`,
            priority: 'medium'
        };
    }

    /**
     * Генерация правила для архитектуры
     */
    private async generateArchitectureRule(architecture: string, profile: ProjectProfile): Promise<GeneratedRule | null> {
        const rulePath = path.join(this.rulesPath, 'adaptive', `${architecture.toLowerCase().replace(/\s+/g, '-')}-architecture.mdc`);
        
        const content = `---
name: ${architecture} Architecture Rules
description: Правила для архитектуры ${architecture}
globs: ["**/*"]
alwaysApply: true
---

# Правила архитектуры ${architecture}

## Обнаруженная архитектура
- Архитектура: ${architecture}
- Языки: ${profile.languages.join(', ')}
- Паттерны: ${profile.patterns.join(', ') || 'Не обнаружены'}

## Рекомендации
- Следуй принципам ${architecture}
- Сохраняй разделение слоев
- Используй соответствующие паттерны проектирования

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: `Автоматически сгенерировано для архитектуры ${architecture}`,
            priority: 'high'
        };
    }

    /**
     * Генерация правила для паттерна
     */
    private async generatePatternRule(pattern: string, profile: ProjectProfile): Promise<GeneratedRule | null> {
        const rulePath = path.join(this.rulesPath, 'adaptive', `${pattern.toLowerCase().replace(/\s+/g, '-')}-pattern.mdc`);
        
        const content = `---
name: ${pattern} Pattern Rules
description: Правила для паттерна ${pattern}
globs: ["**/*"]
alwaysApply: false
---

# Правила паттерна ${pattern}

## Обнаруженный паттерн
- Паттерн: ${pattern}
- Архитектура: ${profile.architecture || 'Не определена'}

## Рекомендации
- Используй паттерн ${pattern} где это уместно
- Следуй принципам паттерна ${pattern}
- Применяй консистентно по всему проекту

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: `Автоматически сгенерировано для паттерна ${pattern}`,
            priority: 'low'
        };
    }

    /**
     * Получение расширения файла для языка
     */
    private getLanguageExtension(language: string): string {
        const extensions: { [key: string]: string } = {
            'JavaScript': 'js',
            'TypeScript': 'ts',
            'PHP': 'php',
            'Python': 'py',
            'Go': 'go',
            'Rust': 'rs',
            'Java': 'java',
            'C#': 'cs'
        };
        return extensions[language] || 'txt';
    }

    /**
     * Генерация правил для JavaScript/TypeScript
     */
    private generateJavaScriptRules(profile: ProjectProfile): string {
        return `## JavaScript/TypeScript правила

### Стиль кода
- Используй const/let, избегай var
- Arrow functions для callbacks
- Async/await вместо Promises callbacks
- Модули (import/export)

### Типизация
${profile.languages.includes('TypeScript') ? '- Всегда используй типы\n- Избегай any\n- Используй интерфейсы для объектов' : '- Используй JSDoc для типизации'}

### Обработка ошибок
- Используй try-catch для async операций
- Обрабатывай все ошибки
- Логируй ошибки с контекстом

`;
    }

    /**
     * Генерация правил для PHP
     */
    private generatePHPRules(profile: ProjectProfile): string {
        return `## PHP правила

### Стиль кода
- Соблюдение PSR-12
- Типизация параметров и возвращаемых значений
- Strict mode: declare(strict_types=1);
- Null-безопасность

### Безопасность
- Используй параметризованные запросы (prepared statements)
- Экранируй вывод (htmlspecialchars, json_encode)
- Валидируй все входные данные

### Обработка ошибок
- Используй try-catch для критических операций
- Логируй все исключения
- Предоставляй информативные сообщения

`;
    }

    /**
     * Генерация правил для Python
     */
    private generatePythonRules(profile: ProjectProfile): string {
        return `## Python правила

### Стиль кода
- Соблюдение PEP 8
- Используй type hints
- Docstrings для всех функций/классов
- Используй виртуальные окружения

### Обработка ошибок
- Используй конкретные исключения
- Логируй ошибки с контекстом
- Обрабатывай все исключения

`;
    }

    /**
     * Сохранение сгенерированных правил
     */
    async saveRules(rules: GeneratedRule[]): Promise<void> {
        if (!this.rulesPath) {
            throw new Error('Rules path not found');
        }

        const adaptivePath = path.join(this.rulesPath, 'adaptive');
        if (!fs.existsSync(adaptivePath)) {
            fs.mkdirSync(adaptivePath, { recursive: true });
        }

        for (const rule of rules) {
            const dir = path.dirname(rule.path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(rule.path, rule.content, 'utf-8');
            console.log(`Rule saved: ${rule.path}`);
        }
    }
}
