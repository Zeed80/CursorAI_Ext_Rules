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

        // Генерация правил для безопасности
        if (profile.security) {
            const securityRule = await this.generateSecurityRule(profile);
            if (securityRule) {
                rules.push(securityRule);
            }
        }

        // Генерация правил для производительности
        if (profile.performance) {
            const performanceRule = await this.generatePerformanceRule(profile);
            if (performanceRule) {
                rules.push(performanceRule);
            }
        }

        // Генерация правил для тестирования
        if (profile.testing) {
            const testingRule = await this.generateTestingRule(profile);
            if (testingRule) {
                rules.push(testingRule);
            }
        }

        // Генерация правил для документации
        if (profile.documentation) {
            const documentationRule = await this.generateDocumentationRule(profile);
            if (documentationRule) {
                rules.push(documentationRule);
            }
        }

        // Генерация правил для CI/CD
        if (profile.cicd) {
            const cicdRule = await this.generateCICDRule(profile);
            if (cicdRule) {
                rules.push(cicdRule);
            }
        }

        // Генерация правил для зависимостей
        if (profile.dependenciesAnalysis) {
            const dependenciesRule = await this.generateDependenciesRule(profile);
            if (dependenciesRule) {
                rules.push(dependenciesRule);
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
     * Генерация правил для безопасности
     */
    private async generateSecurityRule(profile: ProjectProfile): Promise<GeneratedRule | null> {
        if (!profile.security) return null;

        const rulePath = path.join(this.rulesPath, 'adaptive', 'security-project.mdc');
        
        let content = `---
name: Правила безопасности проекта
description: Автоматически сгенерированные правила безопасности на основе анализа проекта
globs: ["**/*"]
alwaysApply: true
priority: high
---

# Правила безопасности проекта

## Обнаруженные проблемы безопасности

`;

        if (profile.security.vulnerabilities.length > 0) {
            content += `### Уязвимости:\n`;
            for (const vuln of profile.security.vulnerabilities) {
                content += `- ⚠️ ${vuln}\n`;
            }
            content += `\n`;
        }

        if (profile.security.dependencyIssues.length > 0) {
            content += `### Проблемы с зависимостями:\n`;
            for (const issue of profile.security.dependencyIssues) {
                content += `- ⚠️ ${issue}\n`;
            }
            content += `\n`;
        }

        content += `## Рекомендации по безопасности

`;

        for (const rec of profile.security.recommendations) {
            content += `- ✅ ${rec}\n`;
        }

        content += `
## Общие правила безопасности

### Работа с секретами
- **НИКОГДА не коммитьте секреты в репозиторий**
- Используйте переменные окружения для секретов
- Создайте .env.example с примерами переменных
- Используйте .gitignore для исключения .env файлов

### Работа с базой данных
`;

        if (profile.database) {
            content += `- **ВСЕГДА используйте параметризованные запросы** для ${profile.database}
- Никогда не используйте прямую интерполяцию строк в SQL
- Используйте ORM или Query Builder с поддержкой prepared statements
- Валидируйте все входные данные перед запросами к БД
`;
        }

        content += `
### Защита от атак
- Защита от SQL Injection: используйте параметризованные запросы
- Защита от XSS: экранируйте весь пользовательский ввод
- Защита от CSRF: используйте CSRF токены для форм
- Защита от атак перечисления: не раскрывайте информацию о существовании пользователей

### Безопасность зависимостей
- Регулярно проверяйте зависимости на уязвимости
- Используйте \`npm audit\`, \`composer audit\` или Snyk
- Обновляйте зависимости, но тестируйте после обновления
- Зафиксируйте версии зависимостей для продакшн

### HTTPS и шифрование
- Используйте HTTPS для всех соединений в продакшн
- Храните пароли в хешированном виде (bcrypt, argon2)
- Используйте безопасные алгоритмы шифрования
- Настройте правильные заголовки безопасности (CSP, HSTS)

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: 'Автоматически сгенерировано для безопасности проекта',
            priority: 'high'
        };
    }

    /**
     * Генерация правил для производительности
     */
    private async generatePerformanceRule(profile: ProjectProfile): Promise<GeneratedRule | null> {
        if (!profile.performance) return null;

        const rulePath = path.join(this.rulesPath, 'adaptive', 'performance-project.mdc');
        
        let content = `---
name: Правила производительности проекта
description: Автоматически сгенерированные правила производительности на основе анализа проекта
globs: ["**/*"]
alwaysApply: true
priority: medium
---

# Правила производительности проекта

## Обнаруженные узкие места

`;

        if (profile.performance.bottlenecks.length > 0) {
            for (const bottleneck of profile.performance.bottlenecks) {
                content += `- ⚠️ ${bottleneck}\n`;
            }
            content += `\n`;
        }

        if (profile.performance.optimizationOpportunities.length > 0) {
            content += `## Возможности оптимизации\n\n`;
            for (const opp of profile.performance.optimizationOpportunities) {
                content += `- 💡 ${opp}\n`;
            }
            content += `\n`;
        }

        content += `## Рекомендации по производительности

`;

        for (const rec of profile.performance.recommendations) {
            content += `- ✅ ${rec}\n`;
        }

        content += `
## Общие правила производительности

### Оптимизация запросов к базе данных
`;

        if (profile.database) {
            content += `- Используйте индексы для часто запрашиваемых полей в ${profile.database}
- Избегайте N+1 запросов - используйте eager loading или JOIN
- Используйте LIMIT для ограничения количества возвращаемых строк
- Кэшируйте результаты часто выполняемых запросов
`;
        }

        content += `
### Кэширование
`;

        if (profile.performance.cachingStrategies.length > 0) {
            for (const strategy of profile.performance.cachingStrategies) {
                content += `- ${strategy}\n`;
            }
        } else {
            content += `- Используйте кэширование для статических данных
- Кэшируйте результаты вычислений
- Используйте Redis или Memcached для распределенного кэширования
`;
        }

        content += `
### Оптимизация кода
- Избегайте преждевременной оптимизации
- Профилируйте код перед оптимизацией
- Используйте ленивую загрузку для больших ресурсов
- Минимизируйте количество циклов и вложенность

### Оптимизация сборки
- Используйте tree-shaking для удаления неиспользуемого кода
- Минифицируйте и сжимайте ресурсы для продакшн
- Используйте code splitting для больших приложений
- Оптимизируйте изображения (WebP, сжатие)

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: 'Автоматически сгенерировано для производительности проекта',
            priority: 'medium'
        };
    }

    /**
     * Генерация правил для тестирования
     */
    private async generateTestingRule(profile: ProjectProfile): Promise<GeneratedRule | null> {
        if (!profile.testing) return null;

        const rulePath = path.join(this.rulesPath, 'adaptive', 'testing-project.mdc');
        
        let content = `---
name: Правила тестирования проекта
description: Автоматически сгенерированные правила тестирования на основе анализа проекта
globs: ["**/*.test.*", "**/*.spec.*", "**/tests/**", "**/test/**"]
alwaysApply: true
priority: high
---

# Правила тестирования проекта

## Обнаруженные фреймворки тестирования

`;

        if (profile.testing.testFrameworks.length > 0) {
            for (const framework of profile.testing.testFrameworks) {
                content += `- ✅ ${framework}\n`;
            }
            content += `\n`;
        } else {
            content += `- ⚠️ Фреймворки тестирования не обнаружены\n\n`;
        }

        if (profile.testing.testTypes.length > 0) {
            content += `## Типы тестов в проекте\n\n`;
            for (const type of profile.testing.testTypes) {
                content += `- ${type}\n`;
            }
            content += `\n`;
        }

        if (profile.testing.testCoverage !== undefined) {
            content += `## Покрытие кода тестами\n\n`;
            content += `Текущее покрытие: ${profile.testing.testCoverage}%\n\n`;
            if (profile.testing.testCoverage < 80) {
                content += `⚠️ Рекомендуется увеличить покрытие до 80%+\n\n`;
            }
        }

        content += `## Рекомендации по тестированию

`;

        for (const rec of profile.testing.recommendations) {
            content += `- ✅ ${rec}\n`;
        }

        content += `
## Общие правила тестирования

### Структура тестов
`;

        if (profile.testing.testFrameworks.includes('Jest')) {
            content += `- Используйте структуру describe/it для Jest
- Группируйте связанные тесты в describe блоки
- Используйте beforeEach/afterEach для подготовки данных
`;
        } else if (profile.testing.testFrameworks.includes('PHPUnit')) {
            content += `- Используйте методы setUp/tearDown для подготовки данных
- Группируйте тесты в классы по функциональности
- Используйте data providers для параметризованных тестов
`;
        } else {
            content += `- Структурируйте тесты по принципу AAA (Arrange, Act, Assert)
- Используйте понятные имена тестов
- Группируйте связанные тесты
`;
        }

        content += `
### Покрытие тестами
- Стремитесь к покрытию 80%+ кода
- Тестируйте критическую бизнес-логику в первую очередь
- Используйте unit-тесты для отдельных компонентов
- Используйте integration-тесты для взаимодействия компонентов
- Используйте e2e-тесты для критических пользовательских сценариев

### Моки и стабы
- Используйте моки для внешних зависимостей
- Не мокируйте код, который тестируете
- Используйте стабы для сложных зависимостей
- Изолируйте тесты друг от друга

### Best practices
- Тесты должны быть быстрыми и независимыми
- Один тест должен проверять одну вещь
- Используйте понятные имена тестов (describe what, not how)
- Рефакторьте тесты вместе с кодом
- Удаляйте устаревшие тесты

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: 'Автоматически сгенерировано для тестирования проекта',
            priority: 'high'
        };
    }

    /**
     * Генерация правил для документации
     */
    private async generateDocumentationRule(profile: ProjectProfile): Promise<GeneratedRule | null> {
        if (!profile.documentation) return null;

        const rulePath = path.join(this.rulesPath, 'adaptive', 'documentation-project.mdc');
        
        let content = `---
name: Правила документации проекта
description: Автоматически сгенерированные правила документации на основе анализа проекта
globs: ["**/*"]
alwaysApply: true
priority: medium
---

# Правила документации проекта

## Статус документации

`;

        content += `- README: ${profile.documentation.hasReadme ? '✅ Найден' : '❌ Отсутствует'}\n`;
        content += `- API документация: ${profile.documentation.hasApiDocs ? '✅ Найдена' : '❌ Отсутствует'}\n`;
        
        if (profile.documentation.commentCoverage !== undefined) {
            content += `- Покрытие комментариями: ${profile.documentation.commentCoverage}%\n`;
        }
        content += `\n`;

        content += `## Рекомендации по документации

`;

        for (const rec of profile.documentation.recommendations) {
            content += `- ✅ ${rec}\n`;
        }

        content += `
## Общие правила документации

### README файл
- Должен содержать описание проекта
- Должен содержать инструкции по установке
- Должен содержать примеры использования
- Должен содержать информацию о лицензии
- Должен содержать контакты авторов

### Комментарии в коде
`;

        if (profile.languages.includes('TypeScript') || profile.languages.includes('JavaScript')) {
            content += `- Используйте JSDoc для документирования функций и классов
- Комментируйте сложную бизнес-логику
- Избегайте очевидных комментариев
- Обновляйте комментарии при изменении кода
`;
        } else if (profile.languages.includes('PHP')) {
            content += `- Используйте PHPDoc для документирования функций и классов
- Комментируйте сложную бизнес-логику
- Используйте комментарии для объяснения "почему", а не "что"
- Обновляйте комментарии при изменении кода
`;
        } else if (profile.languages.includes('Python')) {
            content += `- Используйте docstrings для документирования функций и классов
- Следуйте PEP 257 для docstrings
- Комментируйте сложную бизнес-логику
- Обновляйте docstrings при изменении кода
`;
        } else {
            content += `- Комментируйте сложную бизнес-логику
- Используйте комментарии для объяснения "почему", а не "что"
- Обновляйте комментарии при изменении кода
`;
        }

        content += `
### API документация
- Используйте Swagger/OpenAPI для REST API
- Документируйте все endpoints
- Включайте примеры запросов и ответов
- Документируйте коды ошибок

### Документация кода
- Документируйте публичные API
- Включайте примеры использования
- Документируйте параметры и возвращаемые значения
- Документируйте исключения и ошибки

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: 'Автоматически сгенерировано для документации проекта',
            priority: 'medium'
        };
    }

    /**
     * Генерация правил для CI/CD
     */
    private async generateCICDRule(profile: ProjectProfile): Promise<GeneratedRule | null> {
        if (!profile.cicd) return null;

        const rulePath = path.join(this.rulesPath, 'adaptive', 'cicd-project.mdc');
        
        let content = `---
name: Правила CI/CD проекта
description: Автоматически сгенерированные правила CI/CD на основе анализа проекта
globs: [".github/workflows/**", ".gitlab-ci.yml", "Jenkinsfile", ".circleci/**"]
alwaysApply: true
priority: medium
---

# Правила CI/CD проекта

## Обнаруженные пайплайны

`;

        if (profile.cicd.pipelines.length > 0) {
            for (const pipeline of profile.cicd.pipelines) {
                content += `- ✅ ${pipeline}\n`;
            }
            content += `\n`;
        } else {
            content += `- ⚠️ CI/CD пайплайны не обнаружены\n\n`;
        }

        if (profile.cicd.stages.length > 0) {
            content += `## Стадии в пайплайнах\n\n`;
            for (const stage of profile.cicd.stages) {
                content += `- ${stage}\n`;
            }
            content += `\n`;
        }

        content += `## Рекомендации по CI/CD

`;

        for (const rec of profile.cicd.recommendations) {
            content += `- ✅ ${rec}\n`;
        }

        content += `
## Общие правила CI/CD

### Стандартные стадии пайплайна
- **Lint**: Проверка стиля кода и линтинг
- **Test**: Запуск тестов (unit, integration)
- **Build**: Сборка проекта
- **Deploy**: Деплой в тестовое/продакшн окружение

### Best practices
- Запускайте тесты на каждом коммите
- Используйте кэширование зависимостей для ускорения сборки
- Разделяйте пайплайны для разных окружений (dev, staging, prod)
- Используйте секреты для хранения чувствительных данных
- Настройте уведомления о статусе сборки

### Автоматизация
- Автоматизируйте деплой после успешной сборки
- Используйте feature flags для безопасного деплоя
- Настройте автоматический откат при ошибках
- Используйте blue-green или canary деплой для продакшн

### Мониторинг
- Логируйте все стадии пайплайна
- Отслеживайте время выполнения сборок
- Настройте алерты при падении сборок
- Анализируйте метрики деплоя

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: 'Автоматически сгенерировано для CI/CD проекта',
            priority: 'medium'
        };
    }

    /**
     * Генерация правил для зависимостей
     */
    private async generateDependenciesRule(profile: ProjectProfile): Promise<GeneratedRule | null> {
        if (!profile.dependenciesAnalysis) return null;

        const rulePath = path.join(this.rulesPath, 'adaptive', 'dependencies-project.mdc');
        
        let content = `---
name: Правила управления зависимостями проекта
description: Автоматически сгенерированные правила управления зависимостями на основе анализа проекта
globs: ["package.json", "composer.json", "requirements.txt", "go.mod", "Cargo.toml"]
alwaysApply: true
priority: medium
---

# Правила управления зависимостями проекта

## Обнаруженные проблемы

`;

        if (profile.dependenciesAnalysis.outdated.length > 0) {
            content += `### Устаревшие зависимости:\n`;
            for (const dep of profile.dependenciesAnalysis.outdated) {
                content += `- ⚠️ ${dep}\n`;
            }
            content += `\n`;
        }

        if (profile.dependenciesAnalysis.conflicts.length > 0) {
            content += `### Конфликты зависимостей:\n`;
            for (const conflict of profile.dependenciesAnalysis.conflicts) {
                content += `- ⚠️ ${conflict}\n`;
            }
            content += `\n`;
        }

        if (profile.dependenciesAnalysis.securityIssues.length > 0) {
            content += `### Проблемы безопасности:\n`;
            for (const issue of profile.dependenciesAnalysis.securityIssues) {
                content += `- ⚠️ ${issue}\n`;
            }
            content += `\n`;
        }

        content += `## Рекомендации по зависимостям

`;

        for (const rec of profile.dependenciesAnalysis.recommendations) {
            content += `- ✅ ${rec}\n`;
        }

        content += `
## Общие правила управления зависимостями

### Версионирование
- Зафиксируйте версии зависимостей для продакшн
- Используйте semantic versioning (semver)
- Регулярно обновляйте зависимости
- Тестируйте после обновления зависимостей

### Безопасность
- Регулярно проверяйте зависимости на уязвимости
- Используйте инструменты: npm audit, composer audit, Snyk
- Обновляйте уязвимые зависимости немедленно
- Рассмотрите использование Dependabot или Renovate

### Управление зависимостями
`;

        if (profile.languages.includes('JavaScript') || profile.languages.includes('TypeScript')) {
            content += `- Используйте package-lock.json или yarn.lock
- Разделяйте dependencies и devDependencies
- Используйте npm ci для установки в CI/CD
- Регулярно обновляйте зависимости (npm outdated)
`;
        } else if (profile.languages.includes('PHP')) {
            content += `- Используйте composer.lock для фиксации версий
- Разделяйте require и require-dev
- Используйте composer install --no-dev для продакшн
- Регулярно обновляйте зависимости (composer update)
`;
        } else if (profile.languages.includes('Python')) {
            content += `- Используйте requirements.txt или Pipfile
- Используйте виртуальные окружения (venv, virtualenv)
- Зафиксируйте версии для продакшн
- Регулярно обновляйте зависимости
`;
        }

        content += `
### Минимизация зависимостей
- Используйте только необходимые зависимости
- Регулярно проверяйте неиспользуемые зависимости
- Рассмотрите замену тяжелых зависимостей на легкие альтернативы
- Избегайте дублирования функциональности

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
`;

        return {
            path: rulePath,
            content,
            reason: 'Автоматически сгенерировано для управления зависимостями проекта',
            priority: 'medium'
        };
    }

    /**
     * Генерация главного файла правил проекта
     */
    async generateMainRulesFile(rules: GeneratedRule[], profile: ProjectProfile): Promise<GeneratedRule> {
        const rulePath = path.join(this.rulesPath, 'project-main.mdc');
        
        // Группировка правил по приоритетам
        const highPriorityRules = rules.filter(r => r.priority === 'high');
        const mediumPriorityRules = rules.filter(r => r.priority === 'medium');
        const lowPriorityRules = rules.filter(r => r.priority === 'low');

        // Группировка правил по категориям
        const rulesByCategory: { [category: string]: GeneratedRule[] } = {};
        for (const rule of rules) {
            const category = this.getRuleCategory(rule.path);
            if (!rulesByCategory[category]) {
                rulesByCategory[category] = [];
            }
            rulesByCategory[category].push(rule);
        }

        let content = `---
name: Главные правила проекта
description: Объединяющий файл всех правил проекта с приоритетами и категоризацией
globs: ["**/*"]
alwaysApply: true
priority: high
---

# Главные правила проекта

## Информация о проекте

**Тип проекта:** ${profile.type}
**Языки:** ${profile.languages.join(', ')}
**Фреймворки:** ${profile.frameworks.join(', ') || 'Не обнаружены'}
**Архитектура:** ${profile.architecture || 'Не определена'}
**База данных:** ${profile.database || 'Не обнаружена'}
**Стиль кода:** ${profile.codeStyle || 'Не определен'}

**Дата генерации:** ${new Date().toISOString()}
**Всего правил:** ${rules.length}

## Приоритеты правил

### Высокий приоритет (${highPriorityRules.length} правил)
`;

        for (const rule of highPriorityRules) {
            const ruleName = path.basename(rule.path, '.mdc');
            content += `- **${ruleName}** - ${rule.reason}\n`;
        }

        content += `
### Средний приоритет (${mediumPriorityRules.length} правил)
`;

        for (const rule of mediumPriorityRules) {
            const ruleName = path.basename(rule.path, '.mdc');
            content += `- **${ruleName}** - ${rule.reason}\n`;
        }

        content += `
### Низкий приоритет (${lowPriorityRules.length} правил)
`;

        for (const rule of lowPriorityRules) {
            const ruleName = path.basename(rule.path, '.mdc');
            content += `- **${ruleName}** - ${rule.reason}\n`;
        }

        content += `
## Категории правил

`;

        for (const [category, categoryRules] of Object.entries(rulesByCategory)) {
            content += `### ${category} (${categoryRules.length} правил)\n\n`;
            for (const rule of categoryRules) {
                const ruleName = path.basename(rule.path, '.mdc');
                const relativePath = path.relative(this.rulesPath, rule.path).replace(/\\/g, '/');
                content += `- [${ruleName}](${relativePath}) (${rule.priority})\n`;
            }
            content += `\n`;
        }

        content += `
## Общие принципы проекта

### Стиль кода
`;

        if (profile.codePatterns?.namingConvention) {
            content += `- **Соглашение об именовании:** ${profile.codePatterns.namingConvention}\n`;
        }

        if (profile.codeStyle) {
            content += `- **Стандарт кода:** ${profile.codeStyle}\n`;
        }

        content += `
### Архитектура
`;

        if (profile.architecture) {
            content += `- **Архитектурный паттерн:** ${profile.architecture}\n`;
            content += `- Следуй принципам ${profile.architecture}\n`;
        }

        if (profile.patterns.length > 0) {
            content += `- **Используемые паттерны:** ${profile.patterns.join(', ')}\n`;
        }

        content += `
### Приоритизация правил

1. **Высокий приоритет** - правила безопасности, критичные для проекта
2. **Средний приоритет** - правила производительности, тестирования, документации
3. **Низкий приоритет** - правила паттернов, стиля кода

### Разрешение конфликтов

Если правила конфликтуют между собой:
1. Правила высокого приоритета имеют приоритет над правилами среднего и низкого приоритета
2. Правила безопасности имеют наивысший приоритет
3. Правила языка/фреймворка имеют приоритет над общими правилами
4. При неопределенности - следуй best practices для используемых технологий

### Использование правил

Все правила применяются автоматически CursorAI при генерации кода.
Правила с \`alwaysApply: true\` применяются всегда.
Правила с \`alwaysApply: false\` применяются только к соответствующим файлам (по globs).

---
*Автоматически сгенерировано: ${new Date().toISOString()}*
*Проект: ${profile.type}*
`;

        return {
            path: rulePath,
            content,
            reason: 'Главный файл правил проекта, объединяющий все правила',
            priority: 'high'
        };
    }

    /**
     * Получение категории правила из пути
     */
    private getRuleCategory(rulePath: string): string {
        if (rulePath.includes('security')) return 'Безопасность';
        if (rulePath.includes('performance')) return 'Производительность';
        if (rulePath.includes('testing')) return 'Тестирование';
        if (rulePath.includes('documentation')) return 'Документация';
        if (rulePath.includes('cicd')) return 'CI/CD';
        if (rulePath.includes('dependencies')) return 'Зависимости';
        if (rulePath.includes('javascript') || rulePath.includes('typescript')) return 'JavaScript/TypeScript';
        if (rulePath.includes('php')) return 'PHP';
        if (rulePath.includes('python')) return 'Python';
        if (rulePath.includes('framework')) return 'Фреймворки';
        if (rulePath.includes('architecture')) return 'Архитектура';
        if (rulePath.includes('pattern')) return 'Паттерны';
        return 'Общие';
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

        // Генерация главного файла правил
        const profile = await this.projectAnalyzer.loadProfile();
        if (profile) {
            const mainRule = await this.generateMainRulesFile(rules, profile);
            const mainDir = path.dirname(mainRule.path);
            if (!fs.existsSync(mainDir)) {
                fs.mkdirSync(mainDir, { recursive: true });
            }
            fs.writeFileSync(mainRule.path, mainRule.content, 'utf-8');
            console.log(`Main rules file saved: ${mainRule.path}`);
        }
    }
}
