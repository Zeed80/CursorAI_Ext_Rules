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
exports.SelfLearningOrchestrator = void 0;
const vscode = __importStar(require("vscode"));
const orchestrator_1 = require("./orchestrator");
const backend_agent_1 = require("../agents/backend-agent");
const frontend_agent_1 = require("../agents/frontend-agent");
const architect_agent_1 = require("../agents/architect-agent");
const analyst_agent_1 = require("../agents/analyst-agent");
const devops_agent_1 = require("../agents/devops-agent");
const qa_agent_1 = require("../agents/qa-agent");
const brainstorming_manager_1 = require("./brainstorming-manager");
const solution_evaluator_1 = require("./solution-evaluator");
const project_dependency_graph_1 = require("./project-dependency-graph");
const project_knowledge_base_1 = require("./project-knowledge-base");
const learning_engine_1 = require("./learning-engine");
const quality_checker_1 = require("./quality-checker");
const cursor_api_1 = require("../integration/cursor-api");
/**
 * Самообучаемый оркестратор
 * Расширяет базовый Orchestrator функциями:
 * - Мозговой штурм с несколькими агентами
 * - Самообучение на основе истории решений
 * - Работа с картой зависимостей проекта
 * - Интеграция с локальными агентами
 */
class SelfLearningOrchestrator extends orchestrator_1.Orchestrator {
    constructor(context, settingsManager, agentsStatusTreeProvider) {
        super(context, settingsManager);
        this.localAgents = new Map();
        this.thoughtsCallbacks = new Map();
        this.brainstormingManager = new brainstorming_manager_1.BrainstormingManager();
        this.dependencyGraph = new project_dependency_graph_1.ProjectDependencyGraph();
        this.knowledgeBase = new project_knowledge_base_1.ProjectKnowledgeBase();
        this.solutionEvaluator = new solution_evaluator_1.SolutionEvaluator(this.dependencyGraph);
        this.learningEngine = new learning_engine_1.LearningEngine(this.knowledgeBase);
        this.qualityChecker = new quality_checker_1.QualityChecker(this.dependencyGraph, this.knowledgeBase);
        this.agentsStatusTreeProvider = agentsStatusTreeProvider;
        // Инициализация агентов асинхронно (не блокируем конструктор)
        this.initializeLocalAgents(context).catch(error => {
            console.error('Error initializing local agents:', error);
        });
    }
    /**
     * Инициализация локальных агентов
     */
    async initializeLocalAgents(context) {
        const agents = [
            new backend_agent_1.BackendAgent(context),
            new frontend_agent_1.FrontendAgent(context),
            new architect_agent_1.ArchitectAgent(context),
            new analyst_agent_1.AnalystAgent(context),
            new devops_agent_1.DevOpsAgent(context),
            new qa_agent_1.QAAgent(context)
        ];
        // Регистрируем всех агентов параллельно
        await Promise.all(agents.map(async (agent) => {
            this.localAgents.set(agent.getId(), agent);
            // Загружаем сохраненную модель для агента
            const savedModel = this.settingsManager.getAgentModel(agent.getId());
            if (savedModel) {
                agent.setSelectedModel(savedModel);
            }
            // Регистрируем агента в AgentManager
            this.agentManager.registerLocalAgent(agent);
            // Обновляем статус агента с информацией о модели
            if (this.agentsStatusTreeProvider) {
                this.agentsStatusTreeProvider.updateAgentStatus(agent.getId(), {
                    selectedModel: savedModel
                });
            }
            // Регистрируем агента через CursorAPI (создает правила)
            await cursor_api_1.CursorAPI.registerAgent({
                id: agent.getId(),
                name: agent.getName(),
                description: agent.getDescription(),
                enabled: true
            });
            // Создаем или обновляем фонового агента CursorAI с сохраненной моделью
            try {
                const agentInstructions = `Ты - ${agent.getName()}. ${agent.getDescription()}\n\n` +
                    `Твоя задача - помогать пользователю в разработке, предоставляя детальные и точные ответы.`;
                const modelId = savedModel ? savedModel.id : undefined;
                const backgroundAgentId = await cursor_api_1.CursorAPI.createOrUpdateBackgroundAgent(agent.getId(), agent.getName(), agent.getDescription(), agentInstructions, modelId);
                if (backgroundAgentId) {
                    console.log(`Background agent ${backgroundAgentId} created/updated for agent ${agent.getId()} during initialization`);
                }
                else {
                    console.debug(`Background agent not created for agent ${agent.getId()} (API may not be available)`);
                }
            }
            catch (bgAgentError) {
                console.debug(`Failed to create background agent for ${agent.getId()} during initialization:`, bgAgentError.message);
                // Продолжаем выполнение, даже если не удалось создать фонового агента
            }
            // Устанавливаем callback для размышлений
            agent.setThoughtsCallback((thoughts) => {
                const callback = this.thoughtsCallbacks.get(thoughts.agentId);
                if (callback) {
                    callback(thoughts);
                }
                // Обновляем размышления в AgentManager
                this.agentManager.updateAgentThoughts(thoughts.agentId, thoughts);
            });
        }));
    }
    /**
     * Запуск оркестратора с инициализацией всех компонентов
     */
    async start() {
        await super.start();
        // Инициализация карты зависимостей
        await this.dependencyGraph.initialize();
        // Инициализация базы знаний
        await this.knowledgeBase.initialize();
        // Загрузка стратегий обучения
        await this.learningEngine.loadStrategies();
        // Запуск периодического обучения
        this.startLearningCycle();
        // Ждем завершения инициализации агентов перед диагностикой
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Диагностика агентов после инициализации
        await this.diagnoseAgents();
        console.log('SelfLearningOrchestrator started with all components initialized');
    }
    /**
     * Диагностика всех агентов для выявления проблем
     */
    async diagnoseAgents() {
        console.log('Starting agent diagnostics...');
        for (const [agentId, agent] of this.localAgents.entries()) {
            try {
                const diagnostics = await this.diagnoseAgent(agentId, agent);
                // Обновляем статус агента в AgentManager
                this.getAgentManager().updateAgentStatus(agentId, {
                    status: diagnostics.llmAvailable && diagnostics.agentInitialized ? 'idle' : 'error',
                    errorMessage: this.buildErrorMessage(diagnostics),
                    diagnostics: diagnostics
                });
                // Обновляем статус в UI
                if (this.agentsStatusTreeProvider) {
                    this.agentsStatusTreeProvider.updateAgentStatus(agentId, {
                        status: diagnostics.llmAvailable && diagnostics.agentInitialized ? 'idle' : 'error',
                        errorMessage: this.buildErrorMessage(diagnostics),
                        diagnostics: diagnostics
                    });
                }
            }
            catch (error) {
                console.error(`Error diagnosing agent ${agentId}:`, error);
                this.getAgentManager().updateAgentStatus(agentId, {
                    status: 'error',
                    errorMessage: `Ошибка диагностики: ${error.message}`,
                    diagnostics: {
                        llmAvailable: false,
                        llmError: error.message,
                        agentRegistered: false,
                        agentInitialized: false,
                        lastCheckTime: new Date()
                    }
                });
            }
        }
    }
    /**
     * Диагностика отдельного агента
     */
    async diagnoseAgent(agentId, agent) {
        const diagnostics = {
            llmAvailable: false,
            agentRegistered: false,
            agentInitialized: false,
            lastCheckTime: new Date()
        };
        // Проверка доступности LLM
        try {
            const [model] = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o'
            });
            if (model) {
                diagnostics.llmAvailable = true;
            }
            else {
                diagnostics.llmError = 'Не найдена подходящая языковая модель. Убедитесь, что установлен GitHub Copilot или другой провайдер LLM.';
            }
        }
        catch (error) {
            diagnostics.llmError = `Ошибка доступа к LLM: ${error.message}. Возможно, API vscode.lm недоступен или не настроен.`;
        }
        // Проверка регистрации агента
        const registeredAgent = this.getAgentManager().getLocalAgent(agentId);
        diagnostics.agentRegistered = registeredAgent !== undefined;
        // Проверка инициализации агента
        diagnostics.agentInitialized = agent !== undefined && agent !== null;
        return diagnostics;
    }
    /**
     * Построение сообщения об ошибке на основе диагностики
     */
    buildErrorMessage(diagnostics) {
        if (!diagnostics) {
            return 'Диагностика не выполнена';
        }
        const errors = [];
        if (!diagnostics.llmAvailable) {
            errors.push(diagnostics.llmError || 'LLM недоступен');
        }
        if (!diagnostics.agentRegistered) {
            errors.push('Агент не зарегистрирован в системе');
        }
        if (!diagnostics.agentInitialized) {
            errors.push('Агент не инициализирован');
        }
        return errors.length > 0 ? errors.join('; ') : undefined;
    }
    /**
     * Остановка оркестратора
     */
    async stop() {
        if (this.learningInterval) {
            clearInterval(this.learningInterval);
            this.learningInterval = undefined;
        }
        this.brainstormingManager.dispose();
        this.dependencyGraph.dispose();
        await this.knowledgeBase.saveKnowledge();
        await this.learningEngine.saveStrategies();
        await super.stop();
    }
    /**
     * Инициация мозгового штурма для задачи
     */
    async initiateBrainstorming(task, agentIds, thoughtsCallback) {
        // Если агенты не указаны, используем рекомендации от learning engine
        const recommendedAgents = agentIds || this.learningEngine.recommendAgents(task, Array.from(this.localAgents.keys()));
        // Сохраняем callback для размышлений
        if (thoughtsCallback) {
            recommendedAgents.forEach(agentId => {
                this.thoughtsCallbacks.set(agentId, (thoughts) => thoughtsCallback(agentId, thoughts));
            });
        }
        // Получаем контекст проекта
        const projectContext = await this.buildProjectContext();
        // Инициируем мозговой штурм
        const session = await this.brainstormingManager.initiateBrainstorming(task, recommendedAgents, this.localAgents, projectContext, thoughtsCallback);
        // Ждем завершения всех агентов
        const solutions = await this.brainstormingManager.waitForAllAgents(session.id);
        // Консолидируем решения
        const consolidated = await this.brainstormingManager.consolidateSolutions(solutions);
        // Оцениваем решения
        const ranked = await this.solutionEvaluator.compareSolutions(solutions, projectContext);
        consolidated.bestSolution = ranked.best.solution;
        return consolidated;
    }
    /**
     * Выполнение задачи с мозговым штурмом
     */
    async executeTaskWithBrainstorming(taskId, thoughtsCallback) {
        const task = this.getTask(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        task.status = 'in-progress';
        try {
            // Инициируем мозговой штурм
            const consolidated = await this.initiateBrainstorming(task, undefined, thoughtsCallback);
            // Проверяем, идеально ли решение
            const evaluation = await this.solutionEvaluator.evaluateSolution(consolidated.bestSolution, await this.buildProjectContext());
            let finalSolution = consolidated.bestSolution;
            // Если решение не идеально, дорабатываем его
            if (evaluation.score < 0.8) {
                console.log(`Solution score ${evaluation.score} is below threshold, refining...`);
                const feedback = this.generateRefinementFeedback(evaluation);
                const agent = this.localAgents.get(finalSolution.agentId);
                if (agent) {
                    const refined = await this.brainstormingManager.refineSolution(finalSolution, feedback, agent, task, await this.buildProjectContext());
                    const refinedEvaluation = await this.solutionEvaluator.evaluateSolution(refined, await this.buildProjectContext());
                    if (refinedEvaluation.score > evaluation.score) {
                        finalSolution = refined;
                    }
                }
            }
            // Выполняем решение
            const agent = this.localAgents.get(finalSolution.agentId);
            if (!agent) {
                throw new Error(`Agent ${finalSolution.agentId} not found`);
            }
            const projectContext = await this.buildProjectContext();
            const executionResult = await agent.executeSolution(finalSolution, task, projectContext);
            // Сохраняем решение в историю
            await this.recordDecision(task, finalSolution, executionResult, evaluation);
            // Обновляем статус задачи
            if (executionResult.success) {
                task.status = 'completed';
                task.executionResult = {
                    success: true,
                    message: executionResult.message,
                    filesChanged: executionResult.filesChanged,
                    codeChanges: executionResult.codeChanges
                };
                // Обновляем статус задачи в базовом классе
                this.updateTaskStatus(task.id, 'completed', true);
                // Обновляем статус агента
                this.agentManager.updateAgentStatus(finalSolution.agentId, {
                    status: 'idle',
                    currentTask: undefined,
                    lastActivity: new Date()
                });
            }
            else {
                task.status = 'blocked';
                task.executionResult = {
                    success: false,
                    error: executionResult.error
                };
                // Обновляем статус задачи в базовом классе
                this.updateTaskStatus(task.id, 'blocked', false, executionResult.error);
            }
        }
        catch (error) {
            console.error(`Error executing task with brainstorming:`, error);
            task.status = 'blocked';
            task.executionResult = {
                success: false,
                error: error.message || 'Unknown error'
            };
        }
    }
    /**
     * Построение контекста проекта
     */
    async buildProjectContext() {
        const knowledge = this.knowledgeBase.getKnowledge();
        const profile = knowledge?.profile || null;
        // Получаем зависимости из графа
        const dependencies = {};
        if (knowledge?.dependencies) {
            Object.keys(knowledge.dependencies.files || {}).forEach(filePath => {
                const depInfo = this.dependencyGraph.getDependencies(filePath);
                if (depInfo) {
                    dependencies[filePath] = depInfo.imports;
                }
            });
        }
        return {
            structure: knowledge?.structure || {
                files: [],
                directories: [],
                entryPoints: []
            },
            dependencies,
            patterns: knowledge?.patterns.map(p => p.name) || [],
            standards: {
                codeStyle: profile?.codeStyle,
                architecture: profile?.architecture
            },
            knowledge: knowledge ? {
                metrics: knowledge.metrics,
                history: knowledge.history.slice(-10) // Последние 10 решений
            } : {}
        };
    }
    /**
     * Запись решения в историю
     */
    async recordDecision(task, solution, executionResult, evaluation) {
        const decision = {
            id: `decision-${Date.now()}`,
            taskId: task.id,
            timestamp: new Date(),
            decision: {
                type: 'selected',
                solutionId: solution.id,
                agentId: solution.agentId,
                reasoning: solution.reasoning
            },
            outcome: {
                success: executionResult.success,
                executionTime: executionResult.executionTime || 0,
                filesChanged: executionResult.filesChanged?.length || 0,
                quality: evaluation.score,
                issues: evaluation.weaknesses
            },
            lessons: [
                ...evaluation.strengths.map((s) => `Сильная сторона: ${s}`),
                ...evaluation.weaknesses.map((w) => `Слабая сторона: ${w}`),
                ...evaluation.recommendations.map((r) => `Рекомендация: ${r}`)
            ]
        };
        this.knowledgeBase.addDecision(decision);
        await this.knowledgeBase.saveKnowledge();
    }
    /**
     * Генерация обратной связи для доработки решения
     */
    generateRefinementFeedback(evaluation) {
        const feedback = [
            'Текущее решение требует доработки:',
            ...evaluation.weaknesses.map((w) => `- ${w}`),
            '',
            'Рекомендации:',
            ...evaluation.recommendations.map((r) => `- ${r}`)
        ].join('\n');
        return feedback;
    }
    /**
     * Запуск цикла обучения
     */
    startLearningCycle() {
        // Обучение каждые 24 часа
        this.learningInterval = setInterval(async () => {
            try {
                await this.learningEngine.learn();
                await this.learningEngine.saveStrategies();
                console.log('Learning cycle completed');
            }
            catch (error) {
                console.error('Error in learning cycle:', error);
            }
        }, 86400000); // 24 часа
        // Первое обучение сразу после запуска (если есть история)
        setTimeout(async () => {
            try {
                await this.learningEngine.learn();
            }
            catch (error) {
                console.error('Error in initial learning:', error);
            }
        }, 5000);
    }
    /**
     * Получение графа зависимостей
     */
    getDependencyGraph() {
        return this.dependencyGraph;
    }
    /**
     * Получение базы знаний
     */
    getKnowledgeBase() {
        return this.knowledgeBase;
    }
    /**
     * Получение локальных агентов
     */
    getLocalAgents() {
        return this.localAgents;
    }
    /**
     * Переопределение executeTask для использования мозгового штурма и проверки качества
     */
    async executeTask(taskId) {
        const task = this.getTasks().find(t => t.id === taskId);
        if (!task) {
            console.error(`Task ${taskId} not found`);
            return;
        }
        // Специальная обработка задач проверки качества
        if (task.type === 'quality-check') {
            await this.executeQualityCheckTask(task);
        }
        else {
            // Используем новый метод с мозговым штурмом для обычных задач
            await this.executeTaskWithBrainstorming(taskId);
        }
    }
    /**
     * Выполнение задачи проверки качества
     */
    async executeQualityCheckTask(mainTask) {
        console.log(`SelfLearningOrchestrator: Executing quality check task ${mainTask.id}`);
        try {
            mainTask.status = 'in-progress';
            mainTask.progress = {
                filesChanged: 0,
                timeElapsed: 0,
                isActive: true,
                lastActivity: new Date()
            };
            // Создаем подзадачи для проверки качества через QualityChecker
            const scope = this.extractScopeFromDescription(mainTask.description);
            await this.qualityChecker.createQualityCheckSubTasks(this, mainTask.id, scope);
            // Ждем завершения всех подзадач
            const allSubTasks = this.getTasks().filter(t => t.parentTaskId === mainTask.id);
            await this.waitForSubTasksCompletion(allSubTasks);
            // Консолидируем результаты
            const report = await this.qualityChecker.consolidateQualityCheckResults(mainTask, allSubTasks, this);
            // Генерируем рекомендации
            const recommendations = await this.qualityChecker.analyzeQualityResults(report);
            // Сохраняем отчет в задачу
            mainTask.status = 'completed';
            mainTask.qualityCheckResults = report.results;
            mainTask.executionResult = {
                success: true,
                message: `Проверка качества завершена. Общая оценка: ${(report.overallScore * 100).toFixed(1)}%.\n\n${report.summary}\n\nРекомендации:\n${recommendations.join('\n')}`,
                filesChanged: [],
                codeChanges: 0
            };
            // Обновляем статус задачи
            this.updateTaskStatus(mainTask.id, 'completed', true);
            // Сохраняем результаты в базу знаний
            await this.knowledgeBase.saveKnowledge();
            console.log(`Quality check completed: ${report.overallScore * 100}%`);
        }
        catch (error) {
            console.error(`Error executing quality check task:`, error);
            mainTask.status = 'blocked';
            mainTask.executionResult = {
                success: false,
                error: error.message || 'Unknown error'
            };
            this.updateTaskStatus(mainTask.id, 'blocked', false, error.message);
        }
    }
    /**
     * Извлечение области проверки из описания задачи
     */
    extractScopeFromDescription(description) {
        const desc = description.toLowerCase();
        if (desc.includes('полн') || desc.includes('full'))
            return 'full';
        if (desc.includes('код') || desc.includes('code'))
            return 'code';
        if (desc.includes('архитектур') || desc.includes('architecture'))
            return 'architecture';
        if (desc.includes('производительн') || desc.includes('performance'))
            return 'performance';
        if (desc.includes('безопасн') || desc.includes('security'))
            return 'security';
        return undefined;
    }
    /**
     * Ожидание завершения всех подзадач
     */
    async waitForSubTasksCompletion(subTasks) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const allCompleted = subTasks.every(t => t.status === 'completed' || t.status === 'blocked');
                if (allCompleted) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 1000); // Проверяем каждую секунду
            // Таймаут через 5 минут
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 300000);
        });
    }
    /**
     * Анализ проекта с обновлением базы знаний
     */
    async analyzeProject() {
        // Сначала вызываем базовый анализ
        await super.analyzeProject();
        // Обновляем базу знаний
        const profile = await this.projectAnalyzer.analyzeProject();
        this.knowledgeBase.updateProfile(profile);
        // Обновляем структуру проекта
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const files = [];
            const directories = [];
            // Собираем информацию о структуре через dependency graph
            const graph = this.dependencyGraph.getGraph();
            if (graph) {
                files.push(...Object.keys(graph.files));
            }
            this.knowledgeBase.updateStructure({
                files,
                directories,
                entryPoints: []
            });
        }
        // Обновляем граф зависимостей
        await this.dependencyGraph.buildGraph();
        // Получаем граф для сохранения в базе знаний
        const graphData = this.dependencyGraph.getGraph();
        this.knowledgeBase.updateDependencies(graphData);
        await this.knowledgeBase.saveKnowledge();
    }
    /**
     * Очистка ресурсов
     */
    dispose() {
        if (this.learningInterval) {
            clearInterval(this.learningInterval);
        }
        this.brainstormingManager.dispose();
        this.dependencyGraph.dispose();
        super.dispose();
    }
}
exports.SelfLearningOrchestrator = SelfLearningOrchestrator;
//# sourceMappingURL=self-learning-orchestrator.js.map