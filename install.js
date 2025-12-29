#!/usr/bin/env node

/**
 * Автономный установщик расширения CursorAI Autonomous Extension
 * Автоматически проверяет зависимости, компилирует и устанавливает расширение
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n[${step}] ${message}`, 'blue');
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠ ${message}`, 'yellow');
}

function checkCommand(command) {
    try {
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        try {
            execSync(`where ${command}`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }
}

function findCursorExecutable() {
    const platform = os.platform();
    const homeDir = os.homedir();

    const possiblePaths = {
        win32: [
            path.join(homeDir, 'AppData', 'Local', 'Programs', 'cursor', 'Cursor.exe'),
            path.join('C:', 'Program Files', 'Cursor', 'Cursor.exe'),
            path.join('C:', 'Program Files (x86)', 'Cursor', 'Cursor.exe')
        ],
        darwin: [
            '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
            '/usr/local/bin/cursor',
            path.join(homeDir, '.local', 'bin', 'cursor')
        ],
        linux: [
            '/usr/local/bin/cursor',
            '/usr/bin/cursor',
            path.join(homeDir, '.local', 'bin', 'cursor'),
            path.join(homeDir, 'cursor', 'bin', 'cursor')
        ]
    };

    const paths = possiblePaths[platform] || [];
    
    // Проверяем команду cursor в PATH
    if (checkCommand('cursor')) {
        return 'cursor';
    }

    // Проверяем возможные пути
    for (const cursorPath of paths) {
        if (fs.existsSync(cursorPath)) {
            return cursorPath;
        }
    }

    return null;
}

function checkDependencies() {
    logStep(1, 'Проверка зависимостей...');

    const checks = {
        node: { command: 'node', minVersion: '18.0.0' },
        npm: { command: 'npm', minVersion: '9.0.0' }
    };

    let allOk = true;

    for (const [name, config] of Object.entries(checks)) {
        if (!checkCommand(config.command)) {
            logError(`${config.command} не найден. Установите Node.js ${config.minVersion} или выше.`);
            allOk = false;
        } else {
            try {
                const version = execSync(`${config.command} --version`, { encoding: 'utf-8' }).trim();
                logSuccess(`${config.command} найден: ${version}`);
            } catch {
                logWarning(`Не удалось определить версию ${config.command}`);
            }
        }
    }

    return allOk;
}

function installDependencies() {
    logStep(2, 'Установка зависимостей проекта...');

    if (!fs.existsSync('package.json')) {
        logError('package.json не найден. Убедитесь, что вы находитесь в корне проекта.');
        process.exit(1);
    }

    try {
        log('Запуск npm install...', 'yellow');
        execSync('npm install', { stdio: 'inherit' });
        logSuccess('Зависимости установлены');
        return true;
    } catch (error) {
        logError('Ошибка при установке зависимостей');
        console.error(error.message);
        return false;
    }
}

function compileProject() {
    logStep(3, 'Компиляция TypeScript...');

    try {
        log('Запуск компиляции...', 'yellow');
        execSync('npm run compile', { stdio: 'inherit' });
        
        // Проверяем наличие скомпилированных файлов
        if (!fs.existsSync('out/extension.js')) {
            logError('Компиляция не удалась. Файл out/extension.js не найден.');
            return false;
        }

        logSuccess('Проект скомпилирован');
        return true;
    } catch (error) {
        logError('Ошибка при компиляции');
        console.error(error.message);
        return false;
    }
}

function buildExtension() {
    logStep(4, 'Сборка расширения (.vsix)...');

    // Проверяем наличие vsce
    if (!checkCommand('vsce') && !fs.existsSync('node_modules/.bin/vsce')) {
        logWarning('vsce не найден. Устанавливаем...');
        try {
            execSync('npm install -g @vscode/vsce', { stdio: 'inherit' });
        } catch {
            logWarning('Не удалось установить vsce глобально. Пробуем локально...');
        }
    }

    try {
        const vsceCommand = fs.existsSync('node_modules/.bin/vsce') 
            ? 'node_modules/.bin/vsce' 
            : 'vsce';

        log('Запуск упаковки расширения...', 'yellow');
        execSync(`${vsceCommand} package --no-yarn`, { stdio: 'inherit' });

        // Ищем созданный .vsix файл
        const files = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));
        if (files.length === 0) {
            logError('Файл .vsix не создан');
            return null;
        }

        const vsixFile = files[0];
        logSuccess(`Расширение собрано: ${vsixFile}`);
        return vsixFile;
    } catch (error) {
        logError('Ошибка при сборке расширения');
        console.error(error.message);
        return null;
    }
}

function installExtension(vsixFile) {
    logStep(5, 'Установка расширения в CursorAI...');

    const cursorPath = findCursorExecutable();
    
    if (!cursorPath) {
        logError('CursorAI не найден. Установите CursorAI и попробуйте снова.');
        logWarning(`Собранный файл: ${vsixFile}`);
        logWarning('Вы можете установить его вручную через UI CursorAI:');
        logWarning('1. Откройте CursorAI');
        logWarning('2. Нажмите Ctrl+Shift+X (Cmd+Shift+X на macOS)');
        logWarning('3. Нажмите на ... → "Install from VSIX..."');
        logWarning(`4. Выберите файл: ${path.resolve(vsixFile)}`);
        return false;
    }

    try {
        const fullPath = path.resolve(vsixFile);
        log(`Установка через: ${cursorPath}`, 'yellow');
        
        execSync(`"${cursorPath}" --install-extension "${fullPath}" --force`, {
            stdio: 'inherit'
        });

        logSuccess('Расширение установлено в CursorAI!');
        return true;
    } catch (error) {
        logError('Ошибка при установке расширения');
        console.error(error.message);
        logWarning(`Собранный файл: ${vsixFile}`);
        logWarning('Попробуйте установить вручную через UI CursorAI');
        return false;
    }
}

function main() {
    log('\n' + '='.repeat(60), 'bold');
    log('  Автономный установщик CursorAI Autonomous Extension', 'bold');
    log('='.repeat(60) + '\n', 'bold');

    // Проверка зависимостей
    if (!checkDependencies()) {
        logError('\nНе все зависимости установлены. Установите недостающие и попробуйте снова.');
        process.exit(1);
    }

    // Установка зависимостей проекта
    if (!installDependencies()) {
        logError('\nНе удалось установить зависимости проекта.');
        process.exit(1);
    }

    // Компиляция
    if (!compileProject()) {
        logError('\nНе удалось скомпилировать проект.');
        process.exit(1);
    }

    // Сборка расширения
    const vsixFile = buildExtension();
    if (!vsixFile) {
        logError('\nНе удалось собрать расширение.');
        process.exit(1);
    }

    // Установка
    const installed = installExtension(vsixFile);

    // Итоги
    log('\n' + '='.repeat(60), 'bold');
    if (installed) {
        logSuccess('Установка завершена успешно!');
        log('\nДля использования расширения:');
        log('1. Перезапустите CursorAI');
        log('2. Откройте любой проект');
        log('3. Расширение активируется автоматически');
        log('\nКоманды расширения доступны через Ctrl+Shift+P → "Cursor Autonomous"');
    } else {
        logWarning('Расширение собрано, но не установлено автоматически.');
        log(`Файл для ручной установки: ${path.resolve(vsixFile)}`);
    }
    log('='.repeat(60) + '\n', 'bold');
}

// Запуск
try {
    main();
} catch (error) {
    logError('\nКритическая ошибка:');
    console.error(error);
    process.exit(1);
}
