#!/bin/bash

# Автономный установщик CursorAI Autonomous Extension для Linux/macOS

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log() {
    echo -e "${1}${2}${NC}"
}

log_step() {
    log "${BLUE}" "\n[$1] $2"
}

log_success() {
    log "${GREEN}" "✓ $1"
}

log_error() {
    log "${RED}" "✗ $1"
}

log_warning() {
    log "${YELLOW}" "⚠ $1"
}

echo ""
log "${BOLD}" "============================================================"
log "${BOLD}" "  Автономный установщик CursorAI Autonomous Extension"
log "${BOLD}" "============================================================"
echo ""

# Проверка зависимостей
log_step "1" "Проверка зависимостей..."

if ! command -v node &> /dev/null; then
    log_error "Node.js не найден. Установите Node.js 18+ и попробуйте снова."
    log_warning "Скачать: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
log_success "Node.js найден: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    log_error "npm не найден. Установите npm и попробуйте снова."
    exit 1
fi

NPM_VERSION=$(npm --version)
log_success "npm найден: $NPM_VERSION"

# Установка зависимостей
log_step "2" "Установка зависимостей проекта..."

if [ ! -f "package.json" ]; then
    log_error "package.json не найден. Убедитесь, что вы находитесь в корне проекта."
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    log_error "Не удалось установить зависимости"
    exit 1
fi

log_success "Зависимости установлены"

# Компиляция
log_step "3" "Компиляция TypeScript..."

npm run compile
if [ $? -ne 0 ]; then
    log_error "Не удалось скомпилировать проект"
    exit 1
fi

if [ ! -f "out/extension.js" ]; then
    log_error "Компиляция не удалась. Файл out/extension.js не найден."
    exit 1
fi

log_success "Проект скомпилирован"

# Сборка расширения
log_step "4" "Сборка расширения (.vsix)..."

# Проверяем наличие vsce
if ! command -v vsce &> /dev/null && [ ! -f "node_modules/.bin/vsce" ]; then
    log_warning "vsce не найден. Устанавливаем..."
    npm install -g @vscode/vsce 2>/dev/null || npm install @vscode/vsce --save-dev
fi

# Используем локальный vsce если доступен, иначе глобальный
VSCE_CMD="vsce"
if [ -f "node_modules/.bin/vsce" ]; then
    VSCE_CMD="node_modules/.bin/vsce"
fi

$VSCE_CMD package --no-yarn
if [ $? -ne 0 ]; then
    log_error "Не удалось собрать расширение"
    exit 1
fi

# Поиск .vsix файла
VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -n1)
if [ -z "$VSIX_FILE" ]; then
    log_error "Файл .vsix не найден"
    exit 1
fi

log_success "Расширение собрано: $VSIX_FILE"

# Поиск CursorAI
log_step "5" "Поиск CursorAI..."

CURSOR_PATH=""

# Проверяем команду cursor в PATH
if command -v cursor &> /dev/null; then
    CURSOR_PATH="cursor"
    log_success "CursorAI найден в PATH"
else
    # Проверяем стандартные пути
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if [ -f "/Applications/Cursor.app/Contents/Resources/app/bin/cursor" ]; then
            CURSOR_PATH="/Applications/Cursor.app/Contents/Resources/app/bin/cursor"
        elif [ -f "$HOME/.local/bin/cursor" ]; then
            CURSOR_PATH="$HOME/.local/bin/cursor"
        fi
    else
        # Linux
        if [ -f "/usr/local/bin/cursor" ]; then
            CURSOR_PATH="/usr/local/bin/cursor"
        elif [ -f "/usr/bin/cursor" ]; then
            CURSOR_PATH="/usr/bin/cursor"
        elif [ -f "$HOME/.local/bin/cursor" ]; then
            CURSOR_PATH="$HOME/.local/bin/cursor"
        fi
    fi
fi

# Установка расширения
log_step "6" "Установка расширения в CursorAI..."

if [ -z "$CURSOR_PATH" ]; then
    log_warning "CursorAI не найден автоматически"
    echo ""
    log_warning "Собранный файл: $(pwd)/$VSIX_FILE"
    echo ""
    log_warning "Установите расширение вручную:"
    echo "  1. Откройте CursorAI"
    echo "  2. Нажмите Ctrl+Shift+X (Cmd+Shift+X на macOS)"
    echo "  3. Нажмите на ... (три точки) вверху"
    echo "  4. Выберите 'Install from VSIX...'"
    echo "  5. Выберите файл: $(pwd)/$VSIX_FILE"
    exit 0
fi

FULL_PATH=$(realpath "$VSIX_FILE")
"$CURSOR_PATH" --install-extension "$FULL_PATH" --force

if [ $? -ne 0 ]; then
    log_warning "Не удалось установить автоматически"
    log_warning "Попробуйте установить вручную через UI CursorAI"
    log_warning "Файл: $FULL_PATH"
else
    log_success "Расширение установлено!"
fi

# Итоги
echo ""
log "${BOLD}" "============================================================"
log_success "Установка завершена!"
log "${BOLD}" "============================================================"
echo ""
echo "Для использования:"
echo "  1. Перезапустите CursorAI"
echo "  2. Откройте любой проект"
echo "  3. Расширение активируется автоматически"
echo ""
echo "Команды: Ctrl+Shift+P → 'Cursor Autonomous'"
echo ""
