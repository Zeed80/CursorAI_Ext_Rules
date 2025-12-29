# Release v0.2.0 - Brainstorming System

## 🎉 What's New

### 🧠 Brainstorming System with Multiple Models

This release introduces a powerful brainstorming system that uses multiple models to generate diverse solutions:

- **Task Variation Generator** - Creates different formulations of the same task for different agents, preserving the core intent
- **Deviation Controller** - Checks solution alignment with the original task in real-time
- **Ensemble Refinement Manager** - Coordinates refinement of solutions by multiple models
- **Smart Consolidation** - Prioritizes relevant solutions when merging
- **Alignment Monitoring** - Automatic checking of solutions for task deviation

### ✨ Improvements

- **BrainstormingManager**
  - Integration with task variation generator
  - Automatic generation of variations for each agent
  - Monitoring of solution alignment with the original task
  - Improved consolidation with relevance filtering
  - Automatic refinement when deviations are detected

- **SolutionEvaluator**
  - Added task alignment criterion (taskAlignment)
  - Integration with TaskDeviationController
  - Improved solution merging with prioritization of relevant ones
  - Filtering of solutions with low alignment when merging

- **SelfLearningOrchestrator**
  - Use of task variations in brainstorming
  - Monitoring and correction of deviations
  - Ensemble solution refinement
  - New methods: `executeTaskWithVariations` and `monitorAndCorrect`

### 📚 Documentation

- Added "Usage-based Pricing" section with detailed explanation of CursorAI requirements
- Description of Background Agents API troubleshooting
- Instructions for configuring Usage-based pricing
- Explanation of OTLPExporterError errors
- **Full English translation** - README.md is now in English, with README_RU.md for Russian

### 🐛 Bug Fixes

- Fixed compilation error in `ensemble-refinement-manager.ts` (task-alignment → taskAlignment)
- Fixed typo: "модгового" → "мозгового" (brainstorming)

## 📦 Installation

Download the `.vsix` file and install it in CursorAI:

1. Open CursorAI
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS)
3. Drag the `.vsix` file into the CursorAI window
4. Done!

## ⚠️ Important Notes

- **Usage-based pricing required**: Background Agents API requires Usage-based pricing to be enabled in Cursor Dashboard
- **Set a Spend Limit**: Recommended to start with $5-10 and monitor expenses
- **Research project**: This extension is created for research purposes

## 🔗 Links

- [Full Changelog](CHANGELOG.md)
- [English Documentation](README.md)
- [Russian Documentation](README_RU.md)
