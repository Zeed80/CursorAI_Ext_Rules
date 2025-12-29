# Тесты для CursorAI API

## Описание

Набор тестов для проверки получения списка моделей через CursorAI API согласно документации в `cursorai_API_chatG.md`.

## Запуск тестов

### Все тесты

```bash
npm run test:jest
```

### Только тесты API моделей

```bash
npm run test:api
```

### С покрытием кода

```bash
npm run test:jest:coverage
```

### В режиме watch (автоматический перезапуск при изменениях)

```bash
npm run test:jest:watch
```

## Структура тестов

### Unit тесты (с моками)

Все unit тесты используют моки для `fetch` и не требуют реального API ключа:

- ✅ Успешное получение списка моделей
- ✅ Использование Basic Auth для v0 API
- ✅ Преобразование списка строк в массив CursorModel
- ✅ Фильтрация моделей GitHub Copilot
- ✅ Обработка ошибок (401, 403, сетевые ошибки)
- ✅ Работа без API ключа
- ✅ Проверка формата запроса и заголовков

### Интеграционные тесты

Интеграционные тесты требуют реальный API ключ CursorAI и автоматически пропускаются, если ключ не установлен:

- Проверка получения реального списка моделей от API
- Проверка формата ответа согласно документации

Для запуска интеграционных тестов установите переменную окружения:

```bash
export CURSOR_API_KEY=your-api-key-here
npm run test:api
```

Или в Windows PowerShell:

```powershell
$env:CURSOR_API_KEY="your-api-key-here"
npm run test:api
```

## Endpoint тестирования

Тесты проверяют endpoint согласно документации:

- **URL**: `https://api.cursor.com/v0/models`
- **Method**: `GET`
- **Auth**: Basic Auth (формат: `YOUR_API_KEY:` с двоеточием)
- **Response**: `{ "models": ["model1", "model2", ...] }`

## Примеры тестов

### Успешное получение моделей

```typescript
const mockModelsResponse = {
  models: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'],
};

(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  status: 200,
  json: async () => mockModelsResponse,
});

const models = await CursorAPI.getModelsViaAPI();
expect(models).toHaveLength(3);
```

### Обработка ошибок

```typescript
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: false,
  status: 401,
  statusText: 'Unauthorized',
});

const models = await CursorAPI.getModelsViaAPI();
expect(models).toEqual([]);
```

## Результаты тестов

При последнем запуске:

```
Test Suites: 1 passed, 1 total
Tests:       2 skipped, 12 passed, 14 total
Time:        1.688 s
```

- ✅ 12 unit тестов прошли успешно
- ⏭️ 2 интеграционных теста пропущены (нет API ключа)

## Требования

- Node.js 18+
- npm или yarn
- Jest (установлен как dev dependency)
- TypeScript (для компиляции)

## Зависимости

Все зависимости установлены через `npm install`:

- `jest` - тестовый фреймворк
- `@types/jest` - типы для Jest
- `ts-jest` - TypeScript поддержка для Jest
- `@jest/globals` - глобальные типы Jest

## Документация

Основано на документации в `cursorai_API_chatG.md`:

- Endpoint: `GET /v0/models`
- Basic Auth: `curl -u YOUR_API_KEY:`
- Формат ответа: `{ "models": ["model1", "model2", ...] }`
