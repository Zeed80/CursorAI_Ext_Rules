# 🤖 CursorAI Autonomous Extension

<div align="right">

[English](#-cursorai-autonomous-extension-english) | [Русский](README.md)

</div>

> ## ⚠️ **IMPORTANT RISK WARNING** ⚠️
> 
> ### **Research Project**
> 
> This project was created for **research purposes** to explore CursorAI capabilities and demonstrate the potential of AI-assisted development. The project was created **100% automatically** in CursorAI.
> 
> ### **Usage Risks**
> 
> ⚠️ **WARNING: Using this extension carries a risk of significantly exceeding CursorAI limits and unexpected financial expenses.**
> 
> The extension uses CursorAI's **Background Agents API**, which operates on **Usage-based pricing** (pay-per-token). When actively using the extension, especially in autonomous mode with a virtual user, the following may occur:
> 
> - **Exceeding set spending limits** (Spend Limit)
> - **Accumulating significant expenses** for API usage
> - **Automatic charges** to your linked payment card
> - **Unexpected expenses** when multiple agents work simultaneously
> 
> **Recommendations:**
> 
> - Set a **strict Spend Limit** in Cursor settings (recommended to start with a minimum value)
> - Regularly **monitor expenses** in Cursor Dashboard
> - **Disable the virtual user** and autonomous mode when not needed
> - Use the extension **consciously** and control its operation
> - **Do not leave the extension in autonomous mode** unattended for extended periods
> 
> Use the extension **at your own risk**. The project authors are not responsible for financial losses associated with using the extension.

---

<div align="center">

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/Zeed80/CursorAI_Ext_Rules)
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

**CursorAI Autonomous Extension** — an extension for CursorAI that transforms your IDE into a fully autonomous development system. The extension automatically adapts rules to your project, coordinates specialized AI agents, and continuously self-improves, ensuring high code quality even when using weak language models.

### 🎯 Core Idea

Even the weakest coding model can write better code than top models if it:
- ✅ Uses deep code analysis before writing
- ✅ Checks syntax via MCP Context7
- ✅ Verifies facts via web search
- ✅ Follows adaptive project rules
- ✅ Coordinates specialized agents

## ✨ Features

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
- **Brainstorming with task variations** — creates different formulations of one task for different agents
- **Deviation control** — checks solution alignment with the original task
- **Ensemble refinement** — multiple models propose solution improvements

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

### 🧠 Brainstorming System (v0.2.0)

**New features in version 0.2.0:**

- **Task variation generator** — creates different formulations of one task for different agents, preserving the essence
- **Deviation controller** — checks solution alignment with the original task in real-time
- **Ensemble refinement** — multiple models propose improvements, then consolidated into a final solution
- **Smart consolidation** — prioritization of relevant solutions when merging
- **Alignment monitoring** — automatic checking of solutions for task deviation

### 🎨 Modern UI

- **Agent status panel** — TreeView with real-time updates
- **WebView panel** — detailed system information
- **Quick menu** — quick access to all tools
- **Status bar** — system state indicators
- **Analytics** — task execution statistics

## 🚀 Installation

### Method 1: Drag and drop .vsix file ⭐ (Simplest)

1. Build the extension:
   ```bash
   npm run build
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
   npm run build
   ```

4. Install the built .vsix file in CursorAI:
   ```bash
   code --install-extension cursor-ai-autonomous-extension-0.2.0.vsix
   ```

📖 More details: [BUILD.md](BUILD.md)

## ⚡ Quick Start

### 0. ⚠️ Critical: Setup and Security

**Before using the extension, you MUST:**

1. ✅ Set a **strict Spend Limit** in Cursor settings (recommended to start with $5-10)
2. ✅ Enable **Usage-based pricing** in Cursor settings
3. ✅ Link a payment card (if required)
4. ✅ **Configure notifications** about spending in Cursor Dashboard
5. ✅ Regularly **check expenses** when using the extension

**⚠️ Security usage:**

- **DO NOT leave** the extension in autonomous mode unattended
- **Disable the virtual user** when not needed
- **Monitor expenses** in real-time via Cursor Dashboard
- **Set reasonable limits** for expenses

Without this, Background Agents will not work. See more in the [Usage-based Pricing](#-important-information-usage-based-pricing) section.

### 1. Extension Activation

After installation, the extension activates automatically when opening a project. The orchestrator starts automatically a few seconds after activation.

### 2. Extension Interface

The extension provides several ways to interact:

#### Sidebar "Agents" (TreeView)

**Location**: Left sidebar → 🤖 CursorAI icon → "Agents"

**Shows:**
- All system agents with their statuses
- Current tasks for each agent (expand on click)
- Statistics: tasks in progress and completed
- Status indicators: Working, Idle, Error, Disabled

**Actions:**
- **Click on agent** → expand list of its tasks
- **Click on task** → view task details
- **Right-click on agent** → context menu:
  - "Show agent details"
  - "Select model for agent"
- **Right-click on task** → "Send to chat"

**Auto-update**: every 3 seconds

#### Status Bar (bottom right)

**Buttons in status bar:**

1. **🤖 CursorAI** — Quick menu (Ctrl+Shift+A)
   - Status indicators:
     - `🤖 CursorAI ✓` (green background) — Autonomous mode active
     - `🤖 CursorAI` — Orchestrator running
     - `🤖 CursorAI ⊘` — Orchestrator stopped

2. **👤 Virtual User** — Toggle virtual user (Ctrl+Shift+V)

3. **🔍 Analyze** — Quick project analysis (Ctrl+Shift+P)

4. **📊 Status** — Agent status panel (Ctrl+Shift+S)

#### Status Panel (WebView)

**Opening:**
- Command: `Cursor Autonomous: Show Status Panel`
- Hotkey: `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`)
- Status bar button: `📊 Status`

**Features:**
- Overall system statistics (active agents, tasks in progress, completed)
- Cards for all agents with detailed information:
  - Status and current task
  - Execution statistics
  - Agent thoughts (if available)
  - Model selection for agent (dropdown)
  - "Send to chat" button for tasks
- Auto-update every 5 seconds
- Manual refresh button
- Click on agent card → view details

#### Quick Menu (QuickPick)

**Opening:**
- Hotkey: `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`)
- Click on `🤖 CursorAI` button in status bar

**Available actions:**
- ▶ Start orchestrator
- ⏹ Stop orchestrator
- 👤 Enable virtual user
- 👤 Disable virtual user
- 🔍 Analyze project
- ➕ Create task
- ℹ System status
- 📊 Status panel
- 📈 Task analytics
- ⚙ Settings

#### Analytics Panel

**Opening:**
- Command: `Cursor Autonomous: Show Task Analytics`
- Hotkey: `Ctrl+Shift+A` → "Task Analytics"

**Features:**
- Statistics by task types
- Statistics by agents
- Performance metrics
- Improvement recommendations
- Report export

### 3. Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) | Quick menu |
| `Ctrl+Shift+V` (Mac: `Cmd+Shift+V`) | Toggle virtual user |
| `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`) | Agent status panel |
| `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) | Analyze project |

### 4. Working with Agents

#### Viewing Agent Status

**Method 1: Sidebar**
1. Open CursorAI sidebar (🤖 icon on the left)
2. Select "Agents"
3. Expand an agent to view its tasks

**Method 2: Status Panel**
1. Press `Ctrl+Shift+S` or click the `📊 Status` button in the status bar
2. View cards for all agents
3. Click on an agent card to view details

#### Selecting Model for Agent

**Method 1: Through Status Panel**
1. Open status panel (`Ctrl+Shift+S`)
2. Find the needed agent
3. Select model from dropdown list

**Method 2: Through Context Menu**
1. Right-click on agent in sidebar
2. Select "Select model for agent"
3. Select model from list

**Method 3: Through Command**
1. Command: `Cursor Autonomous: Select Model for Agent`
2. Select agent
3. Select model

#### Viewing Agent Details

**Method 1: Through Status Panel**
- Click on agent card in status panel

**Method 2: Through Context Menu**
- Right-click on agent → "Show agent details"

**Method 3: Through Command**
- Command: `Cursor Autonomous: Show Agent Details`

**Information in details:**
- Agent name and status
- Number of tasks in progress and completed
- Current task (if any)
- Selected model
- List of all agent tasks

### 5. Working with Tasks

#### Creating Task

**Method 1: Quick Menu**
1. Press `Ctrl+Shift+A`
2. Select "➕ Create task"
3. Select task type (feature, bug, improvement, refactoring, documentation, quality-check)
4. Enter description
5. Select priority (high, medium, low)

**Method 2: Command**
- Command: `Cursor Autonomous: Create Task`

**What happens:**
- Task is created automatically
- Brainstorming with task variations starts
- Agents work in parallel on the task
- Solutions are consolidated and the best is selected
- Ensemble refinement is launched if necessary

#### Viewing Tasks

**Method 1: Sidebar**
- Expand agent in sidebar → see all its tasks

**Method 2: Status Panel**
- Open status panel → each agent's card shows its tasks

#### Sending Task to Chat

**Method 1: Context Menu**
- Right-click on task in sidebar → "Send to chat"

**Method 2: Status Panel**
- Click "Send to chat" button in agent card

**What happens:**
- Task is formatted and copied to clipboard
- CursorAI chat opens (if possible)
- You can paste the task into chat (Ctrl+V)

### 6. Automatic Functions

#### Auto-start Orchestrator

The orchestrator automatically starts when the extension is activated (after a few seconds).

#### Auto-update Statuses

- **Sidebar**: every 3 seconds
- **Status panel**: every 5 seconds
- **Status bar**: every 5 seconds

#### Automatic Project Analysis

On first launch, the extension may automatically analyze the project (if enabled in settings).

## 📖 Usage

### Project Analysis

The extension can automatically analyze the project on first launch or on request:

**What is analyzed:**
1. Project type (web application, mobile, desktop, library)
2. Technologies (languages, frameworks, databases)
3. Architecture (MVC, Clean Architecture, Component-based)
4. Code style (PSR-12, ESLint, Prettier, PEP 8)
5. Patterns and dependencies
6. Generation of adaptive rules

**Launch analysis:**
- Hotkey: `Ctrl+Shift+P`
- Status bar button: `🔍 Analyze`
- Quick menu: `Ctrl+Shift+A` → "🔍 Analyze project"
- Command: `Cursor Autonomous: Analyze Project`

### Working with Agents

#### Viewing Agent Status

**Sidebar (TreeView):**
1. Open CursorAI sidebar (🤖 icon on the left)
2. Select "Agents"
3. Expand an agent to view its tasks
4. Click on a task to view details

**Status Panel (WebView):**
1. Press `Ctrl+Shift+S` or click the `📊 Status` button in the status bar
2. View overall system statistics
3. View cards for all agents
4. Click on an agent card to view details

#### Selecting Model for Agent

Each agent can use its own CursorAI language model:

**Ways to select:**
1. **Through status panel**: select model from dropdown in agent card
2. **Through context menu**: right-click on agent → "Select model for agent"
3. **Through command**: `Cursor Autonomous: Select Model for Agent`

**Available models:**
- Automatic selection (CursorAI selects optimal model)
- List of all available CursorAI models (excluding paid ones)

#### Viewing Agent Details

**Information in details:**
- Agent name and status
- Number of tasks in progress and completed
- Current task (if any)
- Selected language model
- List of all agent tasks
- Agent thoughts (if available)
- Diagnostic information (LLM available, errors)

**Ways to view:**
- Click on agent card in status panel
- Right-click on agent → "Show agent details"
- Command: `Cursor Autonomous: Show Agent Details`

### Working with Tasks

#### Creating Task

**Creation process:**
1. Open quick menu (`Ctrl+Shift+A`) → "➕ Create task"
2. Select task type:
   - `feature` — New feature
   - `bug` — Bug fix
   - `improvement` — Improvement
   - `refactoring` — Refactoring
   - `documentation` — Documentation
   - `quality-check` — Project quality check
3. Enter task description
4. Select priority (high, medium, low)

**What happens after creation:**
- Task is automatically assigned to a suitable agent
- **Brainstorming with task variations** starts:
  - Task variations are created for different agents
  - Each agent receives its own task formulation
  - Agents work in parallel
  - Solutions are checked for alignment with the original task
  - Best solution is selected
  - Ensemble refinement is launched if necessary
- Task is executed automatically

#### Viewing Tasks

**Sidebar:**
- Expand agent → see all its tasks
- Tasks are shown with status icons:
  - ⏳ pending — Waiting for execution
  - 🔄 in-progress — In progress
  - ✅ completed — Completed
  - ⚠️ blocked — Blocked

**Status Panel:**
- Each agent's card shows its tasks
- You can click on a task to view details

#### Sending Task to CursorAI Chat

**Ways:**
1. Right-click on task in sidebar → "Send to chat"
2. "Send to chat" button in agent card in status panel
3. Command: `Cursor Autonomous: Send Task to Chat`

**What happens:**
- Task is formatted in a chat-friendly format
- Message is copied to clipboard
- CursorAI chat opens (if possible)
- You can paste the task into chat (Ctrl+V or Cmd+V)

### Project Quality Check

**Launch check:**
- Command: `Cursor Autonomous: Run Quality Check`
- Quick menu: `Ctrl+Shift+A` → "Quality check"

**Check areas:**
- `full` — Full quality check
- `code` — Code quality check
- `architecture` — Architecture check
- `performance` — Performance check
- `security` — Security check

**Results:**
- Saved in quality check task
- Can be viewed in status panel
- Include improvement recommendations

### Analytics and Metrics

**Opening analytics panel:**
- Command: `Cursor Autonomous: Show Task Analytics`
- Quick menu: `Ctrl+Shift+A` → "📈 Task Analytics"

**Available information:**
- Statistics by task types
- Statistics by agents
- Performance metrics
- Average task execution time
- Percentage of successful tasks
- Improvement recommendations
- Report export

### Configuration

#### Opening Settings

**Method 1: Through Quick Menu**
- `Ctrl+Shift+A` → "⚙ Settings"

**Method 2: Through Command Palette**
- `Ctrl+Shift+P` → "Preferences: Open Settings (UI)"
- Find "Cursor Autonomous"

**Method 3: Through settings.json**
- `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"

#### Main Settings

```json
{
  "cursor-autonomous.apiKey": "",
  "cursor-autonomous.enableVirtualUser": false,
  "cursor-autonomous.autoImprove": true,
  "cursor-autonomous.enableOrchestrator": true,
  "cursor-autonomous.monitoringInterval": 300000,
  "cursor-autonomous.improvementInterval": 86400000,
  "cursor-autonomous.virtualUserDecisionThreshold": 0.7
}
```

#### Settings Description

- **`apiKey`** — CursorAI API key for accessing Background Agents API (optional, can be obtained in Cursor team settings)
- **`enableVirtualUser`** — enable virtual user (autonomous mode)
- **`autoImprove`** — enable automatic self-improvement
- **`enableOrchestrator`** — enable orchestrator in agent selector
- **`monitoringInterval`** — project monitoring interval in milliseconds (default 5 minutes = 300000)
- **`improvementInterval`** — self-improvement interval in milliseconds (default 24 hours = 86400000)
- **`virtualUserDecisionThreshold`** — confidence threshold for virtual user decisions (0-1, default 0.7)

#### Configuring Models for Agents

Each agent can use its own model. Configuration is done through UI:
- Status panel → select model from dropdown
- Or through agent context menu → "Select model for agent"

Models are automatically saved in extension settings.

## 🏗️ Architecture

### Project Structure

```
CursorAI_Ext_Rules/
├── src/
│   ├── extension.ts              # Entry point
│   ├── orchestrator/             # Orchestrator
│   │   ├── orchestrator.ts      # Main orchestrator
│   │   ├── self-learning-orchestrator.ts  # Self-learning orchestrator
│   │   ├── project-analyzer.ts  # Project analyzer
│   │   ├── rule-generator.ts    # Rule generator
│   │   ├── task-planner.ts      # Task planner
│   │   ├── task-executor.ts     # Task executor
│   │   └── ...
│   ├── agents/                   # Agents
│   │   ├── backend-agent.ts     # Backend Developer
│   │   ├── frontend-agent.ts    # Frontend Developer
│   │   ├── architect-agent.ts   # Software Architect
│   │   ├── analyst-agent.ts     # Data Analyst
│   │   ├── devops-agent.ts      # DevOps Engineer
│   │   ├── qa-agent.ts         # QA Engineer
│   │   ├── virtual-user.ts      # Virtual user
│   │   └── self-improver.ts     # Self-improvement system
│   ├── self-improvement/         # Self-improvement system
│   │   ├── performance-monitor.ts
│   │   ├── knowledge-searcher.ts
│   │   ├── rule-updater.ts
│   │   └── agent-optimizer.ts
│   ├── integration/             # CursorAI integration
│   │   ├── cursor-api.ts        # CursorAI API
│   │   ├── settings-manager.ts  # Settings manager
│   │   └── ui-integration.ts    # UI integration
│   ├── storage/                  # Data storage
│   │   ├── rules-integration.ts # Rules integration
│   │   └── rules-versioning.ts   # Rules versioning
│   └── ui/                       # UI components
│       ├── agents-status-tree.ts # TreeView agent status
│       ├── status-panel.ts       # WebView status panel
│       ├── analytics-panel.ts    # Analytics panel
│       └── quick-access-panel.ts # Quick menu
├── package.json
├── tsconfig.json
└── README.md
```

### System Components

#### Orchestrator

Coordinates work of all agents:
- Analyzes user requests
- Selects suitable agents
- Manages tasks and priorities
- Checks solution quality

#### Agents

Specialized AI agents for different development areas:
- Each agent has its own specialization
- Agents can consult with each other
- Agents work through CursorAI API or fallback methods

#### Self-Improvement System

Continuously improves work quality:
- Monitors performance
- Searches for best practices
- Updates rules
- Optimizes agents

#### Rules Integration

Automatically adapts rules to the project:
- Analyzes project
- Generates rules
- Updates rules when project changes
- Versions rules

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

Or for automatic recompilation on changes:

```bash
npm run watch
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

### Running in Development Mode

1. Open the project in VS Code
2. Press `F5` to run the extension in development mode
3. A new "Extension Development Host" window will open
4. In this window, the extension will work in debug mode

### Viewing Logs

Extension logs can be viewed in:
- **Output panel** → select "Log (Extension Host)"
- **Developer Tools** → `Help → Toggle Developer Tools`

## 📚 Documentation

- [README.md](README.md) — Main documentation
- [BUILD.md](BUILD.md) — Build instructions
- [INSTALL.md](INSTALL.md) — Installation instructions
- [QUICK_INSTALL.md](QUICK_INSTALL.md) — Quick installation
- [QUICK_ACCESS.md](QUICK_ACCESS.md) — Quick access
- [UI_FEATURES.md](UI_FEATURES.md) — UI features description
- [IMPROVEMENTS.md](IMPROVEMENTS.md) — Integration improvements
- [CHANGELOG.md](CHANGELOG.md) — Change history

## 🤝 Contributing

We welcome contributions to the project! Please follow these steps:

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. Open a **Pull Request**

### Development Rules

- Follow the project code style (TypeScript, ESLint)
- Add tests for new functionality
- Update documentation when changing API
- Write clear commit messages

## 📝 License

This project is distributed under the **MIT License** - a fully free license that allows:

- ✅ **Commercial use** - can be used in commercial projects
- ✅ **Modification** - can modify code as needed
- ✅ **Distribution** - can distribute source and compiled code
- ✅ **Private use** - can be used in closed projects
- ✅ **Patent use** - can use any patents of the authors
- ✅ **Sublicensing** - can release under another license

**Only requirement:** include the license text and copyright notice when distributing.

Full license text: [LICENSE](LICENSE)

## 🆘 Support

### Report an Issue

If you found a bug or have a suggestion, please:
1. Check existing [Issues](https://github.com/Zeed80/CursorAI_Ext_Rules/issues)
2. Create a new Issue with detailed problem description

### Ask a Question

For questions and discussions:
- Create a [Discussion](https://github.com/Zeed80/CursorAI_Ext_Rules/discussions)
- Or contact us through Issues

### Troubleshooting

#### Extension Not Activating

1. Check logs in Output panel (View → Output → select "Log (Extension Host)")
2. Make sure all dependencies are installed (`npm install`)
3. Check that files are compiled in the `out/` directory
4. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

#### Orchestrator Not Starting

1. Check extension settings: `cursor-autonomous.enableOrchestrator` should be `true`
2. Check logs in Output panel for errors
3. Make sure Usage-based pricing is enabled in Cursor (see section above)
4. Restart CursorAI

#### Virtual User Not Working

1. Check settings: `cursor-autonomous.enableVirtualUser` should be `true`
2. Check confidence threshold: `cursor-autonomous.virtualUserDecisionThreshold`
3. Check logs for details
4. Make sure orchestrator is running

#### Agents Not Displaying in Sidebar

1. Make sure sidebar is open (🤖 icon on the left)
2. Expand "Agents" section
3. Press `Ctrl+Shift+A` → "Refresh agent status"
4. Reload window if problem persists

#### Status Panel Not Opening

1. Check that extension is activated (icon in status bar is visible)
2. Try opening through command: `Ctrl+Shift+P` → "Cursor Autonomous: Show Status Panel"
3. Check logs for errors

#### Models Not Selecting for Agents

1. Make sure Usage-based pricing is enabled
2. Check that CursorAI API is available
3. Try updating model list: reload window
4. Check logs for API errors

#### Tasks Not Creating

1. Make sure orchestrator is running
2. Check logs for errors
3. Make sure agents are initialized (check in status panel)
4. Try creating task through command: `Ctrl+Shift+P` → "Cursor Autonomous: Create Task"

## 🎯 Roadmap

### Planned Features

- [ ] Support for more programming languages
- [ ] Integration with additional MCP servers
- [ ] Improved agent work visualization
- [ ] Rules export/import
- [ ] Cloud rules synchronization
- [ ] Team collaboration support
- [ ] Extended analytics

### Known Limitations and Risks

- CursorAI Background Agents API is in beta
- Some features may work through fallback methods
- Active internet connection required for web search
- **Usage-based pricing in Cursor required for Background Agents to work** (see section below)
- **High risk of exceeding spending limits** with active use
- **Unexpected financial expenses possible** when working in autonomous mode

## ⚠️ Important Information: Usage-based Pricing

### Problem: "Usage-based pricing required"

If you see errors like:

```
HTTP error! status: 400: Usage-based pricing required. 
Background Agent requires at least $2 remaining until your hard limit.
```

or

```
Failed to create v0 agent for devops
Failed to create v0 agent for qa
```

**This is not an extension or Cursor error.** This is a CursorAI requirement for Background Agents API.

### What This Means

The extension uses CursorAI's **Background Agents API** to create specialized agents (Backend, Frontend, Architect, Analyst, DevOps, QA). These agents require:

1. **Usage-based pricing option enabled** in Cursor settings
2. **Spend Limit (spending limit) set** to at least $2

This is a "safety cushion" that allows agents to use tokens beyond your subscription, but not more than the specified amount.

### How to Fix

1. **Open Cursor Dashboard** (team settings in Cursor)
2. **Find the "Usage-based pricing" section**
3. **Enable this option**
4. **Set Spend Limit to at least $2** (or more, as desired)
5. **Link a payment card** (if required)
6. **Reload CursorAI**

After this, agents should initialize successfully.

### Additional Error: OTLPExporterError

If you see an error:

```
OTLPExporterError: Bad Request ... Trace spans collection is not enabled for this user
```

**This error can be ignored.** This is a telemetry error - Cursor tries to send debug data to the server, but for your account, collection of this data is disabled. This does not affect the editor or extension functionality.

### Summary

**Your problem is not in the code or a Cursor breakdown.** You are trying to use "autonomous mode" functions (through the cursor-autonomous extension), which require direct payment for tokens (API usage).

**To make it work:**
- You need to link a card in Cursor dashboard
- Allow charges beyond subscription for at least $2 per month
- After this, reload the editor, and agents should initialize successfully

**⚠️ IMPORTANT: Set a reasonable Spend Limit!**

It's recommended to start with a minimum limit ($5-10) and increase it gradually while monitoring expenses. When actively using the extension, especially in autonomous mode, expenses can significantly exceed the set limit.

### Alternative

If you don't want to enable Usage-based pricing, the extension will work in limited mode:
- Basic orchestrator functions will be available
- Background Agents will not be created
- Some features may use fallback methods

### Risk Management

To minimize financial loss risks:

1. **Set a strict Spend Limit** - start with a minimum value ($5-10)
2. **Enable notifications** about spending in Cursor Dashboard
3. **Regularly check expenses** - at least once a day with active use
4. **Disable autonomous mode** when not needed
5. **Use the extension consciously** - don't leave it running unattended
6. **Monitor agent activity** through the extension status panel

## 🙏 Acknowledgments

- [CursorAI](https://cursor.sh/) — for excellent IDE
- [VS Code Extension API](https://code.visualstudio.com/api) — for powerful API
- All project contributors

## 📞 Contacts

- **GitHub**: [@Zeed80](https://github.com/Zeed80)
- **Issues**: [GitHub Issues](https://github.com/Zeed80/CursorAI_Ext_Rules/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Zeed80/CursorAI_Ext_Rules/discussions)

---

<div align="center">

[English](#-cursorai-autonomous-extension-english) | [Русский](README.md)

</div>
