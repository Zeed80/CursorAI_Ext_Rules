import * as vscode from 'vscode';
import { Orchestrator } from '../orchestrator/orchestrator';
import { AnalyticsReport, TaskTypeStatistics, AgentTaskStatistics } from '../orchestrator/task-analytics';

export class AnalyticsPanel {
    private static currentPanel: AnalyticsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _orchestrator: Orchestrator;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        orchestrator: Orchestrator
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._orchestrator = orchestrator;

        // Обработка сообщений от webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        this.update();
                        return;
                    case 'exportReport':
                        this.exportReport();
                        return;
                }
            },
            null,
            this._disposables
        );

        // Обновление при изменении видимости
        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this.update();
                }
            },
            null,
            this._disposables
        );

        // Очистка при закрытии
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Первоначальная загрузка
        this.update();
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        orchestrator: Orchestrator
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Если панель уже открыта, показываем её
        if (AnalyticsPanel.currentPanel) {
            AnalyticsPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Создаем новую панель
        const panel = vscode.window.createWebviewPanel(
            'taskAnalytics',
            'Аналитика задач',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        AnalyticsPanel.currentPanel = new AnalyticsPanel(panel, extensionUri, orchestrator);
    }

    public static revive(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        orchestrator: Orchestrator
    ): void {
        AnalyticsPanel.currentPanel = new AnalyticsPanel(panel, extensionUri, orchestrator);
    }

    public dispose(): void {
        AnalyticsPanel.currentPanel = undefined;

        // Очистка ресурсов
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async update(): Promise<void> {
        const webview = this._panel.webview;
        const report = this._orchestrator.getAnalyticsReport();
        this._panel.webview.html = this.getHtmlForWebview(webview, report);
    }

    private async exportReport(): Promise<void> {
        const report = this._orchestrator.getAnalyticsReport();
        const reportText = this.formatReportAsText(report);

        // Сохранение в файл
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`analytics-report-${new Date().toISOString().split('T')[0]}.txt`),
            filters: {
                'Text files': ['txt'],
                'Markdown files': ['md']
            }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(
                uri,
                Buffer.from(reportText, 'utf-8')
            );
            vscode.window.showInformationMessage('Отчет сохранен');
        }
    }

    private formatReportAsText(report: AnalyticsReport): string {
        const lines: string[] = [];

        lines.push('='.repeat(60));
        lines.push('АНАЛИТИЧЕСКИЙ ОТЧЕТ ПО ЗАДАЧАМ');
        lines.push('='.repeat(60));
        lines.push('');
        lines.push(`Период: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}`);
        lines.push('');

        // Общая статистика
        lines.push('ОБЩАЯ СТАТИСТИКА');
        lines.push('-'.repeat(60));
        lines.push(`Всего задач: ${report.overall.totalTasks}`);
        lines.push(`Выполнено: ${report.overall.completedTasks}`);
        lines.push(`Неудачных: ${report.overall.failedTasks}`);
        lines.push(`Успешность: ${(report.overall.successRate * 100).toFixed(1)}%`);
        lines.push(`Среднее время выполнения: ${this.formatTime(report.overall.averageExecutionTime)}`);
        lines.push(`Общее время выполнения: ${this.formatTime(report.overall.totalExecutionTime)}`);
        lines.push('');

        // По типам
        lines.push('СТАТИСТИКА ПО ТИПАМ ЗАДАЧ');
        lines.push('-'.repeat(60));
        for (const stat of report.byType) {
            lines.push(`${stat.type}:`);
            lines.push(`  Всего: ${stat.total}, Выполнено: ${stat.completed}, Неудачных: ${stat.failed}`);
            lines.push(`  Успешность: ${(stat.successRate * 100).toFixed(1)}%`);
            lines.push(`  Среднее время: ${this.formatTime(stat.averageExecutionTime)}`);
            lines.push('');
        }

        // По агентам
        lines.push('СТАТИСТИКА ПО АГЕНТАМ');
        lines.push('-'.repeat(60));
        for (const stat of report.byAgent) {
            lines.push(`${stat.agentName}:`);
            lines.push(`  Всего задач: ${stat.totalTasks}`);
            lines.push(`  Выполнено: ${stat.completedTasks}, Неудачных: ${stat.failedTasks}`);
            lines.push(`  Успешность: ${(stat.successRate * 100).toFixed(1)}%`);
            lines.push(`  Среднее время: ${this.formatTime(stat.averageExecutionTime)}`);
            lines.push('');
        }

        // Рекомендации
        lines.push('РЕКОМЕНДАЦИИ');
        lines.push('-'.repeat(60));
        for (const rec of report.recommendations) {
            lines.push(`• ${rec}`);
        }

        return lines.join('\n');
    }

    private formatTime(ms: number): string {
        if (ms < 1000) return `${Math.round(ms)} мс`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)} сек`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(1)} мин`;
        return `${(ms / 3600000).toFixed(1)} ч`;
    }

    private getHtmlForWebview(webview: vscode.Webview, report: AnalyticsReport): string {
        return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Аналитика задач</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
            color: var(--vscode-textLink-foreground);
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.8;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .table th,
        .table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .table th {
            background: var(--vscode-list-inactiveSelectionBackground);
            font-weight: bold;
        }
        .table tr:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .badge-success {
            background: var(--vscode-testing-iconPassed);
            color: white;
        }
        .badge-warning {
            background: var(--vscode-testing-iconQueued);
            color: white;
        }
        .badge-error {
            background: var(--vscode-testing-iconFailed);
            color: white;
        }
        .recommendations {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin-top: 20px;
        }
        .recommendations ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin: 8px 0;
        }
        .btn {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Аналитика задач</h1>
        <div>
            <button class="btn btn-secondary" id="btnRefresh">Обновить</button>
            <button class="btn" id="btnExportReport">Экспорт отчета</button>
        </div>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-label">Всего задач</div>
            <div class="stat-value">${report.overall.totalTasks}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Выполнено</div>
            <div class="stat-value">${report.overall.completedTasks}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Успешность</div>
            <div class="stat-value">${(report.overall.successRate * 100).toFixed(1)}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Среднее время</div>
            <div class="stat-value">${this.formatTime(report.overall.averageExecutionTime)}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📋 Статистика по типам задач</div>
        <table class="table">
            <thead>
                <tr>
                    <th>Тип</th>
                    <th>Всего</th>
                    <th>Выполнено</th>
                    <th>Неудачных</th>
                    <th>Успешность</th>
                    <th>Среднее время</th>
                </tr>
            </thead>
            <tbody>
                ${report.byType.map(stat => `
                <tr>
                    <td><strong>${stat.type}</strong></td>
                    <td>${stat.total}</td>
                    <td>${stat.completed}</td>
                    <td>${stat.failed}</td>
                    <td>
                        <span class="badge ${stat.successRate >= 0.7 ? 'badge-success' : stat.successRate >= 0.5 ? 'badge-warning' : 'badge-error'}">
                            ${(stat.successRate * 100).toFixed(1)}%
                        </span>
                    </td>
                    <td>${this.formatTime(stat.averageExecutionTime)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">👥 Статистика по агентам</div>
        <table class="table">
            <thead>
                <tr>
                    <th>Агент</th>
                    <th>Всего задач</th>
                    <th>Выполнено</th>
                    <th>Неудачных</th>
                    <th>Успешность</th>
                    <th>Среднее время</th>
                </tr>
            </thead>
            <tbody>
                ${report.byAgent.map(stat => `
                <tr>
                    <td><strong>${stat.agentName}</strong></td>
                    <td>${stat.totalTasks}</td>
                    <td>${stat.completedTasks}</td>
                    <td>${stat.failedTasks}</td>
                    <td>
                        <span class="badge ${stat.successRate >= 0.7 ? 'badge-success' : stat.successRate >= 0.5 ? 'badge-warning' : 'badge-error'}">
                            ${(stat.successRate * 100).toFixed(1)}%
                        </span>
                    </td>
                    <td>${this.formatTime(stat.averageExecutionTime)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">⚡ Статистика по приоритетам</div>
        <table class="table">
            <thead>
                <tr>
                    <th>Приоритет</th>
                    <th>Всего</th>
                    <th>Среднее время</th>
                    <th>Успешность</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Высокий</strong></td>
                    <td>${report.byPriority.high.total}</td>
                    <td>${this.formatTime(report.byPriority.high.averageTime)}</td>
                    <td>
                        <span class="badge ${report.byPriority.high.successRate >= 0.7 ? 'badge-success' : 'badge-warning'}">
                            ${(report.byPriority.high.successRate * 100).toFixed(1)}%
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Средний</strong></td>
                    <td>${report.byPriority.medium.total}</td>
                    <td>${this.formatTime(report.byPriority.medium.averageTime)}</td>
                    <td>
                        <span class="badge ${report.byPriority.medium.successRate >= 0.7 ? 'badge-success' : 'badge-warning'}">
                            ${(report.byPriority.medium.successRate * 100).toFixed(1)}%
                        </span>
                    </td>
                </tr>
                <tr>
                    <td><strong>Низкий</strong></td>
                    <td>${report.byPriority.low.total}</td>
                    <td>${this.formatTime(report.byPriority.low.averageTime)}</td>
                    <td>
                        <span class="badge ${report.byPriority.low.successRate >= 0.7 ? 'badge-success' : 'badge-warning'}">
                            ${(report.byPriority.low.successRate * 100).toFixed(1)}%
                        </span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="recommendations">
        <div class="section-title">💡 Рекомендации</div>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function exportReport() {
            vscode.postMessage({ command: 'exportReport' });
        }

        // Автообновление каждые 10 секунд
        let refreshInterval = null;

        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('btnRefresh')?.addEventListener('click', refresh);
            document.getElementById('btnExportReport')?.addEventListener('click', exportReport);

            // Автообновление каждые 10 секунд
            refreshInterval = setInterval(refresh, 10000);
        });
    </script>
</body>
</html>`;
    }
}
