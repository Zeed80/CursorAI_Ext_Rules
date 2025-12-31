import * as vscode from 'vscode';
import { AgentSolution } from '../agents/local-agent';
import { FileChange } from '../agents/worker/mcp-client';

/**
 * Результат работы Composer
 */
export interface ComposerResult {
    success: boolean;
    filesChanged: string[];
    error?: string;
    message?: string;
}

/**
 * Интеграция с CursorAI Composer для безопасного изменения файлов
 * Использует Composer API для применения изменений с проверкой
 */
export class CursorComposerIntegration {
    /**
     * Применить изменения через CursorAI Composer
     */
    async applyChanges(
        solution: AgentSolution,
        description: string,
        autoApply: boolean = false
    ): Promise<ComposerResult> {
        // Проверяем настройки
        const config = vscode.workspace.getConfiguration('cursor-autonomous');
        const cursorIntegration = config.get('cursorIntegration', {
            useComposer: true,
            autoApplyComposer: false
        });
        
        if (!cursorIntegration.useComposer) {
            console.log('CursorComposerIntegration: disabled');
            return {
                success: false,
                filesChanged: [],
                message: 'CursorAI Composer integration disabled'
            };
        }
        
        // Используем настройку autoApply из конфигурации, если не передана явно
        const shouldAutoApply = autoApply || cursorIntegration.autoApplyComposer;
        
        console.log(`CursorComposerIntegration: Applying changes for solution ${solution.id}, autoApply=${shouldAutoApply}`);
        
        try {
            // Извлекаем изменения файлов из решения
            const fileChanges = this.extractFileChanges(solution);
            
            if (fileChanges.length === 0) {
                return {
                    success: true,
                    filesChanged: [],
                    message: 'No file changes to apply'
                };
            }
            
            // Открываем Composer с описанием изменений
            const result = await this.openComposer(
                description,
                fileChanges,
                autoApply
            );
            
            console.log(`CursorComposerIntegration: Changes ${result.success ? 'applied' : 'failed'}`);
            
            return result;
            
        } catch (error: any) {
            console.error('CursorComposerIntegration: Failed to apply changes:', error);
            
            return {
                success: false,
                filesChanged: [],
                error: error.message || 'Unknown error'
            };
        }
    }
    
    /**
     * Извлечь изменения файлов из решения
     */
    private extractFileChanges(solution: AgentSolution): FileChange[] {
        const changes: FileChange[] = [];
        
        // Извлекаем из solution.solution.codeChanges
        if (solution.solution.codeChanges) {
            for (const change of solution.solution.codeChanges) {
                const filePath = change.file;
                // Используем информацию из codeChanges
                changes.push({
                    type: change.type,
                    path: filePath,
                    content: change.description // Используем description как контент
                });
            }
        }
        
        return changes;
    }
    
    /**
     * Открыть Composer с изменениями
     */
    private async openComposer(
        description: string,
        fileChanges: FileChange[],
        autoApply: boolean
    ): Promise<ComposerResult> {
        // Пытаемся использовать команду Composer если доступна
        try {
            // Проверяем, есть ли команда Composer
            const composerCommand = 'cursor.composer';
            
            const commands = await vscode.commands.getCommands();
            if (commands.includes(composerCommand)) {
                // Вызываем Composer через команду
                await vscode.commands.executeCommand(composerCommand, {
                    description,
                    files: fileChanges.map(c => c.path),
                    autoApply
                });
                
                // Ждем завершения (примерное время)
                await this.sleep(2000);
                
                return {
                    success: true,
                    filesChanged: fileChanges.map(c => c.path),
                    message: 'Changes applied via Composer'
                };
            }
        } catch (error: any) {
            console.warn('CursorComposerIntegration: Composer command failed, using fallback:', error);
        }
        
        // Fallback: применяем изменения напрямую через VS Code API
        return await this.applyChangesDirect(fileChanges);
    }
    
    /**
     * Применить изменения напрямую (fallback)
     */
    private async applyChangesDirect(fileChanges: FileChange[]): Promise<ComposerResult> {
        const edit = new vscode.WorkspaceEdit();
        const filesChanged: string[] = [];
        
        for (const change of fileChanges) {
            try {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    throw new Error('No workspace folder found');
                }
                
                const uri = vscode.Uri.joinPath(workspaceFolder.uri, change.path);
                
                switch (change.type) {
                    case 'create':
                        if (change.content) {
                            edit.createFile(uri, { overwrite: false });
                            const buffer = Buffer.from(change.content, 'utf-8');
                            await vscode.workspace.fs.writeFile(uri, buffer);
                            filesChanged.push(change.path);
                        }
                        break;
                        
                    case 'modify':
                        if (change.content) {
                            const document = await vscode.workspace.openTextDocument(uri);
                            const fullRange = new vscode.Range(
                                document.positionAt(0),
                                document.positionAt(document.getText().length)
                            );
                            edit.replace(uri, fullRange, change.content);
                            filesChanged.push(change.path);
                        }
                        break;
                        
                    case 'delete':
                        edit.deleteFile(uri);
                        filesChanged.push(change.path);
                        break;
                }
            } catch (error: any) {
                console.error(`CursorComposerIntegration: Failed to apply change to ${change.path}:`, error);
            }
        }
        
        if (filesChanged.length > 0) {
            const success = await vscode.workspace.applyEdit(edit);
            
            return {
                success,
                filesChanged,
                message: success 
                    ? `Applied ${filesChanged.length} changes directly` 
                    : 'Failed to apply some changes'
            };
        }
        
        return {
            success: false,
            filesChanged: [],
            error: 'No changes to apply'
        };
    }
    
    /**
     * Рефакторинг через Composer
     */
    async refactorWithComposer(
        filePath: string,
        refactoringDescription: string
    ): Promise<ComposerResult> {
        console.log(`CursorComposerIntegration: Refactoring ${filePath}`);
        
        const description = `Рефакторинг файла ${filePath}: ${refactoringDescription}`;
        
        try {
            const composerCommand = 'cursor.composer';
            
            const commands = await vscode.commands.getCommands();
            if (commands.includes(composerCommand)) {
                await vscode.commands.executeCommand(composerCommand, {
                    description,
                    files: [filePath],
                    autoApply: false // Всегда требуем подтверждения для рефакторинга
                });
                
                await this.sleep(2000);
                
                return {
                    success: true,
                    filesChanged: [filePath],
                    message: 'Refactoring initiated via Composer'
                };
            }
            
            // Fallback: открываем файл и показываем сообщение
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const uri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
                await vscode.window.showTextDocument(uri);
                
                vscode.window.showInformationMessage(
                    `Рефакторинг ${filePath}: ${refactoringDescription}`,
                    'OK'
                );
            }
            
            return {
                success: false,
                filesChanged: [],
                message: 'Composer not available, file opened for manual refactoring'
            };
            
        } catch (error: any) {
            console.error('CursorComposerIntegration: Refactoring failed:', error);
            
            return {
                success: false,
                filesChanged: [],
                error: error.message
            };
        }
    }
    
    /**
     * Показать diff перед применением изменений
     */
    async showDiff(
        filePath: string,
        oldContent: string,
        newContent: string
    ): Promise<boolean> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return false;
            }
            
            // Создаем временные URI для diff
            const originalUri = vscode.Uri.parse(`untitled:${filePath}.original`);
            const modifiedUri = vscode.Uri.parse(`untitled:${filePath}.modified`);
            
            // Открываем diff
            await vscode.commands.executeCommand(
                'vscode.diff',
                originalUri,
                modifiedUri,
                `${filePath}: Original ↔ Modified`
            );
            
            // Спрашиваем пользователя
            const choice = await vscode.window.showInformationMessage(
                `Применить изменения в ${filePath}?`,
                'Применить',
                'Отменить'
            );
            
            return choice === 'Применить';
            
        } catch (error) {
            console.error('CursorComposerIntegration: Failed to show diff:', error);
            return false;
        }
    }
    
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
