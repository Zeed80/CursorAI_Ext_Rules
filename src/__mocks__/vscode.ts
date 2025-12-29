/**
 * Мок для vscode модуля для тестирования вне VS Code окружения
 */

// Хранилище для моковых настроек
const mockConfig: { [section: string]: { [key: string]: any } } = {};

export const workspace = {
  workspaceFolders: undefined,
  getConfiguration: jest.fn((section: string) => {
    const sectionConfig = mockConfig[section] || {};
    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        // Поддержка вложенных ключей (например, 'api.apiKey')
        const keys = key.split('.');
        let value = sectionConfig;
        for (const k of keys) {
          value = value?.[k];
          if (value === undefined) {
            return defaultValue;
          }
        }
        return value !== undefined ? value : defaultValue;
      }),
      update: jest.fn(async (key: string, value: any) => {
        if (!mockConfig[section]) {
          mockConfig[section] = {};
        }
        const keys = key.split('.');
        let target = mockConfig[section];
        for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]]) {
            target[keys[i]] = {};
          }
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
      }),
    };
  }),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
  },
};

export const Uri = {
  joinPath: jest.fn((...parts: any[]) => ({
    fsPath: parts.map(p => (typeof p === 'string' ? p : p.fsPath || p.toString())).join('/'),
    toString: () => parts.map(p => (typeof p === 'string' ? p : p.fsPath || p.toString())).join('/'),
  })),
  file: jest.fn((path: string) => ({
    fsPath: path,
    toString: () => path,
  })),
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

// Функция для очистки моковых настроек
export const clearMockConfig = () => {
  Object.keys(mockConfig).forEach(key => delete mockConfig[key]);
};

export default {
  workspace,
  Uri,
  ConfigurationTarget,
  commands: {
    executeCommand: jest.fn(),
  },
};
