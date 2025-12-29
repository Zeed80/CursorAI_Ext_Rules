@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================================
echo   Автономный установщик CursorAI Autonomous Extension
echo ============================================================
echo.

REM Проверка Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите Node.js 18+ и попробуйте снова.
    echo Скачать: https://nodejs.org/
    pause
    exit /b 1
)

echo [1] Проверка зависимостей...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js найден: %%i
)

npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm найден: %%i
)

echo.
echo [2] Установка зависимостей проекта...
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить зависимости
    pause
    exit /b 1
)

echo.
echo [3] Компиляция TypeScript...
call npm run compile
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скомпилировать проект
    pause
    exit /b 1
)

echo.
echo [4] Сборка расширения (.vsix)...
if exist "node_modules\.bin\vsce.cmd" (
    call node_modules\.bin\vsce.cmd package --no-yarn
) else (
    call npx @vscode/vsce package --no-yarn
)
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось собрать расширение
    pause
    exit /b 1
)

REM Поиск .vsix файла
for %%f in (*.vsix) do set VSIX_FILE=%%f
if not defined VSIX_FILE (
    echo [ОШИБКА] Файл .vsix не найден
    pause
    exit /b 1
)

echo [OK] Расширение собрано: %VSIX_FILE%

echo.
echo [5] Поиск CursorAI...

REM Поиск CursorAI
set CURSOR_PATH=
if exist "%LOCALAPPDATA%\Programs\cursor\Cursor.exe" (
    set CURSOR_PATH=%LOCALAPPDATA%\Programs\cursor\Cursor.exe
    echo [OK] CursorAI найден: %CURSOR_PATH%
) else if exist "C:\Program Files\Cursor\Cursor.exe" (
    set CURSOR_PATH=C:\Program Files\Cursor\Cursor.exe
    echo [OK] CursorAI найден: %CURSOR_PATH%
) else if exist "C:\Program Files (x86)\Cursor\Cursor.exe" (
    set CURSOR_PATH=C:\Program Files (x86)\Cursor\Cursor.exe
    echo [OK] CursorAI найден: %CURSOR_PATH%
) else (
    echo [ПРЕДУПРЕЖДЕНИЕ] CursorAI не найден автоматически
    echo.
    echo Собранный файл: %VSIX_FILE%
    echo.
    echo Установите расширение вручную:
    echo 1. Откройте CursorAI
    echo 2. Нажмите Ctrl+Shift+X
    echo 3. Нажмите на ... ^(три точки^) вверху
    echo 4. Выберите "Install from VSIX..."
    echo 5. Выберите файл: %CD%\%VSIX_FILE%
    pause
    exit /b 0
)

echo.
echo [6] Установка расширения в CursorAI...
"%CURSOR_PATH%" --install-extension "%CD%\%VSIX_FILE%" --force
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось установить автоматически
    echo Попробуйте установить вручную через UI CursorAI
    echo Файл: %CD%\%VSIX_FILE%
) else (
    echo [OK] Расширение установлено!
)

echo.
echo ============================================================
echo   Установка завершена!
echo ============================================================
echo.
echo Для использования:
echo 1. Перезапустите CursorAI
echo 2. Откройте любой проект
echo 3. Расширение активируется автоматически
echo.
echo Команды: Ctrl+Shift+P -^> "Cursor Autonomous"
echo.
pause
