import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface RuleVersion {
    version: string;
    rulePath: string;
    content: string;
    hash: string;
    timestamp: string;
    reason: string;
}

export interface VersionHistory {
    versions: RuleVersion[];
    currentVersion: string;
    lastUpdated: string;
}

export class RulesVersioning {
    private workspaceFolder: vscode.WorkspaceFolder | undefined;
    private versionsPath: string;
    private maxVersions: number = 10; // Максимальное количество версий для хранения

    constructor() {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.versionsPath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config', 'rules-versions')
            : '';
    }

    /**
     * Создание версии правила
     */
    async createVersion(rulePath: string, content: string, reason: string): Promise<RuleVersion> {
        const hash = this.calculateHash(content);
        const version = this.generateVersion();
        const timestamp = new Date().toISOString();

        const versionData: RuleVersion = {
            version,
            rulePath,
            content,
            hash,
            timestamp,
            reason
        };

        // Сохранение версии
        await this.saveVersion(versionData);

        // Обновление истории версий
        await this.updateVersionHistory(rulePath, versionData);

        console.log(`Version ${version} created for rule: ${rulePath}`);
        return versionData;
    }

    /**
     * Получение истории версий для правила
     */
    async getVersionHistory(rulePath: string): Promise<RuleVersion[]> {
        const historyFile = this.getHistoryFilePath(rulePath);
        
        if (!fs.existsSync(historyFile)) {
            return [];
        }

        try {
            const content = fs.readFileSync(historyFile, 'utf-8');
            const history: VersionHistory = JSON.parse(content);
            return history.versions || [];
        } catch (error) {
            console.error('Error loading version history:', error);
            return [];
        }
    }

    /**
     * Откат к предыдущей версии
     */
    async rollbackToVersion(rulePath: string, targetVersion: string): Promise<boolean> {
        const history = await this.getVersionHistory(rulePath);
        const targetVersionData = history.find(v => v.version === targetVersion);

        if (!targetVersionData) {
            throw new Error(`Version ${targetVersion} not found for rule: ${rulePath}`);
        }

        // Создание новой версии с контентом из целевой версии
        await this.createVersion(
            rulePath,
            targetVersionData.content,
            `Rollback to version ${targetVersion}`
        );

        // Восстановление файла правила
        const fullRulePath = this.getFullRulePath(rulePath);
        if (fullRulePath) {
            const dir = path.dirname(fullRulePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullRulePath, targetVersionData.content, 'utf-8');
        }

        console.log(`Rolled back rule ${rulePath} to version ${targetVersion}`);
        return true;
    }

    /**
     * Сравнение версий правила
     */
    async compareVersions(rulePath: string, version1: string, version2: string): Promise<{
        differences: string[];
        version1: RuleVersion | null;
        version2: RuleVersion | null;
    }> {
        const history = await this.getVersionHistory(rulePath);
        const v1 = history.find(v => v.version === version1);
        const v2 = history.find(v => v.version === version2);

        if (!v1 || !v2) {
            throw new Error('One or both versions not found');
        }

        const differences: string[] = [];
        
        // Простое сравнение (можно улучшить с помощью diff библиотеки)
        if (v1.content !== v2.content) {
            differences.push('Content changed');
        }
        if (v1.hash !== v2.hash) {
            differences.push('Hash changed');
        }

        return {
            differences,
            version1: v1,
            version2: v2
        };
    }

    /**
     * Получение текущей версии правила
     */
    async getCurrentVersion(rulePath: string): Promise<RuleVersion | null> {
        const history = await this.getVersionHistory(rulePath);
        if (history.length === 0) {
            return null;
        }

        // Последняя версия
        return history[history.length - 1];
    }

    /**
     * Удаление старых версий (очистка)
     */
    async cleanupOldVersions(rulePath: string): Promise<void> {
        const history = await this.getVersionHistory(rulePath);
        
        if (history.length <= this.maxVersions) {
            return;
        }

        // Удаление старых версий, оставляя только последние maxVersions
        const versionsToKeep = history.slice(-this.maxVersions);
        const historyFile = this.getHistoryFilePath(rulePath);

        const updatedHistory: VersionHistory = {
            versions: versionsToKeep,
            currentVersion: versionsToKeep[versionsToKeep.length - 1].version,
            lastUpdated: new Date().toISOString()
        };

        fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2), 'utf-8');
        
        console.log(`Cleaned up old versions for rule: ${rulePath}`);
    }

    /**
     * Сохранение версии
     */
    private async saveVersion(version: RuleVersion): Promise<void> {
        if (!this.versionsPath) {
            return;
        }

        const versionDir = path.join(this.versionsPath, this.sanitizePath(version.rulePath));
        if (!fs.existsSync(versionDir)) {
            fs.mkdirSync(versionDir, { recursive: true });
        }

        const versionFile = path.join(versionDir, `${version.version}.json`);
        fs.writeFileSync(versionFile, JSON.stringify(version, null, 2), 'utf-8');
    }

    /**
     * Обновление истории версий
     */
    private async updateVersionHistory(rulePath: string, version: RuleVersion): Promise<void> {
        const historyFile = this.getHistoryFilePath(rulePath);
        let history: VersionHistory;

        if (fs.existsSync(historyFile)) {
            try {
                const content = fs.readFileSync(historyFile, 'utf-8');
                history = JSON.parse(content);
            } catch (error) {
                history = { versions: [], currentVersion: '', lastUpdated: '' };
            }
        } else {
            history = { versions: [], currentVersion: '', lastUpdated: '' };
        }

        // Добавление новой версии
        history.versions.push(version);
        history.currentVersion = version.version;
        history.lastUpdated = new Date().toISOString();

        // Сохранение истории
        const dir = path.dirname(historyFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8');

        // Очистка старых версий
        await this.cleanupOldVersions(rulePath);
    }

    /**
     * Получение пути к файлу истории
     */
    private getHistoryFilePath(rulePath: string): string {
        if (!this.versionsPath) {
            return '';
        }

        const sanitizedPath = this.sanitizePath(rulePath);
        return path.join(this.versionsPath, `${sanitizedPath}-history.json`);
    }

    /**
     * Получение полного пути к правилу
     */
    private getFullRulePath(rulePath: string): string | null {
        if (!this.workspaceFolder) {
            return null;
        }

        // Если путь уже абсолютный
        if (path.isAbsolute(rulePath)) {
            return rulePath;
        }

        // Относительный путь от workspace
        return path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'rules', rulePath);
    }

    /**
     * Санитизация пути для использования в имени файла
     */
    private sanitizePath(filePath: string): string {
        return filePath.replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Вычисление хеша содержимого
     */
    private calculateHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Генерация версии
     */
    private generateVersion(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${random}`;
    }

    /**
     * Проверка изменений в правиле
     */
    async hasChanges(rulePath: string, newContent: string): Promise<boolean> {
        const currentVersion = await this.getCurrentVersion(rulePath);
        
        if (!currentVersion) {
            return true; // Нет версий, значит есть изменения
        }

        const newHash = this.calculateHash(newContent);
        return currentVersion.hash !== newHash;
    }
}
