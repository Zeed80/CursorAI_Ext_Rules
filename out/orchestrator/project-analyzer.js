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
        const profile = {
            type: projectType,
            languages: technologies.languages,
            frameworks: technologies.frameworks,
            database: technologies.database,
            architecture,
            codeStyle,
            patterns,
            detectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            version: '1.0.0',
            configFiles,
            dependencies
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