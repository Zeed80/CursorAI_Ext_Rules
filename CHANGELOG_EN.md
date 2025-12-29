# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-12-29

### Added
- **Brainstorming system with multiple models**
  - Task variation generator (`TaskVariationGenerator`) - creates different formulations of one task for different agents
  - Task deviation controller (`TaskDeviationController`) - checks solution alignment with the original task
  - Ensemble refinement manager (`EnsembleRefinementManager`) - coordinates refinement of solutions by multiple models
  - Improved solution consolidation with prioritization of relevant ones
  - Real-time monitoring of solution alignment with the original task

### Improved
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

### Documentation
- Added "Usage-based Pricing" section in README with detailed explanation of CursorAI requirements
- Description of Background Agents API troubleshooting
- Instructions for configuring Usage-based pricing
- Explanation of OTLPExporterError errors

### Fixed
- Fixed compilation error in `ensemble-refinement-manager.ts` (task-alignment → taskAlignment)

## [0.1.0] - 2024-12-XX

### Added
- Autonomous extension for CursorAI with virtual user
- Agent self-improvement system
- Orchestrator for coordinating specialized agents
- Adaptive rules automatically generated for the project
- Integration with MCP Context7 and web search
- Modern UI with status and analytics panels
- Automatic GitHub publishing script

### Changed
- Initial project version

### Fixed
- Initial project version
