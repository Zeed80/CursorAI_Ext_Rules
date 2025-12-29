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
     */
    async makeDecision(proposal: Proposal): Promise<boolean> {
        console.log(`Virtual User: Making decision on proposal: ${proposal.title}`);

        // Анализ предложения
        const decision = await this.decisionMaker.analyzeProposal(proposal, this.projectGoals);

        if (decision.approved) {
            this.uiIntegration.showVirtualUserNotification(
                `Approved: ${proposal.title}`,
                'info'
            );
        } else {
            this.uiIntegration.showVirtualUserNotification(
                `Rejected: ${proposal.title}. Reason: ${decision.reason}`,
                'warning'
            );
        }

        return decision.approved;
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
