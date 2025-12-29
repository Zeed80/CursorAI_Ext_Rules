#!/usr/bin/env node

/**
 * Сборка standalone установщика
 * Создает исполняемые файлы для разных платформ
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function main() {
    log('\n' + '='.repeat(60), 'bold');
    log('  Сборка Standalone установщика', 'bold');
    log('='.repeat(60) + '\n', 'bold');

    // Проверка наличия pkg
    logStep(1, 'Проверка зависимостей...');
    
    try {
        execSync('npm list pkg', { stdio: 'ignore' });
    } catch {
        log('Установка pkg...', 'yellow');
        try {
            execSync('npm install --save-dev pkg', { stdio: 'inherit' });
            logSuccess('pkg установлен');
        } catch (error) {
            logError('Не удалось установить pkg');
            logError('Установите вручную: npm install --save-dev pkg');
            process.exit(1);
        }
    }

    // Компиляция проекта
    logStep(2, 'Компиляция проекта...');
    try {
        execSync('npm run compile', { stdio: 'inherit' });
        logSuccess('Проект скомпилирован');
    } catch (error) {
        logError('Ошибка при компиляции');
        process.exit(1);
    }

    // Сборка .vsix
    logStep(3, 'Сборка расширения (.vsix)...');
    try {
        execSync('npm run package', { stdio: 'inherit' });
        
        // Поиск .vsix файла
        const files = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));
        if (files.length === 0) {
            logError('Файл .vsix не создан');
            process.exit(1);
        }
        
        const vsixFile = files[0];
        logSuccess(`Расширение собрано: ${vsixFile}`);
    } catch (error) {
        logError('Ошибка при сборке расширения');
        process.exit(1);
    }

    // Создание директории для standalone установщиков
    logStep(4, 'Сборка standalone установщиков...');
    
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', { recursive: true });
    }

    // Сборка для разных платформ
    const platforms = [
        { target: 'node18-win-x64', name: 'installer-windows.exe', os: 'Windows' },
        { target: 'node18-macos-x64', name: 'installer-macos', os: 'macOS' },
        { target: 'node18-linux-x64', name: 'installer-linux', os: 'Linux' }
    ];

    for (const platform of platforms) {
        try {
            log(`Сборка для ${platform.os}...`, 'yellow');
            execSync(
                `npx pkg install.js --targets ${platform.target} --output-path dist/${platform.name}`,
                { stdio: 'inherit' }
            );
            logSuccess(`${platform.os} установщик создан: dist/${platform.name}`);
        } catch (error) {
            logError(`Ошибка при сборке для ${platform.os}`);
            logError('Это нормально, если вы не на этой платформе');
        }
    }

    // Копирование .vsix в dist
    const vsixFiles = fs.readdirSync('.').filter(f => f.endsWith('.vsix'));
    if (vsixFiles.length > 0) {
        const vsixFile = vsixFiles[0];
        fs.copyFileSync(vsixFile, path.join('dist', vsixFile));
        logSuccess(`Файл .vsix скопирован в dist/${vsixFile}`);
    }

    // Создание README для dist
    const distReadme = `# Готовые файлы для установки

## Файл расширения (.vsix)

**cursor-ai-autonomous-extension-*.vsix** - это файл расширения для CursorAI.

### Установка:
1. Откройте CursorAI
2. Нажмите Ctrl+Shift+X (Cmd+Shift+X на macOS)
3. Перетащите .vsix файл в окно CursorAI
4. Или: Нажмите на ... → "Install from VSIX..." → выберите файл

## Standalone установщики

**installer-windows.exe** - Установщик для Windows
- Не требует Node.js
- Просто запустите и следуйте инструкциям

**installer-macos** - Установщик для macOS
- Не требует Node.js
- Запустите: chmod +x installer-macos && ./installer-macos

**installer-linux** - Установщик для Linux
- Не требует Node.js
- Запустите: chmod +x installer-linux && ./installer-linux

## Рекомендация

**Самый простой способ:** Используйте файл .vsix - просто перетащите его в CursorAI!
`;

    fs.writeFileSync(path.join('dist', 'README.txt'), distReadme);
    logSuccess('README создан в dist/README.txt');

    // Итоги
    log('\n' + '='.repeat(60), 'bold');
    logSuccess('Сборка завершена!');
    log('\nФайлы в директории dist/:', 'bold');
    
    if (fs.existsSync('dist')) {
        const files = fs.readdirSync('dist');
        files.forEach(file => {
            const filePath = path.join('dist', file);
            const stats = fs.statSync(filePath);
            const size = (stats.size / 1024 / 1024).toFixed(2);
            log(`  - ${file} (${size} MB)`, 'green');
        });
    }

    log('\nРекомендация:', 'bold');
    log('Используйте файл .vsix - просто перетащите его в CursorAI!', 'yellow');
    log('='.repeat(60) + '\n', 'bold');
}

try {
    main();
} catch (error) {
    logError('\nКритическая ошибка:');
    console.error(error);
    process.exit(1);
}
