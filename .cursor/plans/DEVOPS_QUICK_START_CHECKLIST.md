# ⚡ DevOps Quick Start Checklist

**Быстрый старт для реализации оптимизации инфраструктуры**

---

## 🚀 Неделя 1: Базовый CI/CD (8-12 часов)

### День 1-2: Настройка GitHub Actions

- [ ] Создать `.github/workflows/ci.yml`
  ```bash
  mkdir -p .github/workflows
  touch .github/workflows/ci.yml
  ```

- [ ] Настроить matrix testing (Ubuntu, Windows, macOS)
- [ ] Добавить artifact upload для .vsix файлов
- [ ] Протестировать workflow на feature ветке

**Проверка:** ✅ Pipeline запускается и проходит успешно

### День 3: Настройка Code Quality

- [ ] Создать `.github/workflows/code-quality.yml`
- [ ] Интегрировать Codecov
  ```bash
  # Получить токен: https://codecov.io/
  # Добавить в GitHub Secrets: CODECOV_TOKEN
  ```
- [ ] Настроить coverage thresholds в `jest.config.js`
- [ ] Добавить coverage badges в README.md

**Проверка:** ✅ Coverage report генерируется на каждом PR

### День 4-5: Настройка Release Pipeline

- [ ] Создать `.github/workflows/release.yml`
- [ ] Получить VSCE_TOKEN:
  ```bash
  # 1. Создать Personal Access Token в Azure DevOps
  # 2. Добавить в GitHub Secrets
  ```
- [ ] Получить OVSX_TOKEN (опционально):
  ```bash
  # https://open-vsx.org/user-settings/tokens
  ```
- [ ] Создать скрипт `scripts/prepare-release.sh`
- [ ] Протестировать preview release

**Проверка:** ✅ Релиз создается автоматически при создании тега

---

## 🔒 Неделя 2: Безопасность (6-8 часов)

### День 1: npm audit и Dependabot

- [ ] Создать `.github/workflows/security-audit.yml`
- [ ] Создать `.github/dependabot.yml`
- [ ] Запустить `npm audit` и исправить critical issues
- [ ] Включить Dependabot в репозитории

**Проверка:** ✅ Security alerts появляются в GitHub

### День 2: Secret Scanning

- [ ] Создать `.github/workflows/secret-scan.yml`
- [ ] Создать `.gitleaks.toml`
- [ ] Установить gitleaks локально (опционально):
  ```bash
  # macOS
  brew install gitleaks
  
  # Linux
  wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
  tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
  sudo mv gitleaks /usr/local/bin/
  ```
- [ ] Запустить первое сканирование:
  ```bash
  gitleaks detect --verbose
  ```

**Проверка:** ✅ Gitleaks блокирует commits с секретами

### День 3: CodeQL и Trivy

- [ ] Создать `.github/workflows/codeql-analysis.yml`
- [ ] Включить Code Scanning в GitHub Settings
- [ ] Добавить Trivy scan в security-audit.yml
- [ ] Проверить SARIF uploads в Security tab

**Проверка:** ✅ CodeQL анализирует код и находит уязвимости

---

## 🧪 Неделя 3: Тестирование (10-14 часов)

### День 1-2: Улучшение Test Suite

- [ ] Создать `.github/workflows/test-suite.yml`
- [ ] Разделить тесты: unit, integration, e2e
- [ ] Настроить параллельное выполнение
- [ ] Добавить test reporting

**Проверка:** ✅ Тесты проходят на всех платформах за < 10 минут

### День 3-4: Docker Testing

- [ ] Создать `Dockerfile.test`
- [ ] Создать `docker-compose.test.yml`
- [ ] Создать скрипт `scripts/test-in-docker.sh`
- [ ] Добавить `.github/workflows/docker-tests.yml`
- [ ] Протестировать локально:
  ```bash
  bash scripts/test-in-docker.sh
  ```

**Проверка:** ✅ Тесты проходят в Docker контейнерах

### День 5: Smoke Tests

- [ ] Создать `tests/smoke/smoke.test.ts`
- [ ] Добавить `.github/workflows/smoke-tests.yml`
- [ ] Интегрировать smoke tests в release pipeline
- [ ] Добавить в `scripts/prepare-release.sh`

**Проверка:** ✅ Smoke tests выполняются перед каждым релизом

---

## 📊 Неделя 4: Мониторинг и Документация (10-14 часов)

### День 1-2: SonarCloud

- [ ] Зарегистрироваться на https://sonarcloud.io/
- [ ] Импортировать репозиторий
- [ ] Создать `sonar-project.properties`
- [ ] Создать `.github/workflows/sonarcloud.yml`
- [ ] Получить SONAR_TOKEN и добавить в GitHub Secrets
- [ ] Настроить Quality Gates
- [ ] Добавить badges в README.md

**Проверка:** ✅ SonarCloud анализирует код на каждом PR

### День 3: Метрики и Changelog

- [ ] Создать скрипт `scripts/ci-metrics.sh`
- [ ] Создать `.github/workflows/metrics-report.yml`
- [ ] Установить commitlint:
  ```bash
  npm install --save-dev @commitlint/cli @commitlint/config-conventional standard-version
  ```
- [ ] Создать `.commitlintrc.json`
- [ ] Создать `.versionrc.json`
- [ ] Добавить скрипты в `package.json`

**Проверка:** ✅ CHANGELOG.md генерируется автоматически

### День 4-5: Документация

- [ ] Создать `docs/DEPLOYMENT.md`
- [ ] Создать `docs/CI-CD-ARCHITECTURE.md`
- [ ] Создать `docs/CONTRIBUTING.md`
- [ ] Обновить README.md с badges и ссылками
- [ ] Создать диаграммы архитектуры

**Проверка:** ✅ Документация полная и актуальная

---

## 🎯 Финальная проверка

После завершения всех недель:

### CI/CD
- [ ] ✅ Pipeline запускается автоматически
- [ ] ✅ Тесты проходят на всех платформах
- [ ] ✅ Релизы создаются автоматически
- [ ] ✅ .vsix публикуется в Marketplace

### Безопасность
- [ ] ✅ npm audit проходит без critical issues
- [ ] ✅ Dependabot создает PR для обновлений
- [ ] ✅ Gitleaks блокирует секреты
- [ ] ✅ CodeQL анализирует код
- [ ] ✅ Trivy сканирует проект

### Качество
- [ ] ✅ Coverage > 80%
- [ ] ✅ SonarCloud Quality Gate passed
- [ ] ✅ ESLint без ошибок
- [ ] ✅ Все тесты проходят

### Документация
- [ ] ✅ Процессы задокументированы
- [ ] ✅ CONTRIBUTING.md создан
- [ ] ✅ DEPLOYMENT.md создан
- [ ] ✅ Badges добавлены в README.md

---

## 📋 Команды для быстрого старта

### Первоначальная настройка

```bash
# 1. Создать структуру директорий
mkdir -p .github/workflows docs scripts tests/smoke

# 2. Установить зависимости для commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional standard-version

# 3. Создать базовые файлы
touch .github/workflows/{ci,code-quality,security-audit,release}.yml
touch docs/{DEPLOYMENT,CI-CD-ARCHITECTURE,CONTRIBUTING}.md
touch scripts/{prepare-release,test-in-docker,ci-metrics}.sh
touch .gitleaks.toml .commitlintrc.json .versionrc.json sonar-project.properties

# 4. Сделать скрипты исполняемыми
chmod +x scripts/*.sh

# 5. Запустить первую проверку
npm run lint
npm test
npm run test:jest:coverage
```

### Получение токенов

```bash
# VSCE_TOKEN (VS Code Marketplace)
# 1. Перейти: https://dev.azure.com/
# 2. User Settings → Personal Access Tokens
# 3. New Token → Marketplace: Manage

# CODECOV_TOKEN
# 1. Перейти: https://codecov.io/
# 2. Добавить репозиторий
# 3. Скопировать токен из Settings

# SONAR_TOKEN
# 1. Перейти: https://sonarcloud.io/
# 2. My Account → Security
# 3. Generate Token

# OVSX_TOKEN (опционально)
# 1. Перейти: https://open-vsx.org/
# 2. User Settings → Access Tokens
# 3. New Access Token
```

### Добавление секретов в GitHub

```bash
# Через GitHub CLI (если установлен)
gh secret set VSCE_TOKEN --body "YOUR_TOKEN"
gh secret set CODECOV_TOKEN --body "YOUR_TOKEN"
gh secret set SONAR_TOKEN --body "YOUR_TOKEN"
gh secret set OVSX_TOKEN --body "YOUR_TOKEN"

# Или через веб-интерфейс:
# Settings → Secrets and variables → Actions → New repository secret
```

### Локальное тестирование

```bash
# Запустить все проверки локально
npm run lint
npm run security:check
npm run test:all
npm run test:jest:coverage

# Проверить secrets
gitleaks detect --verbose

# Собрать расширение
npm run build

# Создать preview релиз
bash scripts/prepare-release.sh
```

---

## 🚨 Troubleshooting

### Pipeline fails на Windows

**Проблема:** Тесты проходят локально, но падают на Windows CI

**Решение:**
1. Проверить line endings (CRLF vs LF)
2. Проверить пути (/ vs \)
3. Добавить `git config core.autocrlf false` в workflow

### npm audit находит vulnerabilities

**Проблема:** npm audit показывает уязвимости

**Решение:**
```bash
# Попробовать автофикс
npm audit fix

# Если не помогло - обновить зависимости
npm update

# Если critical - рассмотреть альтернативные пакеты
npm outdated
```

### Coverage падает ниже threshold

**Проблема:** Coverage < 80%

**Решение:**
1. Добавить тесты для uncovered кода
2. Временно снизить threshold в `jest.config.js`
3. Исключить boilerplate код из coverage

### Release pipeline не публикует в Marketplace

**Проблема:** Extension не появляется в Marketplace

**Решение:**
1. Проверить VSCE_TOKEN валидность
2. Проверить publisher ID в package.json
3. Проверить что версия уникальна
4. Проверить логи GitHub Actions

### SonarCloud Quality Gate failed

**Проблема:** Quality Gate не проходит

**Решение:**
1. Проверить какие метрики не прошли
2. Исправить code smells/bugs
3. Увеличить coverage
4. Рефакторить сложный код

---

## 📚 Полезные ссылки

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot)

---

**Следующий шаг:** Начните с Недели 1 и двигайтесь последовательно! 🚀
