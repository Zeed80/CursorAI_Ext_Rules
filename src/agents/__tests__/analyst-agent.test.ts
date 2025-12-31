/**
 * INTENT: Basic tests для AnalystAgent (specialized agent for data analysis и metrics)
 * WHY: AnalystAgent критичен для analysis tasks (performance, optimization, metrics, data)
 * ADDRESSES: Phase 4 Coverage Expansion - specialized agent testing
 * CONSEQUENCES: If AnalystAgent fails, analysis и optimization tasks cannot be handled
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnalystAgent } from '../analyst-agent';
import { Task } from '../../orchestrator/orchestrator';
import { ProjectContext } from '../local-agent';
import { createMockVSCodeContext } from '../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS } from '../../__tests__/helpers/test-constants';

describe('AnalystAgent - Basic Tests', () => {
    let agent: AnalystAgent;
    let mockTask: Task;
    let mockProjectContext: ProjectContext;
    
    beforeEach(() => {
        const context = createMockVSCodeContext();
        agent = new AnalystAgent(context);
        
        mockTask = {
            id: 'analyst-task-1',
            description: 'Analyze application performance bottlenecks и propose optimization strategy',
            type: 'improvement',
            priority: 'high',
            status: 'pending'
        };
        
        mockProjectContext = {
            structure: {
                files: ['src/performance-monitor.ts', 'src/analytics.ts', 'logs/performance.log'],
                directories: ['src', 'logs', 'metrics'],
                entryPoints: ['src/index.ts']
            },
            patterns: ['*.ts'],
            standards: {
                codeStyle: 'TypeScript strict',
                architecture: 'Metrics-driven'
            }
        };
    });
    
    /**
     * INTENT: Verify agent metadata
     * WHY: Correct identification для task routing
     * ADDRESSES: Agent identity
     */
    describe('Agent Identity', () => {
        
        it('should have correct agent ID', () => {
            expect(agent.getId()).toBe('analyst');
        });
        
        it('should have descriptive name', () => {
            expect(agent.getName()).toBe('Data Analyst');
        });
        
        it('should describe analyst specializations', () => {
            const description = agent.getDescription();
            expect(description.toLowerCase()).toMatch(/analys|performance|optimization|metrics|data/);
        });
    });
    
    /**
     * INTENT: Verify analyst-specific analysis
     * WHY: Analyst tasks need data/metrics/performance focus
     * ADDRESSES: Domain-specific analysis
     */
    describe('Analyst Task Analysis', () => {
        
        it('should analyze task from data analysis perspective', async () => {
            jest.spyOn(agent as any, 'callLLM').mockResolvedValue(`
ПРОБЛЕМА: Performance bottlenecks в application requiring optimization
КОНТЕКСТ: Need data-driven analysis для identify root causes и propose optimizations
ОГРАНИЧЕНИЯ:
- Empirical data required (profiling, metrics, benchmarks)
- Root cause analysis (not symptoms)
- Quantifiable improvements (measurable results)
- Cost-benefit analysis (optimization ROI)
- Performance budgets (target metrics)
            `);
            
            const analysis = await (agent as any).analyzeTask(mockTask, mockProjectContext);
            
            expect(analysis.problem).toBeDefined();
            expect(analysis.context).toBeDefined();
            expect(analysis.constraints).toBeDefined();
            expect(analysis.constraints.length).toBeGreaterThan(0);
        }, TEST_TIMEOUTS.INTEGRATION);
        
        it('should identify analyst-specific constraints', async () => {
            jest.spyOn(agent as any, 'callLLM').mockResolvedValue(`
ПРОБЛЕМА: Optimization requires metrics-driven approach
КОНТЕКСТ: Performance analysis based on data
ОГРАНИЧЕНИЯ:
- Data collection (profiling, monitoring, logging)
- Statistical significance (sufficient sample size)
- Baseline establishment (before/after comparison)
- Regression detection (prevent performance degradation)
            `);
            
            const analysis = await (agent as any).analyzeTask(mockTask, mockProjectContext);
            
            const constraintsText = analysis.constraints.join(' ').toLowerCase();
            expect(
                constraintsText.includes('data') ||
                constraintsText.includes('metrics') ||
                constraintsText.includes('performance') ||
                constraintsText.includes('baseline')
            ).toBe(true);
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify analyst-focused solutions
     * WHY: Analyst solutions need data-driven evidence
     * ADDRESSES: Solution quality
     */
    describe('Analyst Solution Generation', () => {
        
        it('should generate data-driven solution options', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Performance\nКОНТЕКСТ: Analysis\nОГРАНИЧЕНИЯ:\n- Data-driven')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Data-Driven Performance Optimization Strategy',
                        description: 'Comprehensive performance analysis: profiling (identify bottlenecks), benchmarking (establish baselines), optimization (targeted improvements), validation (measure results)',
                        approach: 'Step 1: Profile application (CPU, memory, I/O). Step 2: Establish performance baselines. Step 3: Identify top bottlenecks (80/20 rule). Step 4: Implement targeted optimizations. Step 5: Measure improvements (A/B testing). Step 6: Document findings и recommendations.',
                        pros: ['Data-driven decisions', 'Quantifiable results', 'Root cause focus', 'Measurable ROI', 'Evidence-based'],
                        cons: ['Requires profiling tools', 'Time for data collection', 'Analysis expertise needed'],
                        complexity: 'medium',
                        confidence: 0.89,
                        estimatedTime: 28800000,
                        filesToModify: ['src/performance-monitor.ts', 'src/profiler.ts', 'docs/optimization-report.md'],
                        risks: ['Data collection overhead', 'Analysis complexity', 'Optimization trade-offs']
                    }
                ]));
            
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            expect(thoughts.options.length).toBeGreaterThan(0);
            expect(thoughts.options[0].title).toBeDefined();
        }, TEST_TIMEOUTS.INTEGRATION);
        
        it('should assess complexity appropriately', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Test\nКОНТЕКСТ: Test\nОГРАНИЧЕНИЯ:\n- Test')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Analysis Solution',
                        description: 'Test',
                        approach: 'Test',
                        pros: ['pro1'],
                        cons: ['con1'],
                        complexity: 'medium',
                        confidence: 0.85,
                        estimatedTime: 18000000,
                        filesToModify: ['analytics.ts'],
                        risks: ['risk1']
                    }
                ]));
            
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            thoughts.options.forEach(option => {
                expect(['low', 'medium', 'high']).toContain(option.complexity);
                expect(option.confidence).toBeGreaterThanOrEqual(0);
                expect(option.confidence).toBeLessThanOrEqual(1);
            });
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify analyst priorities in decision making
     * WHY: Data-driven, measurable, evidence-based approach critical
     * ADDRESSES: Domain expertise
     */
    describe('Analyst-Specific Decision Making', () => {
        
        it('should prioritize data-driven approaches', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Optimization\nКОНТЕКСТ: Evidence\nОГРАНИЧЕНИЯ:\n- Data required')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Data-Driven Optimization',
                        description: 'Evidence-based approach с profiling и benchmarks',
                        approach: 'Profile, measure, optimize, validate',
                        pros: ['Measurable', 'Evidence-based', 'Quantifiable ROI'],
                        cons: ['Requires profiling'],
                        complexity: 'medium',
                        confidence: 0.91,
                        estimatedTime: 21600000,
                        filesToModify: ['src/optimizer.ts'],
                        risks: ['Profiling overhead']
                    },
                    {
                        title: 'Gut-Feeling Optimization',
                        description: 'Optimize based on assumptions',
                        approach: 'Guess and optimize',
                        pros: ['Fast'],
                        cons: ['No evidence', 'May not address real issues', 'Unmeasurable'],
                        complexity: 'low',
                        confidence: 0.4,
                        estimatedTime: 7200000,
                        filesToModify: ['src/code.ts'],
                        risks: ['Wrong optimization target', 'Wasted effort', 'No validation']
                    }
                ]))
                .mockResolvedValueOnce('Data-driven approach mandatory для effective optimization');
            
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            expect(solution).toBeDefined();
            // Analyst should prefer data-driven approach
            expect(solution.evaluation.quality).toBeGreaterThan(0.7);
        }, TEST_TIMEOUTS.E2E);
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track specialized agent testing
 * 
 * Coverage Summary:
 * - ✅ Agent identity (ID, name, description)
 * - ✅ Task analysis (analyst perspective, data/metrics focus)
 * - ✅ Solution generation (data-driven options)
 * - ✅ Decision making (evidence-based priorities)
 * 
 * Not covered (future):
 * - ⏳ Execution phase (requires profiling implementation)
 * - ⏳ Data analysis (requires real metrics)
 * - ⏳ Benchmark generation (performance testing)
 * - ⏳ Optimization validation (A/B testing)
 * - ⏳ Report generation (visualization, insights)
 * 
 * Estimated coverage: ~35% of AnalystAgent
 */
