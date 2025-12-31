/**
 * Versioned Mock Factories
 * Централизованное создание mock объектов с автоматической миграцией при breaking changes
 * 
 * INTENT: DRY principle для mock data
 * ПОЧЕМУ: Дублирование mock setup кода в 50+ тестах приводит к maintenance hell
 * ПОСЛЕДСТВИЯ: При изменении интерфейсов нужно обновить только factory, не все тесты
 */

/**
 * Версия mock factories для tracking breaking changes
 * Увеличивайте при изменении структуры любого mock
 */
export const MOCK_FACTORY_VERSION = '1.0.0';

/**
 * Task priorities
 */
export type TaskPriority = 'immediate' | 'high' | 'medium' | 'low';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Task type
 */
export interface Task {
    id: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    assignedAgent: string | null;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    result?: any;
    error?: Error;
    metadata?: Record<string, any>;
}

/**
 * Agent type
 */
export type AgentType = 'backend' | 'frontend' | 'architect' | 'analyst' | 'devops' | 'qa' | 'orchestrator' | 'virtual-user';

/**
 * Agent capabilities
 */
export interface AgentCapabilities {
    languages?: string[];
    frameworks?: string[];
    specializations?: string[];
    maxConcurrentTasks?: number;
}

/**
 * Agent interface
 */
export interface Agent {
    id: string;
    type: AgentType;
    name: string;
    status: 'idle' | 'busy' | 'offline';
    capabilities: AgentCapabilities;
    currentTasks: Task[];
    completedTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
}

/**
 * Model provider configuration
 */
export interface ModelProviderConfig {
    provider: 'ollama' | 'openai' | 'anthropic' | 'google' | 'llm-studio' | 'cursorai';
    model: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
}

/**
 * INTENT: Создание mock Task с reasonable defaults
 * ПОЧЕМУ: Task - core entity, используется в 90% тестов
 * ПОСЛЕДСТВИЯ: Централизованный mock упрощает тестирование TaskQueue, AgentWorker, SwarmOrchestrator
 */
export function mockTask(overrides: Partial<Task> = {}): Task {
    const now = new Date();

    return {
        id: `task-${Math.random().toString(36).substr(2, 9)}`,
        description: 'Test task description',
        priority: 'medium',
        status: 'pending',
        assignedAgent: null,
        createdAt: now,
        updatedAt: now,
        metadata: {},
        ...overrides,
    };
}

/**
 * INTENT: Создание массива mock Tasks с разными priorities
 * ПОЧЕМУ: TaskQueue тесты требуют multiple tasks для проверки prioritization
 * ПОСЛЕДСТВИЯ: Упрощает setup для priority-based sorting тестов
 */
export function mockTasks(count: number, baseOverrides: Partial<Task> = {}): Task[] {
    const priorities: TaskPriority[] = ['immediate', 'high', 'medium', 'low'];

    return Array.from({ length: count }, (_, index) => {
        const priority = priorities[index % priorities.length];

        return mockTask({
            id: `task-${index + 1}`,
            description: `Test task ${index + 1}`,
            priority,
            ...baseOverrides,
        });
    });
}

/**
 * INTENT: Создание mock Agent с реалистичной конфигурацией
 * ПОЧЕМУ: Agent - второй core entity после Task
 * ПОСЛЕДСТВИЯ: Упрощает тестирование AgentWorker, MessageBus, SwarmOrchestrator
 */
export function mockAgent(type: AgentType, overrides: Partial<Agent> = {}): Agent {
    const capabilitiesMap: Record<AgentType, AgentCapabilities> = {
        backend: {
            languages: ['TypeScript', 'JavaScript', 'Node.js'],
            frameworks: ['Express', 'NestJS'],
            specializations: ['API development', 'Database design', 'Backend logic'],
            maxConcurrentTasks: 3,
        },
        frontend: {
            languages: ['TypeScript', 'JavaScript', 'HTML', 'CSS'],
            frameworks: ['React', 'Vue', 'Angular'],
            specializations: ['UI development', 'Responsive design', 'Accessibility'],
            maxConcurrentTasks: 3,
        },
        architect: {
            languages: ['TypeScript', 'JavaScript'],
            frameworks: [],
            specializations: ['System design', 'Architecture patterns', 'Scalability'],
            maxConcurrentTasks: 2,
        },
        analyst: {
            languages: ['TypeScript', 'JavaScript', 'SQL'],
            frameworks: [],
            specializations: ['Performance analysis', 'Data analysis', 'Optimization'],
            maxConcurrentTasks: 2,
        },
        devops: {
            languages: ['Bash', 'YAML', 'Dockerfile'],
            frameworks: ['Docker', 'Kubernetes'],
            specializations: ['CI/CD', 'Infrastructure', 'Deployment'],
            maxConcurrentTasks: 2,
        },
        qa: {
            languages: ['TypeScript', 'JavaScript'],
            frameworks: ['Jest', 'Cypress'],
            specializations: ['Unit testing', 'Integration testing', 'E2E testing'],
            maxConcurrentTasks: 3,
        },
        orchestrator: {
            languages: ['TypeScript'],
            frameworks: [],
            specializations: ['Task coordination', 'Agent management', 'Workflow orchestration'],
            maxConcurrentTasks: 10,
        },
        'virtual-user': {
            languages: ['TypeScript'],
            frameworks: [],
            specializations: ['Decision making', 'Goal evaluation', 'User simulation'],
            maxConcurrentTasks: 5,
        },
    };

    return {
        id: `agent-${type}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
        status: 'idle',
        capabilities: capabilitiesMap[type],
        currentTasks: [],
        completedTasks: 0,
        failedTasks: 0,
        averageExecutionTime: 0,
        ...overrides,
    };
}

/**
 * INTENT: Создание mock ModelProviderConfig для разных провайдеров
 * ПОЧЕМУ: HybridModelProvider требует конфигурации для 6 провайдеров
 * ПОСЛЕДСТВИЯ: Упрощает тестирование model selection, cost optimization, fallbacks
 */
export function mockModelProvider(
    provider: ModelProviderConfig['provider'],
    overrides: Partial<ModelProviderConfig> = {}
): ModelProviderConfig {
    const defaultConfigs: Record<ModelProviderConfig['provider'], Partial<ModelProviderConfig>> = {
        ollama: {
            model: 'codellama',
            baseUrl: 'http://localhost:11434',
            temperature: 0.7,
            maxTokens: 2000,
        },
        openai: {
            model: 'gpt-4o',
            apiKey: 'sk-mock-openai-key-for-testing-only',
            baseUrl: 'https://api.openai.com/v1',
            temperature: 0.7,
            maxTokens: 4000,
        },
        anthropic: {
            model: 'claude-3-5-sonnet-20241022',
            apiKey: 'sk-mock-anthropic-key-for-testing-only',
            baseUrl: 'https://api.anthropic.com/v1',
            temperature: 0.7,
            maxTokens: 4000,
        },
        google: {
            model: 'gemini-pro',
            apiKey: 'mock-google-key-for-testing-only',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            temperature: 0.7,
            maxTokens: 2000,
        },
        'llm-studio': {
            model: 'local-model',
            baseUrl: 'http://localhost:11434',
            temperature: 0.7,
            maxTokens: 2000,
        },
        cursorai: {
            model: 'gpt-4o',
            apiKey: 'mock-cursor-key-for-testing-only',
            baseUrl: 'https://api.cursor.com',
            temperature: 0.7,
            maxTokens: 4000,
        },
    };

    return {
        provider,
        ...defaultConfigs[provider],
        ...overrides,
    } as ModelProviderConfig;
}

/**
 * INTENT: Создание mock LLM response
 * ПОЧЕМУ: Все LLM provider тесты требуют simulated responses
 * ПОСЛЕДСТВИЯ: Упрощает тестирование без real API calls (экономия $$ и времени)
 */
export function mockLLMResponse(overrides: {
    content?: string;
    model?: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    finishReason?: 'stop' | 'length' | 'content_filter';
} = {}): any {
    return {
        content: overrides.content || 'Mock LLM response content',
        model: overrides.model || 'mock-model',
        usage: overrides.usage || {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
        },
        finishReason: overrides.finishReason || 'stop',
    };
}

/**
 * INTENT: Создание mock DependencyGraph для ProjectDependencyGraph тестов
 * ПОЧЕМУ: Исходная задача "avoid overcalculating all vertices" касается dependency graph
 * ПОСЛЕДСТВИЯ: Критично для performance regression tests
 */
export function mockDependencyGraph(fileCount: number = 10): any {
    const files: Record<string, any> = {};

    for (let i = 0; i < fileCount; i++) {
        const filePath = `src/file-${i}.ts`;
        files[filePath] = {
            exports: [`export${i}`, `Export${i}Class`],
            imports: i > 0 ? [`src/file-${i - 1}.ts`] : [],
            dependencies: {
                classes: [`Class${i}`],
                functions: [`function${i}`],
                types: [`Type${i}`],
                variables: [`var${i}`],
            },
            dependents: i < fileCount - 1 ? [`src/file-${i + 1}.ts`] : [],
        };
    }

    return {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        files,
        indexes: {
            byExport: Object.keys(files).reduce((acc, file) => {
                files[file].exports.forEach((exp: string) => {
                    if (!acc[exp]) {
                        acc[exp] = [];
                    }
                    acc[exp].push(file);
                });
                return acc;
            }, {} as Record<string, string[]>),
            byImport: {},
        },
    };
}

/**
 * INTENT: Migration helper для старых тестов при breaking changes
 * ПОЧЕМУ: Когда интерфейсы меняются, нужен способ автоматически обновить старые mocks
 * ПОСЛЕДСТВИЯ: Предотвращает массовое падение тестов при refactoring
 */
export function migrateTask(oldTask: any, targetVersion: string = MOCK_FACTORY_VERSION): Task {
    // В будущем здесь будет логика миграции между версиями
    // Пример: если oldTask из версии 0.9.0 и нужна 1.0.0, применяем transformations

    // Для v1.0.0 просто валидируем что есть обязательные поля
    if (!oldTask.id || !oldTask.description) {
        throw new Error('Invalid task: missing required fields');
    }

    return mockTask(oldTask);
}
