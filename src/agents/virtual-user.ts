import * as vscode from 'vscode';
import { Orchestrator } from '../orchestrator/orchestrator';
import { SettingsManager } from '../integration/settings-manager';
import { UIIntegration } from '../integration/ui-integration';
import { ProjectMonitor } from './virtual-user-monitor';
import { DecisionMaker } from './virtual-user-decision';

export interface ProjectGoal {
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
}

export interface Proposal {
    id: string;
    title: string;
    description: string;
    files: string[];
    risks: string[];
    benefits: string[];
    estimatedTime: string;
    confidence: number;
}

export class VirtualUser implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private orchestrator: Orchestrator;
    private settingsManager: SettingsManager;
    private uiIntegration: UIIntegration;
    private monitor: ProjectMonitor;
    private decisionMaker: DecisionMaker;
    private isRunning: boolean = false;
    private monitoringInterval?: NodeJS.Timeout;
    private projectGoals: ProjectGoal[] = [];
    private autonomousMode: boolean = true; // Автономный режим по умолчанию
    private autoApproveThreshold: number = 0.8; // Порог автоодобрения
    private requestConfirmationThreshold: number = 0.6; // Порог запроса подтверждения

    constructor(
        context: vscode.ExtensionContext,
        orchestrator: Orchestrator,
        settingsManager: SettingsManager
    ) {
        this.context = context;
        this.orchestrator = orchestrator;
        this.settingsManager = settingsManager;
        this.uiIntegration = new UIIntegration(context);
        this.monitor = new ProjectMonitor(context, settingsManager);
        this.decisionMaker = new DecisionMaker(settingsManager);
        
        this.loadProjectGoals();
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        console.log('Virtual User agent started');

        // Начальный анализ проекта
        await this.analyzeProject();

        // Запуск мониторинга
        const interval = this.settingsManager.monitoringInterval;
        this.monitoringInterval = setInterval(() => {
            this.monitorProject();
        }, interval);

        this.uiIntegration.showVirtualUserNotification('Virtual User mode activated', 'info');
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        console.log('Virtual User agent stopped');
        this.uiIntegration.showVirtualUserNotification('Virtual User mode deactivated', 'info');
    }

    /**
     * Анализ проекта для понимания целей
     */
    private async analyzeProject(): Promise<void> {
        // Анализ README, документации, кода для понимания целей проекта
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        // Поиск README и документации
        const readmeFiles = await vscode.workspace.findFiles('**/README.md', null, 5);
        const docsFiles = await vscode.workspace.findFiles('**/docs/**/*.md', null, 10);

        // Извлечение целей из документации
        for (const file of [...readmeFiles, ...docsFiles]) {
            const content = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(content).toString('utf-8');
            this.extractGoalsFromText(text);
        }

        // Сохранение целей
        await this.saveProjectGoals();
    }

    /**
     * Извлечение целей из текста
     */
    private extractGoalsFromText(text: string): void {
        // Простой парсинг целей (можно улучшить с помощью LLM)
        const goalPatterns = [
            /цель[:\s]+(.+)/gi,
            /goal[:\s]+(.+)/gi,
            /задача[:\s]+(.+)/gi,
            /task[:\s]+(.+)/gi,
            /TODO[:\s]+(.+)/gi,
            /FIXME[:\s]+(.+)/gi
        ];

        for (const pattern of goalPatterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                if (match[1]) {
                    this.projectGoals.push({
                        description: match[1].trim(),
                        priority: 'medium',
                        status: 'pending'
                    });
                }
            }
        }
    }

    /**
     * Мониторинг проекта
     */
    private async monitorProject(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('Virtual User: Monitoring project...');

        // Анализ состояния проекта
        const projectState = await this.monitor.analyzeProjectState();
        
        // Выявление проблем и возможностей улучшения
        const issues = await this.monitor.detectIssues();
        const improvements = await this.monitor.suggestImprovements();

        // Генерация задач на основе анализа
        if (issues.length > 0 || improvements.length > 0) {
            await this.generateTasks(issues, improvements);
        }

        // Консультации с другими агентами
        await this.consultWithAgents();
    }

    /**
     * Генерация задач на основе анализа
     */
    private async generateTasks(issues: string[], improvements: string[]): Promise<void> {
        for (const issue of issues) {
            await this.orchestrator.createTask({
                type: 'bug',
                description: `Исправить проблему: ${issue}`,
                priority: 'high'
            });
        }

        for (const improvement of improvements) {
            await this.orchestrator.createTask({
                type: 'improvement',
                description: `Улучшение: ${improvement}`,
                priority: 'medium'
            });
        }
    }

    /**
     * Консультации с другими агентами
     */
    private async consultWithAgents(): Promise<void> {
        // Консультация с Architect о новых фичах
        const newFeatures = await this.monitor.suggestNewFeatures();
        if (newFeatures.length > 0) {
            // Отправка запроса архитектору через оркестратор
            for (const feature of newFeatures) {
                await this.orchestrator.consultAgent('architect', {
                    agentId: 'architect',
                    question: `Стоит ли добавить фичу: ${feature}?`,
                    context: 'virtual-user-consultation'
                });
            }
        }

        // Консультация с Analyst о производительности
        const performanceIssues = await this.monitor.detectPerformanceIssues();
        if (performanceIssues.length > 0) {
            for (const issue of performanceIssues) {
                await this.orchestrator.consultAgent('analyst', {
                    agentId: 'analyst',
                    question: `Как оптимизировать: ${issue}?`,
                    context: 'virtual-user-consultation'
                });
            }
        }
    }

    /**
     * Принятие решения о подтверждении предложения
     * В автономном режиме принимает решения автоматически при высокой уверенности
     */
    async makeDecision(proposal: Proposal): Promise<boolean> {
        console.log(`Virtual User: Making decision on proposal: ${proposal.title}`);

        // Анализ предложения
        const decision = await this.decisionMaker.analyzeProposal(proposal, this.projectGoals);

        // В автономном режиме автоматически одобряем при высокой уверенности
        if (this.autonomousMode) {
            // Высокая уверенность (>autoApproveThreshold) - автоматически одобрить
            if (decision.confidence > this.autoApproveThreshold && decision.approved) {
                console.log(`Virtual User: Auto-approved (confidence: ${decision.confidence}): ${proposal.title}`);
                this.uiIntegration.showVirtualUserNotification(
                    `✅ Автоматически одобрено: ${proposal.title} (уверенность: ${Math.round(decision.confidence * 100)}%)`,
                    'info'
                );
                return true;
            }
            
            // Средняя уверенность (requestConfirmationThreshold - autoApproveThreshold) - запросить подтверждение
            if (decision.confidence > this.requestConfirmationThreshold && decision.approved) {
                console.log(`Virtual User: Requesting user confirmation (confidence: ${decision.confidence}): ${proposal.title}`);
                return await this.requestUserConfirmation(proposal, decision);
            }
            
            // Низкая уверенность (<60%) или не одобрено - автоматически отклонить
            console.log(`Virtual User: Auto-rejected (confidence: ${decision.confidence}): ${proposal.title}`);
            this.uiIntegration.showVirtualUserNotification(
                `❌ Автоматически отклонено: ${proposal.title} (уверенность: ${Math.round(decision.confidence * 100)}%)\nПричина: ${decision.reason}`,
                'warning'
            );
            return false;
        }

        // В ручном режиме всегда запрашиваем подтверждение
        return await this.requestUserConfirmation(proposal, decision);
    }
    
    /**
     * Запросить подтверждение пользователя
     */
    private async requestUserConfirmation(proposal: Proposal, decision: any): Promise<boolean> {
        const action = await vscode.window.showInformationMessage(
            `Предложение: ${proposal.title}\n` +
            `Уверенность: ${Math.round(decision.confidence * 100)}%\n` +
            `Файлы: ${proposal.files.length}\n` +
            `Преимущества: ${proposal.benefits.join(', ')}`,
            { modal: true },
            'Одобрить',
            'Отклонить',
            'Подробнее'
        );
        
        if (action === 'Одобрить') {
            this.uiIntegration.showVirtualUserNotification(
                `Approved: ${proposal.title}`,
                'info'
            );
            return true;
        } else if (action === 'Подробнее') {
            // Показать детали
            const details = `Предложение: ${proposal.title}\n\n` +
                `Описание: ${proposal.description}\n\n` +
                `Файлы (${proposal.files.length}):\n${proposal.files.join('\n')}\n\n` +
                `Преимущества:\n${proposal.benefits.map(b => `✓ ${b}`).join('\n')}\n\n` +
                `Риски:\n${proposal.risks.map(r => `⚠ ${r}`).join('\n')}\n\n` +
                `Время: ${proposal.estimatedTime}\n` +
                `Уверенность: ${Math.round(decision.confidence * 100)}%`;
            
            vscode.window.showInformationMessage(details, { modal: true }, 'OK');
            
            // Повторно запросить решение
            return await this.requestUserConfirmation(proposal, decision);
        } else {
            this.uiIntegration.showVirtualUserNotification(
                `Rejected: ${proposal.title}`,
                'warning'
            );
            return false;
        }
    }
    
    /**
     * Установить режим работы
     */
    setAutonomousMode(enabled: boolean): void {
        this.autonomousMode = enabled;
        console.log(`Virtual User: Autonomous mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Получить текущий режим работы
     */
    isAutonomous(): boolean {
        return this.autonomousMode;
    }
    
    /**
     * Установить пороги уверенности
     */
    setConfidenceThresholds(autoApprove: number, requestConfirmation: number): void {
        this.autoApproveThreshold = Math.max(0, Math.min(1, autoApprove));
        this.requestConfirmationThreshold = Math.max(0, Math.min(1, requestConfirmation));
        console.log(`Virtual User: Confidence thresholds updated - autoApprove: ${this.autoApproveThreshold}, requestConfirmation: ${this.requestConfirmationThreshold}`);
    }
    
    /**
     * Получить пороги уверенности
     */
    getConfidenceThresholds(): { autoApprove: number, requestConfirmation: number } {
        return {
            autoApprove: this.autoApproveThreshold,
            requestConfirmation: this.requestConfirmationThreshold
        };
    }

    /**
     * Инициация новой задачи
     */
    async initiateTask(description: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
        await this.orchestrator.createTask({
            type: 'feature',
            description,
            priority
        });

        this.uiIntegration.showVirtualUserNotification(
            `Task initiated: ${description}`,
            'info'
        );
    }

    private async loadProjectGoals(): Promise<void> {
        const storagePath = this.context.globalStorageUri;
        const goalsFile = vscode.Uri.joinPath(storagePath, 'project-goals.json');
        
        try {
            const content = await vscode.workspace.fs.readFile(goalsFile);
            const data = JSON.parse(Buffer.from(content).toString('utf-8'));
            this.projectGoals = data.goals || [];
        } catch (error) {
            // Файл не существует, используем пустой массив
            this.projectGoals = [];
        }
    }

    private async saveProjectGoals(): Promise<void> {
        const storagePath = this.context.globalStorageUri;
        const goalsFile = vscode.Uri.joinPath(storagePath, 'project-goals.json');
        
        const data = {
            goals: this.projectGoals,
            lastUpdated: new Date().toISOString()
        };

        await vscode.workspace.fs.writeFile(
            goalsFile,
            Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
        );
    }

    isRunningState(): boolean {
        return this.isRunning;
    }

    dispose(): void {
        this.stop();
        this.monitor.dispose();
    }
}
