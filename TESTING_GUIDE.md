# 📚 Comprehensive Testing Guide for CursorAI Autonomous Extension

## Оглавление
- [Введение](#введение)
- [Философия тестирования](#философия-тестирования)
- [Тестовая инфраструктура](#тестовая-инфраструктура)
- [Типы тестов](#типы-тестов)
- [Написание качественных тестов](#написание-качественных-тестов)
- [CI/CD и Quality Gates](#cicd-и-quality-gates)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Введение

Этот проект использует **Quality-First подход** к тестированию, разработанный специально для решения задачи низкого покрытия тестами (~1.4% → целевые 75%).

### Ключевые метрики:

- ✅ **Test Coverage**: 75%+ (текущее: ~1.4%)
- ✅ **Mutation Score**: 70%+ (гарантирует эффективность тестов)
- ✅ **Unit Test Performance**: <45s для full suite
- ✅ **Security Coverage**: 90%+ для OWASP Top 10
- ✅ **Zero Critical/High CVEs**: в dependencies

### Почему это важно для данного проекта:

1. **VS Code Extension** - crash убивает весь IDE пользователя
2. **Autonomous Agents** - работают в background без supervision
3. **Swarm Coordination** - race conditions могут привести к deadlocks
4. **Cost Optimization** - bugs могут стоить реальных $$ (OpenAI/Anthropic API)
5. **630+ Dependencies** - высокий risk supply chain attacks

---

## Философия тестирования

### Quality over Quantity

**Плохо**: 90% coverage с weak assertions (проходят, но не ловят баги)

**Хорошо**: 75% coverage с mutation score 70%+ (гарантированно эффективные тесты)

### INTENT-Driven Tests

Каждый тест **ОБЯЗАН** иметь INTENT комментарий:

```typescript
/**
 * INTENT: Что проверяет этот тест
 * ПОЧЕМУ: Почему это важно проверять
 * ПОСЛЕДСТВИЯ: Что сломается если тест упадёт
 */
it('should prioritize immediate tasks over high priority', async () => {
    // ...
});
```

**Почему это критично:**
- Делает тест самодокументируемым
- Помогает при debugging
- Предотвращает удаление "непонятных" тестов при refactoring

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should add task to queue', async () => {
    // Arrange - подготовка данных
    const queue = new TaskQueue();
    const task = mockTask({ priority: 'high' });

    // Act - выполнение тестируемой функции
    await queue.enqueue(task);

    // Assert - проверка результатов
    const size = queue.size();
    expect(size).toBe(1);
});
```

---

## Тестовая инфраструктура

### Структура проекта

```
src/
├── __tests__/
│   ├── helpers/                    # Переиспользуемые утилиты
│   │   ├── test-utils.ts          # Async helpers, performance
│   │   ├── mock-factories.ts      # Versioned mocks
│   │   └── test-constants.ts      # Константы, budgets
│   │
│   ├── unit/                       # Unit тесты (isolated)
│   ├── integration/               # Integration тесты
│   ├── security/                  # Security test suites
│   ├── performance/               # Performance benchmarks
│   └── e2e/                       # End-to-end tests
│
├── agents/worker/__tests__/       # Component-level tests
├── orchestrator/__tests__/
└── integration/__tests__/
```

### Ключевые файлы

#### `test-utils.ts`
Утилиты для асинхронного тестирования, performance measurement, mock creation:

```typescript
import { 
    waitFor, 
    measurePerformance, 
    createMockVSCodeContext 
} from '@tests/helpers/test-utils';

// Пример использования
await waitFor(
    () => agent.status === 'idle',
    { timeout: 5000, timeoutMessage: 'Agent did not become idle' }
);
```

#### `mock-factories.ts`
Versioned factories для consistent mock creation:

```typescript
import { mockTask, mockAgent, mockModelProvider } from '@tests/helpers/mock-factories';

// Вместо 20 строк inline setup:
const task = mockTask({ priority: 'immediate' });
const agent = mockAgent('backend');
```

#### `test-constants.ts`
Централизованные константы (timeouts, performance budgets, security patterns):

```typescript
import { PERFORMANCE_BUDGETS, SECURITY_TEST_PATTERNS } from '@tests/helpers/test-constants';

expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.UPDATE_FILE_MAX_MS);
```

---

## Типы тестов

### 1. Unit Tests (5s timeout)

**Цель**: Isolated компонент testing

**Где**: `src/**/__tests__/*.unit.test.ts`

**Пример**:

```typescript
import { TEST_TIMEOUTS } from '@tests/helpers/test-constants';

describe('TaskQueue', () => {
    jest.setTimeout(TEST_TIMEOUTS.UNIT);

    /**
     * INTENT: Проверка базовой функциональности enqueue
     * ПОЧЕМУ: Core operation для task management
     * ПОСЛЕДСТВИЯ: Если не работает, агенты не получат задачи
     */
    it('should add task to queue', async () => {
        // Arrange
        const queue = new TaskQueue();
        const task = mockTask({ priority: 'high' });

        // Act
        await queue.enqueue(task);

        // Assert
        expect(queue.size()).toBe(1);
        const retrieved = await queue.dequeue('test-agent', ['backend']);
        expect(retrieved?.id).toBe(task.id);
    });
});
```

### 2. Integration Tests (15s timeout)

**Цель**: Межкомпонентное взаимодействие

**Где**: `src/__tests__/integration/*.test.ts`

**Пример**:

```typescript
describe('SwarmOrchestrator Integration', () => {
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);

    /**
     * INTENT: Проверка координации нескольких agents через MessageBus
     * ПОЧЕМУ: Swarm intelligence - core feature проекта
     * ПОСЛЕДСТВИЯ: Без координации agents будут работать изолированно
     */
    it('should coordinate multiple agents on shared task', async () => {
        // Arrange
        const orchestrator = new SwarmOrchestrator();
        const agents = [
            mockAgent('backend'),
            mockAgent('frontend'),
            mockAgent('qa')
        ];

        // Act
        await orchestrator.initialize(agents);
        const task = mockTask({ 
            priority: 'high',
            description: 'Full-stack feature implementation'
        });
        await orchestrator.distributeTask(task);

        // Assert - все agents должны получить subtasks
        await waitFor(
            () => agents.every(a => a.currentTasks.length > 0),
            { timeout: 10000 }
        );
    });
});
```

### 3. Security Tests

**Цель**: Защита от OWASP Top 10

**Где**: `src/__tests__/security/*.test.ts`

**Пример**:

```typescript
import { SECURITY_TEST_PATTERNS } from '@tests/helpers/test-constants';

describe('BackendAgent SQL Injection Protection', () => {
    /**
     * INTENT: Проверка защиты от SQL injection атак
     * ПОЧЕМУ: BackendAgent может генерировать SQL queries
     * ПОСЛЕДСТВИЯ: SQL injection = потеря данных, unauthorized access
     */
    it.each(SECURITY_TEST_PATTERNS.SQL_INJECTION)(
        'should block SQL injection: %s',
        async (maliciousInput) => {
            // Arrange
            const agent = new BackendAgent(mockModelProvider('ollama'));

            // Act & Assert
            await expect(
                agent.executeQuery(maliciousInput)
            ).rejects.toThrow(/invalid input|blocked|sanitized/i);
        }
    );
});
```

### 4. Performance Tests

**Цель**: Regression detection, optimization verification

**Где**: `src/__tests__/performance/*.test.ts`

**Пример**:

```typescript
describe('ProjectDependencyGraph Performance', () => {
    /**
     * INTENT: Проверка что updateFile() масштабируется O(n), не O(n²)
     * ПОЧЕМУ: Исходная задача "avoid overcalculating all for vertices"
     * ПОСЛЕДСТВИЯ: O(n²) делает проекты >100 файлов unusable
     */
    it('should scale linearly with file count', async () => {
        const fileCounts = [10, 100, 500];
        const timings: number[] = [];

        for (const count of fileCounts) {
            const graph = await createMockGraph(count);
            const { duration } = await measurePerformance(
                () => graph.updateFile('src/test.ts')
            );
            timings.push(duration);
        }

        // Assert: рост должен быть линейный
        const ratio100_10 = timings[1] / timings[0];
        const ratio500_100 = timings[2] / timings[1];
        const growthRatio = ratio500_100 / ratio100_10;

        expect(growthRatio).toBeLessThan(2.5); // Linear, not quadratic
        expect(timings[1]).toBeLessThan(PERFORMANCE_BUDGETS.UPDATE_FILE_MAX_MS);
    });
});
```

### 5. E2E Tests (30s timeout)

**Цель**: Full workflow testing

**Где**: `src/__tests__/e2e/*.test.ts`

**Пример**:

```typescript
describe('Autonomous Mode End-to-End', () => {
    jest.setTimeout(TEST_TIMEOUTS.E2E);

    it('should execute full autonomous workflow', async () => {
        // Arrange - полная система
        const context = createMockVSCodeContext();
        const orchestrator = new SwarmOrchestrator();
        const fileWatcher = new FileWatcher();

        // Act - симулируем file change
        await orchestrator.start();
        fileWatcher.emit('change', 'src/test.ts');

        // Assert - задачи созданы и распределены
        await waitFor(
            () => orchestrator.getActiveTasksCount() > 0,
            { timeout: 15000 }
        );
    });
});
```

---

## Написание качественных тестов

### ✅ DO:

#### 1. Используй mock factories

```typescript
// ❌ Плохо
const task = {
    id: 'test-1',
    description: 'test',
    priority: 'high',
    // ... 15 полей
};

// ✅ Хорошо
const task = mockTask({ priority: 'high' });
```

#### 2. Используй waitFor для async

```typescript
// ❌ Плохо - race condition
const result = await asyncOperation();
expect(result).toBeDefined();

// ✅ Хорошо
await waitFor(
    () => result !== undefined,
    { timeout: 5000 }
);
expect(result).toBeDefined();
```

#### 3. Измеряй performance

```typescript
const { result, duration } = await measurePerformance(
    () => expensiveOperation(),
    'ExpensiveOp'
);

expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.UPDATE_FILE_MAX_MS);
```

#### 4. Cleanup resources

```typescript
let tempWorkspace: ReturnType<typeof createTempWorkspace>;

afterEach(async () => {
    if (tempWorkspace) {
        await tempWorkspace.cleanup();
    }
});
```

### ❌ DON'T:

#### 1. НЕ используй setTimeout

```typescript
// ❌ Плохо - flaky test
await new Promise(r => setTimeout(r, 1000));
expect(data).toBeDefined();

// ✅ Хорошо
await waitFor(() => data !== undefined);
```

#### 2. НЕ hardcode magic numbers

```typescript
// ❌ Плохо
jest.setTimeout(30000);
expect(duration).toBeLessThan(50);

// ✅ Хорошо
jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.UPDATE_FILE_MAX_MS);
```

#### 3. НЕ пиши длинные тесты

```typescript
// ❌ Плохо - 80 строк в одном it()

// ✅ Хорошо - max 30 строк, разбивай на несколько тестов
```

---

## CI/CD и Quality Gates

### GitHub Actions Workflow

Файл: `.github/workflows/test-quality-gates.yml`

### Quality Gates (блокируют merge):

1. ❌ **Test Coverage < 70%**
2. ❌ **Mutation Score < 65%** (если mutation testing включён)
3. ❌ **Test Smells > 5**
4. ❌ **Critical/High CVE** в dependencies
5. ❌ **Performance Regression > 10%**
6. ❌ **Unit Test Suite > 45s**
7. ❌ **Any Failing Test**

### Локальная проверка перед push:

```bash
# Full test suite
npm test

# Coverage check
npm run test:coverage

# Lint
npm run lint

# Security audit
npm audit

# Performance benchmarks
npm run test:performance
```

---

## Best Practices

### 1. Test Naming

```typescript
// ✅ Descriptive
it('should prioritize immediate tasks over high priority tasks', ...)

// ❌ Vague
it('should work', ...)
it('test1', ...)
```

### 2. Test Isolation

```typescript
// ✅ Isolated - каждый тест независим
describe('TaskQueue', () => {
    let queue: TaskQueue;

    beforeEach(() => {
        queue = new TaskQueue(); // Fresh instance
    });

    it('test 1', ...)
    it('test 2', ...)
});

// ❌ Shared state - тесты зависят друг от друга
```

### 3. Error Messages

```typescript
// ✅ Информативный error
expect(result).toBe(expected, `Expected ${expected} but got ${result}`);

// ❌ Generic error
expect(result).toBe(expected);
```

---

## Troubleshooting

### Проблема: Тест падает с Timeout

```typescript
// Решение 1: Увеличь timeout для конкретного теста
it('slow test', async () => {
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
    // ...
}, 15000);

// Решение 2: Используй waitFor вместо fixed delay
await waitFor(() => condition, { timeout: 10000 });
```

### Проблема: Flaky тест

```typescript
// Причина: Race conditions в async code
// Решение: waitFor + retryAsync

await retryAsync(
    () => expectCondition(),
    { maxRetries: 3, delay: 500 }
);
```

### Проблема: Mock не работает

```typescript
// ❌ Плохо - mock после import
import { Component } from './component';
jest.mock('./dependency');

// ✅ Хорошо - mock перед import
jest.mock('./dependency');
import { Component } from './component';
```

---

## Полезные команды

```bash
# Запуск всех тестов
npm test

# Watch mode для TDD
npm run test:watch

# Только unit тесты
npm run test:unit

# Coverage report
npm run test:coverage

# Только performance тесты
npm run test:performance

# Mutation testing (медленно)
npm run test:mutation

# Lint + тесты
npm run pretest
```

---

## Дополнительные ресурсы

- [README в __tests__](./src/__tests__/README.md) - Quick start
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Вопросы?** Создайте [GitHub Issue](https://github.com/Zeed80/CursorAI_Ext_Rules/issues)
