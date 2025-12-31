import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Изменение файла
 */
export interface FileChange {
    type: 'create' | 'modify' | 'delete';
    path: string;
    content?: string;
    oldContent?: string;
}

/**
 * Результат поиска по коду
 */
export interface SearchResult {
    file: string;
    line: number;
    column: number;
    text: string;
    context: string[];
}

/**
 * Информация о файле
 */
export interface FileInfo {
    path: string;
    size: number;
    modified: Date;
    isDirectory: boolean;
}

/**
 * MCP Client для агентов
 * Предоставляет доступ к файлам, git, поиску через единый интерфейс
 */
export class MCPClient {
    private workspaceRoot: vscode.Uri | null = null;
    
    constructor() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.workspaceRoot = workspaceFolders[0].uri;
        }
    }
    
    /**
     * Получить корневую папку workspace
     */
    private getWorkspaceRoot(): vscode.Uri {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder found');
        }
        return this.workspaceRoot;
    }
    
    /**
     * Преобразовать относительный путь в абсолютный Uri
     */
    private resolveUri(relativePath: string): vscode.Uri {
        const root = this.getWorkspaceRoot();
        return vscode.Uri.joinPath(root, relativePath);
    }
    
    // ==================== ФАЙЛОВЫЕ ОПЕРАЦИИ ====================
    
    /**
     * Список всех файлов проекта
     */
    async listFiles(pattern?: string, exclude?: string): Promise<string[]> {
        const root = this.getWorkspaceRoot();
        const searchPattern = pattern || '**/*';
        const excludePattern = exclude || '**/node_modules/**';
        
        const files = await vscode.workspace.findFiles(searchPattern, excludePattern);
        
        return files.map(file => vscode.workspace.asRelativePath(file));
    }
    
    /**
     * Получить информацию о файле
     */
    async getFileInfo(filePath: string): Promise<FileInfo> {
        const uri = this.resolveUri(filePath);
        
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            
            return {
                path: filePath,
                size: stat.size,
                modified: new Date(stat.mtime),
                isDirectory: stat.type === vscode.FileType.Directory
            };
        } catch (error) {
            throw new Error(`File not found: ${filePath}`);
        }
    }
    
    /**
     * Чтение файла
     */
    async readFile(filePath: string): Promise<string> {
        const uri = this.resolveUri(filePath);
        
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            return Buffer.from(content).toString('utf-8');
        } catch (error) {
            throw new Error(`Failed to read file: ${filePath}`);
        }
    }
    
    /**
     * Создание файла
     */
    async createFile(filePath: string, content: string): Promise<void> {
        const uri = this.resolveUri(filePath);
        
        // Создаем директории если нужно
        const dirPath = path.dirname(filePath);
        if (dirPath !== '.') {
            await this.createDirectory(dirPath);
        }
        
        const buffer = Buffer.from(content, 'utf-8');
        await vscode.workspace.fs.writeFile(uri, buffer);
        
        console.log(`MCPClient: Created file ${filePath}`);
    }
    
    /**
     * Модификация файла
     */
    async modifyFile(filePath: string, content: string): Promise<void> {
        const uri = this.resolveUri(filePath);
        
        // Проверяем существование файла
        try {
            await vscode.workspace.fs.stat(uri);
        } catch (error) {
            throw new Error(`File does not exist: ${filePath}`);
        }
        
        const buffer = Buffer.from(content, 'utf-8');
        await vscode.workspace.fs.writeFile(uri, buffer);
        
        console.log(`MCPClient: Modified file ${filePath}`);
    }
    
    /**
     * Удаление файла
     */
    async deleteFile(filePath: string): Promise<void> {
        const uri = this.resolveUri(filePath);
        
        await vscode.workspace.fs.delete(uri);
        
        console.log(`MCPClient: Deleted file ${filePath}`);
    }
    
    /**
     * Создание директории
     */
    async createDirectory(dirPath: string): Promise<void> {
        const uri = this.resolveUri(dirPath);
        
        try {
            await vscode.workspace.fs.createDirectory(uri);
            console.log(`MCPClient: Created directory ${dirPath}`);
        } catch (error) {
            // Директория уже существует - это нормально
        }
    }
    
    /**
     * Применить множественные изменения файлов
     */
    async applyChanges(changes: FileChange[]): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        
        for (const change of changes) {
            const uri = this.resolveUri(change.path);
            
            switch (change.type) {
                case 'create':
                    if (change.content) {
                        edit.createFile(uri, { overwrite: false });
                        const buffer = Buffer.from(change.content, 'utf-8');
                        edit.insert(uri, new vscode.Position(0, 0), change.content);
                    }
                    break;
                    
                case 'modify':
                    if (change.content) {
                        // Читаем текущий файл
                        const document = await vscode.workspace.openTextDocument(uri);
                        const fullRange = new vscode.Range(
                            document.positionAt(0),
                            document.positionAt(document.getText().length)
                        );
                        edit.replace(uri, fullRange, change.content);
                    }
                    break;
                    
                case 'delete':
                    edit.deleteFile(uri);
                    break;
            }
        }
        
        const success = await vscode.workspace.applyEdit(edit);
        
        if (!success) {
            throw new Error('Failed to apply workspace edits');
        }
        
        console.log(`MCPClient: Applied ${changes.length} changes`);
    }
    
    // ==================== ПОИСК ПО КОДУ ====================
    
    /**
     * Поиск по содержимому файлов
     */
    async searchCode(query: string, filePattern?: string): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const root = this.getWorkspaceRoot();
        
        const files = await this.listFiles(filePattern);
        
        for (const file of files) {
            try {
                const content = await this.readFile(file);
                const lines = content.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const index = line.toLowerCase().indexOf(query.toLowerCase());
                    
                    if (index !== -1) {
                        // Получаем контекст (3 строки до и после)
                        const context = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4));
                        
                        results.push({
                            file,
                            line: i + 1,
                            column: index + 1,
                            text: line.trim(),
                            context
                        });
                    }
                }
            } catch (error) {
                // Пропускаем файлы с ошибками чтения
            }
        }
        
        return results;
    }
    
    /**
     * Найти все использования символа/функции
     */
    async findReferences(symbol: string, filePattern?: string): Promise<SearchResult[]> {
        // Простая реализация через поиск
        // В будущем можно использовать VS Code Language Server
        return await this.searchCode(symbol, filePattern);
    }
    
    /**
     * Найти определение символа
     */
    async findDefinition(symbol: string, filePattern?: string): Promise<SearchResult | null> {
        const patterns = [
            `function ${symbol}`,
            `const ${symbol}`,
            `let ${symbol}`,
            `var ${symbol}`,
            `class ${symbol}`,
            `interface ${symbol}`,
            `type ${symbol}`,
            `export ${symbol}`
        ];
        
        for (const pattern of patterns) {
            const results = await this.searchCode(pattern, filePattern);
            if (results.length > 0) {
                return results[0];
            }
        }
        
        return null;
    }
    
    // ==================== GIT ОПЕРАЦИИ ====================
    
    /**
     * Получить git extension
     */
    private getGitExtension(): any {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            throw new Error('Git extension not found');
        }
        
        const git = gitExtension.exports.getAPI(1);
        return git;
    }
    
    /**
     * Получить текущий репозиторий
     */
    private getRepository(): any {
        const git = this.getGitExtension();
        const repositories = git.repositories;
        
        if (repositories.length === 0) {
            throw new Error('No git repository found');
        }
        
        return repositories[0];
    }
    
    // ==================== РАСШИРЕННЫЕ GIT ОПЕРАЦИИ ====================
    
    /**
     * Создать новую ветку
     */
    async gitCreateBranch(branchName: string, checkout: boolean = true): Promise<void> {
        try {
            const repo = this.getRepository();
            await repo.createBranch(branchName, checkout);
            console.log(`MCPClient: Created branch ${branchName}${checkout ? ' and checked out' : ''}`);
        } catch (error) {
            throw new Error(`Failed to create branch: ${error}`);
        }
    }
    
    /**
     * Переключиться на ветку
     */
    async gitCheckout(branchName: string): Promise<void> {
        try {
            const repo = this.getRepository();
            await repo.checkout(branchName);
            console.log(`MCPClient: Checked out branch ${branchName}`);
        } catch (error) {
            throw new Error(`Failed to checkout branch: ${error}`);
        }
    }
    
    /**
     * Список веток
     */
    async gitListBranches(): Promise<Array<{ name: string; current: boolean }>> {
        try {
            const repo = this.getRepository();
            const refs = await repo.getRefs();
            const currentBranch = repo.state.HEAD?.name;
            
            return refs
                .filter((ref: any) => ref.name?.startsWith('refs/heads/'))
                .map((ref: any) => ({
                    name: ref.name.replace('refs/heads/', ''),
                    current: ref.name.replace('refs/heads/', '') === currentBranch
                }));
        } catch (error) {
            return [];
        }
    }
    
    /**
     * Stash изменений
     */
    async gitStash(message?: string): Promise<void> {
        try {
            const repo = this.getRepository();
            await repo.createStash(message);
            console.log(`MCPClient: Stashed changes${message ? `: ${message}` : ''}`);
        } catch (error) {
            throw new Error(`Failed to stash: ${error}`);
        }
    }
    
    /**
     * Pop stash
     */
    async gitStashPop(): Promise<void> {
        try {
            const repo = this.getRepository();
            await repo.popStash();
            console.log('MCPClient: Popped stash');
        } catch (error) {
            throw new Error(`Failed to pop stash: ${error}`);
        }
    }
    
    // ==================== ТЕСТИРОВАНИЕ ====================
    
    /**
     * Запустить тесты (поддержка разных тестовых фреймворков)
     */
    async runTests(pattern?: string): Promise<{
        success: boolean;
        passed: number;
        failed: number;
        output: string;
    }> {
        const root = this.getWorkspaceRoot();
        
        // Определяем тестовый фреймворк
        const packageJsonPath = vscode.Uri.joinPath(root, 'package.json');
        
        try {
            const packageJson = await this.readFile('package.json');
            const pkg = JSON.parse(packageJson);
            
            let testCommand = 'npm test';
            
            // Определяем команду тестирования
            if (pkg.scripts?.test) {
                testCommand = 'npm test';
            } else if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
                testCommand = pattern ? `npx jest ${pattern}` : 'npx jest';
            } else if (pkg.devDependencies?.mocha || pkg.dependencies?.mocha) {
                testCommand = pattern ? `npx mocha ${pattern}` : 'npx mocha';
            } else if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
                testCommand = pattern ? `npx vitest run ${pattern}` : 'npx vitest run';
            }
            
            // Запускаем тесты через терминал (но не через этот метод)
            // Возвращаем информацию о том, что нужно запустить
            return {
                success: false,
                passed: 0,
                failed: 0,
                output: `Please run: ${testCommand}`
            };
            
        } catch (error) {
            return {
                success: false,
                passed: 0,
                failed: 0,
                output: 'No test configuration found'
            };
        }
    }
    
    /**
     * Проверить наличие тестов для файла
     */
    async hasTests(filePath: string): Promise<boolean> {
        const testPatterns = [
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1'),
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.spec.$1'),
            filePath.replace(/src\//, 'test/').replace(/\.(ts|js|tsx|jsx)$/, '.test.$1'),
            filePath.replace(/src\//, '__tests__/').replace(/\.(ts|js|tsx|jsx)$/, '.test.$1')
        ];
        
        for (const pattern of testPatterns) {
            if (await this.fileExists(pattern)) {
                return true;
            }
        }
        
        return false;
    }
    
    // ==================== ЛИНТИНГ ====================
    
    /**
     * Запустить линтер
     */
    async runLinter(filePath?: string): Promise<{
        success: boolean;
        errors: number;
        warnings: number;
        output: string;
    }> {
        // Используем встроенную диагностику VS Code
        const diagnostics = vscode.languages.getDiagnostics();
        
        let errors = 0;
        let warnings = 0;
        let output = '';
        
        for (const [uri, diags] of diagnostics) {
            if (filePath && !uri.fsPath.includes(filePath)) {
                continue;
            }
            
            for (const diag of diags) {
                if (diag.severity === vscode.DiagnosticSeverity.Error) {
                    errors++;
                } else if (diag.severity === vscode.DiagnosticSeverity.Warning) {
                    warnings++;
                }
                
                output += `${vscode.workspace.asRelativePath(uri)}:${diag.range.start.line + 1}:${diag.range.start.character + 1} - ${diag.message}\n`;
            }
        }
        
        return {
            success: errors === 0,
            errors,
            warnings,
            output
        };
    }
    
    /**
     * Получить статус git
     */
    async getGitStatus(): Promise<{
        branch: string;
        changes: number;
        ahead: number;
        behind: number;
    }> {
        try {
            const repo = this.getRepository();
            const head = repo.state.HEAD;
            
            return {
                branch: head?.name || 'unknown',
                changes: repo.state.workingTreeChanges.length,
                ahead: head?.ahead || 0,
                behind: head?.behind || 0
            };
        } catch (error) {
            return {
                branch: 'unknown',
                changes: 0,
                ahead: 0,
                behind: 0
            };
        }
    }
    
    /**
     * Commit изменений
     */
    async gitCommit(message: string): Promise<void> {
        try {
            const repo = this.getRepository();
            await repo.add([]);  // Stage all changes
            await repo.commit(message);
            console.log(`MCPClient: Committed changes: ${message}`);
        } catch (error) {
            throw new Error(`Git commit failed: ${error}`);
        }
    }
    
    /**
     * Получить diff для файла
     */
    async getFileDiff(filePath: string): Promise<string> {
        try {
            const repo = this.getRepository();
            const uri = this.resolveUri(filePath);
            
            // Получаем diff через git
            const diff = await repo.diffWithHEAD(uri.fsPath);
            return diff || '';
        } catch (error) {
            return '';
        }
    }
    
    // ==================== УТИЛИТЫ ====================
    
    /**
     * Открыть файл в редакторе
     */
    async openFile(filePath: string, line?: number): Promise<void> {
        const uri = this.resolveUri(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        
        if (line !== undefined && line > 0) {
            const position = new vscode.Position(line - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
    }
    
    /**
     * Получить текущий открытый файл
     */
    getCurrentFile(): string | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }
        
        return vscode.workspace.asRelativePath(editor.document.uri);
    }
    
    /**
     * Получить выделенный текст
     */
    getSelectedText(): string | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }
        
        const selection = editor.selection;
        if (selection.isEmpty) {
            return null;
        }
        
        return editor.document.getText(selection);
    }
    
    /**
     * Проверить существование файла
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            await this.getFileInfo(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Получить расширение файла
     */
    getFileExtension(filePath: string): string {
        return path.extname(filePath).toLowerCase();
    }
    
    /**
     * Определить тип файла по расширению
     */
    getFileType(filePath: string): string {
        const ext = this.getFileExtension(filePath);
        
        const typeMap: Record<string, string> = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.py': 'python',
            '.php': 'php',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.rb': 'ruby',
            '.md': 'markdown',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.sql': 'sql'
        };
        
        return typeMap[ext] || 'unknown';
    }
}
