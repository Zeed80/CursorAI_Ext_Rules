/**
 * INTENT: Basic tests для LocalAgent (core agent intelligence workflow)
 * WHY: LocalAgent - foundation для всех specialized agents (think/propose/execute)
 * ADDRESSES: Phase 3 Coverage Expansion - critical agent logic testing
 * CONSEQUENCES: If LocalAgent fails, autonomous mode completely broken
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LocalAgent, AgentThoughts, AgentSolution, ProjectContext, SolutionOption } from '../local-agent';
import { Task } from '../../orchestrator/orchestrator';
import { createMockVSCodeContext } from '../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS } from '../../__tests__/helpers/test-constants';

// Concrete implementation для testing
class TestLocalAgent extends LocalAgent {
    constructor(context: any) {
        super('test-agent', 'Test Agent', 'Agent for testing', context);
    }
    
    protected async analyzeTask(task: Task, projectContext: ProjectContext): Promise<any> {
        return {
            problem: task.description,
            context: 'Test analysis context',
            constraints: ['constraint1', 'constraint2']
        };
    }
    
    protected async generateOptions(task: Task, projectContext: ProjectContext, analysis: any): Promise<SolutionOption[]> {
        return [
            {
                id: 'option-1',
                title: 'Test Solution 1',
                description: 'First test solution',
                approach: 'Approach 1',
                pros: ['pro1', 'pro2'],
                cons: ['con1'],
                estimatedTime: 3600000,
                complexity: 'low',
                confidence: 0.85,
                filesToModify: ['test.ts'],
                risks: ['risk1']
            },
            {
                id: 'option-2',
                title: 'Test Solution 2',
                description: 'Second test solution',
                approach: 'Approach 2',
                pros: ['pro1'],
                cons: ['con1', 'con2'],
                estimatedTime: 7200000,
                complexity: 'medium',
                confidence: 0.75,
                filesToModify: ['test1.ts', 'test2.ts'],
                risks: ['risk1', 'risk2']
            }
        ];
    }
    
    protected async selectBestOption(options: SolutionOption[], task: Task, projectContext: ProjectContext): Promise<SolutionOption> {
        // Simple selection: highest confidence
        return options.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
    }
    
    protected buildReasoningPrompt(option: SolutionOption, task: Task, projectContext: ProjectContext): string {
        return `Selected ${option.title} because confidence: ${option.confidence}`;
    }
}

describe('LocalAgent - Basic Tests', () => {
    let agent: TestLocalAgent;
    let mockTask: Task;
    let mockProjectContext: ProjectContext;
    
    beforeEach(() => {
        const context = createMockVSCodeContext();
        agent = new TestLocalAgent(context);
        
        mockTask = {
            id: 'task-1',
            description: 'Test task description',
            type: 'improvement',
            priority: 'high',
            status: 'pending'
        };
        
        mockProjectContext = {
            structure: {
                files: ['src/index.ts', 'src/test.ts'],
                directories: ['src', 'tests'],
                entryPoints: ['src/index.ts']
            },
            patterns: ['*.ts'],
            standards: {
                codeStyle: 'TypeScript strict',
                architecture: 'Modular'
            }
        };
    });
    
    /**
     * INTENT: Verify agent initialization
     * WHY: Proper setup critical для agent functionality
     * ADDRESSES: Basic agent lifecycle
     */
    describe('Initialization', () => {
        
        /**
         * INTENT: Verify agent metadata
         * WHY: Identity needed для collaboration
         */
        it('should initialize with correct metadata', () => {
            expect(agent.getId()).toBe('test-agent');
            expect(agent.getName()).toBe('Test Agent');
            expect(agent.getDescription()).toBe('Agent for testing');
        });
    });
    
    /**
     * INTENT: Verify think() workflow
     * WHY: First phase of agent intelligence
     * ADDRESSES: Analysis and option generation
     */
    describe('Think Phase', () => {
        
        /**
         * INTENT: Verify think generates thoughts
         * WHY: Core cognitive function
         */
        it('should generate thoughts with analysis and options', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            expect(thoughts).toBeDefined();
            expect(thoughts.agentId).toBe('test-agent');
            expect(thoughts.taskId).toBe('task-1');
            expect(thoughts.phase).toBe('analyzing');
            expect(thoughts.analysis).toBeDefined();
            expect(thoughts.analysis.problem).toBe('Test task description');
            expect(thoughts.options).toBeDefined();
            expect(thoughts.options.length).toBeGreaterThan(0);
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify options generated correctly
         * WHY: Options drive decision making
         */
        it('should generate multiple solution options', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            expect(thoughts.options.length).toBe(2);
            expect(thoughts.options[0].title).toBe('Test Solution 1');
            expect(thoughts.options[1].title).toBe('Test Solution 2');
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify thought structure complete
         * WHY: Downstream processes depend on structure
         */
        it('should include progress tracking in thoughts', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            expect(thoughts.progress).toBeDefined();
            expect(thoughts.progress.status).toBeDefined();
            expect(typeof thoughts.progress.currentStep).toBe('number');
            expect(typeof thoughts.progress.totalSteps).toBe('number');
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify proposeSolution() workflow
     * WHY: Second phase - option selection and planning
     * ADDRESSES: Decision making and implementation planning
     */
    describe('Propose Phase', () => {
        
        /**
         * INTENT: Verify solution proposal generated
         * WHY: Bridge between thinking and execution
         */
        it('should propose solution based on thoughts', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            expect(solution).toBeDefined();
            expect(solution.agentId).toBe('test-agent');
            expect(solution.taskId).toBe('task-1');
            expect(solution.solution).toBeDefined();
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify best option selected
         * WHY: Quality of decision critical
         */
        it('should select option with highest confidence', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            // Should select option-1 (confidence 0.85 > 0.75)
            expect(solution.solution.title).toBe('Test Solution 1');
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify evaluation metrics included
         * WHY: Quality assessment needed
         */
        it('should include evaluation metrics in solution', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            expect(solution.evaluation).toBeDefined();
            expect(typeof solution.evaluation.quality).toBe('number');
            expect(typeof solution.evaluation.performance).toBe('number');
            expect(typeof solution.evaluation.security).toBe('number');
            expect(typeof solution.evaluation.maintainability).toBe('number');
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify complete think → propose flow
     * WHY: Integration of cognitive phases
     * ADDRESSES: End-to-end agent intelligence
     */
    describe('Think → Propose Integration', () => {
        
        /**
         * INTENT: Verify seamless flow between phases
         * WHY: Agent должен work as unified system
         */
        it('should flow from think to propose seamlessly', async () => {
            // Think phase
            const thoughts = await agent.think(mockTask, mockProjectContext);
            expect(thoughts.options.length).toBeGreaterThan(0);
            
            // Propose phase uses thoughts
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            expect(solution.solution).toBeDefined();
            
            // Solution references original task
            expect(solution.taskId).toBe(thoughts.taskId);
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify consistency across phases
         * WHY: Data integrity critical
         */
        it('should maintain task and agent context', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            expect(thoughts.agentId).toBe(solution.agentId);
            expect(thoughts.taskId).toBe(solution.taskId);
            expect(thoughts.agentName).toBe(solution.agentName);
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify option quality criteria
     * WHY: Options должны meet minimum standards
     * ADDRESSES: Solution quality gates
     */
    describe('Option Quality', () => {
        
        /**
         * INTENT: Verify options have required fields
         * WHY: Downstream processes depend on complete data
         */
        it('should generate options with all required fields', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            thoughts.options.forEach(option => {
                expect(option.id).toBeDefined();
                expect(option.title).toBeDefined();
                expect(option.description).toBeDefined();
                expect(option.approach).toBeDefined();
                expect(option.pros).toBeDefined();
                expect(option.cons).toBeDefined();
                expect(option.estimatedTime).toBeGreaterThan(0);
                expect(option.complexity).toMatch(/low|medium|high/);
                expect(option.confidence).toBeGreaterThanOrEqual(0);
                expect(option.confidence).toBeLessThanOrEqual(1);
                expect(Array.isArray(option.filesToModify)).toBe(true);
                expect(Array.isArray(option.risks)).toBe(true);
            });
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify confidence scores reasonable
         * WHY: Unrealistic confidence = poor decisions
         */
        it('should generate realistic confidence scores', async () => {
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            thoughts.options.forEach(option => {
                expect(option.confidence).toBeGreaterThanOrEqual(0);
                expect(option.confidence).toBeLessThanOrEqual(1);
                // Typically confidence should be > 0.5 для viable options
                expect(option.confidence).toBeGreaterThan(0.5);
            });
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify error handling
     * WHY: Agents must gracefully handle failures
     * ADDRESSES: Resilience
     */
    describe('Error Handling', () => {
        
        /**
         * INTENT: Verify graceful handling of invalid task
         * WHY: Input validation critical
         */
        it('should handle task with missing description', async () => {
            const invalidTask: Task = {
                id: 'invalid',
                description: '',
                type: 'bug',
                priority: 'high',
                status: 'pending'
            };
            
            // Should not throw, should handle gracefully
            const thoughts = await agent.think(invalidTask, mockProjectContext);
            expect(thoughts).toBeDefined();
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify handling of minimal project context
         * WHY: Context может be incomplete
         */
        it('should handle minimal project context', async () => {
            const minimalContext: ProjectContext = {
                structure: {
                    files: [],
                    directories: [],
                    entryPoints: []
                }
            };
            
            const thoughts = await agent.think(mockTask, minimalContext);
            expect(thoughts).toBeDefined();
            expect(thoughts.options.length).toBeGreaterThan(0);
        }, TEST_TIMEOUTS.INTEGRATION);
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track what's tested и gaps
 * 
 * Coverage Summary:
 * - ✅ Initialization (agent metadata)
 * - ✅ Think phase (analysis, option generation, progress tracking)
 * - ✅ Propose phase (solution generation, option selection, evaluation)
 * - ✅ Think→Propose integration (seamless flow, consistency)
 * - ✅ Option quality (required fields, confidence validation)
 * - ✅ Error handling (invalid input, minimal context)
 * 
 * Not covered (future comprehensive tests):
 * - ⏳ Execute phase (requires workspace modification mocking)
 * - ⏳ LLM interaction (requires extensive provider mocking)
 * - ⏳ Cost optimization (model selection, token counting)
 * - ⏳ Context building (MCP integration, file reading)
 * - ⏳ Collaboration (multi-agent scenarios)
 * - ⏳ Learning (feedback incorporation)
 * - ⏳ Performance (large project contexts)
 * 
 * Estimated coverage: ~40% of LocalAgent functionality
 * Focus: Core cognitive workflow (think/propose)
 * Comprehensive tests с LLM mocking = Phase 3 advanced work
 */
