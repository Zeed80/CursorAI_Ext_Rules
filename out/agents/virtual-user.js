"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualUser = void 0;
const vscode = __importStar(require("vscode"));
const ui_integration_1 = require("../integration/ui-integration");
const virtual_user_monitor_1 = require("./virtual-user-monitor");
const virtual_user_decision_1 = require("./virtual-user-decision");
class VirtualUser {
    constructor(context, orchestrator, settingsManager) {
        this.isRunning = false;
        this.projectGoals = [];
        this.autonomousMode = true; // Автономный режим по умолчанию
        this.autoApproveThreshold = 0.8; // Порог автоодобрения
        this.requestConfirmationThreshold = 0.6; // Порог запроса подтверждения
        this.context = context;
        this.orchestrator = orchestrator;
        this.settingsManager = settingsManager;
        this.uiIntegration = new ui_integration_1.UIIntegration(context);
        this.monitor = new virtual_user_monitor_1.ProjectMonitor(context, settingsManager);
        this.decisionMaker = new virtual_user_decision_1.DecisionMaker(settingsManager);
        this.loadProjectGoals();
    }
    async start() {
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
    async stop() {
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
    async analyzeProject() {
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
    extractGoalsFromText(text) {
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
    async monitorProject() {
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
    async generateTasks(issues, improvements) {
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
    async consultWithAgents() {
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
    async makeDecision(proposal) {
        console.log(`Virtual User: Making decision on proposal: ${proposal.title}`);
        // Анализ предложения
        const decision = await this.decisionMaker.analyzeProposal(proposal, this.projectGoals);
        // В автономном режиме автоматически одобряем при высокой уверенности
        if (this.autonomousMode) {
            // Высокая уверенность (>autoApproveThreshold) - автоматически одобрить
            if (decision.confidence > this.autoApproveThreshold && decision.approved) {
                console.log(`Virtual User: Auto-approved (confidence: ${decision.confidence}): ${proposal.title}`);
                this.uiIntegration.showVirtualUserNotification(`✅ Автоматически одобрено: ${proposal.title} (уверенность: ${Math.round(decision.confidence * 100)}%)`, 'info');
                return true;
            }
            // Средняя уверенность (requestConfirmationThreshold - autoApproveThreshold) - запросить подтверждение
            if (decision.confidence > this.requestConfirmationThreshold && decision.approved) {
                console.log(`Virtual User: Requesting user confirmation (confidence: ${decision.confidence}): ${proposal.title}`);
                return await this.requestUserConfirmation(proposal, decision);
            }
            // Низкая уверенность (<60%) или не одобрено - автоматически отклонить
            console.log(`Virtual User: Auto-rejected (confidence: ${decision.confidence}): ${proposal.title}`);
            this.uiIntegration.showVirtualUserNotification(`❌ Автоматически отклонено: ${proposal.title} (уверенность: ${Math.round(decision.confidence * 100)}%)\nПричина: ${decision.reason}`, 'warning');
            return false;
        }
        // В ручном режиме всегда запрашиваем подтверждение
        return await this.requestUserConfirmation(proposal, decision);
    }
    /**
     * Запросить подтверждение пользователя
     */
    async requestUserConfirmation(proposal, decision) {
        const action = await vscode.window.showInformationMessage(`Предложение: ${proposal.title}\n` +
            `Уверенность: ${Math.round(decision.confidence * 100)}%\n` +
            `Файлы: ${proposal.files.length}\n` +
            `Преимущества: ${proposal.benefits.join(', ')}`, { modal: true }, 'Одобрить', 'Отклонить', 'Подробнее');
        if (action === 'Одобрить') {
            this.uiIntegration.showVirtualUserNotification(`Approved: ${proposal.title}`, 'info');
            return true;
        }
        else if (action === 'Подробнее') {
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
        }
        else {
            this.uiIntegration.showVirtualUserNotification(`Rejected: ${proposal.title}`, 'warning');
            return false;
        }
    }
    /**
     * Установить режим работы
     */
    setAutonomousMode(enabled) {
        this.autonomousMode = enabled;
        console.log(`Virtual User: Autonomous mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Получить текущий режим работы
     */
    isAutonomous() {
        return this.autonomousMode;
    }
    /**
     * Установить пороги уверенности
     */
    setConfidenceThresholds(autoApprove, requestConfirmation) {
        this.autoApproveThreshold = Math.max(0, Math.min(1, autoApprove));
        this.requestConfirmationThreshold = Math.max(0, Math.min(1, requestConfirmation));
        console.log(`Virtual User: Confidence thresholds updated - autoApprove: ${this.autoApproveThreshold}, requestConfirmation: ${this.requestConfirmationThreshold}`);
    }
    /**
     * Получить пороги уверенности
     */
    getConfidenceThresholds() {
        return {
            autoApprove: this.autoApproveThreshold,
            requestConfirmation: this.requestConfirmationThreshold
        };
    }
    /**
     * Инициация новой задачи
     */
    async initiateTask(description, priority = 'medium') {
        await this.orchestrator.createTask({
            type: 'feature',
            description,
            priority
        });
        this.uiIntegration.showVirtualUserNotification(`Task initiated: ${description}`, 'info');
    }
    async loadProjectGoals() {
        const storagePath = this.context.globalStorageUri;
        const goalsFile = vscode.Uri.joinPath(storagePath, 'project-goals.json');
        try {
            const content = await vscode.workspace.fs.readFile(goalsFile);
            const data = JSON.parse(Buffer.from(content).toString('utf-8'));
            this.projectGoals = data.goals || [];
        }
        catch (error) {
            // Файл не существует, используем пустой массив
            this.projectGoals = [];
        }
    }
    async saveProjectGoals() {
        const storagePath = this.context.globalStorageUri;
        const goalsFile = vscode.Uri.joinPath(storagePath, 'project-goals.json');
        const data = {
            goals: this.projectGoals,
            lastUpdated: new Date().toISOString()
        };
        await vscode.workspace.fs.writeFile(goalsFile, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));
    }
    isRunningState() {
        return this.isRunning;
    }
    dispose() {
        this.stop();
        this.monitor.dispose();
    }
}
exports.VirtualUser = VirtualUser;
//# sourceMappingURL=virtual-user.js.map