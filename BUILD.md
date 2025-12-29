# Инструкция по сборке расширения для CursorAI

## Быстрый старт: Автономный установщик

**Самый простой способ установки!**

### Windows:
```bash
install.bat
```

### Linux/macOS:
```bash
chmod +x install.sh
./install.sh
```

### Универсальный способ (любая ОС):
```bash
npm run install
```

Автономный установщик автоматически выполнит все шаги:
- ✓ Проверит зависимости
- ✓ Установит npm пакеты
- ✓ Скомпилирует проект
- ✓ Соберет .vsix файл
- ✓ Установит расширение в CursorAI

---

## Ручная установка

## Предварительные требования

1. **Node.js** версии 18 или выше
2. **npm** (устанавливается вместе с Node.js)
3. **Git** (для версионирования)

## Шаг 1: Установка зависимостей

Откройте терминал в корневой директории проекта и выполните:

```bash
npm install
```

Это установит все необходимые зависимости, включая:
- TypeScript компилятор
- VS Code Extension Manager (vsce)
- Другие зависимости проекта

## Шаг 2: Компиляция TypeScript

Скомпилируйте TypeScript код в JavaScript:

```bash
npm run compile
```

Или для автоматической перекомпиляции при изменениях:

```bash
npm run watch
```

## Шаг 3: Сборка расширения (.vsix файл)

Соберите расширение в формат .vsix:

```bash
npm run package
```

Или используйте полную команду сборки (компиляция + упаковка):

```bash
npm run build
```

После успешной сборки вы найдете файл `cursor-ai-autonomous-extension-0.1.0.vsix` в корневой директории проекта.

## Шаг 4: Установка в CursorAI

### Способ 1: Через командную строку

1. Откройте CursorAI
2. Откройте терминал (View → Terminal или Ctrl+`)
3. Выполните команду:

```bash
code --install-extension cursor-ai-autonomous-extension-0.1.0.vsix
```

**Примечание**: Если команда `code` не найдена, используйте полный путь к CursorAI:

**Windows:**
```bash
"C:\Users\<YourUsername>\AppData\Local\Programs\cursor\Cursor.exe" --install-extension cursor-ai-autonomous-extension-0.1.0.vsix
```

**macOS:**
```bash
/Applications/Cursor.app/Contents/Resources/app/bin/cursor --install-extension cursor-ai-autonomous-extension-0.1.0.vsix
```

**Linux:**
```bash
/usr/local/bin/cursor --install-extension cursor-ai-autonomous-extension-0.1.0.vsix
```

### Способ 2: Через UI CursorAI

1. Откройте CursorAI
2. Нажмите `Ctrl+Shift+X` (или `Cmd+Shift+X` на macOS) для открытия панели расширений
3. Нажмите на три точки (`...`) в верхней части панели
4. Выберите "Install from VSIX..."
5. Выберите файл `cursor-ai-autonomous-extension-0.1.0.vsix`

### Способ 3: Перетаскивание файла

1. Откройте CursorAI
2. Откройте панель расширений (`Ctrl+Shift+X`)
3. Перетащите файл `.vsix` в окно CursorAI

## Шаг 5: Активация расширения

После установки:

1. Перезапустите CursorAI (если требуется)
2. Откройте любой проект
3. Расширение активируется автоматически при открытии проекта

## Проверка установки

1. Откройте командную палитру (`Ctrl+Shift+P` или `Cmd+Shift+P`)
2. Введите "Cursor Autonomous"
3. Вы должны увидеть команды расширения:
   - `Cursor Autonomous: Start Orchestrator`
   - `Cursor Autonomous: Enable Virtual User Mode`
   - И другие команды

## Разработка и отладка

### Запуск в режиме разработки

1. Откройте проект в VS Code
2. Нажмите `F5` или выберите "Run → Start Debugging"
3. Откроется новое окно "Extension Development Host"
4. В этом окне расширение будет работать в режиме отладки

### Просмотр логов

Логи расширения можно просмотреть в:
- **Output панель** → выберите "Log (Extension Host)"
- **Developer Tools** → `Help → Toggle Developer Tools`

## Обновление расширения

При обновлении расширения:

1. Увеличьте версию в `package.json`:
   ```json
   "version": "0.1.1"
   ```

2. Пересоберите:
   ```bash
   npm run build
   ```

3. Переустановите (старая версия будет автоматически заменена):
   ```bash
   code --install-extension cursor-ai-autonomous-extension-0.1.1.vsix --force
   ```

## Публикация расширения (опционально)

Если вы хотите опубликовать расширение в Marketplace:

1. Создайте аккаунт на [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Получите Personal Access Token
3. Войдите в vsce:
   ```bash
   npx vsce login <publisher-name>
   ```
4. Опубликуйте:
   ```bash
   npm run package
   npx vsce publish
   ```

## Устранение проблем

### Ошибка: "vsce не найден"

Установите vsce глобально:
```bash
npm install -g @vscode/vsce
```

Или используйте через npx:
```bash
npx @vscode/vsce package
```

### Ошибка компиляции TypeScript

Проверьте версию TypeScript:
```bash
npm list typescript
```

Должна быть версия 5.0 или выше.

### Расширение не активируется

1. Проверьте логи в Output панели
2. Убедитесь, что все зависимости установлены
3. Проверьте, что файлы скомпилированы в директории `out/`

### Проблемы с установкой .vsix

1. Убедитесь, что CursorAI закрыт перед установкой
2. Попробуйте установить через командную строку с флагом `--force`
3. Проверьте права доступа к файлу

## Структура собранного расширения

После сборки файл `.vsix` содержит:
- Скомпилированный JavaScript код (`out/`)
- Правила из `.cursor/rules/`
- Конфигурацию (`package.json`)
- Метаданные расширения

Исходный TypeScript код и другие файлы разработки исключены из пакета.

## Дополнительные команды

```bash
# Только компиляция
npm run compile

# Компиляция с отслеживанием изменений
npm run watch

# Проверка кода линтером
npm run lint

# Полная сборка (компиляция + упаковка)
npm run build

# Упаковка в .vsix
npm run package
```
