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
exports.ProjectDependencyGraph = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Карта зависимостей проекта
 * Анализирует зависимости между файлами и предоставляет быстрый доступ к информации
 */
class ProjectDependencyGraph {
    constructor() {
        this.graph = null;
        this.parseCache = new Map();
        this.CACHE_TTL = 60000; // 1 минута
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.graphPath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config', 'project-dependencies.json')
            : '';
    }
    /**
     * Инициализация графа зависимостей
     */
    async initialize() {
        // Загружаем существующий граф или создаем новый
        await this.loadGraph();
        // Настраиваем file watcher для автоматического обновления
        this.setupFileWatcher();
        // Если граф пустой или устарел, строим заново
        if (!this.graph || this.isGraphOutdated()) {
            await this.buildGraph();
        }
    }
    /**
     * Построение графа зависимостей
     */
    async buildGraph() {
        if (!this.workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        console.log('Building dependency graph...');
        const startTime = Date.now();
        const workspacePath = this.workspaceFolder.uri.fsPath;
        const files = await this.findSourceFiles(workspacePath);
        const graph = {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            files: {},
            indexes: {
                byExport: {},
                byImport: {}
            }
        };
        // Парсим каждый файл
        for (const file of files) {
            try {
                const fileInfo = await this.parseFile(file, workspacePath);
                if (fileInfo) {
                    graph.files[file] = fileInfo;
                    this.updateIndexes(graph, file, fileInfo);
                }
            }
            catch (error) {
                console.error(`Error parsing file ${file}:`, error);
            }
        }
        // Строим обратные зависимости (dependents)
        this.buildDependents(graph);
        this.graph = graph;
        await this.saveGraph();
        const elapsed = Date.now() - startTime;
        console.log(`Dependency graph built in ${elapsed}ms (${files.length} files)`);
    }
    /**
     * Получение зависимостей файла
     */
    getDependencies(filePath) {
        if (!this.graph) {
            return null;
        }
        const relativePath = this.getRelativePath(filePath);
        const fileInfo = this.graph.files[relativePath];
        if (!fileInfo) {
            return null;
        }
        return {
            file: relativePath,
            exports: fileInfo.exports,
            imports: fileInfo.imports,
            dependencies: fileInfo.dependencies,
            dependents: fileInfo.dependents
        };
    }
    /**
     * Получение файлов, зависящих от данного файла
     */
    getDependents(filePath) {
        if (!this.graph) {
            return [];
        }
        const relativePath = this.getRelativePath(filePath);
        const fileInfo = this.graph.files[relativePath];
        return fileInfo ? fileInfo.dependents : [];
    }
    /**
     * Анализ влияния изменений
     */
    getImpactAnalysis(changes) {
        if (!this.graph) {
            return {
                directlyAffected: [],
                indirectlyAffected: [],
                totalAffected: 0,
                impactLevel: 'low',
                risks: []
            };
        }
        const directlyAffected = new Set();
        const indirectlyAffected = new Set();
        const risks = [];
        for (const change of changes) {
            const relativePath = this.getRelativePath(change.file);
            const fileInfo = this.graph.files[relativePath];
            if (change.type === 'delete' && fileInfo) {
                // Удаление файла влияет на все файлы, которые его импортируют
                fileInfo.dependents.forEach(dep => directlyAffected.add(dep));
                risks.push(`Удаление файла ${relativePath} может сломать зависимости`);
            }
            else if (change.type === 'modify' && fileInfo) {
                // Изменение файла влияет на все файлы, которые его импортируют
                fileInfo.dependents.forEach(dep => directlyAffected.add(dep));
                // Если изменяются экспорты, это критично
                if (fileInfo.exports.length > 0) {
                    risks.push(`Изменение экспортов в ${relativePath} может сломать зависимости`);
                }
            }
            else if (change.type === 'create') {
                // Новый файл может добавлять новые зависимости
                directlyAffected.add(relativePath);
            }
        }
        // Находим косвенно затронутые файлы
        directlyAffected.forEach(file => {
            const fileInfo = this.graph.files[file];
            if (fileInfo) {
                fileInfo.dependents.forEach(dep => indirectlyAffected.add(dep));
            }
        });
        // Определяем уровень влияния
        const totalAffected = directlyAffected.size + indirectlyAffected.size;
        let impactLevel = 'low';
        if (totalAffected > 20) {
            impactLevel = 'high';
        }
        else if (totalAffected > 5) {
            impactLevel = 'medium';
        }
        return {
            directlyAffected: Array.from(directlyAffected),
            indirectlyAffected: Array.from(indirectlyAffected),
            totalAffected,
            impactLevel,
            risks
        };
    }
    /**
     * Поиск связанных файлов
     */
    findRelatedFiles(filePath, depth = 1) {
        if (!this.graph || depth <= 0) {
            return [];
        }
        const related = new Set();
        const relativePath = this.getRelativePath(filePath);
        const fileInfo = this.graph.files[relativePath];
        if (!fileInfo) {
            return [];
        }
        // Добавляем зависимости
        fileInfo.imports.forEach(imp => {
            related.add(imp);
            if (depth > 1) {
                this.findRelatedFiles(imp, depth - 1).forEach(f => related.add(f));
            }
        });
        // Добавляем зависимые файлы
        fileInfo.dependents.forEach(dep => {
            related.add(dep);
            if (depth > 1) {
                this.findRelatedFiles(dep, depth - 1).forEach(f => related.add(f));
            }
        });
        return Array.from(related);
    }
    /**
     * Инкрементальное обновление графа (только для измененных файлов)
     */
    async updateFile(filePath) {
        if (!this.workspaceFolder || !this.graph) {
            return;
        }
        const relativePath = this.getRelativePath(filePath);
        const workspacePath = this.workspaceFolder.uri.fsPath;
        try {
            const fileInfo = await this.parseFile(relativePath, workspacePath);
            if (fileInfo) {
                // Удаляем старые индексы
                this.removeFromIndexes(this.graph, relativePath, this.graph.files[relativePath]);
                // Обновляем информацию о файле
                this.graph.files[relativePath] = fileInfo;
                this.updateIndexes(this.graph, relativePath, fileInfo);
                // Перестраиваем dependents
                this.buildDependents(this.graph);
                this.graph.lastUpdated = new Date().toISOString();
                await this.saveGraph();
            }
        }
        catch (error) {
            console.error(`Error updating file ${relativePath}:`, error);
        }
    }
    /**
     * Поиск исходных файлов в проекте
     */
    async findSourceFiles(workspacePath) {
        const files = [];
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        const walkDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                // Пропускаем node_modules, .git, .cursor и другие служебные директории
                if (entry.isDirectory()) {
                    if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'out') {
                        walkDir(fullPath);
                    }
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext)) {
                        const relativePath = path.relative(workspacePath, fullPath).replace(/\\/g, '/');
                        files.push(relativePath);
                    }
                }
            }
        };
        walkDir(workspacePath);
        return files;
    }
    /**
     * Парсинг файла для извлечения зависимостей
     * Использует регулярные выражения для простоты (без AST парсинга)
     */
    async parseFile(filePath, workspacePath) {
        const fullPath = path.join(workspacePath, filePath);
        if (!fs.existsSync(fullPath)) {
            return null;
        }
        // Проверяем кэш
        const stats = fs.statSync(fullPath);
        const cached = this.parseCache.get(filePath);
        if (cached && cached.timestamp >= stats.mtimeMs && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }
        const content = fs.readFileSync(fullPath, 'utf-8');
        const exports = [];
        const imports = [];
        const dependencies = {
            classes: [],
            functions: [],
            types: [],
            variables: []
        };
        // Парсинг импортов
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath.startsWith('.') || importPath.startsWith('/')) {
                imports.push(importPath);
            }
        }
        // Парсинг require
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath.startsWith('.') || importPath.startsWith('/')) {
                imports.push(importPath);
            }
        }
        // Парсинг экспортов
        const exportRegex = /export\s+(?:default\s+)?(?:class|interface|type|function|const|let|var|enum)\s+(\w+)/g;
        while ((match = exportRegex.exec(content)) !== null) {
            exports.push(match[1]);
        }
        // Парсинг export from
        const exportFromRegex = /export\s+(?:\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = exportFromRegex.exec(content)) !== null) {
            const exportPath = match[1];
            if (exportPath.startsWith('.') || exportPath.startsWith('/')) {
                exports.push(exportPath);
            }
        }
        // Парсинг классов
        const classRegex = /(?:export\s+)?class\s+(\w+)/g;
        while ((match = classRegex.exec(content)) !== null) {
            dependencies.classes.push(match[1]);
            if (content.substring(Math.max(0, match.index - 10), match.index).includes('export')) {
                exports.push(match[1]);
            }
        }
        // Парсинг функций
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
        while ((match = functionRegex.exec(content)) !== null) {
            dependencies.functions.push(match[1]);
            if (content.substring(Math.max(0, match.index - 10), match.index).includes('export')) {
                exports.push(match[1]);
            }
        }
        // Парсинг интерфейсов и типов
        const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
        while ((match = interfaceRegex.exec(content)) !== null) {
            dependencies.types.push(match[1]);
            if (content.substring(Math.max(0, match.index - 10), match.index).includes('export')) {
                exports.push(match[1]);
            }
        }
        const typeRegex = /(?:export\s+)?type\s+(\w+)/g;
        while ((match = typeRegex.exec(content)) !== null) {
            dependencies.types.push(match[1]);
            if (content.substring(Math.max(0, match.index - 10), match.index).includes('export')) {
                exports.push(match[1]);
            }
        }
        const result = {
            exports,
            imports,
            dependencies,
            dependents: []
        };
        // Кэшируем результат
        this.parseCache.set(filePath, {
            timestamp: Date.now(),
            data: result
        });
        return result;
    }
    /**
     * Обновление индексов
     */
    updateIndexes(graph, filePath, fileInfo) {
        // Индекс по экспортам
        fileInfo.exports.forEach(exp => {
            if (!graph.indexes.byExport[exp]) {
                graph.indexes.byExport[exp] = [];
            }
            if (!graph.indexes.byExport[exp].includes(filePath)) {
                graph.indexes.byExport[exp].push(filePath);
            }
        });
        // Индекс по импортам
        fileInfo.imports.forEach(imp => {
            if (!graph.indexes.byImport[imp]) {
                graph.indexes.byImport[imp] = [];
            }
            if (!graph.indexes.byImport[imp].includes(filePath)) {
                graph.indexes.byImport[imp].push(filePath);
            }
        });
    }
    /**
     * Удаление из индексов
     */
    removeFromIndexes(graph, filePath, fileInfo) {
        if (!fileInfo) {
            return;
        }
        fileInfo.exports.forEach(exp => {
            if (graph.indexes.byExport[exp]) {
                graph.indexes.byExport[exp] = graph.indexes.byExport[exp].filter(f => f !== filePath);
                if (graph.indexes.byExport[exp].length === 0) {
                    delete graph.indexes.byExport[exp];
                }
            }
        });
        fileInfo.imports.forEach(imp => {
            if (graph.indexes.byImport[imp]) {
                graph.indexes.byImport[imp] = graph.indexes.byImport[imp].filter(f => f !== filePath);
                if (graph.indexes.byImport[imp].length === 0) {
                    delete graph.indexes.byImport[imp];
                }
            }
        });
    }
    /**
     * Построение обратных зависимостей (dependents)
     */
    buildDependents(graph) {
        // Очищаем существующие dependents
        Object.keys(graph.files).forEach(file => {
            graph.files[file].dependents = [];
        });
        // Строим dependents на основе импортов
        Object.keys(graph.files).forEach(file => {
            const fileInfo = graph.files[file];
            fileInfo.imports.forEach(imp => {
                // Находим файлы, которые экспортируют то, что импортирует текущий файл
                const importedFiles = this.resolveImport(imp, file, graph);
                importedFiles.forEach(importedFile => {
                    if (graph.files[importedFile] && !graph.files[importedFile].dependents.includes(file)) {
                        graph.files[importedFile].dependents.push(file);
                    }
                });
            });
        });
    }
    /**
     * Разрешение импорта в путь к файлу
     */
    resolveImport(importPath, fromFile, graph) {
        const results = [];
        // Если это относительный путь
        if (importPath.startsWith('.')) {
            const fromDir = path.dirname(fromFile);
            const resolved = path.join(fromDir, importPath).replace(/\\/g, '/');
            // Пробуем разные расширения
            const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
            for (const ext of extensions) {
                const candidate = resolved + ext;
                if (graph.files[candidate]) {
                    results.push(candidate);
                    break;
                }
            }
        }
        return results;
    }
    /**
     * Настройка file watcher
     */
    setupFileWatcher() {
        if (!this.workspaceFolder) {
            return;
        }
        const pattern = new vscode.RelativePattern(this.workspaceFolder, '**/*.{ts,tsx,js,jsx}');
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        this.fileWatcher.onDidChange(async (uri) => {
            await this.updateFile(uri.fsPath);
        });
        this.fileWatcher.onDidCreate(async (uri) => {
            await this.updateFile(uri.fsPath);
        });
        this.fileWatcher.onDidDelete(async (uri) => {
            await this.removeFile(uri.fsPath);
        });
    }
    /**
     * Удаление файла из графа
     */
    async removeFile(filePath) {
        if (!this.graph) {
            return;
        }
        const relativePath = this.getRelativePath(filePath);
        const fileInfo = this.graph.files[relativePath];
        if (fileInfo) {
            this.removeFromIndexes(this.graph, relativePath, fileInfo);
            delete this.graph.files[relativePath];
            this.buildDependents(this.graph);
            this.graph.lastUpdated = new Date().toISOString();
            await this.saveGraph();
        }
    }
    /**
     * Загрузка графа из файла
     */
    async loadGraph() {
        if (!this.graphPath || !fs.existsSync(this.graphPath)) {
            this.graph = null;
            return;
        }
        try {
            const content = fs.readFileSync(this.graphPath, 'utf-8');
            this.graph = JSON.parse(content);
        }
        catch (error) {
            console.error('Error loading dependency graph:', error);
            this.graph = null;
        }
    }
    /**
     * Сохранение графа в файл
     */
    async saveGraph() {
        if (!this.graphPath || !this.graph) {
            return;
        }
        try {
            const dir = path.dirname(this.graphPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.graphPath, JSON.stringify(this.graph, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Error saving dependency graph:', error);
        }
    }
    /**
     * Проверка, устарел ли граф
     */
    isGraphOutdated() {
        if (!this.graph) {
            return true;
        }
        const lastUpdated = new Date(this.graph.lastUpdated);
        const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > 1; // Граф считается устаревшим, если не обновлялся более 1 дня
    }
    /**
     * Получение относительного пути
     */
    getRelativePath(filePath) {
        if (!this.workspaceFolder) {
            return filePath;
        }
        const workspacePath = this.workspaceFolder.uri.fsPath;
        if (filePath.startsWith(workspacePath)) {
            return path.relative(workspacePath, filePath).replace(/\\/g, '/');
        }
        return filePath;
    }
    /**
     * Получение полного графа зависимостей
     */
    getGraph() {
        return this.graph;
    }
    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.parseCache.clear();
    }
}
exports.ProjectDependencyGraph = ProjectDependencyGraph;
//# sourceMappingURL=project-dependency-graph.js.map