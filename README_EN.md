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

### 🧠 Brainstorming System (v0.2.0)

**New features in version 0.2.0:**

- **Task variation generator** — creates different formulations of one task for different agents, preserving the essence
- **Deviation controller** — checks solution alignment with the original task in real-time
- **Ensemble refinement** — multiple models propose improvements, then consolidated into a final solution
- **Smart consolidation** — prioritization of relevant solutions when merging
- **Alignment monitoring** — automatic checking of solutions for task deviation

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

### Method 2: Automatic installation

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

Without this, Background Agents will not work.

### 1. Extension Activation

After installation, the extension activates automatically when opening a project. The orchestrator starts automatically a few seconds after activation.

### 2. Extension Interface

The extension provides several ways to interact:

- **Sidebar "Agents" (TreeView)** — Left sidebar → 🤖 CursorAI icon → "Agents"
- **Status Bar** — Bottom right with quick access buttons
- **Status Panel (WebView)** — Detailed agent information (`Ctrl+Shift+S`)
- **Quick Menu (QuickPick)** — Quick access to all commands (`Ctrl+Shift+A`)
- **Analytics Panel** — Task execution statistics

### 3. Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) | Quick menu |
| `Ctrl+Shift+V` (Mac: `Cmd+Shift+V`) | Toggle virtual user |
| `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`) | Agent status panel |
| `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) | Analyze project |

## 📖 Usage

### Working with Agents

- View agent status in the sidebar or status panel
- Select a language model for each agent
- View agent details and tasks
- Send tasks to CursorAI chat

### Working with Tasks

- Create tasks via quick menu or command
- Tasks automatically trigger brainstorming with variations
- View tasks in the sidebar or status panel
- Send tasks to chat for execution

## ⚠️ Important: Usage-based Pricing

### Problem: "Usage-based pricing required"

If you see errors like:

```
HTTP error! status: 400: Usage-based pricing required. 
Background Agent requires at least $2 remaining until your hard limit.
```

**This is not an extension or Cursor error.** This is a CursorAI requirement for Background Agents API.

### How to Fix

1. **Open Cursor Dashboard** (team settings in Cursor)
2. **Find the "Usage-based pricing" section**
3. **Enable this option**
4. **Set Spend Limit to at least $2** (or more, as desired)
5. **Link a payment card** (if required)
6. **Reload CursorAI**

After this, agents should initialize successfully.

**⚠️ IMPORTANT: Set a reasonable Spend Limit!**

It's recommended to start with a minimum limit ($5-10) and increase it gradually while monitoring expenses. When actively using the extension, especially in autonomous mode, expenses can significantly exceed the set limit.

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

## 📞 Contacts

- **GitHub**: [@Zeed80](https://github.com/Zeed80)
- **Issues**: [GitHub Issues](https://github.com/Zeed80/CursorAI_Ext_Rules/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Zeed80/CursorAI_Ext_Rules/discussions)

---

<div align="center">

[English](#-cursorai-autonomous-extension-english) | [Русский](README.md)

</div>

---

**For detailed documentation in Russian, see [README.md](README.md)**
