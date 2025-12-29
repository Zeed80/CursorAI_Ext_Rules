/**
 * Тесты для проверки получения списка моделей через CursorAI API
 * 
 * Основано на документации: cursorai_API_chatG.md
 * Endpoint: GET /v0/models
 * Auth: Basic Auth (curl -u YOUR_API_KEY:)
 */

import { CursorAPI } from '../cursor-api';

// Сохраняем оригинальный fetch
const originalFetch = global.fetch;

// Мокаем глобальный fetch для тестов
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('CursorAPI - Получение списка моделей', () => {
  const mockApiKey = 'test-api-key-12345';
  const mockBaseUrl = 'https://api.cursor.com';

  beforeEach(() => {
    // Восстанавливаем мокированный fetch для unit тестов
    global.fetch = mockFetch;
    
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Сохраняем реальный API ключ если он был установлен
    const realApiKey = process.env.CURSOR_API_KEY;
    
    // Очищаем переменные окружения только если это не интеграционный тест
    if (!realApiKey) {
      delete process.env.CURSOR_API_KEY;
    }
    
    // Сбрасываем состояние CursorAPI с явным указанием API ключа
    CursorAPI.initialize(mockApiKey, mockBaseUrl, 'v0');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Успешное получение списка моделей', () => {
    it('должен получить список моделей через /v0/models endpoint', async () => {
      // Arrange - подготавливаем мок ответа
      const mockModelsResponse = {
        models: [
          'claude-4-sonnet-thinking',
          'o3',
          'claude-4-opus-thinking',
          'gemini-1b',
          'gpt-4o-advanced',
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockModelsResponse,
      } as Response);

      // Act - вызываем метод получения моделей
      const models = await CursorAPI.getModelsViaAPI();

      // Assert - проверяем результаты
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/models'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Basic'),
          }),
        })
      );

      expect(models).toHaveLength(5);
      expect(models[0].id).toBe('claude-4-sonnet-thinking');
      expect(models[0].name).toBe('claude-4-sonnet-thinking');
      expect(models[1].id).toBe('o3');
    });

    it('должен использовать Basic Auth для v0 API', async () => {
      const mockModelsResponse = { models: ['gpt-4o'] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockModelsResponse,
      } as Response);

      await CursorAPI.getModelsViaAPI();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers;
      const authHeader = headers['Authorization'];

      expect(authHeader).toMatch(/^Basic /);
      
      // Проверяем, что в заголовке закодирован API ключ с двоеточием (формат YOUR_API_KEY:)
      const base64Part = authHeader.replace('Basic ', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      expect(decoded).toBe(`${mockApiKey}:`);
    });

    it('должен правильно преобразовывать список строк моделей в массив CursorModel', async () => {
      const mockModelsResponse = {
        models: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-pro'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockModelsResponse,
      } as Response);

      const models = await CursorAPI.getModelsViaAPI();

      expect(models).toHaveLength(3);
      models.forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(typeof model.id).toBe('string');
        expect(model.id).toBe(model.name);
      });

      // Проверяем определение провайдеров
      const gptModel = models.find((m) => m.id === 'gpt-4o');
      expect(gptModel?.provider).toBe('openai');

      const claudeModel = models.find((m) => m.id === 'claude-3-5-sonnet');
      expect(claudeModel?.provider).toBe('anthropic');

      const geminiModel = models.find((m) => m.id === 'gemini-pro');
      expect(geminiModel?.provider).toBe('google');
    });

    it('должен исключать модели GitHub Copilot из списка', async () => {
      const mockModelsResponse = {
        models: [
          'gpt-4o',
          'github-copilot',
          'claude-3-5-sonnet',
          'gh-copilot-chat',
          'copilot',
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockModelsResponse,
      } as Response);

      const models = await CursorAPI.getModelsViaAPI();

      // Проверяем, что GitHub Copilot модели отфильтрованы
      expect(models.length).toBeLessThan(mockModelsResponse.models.length);
      expect(models.find((m) => m.id.includes('copilot') || m.id.includes('github'))).toBeUndefined();
      expect(models.find((m) => m.id === 'gpt-4o')).toBeDefined();
      expect(models.find((m) => m.id === 'claude-3-5-sonnet')).toBeDefined();
    });
  });

  describe('Обработка ошибок', () => {
    it('должен вернуть пустой массив при ошибке 401 (Unauthorized)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const models = await CursorAPI.getModelsViaAPI();

      expect(models).toEqual([]);
    });

    it('должен вернуть пустой массив при ошибке 403 (Forbidden)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      const models = await CursorAPI.getModelsViaAPI();

      expect(models).toEqual([]);
    });

    it('должен вернуть пустой массив при ошибке сети', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const models = await CursorAPI.getModelsViaAPI();

      expect(models).toEqual([]);
    });

    it('должен вернуть пустой массив при неверном формате ответа', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'response' }), // Нет поля models
      } as Response);

      const models = await CursorAPI.getModelsViaAPI();

      expect(models).toEqual([]);
    });

    it('должен вернуть пустой массив при пустом списке моделей', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ models: [] }),
      } as Response);

      const models = await CursorAPI.getModelsViaAPI();

      expect(models).toEqual([]);
    });
  });

  describe('Работа без API ключа', () => {
    it('должен вернуть пустой массив если API ключ не установлен', async () => {
      // Инициализируем без API ключа
      CursorAPI.initialize(undefined, mockBaseUrl, 'v0');

      const models = await CursorAPI.getModelsViaAPI();

      expect(models).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Формат запроса', () => {
    it('должен использовать правильный URL для v0 API', async () => {
      const mockModelsResponse = { models: ['gpt-4o'] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockModelsResponse,
      } as Response);

      await CursorAPI.getModelsViaAPI();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const url = fetchCall[0];

      expect(url).toBe(`${mockBaseUrl}/v0/models`);
    });

    it('должен устанавливать правильные заголовки', async () => {
      const mockModelsResponse = { models: ['gpt-4o'] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockModelsResponse,
      } as Response);

      await CursorAPI.getModelsViaAPI();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeDefined();
      expect(headers['Authorization']).toMatch(/^Basic /);
    });
  });

  describe('Интеграционные тесты (требуют реальный API ключ)', () => {
    const realApiKey = process.env.CURSOR_API_KEY;

    // Пропускаем тесты если нет реального API ключа
    const testIfApiKey = realApiKey ? it : it.skip;

    beforeEach(() => {
      // Восстанавливаем оригинальный fetch для интеграционных тестов
      global.fetch = originalFetch as typeof fetch;
    });

    afterEach(() => {
      // Восстанавливаем мокированный fetch для других тестов
      global.fetch = mockFetch;
    });

    testIfApiKey('должен получить реальный список моделей от API', async () => {
      // Проверяем, что API ключ действительно установлен
      expect(realApiKey).toBeDefined();
      expect(realApiKey?.length).toBeGreaterThan(0);
      
      // Инициализируем CursorAPI с реальным ключом
      CursorAPI.initialize(realApiKey!, mockBaseUrl, 'v0');
      
      // Проверяем, что ключ установлен
      const savedKey = CursorAPI.getApiKey();
      expect(savedKey).toBe(realApiKey);

      const models = await CursorAPI.getModelsViaAPI();

      // Логируем для диагностики
      console.log('Получено моделей:', models.length);
      if (models.length > 0) {
        console.log('Первые 3 модели:', models.slice(0, 3).map(m => m.id));
      } else {
        console.log('⚠️ Массив моделей пуст. Возможные причины:');
        console.log('  1. Неверный API ключ');
        console.log('  2. API недоступен или недоступен endpoint /v0/models');
        console.log('  3. Ошибка при запросе');
        console.log('Проверьте логи консоли выше для деталей ошибки.');
      }

      // Проверяем, что получили хотя бы одну модель
      expect(models.length).toBeGreaterThan(0);

      // Проверяем структуру первой модели
      if (models.length > 0) {
        expect(models[0]).toHaveProperty('id');
        expect(models[0]).toHaveProperty('name');
        expect(typeof models[0].id).toBe('string');
        expect(models[0].id.length).toBeGreaterThan(0);
      }
    }, 30000); // Увеличиваем таймаут для реального API запроса

    testIfApiKey('должен получить модели из формата согласно документации', async () => {
      CursorAPI.initialize(realApiKey!, mockBaseUrl, 'v0');

      const models = await CursorAPI.getModelsViaAPI();

      // Проверяем формат ответа согласно документации
      // Документация говорит, что ответ имеет формат: { "models": ["model1", "model2", ...] }
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0); // Должен быть хотя бы один результат

      // Проверяем, что все модели имеют правильную структуру
      models.forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model.id).toBe(model.name); // В v0 API модели - это строки
      });
    }, 30000);
  });
});
