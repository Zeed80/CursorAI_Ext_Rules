# Анализ конфликтов настроек и актуальности UI

## 🔴 ПРОБЛЕМЫ ОБНАРУЖЕНЫ:

### 1. **SettingsPanel НЕ знает о новых настройках**

#### Отсутствующие поля в `SettingsData`:
```typescript
// ОТСУТСТВУЮТ в src/ui/settings-panel.ts:
export interface SettingsData {
    // ... существующие поля ...
    
    // ❌ НЕТ:
    autonomousMode?: boolean;
    hybridMode?: {
        enabled: boolean;
        preferLocal: boolean;
        monthlyBudget: number;
        maxCursorCallsPerDay: number;
    };
    useCursorAIFor?: string[];
    cursorIntegration?: {
        useChat: boolean;
        useComposer: boolean;
        useTab: boolean;
        autoApplyComposer: boolean;
    };
}
```

### 2. **SettingsPanel не загружает новые настройки**

В методе `loadSettings()` (строка 191-254) НЕ загружаются:
- `autonomousMode`
- `hybridMode`
- `useCursorAIFor`
- `cursorIntegration`

### 3. **SettingsPanel не сохраняет новые настройки**

В методе `saveSettings()` (через handleMessage) НЕ сохраняются новые настройки.

### 4. **HTML не содержит вкладку для автономных настроек**

В `getWebviewContent()` нет вкладки "Автономный режим" с полями:
- Включить автономный режим
- Гибридный выбор моделей
- Настройки бюджета
- Использование CursorAI для...

### 5. **Настройки в package.json VS реальное использование**

**package.json определяет:**
```json
{
  "cursor-autonomous.autonomousMode": true,
  "cursor-autonomous.hybridMode": { ... },
  "cursor-autonomous.useCursorAIFor": [...],
  "cursor-autonomous.cursorIntegration": { ... }
}
```

**Но компоненты НЕ читают эти настройки:**
- `AutonomousOrchestratorIntegration` - использует внутренний `isEnabled`
- `HybridModelProvider` - НЕ читает `hybridMode` из конфигурации
- `CursorChatIntegration` - НЕ читает `cursorIntegration.useChat`
- `CursorComposerIntegration` - НЕ читает `cursorIntegration.useComposer`

---

## 🔧 ИСПРАВЛЕНИЯ:

### Исправление 1: Обновить интерфейс SettingsData

```typescript
// src/ui/settings-panel.ts
export interface SettingsData {
    general: {
        apiKey: string;
        enableVirtualUser: boolean;
        autoImprove: boolean;
        monitoringInterval: number;
        improvementInterval: number;
        virtualUserDecisionThreshold: number;
        enableOrchestrator: boolean;
        autonomousMode: boolean; // ✅ ДОБАВИТЬ
    };
    providers: { ... };
    agents: { ... };
    orchestrator: {
        useCursorAIForRefinement: boolean;
        cursorAIRefinementOnlyForCritical: boolean;
    };
    // ✅ ДОБАВИТЬ:
    hybridMode: {
        enabled: boolean;
        preferLocal: boolean;
        monthlyBudget: number;
        maxCursorCallsPerDay: number;
    };
    useCursorAIFor: string[];
    cursorIntegration: {
        useChat: boolean;
        useComposer: boolean;
        useTab: boolean;
        autoApplyComposer: boolean;
    };
}
```

### Исправление 2: Загрузка настроек

```typescript
// src/ui/settings-panel.ts - метод loadSettings()
private async loadSettings(): Promise<void> {
    const settings: SettingsData = {
        general: {
            // ... существующие ...
            autonomousMode: this._settingsManager.getSetting<boolean>('autonomousMode', false)
        },
        // ... другие секции ...
        hybridMode: this._settingsManager.getSetting('hybridMode', {
            enabled: true,
            preferLocal: true,
            monthlyBudget: 50,
            maxCursorCallsPerDay: 100
        }),
        useCursorAIFor: this._settingsManager.getSetting<string[]>('useCursorAIFor', [
            'consolidation', 'complex-refactoring', 'file-editing'
        ]),
        cursorIntegration: this._settingsManager.getSetting('cursorIntegration', {
            useChat: true,
            useComposer: true,
            useTab: false,
            autoApplyComposer: false
        })
    };
    
    // ...
}
```

### Исправление 3: Сохранение настроек

```typescript
// src/ui/settings-panel.ts - в handleMessage для 'saveSettings'
case 'saveSettings':
    // ... существующее сохранение ...
    
    // ✅ ДОБАВИТЬ:
    if (settings.general?.autonomousMode !== undefined) {
        await this._settingsManager.updateSetting('autonomousMode', settings.general.autonomousMode);
    }
    
    if (settings.hybridMode) {
        await this._settingsManager.updateSetting('hybridMode', settings.hybridMode);
    }
    
    if (settings.useCursorAIFor) {
        await this._settingsManager.updateSetting('useCursorAIFor', settings.useCursorAIFor);
    }
    
    if (settings.cursorIntegration) {
        await this._settingsManager.updateSetting('cursorIntegration', settings.cursorIntegration);
    }
    break;
```

### Исправление 4: Добавить вкладку в HTML

```html
<!-- В getWebviewContent() -->
<div class="tabs">
    <button class="tab active" data-tab="general">Основные</button>
    <button class="tab" data-tab="providers">Провайдеры</button>
    <button class="tab" data-tab="agents">Агенты</button>
    <button class="tab" data-tab="orchestrator">Оркестратор</button>
    <button class="tab" data-tab="autonomous">Автономный режим</button> <!-- ✅ ДОБАВИТЬ -->
    <button class="tab" data-tab="statistics">Статистика</button>
</div>

<!-- Контент вкладки -->
<div class="tab-content" id="tab-autonomous">
    <h2>🤖 Автономный режим</h2>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="autonomousMode">
            Включить полностью автономный режим
        </label>
        <div class="help-text">Воркеры будут работать постоянно в фоне при открытии проекта</div>
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
        <div class="help-text">Использовать Ollama/LLM Studio когда возможно (бесплатно)</div>
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
            <div class="help-text">Максимум вызовов CursorAI в день (если используете)</div>
        </div>
    </div>
    
    <h3>Использование CursorAI для:</h3>
    
    <div class="form-group">
        <label><input type="checkbox" class="use-cursor-for" value="consolidation" checked> Консолидация решений</label>
        <label><input type="checkbox" class="use-cursor-for" value="complex-refactoring" checked> Сложный рефакторинг</label>
        <label><input type="checkbox" class="use-cursor-for" value="file-editing" checked> Изменение файлов</label>
        <label><input type="checkbox" class="use-cursor-for" value="architecture"> Архитектурные решения</label>
        <label><input type="checkbox" class="use-cursor-for" value="multiple-files"> Множественные файлы</label>
        <label><input type="checkbox" class="use-cursor-for" value="never"> Никогда не использовать CursorAI</label>
    </div>
    
    <h3>Интеграция с CursorAI</h3>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="useChat" checked>
            Использовать CursorAI Chat для консолидации
        </label>
        <div class="help-text">Если включено, лучшее решение обрабатывается через CursorAI Chat</div>
    </div>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="useComposer" checked>
            Использовать CursorAI Composer для изменений файлов
        </label>
        <div class="help-text">Если включено, изменения применяются через Composer (безопаснее)</div>
    </div>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="useTab">
            Использовать CursorAI Tab для автодополнения
        </label>
        <div class="help-text">⚠️ Пока не реализовано</div>
    </div>
    
    <div class="form-group">
        <label>
            <input type="checkbox" id="autoApplyComposer">
            Автоматически применять изменения Composer
        </label>
        <div class="help-text">⚠️ ОСТОРОЖНО: изменения будут применяться без подтверждения пользователя!</div>
    </div>
</div>
```

### Исправление 5: JavaScript для новой вкладки

```javascript
// В конце <script> секции getWebviewContent()
function saveSettings() {
    const settings = {
        general: {
            // ... существующие ...
            autonomousMode: document.getElementById('autonomousMode').checked
        },
        // ... другие секции ...
        hybridMode: {
            enabled: document.getElementById('hybridModeEnabled').checked,
            preferLocal: document.getElementById('preferLocal').checked,
            monthlyBudget: parseInt(document.getElementById('monthlyBudget').value) || 50,
            maxCursorCallsPerDay: parseInt(document.getElementById('maxCursorCallsPerDay').value) || 100
        },
        useCursorAIFor: Array.from(document.querySelectorAll('.use-cursor-for:checked'))
            .map(el => el.value),
        cursorIntegration: {
            useChat: document.getElementById('useChat').checked,
            useComposer: document.getElementById('useComposer').checked,
            useTab: document.getElementById('useTab').checked,
            autoApplyComposer: document.getElementById('autoApplyComposer').checked
        }
    };
    
    vscode.postMessage({ command: 'saveSettings', settings });
}

// Заполнение формы при загрузке настроек
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'settingsLoaded':
            const settings = message.settings;
            
            // Автономные настройки
            if (settings.general?.autonomousMode !== undefined) {
                document.getElementById('autonomousMode').checked = settings.general.autonomousMode;
            }
            
            if (settings.hybridMode) {
                document.getElementById('hybridModeEnabled').checked = settings.hybridMode.enabled;
                document.getElementById('preferLocal').checked = settings.hybridMode.preferLocal;
                document.getElementById('monthlyBudget').value = settings.hybridMode.monthlyBudget;
                document.getElementById('maxCursorCallsPerDay').value = settings.hybridMode.maxCursorCallsPerDay;
            }
            
            if (settings.useCursorAIFor) {
                document.querySelectorAll('.use-cursor-for').forEach(el => {
                    el.checked = settings.useCursorAIFor.includes(el.value);
                });
            }
            
            if (settings.cursorIntegration) {
                document.getElementById('useChat').checked = settings.cursorIntegration.useChat;
                document.getElementById('useComposer').checked = settings.cursorIntegration.useComposer;
                document.getElementById('useTab').checked = settings.cursorIntegration.useTab;
                document.getElementById('autoApplyComposer').checked = settings.cursorIntegration.autoApplyComposer;
            }
            break;
    }
});
```

### Исправление 6: Чтение настроек в компонентах

```typescript
// src/orchestrator/autonomous-orchestrator-integration.ts
async enable(): Promise<void> {
    // ✅ ДОБАВИТЬ проверку настроек
    const config = vscode.workspace.getConfiguration('cursor-autonomous');
    const autonomousMode = config.get<boolean>('autonomousMode', false);
    
    if (!autonomousMode) {
        vscode.window.showWarningMessage(
            'Автономный режим отключен в настройках. Включите его через Settings Panel.'
        );
        return;
    }
    
    // ... остальное ...
}

// src/integration/model-providers/hybrid-provider.ts
constructor(...) {
    // ✅ ДОБАВИТЬ чтение настроек
    const config = vscode.workspace.getConfiguration('cursor-autonomous');
    const hybridMode = config.get('hybridMode', {
        enabled: true,
        preferLocal: true,
        monthlyBudget: 50
    });
    
    this.hybridEnabled = hybridMode.enabled;
    this.preferLocal = hybridMode.preferLocal;
    this.monthlyBudget = hybridMode.monthlyBudget;
    // ...
}

// src/integration/cursor-chat-integration.ts
constructor(...) {
    const config = vscode.workspace.getConfiguration('cursor-autonomous');
    const cursorIntegration = config.get('cursorIntegration', {
        useChat: true
    });
    
    this.enabled = cursorIntegration.useChat;
}

// src/integration/cursor-composer-integration.ts
constructor(...) {
    const config = vscode.workspace.getConfiguration('cursor-autonomous');
    const cursorIntegration = config.get('cursorIntegration', {
        useComposer: true,
        autoApplyComposer: false
    });
    
    this.enabled = cursorIntegration.useComposer;
    this.autoApply = cursorIntegration.autoApplyComposer;
}
```

---

## 📊 StatusPanel - ПРОВЕРКА АКТУАЛЬНОСТИ:

### ✅ StatusPanel актуален и корректен:

```typescript
// src/ui/status-panel.ts
- Показывает агентов из AgentManager
- Отображает статус (working/idle/error)
- Показывает задачи в работе
- Показывает мысли агентов (thoughts)
- Кнопка "Отправить в чат"
- Автообновление каждые 5 секунд
```

**НО**: StatusPanel НЕ показывает:
- ❌ Статус автономного режима (включен/выключен)
- ❌ Статус воркеров (AgentWorker)
- ❌ Задачи в очереди TaskQueue
- ❌ Здоровье системы (HealthMonitor)

### Рекомендация: Добавить раздел "Автономная система"

```html
<!-- В getHtmlForWebview() добавить -->
<div class="stats">
    <!-- Существующие карточки -->
    
    <!-- ✅ ДОБАВИТЬ -->
    <div class="stat-card">
        <div class="stat-label">Автономный режим</div>
        <div class="stat-value">${autonomousEnabled ? '✅' : '❌'}</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Задач в очереди</div>
        <div class="stat-value">${queuedTasks}</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Здоровье системы</div>
        <div class="stat-value">${healthStatus}</div>
    </div>
</div>
```

---

## ✅ ИТОГОВЫЙ ПЛАН ИСПРАВЛЕНИЙ:

1. **SettingsPanel** - добавить поддержку новых настроек
2. **HybridModelProvider** - читать настройки из конфигурации
3. **CursorChatIntegration** - читать `cursorIntegration.useChat`
4. **CursorComposerIntegration** - читать `cursorIntegration.useComposer`
5. **AutonomousOrchestratorIntegration** - проверять `autonomousMode`
6. **StatusPanel** - добавить информацию об автономной системе

---

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:

1. **Пользователь не может настроить автономный режим через UI** - нет вкладки
2. **Настройки в package.json игнорируются** - компоненты их не читают
3. **StatusPanel не показывает статус автономной системы** - нет информации о воркерах
4. **Нет синхронизации между Settings и реальным состоянием**

---

Реализовать исправления?
