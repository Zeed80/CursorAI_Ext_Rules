import * as vscode from 'vscode';
import { Task } from '../orchestrator/orchestrator';
import { CursorAPI } from '../integration/cursor-api';
import { LanguageModelInfo } from '../integration/model-provider';
import { SettingsManager } from '../integration/settings-manager';

/**
 * Контекст проекта для агентов
 */
export interface ProjectContext {
    structure: {
        files: string[];
        directories: string[];
        entryPoints: string[];
    };
    dependencies?: {
        [filePath: string]: string[];
    };
    patterns?: string[];
    standards?: {
        codeStyle?: string;
        architecture?: string;
    };
    knowledge?: {
        [key: string]: any;
    };
}

/**
 * Вариант решения задачи
 */
export interface SolutionOption {
    id: string;
    title: string;
    description: string;
    approach: string;
    pros: string[];
    cons: string[];
    estimatedTime: number; // milliseconds
    complexity: 'low' | 'medium' | 'high';
    confidence: number; // 0-1
    filesToModify: string[];
    risks: string[];
}

/**
 * Размышления агента
 */
export interface AgentThoughts {
    agentId: string;
    agentName: string;
    taskId: string;
    timestamp: Date;
    phase: 'analyzing' | 'brainstorming' | 'evaluating' | 'implementing';
    analysis: {
        problem: string;
        context: string;
        constraints: string[];
    };
    options: SolutionOption[];
    selectedOption?: SolutionOption;
    reasoning: string;
    implementationPlan: string[];
    progress: {
        currentStep: number;
        totalSteps: number;
        status: 'thinking' | 'proposing' | 'implementing' | 'completed';
    };
}

/**
 * Предложение решения от агента
 */
export interface AgentSolution {
    id: string;
    agentId: string;
    agentName: string;
    taskId: string;
    timestamp: Date;
    solution: {
        title: string;
        description: string;
        approach: string;
        filesToModify: string[];
        codeChanges: {
            file: string;
            type: 'create' | 'modify' | 'delete';
            description: string;
            estimatedLines?: number;
        }[];
        dependencies: {
            files: string[];
            impact: 'low' | 'medium' | 'high';
        };
    };
    evaluation: {
        quality: number; // 0-1
        performance: number; // 0-1
        security: number; // 0-1
        maintainability: number; // 0-1
        compliance: number; // 0-1
        overallScore: number; // 0-1
    };
    reasoning: string;
    confidence: number; // 0-1
    estimatedTime: number; // milliseconds
}

/**
 * Результат выполнения решения
 */
export interface ExecutionResult {
    success: boolean;
    message?: string;
    error?: string;
    filesChanged: string[];
    codeChanges: number;
    executionTime: number; // milliseconds
}

/**
 * Базовый класс для локальных агентов
 * Все агенты работают локально через CursorAI API
 */
export abstract class LocalAgent {
    protected id: string;
    protected name: string;
    protected description: string;
    protected context: vscode.ExtensionContext;
    protected agentContext: Map<string, any> = new Map();
    protected thoughtsCallback?: (thoughts: AgentThoughts) => void;
    protected settingsManager: SettingsManager;
    protected selectedModel?: LanguageModelInfo;

    constructor(
        id: string,
        name: string,
        description: string,
        context: vscode.ExtensionContext
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.context = context;
        this.settingsManager = new SettingsManager();
    }

    /**
     * Установка callback для публикации размышлений
     */
    setThoughtsCallback(callback: (thoughts: AgentThoughts) => void): void {
        this.thoughtsCallback = callback;
    }

    /**
     * Размышление над задачей
     * Агент анализирует задачу и генерирует варианты решения
     */
    async think(task: Task, projectContext: ProjectContext): Promise<AgentThoughts> {
        // Публикуем начальную фазу размышления
        const initialThoughts: AgentThoughts = {
            agentId: this.id,
            agentName: this.name,
            taskId: task.id,
            timestamp: new Date(),
            phase: 'analyzing',
            analysis: {
                problem: task.description,
                context: '',
                constraints: []
            },
            options: [],
            reasoning: '',
            implementationPlan: [],
            progress: {
                currentStep: 0,
                totalSteps: 0,
                status: 'thinking'
            }
        };

        this.publishThoughts(initialThoughts);

        // Анализ задачи
        const analysis = await this.analyzeTask(task, projectContext);
        initialThoughts.analysis = analysis;
        initialThoughts.phase = 'brainstorming';
        initialThoughts.progress.currentStep = 1;
        this.publishThoughts(initialThoughts);

        // Генерация вариантов решения
        const options = await this.generateOptions(task, projectContext, analysis);
        initialThoughts.options = options;
        initialThoughts.phase = 'evaluating';
        initialThoughts.progress.currentStep = 2;
        this.publishThoughts(initialThoughts);

        // Выбор лучшего варианта
        const selectedOption = await this.selectBestOption(options, task, projectContext);
        initialThoughts.selectedOption = selectedOption;
        initialThoughts.reasoning = await this.generateReasoning(selectedOption, task, projectContext);
        initialThoughts.implementationPlan = await this.createImplementationPlan(selectedOption, task, projectContext);
        initialThoughts.phase = 'implementing';
        initialThoughts.progress.currentStep = 3;
        initialThoughts.progress.totalSteps = initialThoughts.implementationPlan.length;
        initialThoughts.progress.status = 'proposing';
        this.publishThoughts(initialThoughts);

        return initialThoughts;
    }

    /**
     * Предложение решения на основе размышлений
     */
    async proposeSolution(task: Task, thoughts: AgentThoughts, projectContext: ProjectContext): Promise<AgentSolution> {
        if (!thoughts.selectedOption) {
            throw new Error('No selected option in thoughts');
        }

        const solution: AgentSolution = {
            id: `solution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId: this.id,
            agentName: this.name,
            taskId: task.id,
            timestamp: new Date(),
            solution: {
                title: thoughts.selectedOption.title,
                description: thoughts.selectedOption.description,
                approach: thoughts.selectedOption.approach,
                filesToModify: thoughts.selectedOption.filesToModify,
                codeChanges: await this.planCodeChanges(thoughts.selectedOption, task, projectContext),
                dependencies: await this.analyzeDependencies(thoughts.selectedOption, projectContext)
            },
            evaluation: await this.evaluateSolution(thoughts.selectedOption, task, projectContext),
            reasoning: thoughts.reasoning,
            confidence: thoughts.selectedOption.confidence,
            estimatedTime: thoughts.selectedOption.estimatedTime
        };

        return solution;
    }

    /**
     * Выполнение решения
     * Базовая реализация, которую агенты могут переопределить
     */
    async executeSolution(solution: AgentSolution, task: Task, projectContext: ProjectContext): Promise<ExecutionResult> {
        const startTime = Date.now();
        const filesChanged: string[] = [];

        try {
            const edit = new vscode.WorkspaceEdit();

            // Проверяем workspace folder перед началом обработки изменений
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                console.error('No workspace folder found - cannot apply edits');
                throw new Error('Рабочая область не открыта. Откройте папку проекта в Cursor IDE для применения изменений.');
            }

            // Проверяем, что URI workspace folder существует
            if (!workspaceFolder.uri) {
                console.error('Workspace folder URI is undefined');
                throw new Error('Рабочая область недоступна. Проверьте, что папка проекта открыта корректно.');
            }

            // Обрабатываем каждое изменение кода
            for (const change of solution.solution.codeChanges) {

                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, change.file);

                if (change.type === 'create') {
                    // Генерируем код для нового файла через LLM
                    const codePrompt = this.buildCodeGenerationPrompt(change, solution, task, projectContext);
                    const generatedCode = await this.callLLM(codePrompt);
                    
                    if (generatedCode) {
                        // Создаем новый файл с сгенерированным кодом
                        edit.createFile(fileUri);
                        edit.insert(fileUri, new vscode.Position(0, 0), generatedCode);
                        filesChanged.push(change.file);
                    }
                } else if (change.type === 'modify') {
                    // Читаем существующий файл
                    let existingContent = '';
                    try {
                        const fileData = await vscode.workspace.fs.readFile(fileUri);
                        existingContent = Buffer.from(fileData).toString('utf-8');
                    } catch (error) {
                        // Файл не существует, создаем новый
                        existingContent = '';
                    }

                    // Генерируем изменения через LLM
                    const modificationPrompt = this.buildCodeModificationPrompt(
                        change, 
                        existingContent, 
                        solution, 
                        task, 
                        projectContext
                    );
                    const modifiedCode = await this.callLLM(modificationPrompt);
                    
                    if (modifiedCode) {
                        // Заменяем весь файл (в реальной реализации можно использовать более точные правки)
                        if (existingContent) {
                            const lines = existingContent.split('\n');
                            const fullRange = new vscode.Range(
                                new vscode.Position(0, 0),
                                new vscode.Position(Math.max(0, lines.length - 1), lines[lines.length - 1]?.length || 0)
                            );
                            edit.replace(fileUri, fullRange, modifiedCode);
                        } else {
                            edit.createFile(fileUri);
                            edit.insert(fileUri, new vscode.Position(0, 0), modifiedCode);
                        }
                        filesChanged.push(change.file);
                    }
                } else if (change.type === 'delete') {
                    edit.deleteFile(fileUri);
                    filesChanged.push(change.file);
                }
            }

            // Проверяем, есть ли изменения для применения
            if (filesChanged.length === 0) {
                console.warn('No files to modify in solution');
                return {
                    success: true,
                    message: 'Решение не требует изменений файлов',
                    filesChanged: [],
                    codeChanges: 0,
                    executionTime: Date.now() - startTime
                };
            }

            // Применяем все изменения
            const success = await vscode.workspace.applyEdit(edit);
            
            if (!success) {
                // Получаем более детальную информацию об ошибке
                const editSize = filesChanged.length;
                const errorDetails = {
                    filesCount: editSize,
                    files: filesChanged,
                    editSize: JSON.stringify(edit).length
                };
                
                console.error('Failed to apply workspace edits:', errorDetails);
                
                // Пытаемся получить дополнительную информацию об ошибке
                try {
                    // Проверяем, может быть проблема с правами доступа
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        for (const file of filesChanged) {
                            try {
                                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, file);
                                await vscode.workspace.fs.stat(fileUri);
                            } catch (statError: any) {
                                console.error(`File access issue for ${file}:`, statError.message);
                            }
                        }
                    }
                } catch (diagnosticError) {
                    console.debug('Diagnostic check failed:', diagnosticError);
                }
                
                throw new Error(`Не удалось применить изменения к ${editSize} файл(ам). Возможно, файлы заблокированы или нет прав доступа.`);
            }

            return {
                success: true,
                message: `Решение "${solution.solution.title}" успешно реализовано`,
                filesChanged,
                codeChanges: solution.solution.codeChanges.length,
                executionTime: Date.now() - startTime
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Неизвестная ошибка',
                filesChanged,
                codeChanges: 0,
                executionTime: Date.now() - startTime
            };
        }
    }

    /**
     * Построение промпта для генерации кода
     */
    protected buildCodeGenerationPrompt(
        change: AgentSolution['solution']['codeChanges'][0],
        solution: AgentSolution,
        task: Task,
        projectContext: ProjectContext
    ): string {
        return `Ты - ${this.name}. ${this.description}

Задача: ${task.description}
Решение: ${solution.solution.title}
Описание решения: ${solution.solution.description}
Подход: ${solution.solution.approach}

Создай код для файла: ${change.file}
Описание изменений: ${change.description}

Контекст проекта:
- Архитектура: ${projectContext.standards?.architecture || 'не определена'}
- Стиль кода: ${projectContext.standards?.codeStyle || 'не определен'}

Верни только код файла, без объяснений и markdown форматирования.`;
    }

    /**
     * Построение промпта для модификации кода
     */
    protected buildCodeModificationPrompt(
        change: AgentSolution['solution']['codeChanges'][0],
        existingCode: string,
        solution: AgentSolution,
        task: Task,
        projectContext: ProjectContext
    ): string {
        return `Ты - ${this.name}. ${this.description}

Задача: ${task.description}
Решение: ${solution.solution.title}
Описание решения: ${solution.solution.description}
Подход: ${solution.solution.approach}

Модифицируй существующий код в файле: ${change.file}
Описание изменений: ${change.description}

Текущий код файла:
\`\`\`
${existingCode}
\`\`\`

Контекст проекта:
- Архитектура: ${projectContext.standards?.architecture || 'не определена'}
- Стиль кода: ${projectContext.standards?.codeStyle || 'не определен'}

Верни полный модифицированный код файла, без объяснений и markdown форматирования.`;
    }

    /**
     * Анализ задачи (абстрактный метод, реализуется в подклассах)
     */
    protected abstract analyzeTask(task: Task, projectContext: ProjectContext): Promise<{
        problem: string;
        context: string;
        constraints: string[];
    }>;

    /**
     * Генерация вариантов решения (абстрактный метод)
     */
    protected abstract generateOptions(
        task: Task,
        projectContext: ProjectContext,
        analysis: { problem: string; context: string; constraints: string[] }
    ): Promise<SolutionOption[]>;

    /**
     * Выбор лучшего варианта (абстрактный метод)
     */
    protected abstract selectBestOption(
        options: SolutionOption[],
        task: Task,
        projectContext: ProjectContext
    ): Promise<SolutionOption>;

    /**
     * Генерация обоснования выбора
     */
    protected async generateReasoning(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): Promise<string> {
        // Используем LLM для генерации обоснования
        const prompt = this.buildReasoningPrompt(option, task, projectContext);
        const reasoning = await this.callLLM(prompt);
        return reasoning;
    }

    /**
     * Создание плана реализации
     */
    protected async createImplementationPlan(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): Promise<string[]> {
        const prompt = this.buildImplementationPlanPrompt(option, task, projectContext);
        const planText = await this.callLLM(prompt);
        // Парсим план из текста (предполагаем список шагов)
        const steps = planText.split('\n')
            .filter(line => line.trim().match(/^\d+[\.\)]\s+/))
            .map(line => line.replace(/^\d+[\.\)]\s+/, '').trim());
        return steps.length > 0 ? steps : [planText];
    }

    /**
     * Планирование изменений кода
     */
    protected async planCodeChanges(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): Promise<AgentSolution['solution']['codeChanges']> {
        const changes: AgentSolution['solution']['codeChanges'] = [];

        for (const file of option.filesToModify) {
            const changeType = projectContext.structure.files.includes(file) ? 'modify' : 'create';
            changes.push({
                file,
                type: changeType,
                description: `Изменения в ${file} для реализации ${option.title}`,
                estimatedLines: await this.estimateLines(file, option, projectContext)
            });
        }

        return changes;
    }

    /**
     * Анализ зависимостей решения
     */
    protected async analyzeDependencies(
        option: SolutionOption,
        projectContext: ProjectContext
    ): Promise<AgentSolution['solution']['dependencies']> {
        const affectedFiles = new Set<string>();

        for (const file of option.filesToModify) {
            affectedFiles.add(file);
            // Добавляем зависимости файла
            if (projectContext.dependencies && projectContext.dependencies[file]) {
                projectContext.dependencies[file].forEach(dep => affectedFiles.add(dep));
            }
        }

        // Определяем уровень влияния
        let impact: 'low' | 'medium' | 'high' = 'low';
        if (affectedFiles.size > 10) {
            impact = 'high';
        } else if (affectedFiles.size > 5) {
            impact = 'medium';
        }

        return {
            files: Array.from(affectedFiles),
            impact
        };
    }

    /**
     * Оценка решения
     */
    protected async evaluateSolution(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): Promise<AgentSolution['evaluation']> {
        // Используем LLM для оценки решения
        const prompt = this.buildEvaluationPrompt(option, task, projectContext);
        const evaluationText = await this.callLLM(prompt);
        
        // Парсим оценку из ответа LLM
        const evaluation = this.parseEvaluation(evaluationText);
        
        // Вычисляем общий балл
        const overallScore = (
            evaluation.quality * 0.25 +
            evaluation.performance * 0.20 +
            evaluation.security * 0.20 +
            evaluation.maintainability * 0.20 +
            evaluation.compliance * 0.15
        );

        return {
            ...evaluation,
            overallScore
        };
    }

    /**
     * Установка выбранной модели для агента
     */
    setSelectedModel(model: LanguageModelInfo | undefined): void {
        this.selectedModel = model;
    }

    /**
     * Получение выбранной модели агента
     */
    getSelectedModel(): LanguageModelInfo | undefined {
        return this.selectedModel;
    }

    /**
     * Вызов LLM через CursorAI API
     * Использует выбранную модель или автоматический выбор CursorAI
     * Создает/обновляет фонового агента CursorAI при необходимости
     */
    protected async callLLM(prompt: string): Promise<string> {
        try {
            // Получаем выбранную модель для агента
            const selectedModelConfig = await this.settingsManager.getAgentModel(this.id);
            
            // Убеждаемся, что фоновый агент создан/обновлен
            try {
                const agentInstructions = `Ты - ${this.name}. ${this.description}\n\n` +
                    `Твоя задача - помогать пользователю в разработке, предоставляя детальные и точные ответы.`;
                
                const modelId = selectedModelConfig ? selectedModelConfig.id : undefined;
                await CursorAPI.createOrUpdateBackgroundAgent(
                    this.id,
                    this.name,
                    this.description,
                    agentInstructions,
                    modelId
                );
            } catch (bgAgentError) {
                // Если не удалось создать фонового агента, продолжаем без него
                console.debug(`Failed to ensure background agent for ${this.id}:`, bgAgentError);
            }
            
            // Формируем промпт с контекстом агента
            const fullPrompt = `Ты - ${this.name}. ${this.description}\n\n` +
                `Твоя задача: ${prompt}\n\n` +
                `Отвечай как специалист в своей области, предоставляя детальные и точные ответы.`;

            // Отправляем сообщение через CursorAI API
            // Фоновый агент уже настроен с нужной моделью, поэтому просто отправляем сообщение
            const response = await CursorAPI.sendMessageToAgent(this.id, fullPrompt);
            return response || '';
        } catch (error: any) {
            console.error(`Error calling LLM for agent ${this.id}:`, error);
            
            // Fallback: пытаемся использовать базовый метод без указания модели
            try {
                const fallbackPrompt = `Ты - ${this.name}. ${this.description}\n\n` +
                    `Твоя задача: ${prompt}\n\n` +
                    `Отвечай как специалист в своей области, предоставляя детальные и точные ответы.`;
                
                const response = await CursorAPI.sendMessageToAgent(this.id, fallbackPrompt);
                return response || '';
            } catch (fallbackError) {
                console.error(`Fallback also failed for agent ${this.id}:`, fallbackError);
                // Возвращаем пустую строку, чтобы агенты могли обработать отсутствие ответа
                // и использовать fallback варианты решений
                return '';
            }
        }
    }

    /**
     * Публикация размышлений
     */
    protected publishThoughts(thoughts: AgentThoughts): void {
        if (this.thoughtsCallback) {
            this.thoughtsCallback(thoughts);
        }
    }

    /**
     * Построение промпта для обоснования (абстрактный метод)
     */
    protected abstract buildReasoningPrompt(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): string;

    /**
     * Построение промпта для плана реализации
     */
    protected buildImplementationPlanPrompt(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): string {
        return `Создай детальный план реализации следующего решения:

Задача: ${task.description}
Решение: ${option.title}
Описание: ${option.description}
Подход: ${option.approach}

Файлы для изменения: ${option.filesToModify.join(', ')}

Создай пошаговый план реализации. Каждый шаг должен быть конкретным и выполнимым.`;
    }

    /**
     * Построение промпта для оценки
     */
    protected buildEvaluationPrompt(
        option: SolutionOption,
        task: Task,
        projectContext: ProjectContext
    ): string {
        return `Оцени следующее решение по критериям (от 0 до 1):

Задача: ${task.description}
Решение: ${option.title}
Описание: ${option.description}

Оцени по критериям:
- quality: качество кода (читаемость, поддерживаемость)
- performance: производительность
- security: безопасность
- maintainability: поддерживаемость
- compliance: соответствие стандартам проекта

Верни ответ в формате JSON:
{
  "quality": 0.9,
  "performance": 0.8,
  "security": 0.9,
  "maintainability": 0.85,
  "compliance": 0.9
}`;
    }

    /**
     * Парсинг оценки из ответа LLM
     */
    protected parseEvaluation(text: string): AgentSolution['evaluation'] {
        try {
            // Пытаемся найти JSON в тексте
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    quality: parsed.quality || 0.5,
                    performance: parsed.performance || 0.5,
                    security: parsed.security || 0.5,
                    maintainability: parsed.maintainability || 0.5,
                    compliance: parsed.compliance || 0.5,
                    overallScore: 0.5
                };
            }
        } catch (error) {
            console.error('Error parsing evaluation:', error);
        }

        // Возвращаем значения по умолчанию
        return {
            quality: 0.5,
            performance: 0.5,
            security: 0.5,
            maintainability: 0.5,
            compliance: 0.5,
            overallScore: 0.5
        };
    }

    /**
     * Оценка количества строк кода
     */
    protected async estimateLines(
        file: string,
        option: SolutionOption,
        projectContext: ProjectContext
    ): Promise<number> {
        // Простая эвристика: базируемся на сложности решения
        const baseLines = option.complexity === 'high' ? 200 : option.complexity === 'medium' ? 100 : 50;
        return baseLines;
    }

    /**
     * Получение ID агента
     */
    getId(): string {
        return this.id;
    }

    /**
     * Получение имени агента
     */
    getName(): string {
        return this.name;
    }

    /**
     * Получение описания агента
     */
    getDescription(): string {
        return this.description;
    }

    /**
     * Сохранение контекста агента
     */
    setContext(key: string, value: any): void {
        this.agentContext.set(key, value);
    }

    /**
     * Получение контекста агента
     */
    getContext(key: string): any {
        return this.agentContext.get(key);
    }

    /**
     * Общий метод для парсинга JSON опций из ответа LLM
     * Улучшенная версия, которая игнорирует промпт и извлекает только JSON
     */
    protected parseJSONOptions(text: string, agentName: string): Omit<SolutionOption, 'id'>[] {
        try {
            // Проверяем, не является ли это fallback заглушкой
            if (text.includes('Agent ') && text.includes(' received message:')) {
                console.warn(`${agentName}: Received fallback message, skipping JSON parsing`);
                throw new Error('Fallback message received - no real response from API');
            }

            // Удаляем промпт из начала текста, если он там есть
            let cleanedText = text;
            
            // Удаляем строки, которые выглядят как промпт
            const promptPatterns = [
                /^.*?Ты\s*-\s*[^\n]+\n/,
                /^.*?ПРОБЛЕМА:\s*[^\n]+\n/,
                /^.*?КОНТЕКСТ:\s*[^\n]+\n/,
                /^.*?ОГРАНИЧЕНИЯ:\s*[\s\S]*?(?=\n\n|\[)/,
                /^.*?ВАЖНО:[^\n]*\n/,
                /^.*?Тип задачи:[^\n]*\n/,
                /^.*?Приоритет:[^\n]*\n/,
                /^.*?Agent\s+\w+\s+received\s+message:[^\n]*\n/
            ];
            
            for (const pattern of promptPatterns) {
                cleanedText = cleanedText.replace(pattern, '');
            }

            // Удаляем все до первого символа [
            const firstBracket = cleanedText.indexOf('[');
            if (firstBracket > 0) {
                cleanedText = cleanedText.substring(firstBracket);
            }

            // Пытаемся распарсить весь текст как JSON
            try {
                const parsed = JSON.parse(cleanedText.trim());
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (e) {
                // Если не сработало, пробуем найти JSON массив в тексте
            }

            // Ищем JSON массив в тексте (более точный поиск)
            // Ищем массив, который начинается с [ и содержит объекты с полями title, description и т.д.
            const jsonArrayPattern = /\[\s*\{[\s\S]*?"title"[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/;
            const jsonMatch = cleanedText.match(jsonArrayPattern);
            
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                } catch (e) {
                    // Пробуем найти любой JSON массив
                    const simpleArrayMatch = cleanedText.match(/\[[\s\S]*\]/);
                    if (simpleArrayMatch) {
                        try {
                            // Пытаемся найти полный массив, даже если он обрезан
                            let arrayText = simpleArrayMatch[0];
                            
                            // Если массив не закрыт, пытаемся его закрыть
                            if (!arrayText.endsWith(']')) {
                                // Считаем открывающие и закрывающие скобки
                                let openBraces = (arrayText.match(/\{/g) || []).length;
                                let closeBraces = (arrayText.match(/\}/g) || []).length;
                                
                                // Закрываем объекты и массив
                                while (closeBraces < openBraces) {
                                    arrayText += '}';
                                    closeBraces++;
                                }
                                arrayText += ']';
                            }
                            
                            const parsed = JSON.parse(arrayText);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                return parsed;
                            }
                        } catch (e2) {
                            // Игнорируем ошибки парсинга
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`${agentName}: Error parsing options:`, error);
            console.error(`${agentName}: Response text was:`, text.substring(0, 500));
        }

        return [];
    }
}
