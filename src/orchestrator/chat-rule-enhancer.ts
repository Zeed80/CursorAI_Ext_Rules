import * as vscode from 'vscode';
import { ProjectProfile } from './project-analyzer';
import { GeneratedRule } from './rule-generator';

/**
 * Класс для улучшения правил через чат CursorAI
 */
export class ChatRuleEnhancer {
    /**
     * Улучшение правил через чат CursorAI
     */
    async enhanceRulesViaChat(rules: GeneratedRule[], profile: ProjectProfile): Promise<void> {
        const prompt = await this.generateEnhancementPrompt(rules, profile);
        await this.openChatWithPrompt(prompt);
    }

    /**
     * Генерация промпта для улучшения правил
     */
    async generateEnhancementPrompt(rules: GeneratedRule[], profile: ProjectProfile): Promise<string> {
        let prompt = `# Улучшение правил проекта для CursorAI

Я сгенерировал набор правил для проекта на основе автоматического анализа. Пожалуйста, улучши эти правила для использования CursorAI.

## Профиль проекта

**Тип проекта:** ${profile.type}
**Языки:** ${profile.languages.join(', ')}
**Фреймворки:** ${profile.frameworks.join(', ') || 'Не обнаружены'}
**Архитектура:** ${profile.architecture || 'Не определена'}
**База данных:** ${profile.database || 'Не обнаружена'}
**Стиль кода:** ${profile.codeStyle || 'Не определен'}

`;

        if (profile.codeMetrics) {
            prompt += `**Метрики кода:**
- Всего файлов: ${profile.codeMetrics.totalFiles}
- Всего строк: ${profile.codeMetrics.totalLines}
- Средний размер файла: ${profile.codeMetrics.averageFileSize} строк
- Сложность: ${profile.codeMetrics.complexity}

`;
        }

        if (profile.codePatterns) {
            prompt += `**Паттерны кода:**
- Соглашение об именовании: ${profile.codePatterns.namingConvention}
- Обработка ошибок: ${profile.codePatterns.errorHandling.join(', ')}
- Асинхронные паттерны: ${profile.codePatterns.asyncPatterns.join(', ') || 'Не обнаружены'}

`;
        }

        prompt += `## Сгенерированные правила

Всего правил: ${rules.length}

`;

        // Группировка правил по категориям
        const rulesByCategory: { [category: string]: GeneratedRule[] } = {};
        for (const rule of rules) {
            const category = this.getRuleCategory(rule.path);
            if (!rulesByCategory[category]) {
                rulesByCategory[category] = [];
            }
            rulesByCategory[category].push(rule);
        }

        for (const [category, categoryRules] of Object.entries(rulesByCategory)) {
            prompt += `### ${category} (${categoryRules.length} правил)\n\n`;
            for (const rule of categoryRules) {
                prompt += `**${this.getRuleName(rule.path)}** (приоритет: ${rule.priority})\n`;
                prompt += `Путь: ${rule.path}\n`;
                prompt += `Причина: ${rule.reason}\n\n`;
                // Добавляем краткое содержание правила (первые 500 символов)
                const contentPreview = rule.content.substring(0, 500).replace(/```/g, '\\`\\`\\`');
                prompt += `Содержание:\n\`\`\`\n${contentPreview}${rule.content.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
            }
        }

        prompt += `## Инструкции по улучшению

Пожалуйста, улучши эти правила следующим образом:

1. **Добавь детальные рекомендации** для каждого аспекта проекта
2. **Включи примеры** правильного и неправильного кода для каждого правила
3. **Добавь best practices** для используемых технологий (${profile.frameworks.join(', ') || 'обнаруженных в проекте'})
4. **Укажи исключения** и особые случаи, когда правила не применяются
5. **Улучши структуру** и читаемость правил
6. **Добавь ссылки** на официальную документацию где это уместно
7. **Убедись в полноте** - все аспекты проекта должны быть покрыты

## Формат возврата

Верни улучшенные правила в формате .mdc файлов, готовых для использования CursorAI. Каждое правило должно быть в отдельном блоке кода с указанием пути файла:

\`\`\`mdc:путь/к/файлу.mdc
[содержимое улучшенного правила]
\`\`\`

Или если хочешь улучшить все правила в одном ответе, используй формат:

\`\`\`mdc
[улучшенное содержимое всех правил с разделителями]
\`\`\`

## Дополнительные рекомендации

- Правила должны быть конкретными и действенными
- Используй маркдаун форматирование для лучшей читаемости
- Включи примеры кода где это уместно
- Укажи приоритеты правил (high/medium/low)
- Добавь метаданные в frontmatter (name, description, globs, alwaysApply, priority)

Спасибо за помощь в улучшении правил!`;

        return prompt;
    }

    /**
     * Открытие чата CursorAI с промптом
     */
    async openChatWithPrompt(prompt: string): Promise<void> {
        try {
            // Пытаемся открыть чат CursorAI (если команда доступна)
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open');
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (chatError: any) {
                // Команда может быть недоступна в некоторых версиях CursorAI
                console.debug('Chat command not available:', chatError.message);
            }

            // Копируем промпт в буфер обмена
            await vscode.env.clipboard.writeText(prompt);

            // Показываем уведомление
            const action = await vscode.window.showInformationMessage(
                'Промпт для улучшения правил подготовлен и скопирован в буфер обмена. Чат CursorAI открыт. Вставьте промпт в чат (Ctrl+V) и улучшите правила.',
                'Открыть чат',
                'OK'
            );

            if (action === 'Открыть чат') {
                vscode.window.showInformationMessage(
                    'Вставьте промпт из буфера обмена в чат CursorAI (Ctrl+V или Cmd+V). После улучшения правил в чате, вы можете сохранить их вручную или использовать функцию парсинга.',
                    'OK'
                );
            }
        } catch (error: any) {
            console.warn('Failed to open chat:', error);
            // Fallback: просто копируем в буфер обмена
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showWarningMessage(
                'Не удалось открыть чат автоматически. Промпт скопирован в буфер обмена. Вставьте его в чат CursorAI вручную.',
                'OK'
            );
        }
    }

    /**
     * Парсинг улучшенных правил из ответа чата
     * Опциональная функция - пользователь может сохранить правила вручную
     */
    async parseEnhancedRules(chatResponse: string): Promise<GeneratedRule[]> {
        const rules: GeneratedRule[] = [];
        
        // Поиск блоков кода с форматом mdc:путь
        const mdcBlockRegex = /```mdc:([^\n]+)\n([\s\S]*?)```/g;
        let match;
        
        while ((match = mdcBlockRegex.exec(chatResponse)) !== null) {
            const filePath = match[1].trim();
            const content = match[2].trim();
            
            rules.push({
                path: filePath,
                content: content,
                reason: 'Улучшено через чат CursorAI',
                priority: this.extractPriority(content)
            });
        }

        // Если не найдено блоков с путями, пытаемся найти обычные mdc блоки
        if (rules.length === 0) {
            const simpleMdcRegex = /```mdc\n([\s\S]*?)```/g;
            while ((match = simpleMdcRegex.exec(chatResponse)) !== null) {
                const content = match[1].trim();
                // Пытаемся извлечь путь из содержимого (из frontmatter)
                const pathMatch = content.match(/path:\s*([^\n]+)/i) || content.match(/file:\s*([^\n]+)/i);
                const rulePath = pathMatch ? pathMatch[1].trim() : 'adaptive/enhanced-rule.mdc';
                
                rules.push({
                    path: rulePath,
                    content: content,
                    reason: 'Улучшено через чат CursorAI',
                    priority: this.extractPriority(content)
                });
            }
        }

        return rules;
    }

    /**
     * Извлечение категории правила из пути
     */
    private getRuleCategory(rulePath: string): string {
        if (rulePath.includes('security')) return 'Безопасность';
        if (rulePath.includes('performance')) return 'Производительность';
        if (rulePath.includes('testing')) return 'Тестирование';
        if (rulePath.includes('documentation')) return 'Документация';
        if (rulePath.includes('cicd')) return 'CI/CD';
        if (rulePath.includes('dependencies')) return 'Зависимости';
        if (rulePath.includes('language') || rulePath.includes('javascript') || rulePath.includes('php') || rulePath.includes('python')) return 'Языки';
        if (rulePath.includes('framework')) return 'Фреймворки';
        if (rulePath.includes('architecture')) return 'Архитектура';
        if (rulePath.includes('pattern')) return 'Паттерны';
        return 'Общие';
    }

    /**
     * Извлечение имени правила из пути
     */
    private getRuleName(rulePath: string): string {
        const fileName = rulePath.split(/[/\\]/).pop() || '';
        return fileName.replace('.mdc', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Извлечение приоритета из содержимого правила
     */
    private extractPriority(content: string): 'high' | 'medium' | 'low' {
        const priorityMatch = content.match(/priority:\s*(high|medium|low)/i);
        if (priorityMatch) {
            return priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low';
        }
        // Определение приоритета по содержимому
        if (content.includes('security') || content.includes('безопасность')) {
            return 'high';
        }
        if (content.includes('performance') || content.includes('производительность')) {
            return 'medium';
        }
        return 'medium';
    }
}
