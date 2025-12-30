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
exports.ProjectAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ProjectAnalyzer {
    constructor() {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.profilePath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config', 'project-profile.json')
            : '';
    }
    /**
     * Анализ проекта
     */
    async analyzeProject() {
        if (!this.workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        console.log('Project Analyzer: Starting project analysis...');
        const workspacePath = this.workspaceFolder.uri.fsPath;
        // Определение типа проекта
        const projectType = await this.detectProjectType(workspacePath);
        // Выявление технологий
        const technologies = await this.detectTechnologies(workspacePath);
        // Анализ архитектуры
        const architecture = await this.detectArchitecture(workspacePath);
        // Определение стиля кода
        const codeStyle = await this.detectCodeStyle(workspacePath);
        // Поиск паттернов
        const patterns = await this.detectPatterns(workspacePath);
        // Поиск конфигурационных файлов
        const configFiles = await this.findConfigFiles(workspacePath);
        // Анализ зависимостей
        const dependencies = await this.analyzeDependencies(workspacePath);
        // Глубокий анализ кода
        console.log('Project Analyzer: Starting deep code analysis...');
        const codeMetrics = await this.analyzeCodeMetrics(workspacePath);
        const codePatterns = await this.analyzeCodePatterns(workspacePath, technologies.languages);
        const structure = await this.analyzeStructure(workspacePath);
        const bestPractices = await this.analyzeBestPractices(workspacePath, technologies, architecture);
        // Комплексный анализ
        console.log('Project Analyzer: Starting comprehensive analysis...');
        const security = await this.analyzeSecurity(workspacePath, technologies, dependencies);
        const performance = await this.analyzePerformance(workspacePath, codeMetrics);
        const testing = await this.analyzeTesting(workspacePath);
        const documentation = await this.analyzeDocumentation(workspacePath);
        const cicd = await this.analyzeCICD(workspacePath);
        const dependenciesAnalysis = await this.analyzeDependenciesComprehensive(workspacePath, dependencies);
        // Улучшенное определение архитектуры на основе кода
        const enhancedArchitecture = architecture || await this.detectArchitectureFromCode(workspacePath);
        // Улучшенное определение стиля кода на основе реального кода
        const enhancedCodeStyle = codeStyle || await this.detectCodeStyleFromCode(workspacePath, technologies.languages);
        // Рекомендации по агентам
        const agentRecommendations = await this.generateAgentRecommendations({
            type: projectType,
            languages: technologies.languages,
            frameworks: technologies.frameworks,
            architecture: enhancedArchitecture,
            patterns
        });
        const profile = {
            type: projectType,
            languages: technologies.languages,
            frameworks: technologies.frameworks,
            database: technologies.database,
            architecture: enhancedArchitecture,
            codeStyle: enhancedCodeStyle,
            patterns,
            detectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            version: '1.0.0',
            configFiles,
            dependencies,
            codeMetrics,
            codePatterns,
            structure,
            bestPractices,
            agentRecommendations,
            security,
            performance,
            testing,
            documentation,
            cicd,
            dependenciesAnalysis
        };
        // Сохранение профиля
        await this.saveProfile(profile);
        console.log('Project Analyzer: Analysis completed');
        return profile;
    }
    /**
     * Загрузка профиля проекта
     */
    async loadProfile() {
        if (!this.profilePath || !fs.existsSync(this.profilePath)) {
            return null;
        }
        try {
            const content = fs.readFileSync(this.profilePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Error loading project profile:', error);
            return null;
        }
    }
    /**
     * Определение типа проекта
     */
    async detectProjectType(workspacePath) {
        // Проверка на веб-приложение
        if (fs.existsSync(path.join(workspacePath, 'package.json')) ||
            fs.existsSync(path.join(workspacePath, 'composer.json')) ||
            fs.existsSync(path.join(workspacePath, 'requirements.txt')) ||
            fs.existsSync(path.join(workspacePath, 'go.mod'))) {
            return 'web-application';
        }
        // Проверка на мобильное приложение
        if (fs.existsSync(path.join(workspacePath, 'android')) ||
            fs.existsSync(path.join(workspacePath, 'ios')) ||
            fs.existsSync(path.join(workspacePath, 'pubspec.yaml'))) {
            return 'mobile-application';
        }
        // Проверка на desktop приложение
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                if (packageJson.dependencies?.electron || packageJson.devDependencies?.electron) {
                    return 'desktop-application';
                }
            }
            catch (error) {
                // Игнорируем ошибки парсинга
            }
        }
        // Проверка на библиотеку
        if (fs.existsSync(path.join(workspacePath, 'setup.py')) ||
            fs.existsSync(path.join(workspacePath, 'Cargo.toml')) ||
            fs.existsSync(path.join(workspacePath, 'lib'))) {
            return 'library';
        }
        return 'unknown';
    }
    /**
     * Выявление технологий
     */
    async detectTechnologies(workspacePath) {
        const languages = [];
        const frameworks = [];
        let database;
        // Проверка package.json
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                languages.push('JavaScript');
                if (packageJson.dependencies || packageJson.devDependencies) {
                    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                    // Определение фреймворков
                    if (deps.react || deps['react-dom'])
                        frameworks.push('React');
                    if (deps.vue)
                        frameworks.push('Vue');
                    if (deps.angular)
                        frameworks.push('Angular');
                    if (deps.next)
                        frameworks.push('Next.js');
                    if (deps.express)
                        frameworks.push('Express');
                    if (deps.koa)
                        frameworks.push('Koa');
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        // Проверка composer.json (PHP)
        const composerJsonPath = path.join(workspacePath, 'composer.json');
        if (fs.existsSync(composerJsonPath)) {
            try {
                const composerJson = JSON.parse(fs.readFileSync(composerJsonPath, 'utf-8'));
                languages.push('PHP');
                if (composerJson.require) {
                    if (composerJson.require['laravel/framework'])
                        frameworks.push('Laravel');
                    if (composerJson.require['symfony/symfony'])
                        frameworks.push('Symfony');
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        // Проверка requirements.txt (Python)
        const requirementsPath = path.join(workspacePath, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            languages.push('Python');
            const content = fs.readFileSync(requirementsPath, 'utf-8');
            if (content.includes('django'))
                frameworks.push('Django');
            if (content.includes('flask'))
                frameworks.push('Flask');
        }
        // Проверка go.mod (Go)
        if (fs.existsSync(path.join(workspacePath, 'go.mod'))) {
            languages.push('Go');
        }
        // Проверка Cargo.toml (Rust)
        if (fs.existsSync(path.join(workspacePath, 'Cargo.toml'))) {
            languages.push('Rust');
        }
        // Проверка базы данных через docker-compose.yml
        const dockerComposePath = path.join(workspacePath, 'docker-compose.yml');
        if (fs.existsSync(dockerComposePath)) {
            try {
                const content = fs.readFileSync(dockerComposePath, 'utf-8');
                if (content.includes('postgres'))
                    database = 'PostgreSQL';
                else if (content.includes('mysql'))
                    database = 'MySQL';
                else if (content.includes('mongodb'))
                    database = 'MongoDB';
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        return { languages, frameworks, database };
    }
    /**
     * Определение архитектуры
     */
    async detectArchitecture(workspacePath) {
        // Проверка на MVC
        if (fs.existsSync(path.join(workspacePath, 'app', 'controllers')) ||
            fs.existsSync(path.join(workspacePath, 'app', 'models')) ||
            fs.existsSync(path.join(workspacePath, 'app', 'views'))) {
            return 'MVC';
        }
        // Проверка на Clean Architecture
        if (fs.existsSync(path.join(workspacePath, 'src', 'domain')) ||
            fs.existsSync(path.join(workspacePath, 'src', 'infrastructure'))) {
            return 'Clean Architecture';
        }
        // Проверка на Component-based
        if (fs.existsSync(path.join(workspacePath, 'src', 'components')) ||
            fs.existsSync(path.join(workspacePath, 'src', 'containers'))) {
            return 'Component-based';
        }
        // Проверка на Service Layer
        if (fs.existsSync(path.join(workspacePath, 'services')) ||
            fs.existsSync(path.join(workspacePath, 'app', 'services'))) {
            return 'Service Layer';
        }
        return undefined;
    }
    /**
     * Определение стиля кода
     */
    async detectCodeStyle(workspacePath) {
        if (fs.existsSync(path.join(workspacePath, '.php_cs')) ||
            fs.existsSync(path.join(workspacePath, '.php_cs.dist'))) {
            return 'PSR-12';
        }
        if (fs.existsSync(path.join(workspacePath, '.eslintrc')) ||
            fs.existsSync(path.join(workspacePath, '.eslintrc.js')) ||
            fs.existsSync(path.join(workspacePath, '.eslintrc.json'))) {
            return 'ESLint';
        }
        if (fs.existsSync(path.join(workspacePath, '.prettierrc'))) {
            return 'Prettier';
        }
        const pyprojectPath = path.join(workspacePath, 'pyproject.toml');
        if (fs.existsSync(pyprojectPath)) {
            try {
                const content = fs.readFileSync(pyprojectPath, 'utf-8');
                if (content.includes('black') || content.includes('flake8')) {
                    return 'PEP 8';
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        return undefined;
    }
    /**
     * Поиск паттернов
     */
    async detectPatterns(workspacePath) {
        const patterns = [];
        // Проверка на Repository Pattern
        if (fs.existsSync(path.join(workspacePath, 'repositories')) ||
            fs.existsSync(path.join(workspacePath, 'app', 'repositories'))) {
            patterns.push('Repository');
        }
        // Проверка на Service Layer
        if (fs.existsSync(path.join(workspacePath, 'services')) ||
            fs.existsSync(path.join(workspacePath, 'app', 'services'))) {
            patterns.push('Service Layer');
        }
        // Проверка на Factory Pattern
        if (fs.existsSync(path.join(workspacePath, 'factories')) ||
            fs.existsSync(path.join(workspacePath, 'app', 'factories'))) {
            patterns.push('Factory');
        }
        return patterns;
    }
    /**
     * Поиск конфигурационных файлов
     */
    async findConfigFiles(workspacePath) {
        const configFiles = [];
        const commonConfigs = [
            'package.json',
            'composer.json',
            'requirements.txt',
            'go.mod',
            'Cargo.toml',
            'docker-compose.yml',
            '.eslintrc',
            '.prettierrc',
            'tsconfig.json',
            'pyproject.toml'
        ];
        for (const config of commonConfigs) {
            if (fs.existsSync(path.join(workspacePath, config))) {
                configFiles.push(config);
            }
        }
        return configFiles;
    }
    /**
     * Анализ зависимостей
     */
    async analyzeDependencies(workspacePath) {
        const dependencies = {};
        // Анализ package.json
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                if (packageJson.dependencies) {
                    Object.assign(dependencies, packageJson.dependencies);
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        return dependencies;
    }
    /**
     * Сохранение профиля
     */
    async saveProfile(profile) {
        if (!this.profilePath) {
            return;
        }
        const dir = path.dirname(this.profilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.profilePath, JSON.stringify(profile, null, 2), 'utf-8');
        console.log(`Project profile saved to: ${this.profilePath}`);
    }
    /**
     * Обновление профиля
     */
    async updateProfile(updates) {
        const currentProfile = await this.loadProfile();
        if (!currentProfile) {
            return await this.analyzeProject();
        }
        const updatedProfile = {
            ...currentProfile,
            ...updates,
            lastUpdated: new Date().toISOString(),
            version: this.incrementVersion(currentProfile.version)
        };
        await this.saveProfile(updatedProfile);
        return updatedProfile;
    }
    /**
     * Анализ метрик кода
     */
    async analyzeCodeMetrics(workspacePath) {
        let totalFiles = 0;
        let totalLines = 0;
        const fileSizes = [];
        const analyzeDirectory = (dir, depth = 0) => {
            if (depth > 10)
                return; // Ограничение глубины для производительности
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    // Пропускаем node_modules, .git, out, dist и другие служебные папки
                    if (entry.isDirectory()) {
                        if (['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor', '__pycache__'].includes(entry.name)) {
                            continue;
                        }
                        analyzeDirectory(fullPath, depth + 1);
                    }
                    else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        // Анализируем только исходные файлы
                        if (['.ts', '.js', '.php', '.py', '.java', '.cs', '.go', '.rs'].includes(ext)) {
                            totalFiles++;
                            try {
                                const content = fs.readFileSync(fullPath, 'utf-8');
                                const lines = content.split('\n').length;
                                totalLines += lines;
                                fileSizes.push(lines);
                            }
                            catch (error) {
                                // Игнорируем ошибки чтения
                            }
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки доступа
            }
        };
        analyzeDirectory(workspacePath);
        const averageFileSize = fileSizes.length > 0
            ? Math.round(fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length)
            : 0;
        // Определение сложности на основе размера проекта
        let complexity = 'low';
        if (totalFiles > 1000 || totalLines > 100000) {
            complexity = 'high';
        }
        else if (totalFiles > 100 || totalLines > 10000) {
            complexity = 'medium';
        }
        return {
            totalFiles,
            totalLines,
            averageFileSize,
            complexity
        };
    }
    /**
     * Анализ паттернов кода
     */
    async analyzeCodePatterns(workspacePath, languages) {
        const patterns = {
            namingConvention: 'mixed',
            errorHandling: [],
            asyncPatterns: [],
            importPatterns: []
        };
        // Анализ только для основных языков
        const extensions = {
            'JavaScript': ['.js', '.jsx'],
            'TypeScript': ['.ts', '.tsx'],
            'PHP': ['.php'],
            'Python': ['.py']
        };
        const filesToAnalyze = [];
        const analyzeDir = (dir, depth = 0) => {
            if (depth > 5)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        if (['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                            continue;
                        }
                        analyzeDir(path.join(dir, entry.name), depth + 1);
                    }
                    else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        for (const lang of languages) {
                            if (extensions[lang]?.includes(ext)) {
                                filesToAnalyze.push(path.join(dir, entry.name));
                                break;
                            }
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        };
        analyzeDir(workspacePath);
        // Анализируем первые 50 файлов для производительности
        const sampleFiles = filesToAnalyze.slice(0, 50);
        let camelCase = 0;
        let snakeCase = 0;
        let PascalCase = 0;
        const errorHandlingPatterns = new Set();
        const asyncPatterns = new Set();
        const importPatterns = new Set();
        for (const filePath of sampleFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                for (const line of lines) {
                    // Анализ именования
                    if (line.match(/\b[a-z][a-zA-Z0-9]*\s*[=:]/))
                        camelCase++;
                    if (line.match(/\b[a-z_][a-z0-9_]*\s*[=:]/))
                        snakeCase++;
                    if (line.match(/\b[A-Z][a-zA-Z0-9]*\s*[=:]/))
                        PascalCase++;
                    // Анализ обработки ошибок
                    if (line.includes('try') || line.includes('catch'))
                        errorHandlingPatterns.add('try-catch');
                    if (line.includes('throw'))
                        errorHandlingPatterns.add('throw');
                    if (line.includes('error') || line.includes('Error'))
                        errorHandlingPatterns.add('error-objects');
                    // Анализ асинхронности
                    if (line.includes('async') || line.includes('await'))
                        asyncPatterns.add('async-await');
                    if (line.includes('.then(') || line.includes('.catch('))
                        asyncPatterns.add('promises');
                    if (line.includes('callback') || line.includes('cb('))
                        asyncPatterns.add('callbacks');
                    // Анализ импортов
                    if (line.match(/^(import|require|use|from)\s+/)) {
                        if (line.includes('import'))
                            importPatterns.add('es6-imports');
                        if (line.includes('require'))
                            importPatterns.add('commonjs-require');
                        if (line.includes('use '))
                            importPatterns.add('php-use');
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки чтения
            }
        }
        // Определение соглашения об именовании
        if (camelCase > snakeCase && camelCase > PascalCase) {
            patterns.namingConvention = 'camelCase';
        }
        else if (snakeCase > camelCase && snakeCase > PascalCase) {
            patterns.namingConvention = 'snake_case';
        }
        else if (PascalCase > camelCase && PascalCase > snakeCase) {
            patterns.namingConvention = 'PascalCase';
        }
        patterns.errorHandling = Array.from(errorHandlingPatterns);
        patterns.asyncPatterns = Array.from(asyncPatterns);
        patterns.importPatterns = Array.from(importPatterns);
        return patterns;
    }
    /**
     * Анализ структуры проекта
     */
    async analyzeStructure(workspacePath) {
        const directories = [];
        const entryPoints = [];
        const mainModules = [];
        const analyzeDir = (dir, depth = 0) => {
            if (depth > 3)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        if (['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                            continue;
                        }
                        directories.push(entry.name);
                        analyzeDir(path.join(dir, entry.name), depth + 1);
                    }
                    else {
                        const fileName = entry.name;
                        // Поиск точек входа
                        if (['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'index.php', 'main.php', '__main__.py', 'main.py'].includes(fileName)) {
                            entryPoints.push(path.relative(workspacePath, path.join(dir, fileName)));
                        }
                        // Поиск основных модулей
                        if (fileName.includes('config') || fileName.includes('bootstrap') || fileName.includes('app')) {
                            mainModules.push(path.relative(workspacePath, path.join(dir, fileName)));
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        };
        analyzeDir(workspacePath);
        return {
            directories: [...new Set(directories)],
            entryPoints: [...new Set(entryPoints)],
            mainModules: [...new Set(mainModules)]
        };
    }
    /**
     * Анализ best practices
     */
    async analyzeBestPractices(workspacePath, technologies, architecture) {
        const used = [];
        const missing = [];
        const recommendations = [];
        // Проверка наличия тестов
        const testDirs = ['tests', 'test', '__tests__', 'spec', 'tests/unit', 'tests/integration'];
        const hasTests = testDirs.some(dir => fs.existsSync(path.join(workspacePath, dir)));
        if (hasTests) {
            used.push('unit-testing');
        }
        else {
            missing.push('unit-testing');
            recommendations.push('Добавьте unit-тесты для улучшения качества кода');
        }
        // Проверка наличия линтера
        const hasLinter = fs.existsSync(path.join(workspacePath, '.eslintrc')) ||
            fs.existsSync(path.join(workspacePath, '.eslintrc.js')) ||
            fs.existsSync(path.join(workspacePath, '.php_cs')) ||
            fs.existsSync(path.join(workspacePath, 'pyproject.toml'));
        if (hasLinter) {
            used.push('code-linting');
        }
        else {
            missing.push('code-linting');
            recommendations.push('Настройте линтер для обеспечения единого стиля кода');
        }
        // Проверка наличия README
        if (fs.existsSync(path.join(workspacePath, 'README.md'))) {
            used.push('documentation');
        }
        else {
            missing.push('documentation');
            recommendations.push('Добавьте README.md с описанием проекта');
        }
        // Проверка наличия .gitignore
        if (fs.existsSync(path.join(workspacePath, '.gitignore'))) {
            used.push('git-ignore');
        }
        else {
            missing.push('git-ignore');
            recommendations.push('Добавьте .gitignore для исключения служебных файлов');
        }
        // Рекомендации на основе технологий
        if (technologies.languages.includes('PHP')) {
            if (!fs.existsSync(path.join(workspacePath, 'composer.json'))) {
                recommendations.push('Используйте Composer для управления зависимостями PHP');
            }
        }
        if (technologies.languages.includes('JavaScript') || technologies.languages.includes('TypeScript')) {
            if (!fs.existsSync(path.join(workspacePath, 'package.json'))) {
                recommendations.push('Используйте npm/yarn для управления зависимостями');
            }
        }
        return {
            used,
            missing,
            recommendations
        };
    }
    /**
     * Определение архитектуры на основе кода
     */
    async detectArchitectureFromCode(workspacePath) {
        // Более глубокий анализ структуры кода
        const srcPath = path.join(workspacePath, 'src');
        const appPath = path.join(workspacePath, 'app');
        if (fs.existsSync(srcPath)) {
            const srcDirs = fs.readdirSync(srcPath, { withFileTypes: true })
                .filter(e => e.isDirectory())
                .map(e => e.name);
            if (srcDirs.includes('domain') && srcDirs.includes('infrastructure')) {
                return 'Clean Architecture';
            }
            if (srcDirs.includes('components') || srcDirs.includes('containers')) {
                return 'Component-based';
            }
            if (srcDirs.includes('controllers') || srcDirs.includes('models') || srcDirs.includes('views')) {
                return 'MVC';
            }
        }
        if (fs.existsSync(appPath)) {
            const appDirs = fs.readdirSync(appPath, { withFileTypes: true })
                .filter(e => e.isDirectory())
                .map(e => e.name);
            if (appDirs.includes('controllers') && appDirs.includes('models')) {
                return 'MVC';
            }
            if (appDirs.includes('services') && appDirs.includes('repositories')) {
                return 'Service Layer';
            }
        }
        return undefined;
    }
    /**
     * Определение стиля кода на основе реального кода
     */
    async detectCodeStyleFromCode(workspacePath, languages) {
        // Анализ реального кода для определения стиля
        const extensions = {
            'JavaScript': ['.js', '.jsx'],
            'TypeScript': ['.ts', '.tsx'],
            'PHP': ['.php'],
            'Python': ['.py']
        };
        const sampleFiles = [];
        const findSampleFiles = (dir, depth = 0) => {
            if (depth > 3 || sampleFiles.length >= 10)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                        findSampleFiles(path.join(dir, entry.name), depth + 1);
                    }
                    else if (entry.isFile() && sampleFiles.length < 10) {
                        const ext = path.extname(entry.name);
                        for (const lang of languages) {
                            if (extensions[lang]?.includes(ext)) {
                                sampleFiles.push(path.join(dir, entry.name));
                                break;
                            }
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        };
        findSampleFiles(workspacePath);
        // Анализ стиля на основе примеров кода
        for (const filePath of sampleFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                // Проверка на TypeScript
                if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
                    if (content.includes('interface ') || content.includes('type ') || content.includes(': ')) {
                        return 'TypeScript';
                    }
                }
                // Проверка на PSR-12 для PHP
                if (filePath.endsWith('.php')) {
                    if (content.includes('declare(strict_types=1)')) {
                        return 'PSR-12';
                    }
                }
                // Проверка на PEP 8 для Python
                if (filePath.endsWith('.py')) {
                    if (content.match(/def\s+\w+\([^)]*:\s*\w+/)) {
                        return 'PEP 8';
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        return undefined;
    }
    /**
     * Генерация рекомендаций по агентам
     */
    async generateAgentRecommendations(profile) {
        const recommendedAgents = [];
        const agentConfig = {};
        // Рекомендации на основе языков
        if (profile.languages.includes('PHP')) {
            recommendedAgents.push('backend');
            agentConfig.backend = {
                focus: 'PHP, PostgreSQL, API',
                priority: 'high'
            };
        }
        if (profile.languages.includes('JavaScript') || profile.languages.includes('TypeScript')) {
            if (profile.frameworks.some(f => ['React', 'Vue', 'Angular'].includes(f))) {
                recommendedAgents.push('frontend');
                agentConfig.frontend = {
                    focus: profile.frameworks.join(', '),
                    priority: 'high'
                };
            }
        }
        // Рекомендации на основе архитектуры
        if (profile.architecture === 'MVC' || profile.architecture === 'Service Layer') {
            recommendedAgents.push('architect');
            agentConfig.architect = {
                focus: profile.architecture,
                priority: 'medium'
            };
        }
        // Всегда рекомендуем QA для тестирования
        recommendedAgents.push('qa');
        agentConfig.qa = {
            focus: 'unit, integration, e2e',
            priority: 'high'
        };
        // Рекомендации на основе типа проекта
        if (profile.type === 'web-application') {
            recommendedAgents.push('devops');
            agentConfig.devops = {
                focus: 'Docker, deployment, CI/CD',
                priority: 'medium'
            };
        }
        return {
            recommendedAgents,
            agentConfig
        };
    }
    /**
     * Анализ безопасности
     */
    async analyzeSecurity(workspacePath, technologies, dependencies) {
        const vulnerabilities = [];
        const dependencyIssues = [];
        const securityPractices = [];
        const recommendations = [];
        // Проверка наличия .env файлов без .env.example
        if (fs.existsSync(path.join(workspacePath, '.env')) && !fs.existsSync(path.join(workspacePath, '.env.example'))) {
            vulnerabilities.push('Секреты могут быть закоммичены (.env без .env.example)');
            recommendations.push('Создайте .env.example с примерами переменных окружения');
        }
        // Проверка наличия секретов в коде (базовая проверка)
        const secretPatterns = [
            /password\s*=\s*['"][^'"]+['"]/i,
            /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
            /secret\s*=\s*['"][^'"]+['"]/i,
            /token\s*=\s*['"][^'"]+['"]/i
        ];
        const checkForSecrets = (dir, depth = 0) => {
            if (depth > 3)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                        checkForSecrets(path.join(dir, entry.name), depth + 1);
                    }
                    else if (entry.isFile() && ['.ts', '.js', '.php', '.py'].includes(path.extname(entry.name))) {
                        try {
                            const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
                            for (const pattern of secretPatterns) {
                                if (pattern.test(content)) {
                                    vulnerabilities.push(`Возможные секреты в коде: ${path.relative(workspacePath, path.join(dir, entry.name))}`);
                                    break;
                                }
                            }
                        }
                        catch (error) {
                            // Игнорируем ошибки чтения
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        };
        checkForSecrets(workspacePath);
        // Проверка безопасности зависимостей
        if (Object.keys(dependencies).length > 0) {
            dependencyIssues.push('Рекомендуется проверить зависимости на уязвимости (npm audit, composer audit)');
            recommendations.push('Регулярно проверяйте зависимости на уязвимости');
        }
        // Проверка использования параметризованных запросов для БД
        if (technologies.database) {
            securityPractices.push('Использование параметризованных запросов обязательно');
            recommendations.push('Всегда используйте prepared statements для работы с БД');
        }
        // Проверка наличия HTTPS
        const configFiles = ['docker-compose.yml', 'nginx.conf', '.htaccess'];
        let hasHttpsConfig = false;
        for (const configFile of configFiles) {
            const configPath = path.join(workspacePath, configFile);
            if (fs.existsSync(configPath)) {
                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    if (content.includes('ssl') || content.includes('https') || content.includes('TLS')) {
                        hasHttpsConfig = true;
                        break;
                    }
                }
                catch (error) {
                    // Игнорируем ошибки
                }
            }
        }
        if (!hasHttpsConfig && technologies.frameworks.length > 0) {
            recommendations.push('Настройте HTTPS для продакшн окружения');
        }
        return {
            vulnerabilities,
            dependencyIssues,
            securityPractices,
            recommendations
        };
    }
    /**
     * Анализ производительности
     */
    async analyzePerformance(workspacePath, codeMetrics) {
        const bottlenecks = [];
        const optimizationOpportunities = [];
        const cachingStrategies = [];
        const recommendations = [];
        // Анализ размера файлов
        if (codeMetrics && codeMetrics.averageFileSize > 500) {
            bottlenecks.push(`Большие файлы (средний размер: ${codeMetrics.averageFileSize} строк)`);
            recommendations.push('Разбейте большие файлы на меньшие модули');
        }
        // Поиск потенциальных узких мест
        const checkForPerformanceIssues = (dir, depth = 0) => {
            if (depth > 3)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                        checkForPerformanceIssues(path.join(dir, entry.name), depth + 1);
                    }
                    else if (entry.isFile() && ['.ts', '.js', '.php'].includes(path.extname(entry.name))) {
                        try {
                            const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
                            // Проверка на N+1 запросы
                            if (content.includes('foreach') && content.includes('SELECT') || content.includes('query')) {
                                optimizationOpportunities.push('Возможные N+1 запросы в циклах');
                            }
                            // Проверка на отсутствие кэширования
                            if (content.includes('SELECT') && !content.includes('cache') && !content.includes('Cache')) {
                                cachingStrategies.push('Рассмотрите кэширование запросов к БД');
                            }
                        }
                        catch (error) {
                            // Игнорируем ошибки чтения
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        };
        checkForPerformanceIssues(workspacePath);
        // Рекомендации по производительности
        if (codeMetrics && codeMetrics.complexity === 'high') {
            recommendations.push('Высокая сложность проекта - рассмотрите рефакторинг');
        }
        if (optimizationOpportunities.length === 0) {
            recommendations.push('Используйте индексы БД для оптимизации запросов');
        }
        return {
            bottlenecks,
            optimizationOpportunities: [...new Set(optimizationOpportunities)],
            cachingStrategies: [...new Set(cachingStrategies)],
            recommendations
        };
    }
    /**
     * Анализ тестирования
     */
    async analyzeTesting(workspacePath) {
        const testFrameworks = [];
        const testTypes = [];
        const recommendations = [];
        // Поиск тестовых директорий
        const testDirs = ['tests', 'test', '__tests__', 'spec', 'tests/unit', 'tests/integration', 'tests/e2e'];
        const foundTestDirs = [];
        for (const testDir of testDirs) {
            const testPath = path.join(workspacePath, testDir);
            if (fs.existsSync(testPath)) {
                foundTestDirs.push(testDir);
                testTypes.push(testDir.includes('unit') ? 'unit' : testDir.includes('integration') ? 'integration' : testDir.includes('e2e') ? 'e2e' : 'general');
            }
        }
        // Определение фреймворков тестирования
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                if (deps.jest || deps['@jest/globals'])
                    testFrameworks.push('Jest');
                if (deps.mocha)
                    testFrameworks.push('Mocha');
                if (deps.jasmine)
                    testFrameworks.push('Jasmine');
                if (deps.cypress)
                    testFrameworks.push('Cypress');
                if (deps.playwright)
                    testFrameworks.push('Playwright');
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        const composerJsonPath = path.join(workspacePath, 'composer.json');
        if (fs.existsSync(composerJsonPath)) {
            try {
                const composerJson = JSON.parse(fs.readFileSync(composerJsonPath, 'utf-8'));
                if (composerJson.require || composerJson['require-dev']) {
                    const deps = { ...composerJson.require, ...composerJson['require-dev'] };
                    if (deps['phpunit/phpunit'])
                        testFrameworks.push('PHPUnit');
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        // Рекомендации
        if (foundTestDirs.length === 0) {
            recommendations.push('Добавьте тесты для улучшения качества кода');
        }
        else {
            if (!testTypes.includes('unit')) {
                recommendations.push('Добавьте unit-тесты для тестирования отдельных компонентов');
            }
            if (!testTypes.includes('integration')) {
                recommendations.push('Добавьте integration-тесты для тестирования взаимодействия компонентов');
            }
        }
        // Оценка покрытия (базовая)
        let testCoverage;
        if (foundTestDirs.length > 0) {
            // Подсчет тестовых файлов
            let testFiles = 0;
            let sourceFiles = 0;
            const countFiles = (dir, isTestDir, depth = 0) => {
                if (depth > 5)
                    return;
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && !['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                            countFiles(path.join(dir, entry.name), isTestDir || foundTestDirs.some(td => dir.includes(td)), depth + 1);
                        }
                        else if (entry.isFile()) {
                            const ext = path.extname(entry.name);
                            if (['.ts', '.js', '.php', '.py'].includes(ext)) {
                                if (isTestDir || entry.name.includes('.test.') || entry.name.includes('.spec.')) {
                                    testFiles++;
                                }
                                else {
                                    sourceFiles++;
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    // Игнорируем ошибки
                }
            };
            countFiles(workspacePath, false);
            if (sourceFiles > 0) {
                testCoverage = Math.min(100, Math.round((testFiles / sourceFiles) * 100));
            }
        }
        return {
            testFrameworks,
            testCoverage,
            testTypes: [...new Set(testTypes)],
            recommendations
        };
    }
    /**
     * Анализ документации
     */
    async analyzeDocumentation(workspacePath) {
        const recommendations = [];
        let hasReadme = false;
        let hasApiDocs = false;
        let commentCoverage;
        // Проверка README
        const readmeFiles = ['README.md', 'README.txt', 'README.rst', 'README'];
        for (const readme of readmeFiles) {
            if (fs.existsSync(path.join(workspacePath, readme))) {
                hasReadme = true;
                break;
            }
        }
        if (!hasReadme) {
            recommendations.push('Добавьте README.md с описанием проекта');
        }
        // Проверка API документации
        const apiDocDirs = ['docs', 'documentation', 'api-docs', 'swagger'];
        for (const docDir of apiDocDirs) {
            const docPath = path.join(workspacePath, docDir);
            if (fs.existsSync(docPath)) {
                hasApiDocs = true;
                break;
            }
        }
        // Проверка наличия swagger/openapi файлов
        const apiDocFiles = ['swagger.json', 'swagger.yaml', 'openapi.json', 'openapi.yaml', 'api.json'];
        for (const apiDocFile of apiDocFiles) {
            if (fs.existsSync(path.join(workspacePath, apiDocFile))) {
                hasApiDocs = true;
                break;
            }
        }
        if (!hasApiDocs) {
            recommendations.push('Добавьте API документацию (Swagger/OpenAPI)');
        }
        // Анализ покрытия комментариями (базовая оценка)
        let filesWithComments = 0;
        let totalFiles = 0;
        const analyzeComments = (dir, depth = 0) => {
            if (depth > 3)
                return;
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor', 'tests', 'test'].includes(entry.name)) {
                        analyzeComments(path.join(dir, entry.name), depth + 1);
                    }
                    else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        if (['.ts', '.js', '.php', '.py'].includes(ext)) {
                            totalFiles++;
                            try {
                                const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
                                // Проверка на наличие комментариев
                                if (content.includes('//') || content.includes('/*') || content.includes('#') || content.includes('/**')) {
                                    filesWithComments++;
                                }
                            }
                            catch (error) {
                                // Игнорируем ошибки
                            }
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        };
        analyzeComments(workspacePath);
        if (totalFiles > 0) {
            commentCoverage = Math.round((filesWithComments / totalFiles) * 100);
            if (commentCoverage < 50) {
                recommendations.push('Увеличьте покрытие кода комментариями');
            }
        }
        return {
            hasReadme,
            hasApiDocs,
            commentCoverage,
            recommendations
        };
    }
    /**
     * Анализ CI/CD
     */
    async analyzeCICD(workspacePath) {
        const pipelines = [];
        const configFiles = [];
        const stages = [];
        const recommendations = [];
        // Проверка GitHub Actions
        const githubActionsPath = path.join(workspacePath, '.github', 'workflows');
        if (fs.existsSync(githubActionsPath)) {
            pipelines.push('GitHub Actions');
            try {
                const workflows = fs.readdirSync(githubActionsPath);
                configFiles.push(...workflows.map(w => `.github/workflows/${w}`));
                // Анализ стадий в workflow файлах
                for (const workflow of workflows) {
                    try {
                        const content = fs.readFileSync(path.join(githubActionsPath, workflow), 'utf-8');
                        if (content.includes('test'))
                            stages.push('test');
                        if (content.includes('build'))
                            stages.push('build');
                        if (content.includes('deploy'))
                            stages.push('deploy');
                        if (content.includes('lint'))
                            stages.push('lint');
                    }
                    catch (error) {
                        // Игнорируем ошибки
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        // Проверка GitLab CI
        const gitlabCiPath = path.join(workspacePath, '.gitlab-ci.yml');
        if (fs.existsSync(gitlabCiPath)) {
            pipelines.push('GitLab CI');
            configFiles.push('.gitlab-ci.yml');
            try {
                const content = fs.readFileSync(gitlabCiPath, 'utf-8');
                if (content.includes('test'))
                    stages.push('test');
                if (content.includes('build'))
                    stages.push('build');
                if (content.includes('deploy'))
                    stages.push('deploy');
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        // Проверка Jenkins
        const jenkinsPath = path.join(workspacePath, 'Jenkinsfile');
        if (fs.existsSync(jenkinsPath)) {
            pipelines.push('Jenkins');
            configFiles.push('Jenkinsfile');
            stages.push('build', 'test', 'deploy');
        }
        // Проверка CircleCI
        const circleCiPath = path.join(workspacePath, '.circleci', 'config.yml');
        if (fs.existsSync(circleCiPath)) {
            pipelines.push('CircleCI');
            configFiles.push('.circleci/config.yml');
        }
        // Рекомендации
        if (pipelines.length === 0) {
            recommendations.push('Настройте CI/CD пайплайн для автоматизации тестирования и деплоя');
        }
        else {
            if (!stages.includes('test')) {
                recommendations.push('Добавьте стадию тестирования в CI/CD пайплайн');
            }
            if (!stages.includes('lint')) {
                recommendations.push('Добавьте стадию линтинга в CI/CD пайплайн');
            }
        }
        return {
            pipelines,
            configFiles,
            stages: [...new Set(stages)],
            recommendations
        };
    }
    /**
     * Комплексный анализ зависимостей
     */
    async analyzeDependenciesComprehensive(workspacePath, dependencies) {
        const outdated = [];
        const conflicts = [];
        const securityIssues = [];
        const recommendations = [];
        // Анализ package.json
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                // Проверка на использование диапазонов версий (могут быть устаревшими)
                for (const [dep, version] of Object.entries(deps)) {
                    if (typeof version === 'string') {
                        if (version.startsWith('^') || version.startsWith('~')) {
                            // Это нормально, но можно рекомендовать зафиксировать версии
                        }
                        else if (version.includes('*') || version === 'latest') {
                            outdated.push(`${dep}: использует latest или *`);
                            recommendations.push(`Зафиксируйте версию для ${dep}`);
                        }
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        // Анализ composer.json
        const composerJsonPath = path.join(workspacePath, 'composer.json');
        if (fs.existsSync(composerJsonPath)) {
            try {
                const composerJson = JSON.parse(fs.readFileSync(composerJsonPath, 'utf-8'));
                const deps = { ...composerJson.require, ...composerJson['require-dev'] };
                for (const [dep, version] of Object.entries(deps)) {
                    if (typeof version === 'string' && (version === '*' || version === 'dev-master')) {
                        outdated.push(`${dep}: использует dev-master или *`);
                        recommendations.push(`Зафиксируйте версию для ${dep}`);
                    }
                }
            }
            catch (error) {
                // Игнорируем ошибки
            }
        }
        // Рекомендации по безопасности зависимостей
        if (Object.keys(dependencies).length > 0) {
            securityIssues.push('Рекомендуется регулярно проверять зависимости на уязвимости');
            recommendations.push('Используйте npm audit, composer audit или Snyk для проверки безопасности');
            recommendations.push('Обновляйте зависимости регулярно, но тестируйте после обновления');
        }
        return {
            outdated,
            conflicts,
            securityIssues,
            recommendations
        };
    }
    /**
     * Инкремент версии
     */
    incrementVersion(version) {
        const parts = version.split('.');
        const patch = parseInt(parts[2] || '0', 10) + 1;
        return `${parts[0]}.${parts[1]}.${patch}`;
    }
}
exports.ProjectAnalyzer = ProjectAnalyzer;
//# sourceMappingURL=project-analyzer.js.map