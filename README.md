# 🤖 CursorAI Autonomous Extension

<div align="right">

[English](#-cursorai-autonomous-extension-english) | [Русский](README_RU.md)

</div>

> ## 🎉 **FREE & AUTONOMOUS AI DEVELOPMENT** 🎉
> 
> ### **Work Completely Free with Local Models!**
> 
> The extension provides **fully autonomous development system** that works:
> 
> - ✅ **100% FREE** - use local models (Ollama, LLM Studio) - **$0 cost forever**
> - ✅ **Your own API keys** - use your OpenAI, Anthropic, Google accounts - pay only for usage
> - ✅ **No CursorAI requirements** - works independently, no Background Agents API needed
> - ✅ **Full autonomy** - agents work continuously in the background
> - ✅ **Optional CursorAI integration** - if you have Pro plan and want to use it
> 
> ### **🚀 Quick Start (Free)**
> 
> ```bash
> # 1. Install Ollama (takes 2 minutes)
> # Download from https://ollama.ai/
> 
> # 2. Download free models
> ollama pull codellama
> ollama pull mistral
> 
> # 3. Install extension and enable autonomous mode
> # Done! Your free AI development team is ready!
> ```
> 
> **You pay NOTHING** - all processing happens on your computer!

> ## ⚠️ **OPTIONAL: CursorAI Background Agents** ⚠️
> 
> ### **Only if you want to use CursorAI's official Background Agents**
> 
> If you decide to use CursorAI's **Background Agents API** (optional feature), be aware:
> 
> - ⚠️ Requires **Usage-based pricing** enabled in Cursor
> - ⚠️ Requires **Spend Limit** (minimum $2)
> - ⚠️ **Additional costs** beyond your subscription
> - ⚠️ Can accumulate expenses with intensive use
> 
> **Recommendation:** Start with **free local models** (Ollama). Enable CursorAI integration only if you need it for specific tasks like:
> - Solution consolidation from multiple agents
> - File editing with Composer preview
> 
> **The extension works perfectly without CursorAI Background Agents!**

> ## 🌟 **NEW IN VERSION 0.3.0** 🌟
> 
> ### **True Autonomous Operation with Local Models**
> 
> - ✅ **$0 cost operation** - use only local models (Ollama, LLM Studio)
> - ✅ **Hybrid mode** - combine local models with cloud APIs (OpenAI, Google, Anthropic)
> - ✅ **Optional CursorAI integration** - use CursorAI only for specific tasks
> - ✅ **Swarm orchestration** - autonomous agents work continuously in the background
> - ✅ **Prioritized task queue** - immediate, high, medium, low priorities
> - ✅ **Real-time monitoring** - file watcher triggers tasks automatically
> - ✅ **Health monitoring** - auto-restart agents on failures
> - ✅ **Cost optimization** - prompt caching, request batching, cost monitoring
> - ✅ **UI improvements** - context menu for task creation, dashboard panel
> - ✅ **Detailed logging** - Output Channel with detailed task progress, agent actions, and results

---

<div align="center">

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/Zeed80/CursorAI_Ext_Rules)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/Zeed80/CursorAI_Ext_Rules/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.80+-blue)](https://code.visualstudio.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Zeed80/CursorAI__Ext_Rules-blue)](https://github.com/Zeed80/CursorAI_Ext_Rules)
[![GitHub stars](https://img.shields.io/github/stars/Zeed80/CursorAI_Ext_Rules?style=social)](https://github.com/Zeed80/CursorAI_Ext_Rules/stargazers)

**Autonomous extension for CursorAI with virtual user and self-improvement system**

[Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

<a id="cursorai-autonomous-extension-english"></a>

## 📋 Description

**CursorAI Autonomous Extension** — an extension that transforms your IDE into a fully autonomous development system. The extension works **without requiring CursorAI's Background Agents API**, using local models (Ollama, LLM Studio) or cloud APIs (OpenAI, Google, Anthropic).

### 🎯 Core Idea

Even weak coding models can write better code than top models if they:
- ✅ Use deep code analysis before writing
- ✅ Check syntax via MCP Context7
- ✅ Verify facts via web search
- ✅ Follow adaptive project rules
- ✅ Coordinate specialized agents
- ✅ **Work autonomously in the background**

## ✨ Features

### 🤖 Autonomous Mode (NEW!)

**True autonomous operation:**

- **SwarmOrchestrator** — coordinates multiple agent workers
- **AgentWorker** — autonomous agents running in infinite loops
- **TaskQueue** — prioritized task queue (immediate, high, medium, low)
- **MessageBus** — peer-to-peer communication between agents
- **FileWatcher** — real-time file monitoring triggers automatic tasks
- **HealthMonitor** — auto-restart agents on failures
- **No supervision required** — agents work continuously when IDE is open

### 🎭 Agent Orchestrator

Automatically coordinates specialized AI agents:

- **Backend Developer** — backend development (PHP, PostgreSQL, API)
- **Frontend Developer** — frontend development (HTML, CSS, JavaScript)
- **Software Architect** — architecture and planning
- **Data Analyst** — performance analysis and optimization
- **DevOps Engineer** — infrastructure and deployment (Docker, CI/CD)
- **QA Engineer** — testing (unit, integration, e2e)

**Orchestrator:**
- Automatically selects suitable agents for tasks
- Coordinates work between agents
- Checks quality via MCP Context7 and web search
- Manages tasks and their priorities
- **Brainstorming with task variations** — creates different formulations
- **Deviation control** — checks solution alignment
- **Ensemble refinement** — multiple models propose improvements

### 💰 Cost Optimization (NEW!)

**Intelligent model selection:**

- **HybridModelProvider** — automatically chooses the best model:
  - Local models (Ollama, LLM Studio) for simple tasks - $0
  - Cheap cloud APIs (OpenAI GPT-3.5) for medium tasks - ~$0.01/task
  - Expensive models (GPT-4, Claude) for complex tasks only
- **SmartModelSelector** — assesses task complexity
- **PromptCache** — caches prompts to reduce API calls (LRU, configurable TTL)
- **RequestBatcher** — batches multiple small requests
- **CostMonitor** — tracks expenses per model and agent
- **Monthly budget control** — stops when budget is reached

**Cost scenarios:**
- **$0/month** — use only local models (Ollama)
- **$5-30/month** — hybrid (local + cheap cloud APIs)
- **Optional CursorAI** — use only for specific tasks (consolidation, file editing)

### 🔧 Model Providers (NEW!)

**Support for multiple LLM providers:**

- **Ollama** — local models (codellama, mistral, etc.)
- **LLM Studio** — local models via API
- **OpenAI** — GPT-3.5, GPT-4
- **Anthropic** — Claude (all versions)
- **Google** — Gemini Pro
- **CursorAI** — optional, only for specific tasks

**Configuration per agent:**
- Each agent can use a different provider
- Automatic fallback if primary provider fails
- Provider priorities in hybrid mode

### 🎨 CursorAI Integration (Optional, NEW!)

**Strategic use of CursorAI:**

- **Chat API** — solution consolidation from multiple agents
- **Composer API** — safe file editing with preview
- **Configurable usage** — choose when to use CursorAI:
  - `consolidation` — for merging agent solutions
  - `file-editing` — for applying file changes
  - `never` — don't use CursorAI at all

### 👤 Virtual User

Autonomous agent that:

- Understands project goals
- Monitors task execution
- Automatically makes decisions about approving proposals
- Initiates new tasks to improve the project
- Consults with other agents

### 🔄 Self-Improvement System

Continuously improves work quality:

- **Performance Monitor** — tracks agent performance metrics
- **Knowledge Searcher** — searches for best practices information
- **Rule Updater** — automatically updates rules
- **Agent Optimizer** — optimizes agent work

### 📐 Adaptive Rules

Automatically adapts rules to the project:

- Analyzes project structure
- Determines technology stack
- Generates rules based on analysis
- Updates rules when the project changes
- Versions rules for rollback

### 🔍 Integration with MCP Context7 and Web Search

**Critically important:** Always checks syntax and facts before writing code:

- ✅ Syntax checking via MCP Context7
- ✅ Library currency checking via web search
- ✅ Best practices search
- ✅ Security checking

### 🧠 Advanced MCP Client (NEW!)

**Expanded capabilities:**

- **File operations** — read, write, move, delete, search
- **Git operations** — status, commit, diff, branch, merge, stash, rebase
- **Code search** — semantic search, grep, find references
- **Context management** — analyze dependencies, get file summaries
- **Test runner integration** — auto-detect framework, run tests
- **Linter integration** — read diagnostics, suggest fixes

### 🎨 Modern UI (Improved!)

- **Agent status panel** — TreeView with real-time updates
- **Settings panel** — WebView with tabbed interface (NEW: Autonomous Mode tab)
- **Dashboard panel** (NEW!) — cost statistics, agent activity, system health
- **Quick menu** — quick access to all tools
- **Status bar** — system state indicators (shows autonomous mode status)
- **Context menu** (NEW!) — create tasks directly from Explorer
- **Analytics** — task execution statistics

## 🚀 Installation

### Method 1: Drag and drop .vsix file ⭐ (Simplest)

1. Build the extension:
   ```bash
   npm run package
   ```

2. Open CursorAI

3. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS)

4. **Drag the `.vsix` file into the CursorAI window**

5. Done! Extension is installed

📖 More details: [QUICK_INSTALL.md](QUICK_INSTALL.md)

### Method 2: Automatic installation (Recommended)

**Windows:**
```bash
install.bat
```

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

**Universal method (Node.js):**
```bash
npm run install
```

The autonomous installer automatically:
- ✓ Checks for Node.js and npm
- ✓ Installs all dependencies
- ✓ Compiles the project
- ✓ Builds the extension into .vsix
- ✓ Installs the extension in CursorAI

📖 More details: [INSTALL.md](INSTALL.md)

### Method 3: Manual installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Zeed80/CursorAI_Ext_Rules.git
   cd CursorAI_Ext_Rules
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run package
   ```

4. Install the built .vsix file in CursorAI:
   ```bash
   code --install-extension cursor-ai-autonomous-extension-0.3.0.vsix
   ```

📖 More details: [BUILD.md](BUILD.md)

## ⚡ Quick Start

### 0. Prerequisites

**Option A: Local Models Only ($0 cost)**

1. Install [Ollama](https://ollama.ai/)
2. Download models:
   ```bash
   ollama pull codellama
   ollama pull mistral
   ollama pull llama2
   ```
3. Configure extension settings (see below)

**Option B: Hybrid Mode ($5-30/month)**

1. Install Ollama (optional)
2. Get API keys:
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/
   - Google: https://makersuite.google.com/app/apikey
3. Configure extension settings (see below)

**Option C: With CursorAI Integration (Optional)**

1. Have a CursorAI Pro plan
2. Complete Option A or B
3. Enable CursorAI integration in settings

### 1. Extension Activation

After installation, the extension activates automatically when opening a project.

### 2. Configure Settings

**Method 1: Through Settings Panel (Recommended)**

1. Press `Ctrl+Shift+A` (Quick Menu)
2. Select "⚙ Settings"
3. Configure:
   - **Agents tab** — select providers and models for each agent
   - **Autonomous Mode tab** (NEW!) — configure autonomous operation:
     - Enable autonomous mode
     - Set up hybrid mode (preferLocal, monthlyBudget)
     - Choose when to use CursorAI (useCursorAIFor)
     - Configure CursorAI integration (useChat, useComposer)

**Method 2: Through settings.json**

```json
{
  // Autonomous Mode Settings (NEW!)
  "cursor-autonomous.autonomousMode": true,
  
  // Hybrid Model Provider (NEW!)
  "cursor-autonomous.hybridMode": {
    "enabled": true,
    "preferLocal": true,
    "monthlyBudget": 20
  },
  
  // CursorAI Integration (NEW!)
  "cursor-autonomous.useCursorAIFor": ["consolidation", "file-editing"],
  "cursor-autonomous.cursorIntegration": {
    "useChat": true,
    "useComposer": true,
    "autoApplyComposer": false
  },
  
  // Agent Configuration
  "cursor-autonomous.agents": {
    "backend": {
      "enabled": true,
      "provider": "ollama",
      "model": "codellama",
      "temperature": 0.7
    },
    "frontend": {
      "enabled": true,
      "provider": "ollama",
      "model": "mistral",
      "temperature": 0.7
    }
    // ... other agents
  },
  
  // General Settings
  "cursor-autonomous.enableVirtualUser": false,
  "cursor-autonomous.autoImprove": true,
  "cursor-autonomous.enableOrchestrator": true
}
```

### 3. Enable Autonomous Mode

**Method 1: Through Quick Menu**
1. Press `Ctrl+Shift+A`
2. Select "🤖 Enable Autonomous Mode"

**Method 2: Through Command Palette**
- `Ctrl+Shift+P` → "CursorAI Autonomous: Enable Autonomous Mode"

**Method 3: Through Status Bar**
- Click on `🤖 CursorAI` button in status bar

**What happens:**
- SwarmOrchestrator starts
- Agent workers initialize
- FileWatcher starts monitoring
- HealthMonitor starts tracking
- Status bar shows "Autonomous Mode Active" with green background

### 4. Create Tasks

**Method 1: Context Menu (NEW!)**
1. Right-click on file/folder in Explorer
2. Select "CursorAI Autonomous" submenu:
   - Create Task
   - Refactor (Extract Function/Class/Method/Component/Module)
   - Check Quality
   - Add Tests
   - Optimize Code

**Method 2: Quick Menu**
1. Press `Ctrl+Shift+A`
2. Select "➕ Create Task" or "➕ Create Prioritized Task" (NEW!)
3. Enter description
4. Select priority (immediate, high, medium, low)

**Method 3: Command**
- `Ctrl+Shift+P` → "CursorAI Autonomous: Create Task"

### 5. Monitor System

**Output Channel for Logging (NEW!):**
1. Press `Ctrl+Shift+U` (or `View > Output`)
2. Select "CursorAI Autonomous" from dropdown
3. View detailed orchestrator logs:
   - ✅ Orchestrator start/stop
   - 🚀 Task start with description and priority
   - 📊 Task execution progress
   - 🤖 Agent actions
   - 📝 List of changed files
   - ✅ Quality check results
   - ❌ Errors with details
   - ⏱️ Task execution time

**Status Bar:**
- `🤖 CursorAI ✓` (green) — Autonomous mode active
- `👤 Virtual User` — Toggle virtual user
- `📊 Status` — Open status panel

**Dashboard Panel (NEW!):**
1. Press `Ctrl+Shift+A` → "📊 Autonomous Stats"
2. View:
   - Cost statistics per model/agent
   - Agent activity (tasks completed, time spent)
   - System health (worker status, queue size)
   - Budget usage (daily, monthly)

**Status Panel:**
1. Press `Ctrl+Shift+S`
2. View all agents and their tasks

## 📖 Usage

### Working with Agents

#### Viewing Agent Status

**Sidebar (TreeView):**
1. Open CursorAI sidebar (🤖 icon)
2. Select "Agents"
3. Expand agent to view tasks

**Status Panel (WebView):**
1. Press `Ctrl+Shift+S`
2. View agent cards with details

#### Selecting Model for Agent

**Through Settings Panel:**
1. Press `Ctrl+Shift+A` → "⚙ Settings"
2. Go to "Agents" tab
3. For each agent:
   - Select provider (Ollama, OpenAI, Anthropic, Google, LLM Studio, CursorAI)
   - Select model
   - Set temperature

**Available providers:**
- `ollama` — Ollama (local, free)
- `llmstudio` — LLM Studio (local, free)
- `openai` — OpenAI (GPT-3.5, GPT-4)
- `anthropic` — Anthropic (Claude)
- `google` — Google (Gemini)
- `cursorai` — CursorAI (requires Pro plan)

### Working with Tasks

#### Task Priorities (NEW!)

- **immediate** — Interrupts current work, executes immediately
- **high** — Executes as soon as possible
- **medium** — Normal queue
- **low** — Executes when agents are idle

#### Creating Prioritized Task

1. Press `Ctrl+Shift+A`
2. Select "➕ Create Prioritized Task"
3. Enter description
4. Select priority
5. Task is added to queue with specified priority

#### Viewing Task Queue

**Dashboard Panel:**
- Shows tasks in queue grouped by priority
- Shows currently executing tasks
- Shows completed tasks

### Cost Management (NEW!)

#### Monitoring Costs

**Dashboard Panel:**
1. Press `Ctrl+Shift+A` → "📊 Autonomous Stats"
2. "Cost Statistics" section shows:
   - Total spent today/this month
   - Cost per model
   - Cost per agent
   - Budget usage percentage

#### Setting Budget

**Settings Panel:**
1. Go to "Autonomous Mode" tab
2. Set "Monthly Budget" (in USD)
3. System will:
   - Prefer free local models
   - Use cheap cloud APIs sparingly
   - Stop when budget is reached

#### Optimizing Costs

**Best practices:**
- ✅ Enable `preferLocal` in hybrid mode
- ✅ Set reasonable monthly budget ($10-30)
- ✅ Use CursorAI only for specific tasks
- ✅ Enable prompt caching (enabled by default)
- ✅ Monitor costs daily through dashboard

### Project Quality Check

**Launch check:**
- Command: `Cursor Autonomous: Run Quality Check`
- Context menu: Right-click on folder → "Check Quality"

**Check areas:**
- `full` — Full quality check
- `code` — Code quality check
- `architecture` — Architecture check
- `performance` — Performance check
- `security` — Security check

## 🏗️ Architecture

### Project Structure

```
CursorAI_Ext_Rules/
├── src/
│   ├── extension.ts                          # Entry point
│   ├── orchestrator/                         # Orchestrator
│   │   ├── orchestrator.ts                  # Main orchestrator
│   │   ├── orchestrator-logger.ts           # Output Channel logging (NEW!)
│   │   ├── self-learning-orchestrator.ts    # Self-learning
│   │   ├── swarm-orchestrator.ts           # Swarm coordination (NEW!)
│   │   ├── file-watcher.ts                  # Real-time monitoring (NEW!)
│   │   ├── autonomous-orchestrator-integration.ts  # Integration (NEW!)
│   │   ├── brainstorming-manager.ts         # Brainstorming
│   │   ├── solution-evaluator.ts            # Solution evaluation
│   │   ├── task-deviation-controller.ts     # Deviation control
│   │   ├── ensemble-refinement-manager.ts   # Ensemble refinement
│   │   ├── project-analyzer.ts              # Project analysis
│   │   └── ...
│   ├── agents/                               # Agents
│   │   ├── local-agent.ts                   # Base agent
│   │   ├── backend-agent.ts                 # Backend Developer
│   │   ├── frontend-agent.ts                # Frontend Developer
│   │   ├── architect-agent.ts               # Software Architect
│   │   ├── analyst-agent.ts                 # Data Analyst
│   │   ├── devops-agent.ts                  # DevOps Engineer
│   │   ├── qa-agent.ts                      # QA Engineer
│   │   ├── virtual-user.ts                  # Virtual user
│   │   ├── self-improver.ts                 # Self-improvement
│   │   └── worker/                          # Autonomous workers (NEW!)
│   │       ├── agent-worker.ts              # Agent worker
│   │       ├── task-queue.ts                # Task queue
│   │       ├── message-bus.ts               # Message bus
│   │       ├── mcp-client.ts                # MCP client
│   │       └── health-monitor.ts            # Health monitor
│   ├── integration/                          # Integration
│   │   ├── cursor-api.ts                    # CursorAI API
│   │   ├── cursor-chat-integration.ts       # Chat integration (NEW!)
│   │   ├── cursor-composer-integration.ts   # Composer integration (NEW!)
│   │   ├── model-provider.ts                # Model provider
│   │   ├── model-providers/                 # Model providers (NEW!)
│   │   │   ├── provider-manager.ts          # Provider manager
│   │   │   ├── hybrid-provider.ts           # Hybrid provider
│   │   │   ├── ollama-provider.ts           # Ollama
│   │   │   ├── openai-provider.ts           # OpenAI
│   │   │   ├── anthropic-provider.ts        # Anthropic
│   │   │   ├── google-provider.ts           # Google
│   │   │   └── cursorai-provider.ts         # CursorAI
│   │   ├── settings-manager.ts              # Settings manager
│   │   └── ui-integration.ts                # UI integration
│   ├── optimization/                         # Optimization (NEW!)
│   │   ├── model-selector.ts                # Smart model selector
│   │   ├── prompt-cache.ts                  # Prompt caching
│   │   ├── request-batcher.ts               # Request batching
│   │   └── cost-monitor.ts                  # Cost monitoring
│   ├── self-improvement/                     # Self-improvement
│   │   ├── performance-monitor.ts
│   │   ├── knowledge-searcher.ts
│   │   ├── rule-updater.ts
│   │   └── agent-optimizer.ts
│   ├── storage/                              # Storage
│   │   ├── rules-integration.ts
│   │   └── rules-versioning.ts
│   └── ui/                                   # UI
│       ├── agents-status-tree.ts            # TreeView
│       ├── status-panel.ts                  # Status panel
│       ├── settings-panel.ts                # Settings panel (updated)
│       ├── dashboard-panel.ts               # Dashboard (NEW!)
│       ├── context-menu-provider.ts         # Context menu (NEW!)
│       ├── analytics-panel.ts               # Analytics
│       └── quick-access-panel.ts            # Quick menu
├── package.json
├── tsconfig.json
├── README.md (English)
└── README_RU.md (Russian)
```

### System Components

#### SwarmOrchestrator (NEW!)

Coordinates autonomous agent workers:
- Creates and manages AgentWorker instances
- Distributes tasks from TaskQueue
- Monitors worker health
- Handles real-time file changes

#### AgentWorker (NEW!)

Autonomous agent running in infinite loop:
- Pulls tasks from TaskQueue
- Communicates via MessageBus
- Uses MCPClient for operations
- Reports health status
- Auto-restarts on failures

#### TaskQueue (NEW!)

Prioritized task queue:
- 4 priority levels (immediate, high, medium, low)
- Swarm coordination (agents negotiate task assignment)
- Thread-safe operations
- Task persistence

#### MessageBus (NEW!)

Peer-to-peer communication:
- Topic-based pub/sub
- Direct agent-to-agent messaging
- Event broadcasting
- Message history

#### HybridModelProvider (NEW!)

Intelligent model selection:
- Assesses task complexity
- Chooses optimal model (local, cheap cloud, expensive cloud)
- Respects monthly budget
- Automatic fallback
- Cost tracking

#### FileWatcher (NEW!)

Real-time project monitoring:
- Watches file changes
- Triggers automatic tasks
- Debouncing for efficiency
- Pattern filtering

#### HealthMonitor (NEW!)

Agent health tracking:
- Checks worker heartbeats
- Detects stuck agents
- Auto-restarts failed workers
- Reports system health

#### OrchestratorLogger (NEW!)

Centralized logging to Output Channel:
- Outputs detailed task execution progress
- Shows agent actions in real-time
- Displays list of changed files
- Logs quality check results
- Shows errors with details and stack traces
- Automatically opens Output panel when orchestrator starts
- Formatted messages with emojis for easy reading

#### MCPClient (NEW!)

Multi-Agent Communication Protocol:
- File operations (CRUD, search)
- Git operations (status, commit, branch, merge, stash, rebase)
- Code search (semantic, grep, references)
- Test runner integration
- Linter integration

## 🛠️ Development

### Requirements

- **Node.js** version 18 or higher
- **TypeScript** 5.0 or higher
- **VS Code** 1.80 or higher
- **CursorAI** (for testing)

### Installing Dependencies

```bash
npm install
```

### Compilation

```bash
npm run compile
```

Or for automatic recompilation:

```bash
npm run watch
```

### Build

```bash
npm run package
```

### Testing

```bash
npm test
```

### Running in Development Mode

1. Open the project in VS Code
2. Press `F5`
3. Extension Development Host window opens
4. Extension runs in debug mode

## 📚 Documentation

- [README.md](README.md) — Main documentation (English)
- [README_RU.md](README_RU.md) — Основная документация (Russian)
- [BUILD.md](BUILD.md) — Build instructions
- [INSTALL.md](INSTALL.md) — Installation instructions
- [QUICK_INSTALL.md](QUICK_INSTALL.md) — Quick installation
- [QUICK_ACCESS.md](QUICK_ACCESS.md) — Quick access guide
- [UI_FEATURES.md](UI_FEATURES.md) — UI features
- [IMPROVEMENTS.md](IMPROVEMENTS.md) — Integration improvements
- [CHANGELOG.md](CHANGELOG.md) — Change history

## 💰 Cost Comparison

### Scenario 1: Free ($0/month)
```json
{
  "hybridMode": {
    "enabled": true,
    "preferLocal": true,
    "monthlyBudget": 0
  },
  "useCursorAIFor": ["never"],
  "agents": {
    "backend": { "provider": "ollama", "model": "codellama" },
    "frontend": { "provider": "ollama", "model": "mistral" }
  }
}
```
**Result:** Fully functional with local models only

### Scenario 2: Budget ($5-10/month)
```json
{
  "hybridMode": {
    "enabled": true,
    "preferLocal": true,
    "monthlyBudget": 10
  },
  "useCursorAIFor": ["never"],
  "agents": {
    "backend": { "provider": "openai", "model": "gpt-3.5-turbo" },
    "frontend": { "provider": "ollama", "model": "mistral" }
  }
}
```
**Result:** Hybrid mode with cheap cloud APIs for complex tasks

### Scenario 3: Premium ($20-50/month)
```json
{
  "hybridMode": {
    "enabled": true,
    "preferLocal": false,
    "monthlyBudget": 50
  },
  "useCursorAIFor": ["consolidation", "file-editing"],
  "agents": {
    "backend": { "provider": "openai", "model": "gpt-4" },
    "frontend": { "provider": "anthropic", "model": "claude-3-opus" }
  }
}
```
**Result:** Best quality with top models + CursorAI integration

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. Open a **Pull Request**

### Development Rules

- Follow TypeScript/ESLint code style
- Add tests for new functionality
- Update documentation when changing API
- Write clear commit messages

## 📝 License

This project is distributed under the **MIT License**.

Full license text: [LICENSE](LICENSE)

## 🆘 Support

### Report an Issue

1. Check existing [Issues](https://github.com/Zeed80/CursorAI_Ext_Rules/issues)
2. Create a new Issue with detailed description

### Ask a Question

- Create a [Discussion](https://github.com/Zeed80/CursorAI_Ext_Rules/discussions)
- Or contact through Issues

### Troubleshooting

#### Viewing Orchestrator Logs

**Output Channel "CursorAI Autonomous":**
1. Press `Ctrl+Shift+U` (or `View > Output`)
2. Select "CursorAI Autonomous" from dropdown
3. Logs automatically open when orchestrator starts
4. View:
   - Task execution progress
   - Agent actions
   - Changed files
   - Errors with details

**Extension Host Logs (for debugging):**
1. View → Output → "Log (Extension Host)"
2. Shows technical details and errors

#### Extension Not Activating

1. Check logs: View → Output → "Log (Extension Host)"
2. Check Output Channel: View → Output → "CursorAI Autonomous"
3. Ensure dependencies are installed: `npm install`
4. Check compiled files in `out/` directory
5. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

#### Autonomous Mode Not Starting

1. Check settings: `cursor-autonomous.autonomousMode` should be `true`
2. Check if agents are configured in settings
3. For local models: ensure Ollama is running
4. Check logs for errors

#### "Local agent X not found"

1. Open Settings Panel: `Ctrl+Shift+A` → "⚙ Settings"
2. Go to "Agents" tab
3. Enable and configure all required agents
4. Ensure providers are installed (Ollama, API keys)

#### Ollama Connection Failed

1. Check Ollama is running: `ollama list`
2. Check Ollama server: `curl http://localhost:11434/api/tags`
3. Install models: `ollama pull codellama`
4. Restart extension: `Ctrl+Shift+P` → "Developer: Reload Window"

#### High API Costs

1. Enable `preferLocal` in hybrid mode
2. Lower `monthlyBudget`
3. Use cheaper models (gpt-3.5-turbo instead of gpt-4)
4. Disable CursorAI integration: `useCursorAIFor: ["never"]`
5. Monitor costs in Dashboard Panel

## 🎯 Roadmap

### Planned Features

- [ ] More LLM providers (Cohere, Mistral AI, Llama API)
- [ ] Enhanced swarm intelligence (voting, consensus)
- [ ] Cloud synchronization for rules and settings
- [ ] Team collaboration features
- [ ] Advanced cost analytics and predictions
- [ ] Automatic model fine-tuning on project data

### Known Limitations

- Some features may use fallback methods
- Internet connection required for cloud APIs and web search
- Local models may be slower than cloud APIs
- Autonomous mode consumes system resources

## 🙏 Acknowledgments

- [CursorAI](https://cursor.sh/) — excellent IDE
- [Ollama](https://ollama.ai/) — local LLM runner
- [VS Code Extension API](https://code.visualstudio.com/api) — powerful API
- All project contributors

## 📞 Contacts

- **GitHub**: [@Zeed80](https://github.com/Zeed80)
- **Issues**: [GitHub Issues](https://github.com/Zeed80/CursorAI_Ext_Rules/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Zeed80/CursorAI_Ext_Rules/discussions)

---

<div align="center">

[English](#-cursorai-autonomous-extension-english) | [Русский](README_RU.md)

**Made with ❤️ by the power of AI**

</div>
