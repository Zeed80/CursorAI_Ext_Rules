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
exports.RulesVersioning = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class RulesVersioning {
    constructor() {
        this.maxVersions = 10; // Максимальное количество версий для хранения
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.versionsPath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config', 'rules-versions')
            : '';
    }
    /**
     * Создание версии правила
     */
    async createVersion(rulePath, content, reason) {
        const hash = this.calculateHash(content);
        const version = this.generateVersion();
        const timestamp = new Date().toISOString();
        const versionData = {
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
    async getVersionHistory(rulePath) {
        const historyFile = this.getHistoryFilePath(rulePath);
        if (!fs.existsSync(historyFile)) {
            return [];
        }
        try {
            const content = fs.readFileSync(historyFile, 'utf-8');
            const history = JSON.parse(content);
            return history.versions || [];
        }
        catch (error) {
            console.error('Error loading version history:', error);
            return [];
        }
    }
    /**
     * Откат к предыдущей версии
     */
    async rollbackToVersion(rulePath, targetVersion) {
        const history = await this.getVersionHistory(rulePath);
        const targetVersionData = history.find(v => v.version === targetVersion);
        if (!targetVersionData) {
            throw new Error(`Version ${targetVersion} not found for rule: ${rulePath}`);
        }
        // Создание новой версии с контентом из целевой версии
        await this.createVersion(rulePath, targetVersionData.content, `Rollback to version ${targetVersion}`);
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
    async compareVersions(rulePath, version1, version2) {
        const history = await this.getVersionHistory(rulePath);
        const v1 = history.find(v => v.version === version1);
        const v2 = history.find(v => v.version === version2);
        if (!v1 || !v2) {
            throw new Error('One or both versions not found');
        }
        const differences = [];
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
    async getCurrentVersion(rulePath) {
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
    async cleanupOldVersions(rulePath) {
        const history = await this.getVersionHistory(rulePath);
        if (history.length <= this.maxVersions) {
            return;
        }
        // Удаление старых версий, оставляя только последние maxVersions
        const versionsToKeep = history.slice(-this.maxVersions);
        const historyFile = this.getHistoryFilePath(rulePath);
        const updatedHistory = {
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
    async saveVersion(version) {
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
    async updateVersionHistory(rulePath, version) {
        const historyFile = this.getHistoryFilePath(rulePath);
        let history;
        if (fs.existsSync(historyFile)) {
            try {
                const content = fs.readFileSync(historyFile, 'utf-8');
                history = JSON.parse(content);
            }
            catch (error) {
                history = { versions: [], currentVersion: '', lastUpdated: '' };
            }
        }
        else {
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
    getHistoryFilePath(rulePath) {
        if (!this.versionsPath) {
            return '';
        }
        const sanitizedPath = this.sanitizePath(rulePath);
        return path.join(this.versionsPath, `${sanitizedPath}-history.json`);
    }
    /**
     * Получение полного пути к правилу
     */
    getFullRulePath(rulePath) {
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
    sanitizePath(filePath) {
        return filePath.replace(/[^a-zA-Z0-9]/g, '_');
    }
    /**
     * Вычисление хеша содержимого
     */
    calculateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Генерация версии
     */
    generateVersion() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${random}`;
    }
    /**
     * Проверка изменений в правиле
     */
    async hasChanges(rulePath, newContent) {
        const currentVersion = await this.getCurrentVersion(rulePath);
        if (!currentVersion) {
            return true; // Нет версий, значит есть изменения
        }
        const newHash = this.calculateHash(newContent);
        return currentVersion.hash !== newHash;
    }
}
exports.RulesVersioning = RulesVersioning;
//# sourceMappingURL=rules-versioning.js.map