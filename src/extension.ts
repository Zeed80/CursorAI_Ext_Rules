import * as vscode from 'vscode';
import { Orchestrator } from './orchestrator/orchestrator';
import { SelfLearningOrchestrator } from './orchestrator/self-learning-orchestrator';
import { SettingsManager } from './integration/settings-manager';
import { UIIntegration } from './integration/ui-integration';
import { VirtualUser } from './agents/virtual-user';
import { SelfImprover } from './agents/self-improver';
import { RulesIntegration } from './storage/rules-integration';
import { CursorAPI } from './integration/cursor-api';
import { AgentsStatusTreeProvider } from './ui/agents-status-tree';
import { StatusPanel } from './ui/status-panel';
import { AnalyticsPanel } from './ui/analytics-panel';
import { SettingsPanel } from './ui/settings-panel';
import { AgentThoughts } from './agents/local-agent';
import { ModelProviderManager } from './integration/model-providers/provider-manager';
import { UsageTracker } from './integration/model-providers/usage-tracker';

let orchestrator: SelfLearningOrchestrator | undefined;
let virtualUser: VirtualUser | undefined;
let selfImprover: SelfImprover | undefined;
let statusBarItem: vscode.StatusBarItem;
let agentsStatusTreeProvider: AgentsStatusTreeProvider | undefined;
let statusUpdateInterval: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('CursorAI Autonomous Extension is now active!');

    // Инициализация компонентов
    const settingsManager = new SettingsManager();
    const uiIntegration = new UIIntegration(context);
    
    // Инициализация CursorAI API
    const apiKey = settingsManager.getSetting<string | undefined>('apiKey', undefined);
    CursorAPI.initialize(apiKey);
    
    // Проверка доступности API
    CursorAPI.checkApiAvailability().then(available => {
        if (available) {
            console.log('CursorAI API is available');
        } else {
            console.log('CursorAI API not available, using fallback methods');
        }
    });

    // Инициализация провайдеров моделей (асинхронно)
    import('./integration/model-providers/providers-initializer').then(({ ProvidersInitializer }) => {
        ProvidersInitializer.initialize(context).then(() => {
            console.log('Model providers initialized');
        }).catch(err => {
            console.error('Error initializing model providers:', err);
        });
    });

    // Инициализация TreeView для статуса агентов ПЕРЕД созданием оркестратора
    agentsStatusTreeProvider = new AgentsStatusTreeProvider();

    // Инициализация самообучаемого оркестратора ПЕРЕД регистрацией команд
    orchestrator = new SelfLearningOrchestrator(context, settingsManager, agentsStatusTreeProvider);
    const agentsTreeView = vscode.window.createTreeView('cursorAutonomousAgents', {
        treeDataProvider: agentsStatusTreeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(agentsTreeView);

    // Регистрация ВСЕХ команд ДО создания кнопок в статус-баре
    // Это критически важно для работы расширения
    
    const quickMenu = vscode.commands.registerCommand('cursor-autonomous.quickMenu', async () => {
        const items: vscode.QuickPickItem[] = [
            {
                label: '$(play) Запустить оркестратор',
                description: 'Запустить систему оркестрации агентов',
                detail: 'Начать координацию работы агентов'
            },
            {
                label: '$(stop) Остановить оркестратор',
                description: 'Остановить работу оркестратора',
                detail: 'Прекратить координацию агентов'
            },
            {
                label: '$(person) Включить виртуального пользователя',
                description: 'Активировать автономный режим',
                detail: 'Виртуальный пользователь будет принимать решения автоматически'
            },
            {
                label: '$(person-off) Выключить виртуального пользователя',
                description: 'Деактивировать автономный режим',
                detail: 'Вернуться к ручному управлению'
            },
            {
                label: '$(search) Анализ проекта',
                description: 'Проанализировать структуру и технологии проекта',
                detail: 'Определить тип проекта и сгенерировать правила'
            },
            {
                label: '$(add) Создать задачу',
                description: 'Создать новую задачу для агентов',
                detail: 'Создать задачу и отправить её в чат CursorAI'
            },
            {
                label: '$(info) Статус системы',
                description: 'Показать текущий статус всех компонентов',
                detail: 'Оркестратор, виртуальный пользователь, самосовершенствование'
            },
            {
                label: '$(dashboard) Панель статуса',
                description: 'Открыть детальную панель статуса агентов',
                detail: 'Просмотр всех агентов и их задач'
            },
            {
                label: '$(graph) Аналитика задач',
                description: 'Просмотр аналитики и метрик выполнения задач',
                detail: 'Статистика по типам задач, агентам и рекомендации'
            },
            {
                label: '$(settings) Настройки',
                description: 'Открыть настройки расширения',
                detail: 'Настроить интервалы, пороги и режимы работы'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Выберите действие (Ctrl+Shift+A для быстрого доступа)',
            ignoreFocusOut: true
        });

        if (selected) {
            switch (selected.label) {
                case '$(play) Запустить оркестратор':
                    await vscode.commands.executeCommand('cursor-autonomous.startOrchestrator');
                    break;
                case '$(stop) Остановить оркестратор':
                    await vscode.commands.executeCommand('cursor-autonomous.stopOrchestrator');
                    break;
                case '$(person) Включить виртуального пользователя':
                    await vscode.commands.executeCommand('cursor-autonomous.enableVirtualUser');
                    break;
                case '$(person-off) Выключить виртуального пользователя':
                    await vscode.commands.executeCommand('cursor-autonomous.disableVirtualUser');
                    break;
                case '$(search) Анализ проекта':
                    await vscode.commands.executeCommand('cursor-autonomous.analyzeProject');
                    break;
                case '$(add) Создать задачу':
                    await vscode.commands.executeCommand('cursor-autonomous.createTask');
                    break;
                case '$(info) Статус системы':
                    await vscode.commands.executeCommand('cursor-autonomous.showStatus');
                    break;
                case '$(dashboard) Панель статуса':
                    await vscode.commands.executeCommand('cursor-autonomous.showStatusPanel');
                    break;
                case '$(graph) Аналитика задач':
                    await vscode.commands.executeCommand('cursor-autonomous.showAnalytics');
                    break;
                case '$(settings) Настройки':
                    await vscode.commands.executeCommand('cursor-autonomous.openSettings');
                    break;
            }
        }
    });

    const toggleVirtualUser = vscode.commands.registerCommand('cursor-autonomous.toggleVirtualUser', async () => {
        try {
            const config = vscode.workspace.getConfiguration('cursor-autonomous');
            const isEnabled = config.get<boolean>('enableVirtualUser', false);
            
            if (isEnabled) {
                await vscode.commands.executeCommand('cursor-autonomous.disableVirtualUser');
            } else {
                await vscode.commands.executeCommand('cursor-autonomous.enableVirtualUser');
            }
        } catch (error) {
            console.error('Error in toggleVirtualUser:', error);
            vscode.window.showErrorMessage(`Ошибка переключения виртуального пользователя: ${error}`);
        }
    });
    
    // Явная проверка регистрации команды
    console.log('Command toggleVirtualUser registered:', toggleVirtualUser ? 'YES' : 'NO');

    const startOrchestrator = vscode.commands.registerCommand('cursor-autonomous.startOrchestrator', async () => {
        if (orchestrator) {
            await orchestrator.start();
            updateStatusBar('active');
            vscode.window.showInformationMessage('Orchestrator started');
        }
    });

    const stopOrchestrator = vscode.commands.registerCommand('cursor-autonomous.stopOrchestrator', async () => {
        if (orchestrator) {
            await orchestrator.stop();
            updateStatusBar('stopped');
            vscode.window.showInformationMessage('Orchestrator stopped');
        }
    });

    const enableVirtualUser = vscode.commands.registerCommand('cursor-autonomous.enableVirtualUser', async () => {
        await settingsManager.updateSetting('enableVirtualUser', true);
        if (!virtualUser && orchestrator) {
            virtualUser = new VirtualUser(context, orchestrator, settingsManager);
            context.subscriptions.push(virtualUser);
        }
        if (virtualUser) {
            if (!virtualUser.isRunningState()) {
                await virtualUser.start();
            }
        } else if (orchestrator) {
            virtualUser = new VirtualUser(context, orchestrator, settingsManager);
            context.subscriptions.push(virtualUser);
            await virtualUser.start();
        }
        updateStatusBar('virtual-user');
        vscode.window.showInformationMessage('Virtual User mode enabled - Автономный режим активен');
    });

    const disableVirtualUser = vscode.commands.registerCommand('cursor-autonomous.disableVirtualUser', async () => {
        await settingsManager.updateSetting('enableVirtualUser', false);
        if (virtualUser) {
            await virtualUser.stop();
            virtualUser.dispose();
            virtualUser = undefined;
        }
        updateStatusBar('active');
        vscode.window.showInformationMessage('Virtual User mode disabled');
    });

    const showStatus = vscode.commands.registerCommand('cursor-autonomous.showStatus', () => {
        const status = {
            orchestrator: orchestrator?.isRunningState() ? 'Running' : 'Stopped',
            virtualUser: virtualUser ? 'Enabled' : 'Disabled',
            selfImprover: selfImprover ? 'Enabled' : 'Disabled'
        };
        vscode.window.showInformationMessage(
            `Orchestrator: ${status.orchestrator}\n` +
            `Virtual User: ${status.virtualUser}\n` +
            `Self-Improvement: ${status.selfImprover}`
        );
    });

    const analyzeProject = vscode.commands.registerCommand('cursor-autonomous.analyzeProject', async () => {
        if (!orchestrator) {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
            return;
        }

        const currentOrchestrator = orchestrator; // Сохраняем ссылку для использования в замыкании

        try {
            // Показываем прогресс
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Анализ проекта',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Запуск комплексного анализа проекта...' });

                // Комплексный анализ проекта
                progress.report({ increment: 20, message: 'Анализ технологий и архитектуры...' });
                await currentOrchestrator.analyzeProject();

                progress.report({ increment: 40, message: 'Генерация правил...' });
                
                // Генерация правил
                const { ProjectAnalyzer } = await import('./orchestrator/project-analyzer');
                const { RuleGenerator } = await import('./orchestrator/rule-generator');
                const { ChatRuleEnhancer } = await import('./orchestrator/chat-rule-enhancer');
                
                const projectAnalyzer = new ProjectAnalyzer();
                const ruleGenerator = new RuleGenerator();
                const chatEnhancer = new ChatRuleEnhancer();
                
                const profile = await projectAnalyzer.loadProfile();
                if (!profile) {
                    throw new Error('Профиль проекта не найден');
                }

                progress.report({ increment: 60, message: 'Генерация базовых правил...' });
                const rules = await ruleGenerator.generateRulesFromProfile();
                
                progress.report({ increment: 80, message: 'Сохранение правил...' });
                await ruleGenerator.saveRules(rules);

                progress.report({ increment: 90, message: 'Обновление индекса правил...' });
                const { RulesIntegration } = await import('./storage/rules-integration');
                const rulesIntegration = new RulesIntegration();
                await rulesIntegration.adaptRulesToProject();

                progress.report({ increment: 100, message: 'Завершено!' });

                // Предложение улучшения через чат
                const enhanceChoice = await vscode.window.showInformationMessage(
                    `Анализ проекта завершен! Сгенерировано ${rules.length} правил. Хотите улучшить правила через чат CursorAI?`,
                    'Улучшить через чат',
                    'Пропустить'
                );

                if (enhanceChoice === 'Улучшить через чат') {
                    await chatEnhancer.enhanceRulesViaChat(rules, profile);
                    vscode.window.showInformationMessage(
                        'Промпт для улучшения правил подготовлен. После улучшения в чате, правила будут автоматически использоваться CursorAI.',
                        'OK'
                    );
                } else {
                    vscode.window.showInformationMessage(
                        `Анализ проекта завершен! Сгенерировано ${rules.length} правил. Правила сохранены и готовы к использованию CursorAI.`,
                        'OK'
                    );
                }
            });
        } catch (error: any) {
            console.error('Error analyzing project:', error);
            vscode.window.showErrorMessage(`Ошибка при анализе проекта: ${error.message}`);
        }
    });

    // Команда для запуска проверки качества проекта
    const runQualityCheck = vscode.commands.registerCommand('cursor-autonomous.runQualityCheck', async () => {
        if (!orchestrator) {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
            return;
        }

        // Выбор области проверки
        const scope = await vscode.window.showQuickPick([
            { label: 'full', description: 'Полная проверка качества' },
            { label: 'code', description: 'Проверка качества кода' },
            { label: 'architecture', description: 'Проверка архитектуры' },
            { label: 'performance', description: 'Проверка производительности' },
            { label: 'security', description: 'Проверка безопасности' }
        ], {
            placeHolder: 'Выберите область проверки качества'
        });

        if (!scope) return;

        try {
            if (!orchestrator) {
                vscode.window.showErrorMessage('Оркестратор не инициализирован');
                return;
            }

            // Создаем задачу проверки качества
            const task = await orchestrator.createTask({
                type: 'quality-check',
                description: `Проверка качества проекта (${scope.description})`,
                priority: 'high'
            });

            vscode.window.showInformationMessage(
                `Задача проверки качества создана: ${task.id}. Запускается проверка...`
            );

            // Выполняем задачу проверки качества
            await orchestrator.executeTask(task.id);

            // Показываем результаты после завершения
            setTimeout(async () => {
                if (!orchestrator) return;
                const updatedTask = orchestrator.getTasks().find(t => t.id === task.id);
                if (updatedTask && updatedTask.executionResult?.success) {
                    const report = updatedTask.qualityCheckResults || [];
                    const message = `Проверка качества завершена!\n\n` +
                        `Найдено проблем: ${report.length}\n` +
                        `Результаты сохранены в задаче ${task.id}`;
                    
                    vscode.window.showInformationMessage(message, 'Показать отчет').then(action => {
                        if (action === 'Показать отчет') {
                            // Открываем панель статуса с результатами
                            vscode.commands.executeCommand('cursor-autonomous.showStatusPanel');
                        }
                    });
                }
            }, 2000);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Ошибка запуска проверки качества: ${error.message}`);
        }
    });

    // Команда для создания задачи
    const createTask = vscode.commands.registerCommand('cursor-autonomous.createTask', async () => {
        if (!orchestrator) {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
            return;
        }

        // Запрос типа задачи
        const taskType = await vscode.window.showQuickPick([
            { label: 'feature', description: 'Новая функция' },
            { label: 'bug', description: 'Исправление бага' },
            { label: 'improvement', description: 'Улучшение' },
            { label: 'refactoring', description: 'Рефакторинг' },
            { label: 'documentation', description: 'Документация' },
            { label: 'quality-check', description: 'Проверка качества проекта' }
        ], {
            placeHolder: 'Выберите тип задачи'
        });

        if (!taskType) return;

        // Запрос описания задачи
        const description = await vscode.window.showInputBox({
            prompt: 'Опишите задачу',
            placeHolder: 'Например: Добавить функцию поиска по проекту'
        });

        if (!description) return;

        // Запрос приоритета
        const priority = await vscode.window.showQuickPick([
            { label: 'high', description: 'Высокий' },
            { label: 'medium', description: 'Средний' },
            { label: 'low', description: 'Низкий' }
        ], {
            placeHolder: 'Выберите приоритет'
        });

        if (!priority) return;

        try {
            // Создание задачи
            const task = await orchestrator.createTask({
                type: taskType.label as any,
                description: description,
                priority: priority.label as any
            });

            vscode.window.showInformationMessage(`Задача создана: ${task.id}. Запускается мозговой штурм...`);

            // Выполнение задачи с мозговым штурмом и отображением размышлений
            await orchestrator.executeTaskWithBrainstorming(task.id, (agentId: string, thoughts: AgentThoughts) => {
                // Обновляем размышления в UI
                if (agentsStatusTreeProvider) {
                    agentsStatusTreeProvider.updateAgentThoughts(agentId, thoughts);
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Ошибка создания задачи: ${error.message}`);
        }
    });

    // Функция отправки задачи в чат CursorAI
    async function sendTaskToChatHelper(task: any, orchestrator: Orchestrator): Promise<void> {
        try {
            // Формируем сообщение для чата
            const agentName = task.assignedAgent ? 
                orchestrator.getAgentsStatus().find((a: any) => a.id === task.assignedAgent)?.name || task.assignedAgent :
                'Оркестратор';

            const message = `🎯 **Задача создана**

**Тип:** ${task.type}
**Приоритет:** ${task.priority}
**Описание:** ${task.description}
**Назначен:** ${agentName}
**ID:** ${task.id}

Пожалуйста, выполните эту задачу.`;

            // Пытаемся открыть чат и отправить сообщение
            try {
                // Пытаемся использовать команду CursorAI для открытия чата (если доступна)
                try {
                    await vscode.commands.executeCommand('workbench.action.chat.open');
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (chatError: any) {
                    // Команда может быть недоступна в некоторых версиях CursorAI
                    console.debug('Chat command not available:', chatError.message);
                }
                
                // Альтернатива: показываем сообщение пользователю
                const action = await vscode.window.showInformationMessage(
                    `Задача создана и назначена агенту: ${agentName}`,
                    'Скопировать в буфер обмена',
                    'Открыть панель задач'
                );

                if (action === 'Скопировать в буфер обмена') {
                    await vscode.env.clipboard.writeText(message);
                    vscode.window.showInformationMessage('Сообщение скопировано в буфер обмена. Вставьте его в чат CursorAI (Ctrl+L).');
                } else if (action === 'Открыть панель задач') {
                    // Показываем панель статуса с задачами
                    await vscode.commands.executeCommand('cursor-autonomous.showStatusPanel');
                }
            } catch (chatError) {
                // Если не удалось открыть чат, показываем сообщение
                console.warn('Could not open chat:', chatError);
                await vscode.env.clipboard.writeText(message);
                vscode.window.showInformationMessage(
                    'Задача создана. Сообщение скопировано в буфер обмена. Вставьте его в чат CursorAI (Ctrl+L).',
                    'OK'
                );
            }
        } catch (error: any) {
            console.error('Error sending task to chat:', error);
            vscode.window.showWarningMessage(`Задача создана, но не удалось отправить в чат: ${error.message}`);
        }
    }

    const showStatusPanel = vscode.commands.registerCommand('cursor-autonomous.showStatusPanel', () => {
        if (agentsStatusTreeProvider) {
            StatusPanel.createOrShow(context.extensionUri, agentsStatusTreeProvider);
        }
    });

    const showAnalytics = vscode.commands.registerCommand('cursor-autonomous.showAnalytics', () => {
        if (orchestrator) {
            AnalyticsPanel.createOrShow(context.extensionUri, orchestrator);
        } else {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
        }
    });

    const openSettings = vscode.commands.registerCommand('cursor-autonomous.openSettings', () => {
        const modelProviderManager = ModelProviderManager.getInstance();
        const usageTracker = UsageTracker.getInstance(context);
        SettingsPanel.createOrShow(
            context.extensionUri,
            settingsManager,
            modelProviderManager,
            usageTracker
        );
    });

    const refreshAgentsStatus = vscode.commands.registerCommand('cursor-autonomous.refreshAgentsStatus', () => {
        updateAgentsStatus();
        if (agentsStatusTreeProvider) {
            agentsStatusTreeProvider.refresh();
        }
    });

    // Команда для выбора модели агента (теперь открывает панель настроек)
    const selectAgentModel = vscode.commands.registerCommand('cursor-autonomous.selectAgentModel', async (item?: vscode.TreeItem | string) => {
        // Просто открываем панель настроек
        await vscode.commands.executeCommand('cursor-autonomous.openSettings');
        vscode.window.showInformationMessage('Используйте панель настроек для выбора модели агента');
    });
    context.subscriptions.push(selectAgentModel);

    // Команда для передачи задачи в чат
    const sendTaskToChat = vscode.commands.registerCommand('cursor-autonomous.sendTaskToChat', async (item?: vscode.TreeItem | { agentId: string, taskId: string }) => {
        if (!orchestrator || !agentsStatusTreeProvider) {
            vscode.window.showErrorMessage('Оркестратор не инициализирован');
            return;
        }

        let agentId: string | undefined;
        let taskId: string | undefined;

        // Если передан объект с agentId и taskId (из WebView)
        if (item && typeof item === 'object' && 'agentId' in item && 'taskId' in item) {
            agentId = item.agentId;
            taskId = item.taskId;
        }
        // Если передан TreeItem (из TreeView)
        else if (item instanceof vscode.TreeItem) {
            const treeItem = item as any;
            if (treeItem.task && treeItem.task.id) {
                taskId = treeItem.task.id;
                // Находим агента, которому назначена задача
                const tasks = orchestrator.getTasks();
                const task = tasks.find(t => t.id === taskId);
                if (task && task.assignedAgent) {
                    agentId = task.assignedAgent;
                }
            }
        }

        if (!agentId || !taskId) {
            vscode.window.showWarningMessage('Не удалось определить задачу для передачи в чат');
            return;
        }

        const agent = agentsStatusTreeProvider.getAgentStatus(agentId);
        if (!agent) {
            vscode.window.showWarningMessage('Агент не найден');
            return;
        }

        const tasks = orchestrator.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            vscode.window.showWarningMessage('Задача не найдена');
            return;
        }

        // Формируем сообщение для чата
        const taskTypeEmoji: { [key: string]: string } = {
            'feature': '✨',
            'bug': '🐛',
            'improvement': '🔧',
            'refactoring': '♻️',
            'documentation': '📝',
            'quality-check': '🔍'
        };

        const priorityText: { [key: string]: string } = {
            'high': 'Высокий',
            'medium': 'Средний',
            'low': 'Низкий'
        };

        const emoji = taskTypeEmoji[task.type] || '📋';
        const priority = priorityText[task.priority] || task.priority;

        let message = `${emoji} **Задача от агента "${agent.name}"**\n\n`;
        message += `**Описание:** ${task.description}\n\n`;
        message += `**Тип:** ${task.type}\n`;
        message += `**Приоритет:** ${priority}\n`;
        message += `**Статус:** ${task.status}\n`;
        
        if (task.progress) {
            message += `\n**Прогресс:**\n`;
            message += `- Изменено файлов: ${task.progress.filesChanged || 0}\n`;
            message += `- Время работы: ${Math.round((task.progress.timeElapsed || 0) / 1000)}с\n`;
        }

        if (task.executionResult && !task.executionResult.success && task.executionResult.error) {
            message += `\n**Ошибка:** ${task.executionResult.error}\n`;
        }

        message += `\nПожалуйста, помогите выполнить эту задачу.`;

        try {
            // Пытаемся открыть чат CursorAI (если команда доступна)
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open');
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (chatError: any) {
                // Команда может быть недоступна в некоторых версиях CursorAI
                console.debug('Chat command not available:', chatError.message);
            }

            // Копируем сообщение в буфер обмена
            await vscode.env.clipboard.writeText(message);

            // Показываем уведомление
            const action = await vscode.window.showInformationMessage(
                'Задача подготовлена для передачи в чат. Сообщение скопировано в буфер обмена.',
                'Открыть чат',
                'OK'
            );

            if (action === 'Открыть чат') {
                vscode.window.showInformationMessage(
                    'Вставьте сообщение из буфера обмена в чат CursorAI (Ctrl+V или Cmd+V)',
                    'OK'
                );
            }
        } catch (error: any) {
            console.warn('Failed to send task to chat:', error);
            // Fallback: просто копируем в буфер обмена
            await vscode.env.clipboard.writeText(message);
            vscode.window.showWarningMessage(
                'Не удалось открыть чат автоматически. Сообщение скопировано в буфер обмена. Вставьте его в чат CursorAI вручную.',
                'OK'
            );
        }
    });
    context.subscriptions.push(sendTaskToChat);

    const showAgentDetails = vscode.commands.registerCommand('cursor-autonomous.showAgentDetails', async (item?: vscode.TreeItem | string) => {
        let agentId: string | undefined;

        // Если передан TreeItem, извлекаем agentId из него
        if (item instanceof vscode.TreeItem) {
            const treeItem = item as any;
            if (treeItem.agent && treeItem.agent.id) {
                agentId = treeItem.agent.id;
            } else {
                agentId = item.label as string;
            }
        } else if (typeof item === 'string') {
            agentId = item;
        }

        if (!agentId) {
            const agents = agentsStatusTreeProvider?.getAllAgents() || [];
            const items = agents.map(a => ({
                label: a.name,
                description: a.status === 'working' ? `Работает: ${a.currentTask?.description.substring(0, 50)}...` : 'Ожидает',
                agentId: a.id
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Выберите агента для просмотра деталей'
            });

            if (selected) {
                agentId = selected.agentId;
            } else {
                return;
            }
        }

        const agent = agentsStatusTreeProvider?.getAgentStatus(agentId);
        if (agent) {
            const tasks = orchestrator?.getTasks().filter(t => t.assignedAgent === agentId) || [];
            let message = `**${agent.name}**\n\n` +
                `Статус: ${getStatusText(agent.status)}\n` +
                `Задач в работе: ${agent.tasksInProgress}\n` +
                `Задач выполнено: ${agent.tasksCompleted}\n`;

            if (agent.selectedModel) {
                message += `\n**Выбранная модель:** ${agent.selectedModel.displayName || agent.selectedModel.id}\n`;
            } else {
                message += `\n**Выбранная модель:** По умолчанию (автоматический выбор)\n`;
            }

            message += (agent.currentTask ? `\n**Текущая задача:**\n${agent.currentTask.description}` : '') +
                (tasks.length > 0 ? `\n\n**Все задачи агента:**\n${tasks.map(t => `- ${t.description} (${t.status})`).join('\n')}` : '');

            const action = await vscode.window.showInformationMessage(message, { modal: true }, 'Выбрать модель');
            if (action === 'Выбрать модель') {
                vscode.commands.executeCommand('cursor-autonomous.selectAgentModel', agentId);
            }
        }
    });

    // Создание статус-бара с быстрым меню
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'cursor-autonomous.quickMenu';
    statusBarItem.text = '$(robot) CursorAI';
    statusBarItem.tooltip = 'CursorAI Autonomous - Быстрое меню (Ctrl+Shift+A)';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Создание дополнительных кнопок в статус-баре
    // ВАЖНО: команда toggleVirtualUser уже зарегистрирована выше (строка 132)
    const virtualUserButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    virtualUserButton.command = 'cursor-autonomous.toggleVirtualUser';
    virtualUserButton.text = '$(person) Virtual User';
    virtualUserButton.tooltip = 'Переключить виртуального пользователя (Ctrl+Shift+V)';
    
    // Показываем кнопку - команда уже зарегистрирована выше
    virtualUserButton.show();
    
    // Проверка доступности команды (асинхронно, для отладки)
    Promise.resolve(vscode.commands.getCommands()).then(commands => {
        const commandExists = commands.includes('cursor-autonomous.toggleVirtualUser');
        console.log('toggleVirtualUser command available:', commandExists);
        if (!commandExists) {
            console.error('ERROR: toggleVirtualUser command not found!');
            console.log('Available cursor-autonomous commands:', 
                commands.filter(c => c.startsWith('cursor-autonomous')).join(', '));
        }
    });
    
    context.subscriptions.push(virtualUserButton);

    // Регистрация всех команд
    context.subscriptions.push(
        startOrchestrator,
        stopOrchestrator,
        toggleVirtualUser,
        enableVirtualUser,
        disableVirtualUser,
        showStatus,
        analyzeProject,
        createTask,
        runQualityCheck,
        showStatusPanel,
        showAnalytics,
        openSettings,
        refreshAgentsStatus,
        showAgentDetails,
        sendTaskToChat
    );

    const analyzeButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    analyzeButton.command = 'cursor-autonomous.analyzeProject';
    analyzeButton.text = '$(search) Analyze';
    analyzeButton.tooltip = 'Анализ проекта (Ctrl+Shift+P)';
    analyzeButton.show();
    context.subscriptions.push(analyzeButton);

    const statusPanelButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 97);
    statusPanelButton.command = 'cursor-autonomous.showStatusPanel';
    statusPanelButton.text = '$(dashboard) Status';
    statusPanelButton.tooltip = 'Панель статуса агентов (Ctrl+Shift+S)';
    statusPanelButton.show();
    context.subscriptions.push(statusPanelButton);

    // Автообновление статуса агентов
    startStatusUpdates();

    // Инициализация виртуального пользователя (если включен в настройках)
    // НЕ запускаем автоматически - пользователь должен включить вручную
    if (settingsManager.getSetting('enableVirtualUser', false)) {
        virtualUser = new VirtualUser(context, orchestrator, settingsManager);
        context.subscriptions.push(virtualUser);
        // НЕ запускаем автоматически - пользователь должен включить через команду
        console.log('Virtual User instance created but not started (user must enable manually)');
    }

    // Инициализация системы самосовершенствования
    if (settingsManager.getSetting('autoImprove', true)) {
        selfImprover = new SelfImprover(context, orchestrator, settingsManager);
        context.subscriptions.push(selfImprover);
        // Автоматический запуск самосовершенствования
        selfImprover.start().catch(err => {
            console.error('Error starting self-improver:', err);
        });
    }

    // Регистрация всех команд в subscriptions
    context.subscriptions.push(
        quickMenu,
        toggleVirtualUser,
        startOrchestrator,
        stopOrchestrator,
        enableVirtualUser,
        disableVirtualUser,
        showStatus,
        analyzeProject,
        createTask,
        showStatusPanel,
        showAnalytics,
        refreshAgentsStatus,
        showAgentDetails,
        sendTaskToChat
    );
    
    // Логирование для отладки
    console.log('All commands registered. toggleVirtualUser:', toggleVirtualUser ? 'registered' : 'NOT registered');

    // Регистрация оркестратора в UI CursorAI
    uiIntegration.registerOrchestrator();

    // Интеграция существующих правил
    const rulesIntegration = new RulesIntegration();
    if (rulesIntegration.rulesExist()) {
        const extensionPath = context.extensionPath;
        rulesIntegration.copyRulesToExtension(extensionPath).catch(err => {
            console.error('Error copying rules:', err);
        });
    } else {
        // Автоматическая адаптация правил при первом запуске
        rulesIntegration.adaptRulesToProject().catch(err => {
            console.error('Error adapting rules:', err);
        });
    }
    
    // Регистрация для очистки при деактивации
    context.subscriptions.push({
        dispose: () => {
            rulesIntegration.dispose();
        }
    });

    // НЕ запускаем оркестратор автоматически при активации
    // Пользователь должен запустить его вручную через команду или меню
    console.log('Orchestrator initialized but not started (user must start manually)');
    updateStatusBar('stopped');

    // Обновление статус-бара при изменении настроек
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('cursor-autonomous')) {
                // Обновление API ключа при изменении настройки
                if (e.affectsConfiguration('cursor-autonomous.apiKey')) {
                    const newApiKey = settingsManager.getSetting<string | undefined>('apiKey', undefined);
                    // Обновляем API ключ только если он не пустой
                    if (newApiKey && newApiKey.trim().length > 0) {
                        CursorAPI.initialize(newApiKey.trim());
                        console.log('CursorAI API key updated from settings');
                    } else {
                        // Если ключ пустой, сбрасываем инициализацию
                        CursorAPI.initialize(undefined);
                        console.log('CursorAI API key cleared');
                    }
                }
                updateStatusBar();
            }
        })
    );

    // Периодическое обновление статус-бара
    const statusBarUpdateInterval = setInterval(() => {
        updateStatusBar();
        updateAgentsStatus();
    }, 5000); // Обновление каждые 5 секунд
    context.subscriptions.push({
        dispose: () => clearInterval(statusBarUpdateInterval)
    });

    // Первоначальное обновление статус-бара
    updateStatusBar();
    updateAgentsStatus();
}

function startStatusUpdates(): void {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }

    statusUpdateInterval = setInterval(() => {
        updateAgentsStatus();
    }, 3000); // Обновление каждые 3 секунды
}

function updateAgentsStatus(): void {
    if (!orchestrator || !agentsStatusTreeProvider) {
        return;
    }

    // Обновление статуса оркестратора
    if (orchestrator.isRunningState()) {
        agentsStatusTreeProvider.updateAgentStatus('orchestrator', { status: 'working' });
    } else {
        agentsStatusTreeProvider.updateAgentStatus('orchestrator', { status: 'idle' });
    }

    // Обновление статуса виртуального пользователя
    if (virtualUser) {
        const isRunning = (virtualUser as any).isRunningState?.() || false;
        agentsStatusTreeProvider.updateAgentStatus('virtual-user', { 
            status: isRunning ? 'working' : 'idle' 
        });
    }

    // Обновление задач
    const tasks = orchestrator.getTasks();
    agentsStatusTreeProvider.updateTasks(tasks);

    // Обновление статусов агентов на основе задач
    const agentsStatus = orchestrator.getAgentsStatus();
    for (const agentStatus of agentsStatus) {
        agentsStatusTreeProvider.updateAgentStatus(agentStatus.id, agentStatus);
        
        // Обновляем размышления, если они есть
        if ((agentStatus as any).currentThoughts) {
            agentsStatusTreeProvider.updateAgentThoughts(agentStatus.id, (agentStatus as any).currentThoughts);
        }
    }
}

function getStatusText(status: string): string {
    const statuses: { [key: string]: string } = {
        'working': 'Работает',
        'idle': 'Ожидает',
        'error': 'Ошибка',
        'disabled': 'Отключен'
    };
    return statuses[status] || status;
}

function updateStatusBar(status?: string) {
    if (!statusBarItem) return;

    const config = vscode.workspace.getConfiguration('cursor-autonomous');
    const virtualUserEnabled = config.get<boolean>('enableVirtualUser', false);
    const orchestratorEnabled = config.get<boolean>('enableOrchestrator', true);
    const isOrchestratorRunning = orchestrator?.isRunningState() || false;

    if (virtualUserEnabled && isOrchestratorRunning) {
        statusBarItem.text = '$(robot) CursorAI $(check)';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        statusBarItem.tooltip = 'Автономный режим активен - Виртуальный пользователь работает';
    } else if (isOrchestratorRunning) {
        statusBarItem.text = '$(robot) CursorAI';
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = 'Оркестратор работает - Нажмите для быстрого меню (Ctrl+Shift+A)';
    } else {
        statusBarItem.text = '$(robot) CursorAI $(circle-slash)';
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = 'Оркестратор остановлен - Нажмите для быстрого меню (Ctrl+Shift+A)';
    }
}

export function deactivate() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = undefined;
    }
    if (orchestrator) {
        orchestrator.stop();
        orchestrator.dispose();
    }
    if (virtualUser) {
        virtualUser.stop();
        virtualUser.dispose();
    }
    if (selfImprover) {
        selfImprover.stop();
        selfImprover.dispose();
    }
}
