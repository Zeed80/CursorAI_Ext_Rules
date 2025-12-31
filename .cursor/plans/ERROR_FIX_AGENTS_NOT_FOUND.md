# Исправление ошибок: Агенты не найдены

## 🔴 Проблема 1: SwarmOrchestrator не находит локальных агентов

### Ошибка:
```
[Extension Host] SwarmOrchestrator: Local agent backend not found, skipping
[Extension Host] SwarmOrchestrator: Local agent frontend not found, skipping
[Extension Host] SwarmOrchestrator: Local agent architect not found, skipping
[Extension Host] SwarmOrchestrator: Local agent analyst not found, skipping
```

### Причина:
`AutonomousOrchestratorIntegration` пытается получить агентов через `getLocalAgents()`, но этот метод либо не существует, либо возвращает пустой Map.

### Код проблемы (src/orchestrator/autonomous-orchestrator-integration.ts:45):
```typescript
const localAgents = this.selfLearningOrchestrator.getLocalAgents();
this.swarmOrchestrator = new SwarmOrchestrator(
    vscode.workspace.workspaceFolders?.[0]?.uri as any,
    localAgents
);
```

### Проверка:
Нужно проверить:
1. Существует ли метод `getLocalAgents()` в `SelfLearningOrchestrator`
2. Инициализированы ли агенты до вызова `enable()`

---

## 🔴 Проблема 2: TaskDeviationController требует Background Agents

### Ошибка:
```
Error: Failed to send message to agent requirement-extractor-1767179659968. 
Background agent not available and no fallback method succeeded.
```

### Причина:
`TaskDeviationController.extractKeyRequirements()` использует `CursorAPI.sendMessageToAgent()`, который требует:
- CursorAI Background Agents API (требует Usage-based pricing и бюджет)
- Fallback методы не реализованы

### Код проблемы (src/orchestrator/task-deviation-controller.ts:58):
```typescript
const response = await CursorAPI.sendMessageToAgent(
    agentId,
    prompt,
    { temperature: 0.3 }
);
```

### Решение:
Добавить fallback на локальные модели когда Background Agents недоступны.

---

## ✅ ИСПРАВЛЕНИЯ:

### Исправление 1: Проверка и инициализация агентов

**Файл:** `src/orchestrator/self-learning-orchestrator.ts`

Убедиться что метод `getLocalAgents()` существует и возвращает инициализированных агентов:

```typescript
/**
 * Получить локальных агентов
 */
public getLocalAgents(): Map<string, LocalAgent> {
    return this.localAgents;
}
```

### Исправление 2: Отложенная инициализация SwarmOrchestrator

**Файл:** `src/orchestrator/autonomous-orchestrator-integration.ts`

Проверять что агенты инициализированы:

```typescript
async enable(): Promise<void> {
    // ...
    
    // Получаем локальных агентов
    const localAgents = this.selfLearningOrchestrator.getLocalAgents();
    
    // ДОБАВИТЬ проверку
    if (localAgents.size === 0) {
        console.warn('AutonomousOrchestrator: No local agents available yet, initializing...');
        // Даем время на инициализацию
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryAgents = this.selfLearningOrchestrator.getLocalAgents();
        
        if (retryAgents.size === 0) {
            throw new Error('No local agents available. Please ensure agents are initialized in settings.');
        }
    }
    
    console.log(`AutonomousOrchestrator: Found ${localAgents.size} local agents`);
    
    this.swarmOrchestrator = new SwarmOrchestrator(
        vscode.workspace.workspaceFolders?.[0]?.uri as any,
        localAgents
    );
    
    // ...
}
```

### Исправление 3: Fallback для TaskDeviationController

**Файл:** `src/orchestrator/task-deviation-controller.ts`

Добавить fallback на локальные модели:

```typescript
async extractKeyRequirements(taskDescription: string): Promise<string[]> {
    const agentId = `requirement-extractor-${Date.now()}`;
    const prompt = `Extract key requirements from this task description:
${taskDescription}

Return ONLY a JSON array of requirement strings, nothing else.
Example: ["requirement1", "requirement2"]`;

    try {
        // Пытаемся использовать CursorAPI
        const response = await CursorAPI.sendMessageToAgent(
            agentId,
            prompt,
            { temperature: 0.3 }
        );
        
        // Парсим ответ
        const requirements = JSON.parse(response);
        return Array.isArray(requirements) ? requirements : [];
        
    } catch (error) {
        console.warn('TaskDeviationController: CursorAPI failed, using fallback', error);
        
        // FALLBACK: Простой парсинг через регулярки
        return this.extractRequirementsFallback(taskDescription);
    }
}

/**
 * Fallback метод извлечения требований без LLM
 */
private extractRequirementsFallback(taskDescription: string): string[] {
    const requirements: string[] = [];
    
    // Ищем явные требования
    const lines = taskDescription.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Строки начинающиеся с -, *, •, 1., 2., etc
        if (/^[-*•]/.test(trimmed) || /^\d+\./.test(trimmed)) {
            const requirement = trimmed.replace(/^[-*•\d.]\s*/, '').trim();
            if (requirement.length > 10) {
                requirements.push(requirement);
            }
        }
        
        // Ключевые слова требований
        if (/должен|необходимо|требуется|нужно|следует/i.test(trimmed)) {
            requirements.push(trimmed);
        }
    }
    
    // Если ничего не нашли, возвращаем основное описание
    if (requirements.length === 0) {
        requirements.push(taskDescription.substring(0, 200));
    }
    
    console.log(`TaskDeviationController: Extracted ${requirements.length} requirements (fallback)`);
    return requirements;
}
```

### Исправление 4: Graceful degradation для BrainstormingManager

**Файл:** `src/orchestrator/brainstorming-manager.ts`

Обрабатывать ошибки TaskDeviationController:

```typescript
async initiateBrainstorming(task: Task, agents: LocalAgent[]): Promise<BrainstormingResult> {
    // ...
    
    // Проверка отклонений (с обработкой ошибок)
    const deviationChecks = await Promise.allSettled(
        solutions.map(solution => this.taskDeviationController.checkDeviation(task, solution))
    );
    
    // Фильтруем только успешные результаты
    const validSolutions = solutions.filter((solution, index) => {
        const check = deviationChecks[index];
        if (check.status === 'rejected') {
            console.warn(`Deviation check failed for solution ${solution.id}:`, check.reason);
            return true; // Включаем решение если проверка упала
        }
        return check.value.withinBounds; // Используем результат если проверка успешна
    });
    
    if (validSolutions.length === 0) {
        console.log('All solutions filtered out due to deviation, using original solutions');
        validSolutions.push(...solutions);
    }
    
    // ...
}
```

---

## 🎯 ПРИОРИТЕТ ИСПРАВЛЕНИЙ:

### 1. **КРИТИЧНО - Исправление 3** (TaskDeviationController fallback)
Без этого система падает при каждой задаче, если нет CursorAI Background Agents.

### 2. **ВАЖНО - Исправление 2** (Проверка агентов)
Без этого автономный режим не запустится вообще.

### 3. **ПОЛЕЗНО - Исправление 4** (Graceful degradation)
Улучшает устойчивость системы.

---

## 📝 Дополнительно:

### Проверка наличия агентов перед включением автономного режима

**Файл:** `src/extension.ts`

Добавить проверку в команду `enableAutonomousMode`:

```typescript
const enableAutonomous = vscode.commands.registerCommand('cursor-autonomous.enableAutonomousMode', async () => {
    if (!autonomousIntegration) {
        vscode.window.showErrorMessage('Автономная система не инициализирована');
        return;
    }
    
    // ДОБАВИТЬ: Проверка настроек агентов
    const config = vscode.workspace.getConfiguration('cursor-autonomous');
    const agents = config.get('agents', {});
    
    if (Object.keys(agents).length === 0) {
        const answer = await vscode.window.showWarningMessage(
            'Агенты не настроены. Настроить сейчас?',
            'Да', 'Отмена'
        );
        
        if (answer === 'Да') {
            await vscode.commands.executeCommand('cursor-autonomous.openSettings');
        }
        return;
    }
    
    await autonomousIntegration.enable();
    updateStatusBar('autonomous');
});
```

---

Реализовать исправления?
