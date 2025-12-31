import * as vscode from 'vscode';
import { AutonomousOrchestratorIntegration } from '../orchestrator/autonomous-orchestrator-integration';
import { TaskPriority } from '../agents/worker/task-queue';

/**
 * Провайдер контекстного меню для Explorer
 * Позволяет пользователю создавать задачи прямо из контекстного меню файлов/папок
 */
export class ContextMenuProvider {
    private autonomousIntegration: AutonomousOrchestratorIntegration;
    
    constructor(autonomousIntegration: AutonomousOrchestratorIntegration) {
        this.autonomousIntegration = autonomousIntegration;
    }
    
    /**
     * Зарегистрировать команды контекстного меню
     */
    register(context: vscode.ExtensionContext): void {
        // Команда: Создать задачу для файла/папки
        const createTask = vscode.commands.registerCommand(
            'cursor-autonomous.contextMenu.createTask',
            async (uri: vscode.Uri) => {
                await this.handleCreateTask(uri);
            }
        );
        
        // Команда: Рефакторинг файла
        const refactor = vscode.commands.registerCommand(
            'cursor-autonomous.contextMenu.refactor',
            async (uri: vscode.Uri) => {
                await this.handleRefactor(uri);
            }
        );
        
        // Команда: Проверить качество кода
        const checkQuality = vscode.commands.registerCommand(
            'cursor-autonomous.contextMenu.checkQuality',
            async (uri: vscode.Uri) => {
                await this.handleCheckQuality(uri);
            }
        );
        
        // Команда: Добавить тесты
        const addTests = vscode.commands.registerCommand(
            'cursor-autonomous.contextMenu.addTests',
            async (uri: vscode.Uri) => {
                await this.handleAddTests(uri);
            }
        );
        
        // Команда: Оптимизировать производительность
        const optimize = vscode.commands.registerCommand(
            'cursor-autonomous.contextMenu.optimize',
            async (uri: vscode.Uri) => {
                await this.handleOptimize(uri);
            }
        );
        
        context.subscriptions.push(
            createTask,
            refactor,
            checkQuality,
            addTests,
            optimize
        );
    }
    
    /**
     * Обработать создание задачи
     */
    private async handleCreateTask(uri: vscode.Uri): Promise<void> {
        const relativePath = vscode.workspace.asRelativePath(uri);
        
        // Определяем тип файла
        const isDirectory = (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
        
        // Запрашиваем описание задачи
        const description = await vscode.window.showInputBox({
            prompt: isDirectory 
                ? `Создать задачу для папки ${relativePath}`
                : `Создать задачу для файла ${relativePath}`,
            placeHolder: 'Например: Добавить валидацию входных данных',
            validateInput: (value) => {
                return value.trim().length === 0 ? 'Описание не может быть пустым' : null;
            }
        });
        
        if (!description) {
            return;
        }
        
        // Выбираем приоритет
        const priority = await vscode.window.showQuickPick([
            { label: '⚡ Немедленно', description: 'Прервать текущую работу', value: 'immediate' },
            { label: '🔥 Высокий', description: 'Выполнить в первую очередь', value: 'high' },
            { label: '📝 Средний', description: 'Обычная очередь', value: 'medium' },
            { label: '📋 Низкий', description: 'Когда агенты свободны', value: 'low' }
        ], {
            placeHolder: 'Выберите приоритет задачи'
        });
        
        if (!priority) {
            return;
        }
        
        // Выбираем тип задачи
        const type = await vscode.window.showQuickPick([
            { label: '✨ Новая функция', value: 'feature' },
            { label: '🐛 Исправление бага', value: 'bug' },
            { label: '♻️ Рефакторинг', value: 'refactoring' },
            { label: '🎨 Улучшение', value: 'improvement' },
            { label: '✅ Проверка качества', value: 'quality-check' }
        ], {
            placeHolder: 'Выберите тип задачи'
        });
        
        if (!type) {
            return;
        }
        
        // Создаем задачу
        const fullDescription = isDirectory
            ? `${description} (папка: ${relativePath})`
            : `${description} (файл: ${relativePath})`;
        
        await this.autonomousIntegration.createTask(
            fullDescription,
            priority.value as any,
            type.value as any
        );
    }
    
    /**
     * Обработать рефакторинг
     */
    private async handleRefactor(uri: vscode.Uri): Promise<void> {
        const relativePath = vscode.workspace.asRelativePath(uri);
        
        const refactoringType = await vscode.window.showQuickPick([
            { label: '🔄 Общий рефакторинг', description: 'Улучшить структуру и читаемость', value: 'general' },
            { label: '🎯 Упростить код', description: 'Уменьшить сложность', value: 'simplify' },
            { label: '📦 Разделить на модули', description: 'Улучшить модульность', value: 'modularize' },
            { label: '🧹 Очистить код', description: 'Удалить дублирование', value: 'cleanup' },
            { label: '⚡ Оптимизировать производительность', description: 'Улучшить скорость', value: 'optimize' }
        ], {
            placeHolder: 'Выберите тип рефакторинга'
        });
        
        if (!refactoringType) {
            return;
        }
        
        const description = `Рефакторинг (${refactoringType.label}): ${relativePath}`;
        
        await this.autonomousIntegration.createTask(
            description,
            'medium',
            'refactoring'
        );
    }
    
    /**
     * Обработать проверку качества
     */
    private async handleCheckQuality(uri: vscode.Uri): Promise<void> {
        const relativePath = vscode.workspace.asRelativePath(uri);
        
        const checks = await vscode.window.showQuickPick([
            { label: '✅ Все проверки', picked: true },
            { label: '🔍 Линтинг' },
            { label: '🧪 Покрытие тестами' },
            { label: '📊 Сложность кода' },
            { label: '🔒 Безопасность' },
            { label: '📝 Документация' }
        ], {
            canPickMany: true,
            placeHolder: 'Выберите проверки'
        });
        
        if (!checks || checks.length === 0) {
            return;
        }
        
        const checkNames = checks.map(c => c.label).join(', ');
        const description = `Проверка качества (${checkNames}): ${relativePath}`;
        
        await this.autonomousIntegration.createTask(
            description,
            'medium',
            'quality-check'
        );
    }
    
    /**
     * Обработать добавление тестов
     */
    private async handleAddTests(uri: vscode.Uri): Promise<void> {
        const relativePath = vscode.workspace.asRelativePath(uri);
        
        const testType = await vscode.window.showQuickPick([
            { label: '🧪 Unit тесты', description: 'Тестирование отдельных функций', value: 'unit' },
            { label: '🔗 Integration тесты', description: 'Тестирование взаимодействия', value: 'integration' },
            { label: '🌐 E2E тесты', description: 'Сквозное тестирование', value: 'e2e' }
        ], {
            placeHolder: 'Выберите тип тестов'
        });
        
        if (!testType) {
            return;
        }
        
        const description = `Добавить ${testType.label} для ${relativePath}`;
        
        await this.autonomousIntegration.createTask(
            description,
            'high',
            'feature'
        );
    }
    
    /**
     * Обработать оптимизацию
     */
    private async handleOptimize(uri: vscode.Uri): Promise<void> {
        const relativePath = vscode.workspace.asRelativePath(uri);
        
        const optimizationType = await vscode.window.showQuickPick([
            { label: '⚡ Производительность', description: 'Ускорить выполнение', value: 'performance' },
            { label: '💾 Использование памяти', description: 'Уменьшить потребление памяти', value: 'memory' },
            { label: '📦 Размер бандла', description: 'Уменьшить размер сборки', value: 'bundle' },
            { label: '🔄 Алгоритмы', description: 'Улучшить алгоритмы', value: 'algorithms' }
        ], {
            placeHolder: 'Выберите тип оптимизации'
        });
        
        if (!optimizationType) {
            return;
        }
        
        const description = `Оптимизация (${optimizationType.label}): ${relativePath}`;
        
        await this.autonomousIntegration.createTask(
            description,
            'medium',
            'improvement'
        );
    }
}
