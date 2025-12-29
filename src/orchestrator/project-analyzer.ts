import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectProfile {
    type: 'web-application' | 'mobile-application' | 'desktop-application' | 'library' | 'unknown';
    languages: string[];
    frameworks: string[];
    database?: string;
    architecture?: string;
    codeStyle?: string;
    patterns: string[];
    detectedAt: string;
    lastUpdated: string;
    version: string;
    configFiles: string[];
    dependencies: {
        [key: string]: string;
    };
    // Расширенные поля для глубокого анализа
    codeMetrics?: {
        totalFiles: number;
        totalLines: number;
        averageFileSize: number;
        complexity: 'low' | 'medium' | 'high';
        testCoverage?: number;
    };
    codePatterns?: {
        namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'mixed';
        errorHandling: string[];
        asyncPatterns: string[];
        importPatterns: string[];
    };
    structure?: {
        directories: string[];
        entryPoints: string[];
        mainModules: string[];
    };
    bestPractices?: {
        used: string[];
        missing: string[];
        recommendations: string[];
    };
    agentRecommendations?: {
        recommendedAgents: string[];
        agentConfig: { [agentId: string]: any };
    };
}

export class ProjectAnalyzer {
    private workspaceFolder: vscode.WorkspaceFolder | undefined;
    private profilePath: string;

    constructor() {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this.profilePath = this.workspaceFolder
            ? path.join(this.workspaceFolder.uri.fsPath, '.cursor', 'config', 'project-profile.json')
            : '';
    }

    /**
     * Анализ проекта
     */
    async analyzeProject(): Promise<ProjectProfile> {
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

        const profile: ProjectProfile = {
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
            agentRecommendations
        };

        // Сохранение профиля
        await this.saveProfile(profile);

        console.log('Project Analyzer: Analysis completed');
        return profile;
    }

    /**
     * Загрузка профиля проекта
     */
    async loadProfile(): Promise<ProjectProfile | null> {
        if (!this.profilePath || !fs.existsSync(this.profilePath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(this.profilePath, 'utf-8');
            return JSON.parse(content) as ProjectProfile;
        } catch (error) {
            console.error('Error loading project profile:', error);
            return null;
        }
    }

    /**
     * Определение типа проекта
     */
    private async detectProjectType(workspacePath: string): Promise<ProjectProfile['type']> {
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
            } catch (error) {
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
    private async detectTechnologies(workspacePath: string): Promise<{
        languages: string[];
        frameworks: string[];
        database?: string;
    }> {
        const languages: string[] = [];
        const frameworks: string[] = [];
        let database: string | undefined;

        // Проверка package.json
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                languages.push('JavaScript');
                
                if (packageJson.dependencies || packageJson.devDependencies) {
                    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                    
                    // Определение фреймворков
                    if (deps.react || deps['react-dom']) frameworks.push('React');
                    if (deps.vue) frameworks.push('Vue');
                    if (deps.angular) frameworks.push('Angular');
                    if (deps.next) frameworks.push('Next.js');
                    if (deps.express) frameworks.push('Express');
                    if (deps.koa) frameworks.push('Koa');
                }
            } catch (error) {
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
                    if (composerJson.require['laravel/framework']) frameworks.push('Laravel');
                    if (composerJson.require['symfony/symfony']) frameworks.push('Symfony');
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        }

        // Проверка requirements.txt (Python)
        const requirementsPath = path.join(workspacePath, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            languages.push('Python');
            const content = fs.readFileSync(requirementsPath, 'utf-8');
            if (content.includes('django')) frameworks.push('Django');
            if (content.includes('flask')) frameworks.push('Flask');
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
                if (content.includes('postgres')) database = 'PostgreSQL';
                else if (content.includes('mysql')) database = 'MySQL';
                else if (content.includes('mongodb')) database = 'MongoDB';
            } catch (error) {
                // Игнорируем ошибки
            }
        }

        return { languages, frameworks, database };
    }

    /**
     * Определение архитектуры
     */
    private async detectArchitecture(workspacePath: string): Promise<string | undefined> {
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
    private async detectCodeStyle(workspacePath: string): Promise<string | undefined> {
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
            } catch (error) {
                // Игнорируем ошибки
            }
        }

        return undefined;
    }

    /**
     * Поиск паттернов
     */
    private async detectPatterns(workspacePath: string): Promise<string[]> {
        const patterns: string[] = [];

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
    private async findConfigFiles(workspacePath: string): Promise<string[]> {
        const configFiles: string[] = [];
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
    private async analyzeDependencies(workspacePath: string): Promise<{ [key: string]: string }> {
        const dependencies: { [key: string]: string } = {};

        // Анализ package.json
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                if (packageJson.dependencies) {
                    Object.assign(dependencies, packageJson.dependencies);
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        }

        return dependencies;
    }

    /**
     * Сохранение профиля
     */
    private async saveProfile(profile: ProjectProfile): Promise<void> {
        if (!this.profilePath) {
            return;
        }

        const dir = path.dirname(this.profilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
            this.profilePath,
            JSON.stringify(profile, null, 2),
            'utf-8'
        );

        console.log(`Project profile saved to: ${this.profilePath}`);
    }

    /**
     * Обновление профиля
     */
    async updateProfile(updates: Partial<ProjectProfile>): Promise<ProjectProfile> {
        const currentProfile = await this.loadProfile();
        
        if (!currentProfile) {
            return await this.analyzeProject();
        }

        const updatedProfile: ProjectProfile = {
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
    private async analyzeCodeMetrics(workspacePath: string): Promise<ProjectProfile['codeMetrics']> {
        let totalFiles = 0;
        let totalLines = 0;
        const fileSizes: number[] = [];

        const analyzeDirectory = (dir: string, depth: number = 0): void => {
            if (depth > 10) return; // Ограничение глубины для производительности
            
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
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        // Анализируем только исходные файлы
                        if (['.ts', '.js', '.php', '.py', '.java', '.cs', '.go', '.rs'].includes(ext)) {
                            totalFiles++;
                            try {
                                const content = fs.readFileSync(fullPath, 'utf-8');
                                const lines = content.split('\n').length;
                                totalLines += lines;
                                fileSizes.push(lines);
                            } catch (error) {
                                // Игнорируем ошибки чтения
                            }
                        }
                    }
                }
            } catch (error) {
                // Игнорируем ошибки доступа
            }
        };

        analyzeDirectory(workspacePath);

        const averageFileSize = fileSizes.length > 0 
            ? Math.round(fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length)
            : 0;

        // Определение сложности на основе размера проекта
        let complexity: 'low' | 'medium' | 'high' = 'low';
        if (totalFiles > 1000 || totalLines > 100000) {
            complexity = 'high';
        } else if (totalFiles > 100 || totalLines > 10000) {
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
    private async analyzeCodePatterns(workspacePath: string, languages: string[]): Promise<ProjectProfile['codePatterns']> {
        const patterns: ProjectProfile['codePatterns'] = {
            namingConvention: 'mixed',
            errorHandling: [],
            asyncPatterns: [],
            importPatterns: []
        };

        // Анализ только для основных языков
        const extensions: { [key: string]: string[] } = {
            'JavaScript': ['.js', '.jsx'],
            'TypeScript': ['.ts', '.tsx'],
            'PHP': ['.php'],
            'Python': ['.py']
        };

        const filesToAnalyze: string[] = [];
        const analyzeDir = (dir: string, depth: number = 0): void => {
            if (depth > 5) return;
            
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        if (['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                            continue;
                        }
                        analyzeDir(path.join(dir, entry.name), depth + 1);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        for (const lang of languages) {
                            if (extensions[lang]?.includes(ext)) {
                                filesToAnalyze.push(path.join(dir, entry.name));
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        };

        analyzeDir(workspacePath);

        // Анализируем первые 50 файлов для производительности
        const sampleFiles = filesToAnalyze.slice(0, 50);
        let camelCase = 0;
        let snakeCase = 0;
        let PascalCase = 0;
        const errorHandlingPatterns = new Set<string>();
        const asyncPatterns = new Set<string>();
        const importPatterns = new Set<string>();

        for (const filePath of sampleFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');

                for (const line of lines) {
                    // Анализ именования
                    if (line.match(/\b[a-z][a-zA-Z0-9]*\s*[=:]/)) camelCase++;
                    if (line.match(/\b[a-z_][a-z0-9_]*\s*[=:]/)) snakeCase++;
                    if (line.match(/\b[A-Z][a-zA-Z0-9]*\s*[=:]/)) PascalCase++;

                    // Анализ обработки ошибок
                    if (line.includes('try') || line.includes('catch')) errorHandlingPatterns.add('try-catch');
                    if (line.includes('throw')) errorHandlingPatterns.add('throw');
                    if (line.includes('error') || line.includes('Error')) errorHandlingPatterns.add('error-objects');

                    // Анализ асинхронности
                    if (line.includes('async') || line.includes('await')) asyncPatterns.add('async-await');
                    if (line.includes('.then(') || line.includes('.catch(')) asyncPatterns.add('promises');
                    if (line.includes('callback') || line.includes('cb(')) asyncPatterns.add('callbacks');

                    // Анализ импортов
                    if (line.match(/^(import|require|use|from)\s+/)) {
                        if (line.includes('import')) importPatterns.add('es6-imports');
                        if (line.includes('require')) importPatterns.add('commonjs-require');
                        if (line.includes('use ')) importPatterns.add('php-use');
                    }
                }
            } catch (error) {
                // Игнорируем ошибки чтения
            }
        }

        // Определение соглашения об именовании
        if (camelCase > snakeCase && camelCase > PascalCase) {
            patterns.namingConvention = 'camelCase';
        } else if (snakeCase > camelCase && snakeCase > PascalCase) {
            patterns.namingConvention = 'snake_case';
        } else if (PascalCase > camelCase && PascalCase > snakeCase) {
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
    private async analyzeStructure(workspacePath: string): Promise<ProjectProfile['structure']> {
        const directories: string[] = [];
        const entryPoints: string[] = [];
        const mainModules: string[] = [];

        const analyzeDir = (dir: string, depth: number = 0): void => {
            if (depth > 3) return;
            
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        if (['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                            continue;
                        }
                        directories.push(entry.name);
                        analyzeDir(path.join(dir, entry.name), depth + 1);
                    } else {
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
            } catch (error) {
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
    private async analyzeBestPractices(
        workspacePath: string,
        technologies: { languages: string[]; frameworks: string[]; database?: string },
        architecture?: string
    ): Promise<ProjectProfile['bestPractices']> {
        const used: string[] = [];
        const missing: string[] = [];
        const recommendations: string[] = [];

        // Проверка наличия тестов
        const testDirs = ['tests', 'test', '__tests__', 'spec', 'tests/unit', 'tests/integration'];
        const hasTests = testDirs.some(dir => fs.existsSync(path.join(workspacePath, dir)));
        if (hasTests) {
            used.push('unit-testing');
        } else {
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
        } else {
            missing.push('code-linting');
            recommendations.push('Настройте линтер для обеспечения единого стиля кода');
        }

        // Проверка наличия README
        if (fs.existsSync(path.join(workspacePath, 'README.md'))) {
            used.push('documentation');
        } else {
            missing.push('documentation');
            recommendations.push('Добавьте README.md с описанием проекта');
        }

        // Проверка наличия .gitignore
        if (fs.existsSync(path.join(workspacePath, '.gitignore'))) {
            used.push('git-ignore');
        } else {
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
    private async detectArchitectureFromCode(workspacePath: string): Promise<string | undefined> {
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
    private async detectCodeStyleFromCode(workspacePath: string, languages: string[]): Promise<string | undefined> {
        // Анализ реального кода для определения стиля
        const extensions: { [key: string]: string[] } = {
            'JavaScript': ['.js', '.jsx'],
            'TypeScript': ['.ts', '.tsx'],
            'PHP': ['.php'],
            'Python': ['.py']
        };

        const sampleFiles: string[] = [];
        const findSampleFiles = (dir: string, depth: number = 0): void => {
            if (depth > 3 || sampleFiles.length >= 10) return;
            
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'vendor'].includes(entry.name)) {
                        findSampleFiles(path.join(dir, entry.name), depth + 1);
                    } else if (entry.isFile() && sampleFiles.length < 10) {
                        const ext = path.extname(entry.name);
                        for (const lang of languages) {
                            if (extensions[lang]?.includes(ext)) {
                                sampleFiles.push(path.join(dir, entry.name));
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
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
            } catch (error) {
                // Игнорируем ошибки
            }
        }

        return undefined;
    }

    /**
     * Генерация рекомендаций по агентам
     */
    private async generateAgentRecommendations(profile: {
        type: string;
        languages: string[];
        frameworks: string[];
        architecture?: string;
        patterns: string[];
    }): Promise<ProjectProfile['agentRecommendations']> {
        const recommendedAgents: string[] = [];
        const agentConfig: { [agentId: string]: any } = {};

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
     * Инкремент версии
     */
    private incrementVersion(version: string): string {
        const parts = version.split('.');
        const patch = parseInt(parts[2] || '0', 10) + 1;
        return `${parts[0]}.${parts[1]}.${patch}`;
    }
}
