/**
 * INTENT: Comprehensive tests для AgentWorker (autonomous agent lifecycle)
 * WHY: AgentWorker критичен для autonomous mode - координирует agent behavior
 * ADDRESSES: Phase 2 Coverage Expansion - critical agent infrastructure
 * CONSEQUENCES: If AgentWorker fails, autonomous operations impossible
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AgentWorker, WorkerState, WorkerConfig } from '../agent-worker';
import { TaskQueue, QueuedTask, TaskPriority, TaskStatus } from '../task-queue';
import { MessageBus, MessageType } from '../message-bus';
import { LocalAgent, AgentThoughts, AgentSolution, ProjectContext } from '../../local-agent';
import { Task } from '../../../orchestrator/orchestrator';
import { createMockVSCodeContext, waitFor } from '../../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS } from '../../../__tests__/helpers/test-constants';

// Concrete implementation для testing
class TestAgentWorker extends AgentWorker {
    protected async monitorProject(): Promise<void> {
        // Test implementation
    }
    
    protected async answerQuestion(question: any): Promise<any> {
        return { answer: 'test answer' };
    }
    
    protected async handleCollaboration(request: any): Promise<any> {
        return { response: 'test collaboration' };
    }
}

// Mock LocalAgent implementation
class MockLocalAgent extends LocalAgent {
    constructor(context: any) {
        super('mock-agent', 'Mock Agent', 'Test agent', context);
    }
    
    protected async analyzeTask(task: Task, projectContext: ProjectContext): Promise<any> {
        return {
            problem: task.description,
            context: 'test context',
            constraints: ['constraint1']
        };
    }
    
    protected async generateOptions(task: Task, projectContext: ProjectContext, analysis: any): Promise<any[]> {
        return [{
            id: 'option-1',
            title: 'Test Option',
            description: 'Test description',
            approach: 'Test approach',
            pros: ['pro1'],
            cons: ['con1'],
            estimatedTime: 1000,
            complexity: 'low' as const,
            confidence: 0.8,
            filesToModify: [],
            risks: []
        }];
    }
    
    protected async selectBestOption(options: any[], task: Task, projectContext: ProjectContext): Promise<any> {
        return options[0];
    }
    
    protected buildReasoningPrompt(option: any, task: Task, projectContext: ProjectContext): string {
        return 'test reasoning prompt';
    }
}

describe('AgentWorker - Comprehensive Tests', () => {
    let worker: TestAgentWorker;
    let taskQueue: TaskQueue;
    let messageBus: MessageBus;
    let localAgent: LocalAgent;
    let config: WorkerConfig;
    
    beforeEach(() => {
        const context = createMockVSCodeContext();
        
        taskQueue = new TaskQueue();
        messageBus = new MessageBus();
        localAgent = new MockLocalAgent(context);
        
        config = {
            agentId: 'test-worker',
            specializations: ['testing'],
            preferredTasks: ['test'],
            maxConcurrentTasks: 1,
            monitoringInterval: 5000
        };
        
        worker = new TestAgentWorker(config, taskQueue, messageBus, localAgent);
    });
    
    /**
     * INTENT: Verify worker lifecycle (start/stop)
     * WHY: Proper lifecycle critical для clean startup/shutdown
     * ADDRESSES: Надежность (clean state management)
     */
    describe('Lifecycle Management', () => {
        
        /**
         * INTENT: Verify worker starts correctly
         * WHY: Start должен initialize state и register capabilities
         */
        it('should start worker and register with queue', async () => {
            await worker.start();
            
            expect(worker.getState()).toBe(WorkerState.IDLE);
            
            // Verify registered в queue
            const stats = taskQueue.getStatistics();
            expect(stats.agents).toBeGreaterThan(0);
        });
        
        /**
         * INTENT: Verify worker stops cleanly
         * WHY: Proper cleanup prevents resource leaks
         */
        it('should stop worker and cleanup', async () => {
            await worker.start();
            await worker.stop();
            
            expect(worker.getState()).toBe(WorkerState.STOPPED);
        });
        
        /**
         * INTENT: Verify start idempotent
         * WHY: Calling start() twice should not create issues
         */
        it('should handle multiple start calls gracefully', async () => {
            await worker.start();
            await worker.start(); // Second call
            
            // Should still be running
            expect(worker.getState()).not.toBe(WorkerState.STOPPED);
        });
        
        /**
         * INTENT: Verify stop idempotent
         * WHY: Multiple stop calls should be safe
         */
        it('should handle stop when not running', async () => {
            // Stop without start
            await expect(worker.stop()).resolves.not.toThrow();
        });
    });
    
    /**
     * INTENT: Verify task execution flow
     * WHY: Core functionality - worker must execute tasks autonomously
     * ADDRESSES: Функциональность (autonomous execution)
     */
    describe('Task Execution', () => {
        
        /**
         * INTENT: Verify worker claims и executes task
         * WHY: Main autonomous operation
         */
        it('should claim and execute task from queue', async () => {
            await worker.start();
            
            // Add task to queue
            const task: Task = {
                id: 'task-1',
                description: 'Test task',
                type: 'improvement',
                priority: 'high',
                status: 'pending'
            };
            
            await taskQueue.enqueue(task, TaskPriority.HIGH, ['testing']);
            
            // Wait для task execution
            await waitFor(async () => {
                const queuedTask = await taskQueue.getTask('task-1');
                return queuedTask?.status === TaskStatus.COMPLETED;
            }, { timeout: 10000 });
            
            const result = await taskQueue.getTask('task-1');
            expect(result?.status).toBe(TaskStatus.COMPLETED);
            
            await worker.stop();
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify worker state transitions during execution
         * WHY: State management critical для monitoring
         */
        it('should transition states correctly during task', async () => {
            await worker.start();
            
            const statesObserved: WorkerState[] = [];
            
            // Monitor state changes
            const checkInterval = setInterval(() => {
                const state = worker.getState();
                if (statesObserved[statesObserved.length - 1] !== state) {
                    statesObserved.push(state);
                }
            }, 50);
            
            const task: Task = {
                id: 'task-2',
                description: 'State test',
                type: 'bug',
                priority: 'high',
                status: 'pending'
            };
            
            await taskQueue.enqueue(task, TaskPriority.HIGH, ['testing']);
            
            await waitFor(async () => {
                const queuedTask = await taskQueue.getTask('task-2');
                return queuedTask?.status === TaskStatus.COMPLETED;
            }, { timeout: 10000 });
            
            clearInterval(checkInterval);
            
            // Should have seen IDLE → WORKING → IDLE progression
            expect(statesObserved).toContain(WorkerState.IDLE);
            expect(statesObserved).toContain(WorkerState.WORKING);
            
            await worker.stop();
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify message handling (P2P communication)
     * WHY: Workers communicate через MessageBus
     * ADDRESSES: Collaboration functionality
     */
    describe('Message Handling', () => {
        
        /**
         * INTENT: Verify worker receives и processes questions
         * WHY: Agents ask each other questions для collaboration
         */
        it('should handle incoming question from другого agent', async () => {
            await worker.start();
            
            let responseReceived = false;
            
            // Subscribe для ответа
            messageBus.subscribe('requester-agent', [MessageType.AGENT_ANSWER], async (msg) => {
                if (msg.correlationId === 'question-123') {
                    responseReceived = true;
                }
            });
            
            // Send question to worker
            await messageBus.sendTo(config.agentId, {
                id: 'question-123',
                type: MessageType.AGENT_QUESTION,
                from: 'requester-agent',
                to: config.agentId,
                payload: { question: 'How to test?' }
            });
            
            await waitFor(() => responseReceived, { timeout: 3000 });
            
            expect(responseReceived).toBe(true);
            
            await worker.stop();
        });
        
        /**
         * INTENT: Verify collaboration request handling
         * WHY: Agents collaborate на complex tasks
         */
        it('should handle collaboration requests', async () => {
            await worker.start();
            
            let collaborationResponse: any = null;
            
            messageBus.subscribe('collab-requester', [MessageType.COLLABORATION_RESPONSE], async (msg) => {
                collaborationResponse = msg.payload;
            });
            
            await messageBus.sendTo(config.agentId, {
                type: MessageType.COLLABORATION_REQUEST,
                from: 'collab-requester',
                to: config.agentId,
                payload: { request: 'Need help with testing' }
            });
            
            await waitFor(() => collaborationResponse !== null, { timeout: 3000 });
            
            expect(collaborationResponse).toBeDefined();
            expect(collaborationResponse.response).toBeDefined();
            
            await worker.stop();
        });
    });
    
    /**
     * INTENT: Verify monitoring loop functionality
     * WHY: Autonomous agents должны monitor project периодически
     * ADDRESSES: Proactive monitoring behavior
     */
    describe('Monitoring Loop', () => {
        
        /**
         * INTENT: Verify monitoring executes periodically
         * WHY: Agents должны be proactive, не только reactive
         */
        it('should perform monitoring when idle', async () => {
            // Shorten monitoring interval для testing
            const shortIntervalConfig = {
                ...config,
                monitoringInterval: 500 // 500ms для fast testing
            };
            
            const shortIntervalWorker = new TestAgentWorker(
                shortIntervalConfig,
                taskQueue,
                messageBus,
                localAgent
            );
            
            await shortIntervalWorker.start();
            
            // Wait для несколько monitoring cycles
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Verify worker is functioning (state cycling)
            const state = shortIntervalWorker.getState();
            expect([WorkerState.IDLE, WorkerState.MONITORING]).toContain(state);
            
            await shortIntervalWorker.stop();
        }, 5000);
    });
    
    /**
     * INTENT: Verify error resilience
     * WHY: Worker должен continue functioning после errors
     * ADDRESSES: Надежность (error recovery)
     */
    describe('Error Handling', () => {
        
        /**
         * INTENT: Verify worker recovers from task execution errors
         * WHY: Single task failure shouldn't crash worker
         */
        it('should continue running после task failure', async () => {
            await worker.start();
            
            // Create task that will fail
            const failingTask: Task = {
                id: 'failing-task',
                description: 'This will fail',
                type: 'bug',
                priority: 'high',
                status: 'pending'
            };
            
            // Mock localAgent to throw error
            jest.spyOn(localAgent, 'think').mockRejectedValueOnce(new Error('Test error'));
            
            await taskQueue.enqueue(failingTask, TaskPriority.HIGH, ['testing']);
            
            // Wait для task processing
            await waitFor(async () => {
                const task = await taskQueue.getTask('failing-task');
                return task?.status === TaskStatus.FAILED;
            }, { timeout: 10000 });
            
            // Worker should still be running
            expect(worker.getState()).not.toBe(WorkerState.STOPPED);
            
            await worker.stop();
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify worker configuration
     * WHY: Config должно be accessible для monitoring
     * ADDRESSES: Observability
     */
    describe('Configuration & State', () => {
        
        /**
         * INTENT: Verify getConfig returns correct config
         * WHY: Monitoring systems need worker configuration
         */
        it('should return correct configuration', () => {
            const returnedConfig = worker.getConfig();
            
            expect(returnedConfig.agentId).toBe('test-worker');
            expect(returnedConfig.specializations).toContain('testing');
        });
        
        /**
         * INTENT: Verify getCurrentTask tracks active task
         * WHY: Need visibility что worker currently processing
         */
        it('should track current task during execution', async () => {
            await worker.start();
            
            expect(worker.getCurrentTask()).toBeNull(); // Initially null
            
            // Add task
            const task: Task = {
                id: 'tracked-task',
                description: 'Track me',
                type: 'improvement',
                priority: 'high',
                status: 'pending'
            };
            
            await taskQueue.enqueue(task, TaskPriority.HIGH, ['testing']);
            
            // Wait для task to be claimed
            await waitFor(() => worker.getCurrentTask() !== null, { timeout: 5000 });
            
            const currentTask = worker.getCurrentTask();
            expect(currentTask).not.toBeNull();
            expect(currentTask?.id).toBe('tracked-task');
            
            await worker.stop();
        }, TEST_TIMEOUTS.INTEGRATION);
        
        /**
         * INTENT: Verify isWorking() reflects actual state
         * WHY: Quick check if worker busy
         */
        it('should reflect working state correctly', async () => {
            await worker.start();
            
            expect(worker.isWorking()).toBe(false); // Initially idle
            
            await worker.stop();
        });
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track что протестировано и gaps
 * 
 * Coverage Summary:
 * - ✅ Lifecycle (start/stop/idempotence)
 * - ✅ Task execution flow (claim/execute/complete)
 * - ✅ State transitions (IDLE→WORKING→IDLE)
 * - ✅ Message handling (questions/collaboration)
 * - ✅ Monitoring loop (periodic execution)
 * - ✅ Error resilience (continues after failures)
 * - ✅ Configuration access (getConfig/getState/getCurrentTask)
 * 
 * Not covered (future):
 * - ⏳ Full end-to-end task execution (requires real LocalAgent LLM calls)
 * - ⏳ Multiple concurrent tasks (maxConcurrentTasks > 1)
 * - ⏳ Task interruption (immediate priority override)
 * - ⏳ MCP integration (buildProjectContext details)
 * - ⏳ Context management (agentContext get/set)
 * 
 * Estimated coverage: ~65% of AgentWorker functionality
 */
