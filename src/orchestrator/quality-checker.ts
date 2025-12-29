import * as vscode from 'vscode';
import { Task } from './orchestrator';
import { ProjectDependencyGraph } from './project-dependency-graph';
import { ProjectKnowledgeBase } from './project-knowledge-base';
import { LocalAgent } from '../agents/local-agent';

/**
 * Результат проверки качества
 */
export interface QualityCheckResult {
    category: string;
    agentId: string;
    agentName: string;
    issues: QualityIssue[];
    score: number; // 0-1
    recommendations: string[];
    timestamp: Date;
}

/**
 * Проблема качества
 */
export interface QualityIssue {
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    file?: string;
    line?: number;
    suggestion: string;
}

/**
 * Отчет о проверке качества
 */
export interface QualityCheckReport {
    taskId: string;
    overallScore: number; // 0-1
    categories: {
        [category: string]: {
            score: number;
            issues: QualityIssue[];
            recommendations: string[];
        };
    };
    results: QualityCheckResult[];
    summary: string;
    timestamp: Date;
}

/**
 * Проверщик качества проекта
 * Генерирует задачи для агентов для проверки различных аспектов качества
 */
export class QualityChecker {
    private dependencyGraph: ProjectDependencyGraph;
    private knowledgeBase: ProjectKnowledgeBase;

    constructor(
        dependencyGraph: ProjectDependencyGraph,
        knowledgeBase: ProjectKnowledgeBase
    ) {
        this.dependencyGraph = dependencyGraph;
        this.knowledgeBase = knowledgeBase;
    }

    /**
     * Создание подзадач для проверки качества
     * Возвращает массив созданных подзадач
     */
    async createQualityCheckSubTasks(
        orchestrator: any, // SelfLearningOrchestrator
        mainTaskId: string,
        scope?: 'full' | 'code' | 'architecture' | 'performance' | 'security'
    ): Promise<Task[]> {
        // Генерируем подзадачи для разных аспектов качества
        const subTasks = await this.generateQualityCheckSubTasks(null as any, scope);

        // Создаем подзадачи через оркестратор
        const createdSubTasks: Task[] = [];
        for (const subTask of subTasks) {
            const createdSubTask = await orchestrator.createTask({
                type: subTask.type,
                description: subTask.description,
                priority: subTask.priority
            });

            // Назначаем агента и связываем с главной задачей
            if (subTask.assignedAgent) {
                createdSubTask.assignedAgent = subTask.assignedAgent;
            }
            createdSubTask.parentTaskId = mainTaskId;

            createdSubTasks.push(createdSubTask);
        }

        return createdSubTasks;
    }

    /**
     * Генерация подзадач для проверки качества
     */
    private async generateQualityCheckSubTasks(
        mainTask: Task,
        scope?: 'full' | 'code' | 'architecture' | 'performance' | 'security'
    ): Promise<Array<{
        type: Task['type'];
        description: string;
        priority: Task['priority'];
        assignedAgent?: string;
    }>> {
        const subTasks: Array<{
            type: Task['type'];
            description: string;
            priority: Task['priority'];
            assignedAgent?: string;
        }> = [];

        const checkScope = scope || 'full';

        // Проверка кода (Backend, Frontend, QA)
        if (checkScope === 'full' || checkScope === 'code') {
            subTasks.push(
                {
                    type: 'improvement',
                    description: 'Проверка качества backend кода: соответствие стандартам, безопасность, производительность',
                    priority: 'high',
                    assignedAgent: 'backend'
                },
                {
                    type: 'improvement',
                    description: 'Проверка качества frontend кода: доступность, производительность, UX',
                    priority: 'high',
                    assignedAgent: 'frontend'
                },
                {
                    type: 'improvement',
                    description: 'Проверка покрытия тестами и качества тестов',
                    priority: 'medium',
                    assignedAgent: 'qa'
                }
            );
        }

        // Проверка архитектуры
        if (checkScope === 'full' || checkScope === 'architecture') {
            subTasks.push(
                {
                    type: 'improvement',
                    description: 'Проверка архитектуры проекта: соответствие паттернам, масштабируемость, поддерживаемость',
                    priority: 'high',
                    assignedAgent: 'architect'
                }
            );
        }

        // Проверка производительности
        if (checkScope === 'full' || checkScope === 'performance') {
            subTasks.push(
                {
                    type: 'improvement',
                    description: 'Проверка производительности: оптимизация запросов, кэширование, нагрузка',
                    priority: 'medium',
                    assignedAgent: 'analyst'
                }
            );
        }

        // Проверка безопасности
        if (checkScope === 'full' || checkScope === 'security') {
            subTasks.push(
                {
                    type: 'improvement',
                    description: 'Проверка безопасности: уязвимости, SQL injection, XSS, аутентификация',
                    priority: 'high',
                    assignedAgent: 'backend'
                },
                {
                    type: 'improvement',
                    description: 'Проверка безопасности инфраструктуры: конфигурация, доступы, мониторинг',
                    priority: 'high',
                    assignedAgent: 'devops'
                }
            );
        }

        // Проверка зависимостей
        if (checkScope === 'full') {
            subTasks.push(
                {
                    type: 'improvement',
                    description: 'Проверка зависимостей проекта: устаревшие пакеты, конфликты, безопасность',
                    priority: 'medium',
                    assignedAgent: 'devops'
                }
            );
        }

        return subTasks;
    }

    /**
     * Консолидация результатов проверки качества от всех агентов
     */
    async consolidateQualityCheckResults(
        mainTask: Task,
        subTasks: Task[],
        orchestrator: any
    ): Promise<QualityCheckReport> {
        const results: QualityCheckResult[] = [];
        const categories: { [category: string]: { score: number; issues: QualityIssue[]; recommendations: string[] } } = {};

        // Собираем результаты от всех подзадач
        for (const subTask of subTasks) {
            if (subTask.status === 'completed' && subTask.executionResult?.success) {
                // Извлекаем результаты проверки из выполнения задачи
                const result = this.extractQualityResultFromTask(subTask);
                if (result) {
                    results.push(result);

                    // Группируем по категориям
                    if (!categories[result.category]) {
                        categories[result.category] = {
                            score: 0,
                            issues: [],
                            recommendations: []
                        };
                    }

                    categories[result.category].issues.push(...result.issues);
                    categories[result.category].recommendations.push(...result.recommendations);
                    categories[result.category].score = Math.max(
                        categories[result.category].score,
                        result.score
                    );
                }
            }
        }

        // Вычисляем общий балл
        const overallScore = results.length > 0
            ? results.reduce((sum, r) => sum + r.score, 0) / results.length
            : 0;

        // Генерируем сводку
        const summary = this.generateSummary(categories, overallScore);

        const report: QualityCheckReport = {
            taskId: mainTask.id,
            overallScore,
            categories,
            results,
            summary,
            timestamp: new Date()
        };

        // Сохраняем результаты в задачу
        mainTask.qualityCheckResults = results;
        mainTask.status = 'completed';

        return report;
    }

    /**
     * Извлечение результата проверки качества из задачи
     */
    private extractQualityResultFromTask(task: Task): QualityCheckResult | null {
        // В реальной реализации здесь будет парсинг результатов выполнения задачи
        // Пока возвращаем базовый результат
        const agentName = task.assignedAgent || 'Unknown';
        
        return {
            category: this.getCategoryFromAgent(task.assignedAgent || ''),
            agentId: task.assignedAgent || '',
            agentName: this.getAgentName(task.assignedAgent || ''),
            issues: [],
            score: 0.8, // Базовый балл
            recommendations: [],
            timestamp: new Date()
        };
    }

    /**
     * Получение категории из агента
     */
    private getCategoryFromAgent(agentId: string): string {
        const categoryMap: { [key: string]: string } = {
            'backend': 'Backend Code Quality',
            'frontend': 'Frontend Code Quality',
            'architect': 'Architecture Quality',
            'analyst': 'Performance Quality',
            'devops': 'Infrastructure Quality',
            'qa': 'Test Quality'
        };
        return categoryMap[agentId] || 'General Quality';
    }

    /**
     * Получение имени агента
     */
    private getAgentName(agentId: string): string {
        const nameMap: { [key: string]: string } = {
            'backend': 'Backend Developer',
            'frontend': 'Frontend Developer',
            'architect': 'Software Architect',
            'analyst': 'Data Analyst',
            'devops': 'DevOps Engineer',
            'qa': 'QA Engineer'
        };
        return nameMap[agentId] || agentId;
    }

    /**
     * Генерация сводки проверки качества
     */
    private generateSummary(
        categories: QualityCheckReport['categories'],
        overallScore: number
    ): string {
        const totalIssues = Object.values(categories).reduce(
            (sum, cat) => sum + cat.issues.length,
            0
        );
        const criticalIssues = Object.values(categories).reduce(
            (sum, cat) => sum + cat.issues.filter(i => i.severity === 'critical').length,
            0
        );
        const highIssues = Object.values(categories).reduce(
            (sum, cat) => sum + cat.issues.filter(i => i.severity === 'high').length,
            0
        );

        let summary = `Общая оценка качества: ${(overallScore * 100).toFixed(1)}%\n\n`;
        summary += `Найдено проблем: ${totalIssues}\n`;
        summary += `- Критических: ${criticalIssues}\n`;
        summary += `- Высокого приоритета: ${highIssues}\n\n`;

        summary += 'Категории:\n';
        Object.keys(categories).forEach(category => {
            const cat = categories[category];
            summary += `- ${category}: ${(cat.score * 100).toFixed(1)}% (${cat.issues.length} проблем)\n`;
        });

        if (overallScore < 0.7) {
            summary += '\n⚠️ Требуется улучшение качества проекта';
        } else if (overallScore < 0.9) {
            summary += '\n✅ Качество проекта хорошее, есть возможности для улучшения';
        } else {
            summary += '\n✅ Качество проекта отличное';
        }

        return summary;
    }

    /**
     * Получение описания области проверки
     */
    private getScopeDescription(scope: string): string {
        const descriptions: { [key: string]: string } = {
            'full': 'Полная проверка',
            'code': 'Проверка кода',
            'architecture': 'Проверка архитектуры',
            'performance': 'Проверка производительности',
            'security': 'Проверка безопасности'
        };
        return descriptions[scope] || scope;
    }

    /**
     * Анализ результатов проверки и генерация рекомендаций
     */
    async analyzeQualityResults(report: QualityCheckReport): Promise<string[]> {
        const recommendations: string[] = [];

        // Анализ по категориям
        Object.keys(report.categories).forEach(category => {
            const cat = report.categories[category];
            if (cat.score < 0.7) {
                recommendations.push(
                    `Требуется улучшение в категории "${category}": ${cat.recommendations.slice(0, 3).join(', ')}`
                );
            }
        });

        // Общие рекомендации
        if (report.overallScore < 0.7) {
            recommendations.push('Рекомендуется провести рефакторинг критических компонентов');
            recommendations.push('Увеличить покрытие тестами до минимум 80%');
        }

        if (report.overallScore < 0.9) {
            recommendations.push('Провести оптимизацию производительности');
            recommendations.push('Улучшить документацию кода');
        }

        return recommendations;
    }
}
