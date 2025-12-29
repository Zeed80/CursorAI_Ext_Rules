#!/usr/bin/env node

/**
 * Автоматический скрипт публикации на GitHub
 * 
 * Выполняет:
 * 1. Проверку готовности к публикации
 * 2. Обновление версии
 * 3. Создание CHANGELOG
 * 4. Создание git commit и tag
 * 5. Публикацию на GitHub (создание release)
 * 6. Опционально публикацию в marketplace
 * 
 * Использование:
 *   node publish.js [patch|minor|major] [--dry-run] [--skip-tests] [--skip-build] [--marketplace]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[36m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n[${step}] ${message}`, 'cyan');
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

function logInfo(message) {
    log(`ℹ ${message}`, 'blue');
}

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const versionType = args.find(arg => ['patch', 'minor', 'major'].includes(arg)) || 'patch';
const isDryRun = args.includes('--dry-run');
const skipTests = args.includes('--skip-tests');
const skipBuild = args.includes('--skip-build');
const publishMarketplace = args.includes('--marketplace');

// Чтение package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = packageJson.version;

// Функция для выполнения команд
function exec(command, options = {}) {
    try {
        const result = execSync(command, {
            encoding: 'utf8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
        return { success: true, output: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Функция для запроса подтверждения
function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

// Проверка наличия Git
function checkGit() {
    logStep(1, 'Проверка Git...');
    const result = exec('git --version', { silent: true });
    if (!result.success) {
        logError('Git не найден. Установите Git для публикации.');
        process.exit(1);
    }
    logSuccess('Git найден');
}

// Проверка статуса Git
async function checkGitStatus() {
    logStep(2, 'Проверка статуса Git...');
    
    // Проверка наличия изменений
    const statusResult = exec('git status --porcelain', { silent: true });
    if (statusResult.success && statusResult.output.trim()) {
        logWarning('Обнаружены незакоммиченные изменения:');
        console.log(statusResult.output);
        
        if (!isDryRun) {
            const shouldContinue = await askQuestion('\nПродолжить публикацию? (y/n): ');
            if (!shouldContinue) {
                logError('Публикация отменена');
                process.exit(1);
            }
        }
    }
    
    // Проверка наличия удаленного репозитория
    const remoteResult = exec('git remote get-url origin', { silent: true });
    if (!remoteResult.success) {
        logError('Удаленный репозиторий не настроен. Настройте origin:');
        logInfo('  git remote add origin <repository-url>');
        process.exit(1);
    }
    
    logSuccess('Git статус проверен');
    return remoteResult.output.trim();
}

// Проверка наличия Node.js и npm
function checkDependencies() {
    logStep(3, 'Проверка зависимостей...');
    
    const nodeResult = exec('node --version', { silent: true });
    if (!nodeResult.success) {
        logError('Node.js не найден');
        process.exit(1);
    }
    logSuccess(`Node.js: ${nodeResult.output.trim()}`);
    
    const npmResult = exec('npm --version', { silent: true });
    if (!npmResult.success) {
        logError('npm не найден');
        process.exit(1);
    }
    logSuccess(`npm: ${npmResult.output.trim()}`);
}

// Обновление версии
function updateVersion() {
    logStep(4, `Обновление версии (${versionType})...`);
    
    const versionParts = currentVersion.split('.').map(Number);
    let newVersion;
    
    switch (versionType) {
        case 'major':
            newVersion = `${versionParts[0] + 1}.0.0`;
            break;
        case 'minor':
            newVersion = `${versionParts[0]}.${versionParts[1] + 1}.0`;
            break;
        case 'patch':
        default:
            newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
            break;
    }
    
    logInfo(`Текущая версия: ${currentVersion}`);
    logInfo(`Новая версия: ${newVersion}`);
    
    if (isDryRun) {
        logWarning('DRY RUN: версия не будет обновлена');
        return newVersion;
    }
    
    // Обновление package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    logSuccess(`Версия обновлена до ${newVersion}`);
    
    return newVersion;
}

// Запуск тестов
function runTests() {
    if (skipTests) {
        logWarning('Пропуск тестов (--skip-tests)');
        return;
    }
    
    logStep(5, 'Запуск тестов...');
    
    const testResult = exec('npm test', { silent: false });
    if (!testResult.success) {
        logError('Тесты не прошли. Исправьте ошибки перед публикацией.');
        if (!isDryRun) {
            process.exit(1);
        }
    }
    
    logSuccess('Тесты пройдены');
}

// Компиляция проекта
function compileProject() {
    if (skipBuild) {
        logWarning('Пропуск сборки (--skip-build)');
        return;
    }
    
    logStep(6, 'Компиляция проекта...');
    
    const compileResult = exec('npm run compile', { silent: false });
    if (!compileResult.success) {
        logError('Компиляция не удалась');
        if (!isDryRun) {
            process.exit(1);
        }
    }
    
    logSuccess('Проект скомпилирован');
}

// Сборка расширения
function buildExtension(newVersion) {
    if (skipBuild) {
        logWarning('Пропуск сборки (--skip-build)');
        return null;
    }
    
    logStep(7, 'Сборка расширения...');
    
    const buildResult = exec('npm run build', { silent: false });
    if (!buildResult.success) {
        logError('Сборка не удалась');
        if (!isDryRun) {
            process.exit(1);
        }
        return null;
    }
    
    const vsixFile = `cursor-ai-autonomous-extension-${newVersion}.vsix`;
    const vsixPath = path.join(__dirname, vsixFile);
    
    if (!fs.existsSync(vsixPath)) {
        logError(`Файл ${vsixFile} не найден`);
        if (!isDryRun) {
            process.exit(1);
        }
        return null;
    }
    
    logSuccess(`Расширение собрано: ${vsixFile}`);
    return vsixFile;
}

// Создание CHANGELOG
function createChangelog(newVersion) {
    logStep(8, 'Создание CHANGELOG...');
    
    const changelogPath = path.join(__dirname, 'CHANGELOG.md');
    let changelog = '';
    
    if (fs.existsSync(changelogPath)) {
        changelog = fs.readFileSync(changelogPath, 'utf8');
    } else {
        changelog = '# Changelog\n\nВсе важные изменения в этом проекте будут документированы в этом файле.\n\n';
    }
    
    const date = new Date().toISOString().split('T')[0];
    const newEntry = `## [${newVersion}] - ${date}\n\n### Добавлено\n- \n\n### Изменено\n- \n\n### Исправлено\n- \n\n`;
    
    changelog = changelog.replace('# Changelog', `# Changelog\n\n${newEntry}`);
    fs.writeFileSync(changelogPath, changelog);
    
    logSuccess('CHANGELOG обновлен');
    
    if (!isDryRun) {
        logInfo('Отредактируйте CHANGELOG.md перед коммитом');
        const shouldEdit = await askQuestion('Открыть CHANGELOG.md для редактирования? (y/n): ');
        if (shouldEdit) {
            // Попытка открыть файл в редакторе по умолчанию
            const editor = process.env.EDITOR || process.env.VISUAL || 'code';
            try {
                exec(`${editor} ${changelogPath}`, { silent: true });
            } catch (error) {
                logWarning('Не удалось открыть редактор. Отредактируйте CHANGELOG.md вручную.');
            }
        }
    }
}

// Создание git commit и tag
async function createGitCommitAndTag(newVersion, vsixFile) {
    if (isDryRun) {
        logWarning('DRY RUN: git commit и tag не будут созданы');
        return;
    }
    
    logStep(9, 'Создание git commit и tag...');
    
    // Добавление изменений
    exec('git add package.json CHANGELOG.md', { silent: false });
    if (vsixFile) {
        logWarning('ВНИМАНИЕ: .vsix файл не должен быть в git. Добавьте его в .gitignore');
    }
    
    // Создание commit
    const commitMessage = `chore: bump version to ${newVersion}`;
    const commitResult = exec(`git commit -m "${commitMessage}"`, { silent: false });
    if (!commitResult.success) {
        logError('Не удалось создать commit');
        process.exit(1);
    }
    
    logSuccess('Commit создан');
    
    // Создание tag
    const tagName = `v${newVersion}`;
    const tagMessage = `Release version ${newVersion}`;
    const tagResult = exec(`git tag -a ${tagName} -m "${tagMessage}"`, { silent: false });
    if (!tagResult.success) {
        logError('Не удалось создать tag');
        process.exit(1);
    }
    
    logSuccess(`Tag создан: ${tagName}`);
}

// Публикация на GitHub
async function publishToGitHub(newVersion, vsixFile, remoteUrl) {
    if (isDryRun) {
        logWarning('DRY RUN: публикация на GitHub не будет выполнена');
        return;
    }
    
    logStep(10, 'Публикация на GitHub...');
    
    // Извлечение owner и repo из remote URL
    const match = remoteUrl.match(/github\.com[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (!match) {
        logError('Не удалось определить owner и repo из remote URL');
        logInfo('Публикуйте release вручную на GitHub');
        return;
    }
    
    const [, owner, repo] = match;
    
    logInfo(`Репозиторий: ${owner}/${repo}`);
    
    // Проверка наличия GitHub CLI
    const ghResult = exec('gh --version', { silent: true });
    if (!ghResult.success) {
        logWarning('GitHub CLI не найден. Установите gh для автоматической публикации.');
        logInfo('Или создайте release вручную на GitHub:');
        logInfo(`  https://github.com/${owner}/${repo}/releases/new`);
        logInfo(`  Tag: v${newVersion}`);
        
        // Push изменений и тега
        logInfo('Отправка изменений и тега...');
        exec('git push origin main', { silent: false });
        exec(`git push origin v${newVersion}`, { silent: false });
        logSuccess('Изменения отправлены');
        return;
    }
    
    // Проверка авторизации в GitHub CLI
    const authResult = exec('gh auth status', { silent: true });
    if (!authResult.success) {
        logWarning('Не авторизованы в GitHub CLI');
        logInfo('Выполните: gh auth login');
        logInfo('Или создайте release вручную на GitHub');
        return;
    }
    
    // Чтение CHANGELOG для release notes
    const changelogPath = path.join(__dirname, 'CHANGELOG.md');
    let releaseNotes = '';
    if (fs.existsSync(changelogPath)) {
        const changelog = fs.readFileSync(changelogPath, 'utf8');
        const versionMatch = changelog.match(new RegExp(`## \\[${newVersion}\\][\\s\\S]*?(?=##|$)`));
        if (versionMatch) {
            releaseNotes = versionMatch[0];
        }
    }
    
    if (!releaseNotes) {
        releaseNotes = `Release version ${newVersion}`;
    }
    
    // Создание release
    logInfo('Создание GitHub release...');
    const releaseArgs = [
        'gh release create',
        `v${newVersion}`,
        `--title "v${newVersion}"`,
        `--notes "${releaseNotes.replace(/"/g, '\\"')}"`
    ];
    
    if (vsixFile) {
        releaseArgs.push(vsixFile);
    }
    
    const releaseResult = exec(releaseArgs.join(' '), { silent: false });
    if (!releaseResult.success) {
        logError('Не удалось создать GitHub release');
        logInfo('Создайте release вручную на GitHub');
        return;
    }
    
    logSuccess('GitHub release создан');
    
    // Push изменений
    logInfo('Отправка изменений...');
    exec('git push origin main', { silent: false });
    logSuccess('Изменения отправлены');
}

// Публикация в Marketplace
async function publishToMarketplace(newVersion) {
    if (!publishMarketplace) {
        return;
    }
    
    if (isDryRun) {
        logWarning('DRY RUN: публикация в Marketplace не будет выполнена');
        return;
    }
    
    logStep(11, 'Публикация в Marketplace...');
    
    // Проверка авторизации в vsce
    const loginResult = exec('npx vsce ls-publishers', { silent: true });
    if (!loginResult.success) {
        logWarning('Не авторизованы в vsce');
        logInfo('Выполните: npx vsce login <publisher-name>');
        logInfo('Или пропустите публикацию в Marketplace');
        return;
    }
    
    // Публикация
    logInfo('Публикация расширения...');
    const publishResult = exec('npx vsce publish', { silent: false });
    if (!publishResult.success) {
        logError('Не удалось опубликовать в Marketplace');
        return;
    }
    
    logSuccess('Расширение опубликовано в Marketplace');
}

// Основная функция
async function main() {
    log('\n' + '='.repeat(60), 'bold');
    log('  Автоматическая публикация на GitHub', 'bold');
    log('='.repeat(60) + '\n', 'bold');
    
    if (isDryRun) {
        logWarning('РЕЖИМ DRY RUN - изменения не будут применены\n');
    }
    
    try {
        // Проверки
        checkGit();
        const remoteUrl = await checkGitStatus();
        checkDependencies();
        
        // Обновление версии
        const newVersion = updateVersion();
        
        // Тесты и сборка
        runTests();
        compileProject();
        const vsixFile = buildExtension(newVersion);
        
        // CHANGELOG
        await createChangelog(newVersion);
        
        // Git
        await createGitCommitAndTag(newVersion, vsixFile);
        
        // Публикация
        await publishToGitHub(newVersion, vsixFile, remoteUrl);
        await publishToMarketplace(newVersion);
        
        // Итоги
        log('\n' + '='.repeat(60), 'bold');
        log('  Публикация завершена!', 'bold');
        log('='.repeat(60) + '\n', 'bold');
        
        logSuccess(`Версия ${newVersion} успешно опубликована`);
        
        if (vsixFile) {
            logInfo(`Файл: ${vsixFile}`);
        }
        
        logInfo(`Tag: v${newVersion}`);
        
        if (isDryRun) {
            logWarning('\nЭто был DRY RUN. Для реальной публикации запустите без --dry-run');
        }
        
    } catch (error) {
        logError(`Ошибка: ${error.message}`);
        if (!isDryRun) {
            process.exit(1);
        }
    }
}

// Запуск
main().catch(error => {
    logError(`Критическая ошибка: ${error.message}`);
    process.exit(1);
});
