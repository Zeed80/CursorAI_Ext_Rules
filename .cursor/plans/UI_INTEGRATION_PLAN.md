# План интеграции UI с новыми компонентами

## ✅ Что уже есть (реализовано):

### 1. **SettingsPanel** (WebView с вкладками)
- ✅ Основные настройки
- ✅ Провайдеры моделей
- ✅ Настройки агентов
- ✅ Оркестратор
- ✅ Статистика использования

### 2. **StatusPanel** (статус агентов в реальном времени)
- ✅ Показ работающих агентов
- ✅ Задачи в progress
- ✅ Статистика выполнения

### 3. **QuickAccessPanel** (быстрый доступ)
- ✅ Запуск/остановка оркестратора
- ✅ Включение виртуального пользователя
- ✅ Анализ проекта

### 4. **AgentsStatusTree** (TreeView в sidebar)
- ✅ Иерархический список агентов
- ✅ Статус каждого агента
- ✅ Контекстное меню

### 5. **Команды** (17 команд уже зарегистрировано)
- ✅ Quick Menu
- ✅ Start/Stop Orchestrator
- ✅ Enable/Disable Virtual User
- ✅ Analyze Project
- ✅ Create Task
- ✅ Run Quality Check
- ✅ Show Status/Analytics/Settings
- ✅ Refresh Agents
- ✅ Select Agent Model

---

## 📝 Что нужно добавить:

### 1. Новые настройки в SettingsPanel

Добавить новую вкладку "Автономный режим" в SettingsPanel:

```javascript
// В getWebviewContent добавить вкладку:
<button class="tab" data-tab="autonomous">Автономный режим</button>

// Контент вкладки:
<div class="tab-content" id="tab-autonomous">
    <h2>🤖 Автономный режим</h2>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="autonomousMode">
            Включить полностью автономный режим
        </label>
        <div class="help-text">Воркеры будут работать постоянно в фоне</div>
    </div>
    
    <h3>Гибридный выбор моделей</h3>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="hybridModeEnabled">
            Включить умный выбор моделей
        </label>
        <div class="help-text">Автоматический выбор: локальные → облачные → CursorAI</div>
    </div>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="preferLocal">
            Предпочитать локальные модели
        </label>
        <div class="help-text">Использовать локальные модели когда возможно</div>
    </div>
    
    <div class="form-row">
        <div class="form-group">
            <label for="monthlyBudget">Месячный бюджет ($)</label>
            <input type="number" id="monthlyBudget" min="0" value="50">
            <div class="help-text">Максимальные затраты на облачные API в месяц</div>
        </div>
        
        <div class="form-group">
            <label for="maxCursorCallsPerDay">Лимит CursorAI вызовов/день</label>
            <input type="number" id="maxCursorCallsPerDay" min="0" value="100">
            <div class="help-text">Максимум вызовов CursorAI в день</div>
        </div>
    </div>
    
    <h3>Использование CursorAI для:</h3>
    
    <div class="form-group">
        <label><input type="checkbox" id="cursorAI_consolidation" checked> Консолидация решений</label>
        <label><input type="checkbox" id="cursorAI_refactoring" checked> Сложный рефакторинг</label>
        <label><input type="checkbox" id="cursorAI_editing" checked> Изменение файлов</label>
        <label><input type="checkbox" id="cursorAI_architecture"> Архитектурные решения</label>
        <label><input type="checkbox" id="cursorAI_multipleFiles"> Множественные файлы</label>
        <label><input type="checkbox" id="cursorAI_never"> Никогда не использовать</label>
    </div>
    
    <h3>Интеграция с CursorAI</h3>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="useChat" checked>
            Использовать CursorAI Chat для консолидации
        </label>
    </div>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="useComposer" checked>
            Использовать CursorAI Composer для изменений файлов
        </label>
    </div>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="autoApplyComposer">
            Автоматически применять изменения Composer
        </label>
        <div class="help-text">⚠️ Осторожно: изменения будут применяться без подтверждения</div>
    </div>
</div>
```

### 2. Новые команды

Добавить в `extension.ts`:

```typescript
// Команда: Включить автономный режим
const enableAutonomous = vscode.commands.registerCommand(
    'cursor-autonomous.enableAutonomousMode',
    async () => {
        if (!autonomousIntegration) {
            vscode.window.showErrorMessage('Автономная система не инициализирована');
            return;
        }
        await autonomousIntegration.enable();
        updateStatusBar('autonomous');
    }
);

// Команда: Выключить автономный режим
const disableAutonomous = vscode.commands.registerCommand(
    'cursor-autonomous.disableAutonomousMode',
    async () => {
        if (!autonomousIntegration) {
            return;
        }
        await autonomousIntegration.disable();
        updateStatusBar('active');
    }
);

// Команда: Создать задачу с приоритетом
const createTaskWithPriority = vscode.commands.registerCommand(
    'cursor-autonomous.createTaskWithPriority',
    async () => {
        const description = await vscode.window.showInputBox({
            prompt: 'Описание задачи',
            placeHolder: 'Например: Исправить баг в auth.ts'
        });
        
        if (!description) return;
        
        const priority = await vscode.window.showQuickPick([
            { label: '⚡ Немедленно', value: 'immediate' },
            { label: '🔥 Высокий', value: 'high' },
            { label: '📝 Средний', value: 'medium' },
            { label: '📋 Низкий', value: 'low' }
        ], {
            placeHolder: 'Выберите приоритет'
        });
        
        if (!priority) return;
        
        if (!autonomousIntegration) {
            vscode.window.showWarningMessage('Автономный режим не активирован');
            return;
        }
        
        await autonomousIntegration.createTask(
            description,
            priority.value as any
        );
    }
);

// Команда: Показать статистику автономной системы
const showAutonomousStats = vscode.commands.registerCommand(
    'cursor-autonomous.showAutonomousStats',
    async () => {
        if (!autonomousIntegration) {
            vscode.window.showWarningMessage('Автономный режим не активирован');
            return;
        }
        
        const stats = autonomousIntegration.getStatus();
        
        const message = `
📊 Автономная система:
• Статус: ${stats.enabled ? '✅ Активна' : '❌ Неактивна'}
• Воркеров: ${stats.workers.length}
• Задач в очереди: ${stats.tasks.pending}
• Задач в работе: ${stats.tasks.processing}
• Завершено: ${stats.tasks.completed}
• Затраты (месяц): $${stats.health?.currentMonthSpent || 0}
        `.trim();
        
        vscode.window.showInformationMessage(message, 'OK');
    }
);

context.subscriptions.push(
    enableAutonomous,
    disableAutonomous,
    createTaskWithPriority,
    showAutonomousStats
);
```

### 3. Добавить в QuickAccessPanel

```html
<div class="button-group">
    <h3>Автономный режим</h3>
    <button class="button" id="btnEnableAutonomous">
        🤖 Включить автономный режим
    </button>
    <button class="button" id="btnDisableAutonomous">
        ⏸️ Выключить автономный режим
    </button>
    <button class="button" id="btnCreateTaskPriority">
        📝 Создать задачу с приоритетом
    </button>
    <button class="button" id="btnShowAutonomousStats">
        📊 Статистика автономной системы
    </button>
</div>
```

### 4. Обновить Quick Menu

Добавить в `quickMenu` команды новые пункты:

```typescript
{
    label: '🤖 Включить автономный режим',
    description: 'Активировать фоновые воркеры',
    detail: 'Агенты будут работать постоянно'
},
{
    label: '📝 Создать задачу с приоритетом',
    description: 'Создать задачу для агентов',
    detail: 'Выбрать приоритет: немедленно, высокий, средний, низкий'
},
{
    label: '📊 Статистика автономной системы',
    description: 'Показать статистику воркеров',
    detail: 'Задачи, затраты, здоровье агентов'
}
```

---

## 🔧 Код для интеграции в extension.ts

```typescript
import { AutonomousOrchestratorIntegration } from './orchestrator/autonomous-orchestrator-integration';
import { ContextMenuProvider } from './ui/context-menu-provider';

let autonomousIntegration: AutonomousOrchestratorIntegration | undefined;
let contextMenuProvider: ContextMenuProvider | undefined;

// В функции activate() после создания orchestrator:

// Создаем интеграцию автономной системы
autonomousIntegration = new AutonomousOrchestratorIntegration(
    context,
    orchestrator
);

// Создаем провайдер контекстного меню
contextMenuProvider = new ContextMenuProvider(autonomousIntegration);
contextMenuProvider.register(context);

// Регистрируем команды (см. выше)
// ...

// Обновляем функцию updateStatusBar для отображения автономного режима
function updateStatusBar(state: 'active' | 'stopped' | 'autonomous') {
    if (state === 'autonomous') {
        statusBarItem.text = '$(robot) Autonomous';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    } else if (state === 'active') {
        statusBarItem.text = '$(check) Active';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = '$(circle-slash) Stopped';
        statusBarItem.backgroundColor = undefined;
    }
}

// Автоматический запуск при включении в настройках
if (settingsManager.getSetting('autonomousMode', false)) {
    // Запускаем через 2 секунды после активации
    setTimeout(() => {
        autonomousIntegration?.enable();
    }, 2000);
}
```

---

## ✅ Итого:

### Преимущества интеграции:

1. **Все через UI** - не нужно редактировать JSON файлы
2. **Quick Menu** - быстрый доступ к любой функции (Ctrl+Shift+P)
3. **WebView панели** - красивые настройки с live preview
4. **TreeView** - статус агентов в sidebar
5. **Контекстное меню** - создание задач из Explorer
6. **Горячие клавиши** - все основные действия
7. **Status Bar** - индикатор режима (Active/Autonomous/Stopped)

### Пользователь видит:

```
┌─ Status Bar ─────────────────────────┐
│ $(robot) Autonomous                  │  ← Показывает режим
└──────────────────────────────────────┘

┌─ Sidebar ────────────────────────────┐
│ 📁 Explorer                          │
│ 🤖 Autonomous Agents                 │  ← TreeView
│   ├─ Backend (working)               │
│   ├─ Frontend (idle)                 │
│   └─ Architect (working)             │
└──────────────────────────────────────┘

┌─ Command Palette ────────────────────┐
│ > CursorAI Autonomous: Quick Menu    │
│ > CursorAI Autonomous: Включить      │
│   автономный режим                   │
│ > CursorAI Autonomous: Создать       │
│   задачу с приоритетом               │
│ > CursorAI Autonomous: Настройки     │  ← Открывает WebView
└──────────────────────────────────────┘

┌─ Context Menu (правый клик) ─────────┐
│ Создать задачу для агентов           │
│ Рефакторинг                          │
│ Проверить качество кода              │
│ Добавить тесты                       │
│ Оптимизировать                       │
└──────────────────────────────────────┘
```

---

## 📝 Следующие шаги:

1. **Обновить SettingsPanel** - добавить вкладку "Автономный режим"
2. **Добавить команды** в extension.ts
3. **Обновить QuickAccessPanel** - добавить кнопки
4. **Обновить Quick Menu** - добавить пункты
5. **Перекомпилировать и протестировать**

Все работает через существующую UI систему - не нужно ничего нового создавать!
