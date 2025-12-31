import * as vscode from 'vscode';
import { MessageBus, MessageType } from '../agents/worker/message-bus';
import { EventEmitter } from 'events';

/**
 * Событие изменения файла
 */
export interface FileChangeEvent {
    type: 'created' | 'changed' | 'deleted';
    file: string;
    timestamp: Date;
}

/**
 * Real-time мониторинг файлов проекта
 * Заменяет периодический мониторинг через setInterval
 */
export class FileWatcher extends EventEmitter {
    private watchers: vscode.FileSystemWatcher[] = [];
    private messageBus: MessageBus;
    private isRunning: boolean = false;
    private changeBuffer: FileChangeEvent[] = [];
    private debounceTimer?: NodeJS.Timeout;
    private debounceDelay: number = 1000; // 1 секунда
    
    constructor(messageBus: MessageBus) {
        super();
        this.messageBus = messageBus;
    }
    
    /**
     * Запуск мониторинга
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('FileWatcher: Already running');
            return;
        }
        
        this.isRunning = true;
        
        // Создаем watchers для разных типов файлов
        await this.createWatchers();
        
        console.log('FileWatcher: Started monitoring files');
    }
    
    /**
     * Остановка мониторинга
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        
        // Останавливаем все watchers
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];
        
        // Очищаем debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        console.log('FileWatcher: Stopped');
    }
    
    /**
     * Создать watchers для файлов
     */
    private async createWatchers(): Promise<void> {
        // Паттерны для мониторинга
        const patterns = [
            '**/*.{ts,tsx,js,jsx}',  // TypeScript/JavaScript
            '**/*.{php,py,java,go}',  // Backend языки
            '**/*.{html,css,scss}',  // Frontend
            '**/*.{json,yaml,yml}',  // Конфигурация
            '**/*.md'                // Документация
        ];
        
        for (const pattern of patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);
            
            // Создание файла
            watcher.onDidCreate(uri => {
                this.handleFileChange({
                    type: 'created',
                    file: vscode.workspace.asRelativePath(uri),
                    timestamp: new Date()
                });
            });
            
            // Изменение файла
            watcher.onDidChange(uri => {
                this.handleFileChange({
                    type: 'changed',
                    file: vscode.workspace.asRelativePath(uri),
                    timestamp: new Date()
                });
            });
            
            // Удаление файла
            watcher.onDidDelete(uri => {
                this.handleFileChange({
                    type: 'deleted',
                    file: vscode.workspace.asRelativePath(uri),
                    timestamp: new Date()
                });
            });
            
            this.watchers.push(watcher);
        }
    }
    
    /**
     * Обработка изменения файла
     */
    private handleFileChange(event: FileChangeEvent): void {
        if (!this.isRunning) return;
        
        // Игнорируем файлы node_modules и другие
        if (this.shouldIgnore(event.file)) {
            return;
        }
        
        // Добавляем в буфер
        this.changeBuffer.push(event);
        
        // Debounce: ждем, пока не перестанут приходить изменения
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.processBufferedChanges();
        }, this.debounceDelay);
    }
    
    /**
     * Обработать накопленные изменения
     */
    private async processBufferedChanges(): Promise<void> {
        if (this.changeBuffer.length === 0) return;
        
        const changes = [...this.changeBuffer];
        this.changeBuffer = [];
        
        console.log(`FileWatcher: Processing ${changes.length} file changes`);
        
        // Группируем изменения по типам
        const grouped = this.groupChangesByType(changes);
        
        // Отправляем события в MessageBus
        for (const [type, files] of Object.entries(grouped)) {
            await this.messageBus.publish({
                type: MessageType.FILE_CHANGED,
                from: 'file-watcher',
                payload: {
                    changeType: type,
                    files,
                    timestamp: new Date()
                }
            });
        }
        
        // Отправляем event для локальных подписчиков
        this.emit('files:changed', changes);
    }
    
    /**
     * Группировать изменения по типам
     */
    private groupChangesByType(changes: FileChangeEvent[]): Record<string, string[]> {
        const grouped: Record<string, string[]> = {
            created: [],
            changed: [],
            deleted: []
        };
        
        for (const change of changes) {
            grouped[change.type].push(change.file);
        }
        
        return grouped;
    }
    
    /**
     * Проверить, нужно ли игнорировать файл
     */
    private shouldIgnore(file: string): boolean {
        const ignorePatterns = [
            'node_modules/',
            '.git/',
            'out/',
            'dist/',
            'build/',
            '.vscode/',
            '.cursor/',
            '__pycache__/',
            '.pytest_cache/',
            'coverage/',
            '.nyc_output/'
        ];
        
        for (const pattern of ignorePatterns) {
            if (file.includes(pattern)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Получить статистику
     */
    getStatistics() {
        return {
            watchers: this.watchers.length,
            buffered: this.changeBuffer.length,
            isRunning: this.isRunning
        };
    }
}
