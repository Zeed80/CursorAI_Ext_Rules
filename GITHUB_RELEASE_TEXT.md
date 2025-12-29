# GitHub Release Text for v0.2.0

## 📋 Готовый текст для описания релиза

Скопируйте этот текст при создании релиза на GitHub:

---

# v0.2.0 - Brainstorming System

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

1. Download `cursor-ai-autonomous-extension-0.2.0.vsix` from the assets below
2. Open CursorAI
3. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS)
4. Drag the `.vsix` file into the CursorAI window
5. Done!

## ⚠️ Important Notes

- **Usage-based pricing required**: Background Agents API requires Usage-based pricing to be enabled in Cursor Dashboard
- **Set a Spend Limit**: Recommended to start with $5-10 and monitor expenses
- **Research project**: This extension is created for research purposes

## 🔗 Links

- [Full Changelog](https://github.com/Zeed80/CursorAI_Ext_Rules/blob/main/CHANGELOG.md)
- [English Documentation](https://github.com/Zeed80/CursorAI_Ext_Rules/blob/main/README.md)
- [Russian Documentation](https://github.com/Zeed80/CursorAI_Ext_Rules/blob/main/README_RU.md)

---

## 📝 Инструкция по созданию релиза

1. Перейдите на: https://github.com/Zeed80/CursorAI_Ext_Rules/releases/new
2. Заполните:
   - **Tag:** `v0.2.0` (создайте новый тег)
   - **Title:** `v0.2.0 - Brainstorming System`
   - **Description:** Скопируйте текст выше
3. Загрузите файл:
   - Перетащите `cursor-ai-autonomous-extension-0.2.0.vsix` в область "Attach binaries"
4. Нажмите **"Publish release"**

## ✅ Файл готов

**Файл:** `cursor-ai-autonomous-extension-0.2.0.vsix`  
**Размер:** 553.61 KB  
**Расположение:** корень проекта
