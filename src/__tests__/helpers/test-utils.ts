/**
 * Утилиты для тестирования
 * Предоставляет переиспользуемые helper функции для тестов
 */

import * as vscode from 'vscode';

/**
 * INTENT: Создание mock контекста VS Code
 * ПОЧЕМУ: Все тесты нуждаются в vscode.ExtensionContext для инициализации
 * ПОСЛЕДСТВИЯ: Без этого невозможно протестировать extension.ts и зависимые компоненты
 */
export function createMockVSCodeContext(): vscode.ExtensionContext {
    const context = {
        subscriptions: [],
        workspaceState: {
            get: jest.fn(),
            update: jest.fn(),
            keys: jest.fn(() => []),
        },
        globalState: {
            get: jest.fn(),
            update: jest.fn(),
            keys: jest.fn(() => []),
            setKeysForSync: jest.fn(),
        },
        secrets: {
            get: jest.fn(),
            store: jest.fn(),
            delete: jest.fn(),
            onDidChange: jest.fn(),
        },
        extensionUri: vscode.Uri.file('/mock/extension/path'),
        extensionPath: '/mock/extension/path',
        environmentVariableCollection: {} as any,
        asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
        storageUri: vscode.Uri.file('/mock/storage'),
        storagePath: '/mock/storage',
        globalStorageUri: vscode.Uri.file('/mock/global-storage'),
        globalStoragePath: '/mock/global-storage',
        logUri: vscode.Uri.file('/mock/logs'),
        logPath: '/mock/logs',
        extensionMode: vscode.ExtensionMode.Test,
        extension: {} as any,
    } as vscode.ExtensionContext;

    return context;
}

/**
 * INTENT: Ожидание выполнения асинхронных операций
 * ПОЧЕМУ: Многие компоненты (SwarmOrchestrator, AgentWorker) используют Promise и setTimeout
 * ПОСЛЕДСТВИЯ: Без waitFor тесты будут flaky (race conditions в assertions)
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    options: {
        timeout?: number;
        interval?: number;
        timeoutMessage?: string;
    } = {}
): Promise<void> {
    const { timeout = 5000, interval = 100, timeoutMessage = 'Timeout waiting for condition' } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const result = await Promise.resolve(condition());
        if (result) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(timeoutMessage);
}

/**
 * INTENT: Очистка всех pending Promise в текущем event loop
 * ПОЧЕМУ: Jest может завершить тест до выполнения всех микротасок
 * ПОСЛЕДСТВИЯ: Без flush могут остаться незавершённые Promise приводя к warnings
 */
export async function flushPromises(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

/**
 * INTENT: Создание typed spy функции для моков
 * ПОЧЕМУ: jest.fn() теряет типизацию, что усложняет refactoring
 * ПОСЛЕДСТВИЯ: Type-safe mocks предотвращают ошибки при изменении сигнатур
 */
export function createSpy<T extends (...args: any[]) => any>(
    implementation?: T
): jest.MockedFunction<T> {
    return jest.fn(implementation) as jest.MockedFunction<T>;
}

/**
 * INTENT: Измерение производительности выполнения функции
 * ПОЧЕМУ: Нужно проверять performance requirements (unit tests <40s, updateFile <50ms)
 * ПОСЛЕДСТВИЯ: Без измерений невозможно обнаружить performance regression
 */
export async function measurePerformance<T>(
    fn: () => Promise<T> | T,
    label?: string
): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await Promise.resolve(fn());
    const duration = performance.now() - startTime;

    if (label) {
        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }

    return { result, duration };
}

/**
 * INTENT: Создание mock для EventEmitter
 * ПОЧЕМУ: Многие компоненты (MessageBus, FileWatcher) используют events
 * ПОСЛЕДСТВИЯ: Без event mocking невозможно тестировать pub/sub и реактивные компоненты
 */
export function createMockEventEmitter<T>(): {
    on: jest.Mock;
    emit: jest.Mock;
    off: jest.Mock;
    once: jest.Mock;
    removeAllListeners: jest.Mock;
    listeners: T[];
} {
    const listeners: T[] = [];

    return {
        on: jest.fn((event: string, listener: T) => {
            listeners.push(listener);
        }),
        emit: jest.fn((event: string, ...args: any[]) => {
            listeners.forEach((listener: any) => listener(...args));
        }),
        off: jest.fn((event: string, listener: T) => {
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }),
        once: jest.fn((event: string, listener: T) => {
            const onceWrapper = ((...args: any[]) => {
                (listener as any)(...args);
                const index = listeners.indexOf(onceWrapper as any);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }) as any;
            listeners.push(onceWrapper);
        }),
        removeAllListeners: jest.fn(() => {
            listeners.length = 0;
        }),
        listeners,
    };
}

/**
 * INTENT: Создание mock для vscode.FileSystemWatcher
 * ПОЧЕМУ: FileWatcher критичен для autonomous mode, нужно тестировать file events
 * ПОСЛЕДСТВИЯ: Без mock невозможно симулировать file changes без реальной FS
 */
export function createMockFileWatcher(): vscode.FileSystemWatcher {
    return {
        onDidCreate: jest.fn(),
        onDidChange: jest.fn(),
        onDidDelete: jest.fn(),
        dispose: jest.fn(),
        ignoreCreateEvents: false,
        ignoreChangeEvents: false,
        ignoreDeleteEvents: false,
    } as any;
}

/**
 * INTENT: Retry механизм для flaky tests
 * ПОЧЕМУ: Тесты с network/LLM API могут временно падать из-за external factors
 * ПОСЛЕДСТВИЯ: Без retry CI/CD будет нестабильным (false negatives)
 */
export async function retryAsync<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        delay?: number;
        shouldRetry?: (error: Error) => boolean;
    } = {}
): Promise<T> {
    const { maxRetries = 3, delay = 1000, shouldRetry = () => true } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries || !shouldRetry(lastError)) {
                throw lastError;
            }

            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }

    throw lastError!;
}

/**
 * INTENT: Создание temporary workspace для integration tests
 * ПОЧЕМУ: Некоторые тесты (ProjectDependencyGraph, FileWatcher) требуют реальных файлов
 * ПОСЛЕДСТВИЯ: Без temp workspace тесты будут загрязнять реальный workspace
 */
export function createTempWorkspace(): {
    uri: vscode.Uri;
    path: string;
    cleanup: () => Promise<void>;
} {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-test-'));

    return {
        uri: vscode.Uri.file(tempDir),
        path: tempDir,
        cleanup: async () => {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.warn(`Failed to cleanup temp workspace: ${error}`);
            }
        },
    };
}

/**
 * INTENT: Assertion helper для проверки массивов без строгого порядка
 * ПОЧЕМУ: Swarm coordination может возвращать результаты в non-deterministic порядке
 * ПОСЛЕДСТВИЯ: Без unordered comparison тесты будут flaky
 */
export function expectArrayToContainSameElements<T>(
    actual: T[],
    expected: T[],
    compareFn?: (a: T, b: T) => boolean
): void {
    expect(actual).toHaveLength(expected.length);

    const actualCopy = [...actual];
    const expectedCopy = [...expected];

    for (const expectedItem of expectedCopy) {
        const index = actualCopy.findIndex(actualItem =>
            compareFn ? compareFn(actualItem, expectedItem) : actualItem === expectedItem
        );

        if (index === -1) {
            throw new Error(
                `Expected array to contain ${JSON.stringify(expectedItem)}, but it was not found. Actual: ${JSON.stringify(actual)}`
            );
        }

        actualCopy.splice(index, 1);
    }
}
