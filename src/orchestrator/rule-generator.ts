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
description: Автоматически сгенерированные правила для ${language} проекта на основе глубокого анализа
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
        
        // Добавление информации о метриках кода
        if (profile.codeMetrics) {
            content += `## Метрики проекта
- Всего файлов: ${profile.codeMetrics.totalFiles}
- Всего строк кода: ${profile.codeMetrics.totalLines}
- Средний размер файла: ${profile.codeMetrics.averageFileSize} строк
- Сложность проекта: ${profile.codeMetrics.complexity}

`;
        }

        // Добавление информации о паттернах кода
        if (profile.codePatterns) {
            content += `## Паттерны кода в проекте
- Соглашение об именовании: ${profile.codePatterns.namingConvention}
- Обработка ошибок: ${profile.codePatterns.errorHandling.join(', ') || 'Не обнаружена'}
- Асинхронные паттерны: ${profile.codePatterns.asyncPatterns.join(', ') || 'Не обнаружены'}
- Паттерны импорта: ${profile.codePatterns.importPatterns.join(', ') || 'Не обнаружены'}

`;
        }

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
        let rules = `## JavaScript/TypeScript правила

### Стиль кода
- Используй const/let, избегай var
- Arrow functions для callbacks
- Async/await вместо Promises callbacks
- Модули (import/export)

### Соглашение об именовании
`;
        
        // Используем реальное соглашение об именовании из анализа
        if (profile.codePatterns?.namingConvention) {
            rules += `- **Используй ${profile.codePatterns.namingConvention}** (обнаружено в проекте)\n`;
            if (profile.codePatterns.namingConvention === 'camelCase') {
                rules += `  - Переменные и функции: \`camelCase\`\n`;
                rules += `  - Классы: \`PascalCase\`\n`;
                rules += `  - Константы: \`UPPER_SNAKE_CASE\`\n`;
            } else if (profile.codePatterns.namingConvention === 'snake_case') {
                rules += `  - Переменные и функции: \`snake_case\`\n`;
                rules += `  - Классы: \`PascalCase\`\n`;
            }
        } else {
            rules += `- Переменные и функции: \`camelCase\`\n`;
            rules += `- Классы: \`PascalCase\`\n`;
            rules += `- Константы: \`UPPER_SNAKE_CASE\`\n`;
        }

        rules += `\n### Типизация
${profile.languages.includes('TypeScript') ? '- Всегда используй типы\n- Избегай any\n- Используй интерфейсы для объектов' : '- Используй JSDoc для типизации'}

### Обработка ошибок
`;
        
        // Используем реальные паттерны обработки ошибок из анализа
        if (profile.codePatterns?.errorHandling && profile.codePatterns.errorHandling.length > 0) {
            rules += `- **Используй паттерны, обнаруженные в проекте:**\n`;
            for (const pattern of profile.codePatterns.errorHandling) {
                if (pattern === 'try-catch') {
                    rules += `  - Используй try-catch для обработки ошибок\n`;
                } else if (pattern === 'throw') {
                    rules += `  - Используй throw для проброса ошибок\n`;
                } else if (pattern === 'error-objects') {
                    rules += `  - Используй объекты Error для представления ошибок\n`;
                }
            }
        } else {
            rules += `- Используй try-catch для async операций\n`;
            rules += `- Обрабатывай все ошибки\n`;
            rules += `- Логируй ошибки с контекстом\n`;
        }

        // Добавление правил для асинхронности на основе анализа
        if (profile.codePatterns?.asyncPatterns && profile.codePatterns.asyncPatterns.length > 0) {
            rules += `\n### Асинхронность\n`;
            if (profile.codePatterns.asyncPatterns.includes('async-await')) {
                rules += `- **Используй async/await** (обнаружено в проекте)\n`;
            } else if (profile.codePatterns.asyncPatterns.includes('promises')) {
                rules += `- Используй Promises с .then()/.catch()\n`;
            }
        }

        // Добавление рекомендаций из bestPractices
        if (profile.bestPractices?.recommendations && profile.bestPractices.recommendations.length > 0) {
            rules += `\n### Рекомендации по улучшению\n`;
            for (const recommendation of profile.bestPractices.recommendations.slice(0, 3)) {
                rules += `- ${recommendation}\n`;
            }
        }

        rules += `\n`;
        return rules;
    }

    /**
     * Генерация правил для PHP
     */
    private generatePHPRules(profile: ProjectProfile): string {
        let rules = `## PHP правила

### Стиль кода
- Соблюдение PSR-12
- Типизация параметров и возвращаемых значений
- Strict mode: declare(strict_types=1);
- Null-безопасность

### Соглашение об именовании
`;
        
        if (profile.codePatterns?.namingConvention) {
            if (profile.codePatterns.namingConvention === 'camelCase') {
                rules += `- Переменные и функции: \`camelCase\`\n`;
                rules += `- Классы: \`PascalCase\`\n`;
            } else if (profile.codePatterns.namingConvention === 'snake_case') {
                rules += `- Переменные и функции: \`snake_case\`\n`;
                rules += `- Классы: \`PascalCase\`\n`;
            }
        } else {
            rules += `- Переменные и функции: \`camelCase\` (PSR-12)\n`;
            rules += `- Классы: \`PascalCase\`\n`;
        }

        rules += `\n### Безопасность
- Используй параметризованные запросы (prepared statements)
- Экранируй вывод (htmlspecialchars, json_encode)
- Валидируй все входные данные
`;

        // Добавление правил для базы данных, если обнаружена
        if (profile.database) {
            rules += `\n### Работа с базой данных (${profile.database})
- **ВСЕГДА используй параметризованные запросы** (PDO::prepare)
- Никогда не используй прямую интерполяцию строк в SQL
- Используй транзакции для связанных операций
`;
        }

        rules += `\n### Обработка ошибок
`;
        
        if (profile.codePatterns?.errorHandling && profile.codePatterns.errorHandling.length > 0) {
            rules += `- **Используй паттерны, обнаруженные в проекте:**\n`;
            for (const pattern of profile.codePatterns.errorHandling) {
                if (pattern === 'try-catch') {
                    rules += `  - Используй try-catch для критических операций\n`;
                } else if (pattern === 'throw') {
                    rules += `  - Используй throw для проброса исключений\n`;
                }
            }
        } else {
            rules += `- Используй try-catch для критических операций\n`;
            rules += `- Логируй все исключения\n`;
            rules += `- Предоставляй информативные сообщения\n`;
        }

        // Добавление рекомендаций
        if (profile.bestPractices?.recommendations && profile.bestPractices.recommendations.length > 0) {
            rules += `\n### Рекомендации по улучшению\n`;
            for (const recommendation of profile.bestPractices.recommendations.slice(0, 3)) {
                rules += `- ${recommendation}\n`;
            }
        }

        rules += `\n`;
        return rules;
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
