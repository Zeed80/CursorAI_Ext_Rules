# 🚀 План оптимизации инфраструктуры развертывания

**Проект:** CursorAI Autonomous Extension  
**Задача:** Оптимизация инфраструктурных процессов развертывания backend приложения  
**Дата создания:** 2025-12-31  
**DevOps Engineer:** AI Assistant

---

## 📋 Содержание

1. [Анализ текущего состояния](#анализ-текущего-состояния)
2. [Цели оптимизации](#цели-оптимизации)
3. [Детальный план реализации](#детальный-план-реализации)
4. [Метрики успеха](#метрики-успеха)
5. [Риски и митигация](#риски-и-митигация)

---

## 🔍 Анализ текущего состояния

### Существующая инфраструктура:

✅ **Есть:**
- TypeScript проект с компиляцией
- npm скрипты для сборки (`compile`, `package`, `build`)
- Jest тесты (unit, integration)
- ESLint для качества кода
- Ручные скрипты установки (`install.bat`, `install.sh`, `install.js`)

❌ **Отсутствует:**
- CI/CD пайплайны (GitHub Actions, GitLab CI)
- Автоматизация публикации в VS Code Marketplace
- Docker-контейнеры для изолированного тестирования
- Автоматические security scans
- Мониторинг качества кода и покрытия
- Автоматизация релизов и changelog
- Документация процессов деплоя

### Проблемы:

1. **Ручной деплой** - требует времени, подвержен ошибкам
2. **Отсутствие автоматического тестирования** при push/PR
3. **Нет security-сканирования** зависимостей и кода
4. **Нет автоматизации версионирования** и релизов
5. **Отсутствие мониторинга** качества и производительности
6. **Нет стандартизации** процессов разработки

---

## 🎯 Цели оптимизации

### 1. Автоматизация CI/CD

- ✅ Автоматическая сборка при каждом commit
- ✅ Автоматические тесты при PR
- ✅ Автоматическая публикация релизов

### 2. Безопасность

- ✅ Автоматическое сканирование уязвимостей
- ✅ Проверка секретов в коде
- ✅ Аудит зависимостей

### 3. Качество кода

- ✅ Автоматический линтинг
- ✅ Проверка покрытия тестами
- ✅ Code quality метрики

### 4. Стабильность

- ✅ Изолированное тестирование в Docker
- ✅ Тестирование на разных платформах
- ✅ Smoke tests перед релизом

### 5. Прозрачность

- ✅ Автоматическая генерация changelog
- ✅ Документация процессов
- ✅ Мониторинг метрик

---

## 📝 Детальный план реализации

---

## ФАЗА 1: Настройка CI/CD (Приоритет: IMMEDIATE)

**Время выполнения:** 8-12 часов  
**Ответственный:** DevOps Engineer

### Шаг 1.1: Создание базового CI/CD пайплайна

**Задача:** Настроить GitHub Actions для автоматической сборки и тестирования

**Действия:**

1. Создать `.github/workflows/ci.yml`:
   ```yaml
   name: CI Pipeline
   
   on:
     push:
       branches: [ main, develop, cursor/* ]
     pull_request:
       branches: [ main, develop ]
   
   jobs:
     build-and-test:
       runs-on: ${{ matrix.os }}
       strategy:
         matrix:
           os: [ubuntu-latest, windows-latest, macos-latest]
           node-version: [18.x, 20.x]
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js ${{ matrix.node-version }}
           uses: actions/setup-node@v4
           with:
             node-version: ${{ matrix.node-version }}
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Lint code
           run: npm run lint
         
         - name: Run tests
           run: npm test
         
         - name: Run Jest tests
           run: npm run test:jest
         
         - name: Build extension
           run: npm run compile
         
         - name: Package extension
           run: npm run package
         
         - name: Upload VSIX artifact
           uses: actions/upload-artifact@v4
           with:
             name: extension-${{ matrix.os }}-node-${{ matrix.node-version }}
             path: '*.vsix'
   ```

2. Создать `.github/workflows/code-quality.yml`:
   ```yaml
   name: Code Quality
   
   on:
     pull_request:
       branches: [ main, develop ]
   
   jobs:
     quality-check:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run ESLint with reporter
           run: npm run lint -- --format json --output-file eslint-report.json
         
         - name: Run tests with coverage
           run: npm run test:jest:coverage
         
         - name: Upload coverage to Codecov
           uses: codecov/codecov-action@v4
           with:
             files: ./coverage/lcov.info
             flags: unittests
         
         - name: Comment PR with coverage
           uses: romeovs/lcov-reporter-action@v0.3.1
           with:
             lcov-file: ./coverage/lcov.info
             github-token: ${{ secrets.GITHUB_TOKEN }}
   ```

**Проверка:**
- ✅ Пайплайн запускается при push и PR
- ✅ Тесты проходят на всех платформах
- ✅ Артефакты .vsix создаются
- ✅ Coverage report генерируется

**Время:** 3-4 часа

---

### Шаг 1.2: Настройка автоматического релиза

**Задача:** Автоматизировать процесс создания релизов и публикации в VS Code Marketplace

**Действия:**

1. Создать `.github/workflows/release.yml`:
   ```yaml
   name: Release Extension
   
   on:
     push:
       tags:
         - 'v*'
   
   jobs:
     release:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run tests
           run: npm test
         
         - name: Build and package
           run: npm run build
         
         - name: Publish to VS Code Marketplace
           run: npx vsce publish -p ${{ secrets.VSCE_TOKEN }}
         
         - name: Create GitHub Release
           uses: softprops/action-gh-release@v1
           with:
             files: '*.vsix'
             generate_release_notes: true
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
         
         - name: Publish to Open VSX Registry
           run: npx ovsx publish *.vsix -p ${{ secrets.OVSX_TOKEN }}
   ```

2. Настроить GitHub Secrets:
   - `VSCE_TOKEN` - токен VS Code Marketplace
   - `OVSX_TOKEN` - токен Open VSX Registry

3. Создать скрипт `scripts/prepare-release.sh`:
   ```bash
   #!/bin/bash
   set -e
   
   # Проверка что на main ветке
   BRANCH=$(git branch --show-current)
   if [ "$BRANCH" != "main" ]; then
     echo "❌ Релизы можно делать только с main ветки!"
     exit 1
   fi
   
   # Запросить версию
   echo "Текущая версия: $(node -p "require('./package.json').version")"
   read -p "Введите новую версию (например, 0.4.0): " VERSION
   
   # Обновить версию в package.json
   npm version $VERSION --no-git-tag-version
   
   # Обновить CHANGELOG.md
   echo "Обновите CHANGELOG.md с изменениями версии $VERSION"
   read -p "Нажмите Enter когда готово..."
   
   # Commit и tag
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to $VERSION"
   git tag "v$VERSION"
   
   # Push
   echo "Готово! Запустите: git push && git push --tags"
   ```

**Проверка:**
- ✅ При создании тега `v*` запускается релиз
- ✅ Расширение публикуется в Marketplace
- ✅ GitHub Release создается автоматически
- ✅ .vsix файл прикрепляется к релизу

**Время:** 2-3 часа

---

### Шаг 1.3: Настройка Preview-релизов

**Задача:** Автоматические preview-релизы для тестирования

**Действия:**

1. Создать `.github/workflows/preview-release.yml`:
   ```yaml
   name: Preview Release
   
   on:
     workflow_dispatch:
       inputs:
         branch:
           description: 'Branch to release from'
           required: true
           default: 'develop'
   
   jobs:
     preview:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
           with:
             ref: ${{ github.event.inputs.branch }}
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Build preview version
           run: |
             # Добавить preview в версию
             npm version prerelease --preid=preview --no-git-tag-version
             npm run build
         
         - name: Create preview release
           uses: softprops/action-gh-release@v1
           with:
             files: '*.vsix'
             tag_name: preview-${{ github.sha }}
             prerelease: true
             name: 'Preview Release (${{ github.event.inputs.branch }})'
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

**Проверка:**
- ✅ Preview-релиз создается вручную из любой ветки
- ✅ Версия помечается как preview
- ✅ Release помечен как pre-release

**Время:** 1-2 часа

---

## ФАЗА 2: Безопасность и аудит (Приоритет: HIGH)

**Время выполнения:** 6-8 часов  
**Ответственный:** DevOps Engineer

### Шаг 2.1: Сканирование зависимостей

**Задача:** Автоматическая проверка уязвимостей в зависимостях

**Действия:**

1. Создать `.github/workflows/security-audit.yml`:
   ```yaml
   name: Security Audit
   
   on:
     push:
       branches: [ main, develop ]
     pull_request:
       branches: [ main, develop ]
     schedule:
       - cron: '0 0 * * 1'  # Каждый понедельник
   
   jobs:
     security-audit:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
         
         - name: Run npm audit
           run: |
             npm audit --audit-level=moderate --json > npm-audit-report.json || true
             npm audit --audit-level=moderate
         
         - name: Upload audit report
           uses: actions/upload-artifact@v4
           with:
             name: npm-audit-report
             path: npm-audit-report.json
         
         - name: Dependency Review
           uses: actions/dependency-review-action@v4
           with:
             fail-on-severity: moderate
         
         - name: Trivy vulnerability scanner
           uses: aquasecurity/trivy-action@master
           with:
             scan-type: 'fs'
             scan-ref: '.'
             format: 'sarif'
             output: 'trivy-results.sarif'
         
         - name: Upload Trivy results to GitHub Security
           uses: github/codeql-action/upload-sarif@v3
           with:
             sarif_file: 'trivy-results.sarif'
   ```

2. Создать `.github/dependabot.yml`:
   ```yaml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
         day: "monday"
       open-pull-requests-limit: 10
       reviewers:
         - "Zeed80"
       labels:
         - "dependencies"
         - "automated"
       commit-message:
         prefix: "chore(deps)"
       versioning-strategy: increase
   ```

3. Добавить скрипт проверки в `package.json`:
   ```json
   {
     "scripts": {
       "audit:fix": "npm audit fix",
       "audit:report": "npm audit --json > audit-report.json",
       "security:check": "npm audit && npm run lint"
     }
   }
   ```

**Проверка:**
- ✅ npm audit выполняется автоматически
- ✅ Dependabot создает PR для обновлений
- ✅ Trivy сканирует проект
- ✅ Security alerts появляются в GitHub

**Время:** 2-3 часа

---

### Шаг 2.2: Сканирование секретов

**Задача:** Предотвращение утечки API ключей и секретов

**Действия:**

1. Создать `.github/workflows/secret-scan.yml`:
   ```yaml
   name: Secret Scanning
   
   on:
     push:
     pull_request:
   
   jobs:
     gitleaks:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0
         
         - name: Gitleaks scan
           uses: gitleaks/gitleaks-action@v2
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

2. Создать `.gitleaks.toml`:
   ```toml
   title = "CursorAI Extension Gitleaks Config"
   
   [[rules]]
   description = "Generic API Key"
   regex = '''(?i)(api[_-]?key|apikey|api[_-]?token|token)['\"]?\s*[:=]\s*['\"]([\w-]{32,})['"]'''
   
   [[rules]]
   description = "OpenAI API Key"
   regex = '''sk-[a-zA-Z0-9]{48}'''
   
   [[rules]]
   description = "Anthropic API Key"
   regex = '''sk-ant-[a-zA-Z0-9-]{95}'''
   
   [[rules]]
   description = "Google API Key"
   regex = '''AIza[0-9A-Za-z\\-_]{35}'''
   
   [allowlist]
   paths = [
     '''\.md$''',
     '''\.txt$''',
     '''test.*\.ts$'''
   ]
   ```

3. Добавить pre-commit hook (опционально):
   ```bash
   # scripts/install-git-hooks.sh
   #!/bin/bash
   
   cat > .git/hooks/pre-commit << 'EOF'
   #!/bin/bash
   
   # Проверка на секреты перед commit
   if command -v gitleaks &> /dev/null; then
     gitleaks protect --staged --verbose
     if [ $? -ne 0 ]; then
       echo "❌ Обнаружены секреты! Commit отменен."
       exit 1
     fi
   fi
   EOF
   
   chmod +x .git/hooks/pre-commit
   echo "✅ Git hooks установлены"
   ```

**Проверка:**
- ✅ Gitleaks проверяет каждый commit
- ✅ Pre-commit hook блокирует commit с секретами
- ✅ False positives можно игнорировать через allowlist

**Время:** 2 часа

---

### Шаг 2.3: CodeQL анализ

**Задача:** Статический анализ безопасности кода

**Действия:**

1. Создать `.github/workflows/codeql-analysis.yml`:
   ```yaml
   name: CodeQL Security Analysis
   
   on:
     push:
       branches: [ main, develop ]
     pull_request:
       branches: [ main, develop ]
     schedule:
       - cron: '0 6 * * 1'  # Каждый понедельник в 6:00
   
   jobs:
     analyze:
       name: Analyze
       runs-on: ubuntu-latest
       permissions:
         actions: read
         contents: read
         security-events: write
       
       strategy:
         fail-fast: false
         matrix:
           language: [ 'javascript', 'typescript' ]
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Initialize CodeQL
           uses: github/codeql-action/init@v3
           with:
             languages: ${{ matrix.language }}
             queries: +security-and-quality
         
         - name: Autobuild
           uses: github/codeql-action/autobuild@v3
         
         - name: Perform CodeQL Analysis
           uses: github/codeql-action/analyze@v3
   ```

**Проверка:**
- ✅ CodeQL анализирует TypeScript/JavaScript код
- ✅ Security alerts появляются в GitHub Security tab
- ✅ Анализ выполняется еженедельно

**Время:** 2 часа

---

## ФАЗА 3: Качество и тестирование (Приоритет: HIGH)

**Время выполнения:** 10-14 часов  
**Ответственный:** DevOps Engineer + QA Engineer

### Шаг 3.1: Улучшение тестовой инфраструктуры

**Задача:** Настроить комплексное тестирование

**Действия:**

1. Создать `.github/workflows/test-suite.yml`:
   ```yaml
   name: Test Suite
   
   on:
     push:
       branches: [ main, develop, feature/* ]
     pull_request:
       branches: [ main, develop ]
   
   jobs:
     unit-tests:
       name: Unit Tests
       runs-on: ${{ matrix.os }}
       strategy:
         matrix:
           os: [ubuntu-latest, windows-latest, macos-latest]
           node-version: [18.x, 20.x]
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js ${{ matrix.node-version }}
           uses: actions/setup-node@v4
           with:
             node-version: ${{ matrix.node-version }}
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run unit tests
           run: npm run test:jest -- --coverage --ci
         
         - name: Upload coverage
           uses: codecov/codecov-action@v4
           with:
             files: ./coverage/lcov.info
             flags: unit-${{ matrix.os }}-node${{ matrix.node-version }}
     
     integration-tests:
       name: Integration Tests
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run integration tests
           run: npm run test:api
         
         - name: Upload test results
           uses: actions/upload-artifact@v4
           if: always()
           with:
             name: integration-test-results
             path: test-results/
     
     e2e-tests:
       name: E2E Tests (VS Code Extension)
       runs-on: ${{ matrix.os }}
       strategy:
         matrix:
           os: [ubuntu-latest, windows-latest, macos-latest]
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run VS Code Extension tests
           run: npm test
           env:
             DISPLAY: ':99.0'
         
         - name: Upload screenshots on failure
           uses: actions/upload-artifact@v4
           if: failure()
           with:
             name: e2e-screenshots-${{ matrix.os }}
             path: test-results/screenshots/
   ```

2. Настроить coverage thresholds в `jest.config.js`:
   ```javascript
   module.exports = {
     // ... existing config
     coverageThreshold: {
       global: {
         branches: 70,
         functions: 75,
         lines: 80,
         statements: 80
       }
     },
     collectCoverageFrom: [
       'src/**/*.ts',
       '!src/**/*.d.ts',
       '!src/**/__tests__/**',
       '!src/**/__mocks__/**'
     ]
   };
   ```

3. Добавить скрипты тестирования в `package.json`:
   ```json
   {
     "scripts": {
       "test:unit": "jest --testMatch='**/__tests__/**/*.test.ts' --testPathIgnorePatterns=integration",
       "test:integration": "jest --testMatch='**/integration/**/*.test.ts'",
       "test:e2e": "node ./out/test/runTest.js",
       "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
       "test:watch": "jest --watch",
       "test:coverage:html": "jest --coverage --coverageReporters=html && open coverage/index.html"
     }
   }
   ```

**Проверка:**
- ✅ Unit tests проходят на всех платформах
- ✅ Integration tests выполняются
- ✅ E2E tests работают в VS Code
- ✅ Coverage threshold соблюдается
- ✅ Test reports генерируются

**Время:** 4-5 часов

---

### Шаг 3.2: Docker-контейнеры для изолированного тестирования

**Задача:** Создать Docker-окружение для воспроизводимого тестирования

**Действия:**

1. Создать `Dockerfile.test`:
   ```dockerfile
   # Multi-stage build для тестирования
   FROM node:20-alpine AS base
   
   # Установка зависимостей для VS Code testing
   RUN apk add --no-cache \
       git \
       bash \
       curl \
       xvfb \
       libxkbfile-dev \
       libsecret-1-0
   
   WORKDIR /app
   
   # Копирование package files
   COPY package*.json ./
   
   # Установка зависимостей
   RUN npm ci
   
   # Копирование исходного кода
   COPY . .
   
   # Стадия для unit tests
   FROM base AS test-unit
   CMD ["npm", "run", "test:unit"]
   
   # Стадия для integration tests
   FROM base AS test-integration
   CMD ["npm", "run", "test:integration"]
   
   # Стадия для e2e tests
   FROM base AS test-e2e
   ENV DISPLAY=:99
   RUN Xvfb :99 -screen 0 1024x768x16 &
   CMD ["npm", "test"]
   ```

2. Создать `docker-compose.test.yml`:
   ```yaml
   version: '3.8'
   
   services:
     test-unit:
       build:
         context: .
         dockerfile: Dockerfile.test
         target: test-unit
       volumes:
         - ./coverage:/app/coverage
       environment:
         - CI=true
     
     test-integration:
       build:
         context: .
         dockerfile: Dockerfile.test
         target: test-integration
       volumes:
         - ./test-results:/app/test-results
       environment:
         - CI=true
     
     test-e2e:
       build:
         context: .
         dockerfile: Dockerfile.test
         target: test-e2e
       volumes:
         - ./test-results:/app/test-results
       environment:
         - CI=true
         - DISPLAY=:99
       shm_size: 2gb
   ```

3. Создать скрипт `scripts/test-in-docker.sh`:
   ```bash
   #!/bin/bash
   set -e
   
   echo "🐳 Запуск тестов в Docker..."
   
   # Unit tests
   echo "📦 Unit tests..."
   docker-compose -f docker-compose.test.yml run --rm test-unit
   
   # Integration tests
   echo "🔗 Integration tests..."
   docker-compose -f docker-compose.test.yml run --rm test-integration
   
   # E2E tests
   echo "🎭 E2E tests..."
   docker-compose -f docker-compose.test.yml run --rm test-e2e
   
   echo "✅ Все тесты прошли успешно!"
   ```

4. Добавить в `.github/workflows/docker-tests.yml`:
   ```yaml
   name: Docker Tests
   
   on:
     pull_request:
       branches: [ main, develop ]
   
   jobs:
     docker-tests:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Build test images
           run: docker-compose -f docker-compose.test.yml build
         
         - name: Run tests in Docker
           run: bash scripts/test-in-docker.sh
         
         - name: Upload coverage
           uses: codecov/codecov-action@v4
           with:
             files: ./coverage/lcov.info
             flags: docker-tests
   ```

**Проверка:**
- ✅ Docker images собираются успешно
- ✅ Тесты выполняются в изолированных контейнерах
- ✅ Coverage генерируется корректно
- ✅ E2E tests работают с Xvfb

**Время:** 4-5 часов

---

### Шаг 3.3: Smoke tests для релизов

**Задача:** Автоматические smoke tests перед публикацией

**Действия:**

1. Создать `tests/smoke/smoke.test.ts`:
   ```typescript
   import * as vscode from 'vscode';
   import * as assert from 'assert';
   
   suite('Smoke Tests', () => {
     test('Extension should be present', () => {
       const extension = vscode.extensions.getExtension('cursor-autonomous.cursor-ai-autonomous-extension');
       assert.ok(extension, 'Extension not found');
     });
     
     test('Extension should activate', async () => {
       const extension = vscode.extensions.getExtension('cursor-autonomous.cursor-ai-autonomous-extension');
       await extension!.activate();
       assert.ok(extension!.isActive, 'Extension did not activate');
     });
     
     test('Commands should be registered', async () => {
       const commands = await vscode.commands.getCommands(true);
       
       const requiredCommands = [
         'cursor-autonomous.startOrchestrator',
         'cursor-autonomous.stopOrchestrator',
         'cursor-autonomous.enableVirtualUser',
         'cursor-autonomous.showStatus',
         'cursor-autonomous.analyzeProject'
       ];
       
       requiredCommands.forEach(cmd => {
         assert.ok(commands.includes(cmd), `Command ${cmd} not registered`);
       });
     });
     
     test('Configuration should be valid', () => {
       const config = vscode.workspace.getConfiguration('cursor-autonomous');
       
       // Проверка обязательных настроек
       assert.ok(config.has('enableVirtualUser'), 'enableVirtualUser config missing');
       assert.ok(config.has('autonomousMode'), 'autonomousMode config missing');
     });
     
     test('Status bar should be created', async () => {
       const extension = vscode.extensions.getExtension('cursor-autonomous.cursor-ai-autonomous-extension');
       await extension!.activate();
       
       // Проверка что extension создал status bar items
       // (это можно проверить через extension API)
     });
   });
   ```

2. Создать `.github/workflows/smoke-tests.yml`:
   ```yaml
   name: Smoke Tests
   
   on:
     workflow_call:
       inputs:
         vsix-path:
           required: true
           type: string
   
   jobs:
     smoke-test:
       runs-on: ${{ matrix.os }}
       strategy:
         matrix:
           os: [ubuntu-latest, windows-latest, macos-latest]
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
         
         - name: Download VSIX
           uses: actions/download-artifact@v4
           with:
             name: extension-vsix
         
         - name: Install extension
           run: code --install-extension ${{ inputs.vsix-path }}
         
         - name: Run smoke tests
           run: npm run test:smoke
         
         - name: Verify extension loaded
           run: code --list-extensions | grep cursor-autonomous
   ```

3. Обновить `scripts/prepare-release.sh`:
   ```bash
   # Добавить smoke tests перед релизом
   echo "🧪 Запуск smoke tests..."
   npm run test:smoke || {
     echo "❌ Smoke tests провалились!"
     exit 1
   }
   ```

**Проверка:**
- ✅ Smoke tests выполняются перед релизом
- ✅ Расширение активируется корректно
- ✅ Все команды зарегистрированы
- ✅ Configuration валидна

**Время:** 2-3 часа

---

## ФАЗА 4: Мониторинг и метрики (Приоритет: MEDIUM)

**Время выполнения:** 6-8 часов  
**Ответственный:** DevOps Engineer + Analyst

### Шаг 4.1: Настройка метрик качества кода

**Задача:** Интеграция SonarQube/SonarCloud для метрик

**Действия:**

1. Создать `sonar-project.properties`:
   ```properties
   sonar.projectKey=cursorai-autonomous-extension
   sonar.organization=zeed80
   sonar.projectName=CursorAI Autonomous Extension
   sonar.projectVersion=0.3.0
   
   sonar.sources=src
   sonar.tests=src
   sonar.test.inclusions=**/__tests__/**,**/*.test.ts
   sonar.exclusions=**/node_modules/**,**/out/**,**/*.d.ts
   
   sonar.javascript.lcov.reportPaths=coverage/lcov.info
   sonar.testExecutionReportPaths=test-results/sonar-report.xml
   
   sonar.typescript.node=node_modules/typescript/lib
   ```

2. Создать `.github/workflows/sonarcloud.yml`:
   ```yaml
   name: SonarCloud Analysis
   
   on:
     push:
       branches: [ main, develop ]
     pull_request:
       branches: [ main, develop ]
   
   jobs:
     sonarcloud:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0  # Shallow clones should be disabled
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20.x'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run tests with coverage
           run: npm run test:jest:coverage
         
         - name: SonarCloud Scan
           uses: SonarSource/sonarcloud-github-action@master
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
   ```

3. Настроить Quality Gates в SonarCloud:
   - Coverage > 80%
   - Maintainability Rating >= A
   - Reliability Rating >= A
   - Security Rating >= A
   - Duplications < 3%
   - Code Smells < 50

4. Добавить badge в `README.md`:
   ```markdown
   [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=cursorai-autonomous-extension&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=cursorai-autonomous-extension)
   [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=cursorai-autonomous-extension&metric=coverage)](https://sonarcloud.io/summary/new_code?id=cursorai-autonomous-extension)
   ```

**Проверка:**
- ✅ SonarCloud анализирует код при каждом PR
- ✅ Quality Gates блокируют merge при проблемах
- ✅ Метрики отображаются в README

**Время:** 3-4 часа

---

### Шаг 4.2: Мониторинг производительности CI/CD

**Задача:** Отслеживание времени выполнения пайплайнов

**Действия:**

1. Создать скрипт `scripts/ci-metrics.sh`:
   ```bash
   #!/bin/bash
   
   # Получение метрик GitHub Actions через API
   gh api \
     -H "Accept: application/vnd.github+json" \
     /repos/Zeed80/CursorAI_Ext_Rules/actions/runs \
     --jq '.workflow_runs[] | {
       id: .id,
       name: .name,
       status: .status,
       conclusion: .conclusion,
       duration: (.updated_at | fromdateiso8601) - (.created_at | fromdateiso8601),
       created_at: .created_at
     }' > ci-metrics.json
   
   echo "📊 CI/CD метрики сохранены в ci-metrics.json"
   ```

2. Создать `.github/workflows/metrics-report.yml`:
   ```yaml
   name: Weekly Metrics Report
   
   on:
     schedule:
       - cron: '0 9 * * 1'  # Каждый понедельник в 9:00
     workflow_dispatch:
   
   jobs:
     metrics:
       runs-on: ubuntu-latest
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Generate CI metrics
           env:
             GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           run: bash scripts/ci-metrics.sh
         
         - name: Calculate average build time
           run: |
             cat ci-metrics.json | jq '[.[] | select(.conclusion == "success") | .duration] | add / length'
         
         - name: Create issue with metrics
           uses: peter-evans/create-issue-from-file@v5
           with:
             title: "📊 Weekly CI/CD Metrics Report"
             content-filepath: ./metrics-report.md
             labels: |
               metrics
               automated
   ```

3. Добавить мониторинг в Dashboard:
   - Средняя длительность CI/CD pipeline
   - Success rate
   - Failed builds за неделю
   - Bottlenecks (самые медленные jobs)

**Проверка:**
- ✅ Метрики собираются еженедельно
- ✅ Issue с отчетом создается автоматически
- ✅ Можно отследить деградацию производительности

**Время:** 2-3 часа

---

### Шаг 4.3: Changelog автоматизация

**Задача:** Автоматическая генерация changelog

**Действия:**

1. Настроить Conventional Commits:
   
   Создать `.commitlintrc.json`:
   ```json
   {
     "extends": ["@commitlint/config-conventional"],
     "rules": {
       "type-enum": [
         2,
         "always",
         [
           "feat",
           "fix",
           "docs",
           "style",
           "refactor",
           "perf",
           "test",
           "chore",
           "ci",
           "build"
         ]
       ],
       "subject-case": [2, "never", ["upper-case"]]
     }
   }
   ```

2. Установить зависимости:
   ```bash
   npm install --save-dev @commitlint/cli @commitlint/config-conventional standard-version
   ```

3. Добавить скрипты в `package.json`:
   ```json
   {
     "scripts": {
       "release": "standard-version",
       "release:minor": "standard-version --release-as minor",
       "release:major": "standard-version --release-as major",
       "release:patch": "standard-version --release-as patch"
     }
   }
   ```

4. Создать `.versionrc.json`:
   ```json
   {
     "types": [
       {"type": "feat", "section": "✨ Features"},
       {"type": "fix", "section": "🐛 Bug Fixes"},
       {"type": "perf", "section": "⚡ Performance Improvements"},
       {"type": "refactor", "section": "♻️ Code Refactoring"},
       {"type": "docs", "section": "📚 Documentation"},
       {"type": "test", "section": "🧪 Tests"},
       {"type": "ci", "section": "👷 CI/CD"},
       {"type": "chore", "section": "🔧 Chore", "hidden": true}
     ],
     "commitUrlFormat": "https://github.com/Zeed80/CursorAI_Ext_Rules/commit/{{hash}}",
     "compareUrlFormat": "https://github.com/Zeed80/CursorAI_Ext_Rules/compare/{{previousTag}}...{{currentTag}}",
     "issueUrlFormat": "https://github.com/Zeed80/CursorAI_Ext_Rules/issues/{{id}}"
   }
   ```

5. Обновить release workflow:
   ```yaml
   # В .github/workflows/release.yml добавить
   - name: Generate changelog
     run: npm run release -- --skip.commit --skip.tag
   
   - name: Update CHANGELOG.md
     run: git add CHANGELOG.md && git commit -m "docs: update changelog"
   ```

**Проверка:**
- ✅ CHANGELOG.md генерируется автоматически
- ✅ Commits группируются по типам
- ✅ Ссылки на issues и commits работают

**Время:** 2 часа

---

## ФАЗА 5: Документация и процессы (Приоритет: MEDIUM)

**Время выполнения:** 4-6 часов  
**Ответственный:** DevOps Engineer + Tech Writer

### Шаг 5.1: Документация процессов деплоя

**Задача:** Создать подробную документацию для деплоя

**Действия:**

1. Создать `docs/DEPLOYMENT.md`:
   ```markdown
   # 🚀 Deployment Guide
   
   ## Prerequisites
   
   - GitHub account with repository access
   - VS Code Marketplace account
   - Open VSX Registry account
   - GitHub secrets configured:
     - `VSCE_TOKEN`
     - `OVSX_TOKEN`
     - `SONAR_TOKEN`
   
   ## Deployment Process
   
   ### 1. Development
   
   1. Create feature branch: `git checkout -b feature/my-feature`
   2. Make changes
   3. Commit with conventional commits: `git commit -m "feat: add new feature"`
   4. Push: `git push origin feature/my-feature`
   5. Create Pull Request
   
   ### 2. Pull Request Checks
   
   Automatic checks that run:
   - ✅ CI Pipeline (build, lint, test)
   - ✅ Code Quality (SonarCloud)
   - ✅ Security Audit (npm audit, Trivy, CodeQL)
   - ✅ Secret Scanning (Gitleaks)
   - ✅ Docker Tests
   - ✅ Coverage Report
   
   ### 3. Merge to main
   
   After PR approval and all checks pass:
   1. Merge to `main` branch
   2. All checks run again on `main`
   
   ### 4. Release Process
   
   #### Automatic Release (Recommended)
   
   1. Generate changelog:
      ```bash
      npm run release
      ```
   
   2. Review CHANGELOG.md
   
   3. Push changes:
      ```bash
      git push --follow-tags origin main
      ```
   
   4. GitHub Actions will:
      - Build extension
      - Run all tests
      - Publish to VS Code Marketplace
      - Publish to Open VSX Registry
      - Create GitHub Release with .vsix
   
   #### Manual Release
   
   1. Update version:
      ```bash
      npm version patch|minor|major
      ```
   
   2. Update CHANGELOG.md manually
   
   3. Commit and tag:
      ```bash
      git add .
      git commit -m "chore: bump version to X.Y.Z"
      git tag vX.Y.Z
      ```
   
   4. Push:
      ```bash
      git push && git push --tags
      ```
   
   ### 5. Preview Release
   
   For testing:
   
   1. Go to GitHub Actions
   2. Run "Preview Release" workflow
   3. Select branch
   4. Download generated .vsix from Release page
   5. Install locally: `code --install-extension *.vsix`
   
   ## Troubleshooting
   
   ### Release Failed
   
   1. Check GitHub Actions logs
   2. Common issues:
      - Missing secrets (VSCE_TOKEN, OVSX_TOKEN)
      - Tests failing
      - Coverage below threshold
      - Quality gate not passed
   
   ### Marketplace Publish Failed
   
   1. Check VSCE_TOKEN validity
   2. Verify publisher ID in package.json
   3. Check version already exists
   
   ## Rollback
   
   If release has issues:
   
   1. Unpublish from Marketplace (if critical):
      ```bash
      vsce unpublish cursor-autonomous.cursor-ai-autonomous-extension@X.Y.Z
      ```
   
   2. Create hotfix:
      ```bash
      git checkout -b hotfix/critical-fix
      # Make fix
      npm run release:patch
      git push --follow-tags
      ```
   
   ## Monitoring
   
   After release:
   - Monitor GitHub Issues for bug reports
   - Check Marketplace ratings
   - Review telemetry data (if enabled)
   - Monitor SonarCloud metrics
   ```

2. Создать `docs/CI-CD-ARCHITECTURE.md`:
   ```markdown
   # CI/CD Architecture
   
   ## Overview
   
   ```
   ┌──────────────┐
   │ Developer    │
   │ Push/PR      │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ GitHub Actions               │
   │                              │
   │ ┌──────────────────────────┐ │
   │ │ CI Pipeline              │ │
   │ │ - Build                  │ │
   │ │ - Lint                   │ │
   │ │ - Test (unit/int/e2e)    │ │
   │ └──────────────────────────┘ │
   │                              │
   │ ┌──────────────────────────┐ │
   │ │ Quality Checks           │ │
   │ │ - SonarCloud             │ │
   │ │ - Coverage               │ │
   │ │ - CodeQL                 │ │
   │ └──────────────────────────┘ │
   │                              │
   │ ┌──────────────────────────┐ │
   │ │ Security                 │ │
   │ │ - npm audit              │ │
   │ │ - Trivy scan             │ │
   │ │ - Gitleaks               │ │
   │ │ - Dependabot             │ │
   │ └──────────────────────────┘ │
   │                              │
   │ ┌──────────────────────────┐ │
   │ │ Docker Tests             │ │
   │ │ - Isolated environment   │ │
   │ └──────────────────────────┘ │
   └──────────┬───────────────────┘
              │
              ▼
        ┌─────────┐      ┌──────────────┐
        │ Merge   │─────▶│ Tag created  │
        │ to main │      │ (vX.Y.Z)     │
        └─────────┘      └──────┬───────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ Release Pipeline      │
                    │                       │
                    │ - Build .vsix         │
                    │ - Smoke tests         │
                    │ - Publish Marketplace │
                    │ - Publish Open VSX    │
                    │ - Create GH Release   │
                    └───────────────────────┘
   ```
   
   ## Pipelines
   
   ### 1. CI Pipeline (`ci.yml`)
   
   **Triggers:** Push to any branch, PR to main/develop
   
   **Jobs:**
   - Build and test on multiple platforms (Ubuntu, Windows, macOS)
   - Multiple Node.js versions (18.x, 20.x)
   - Artifact upload (.vsix files)
   
   **Duration:** ~5-7 minutes
   
   ### 2. Code Quality (`code-quality.yml`)
   
   **Triggers:** PR to main/develop
   
   **Jobs:**
   - ESLint with JSON reporter
   - Jest tests with coverage
   - Upload to Codecov
   - PR comment with coverage diff
   
   **Duration:** ~3-5 minutes
   
   ### 3. Security Audit (`security-audit.yml`)
   
   **Triggers:** Push, PR, Weekly schedule
   
   **Jobs:**
   - npm audit
   - Dependency review
   - Trivy filesystem scan
   - Upload SARIF to GitHub Security
   
   **Duration:** ~2-4 minutes
   
   ### 4. Secret Scanning (`secret-scan.yml`)
   
   **Triggers:** Every push and PR
   
   **Jobs:**
   - Gitleaks scan for API keys, tokens, secrets
   
   **Duration:** ~1-2 minutes
   
   ### 5. CodeQL Analysis (`codeql-analysis.yml`)
   
   **Triggers:** Push, PR, Weekly schedule
   
   **Jobs:**
   - Static analysis of TypeScript/JavaScript
   - Security and quality queries
   
   **Duration:** ~5-8 minutes
   
   ### 6. Test Suite (`test-suite.yml`)
   
   **Triggers:** Push, PR
   
   **Jobs:**
   - Unit tests (parallel on multiple OS)
   - Integration tests
   - E2E tests with Xvfb
   
   **Duration:** ~8-12 minutes
   
   ### 7. Docker Tests (`docker-tests.yml`)
   
   **Triggers:** PR to main/develop
   
   **Jobs:**
   - Build Docker test images
   - Run all tests in containers
   
   **Duration:** ~10-15 minutes
   
   ### 8. SonarCloud (`sonarcloud.yml`)
   
   **Triggers:** Push, PR
   
   **Jobs:**
   - Code analysis
   - Quality gate check
   
   **Duration:** ~3-5 minutes
   
   ### 9. Release (`release.yml`)
   
   **Triggers:** Tag push (v*)
   
   **Jobs:**
   - Build extension
   - Smoke tests
   - Publish to Marketplace
   - Publish to Open VSX
   - Create GitHub Release
   
   **Duration:** ~5-8 minutes
   
   ## Secrets Management
   
   Secrets stored in GitHub repository settings:
   
   - `VSCE_TOKEN` - VS Code Marketplace personal access token
   - `OVSX_TOKEN` - Open VSX Registry access token
   - `SONAR_TOKEN` - SonarCloud authentication token
   - `GITHUB_TOKEN` - Automatically provided by GitHub Actions
   - `CODECOV_TOKEN` - Codecov upload token
   
   ## Caching Strategy
   
   - **npm cache:** Cached using `actions/setup-node@v4` with `cache: 'npm'`
   - **SonarCloud:** Cached analysis data
   - **Docker layers:** Cached using BuildKit
   
   ## Cost Optimization
   
   - Tests run in parallel where possible
   - Conditional job execution (e.g., Docker tests only on PR)
   - Caching to reduce build time
   - Matrix strategy for platform testing
   
   ## Monitoring
   
   - GitHub Actions dashboard for pipeline status
   - Weekly metrics report
   - SonarCloud dashboard for code quality
   - Codecov for coverage trends
   ```

3. Создать `docs/CONTRIBUTING.md`:
   ```markdown
   # Contributing to CursorAI Autonomous Extension
   
   ## Development Workflow
   
   1. Fork the repository
   2. Clone your fork
   3. Create feature branch
   4. Make changes
   5. Run tests locally
   6. Commit with conventional commits
   7. Push and create PR
   
   ## Commit Convention
   
   We use Conventional Commits:
   
   ```
   <type>(<scope>): <subject>
   
   <body>
   
   <footer>
   ```
   
   **Types:**
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation changes
   - `style`: Code style changes
   - `refactor`: Code refactoring
   - `perf`: Performance improvements
   - `test`: Test changes
   - `chore`: Build/tooling changes
   - `ci`: CI/CD changes
   
   **Examples:**
   ```
   feat(agents): add new DevOps agent
   fix(orchestrator): resolve task queue deadlock
   docs(readme): update installation instructions
   ci(workflow): add Docker tests
   ```
   
   ## Local Development
   
   ### Setup
   
   ```bash
   npm install
   npm run compile
   npm run watch  # for auto-recompilation
   ```
   
   ### Testing
   
   ```bash
   # Run all tests
   npm test
   
   # Unit tests only
   npm run test:unit
   
   # Integration tests
   npm run test:integration
   
   # E2E tests
   npm run test:e2e
   
   # With coverage
   npm run test:jest:coverage
   
   # In Docker (recommended)
   bash scripts/test-in-docker.sh
   ```
   
   ### Code Quality
   
   ```bash
   # Lint
   npm run lint
   
   # Security audit
   npm run security:check
   
   # SonarLint (recommended in IDE)
   ```
   
   ### Running Extension
   
   1. Open project in VS Code
   2. Press F5
   3. Extension Host window opens
   4. Test your changes
   
   ## Pull Request Checklist
   
   Before submitting PR:
   
   - [ ] Code compiles without errors
   - [ ] All tests pass
   - [ ] New tests added for new features
   - [ ] Code linted (no ESLint errors)
   - [ ] Commits follow conventional commits
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated (if needed)
   - [ ] No secrets in code
   - [ ] Coverage maintained or improved
   
   ## Code Review Process
   
   1. PR created
   2. Automated checks run
   3. Maintainer reviews code
   4. Feedback addressed
   5. Approved and merged
   
   ## Release Process
   
   See [DEPLOYMENT.md](DEPLOYMENT.md)
   ```

**Проверка:**
- ✅ Документация полная и понятная
- ✅ Процессы описаны пошагово
- ✅ Диаграммы помогают понять архитектуру

**Время:** 4-6 часов

---

## 📊 Метрики успеха

После внедрения всех фаз:

### Автоматизация

- ✅ **100% автоматизация CI/CD** - от commit до production
- ✅ **0 ручных шагов** для релиза
- ✅ **< 5 минут** от merge до production

### Качество

- ✅ **Coverage > 80%** для всего кода
- ✅ **0 critical security issues**
- ✅ **Quality Gate passed** на всех PR
- ✅ **0 secrets leaked**

### Стабильность

- ✅ **99% success rate** для CI/CD pipelines
- ✅ **< 1% rollback rate** для релизов
- ✅ **< 10 минут** на выявление проблем

### Производительность

- ✅ **< 10 минут** для полного test suite
- ✅ **< 5 минут** для release pipeline
- ✅ **< 3 минуты** для security scans

---

## ⚠️ Риски и митигация

### Риск 1: Сложность настройки

**Вероятность:** HIGH  
**Влияние:** MEDIUM

**Митигация:**
- Пошаговая документация
- Скрипты автоматизации
- Тестирование в sandbox окружении

### Риск 2: False positives в security scans

**Вероятность:** MEDIUM  
**Влияние:** LOW

**Митигация:**
- Настройка allowlists
- Регулярный review результатов
- Тонкая настройка tools

### Риск 3: Увеличение времени CI/CD

**Вероятность:** MEDIUM  
**Влияние:** MEDIUM

**Митигация:**
- Параллельное выполнение jobs
- Caching зависимостей
- Conditional execution
- Оптимизация тестов

### Риск 4: Secrets exposure

**Вероятность:** LOW  
**Влияние:** CRITICAL

**Митигация:**
- Gitleaks pre-commit hooks
- Automatic scanning
- Secret rotation policy
- GitHub secrets для хранения

### Риск 5: Marketplace publish failures

**Вероятность:** LOW  
**Влияние:** HIGH

**Митигация:**
- Smoke tests перед publish
- Automatic retry logic
- Manual fallback процесс
- Monitoring и alerting

---

## 📅 Временная оценка

| Фаза | Время | Приоритет |
|------|-------|-----------|
| Фаза 1: CI/CD | 8-12 часов | IMMEDIATE |
| Фаза 2: Безопасность | 6-8 часов | HIGH |
| Фаза 3: Тестирование | 10-14 часов | HIGH |
| Фаза 4: Мониторинг | 6-8 часов | MEDIUM |
| Фаза 5: Документация | 4-6 часов | MEDIUM |
| **ИТОГО** | **34-48 часов** | |

**Рекомендуемый подход:** Поэтапная реализация (1-2 фазы в неделю)

---

## 🎯 Следующие шаги

### Немедленно (Immediate Priority)

1. ✅ Создать базовый CI pipeline
2. ✅ Настроить автоматические тесты
3. ✅ Настроить release workflow

### Высокий приоритет (High Priority)

4. ✅ Настроить security scanning
5. ✅ Добавить Docker тестирование
6. ✅ Настроить Dependabot

### Средний приоритет (Medium Priority)

7. ✅ Интегрировать SonarCloud
8. ✅ Настроить метрики
9. ✅ Написать документацию

---

## 📞 Контакты

**DevOps Engineer:** AI Assistant  
**Дата:** 2025-12-31

---

**Примечание:** Этот план является живым документом и будет обновляться по мере реализации.
