/**
 * Контроллер качества решений агентов
 * 
 * Проверяет качество решений по критериям:
 * - Полнота кода (нет TODO/заглушек)
 * - Соответствие стандартам
 * - Безопасность
 * - Обновление зависимостей
 */

import * as vscode from 'vscode';
import { AgentSolution } from '../agents/local-agent';

export interface QualityReport {
    passed: boolean;
    score: number; // 0-100
    issues: QualityIssue[];
    recommendations: string[];
}

export interface QualityIssue {
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: 'incomplete' | 'standards' | 'security' | 'dependencies' | 'other';
    message: string;
    file?: string;
    line?: number;
}

export class QualityController {
    private minAcceptableScore: number = 70;
    
    /**
     * Проверить качество решения
     */
    async validateSolution(solution: AgentSolution): Promise<QualityReport> {
        const issues: QualityIssue[] = [];
        let score = 100;
        
        console.log(`QualityController: Validating solution ${solution.id} from ${solution.agentName}`);
        
        // 1. Проверка на заглушки/TODO
        const incompleteness = await this.checkCodeCompleteness(solution);
        if (incompleteness.length > 0) {
            issues.push(...incompleteness);
            score -= incompleteness.length * 15; // -15 за каждую заглушку
        }
        
        // 2. Проверка соответствия стандартам
        const standardIssues = this.checkStandards(solution);
        if (standardIssues.length > 0) {
            issues.push(...standardIssues);
            score -= standardIssues.length * 10;
        }
        
        // 3. Проверка безопасности
        const securityIssues = await this.checkSecurity(solution);
        if (securityIssues.length > 0) {
            issues.push(...securityIssues);
            score -= securityIssues.length * 20; // -20 за проблему безопасности
        }
        
        // 4. Проверка обновления зависимостей
        const dependencyIssues = this.checkDependencies(solution);
        if (dependencyIssues.length > 0) {
            issues.push(...dependencyIssues);
            score -= dependencyIssues.length * 5;
        }
        
        // Минимальный балл = 0
        score = Math.max(0, score);
        
        const passed = score >= this.minAcceptableScore;
        
        console.log(`QualityController: Solution ${solution.id} score: ${score}/100 (${passed ? 'PASSED' : 'FAILED'})`);
        if (issues.length > 0) {
            console.log(`QualityController: Found ${issues.length} issues:`, issues.map(i => `${i.severity}: ${i.message}`));
        }
        
        return {
            passed,
            score,
            issues,
            recommendations: this.generateRecommendations(issues)
        };
    }
    
    /**
     * Проверить код на полноту (нет TODO/заглушек)
     */
    private async checkCodeCompleteness(solution: AgentSolution): Promise<QualityIssue[]> {
        const issues: QualityIssue[] = [];
        
        const stubPatterns = [
            /TODO:/gi,
            /FIXME:/gi,
            /XXX:/gi,
            /HACK:/gi,
            /NOTE:/gi,
            /\b(stub|placeholder|not implemented|coming soon)\b/gi,
            /\/\/\s*\.\.\.$/gm,
            /function\s+\w+\s*\([^)]*\)\s*{\s*}/g, // Пустые функции
            /=>\s*{\s*}/g // Пустые arrow functions
        ];
        
        for (const change of solution.solution.codeChanges) {
            // Проверяем описание изменения
            for (const pattern of stubPatterns) {
                if (pattern.test(change.description)) {
                    issues.push({
                        severity: 'critical',
                        type: 'incomplete',
                        message: `Описание изменения содержит TODO/заглушку: "${change.description}"`,
                        file: change.file
                    });
                }
            }
        }
        
        // Если файлы доступны для чтения, проверяем их содержимое
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            for (const change of solution.solution.codeChanges) {
                if (change.type === 'delete') continue;
                
                try {
                    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, change.file);
                    const fileContent = await vscode.workspace.fs.readFile(fileUri);
                    const content = Buffer.from(fileContent).toString('utf-8');
                    
                    for (const pattern of stubPatterns) {
                        const matches = content.match(pattern);
                        if (matches && matches.length > 0) {
                            issues.push({
                                severity: 'high',
                                type: 'incomplete',
                                message: `Файл содержит TODO/заглушки: "${matches[0]}"`,
                                file: change.file
                            });
                        }
                    }
                } catch (error) {
                    // Файл может не существовать еще (создается агентом)
                    console.debug(`QualityController: Could not read file ${change.file}:`, error);
                }
            }
        }
        
        return issues;
    }
    
    /**
     * Проверить соответствие стандартам
     */
    private checkStandards(solution: AgentSolution): QualityIssue[] {
        const issues: QualityIssue[] = [];
        
        // Проверка длины имен переменных
        const shortNamePattern = /\b[a-z]\b/gi;
        
        // Проверка наличия комментариев для сложной логики
        const complexityIndicators = [
            /for\s*\(.+\)\s*{[^}]{200,}}/g,
            /while\s*\(.+\)\s*{[^}]{200,}}/g,
            /if\s*\(.+\)\s*{[^}]{300,}}/g
        ];
        
        for (const change of solution.solution.codeChanges) {
            // Проверяем оценку строк кода
            if (change.estimatedLines && change.estimatedLines > 200) {
                issues.push({
                    severity: 'medium',
                    type: 'standards',
                    message: `Файл ${change.file} слишком большой (${change.estimatedLines} строк). Рекомендуется разбить на модули.`,
                    file: change.file
                });
            }
        }
        
        // Проверка наличия типизации (для TypeScript)
        for (const change of solution.solution.codeChanges) {
            if (change.file.endsWith('.ts') && change.description.includes('any')) {
                issues.push({
                    severity: 'low',
                    type: 'standards',
                    message: `Файл ${change.file} может содержать тип 'any'. Рекомендуется использовать конкретные типы.`,
                    file: change.file
                });
            }
        }
        
        return issues;
    }
    
    /**
     * Проверить безопасность
     */
    private async checkSecurity(solution: AgentSolution): Promise<QualityIssue[]> {
        const issues: QualityIssue[] = [];
        
        const securityPatterns = [
            {
                pattern: /eval\s*\(/gi,
                message: 'Использование eval() - серьезная уязвимость безопасности',
                severity: 'critical' as const
            },
            {
                pattern: /innerHTML\s*=/gi,
                message: 'Использование innerHTML может привести к XSS уязвимости',
                severity: 'high' as const
            },
            {
                pattern: /document\.write\s*\(/gi,
                message: 'Использование document.write() небезопасно',
                severity: 'high' as const
            },
            {
                pattern: /\$\{[^}]*\}/g,
                message: 'Интерполяция строк в SQL/HTML может привести к injection атакам',
                severity: 'high' as const
            },
            {
                pattern: /password|secret|api[_-]?key/gi,
                message: 'Обнаружены чувствительные данные. Убедитесь, что они не хардкодятся.',
                severity: 'critical' as const
            }
        ];
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            for (const change of solution.solution.codeChanges) {
                if (change.type === 'delete') continue;
                
                try {
                    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, change.file);
                    const fileContent = await vscode.workspace.fs.readFile(fileUri);
                    const content = Buffer.from(fileContent).toString('utf-8');
                    
                    for (const { pattern, message, severity } of securityPatterns) {
                        if (pattern.test(content)) {
                            issues.push({
                                severity,
                                type: 'security',
                                message,
                                file: change.file
                            });
                        }
                    }
                } catch (error) {
                    console.debug(`QualityController: Could not read file ${change.file} for security check`);
                }
            }
        }
        
        return issues;
    }
    
    /**
     * Проверить обновление зависимостей
     */
    private checkDependencies(solution: AgentSolution): QualityIssue[] {
        const issues: QualityIssue[] = [];
        
        // Проверяем, упоминаются ли файлы зависимостей
        const dependencyFiles = ['package.json', 'requirements.txt', 'composer.json', 'Gemfile'];
        const modifiedFiles = solution.solution.filesToModify;
        
        // Если решение затрагивает много файлов, но не обновляет зависимости
        if (modifiedFiles.length > 3) {
            const hasDependencyUpdates = modifiedFiles.some(file => 
                dependencyFiles.some(depFile => file.includes(depFile))
            );
            
            if (!hasDependencyUpdates) {
                issues.push({
                    severity: 'low',
                    type: 'dependencies',
                    message: 'Изменено много файлов, но зависимости не обновлены. Убедитесь, что все необходимые пакеты добавлены.',
                    file: 'package.json или аналог'
                });
            }
        }
        
        return issues;
    }
    
    /**
     * Генерировать рекомендации на основе проблем
     */
    private generateRecommendations(issues: QualityIssue[]): string[] {
        const recommendations: string[] = [];
        
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        const securityIssues = issues.filter(i => i.type === 'security');
        const incompleteIssues = issues.filter(i => i.type === 'incomplete');
        
        if (criticalIssues.length > 0) {
            recommendations.push(`Обнаружено ${criticalIssues.length} критических проблем. Необходимо исправить перед применением.`);
        }
        
        if (securityIssues.length > 0) {
            recommendations.push(`Найдены проблемы безопасности. Рекомендуется пересмотреть код с точки зрения security best practices.`);
        }
        
        if (incompleteIssues.length > 0) {
            recommendations.push(`Код содержит TODO/заглушки. Необходимо завершить реализацию всех функций.`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Качество решения соответствует стандартам.');
        }
        
        return recommendations;
    }
    
    /**
     * Установить минимальный приемлемый балл
     */
    setMinAcceptableScore(score: number): void {
        this.minAcceptableScore = Math.max(0, Math.min(100, score));
    }
    
    /**
     * Получить минимальный приемлемый балл
     */
    getMinAcceptableScore(): number {
        return this.minAcceptableScore;
    }
}
