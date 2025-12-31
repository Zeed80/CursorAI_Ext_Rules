/**
 * Comprehensive Unit Tests для TaskQueue
 * 
 * INTENT: Проверка priority-based queue с swarm coordination
 * ПОЧЕМУ: TaskQueue - core component для autonomous agents coordination
 * ПОСЛЕДСТВИЯ: Bugs в TaskQueue приводят к неправильному распределению задач между agents
 */

import { TaskQueue, TaskPriority, QueuedTask, AgentCapabilities } from '../task-queue';
import { mockTask, mockAgent } from '../../../__tests__/helpers/mock-factories';
import { waitFor, expectArrayToContainSameElements } from '../../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS, SWARM_TEST_CONFIG } from '../../../__tests__/helpers/test-constants';

describe('TaskQueue Unit Tests', () => {
    jest.setTimeout(TEST_TIMEOUTS.UNIT);

    let queue: TaskQueue;

    beforeEach(() => {
        queue = new TaskQueue();
    });

    afterEach(() => {
        queue.removeAllListeners();
    });

    /**
     * INTENT: Проверка базовой функциональности enqueue
     * ПОЧЕМУ: Core operation - добавление задач в очередь
     * ПОСЛЕДСТВИЯ: Если enqueue не работает, агенты не получат задачи
     */
    describe('enqueue()', () => {
        it('should add task to queue with correct priority', async () => {
            // Arrange
            const taskData = {
                description: 'Test task',
                type: 'feature',
            };

            // Act
            const result = await queue.enqueue(taskData, TaskPriority.HIGH);

            // Assert
            expect(result).toBeDefined();
            expect(result.priority).toBe(TaskPriority.HIGH);
            expect(result.description).toBe('Test task');
            expect(result.status).toBe('pending');
            expect(result.attempts).toBe(0);
            expect(queue.size()).toBe(1);
        });

        it('should use MEDIUM priority by default', async () => {
            // Arrange
            const taskData = { description: 'Default priority task' };

            // Act
            const result = await queue.enqueue(taskData);

            // Assert
            expect(result.priority).toBe(TaskPriority.MEDIUM);
        });

        it('should emit task:added event', async () => {
            // Arrange
            const taskData = { description: 'Event test task' };
            const eventSpy = jest.fn();
            queue.on('task:added', eventSpy);

            // Act
            await queue.enqueue(taskData, TaskPriority.HIGH);

            // Assert
            expect(eventSpy).toHaveBeenCalledTimes(1);
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: 'Event test task',
                    priority: TaskPriority.HIGH,
                })
            );
        });

        it('should emit task:immediate event for immediate priority', async () => {
            // Arrange
            const taskData = { description: 'Urgent task' };
            const immediateSpy = jest.fn();
            queue.on('task:immediate', immediateSpy);

            // Act
            await queue.enqueue(taskData, TaskPriority.IMMEDIATE);

            // Assert
            expect(immediateSpy).toHaveBeenCalledTimes(1);
        });

        it('should generate unique task IDs', async () => {
            // Arrange
            const tasks: QueuedTask[] = [];

            // Act
            for (let i = 0; i < 10; i++) {
                const task = await queue.enqueue({ description: `Task ${i}` });
                tasks.push(task);
            }

            // Assert
            const ids = tasks.map(t => t.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(10);
        });
    });

    /**
     * INTENT: Проверка приоритизации задач
     * ПОЧЕМУ: Immediate tasks должны обрабатываться до high priority tasks
     * ПОСЛЕДСТВИЯ: Неправильная приоритизация = критичные задачи ждут слишком долго
     */
    describe('Priority handling', () => {
        it('should prioritize IMMEDIATE over HIGH priority tasks', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);

            // Act - добавляем в обратном порядке приоритетов
            await queue.enqueue({ description: 'Low task' }, TaskPriority.LOW);
            await queue.enqueue({ description: 'High task' }, TaskPriority.HIGH);
            await queue.enqueue({ description: 'Immediate task' }, TaskPriority.IMMEDIATE);
            await queue.enqueue({ description: 'Medium task' }, TaskPriority.MEDIUM);

            // Assert - должны получить в порядке приоритетов
            const task1 = await queue.dequeue('test-agent');
            expect(task1?.description).toBe('Immediate task');

            const task2 = await queue.dequeue('test-agent');
            expect(task2?.description).toBe('High task');

            const task3 = await queue.dequeue('test-agent');
            expect(task3?.description).toBe('Medium task');

            const task4 = await queue.dequeue('test-agent');
            expect(task4?.description).toBe('Low task');
        });

        it('should maintain FIFO order within same priority', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);

            // Act
            await queue.enqueue({ description: 'High 1' }, TaskPriority.HIGH);
            await queue.enqueue({ description: 'High 2' }, TaskPriority.HIGH);
            await queue.enqueue({ description: 'High 3' }, TaskPriority.HIGH);

            // Assert
            const task1 = await queue.dequeue('test-agent');
            const task2 = await queue.dequeue('test-agent');
            const task3 = await queue.dequeue('test-agent');

            expect(task1?.description).toBe('High 1');
            expect(task2?.description).toBe('High 2');
            expect(task3?.description).toBe('High 3');
        });
    });

    /**
     * INTENT: Проверка Swarm coordination - агенты выбирают подходящие задачи
     * ПОЧЕМУ: Core feature для intelligent task distribution
     * ПОСЛЕДСТВИЯ: Без swarm coordination задачи распределяются неэффективно
     */
    describe('Swarm coordination', () => {
        it('should allow agent registration with capabilities', () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'backend-1',
                specializations: ['backend', 'database'],
                currentLoad: 0.3,
                preferredTasks: ['api', 'database'],
            };

            // Act
            queue.registerAgent(capabilities);

            // Assert - агент зарегистрирован (проверяем через dequeue)
            expect(() => queue.dequeue('backend-1')).not.toThrow();
        });

        it('should not allow unregistered agent to dequeue', async () => {
            // Arrange
            await queue.enqueue({ description: 'Test task' }, TaskPriority.HIGH);

            // Act
            const result = await queue.dequeue('unknown-agent');

            // Assert
            expect(result).toBeNull();
        });

        it('should not assign tasks to overloaded agent (load >= 1.0)', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'overloaded-agent',
                specializations: ['backend'],
                currentLoad: 1.0, // Полностью загружен
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);
            await queue.enqueue({ description: 'Test task' }, TaskPriority.HIGH);

            // Act
            const result = await queue.dequeue('overloaded-agent');

            // Assert
            expect(result).toBeNull();
        });

        it('should assign tasks to agent with lower load', async () => {
            // Arrange
            const agent1: AgentCapabilities = {
                agentId: 'agent-1',
                specializations: ['backend'],
                currentLoad: 0.8,
                preferredTasks: [],
            };
            const agent2: AgentCapabilities = {
                agentId: 'agent-2',
                specializations: ['backend'],
                currentLoad: 0.3, // Меньше нагрузка
                preferredTasks: [],
            };

            queue.registerAgent(agent1);
            queue.registerAgent(agent2);

            await queue.enqueue({ description: 'Backend task' }, TaskPriority.HIGH);

            // Act - agent2 должен получить задачу (меньше load)
            const task1 = await queue.dequeue('agent-1');
            const task2 = await queue.dequeue('agent-2');

            // Assert
            expect(task1).toBeNull(); // agent1 имеет higher load, получит null
            expect(task2).toBeDefined(); // agent2 получит задачу
        });

        it('should prefer agents with matching specializations', async () => {
            // Arrange
            const backendAgent: AgentCapabilities = {
                agentId: 'backend-agent',
                specializations: ['backend', 'api'],
                currentLoad: 0.5,
                preferredTasks: [],
            };
            const frontendAgent: AgentCapabilities = {
                agentId: 'frontend-agent',
                specializations: ['frontend', 'ui'],
                currentLoad: 0.5,
                preferredTasks: [],
            };

            queue.registerAgent(backendAgent);
            queue.registerAgent(frontendAgent);

            // Задача для backend агента
            await queue.enqueue(
                { description: 'API task', assignedAgent: 'backend' } as any,
                TaskPriority.HIGH
            );

            // Act
            const backendTask = await queue.dequeue('backend-agent');
            const frontendTask = await queue.dequeue('frontend-agent');

            // Assert
            expect(backendTask?.description).toBe('API task');
            expect(frontendTask).toBeNull();
        });

        it('should emit task:claimed event on successful dequeue', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);
            await queue.enqueue({ description: 'Test task' }, TaskPriority.HIGH);

            const claimSpy = jest.fn();
            queue.on('task:claimed', claimSpy);

            // Act
            await queue.dequeue('test-agent');

            // Assert
            expect(claimSpy).toHaveBeenCalledTimes(1);
            expect(claimSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    task: expect.objectContaining({ description: 'Test task' }),
                    agentId: 'test-agent',
                })
            );
        });
    });

    /**
     * INTENT: Проверка lifecycle задачи (pending → in-progress → completed)
     * ПОЧЕМУ: Корректный lifecycle критичен для tracking task status
     * ПОСЛЕДСТВИЯ: Неправильный status = агенты не знают состояние задач
     */
    describe('Task lifecycle', () => {
        it('should mark task as in-progress on dequeue', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);
            await queue.enqueue({ description: 'Lifecycle task' }, TaskPriority.HIGH);

            // Act
            const task = await queue.dequeue('test-agent');

            // Assert
            expect(task?.status).toBe('in-progress');
            expect(task?.assignedWorker).toBe('test-agent');
            expect(task?.startedAt).toBeDefined();
            expect(task?.attempts).toBe(1);
        });

        it('should complete task successfully', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);
            const task = await queue.enqueue({ description: 'Complete task' }, TaskPriority.HIGH);
            await queue.dequeue('test-agent');

            const completeSpy = jest.fn();
            queue.on('task:completed', completeSpy);

            // Act
            await queue.complete(task.id, {
                success: true,
                workerId: 'test-agent',
                duration: 1000,
                filesChanged: ['file1.ts', 'file2.ts'],
            });

            // Assert
            expect(completeSpy).toHaveBeenCalledTimes(1);
            const stats = queue.getStatistics();
            expect(stats.completed).toBe(1);
        });

        it('should handle task failure and mark as blocked', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);
            const task = await queue.enqueue({ description: 'Failing task' }, TaskPriority.HIGH);
            await queue.dequeue('test-agent');

            const failSpy = jest.fn();
            queue.on('task:failed', failSpy);

            // Act
            await queue.complete(task.id, {
                success: false,
                workerId: 'test-agent',
                duration: 500,
                error: 'Test error',
            });

            // Assert
            expect(failSpy).toHaveBeenCalledTimes(1);
            expect(failSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    task: expect.objectContaining({ status: 'blocked' }),
                    error: 'Test error',
                })
            );
        });

        it('should retry failed task up to maxAttempts', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);
            const task = await queue.enqueue({ description: 'Retry task' }, TaskPriority.HIGH);

            // Act - первая попытка
            await queue.dequeue('test-agent');
            await queue.fail(task.id, 'First failure');

            // Задача должна вернуться в очередь
            await waitFor(() => queue.size() > 0, { timeout: 1000 });

            // Вторая попытка
            const retryTask = await queue.dequeue('test-agent');

            // Assert
            expect(retryTask?.id).toBe(task.id);
            expect(retryTask?.attempts).toBe(2);
        });

        it('should not retry task after maxAttempts reached', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);
            const task = await queue.enqueue({ description: 'Max retries task' }, TaskPriority.HIGH);

            // Act - исчерпываем все попытки (maxAttempts = 3)
            for (let i = 0; i < 3; i++) {
                await queue.dequeue('test-agent');
                await queue.fail(task.id, `Failure ${i + 1}`);
                
                if (i < 2) {
                    await waitFor(() => queue.size() > 0, { timeout: 1000 });
                }
            }

            // Assert - задача не должна вернуться в очередь
            await new Promise(r => setTimeout(r, 100)); // Небольшая пауза
            expect(queue.size()).toBe(0);

            const stats = queue.getStatistics();
            expect(stats.failed).toBe(1);
        });
    });

    /**
     * INTENT: Проверка edge cases и граничных условий
     * ПОЧЕМУ: Real-world scenarios содержат edge cases
     * ПОСЛЕДСТВИЯ: Необработанные edge cases = crashes в production
     */
    describe('Edge cases', () => {
        it('should handle empty queue dequeue gracefully', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);

            // Act
            const result = await queue.dequeue('test-agent');

            // Assert
            expect(result).toBeNull();
        });

        it('should handle completing non-existent task', async () => {
            // Arrange & Act
            await expect(
                queue.complete('non-existent-id', {
                    success: true,
                    workerId: 'test-agent',
                    duration: 0,
                })
            ).resolves.not.toThrow();
        });

        it('should handle failing non-existent task', async () => {
            // Arrange & Act & Assert
            await expect(
                queue.fail('non-existent-id', 'Test error')
            ).resolves.not.toThrow();
        });

        it('should return empty array for getAllTasks when queue is empty', () => {
            // Act
            const tasks = queue.getAllTasks();

            // Assert
            expect(tasks).toEqual([]);
        });

        it('should handle updateAgentLoad for non-existent agent', () => {
            // Act & Assert
            expect(() => {
                queue.updateAgentLoad('non-existent-agent', 0.5);
            }).not.toThrow();
        });

        it('should clear queue correctly', async () => {
            // Arrange
            await queue.enqueue({ description: 'Task 1' }, TaskPriority.HIGH);
            await queue.enqueue({ description: 'Task 2' }, TaskPriority.MEDIUM);
            await queue.enqueue({ description: 'Task 3' }, TaskPriority.LOW);

            expect(queue.size()).toBe(3);

            // Act
            queue.clear();

            // Assert
            expect(queue.size()).toBe(0);
            expect(queue.getAllTasks()).toEqual([]);
        });
    });

    /**
     * INTENT: Проверка statistics и monitoring
     * ПОЧЕМУ: Statistics нужны для monitoring и debugging
     * ПОСЛЕДСТВИЯ: Неправильные stats = невозможность track performance
     */
    describe('Statistics', () => {
        it('should return correct statistics', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);

            // Act - добавляем и обрабатываем задачи
            const task1 = await queue.enqueue({ description: 'Task 1' }, TaskPriority.HIGH);
            const task2 = await queue.enqueue({ description: 'Task 2' }, TaskPriority.MEDIUM);

            await queue.dequeue('test-agent'); // task1
            await queue.complete(task1.id, {
                success: true,
                workerId: 'test-agent',
                duration: 1000,
            });

            await queue.dequeue('test-agent'); // task2
            await queue.fail(task2.id, 'Test failure');

            // Assert
            const stats = queue.getStatistics();
            expect(stats.total).toBe(2);
            expect(stats.completed).toBe(1);
            expect(stats.failed).toBeGreaterThanOrEqual(1);
            expect(stats.pending).toBe(0);
            expect(stats.processing).toBe(0);
        });

        it('should track size correctly across operations', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);

            // Act & Assert
            expect(queue.size()).toBe(0);

            await queue.enqueue({ description: 'Task 1' }, TaskPriority.HIGH);
            expect(queue.size()).toBe(1);

            await queue.enqueue({ description: 'Task 2' }, TaskPriority.HIGH);
            expect(queue.size()).toBe(2);

            await queue.dequeue('test-agent');
            expect(queue.size()).toBe(1);

            await queue.dequeue('test-agent');
            expect(queue.size()).toBe(0);
        });
    });

    /**
     * INTENT: Проверка concurrent access patterns
     * ПОЧЕМУ: Multiple agents могут одновременно dequeue
     * ПОСЛЕДСТВИЯ: Race conditions могут привести к duplicate task assignment
     */
    describe('Concurrency', () => {
        it('should handle concurrent dequeue from multiple agents', async () => {
            // Arrange
            const agent1: AgentCapabilities = {
                agentId: 'agent-1',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            const agent2: AgentCapabilities = {
                agentId: 'agent-2',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };

            queue.registerAgent(agent1);
            queue.registerAgent(agent2);

            // Добавляем 2 задачи
            await queue.enqueue({ description: 'Task 1' }, TaskPriority.HIGH);
            await queue.enqueue({ description: 'Task 2' }, TaskPriority.HIGH);

            // Act - оба агента dequeue одновременно
            const [task1, task2] = await Promise.all([
                queue.dequeue('agent-1'),
                queue.dequeue('agent-2'),
            ]);

            // Assert - каждый агент должен получить unique task
            expect(task1).toBeDefined();
            expect(task2).toBeDefined();
            expect(task1?.id).not.toBe(task2?.id);
        });

        it('should handle rapid enqueue/dequeue cycles', async () => {
            // Arrange
            const capabilities: AgentCapabilities = {
                agentId: 'test-agent',
                specializations: ['backend'],
                currentLoad: 0,
                preferredTasks: [],
            };
            queue.registerAgent(capabilities);

            // Act - rapid cycles
            const operations = [];
            for (let i = 0; i < 20; i++) {
                operations.push(
                    queue.enqueue({ description: `Task ${i}` }, TaskPriority.HIGH)
                );
            }
            await Promise.all(operations);

            const dequeuedTasks = [];
            for (let i = 0; i < 20; i++) {
                const task = await queue.dequeue('test-agent');
                if (task) dequeuedTasks.push(task);
            }

            // Assert
            expect(dequeuedTasks).toHaveLength(20);
            expect(queue.size()).toBe(0);
        });
    });
});
