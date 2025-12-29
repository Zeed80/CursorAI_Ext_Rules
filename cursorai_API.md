Вот подробная документация, составленная в формате базы знаний (`.md`), на основе актуальных данных о возможностях API Cursor AI, включая новые функции **Cloud Agents API** и **Admin API**.

***

# Cursor AI API & Configuration Guide

Этот документ описывает программные интерфейсы (API) и методы конфигурации Cursor AI. Основной фокус сделан на управлении агентами, моделях и мониторинге использования.

> **Важно:** Cursor AI предоставляет два типа доступа:
> 1. **Cloud Agents API (Beta)** — для программного создания и управления агентами.
> 2. **Admin & Analytics API** — для мониторинга использования, управления командами и получения метрик (доступно для тарифов Business/Enterprise).
> 3. **Локальная конфигурация** — управление поведением редактора через файлы конфигурации (`.cursorrules`, MCP).

---

## 1. Cloud Agents API (Beta)

API для создания автономных агентов кодинга, которые могут выполнять задачи в репозиториях.

### Аутентификация
Для работы с Cloud Agents API требуется API Key.
1. Перейдите в **Cursor Dashboard** → **Integrations**.
2. Создайте новый ключ.
3. Используйте его в заголовке `Authorization`.

**Базовый URL:** `https://api.cursor.com` (или специфичный для агентов endpoint, указанный в дашборде).

### Управление агентами

#### 1.1 Получение списка доступных моделей
Перед запуском агента необходимо знать идентификаторы доступных моделей.

**Запрос:**
```http
GET /cloud-agents/models
Authorization: Bearer <YOUR_API_KEY>
```

**Ответ (пример):**
```json
{
  "models": [
    { "id": "claude-3-5-sonnet", "provider": "anthropic", "context_window": 200000 },
    { "id": "gpt-4o", "provider": "openai", "context_window": 128000 },
    { "id": "cursor-small", "provider": "cursor", "type": "fast" },
    { "id": "cursor-fast", "provider": "cursor", "type": "specialized" }
  ]
}
```

#### 1.2 Запуск агента (Launch Agent)
Назначает задачу агенту с выбранной моделью.

**Запрос:**
```http
POST /cloud-agents/launch
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>

{
  "repository_id": "github.com/org/repo",
  "model_id": "claude-3-5-sonnet",
  "instructions": "Проанализируй папку /src и предложи рефакторинг API.",
  "options": {
    "branch": "feature/refactor-api"
  }
}
```

#### 1.3 Статус и мониторинг агента
Проверка состояния запущенного агента.

**Запрос:**
```http
GET /cloud-agents/status/{agent_id}
```

**Ответ:**
```json
{
  "status": "running", // running, completed, failed
  "current_step": "Analyzing file dependency graph...",
  "logs": ["Started analysis", "Found 14 files..."]
}
```

---

## 2. Admin & Analytics API (Monitoring)

Предназначен для Team/Enterprise аккаунтов для детального мониторинга работы сотрудников и агентов.

### Аутентификация
API ключи создаются в **Dashboard** → **Settings** → **Advanced** → **Admin API Keys**.
Используется **Basic Auth** (API Key как username, пароль пустой).

### Эндпоинты мониторинга

#### 2.1 Получение метрик использования (Usage Analytics)
Позволяет отслеживать, сколько кода пишут агенты (AI Lines of Code).

**Запрос:**
```http
GET /teams/analytics/usage
?startDate=2024-01-01&endDate=now
```

**Ключевые поля в ответе:**
*   `total_lines_suggested`: Количество строк, предложенных ИИ.
*   `total_lines_accepted`: Количество строк, принятых пользователем (Tab completions).
*   `agent_lines_accepted`: Строки, написанные агентом (Composer/Agent) и принятые в коммит.

#### 2.2 AI Code Tracking (Трекинг коммитов)
Позволяет атрибутировать код в git-коммитах конкретным моделям или агентам.

**Запрос:**
```http
GET /teams/code-tracking/commits
```
**Возвращает:** Информацию о том, какой % кода в каждом коммите был сгенерирован ИИ.

---

## 3. Доступные модели (Справочник)

Актуальный список моделей, используемых в Cursor (может изменяться, проверяйте через `GET /models`).

| Модель | Провайдер | Особенности | Назначение |
| :--- | :--- | :--- | :--- |
| **Claude 3.5 Sonnet** | Anthropic | Лучший баланс кода и понимания | Основной агент (Composer), сложные задачи |
| **GPT-4o** | OpenAI | Высокая скорость, мультимодальность | Общие задачи, чат |
| **o1-preview (mini)** | OpenAI | Продвинутое рассуждение (Reasoning) | Сложная архитектура, алгоритмы |
| **Cursor Small** | Cursor | Очень быстрая, дешевая | Автодополнение (Tab), быстрые правки |
| **Claude 3 Opus** | Anthropic | Максимальное качество (медленнее) | Глубокий анализ легаси кода |

---

## 4. Локальная конфигурация агентов (.cursorrules)

Для управления поведением агента внутри редактора (не через Cloud API) используется файл `.cursorrules` в корне проекта. Это "системный промпт" для агента.

**Пример `.cursorrules`:**
```markdown
# Role
Ты старший Python разработчик, специализирующийся на FastAPI.

# Constraints
- Всегда используй Pydantic v2.
- Добавляй type hints во все функции.
- Не используй deprecated методы из pandas.

# Agent Behavior
- При запуске Composer сначала проиндексируй файлы в папке /docs.
- Если я прошу тесты, используй только pytest.
```

---

## 5. Model Context Protocol (MCP)

Для подключения внешних данных к агентам (например, документации или базы данных) Cursor использует стандарт MCP.

**Подключение (через UI или конфиг):**
1.  **Settings** → **Features** → **MCP**.
2.  Добавить новый сервер (SSE или Stdio).

**Пример настройки `mcp.json`:**
```json
{
  "mcpServers": {
    "postgres-db": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost/db"]
    }
  }
}
```
*Это позволяет агентам Cursor выполнять SQL-запросы к вашей базе для получения контекста.*

---

### Сводная таблица методов интеграции

| Задача | Инструмент | Уровень доступа |
| :--- | :--- | :--- |
| **Запуск агентов в фоне** | Cloud Agents API | API Key (Beta) |
| **Получение метрик работы** | Analytics API | Admin API Key (Enterprise) |
| **Настройка стиля кода** | `.cursorrules` | Файл в репозитории |
| **Подключение внешних БД/API** | MCP Servers | Локальная настройка / Config |