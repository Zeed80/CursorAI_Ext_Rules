# Testing Guide for CursorAI Autonomous Extension

## Обзор тестовой инфраструктуры

Этот проект использует **Quality-First подход** к тестированию с акцентом на:
- ✅ **Высокое качество тестов** через mutation testing (целевой score 70%+)
- ✅ **Безопасность** через специализированные security test suites
- ✅ **Производительность** через performance benchmarks и budgets
- ✅ **Maintainability** через versioned mock factories и INTENT комментарии

---

## Структура тестов

```
src/__tests__/
├── helpers/                    # Переиспользуемые утилиты
│   ├── test-utils.ts          # Async helpers, performance measurement
│   ├── mock-factories.ts      # Versioned mocks с автомиграцией
│   └── test-constants.ts      # Централизованные константы
│
├── unit/                       # Unit тесты (быстрые, isolated)
│   ├── agents/
│   ├── orchestrator/
│   └── integration/
│
├── integration/               # Integration тесты (межкомпонентные)
│   ├── swarm-coordination/
│   ├── model-providers/
│   └── mcp-client/
│
├── security/                  # Security test suites
│   ├── sql-injection-suite.test.ts
│   ├── xss-suite.test.ts
│   ├── path-traversal-suite.test.ts
│   └── prompt-injection.test.ts
│
├── performance/               # Performance benchmarks
│   ├── benchmarks.test.ts
│   └── regression.test.ts
│
└── e2e/                       # End-to-end тесты
    └── full-workflow.test.ts
```

---

## Правила написания тестов

### 1. ✅ ВСЕГДА используй INTENT комментарии

```typescript
/**
 * INTENT: Что проверяет этот тест
 * ПОЧЕМУ: Почему это важно проверять
 * ПОСЛЕДСТВИЯ: Что сломается если тест упадёт
 */
it('should prioritize immediate tasks over high priority tasks', async () => {
    // Arrange
    const queue = new TaskQueue();
    const highTask = mockTask({ priority: 'high' });
    const immediateTask = mockTask({ priority: 'immediate' });

    // Act
    await queue.addTask(highTask);
    await queue.addTask(immediateTask);
    const nextTask = await queue.getNextTask();

    // Assert
    expect(nextTask?.id).toBe(immediateTask.id);
});
```

### 2. ✅ Используй AAA паттерн (Arrange-Act-Assert)

Каждый тест должен чётко делиться на три секции:
- **Arrange**: Подготовка данных и mocks
- **Act**: Выполнение тестируемой функции
- **Assert**: Проверка результатов

### 3. ✅ Максимум 30 строк на тест

Если тест длиннее - разбей на несколько тестов или вынеси setup в helper функцию.

### 4. ✅ Используй mock factories вместо inline mocks

**❌ Плохо:**
```typescript
const task = {
    id: 'test-1',
    description: 'test',
    priority: 'high',
    status: 'pending',
    assignedAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    // ... ещё 10 полей
};
```

**✅ Хорошо:**
```typescript
const task = mockTask({ priority: 'high' });
```

### 5. ✅ Проверяй performance budgets

```typescript
import { measurePerformance } from '@tests/helpers/test-utils';
import { PERFORMANCE_BUDGETS } from '@tests/helpers/test-constants';

it('should update file within performance budget', async () => {
    const graph = new ProjectDependencyGraph();
    
    const { duration } = await measurePerformance(
        () => graph.updateFile('src/test.ts'),
        'updateFile'
    );

    expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.UPDATE_FILE_MAX_MS);
});
```

---

## Типы тестов

### Unit Tests (5s timeout)

**Цель:** Изолированное тестирование компонентов

```typescript
import { TEST_TIMEOUTS } from '@tests/helpers/test-constants';

describe('TaskQueue', () => {
    jest.setTimeout(TEST_TIMEOUTS.UNIT);

    it('should add task to queue', async () => {
        // ...
    });
});
```

### Integration Tests (15s timeout)

**Цель:** Тестирование взаимодействия компонентов

```typescript
describe('SwarmOrchestrator Integration', () => {
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);

    it('should coordinate multiple agents', async () => {
        const orchestrator = new SwarmOrchestrator();
        const agents = [
            mockAgent('backend'),
            mockAgent('frontend'),
            mockAgent('qa'),
        ];
        
        // ...
    });
});
```

### Security Tests

**Цель:** Проверка защиты от OWASP Top 10 уязвимостей

```typescript
import { SECURITY_TEST_PATTERNS } from '@tests/helpers/test-constants';

describe('BackendAgent SQL Injection Protection', () => {
    it.each(SECURITY_TEST_PATTERNS.SQL_INJECTION)(
        'should block SQL injection: %s',
        async (maliciousInput) => {
            const agent = new BackendAgent(config);
            
            await expect(
                agent.executeQuery(maliciousInput)
            ).rejects.toThrow(/invalid input|blocked/i);
        }
    );
});
```

### Performance Tests

**Цель:** Предотвращение performance regression

```typescript
describe('ProjectDependencyGraph Performance', () => {
    jest.setTimeout(TEST_TIMEOUTS.PERFORMANCE);

    it('should scale linearly with file count', async () => {
        const fileCounts = [10, 100, 1000];
        const timings: number[] = [];

        for (const count of fileCounts) {
            const graph = mockDependencyGraph(count);
            const { duration } = await measurePerformance(
                () => buildDependents(graph)
            );
            timings.push(duration);
        }

        // Проверяем что время растёт линейно, не квадратично
        const ratio100_10 = timings[1] / timings[0];
        const ratio1000_100 = timings[2] / timings[1];
        
        // Если квадратичная сложность, ratio1000_100 будет ~10x больше ratio100_10
        // Если линейная, ratios должны быть похожи
        expect(ratio1000_100 / ratio100_10).toBeLessThan(2);
    });
});
```

---

## Запуск тестов

```bash
# Все тесты
npm test

# Unit тесты (быстрые)
npm run test:unit

# Integration тесты
npm run test:integration

# Security тесты
npm run test:security

# Performance тесты
npm run test:performance

# Coverage report
npm run test:coverage

# Watch mode для TDD
npm run test:watch

# Mutation testing (медленно, ~10 минут)
npm run test:mutation
```

---

## CI/CD Quality Gates

Следующие conditions блокируют merge:

- ❌ Test coverage < 70%
- ❌ Mutation score < 65%
- ❌ Test smells > 5
- ❌ Critical/High CVE в dependencies
- ❌ Performance regression > 10%
- ❌ Unit test suite > 45s
- ❌ Любой failing test

---

## Best Practices

### ✅ DO:
- Используй `waitFor()` для async assertions
- Используй `flushPromises()` после Promise-based operations
- Используй `retryAsync()` для flaky external API calls
- Используй `expectArrayToContainSameElements()` для non-deterministic порядка
- Cleanup temp resources в `afterEach`/`afterAll`
- Mock external dependencies (fetch, fs, vscode API)

### ❌ DON'T:
- НЕ используй `setTimeout()` в тестах (используй `waitFor`)
- НЕ используй реальные API keys (используй MOCK_API_KEYS)
- НЕ создавай files в реальном workspace (используй temp workspace)
- НЕ пиши тесты без INTENT комментариев
- НЕ дублируй mock setup код (используй factories)
- НЕ игнорируй performance budgets

---

## Troubleshooting

### Тест падает с "Timeout"
```typescript
// ❌ Плохо - захардкоженный timeout
jest.setTimeout(10000);

// ✅ Хорошо - используй константы
jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);
```

### Flaky тест (иногда проходит, иногда падает)
```typescript
// ❌ Плохо - race condition
const result = await asyncOperation();
expect(result).toBeDefined();

// ✅ Хорошо - используй waitFor
await waitFor(
    () => result !== undefined,
    { timeout: 5000, timeoutMessage: 'Result not available' }
);
expect(result).toBeDefined();
```

### Mock не работает
```typescript
// Проверь что mock установлен ДО импорта тестируемого модуля
jest.mock('vscode');
import { MyComponent } from './my-component'; // После jest.mock!
```

---

## Контакты

Вопросы по тестам? Смотри:
- [TESTING_GUIDE.md](../../TESTING_GUIDE.md) - полное руководство
- [GitHub Issues](https://github.com/Zeed80/CursorAI_Ext_Rules/issues)
- Existing tests в `src/integration/__tests__/cursor-api-models.test.ts`
