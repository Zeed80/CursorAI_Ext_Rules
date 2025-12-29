# Улучшения интеграции с правилами и CursorAI API

## Выполненные улучшения

### 1. ✅ Project Analyzer (Анализатор проекта)

**Файл**: `src/orchestrator/project-analyzer.ts`

Автоматически анализирует проект и создает профиль:

- **Определение типа проекта**: веб-приложение, мобильное, desktop, библиотека
- **Выявление технологий**: языки, фреймворки, базы данных
- **Анализ архитектуры**: MVC, Clean Architecture, Component-based и др.
- **Определение стиля кода**: PSR-12, ESLint, Prettier, PEP 8
- **Поиск паттернов**: Repository, Service Layer, Factory и др.
- **Анализ зависимостей**: из package.json, composer.json и др.

**Профиль сохраняется в**: `.cursor/config/project-profile.json`

### 2. ✅ Rule Generator (Генератор правил)

**Файл**: `src/orchestrator/rule-generator.ts`

Автоматически генерирует правила на основе профиля проекта:

- **Правила для языков**: JavaScript/TypeScript, PHP, Python и др.
- **Правила для фреймворков**: React, Laravel, Django и др.
- **Правила для архитектуры**: MVC, Clean Architecture и др.
- **Правила для паттернов**: Repository, Service Layer и др.

**Правила сохраняются в**: `.cursor/rules/adaptive/`

### 3. ✅ Интеграция с CursorAI Background Agents API

**Файл**: `src/integration/cursor-api.ts`

Реализована интеграция с CursorAI API:

- **Регистрация агентов**: через Background Agents API или fallback через правила
- **Управление моделями**: получение списка моделей, установка модели для агента
- **Отправка сообщений**: взаимодействие с агентами через API
- **Проверка статуса**: мониторинг состояния агентов
- **Fallback методы**: работа без API через правила и конфигурацию

**Инициализация**: автоматически при активации расширения

### 4. ✅ Улучшенная RulesIntegration

**Файл**: `src/storage/rules-integration.ts`

Расширенная функциональность:

- **Автоматическая адаптация**: правила адаптируются при изменении проекта
- **Мониторинг изменений**: отслеживание изменений в конфигурационных файлах
- **Обновление индекса**: автоматическое обновление `rules-index.mdc`
- **Логирование адаптаций**: история изменений в `.cursor/config/adaptation-log.json`
- **Кэширование**: оптимизация производительности

**Триггеры адаптации**:
- Изменение `package.json`, `composer.json`, `requirements.txt` и др.
- Первый запуск проекта
- Ручной запрос через команду

### 5. ✅ Система версионирования правил

**Файл**: `src/storage/rules-versioning.ts`

Полноценная система управления версиями:

- **Создание версий**: автоматическое версионирование при изменении правил
- **История версий**: хранение всех версий правил
- **Откат изменений**: возможность вернуться к предыдущей версии
- **Сравнение версий**: сравнение разных версий правил
- **Очистка старых версий**: автоматическое удаление старых версий (максимум 10)

**Версии хранятся в**: `.cursor/config/rules-versions/`

## Использование

### Автоматическая адаптация

Расширение автоматически:
1. Анализирует проект при первом запуске
2. Генерирует правила на основе анализа
3. Адаптирует правила при изменении конфигурационных файлов

### Ручное управление

**Через команды CursorAI**:
- `Cursor Autonomous: Analyze Project` - анализ проекта
- `Cursor Autonomous: Start Orchestrator` - запуск оркестратора

**Через настройки**:
```json
{
  "cursor-autonomous.apiKey": "your-api-key",
  "cursor-autonomous.enableVirtualUser": true,
  "cursor-autonomous.autoImprove": true
}
```

## Структура файлов

```
.cursor/
├── config/
│   ├── project-profile.json      # Профиль проекта
│   ├── adaptation-log.json       # Лог адаптаций
│   └── rules-versions/            # Версии правил
│       └── [rule-name]-history.json
└── rules/
    ├── adaptive/                   # Автоматически сгенерированные правила
    │   ├── javascript-project.mdc
    │   ├── react-framework.mdc
    │   └── ...
    └── rules-index.mdc            # Индекс всех правил
```

## API интеграция

### Инициализация

```typescript
import { CursorAPI } from './integration/cursor-api';

// Инициализация с API ключом
CursorAPI.initialize('your-api-key');

// Или из настроек
const apiKey = settingsManager.getSetting<string>('apiKey');
CursorAPI.initialize(apiKey);
```

### Регистрация агента

```typescript
await CursorAPI.registerAgent({
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'Main orchestrator agent',
    enabled: true
});
```

### Создание Background Agent

```typescript
await CursorAPI.createBackgroundAgent({
    name: 'Code Analyzer',
    description: 'Analyzes code quality',
    instructions: 'Analyze code and suggest improvements',
    model: 'gpt-4',
    enabled: true
});
```

## Версионирование правил

### Создание версии

```typescript
const version = await rulesVersioning.createVersion(
    'rules/adaptive/javascript-project.mdc',
    ruleContent,
    'Auto-generated from project analysis'
);
```

### Откат к версии

```typescript
await rulesVersioning.rollbackToVersion(
    'rules/adaptive/javascript-project.mdc',
    '1234567890-abc123'
);
```

### Получение истории

```typescript
const history = await rulesVersioning.getVersionHistory(
    'rules/adaptive/javascript-project.mdc'
);
```

## Следующие шаги

1. **Тестирование**: протестировать расширение на реальных проектах
2. **Оптимизация**: улучшить производительность анализа больших проектов
3. **Расширение API**: добавить больше методов CursorAI API
4. **UI улучшения**: добавить визуализацию адаптаций и версий
5. **Документация**: создать подробную документацию для пользователей

## Примечания

- CursorAI Background Agents API находится в бета-версии
- Fallback методы работают через правила и конфигурацию
- Все изменения логируются для отладки
- Версии правил ограничены до 10 последних версий
