# 📁 DevOps Configuration Templates

**Готовые шаблоны конфигурационных файлов для копирования**

---

## 📋 Содержание

1. [GitHub Actions Workflows](#github-actions-workflows)
2. [Security Configuration](#security-configuration)
3. [Testing Configuration](#testing-configuration)
4. [Quality Tools](#quality-tools)
5. [Docker Configuration](#docker-configuration)
6. [Git Hooks](#git-hooks)

---

## GitHub Actions Workflows

### 1. CI Pipeline (.github/workflows/ci.yml)

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop, cursor/*, feature/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build-and-test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
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
      
      - name: Compile TypeScript
        run: npm run compile
      
      - name: Package extension
        run: npm run package
      
      - name: Upload VSIX artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-${{ matrix.os }}-node-${{ matrix.node-version }}
          path: '*.vsix'
          retention-days: 7
```

### 2. Code Quality (.github/workflows/code-quality.yml)

```yaml
name: Code Quality

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint -- --format json --output-file eslint-report.json
        continue-on-error: true
      
      - name: Run tests with coverage
        run: npm run test:jest:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests
          token: ${{ secrets.CODECOV_TOKEN }}
      
      - name: Comment PR with coverage
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
          delete-old-comments: true
```

### 3. Security Audit (.github/workflows/security-audit.yml)

```yaml
name: Security Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * 1'  # Every Monday at midnight

jobs:
  security-audit:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      
      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate --json > npm-audit-report.json || true
          npm audit --audit-level=moderate
        continue-on-error: true
      
      - name: Upload audit report
        uses: actions/upload-artifact@v4
        with:
          name: npm-audit-report
          path: npm-audit-report.json
      
      - name: Dependency Review
        uses: actions/dependency-review-action@v4
        if: github.event_name == 'pull_request'
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

### 4. Secret Scanning (.github/workflows/secret-scan.yml)

```yaml
name: Secret Scanning

on:
  push:
  pull_request:

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
```

### 5. CodeQL Analysis (.github/workflows/codeql-analysis.yml)

```yaml
name: CodeQL Security Analysis

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM

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
      - name: Checkout code
        uses: actions/checkout@v4
      
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

### 6. Release Pipeline (.github/workflows/release.yml)

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
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run Jest tests
        run: npm run test:jest
      
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
        continue-on-error: true
```

### 7. SonarCloud Analysis (.github/workflows/sonarcloud.yml)

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
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Shallow clones should be disabled for better analysis
      
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

---

## Security Configuration

### Dependabot (.github/dependabot.yml)

```yaml
version: 2
updates:
  # Enable version updates for npm
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "Zeed80"
    assignees:
      - "Zeed80"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore(deps)"
      include: "scope"
    versioning-strategy: increase
    
    # Ignore major updates for stable dependencies
    ignore:
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
```

### Gitleaks Configuration (.gitleaks.toml)

```toml
title = "CursorAI Extension Gitleaks Config"

[extend]
useDefault = true

[[rules]]
id = "generic-api-key"
description = "Generic API Key"
regex = '''(?i)(api[_-]?key|apikey|api[_-]?token)['\"]?\s*[:=]\s*['\"]([\w-]{32,})['"]'''
tags = ["key", "api"]

[[rules]]
id = "openai-api-key"
description = "OpenAI API Key"
regex = '''sk-[a-zA-Z0-9]{48}'''
tags = ["key", "openai"]

[[rules]]
id = "anthropic-api-key"
description = "Anthropic API Key"
regex = '''sk-ant-[a-zA-Z0-9-]{95}'''
tags = ["key", "anthropic"]

[[rules]]
id = "google-api-key"
description = "Google API Key"
regex = '''AIza[0-9A-Za-z\\-_]{35}'''
tags = ["key", "google"]

[[rules]]
id = "github-token"
description = "GitHub Token"
regex = '''ghp_[0-9a-zA-Z]{36}'''
tags = ["token", "github"]

[allowlist]
description = "Allowlist for false positives"
paths = [
  '''\.md$''',
  '''\.txt$''',
  '''\.example$''',
  '''test.*\.ts$''',
  '''\__tests__/.*'''
]

regexes = [
  '''EXAMPLE_API_KEY''',
  '''YOUR_API_KEY''',
  '''sk-test-''',
  '''dummy-key'''
]
```

---

## Testing Configuration

### Jest Configuration (jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/extension.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/integration/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true
};
```

### Dockerfile for Testing (Dockerfile.test)

```dockerfile
# Multi-stage build for testing
FROM node:20-alpine AS base

# Install dependencies for VS Code testing
RUN apk add --no-cache \
    git \
    bash \
    curl \
    xvfb \
    libxkbfile-dev \
    libsecret-1-0 \
    chromium

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript
RUN npm run compile

# Stage for unit tests
FROM base AS test-unit
CMD ["npm", "run", "test:jest"]

# Stage for integration tests
FROM base AS test-integration
CMD ["npm", "run", "test:api"]

# Stage for e2e tests
FROM base AS test-e2e
ENV DISPLAY=:99
RUN Xvfb :99 -screen 0 1024x768x16 &
CMD ["npm", "test"]
```

### Docker Compose for Testing (docker-compose.test.yml)

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
      - ./test-results:/app/test-results
    environment:
      - CI=true
      - NODE_ENV=test
  
  test-integration:
    build:
      context: .
      dockerfile: Dockerfile.test
      target: test-integration
    volumes:
      - ./test-results:/app/test-results
    environment:
      - CI=true
      - NODE_ENV=test
  
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
      - NODE_ENV=test
    shm_size: 2gb
```

---

## Quality Tools

### SonarCloud Configuration (sonar-project.properties)

```properties
# Project identification
sonar.projectKey=cursorai-autonomous-extension
sonar.organization=zeed80
sonar.projectName=CursorAI Autonomous Extension
sonar.projectVersion=0.3.0

# Source code
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/__tests__/**,**/*.test.ts,**/*.spec.ts
sonar.exclusions=**/node_modules/**,**/out/**,**/*.d.ts,**/coverage/**

# Coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=test-results/sonar-report.xml

# TypeScript
sonar.typescript.node=node_modules/typescript/lib
sonar.typescript.tsconfigPath=tsconfig.json

# Quality gates
sonar.qualitygate.wait=true
```

### Commitlint Configuration (.commitlintrc.json)

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
        "build",
        "revert"
      ]
    ],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "subject-case": [2, "never", ["upper-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 72],
    "body-leading-blank": [1, "always"],
    "footer-leading-blank": [1, "always"]
  }
}
```

### Standard Version Configuration (.versionrc.json)

```json
{
  "types": [
    {"type": "feat", "section": "✨ Features"},
    {"type": "fix", "section": "🐛 Bug Fixes"},
    {"type": "perf", "section": "⚡ Performance Improvements"},
    {"type": "refactor", "section": "♻️ Code Refactoring"},
    {"type": "docs", "section": "📚 Documentation"},
    {"type": "test", "section": "🧪 Tests"},
    {"type": "build", "section": "📦 Build System"},
    {"type": "ci", "section": "👷 CI/CD"},
    {"type": "chore", "section": "🔧 Chore", "hidden": true},
    {"type": "style", "section": "💄 Styles", "hidden": true},
    {"type": "revert", "section": "⏪ Reverts"}
  ],
  "commitUrlFormat": "https://github.com/Zeed80/CursorAI_Ext_Rules/commit/{{hash}}",
  "compareUrlFormat": "https://github.com/Zeed80/CursorAI_Ext_Rules/compare/{{previousTag}}...{{currentTag}}",
  "issueUrlFormat": "https://github.com/Zeed80/CursorAI_Ext_Rules/issues/{{id}}",
  "userUrlFormat": "https://github.com/{{user}}",
  "releaseCommitMessageFormat": "chore(release): {{currentTag}}",
  "issuePrefixes": ["#"],
  "preMajor": false,
  "header": "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n",
  "skip": {
    "changelog": false,
    "commit": false,
    "tag": false
  }
}
```

---

## Git Hooks

### Pre-commit Hook (scripts/install-git-hooks.sh)

```bash
#!/bin/bash

echo "📦 Installing Git hooks..."

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 Running pre-commit checks..."

# Check for secrets
if command -v gitleaks &> /dev/null; then
  echo "🔒 Checking for secrets..."
  gitleaks protect --staged --verbose
  if [ $? -ne 0 ]; then
    echo "❌ Secrets detected! Commit blocked."
    echo "💡 Remove secrets or add to .gitleaks.toml allowlist"
    exit 1
  fi
  echo "✅ No secrets found"
fi

# Run linter
echo "🎨 Running ESLint..."
npm run lint --silent
if [ $? -ne 0 ]; then
  echo "❌ Linting failed! Fix errors before committing."
  exit 1
fi
echo "✅ Linting passed"

# Run unit tests
echo "🧪 Running unit tests..."
npm run test:unit --silent
if [ $? -ne 0 ]; then
  echo "❌ Tests failed! Fix tests before committing."
  exit 1
fi
echo "✅ Tests passed"

echo "✅ Pre-commit checks passed!"
EOF

chmod +x .git/hooks/pre-commit

# Create commit-msg hook
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash

echo "📝 Checking commit message..."

# Run commitlint
npx commitlint --edit "$1"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Commit message does not follow Conventional Commits format!"
  echo ""
  echo "Examples:"
  echo "  feat(agents): add new backend agent"
  echo "  fix(ui): resolve status panel crash"
  echo "  docs(readme): update installation guide"
  echo ""
  exit 1
fi

echo "✅ Commit message is valid"
EOF

chmod +x .git/hooks/commit-msg

echo "✅ Git hooks installed successfully!"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: runs linter, tests, and secret scanning"
echo "  - commit-msg: validates commit message format"
```

---

## Package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "lint:fix": "eslint src --ext ts --fix",
    "test": "node ./out/test/runTest.js",
    "test:unit": "jest --testMatch='**/__tests__/**/*.test.ts' --testPathIgnorePatterns=integration",
    "test:integration": "jest --testMatch='**/integration/**/*.test.ts'",
    "test:e2e": "npm test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:jest": "jest",
    "test:jest:watch": "jest --watch",
    "test:jest:coverage": "jest --coverage",
    "test:smoke": "jest tests/smoke/smoke.test.ts",
    "test:api": "jest src/integration/__tests__/cursor-api-models.test.ts",
    "audit:fix": "npm audit fix",
    "audit:report": "npm audit --json > audit-report.json",
    "security:check": "npm audit && npm run lint",
    "package": "vsce package",
    "build": "npm run compile && npm run package",
    "build:all": "npm run compile && npm run package",
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major",
    "release:patch": "standard-version --release-as patch",
    "install:hooks": "bash scripts/install-git-hooks.sh"
  }
}
```

---

## 🚀 Quick Setup Commands

```bash
# 1. Create directory structure
mkdir -p .github/workflows docs scripts tests/smoke

# 2. Install dev dependencies
npm install --save-dev \
  @commitlint/cli \
  @commitlint/config-conventional \
  standard-version

# 3. Copy all configuration files from this document

# 4. Make scripts executable
chmod +x scripts/*.sh

# 5. Install git hooks
npm run install:hooks

# 6. Test locally
npm run lint
npm run test:all
npm run build

# 7. Setup GitHub secrets
gh secret set VSCE_TOKEN
gh secret set CODECOV_TOKEN
gh secret set SONAR_TOKEN
gh secret set OVSX_TOKEN

# 8. Push to GitHub
git add .
git commit -m "ci: setup DevOps infrastructure"
git push
```

---

**Все готово! Просто скопируйте нужные файлы и настройте секреты.** 🎉
