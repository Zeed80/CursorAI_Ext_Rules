/**
 * INTENT: Comprehensive tests для MessageBus (agent communication backbone)
 * WHY: MessageBus критичен для swarm coordination - agents communicate через него
 * ADDRESSES: Phase 2 Coverage Expansion - critical component testing
 * CONSEQUENCES: If MessageBus fails, agent collaboration impossible
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MessageBus, MessageType, Message, getGlobalMessageBus } from '../message-bus';
import { waitFor } from '../../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS } from '../../../__tests__/helpers/test-constants';

describe('MessageBus - Comprehensive Tests', () => {
    let messageBus: MessageBus;
    
    beforeEach(() => {
        // Create fresh message bus для each test
        messageBus = new MessageBus();
    });
    
    /**
     * INTENT: Verify basic pub/sub pattern works
     * WHY: Core functionality - publishing and subscribing to messages
     * METHOD: Subscribe to topic, publish message, verify received
     * ADDRESSES: Функциональность (basic operations)
     */
    describe('Publish/Subscribe Pattern', () => {
        
        /**
         * INTENT: Verify subscriber receives published message
         * WHY: Basic pub/sub должен работать
         * CONSEQUENCES: If fails, no agent communication possible
         */
        it('should deliver message to subscriber', async () => {
            const receivedMessages: Message[] = [];
            
            // Subscribe
            messageBus.subscribe('test-agent', [MessageType.TASK_CLAIMED], async (msg) => {
                receivedMessages.push(msg);
            });
            
            // Publish
            await messageBus.publish({
                type: MessageType.TASK_CLAIMED,
                from: 'publisher-agent',
                payload: { taskId: 'task-123' }
            });
            
            // Wait для async delivery
            await waitFor(() => receivedMessages.length > 0, { timeout: 1000 });
            
            expect(receivedMessages.length).toBe(1);
            expect(receivedMessages[0].type).toBe(MessageType.TASK_CLAIMED);
            expect(receivedMessages[0].from).toBe('publisher-agent');
            expect(receivedMessages[0].payload.taskId).toBe('task-123');
        });
        
        /**
         * INTENT: Verify multiple subscribers receive same message
         * WHY: Broadcast pattern - all interested agents должны receive
         */
        it('should deliver message to multiple subscribers', async () => {
            const agent1Messages: Message[] = [];
            const agent2Messages: Message[] = [];
            const agent3Messages: Message[] = [];
            
            // Multiple subscribers
            messageBus.subscribe('agent-1', [MessageType.SOLUTION_PROPOSED], async (msg) => {
                agent1Messages.push(msg);
            });
            
            messageBus.subscribe('agent-2', [MessageType.SOLUTION_PROPOSED], async (msg) => {
                agent2Messages.push(msg);
            });
            
            messageBus.subscribe('agent-3', [MessageType.SOLUTION_PROPOSED], async (msg) => {
                agent3Messages.push(msg);
            });
            
            // Publish once
            await messageBus.publish({
                type: MessageType.SOLUTION_PROPOSED,
                from: 'architect',
                payload: { solution: 'refactor code' }
            });
            
            await waitFor(() => 
                agent1Messages.length > 0 && 
                agent2Messages.length > 0 && 
                agent3Messages.length > 0,
                { timeout: 1000 }
            );
            
            // All should receive
            expect(agent1Messages.length).toBe(1);
            expect(agent2Messages.length).toBe(1);
            expect(agent3Messages.length).toBe(1);
        });
        
        /**
         * INTENT: Verify type filtering works
         * WHY: Agents should only receive messages they subscribed to
         */
        it('should filter messages by type', async () => {
            const taskMessages: Message[] = [];
            const solutionMessages: Message[] = [];
            
            // Subscribe to different types
            messageBus.subscribe('agent-1', [MessageType.TASK_CLAIMED], async (msg) => {
                taskMessages.push(msg);
            });
            
            messageBus.subscribe('agent-2', [MessageType.SOLUTION_PROPOSED], async (msg) => {
                solutionMessages.push(msg);
            });
            
            // Publish different types
            await messageBus.publish({
                type: MessageType.TASK_CLAIMED,
                from: 'agent-x',
                payload: {}
            });
            
            await messageBus.publish({
                type: MessageType.SOLUTION_PROPOSED,
                from: 'agent-y',
                payload: {}
            });
            
            await waitFor(() => taskMessages.length > 0 && solutionMessages.length > 0, {
                timeout: 1000
            });
            
            // Each should receive only их type
            expect(taskMessages.length).toBe(1);
            expect(taskMessages[0].type).toBe(MessageType.TASK_CLAIMED);
            
            expect(solutionMessages.length).toBe(1);
            expect(solutionMessages[0].type).toBe(MessageType.SOLUTION_PROPOSED);
        });
    });
    
    /**
     * INTENT: Verify P2P (peer-to-peer) communication
     * WHY: Direct agent-to-agent communication required для collaboration
     * ADDRESSES: Архитектура (P2P pattern)
     */
    describe('Peer-to-Peer Communication', () => {
        
        /**
         * INTENT: Verify direct message delivery
         * WHY: Agent может спросить specific другого агента
         */
        it('should deliver P2P message to specific agent', async () => {
            const agent1Messages: Message[] = [];
            const agent2Messages: Message[] = [];
            
            messageBus.subscribe('backend-agent', [MessageType.AGENT_QUESTION], async (msg) => {
                agent1Messages.push(msg);
            });
            
            messageBus.subscribe('frontend-agent', [MessageType.AGENT_QUESTION], async (msg) => {
                agent2Messages.push(msg);
            });
            
            // Send to specific agent
            await messageBus.sendTo('backend-agent', {
                type: MessageType.AGENT_QUESTION,
                from: 'qa-agent',
                to: 'backend-agent',
                payload: { question: 'How to test API?' }
            });
            
            await waitFor(() => agent1Messages.length > 0, { timeout: 1000 });
            
            // Only backend-agent should receive
            expect(agent1Messages.length).toBe(1);
            expect(agent2Messages.length).toBe(0);
        });
        
        /**
         * INTENT: Verify request-response pattern
         * WHY: Agent asks question, другой отвечает
         */
        it('should support request-response pattern', async () => {
            let responseReceived: Message | null = null;
            
            // Backend subscribes и отвечает
            messageBus.subscribe('backend-agent', [MessageType.AGENT_QUESTION], async (msg) => {
                await messageBus.respond(msg, MessageType.AGENT_ANSWER, {
                    answer: 'Use Jest with supertest'
                });
            });
            
            // QA subscribes для ответа
            messageBus.subscribe('qa-agent', [MessageType.AGENT_ANSWER], async (msg) => {
                if (msg.correlationId) {
                    responseReceived = msg;
                }
            });
            
            // QA asks question
            await messageBus.publish({
                id: 'question-123',
                type: MessageType.AGENT_QUESTION,
                from: 'qa-agent',
                to: 'backend-agent',
                payload: { question: 'How to test?' }
            });
            
            await waitFor(() => responseReceived !== null, { timeout: 2000 });
            
            expect(responseReceived).not.toBeNull();
            expect(responseReceived!.type).toBe(MessageType.AGENT_ANSWER);
            expect(responseReceived!.correlationId).toBe('question-123');
        });
    });
    
    /**
     * INTENT: Verify statistics tracking
     * WHY: Monitoring требует visibility message flow
     * ADDRESSES: Поддерживаемость (observability)
     */
    describe('Statistics & Monitoring', () => {
        
        /**
         * INTENT: Verify message count tracking
         * WHY: Need знать message volume для monitoring
         */
        it('should track total message count', async () => {
            const initialStats = messageBus.getStatistics();
            const initialTotal = initialStats.totalMessages;
            
            // Publish несколько messages
            await messageBus.publish({
                type: MessageType.TASK_CREATED,
                from: 'orchestrator',
                payload: {}
            });
            
            await messageBus.publish({
                type: MessageType.TASK_COMPLETED,
                from: 'worker',
                payload: {}
            });
            
            const updatedStats = messageBus.getStatistics();
            
            expect(updatedStats.totalMessages).toBe(initialTotal + 2);
        });
        
        /**
         * INTENT: Verify message tracking by type
         * WHY: Знать distribution message types важно
         */
        it('should track messages by type', async () => {
            // Publish messages разных типов
            await messageBus.publish({
                type: MessageType.TASK_CLAIMED,
                from: 'worker-1',
                payload: {}
            });
            
            await messageBus.publish({
                type: MessageType.TASK_CLAIMED,
                from: 'worker-2',
                payload: {}
            });
            
            await messageBus.publish({
                type: MessageType.SOLUTION_PROPOSED,
                from: 'architect',
                payload: {}
            });
            
            const stats = messageBus.getStatistics();
            
            expect(stats.byType[MessageType.TASK_CLAIMED]).toBeGreaterThanOrEqual(2);
            expect(stats.byType[MessageType.SOLUTION_PROPOSED]).toBeGreaterThanOrEqual(1);
        });
    });
    
    /**
     * INTENT: Verify subscription management
     * WHY: Agents должны subscribe/unsubscribe dynamically
     * ADDRESSES: Функциональность (lifecycle management)
     */
    describe('Subscription Management', () => {
        
        /**
         * INTENT: Verify unsubscribe works
         * WHY: Agent может stop listening когда не нужно
         */
        it('should stop delivering после unsubscribe', async () => {
            const messages: Message[] = [];
            
            messageBus.subscribe('test-agent', [MessageType.TASK_CREATED], async (msg) => {
                messages.push(msg);
            });
            
            // Publish before unsubscribe
            await messageBus.publish({
                type: MessageType.TASK_CREATED,
                from: 'orchestrator',
                payload: { taskId: '1' }
            });
            
            await waitFor(() => messages.length > 0, { timeout: 1000 });
            expect(messages.length).toBe(1);
            
            // Unsubscribe
            messageBus.unsubscribe('test-agent', MessageType.TASK_CREATED);
            
            // Publish after unsubscribe
            await messageBus.publish({
                type: MessageType.TASK_CREATED,
                from: 'orchestrator',
                payload: { taskId: '2' }
            });
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Should still be 1 (не received second)
            expect(messages.length).toBe(1);
        });
        
        /**
         * INTENT: Verify unsubscribeAll works
         * WHY: Clean shutdown требует unsubscribe всех
         */
        it('should remove all subscriptions для agent', async () => {
            const messages: Message[] = [];
            
            // Subscribe to multiple types
            messageBus.subscribe('test-agent', [
                MessageType.TASK_CREATED,
                MessageType.TASK_COMPLETED,
                MessageType.SOLUTION_PROPOSED
            ], async (msg) => {
                messages.push(msg);
            });
            
            // Unsubscribe all
            messageBus.unsubscribeAll('test-agent');
            
            // Try publish
            await messageBus.publish({
                type: MessageType.TASK_CREATED,
                from: 'test',
                payload: {}
            });
            
            await messageBus.publish({
                type: MessageType.SOLUTION_PROPOSED,
                from: 'test',
                payload: {}
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Should receive nothing
            expect(messages.length).toBe(0);
        });
    });
    
    /**
     * INTENT: Verify error handling and resilience
     * WHY: Message bus должен быть robust против errors
     * ADDRESSES: Безопасность (error resilience)
     */
    describe('Error Handling & Resilience', () => {
        
        /**
         * INTENT: Verify handler error doesn't crash bus
         * WHY: One agent's error shouldn't affect others
         */
        it('should continue delivery если handler throws', async () => {
            const agent1Messages: Message[] = [];
            const agent2Messages: Message[] = [];
            
            // Agent 1: throws error
            messageBus.subscribe('agent-1', [MessageType.TASK_CLAIMED], async (msg) => {
                throw new Error('Handler error!');
            });
            
            // Agent 2: works fine
            messageBus.subscribe('agent-2', [MessageType.TASK_CLAIMED], async (msg) => {
                agent2Messages.push(msg);
            });
            
            // Publish
            await messageBus.publish({
                type: MessageType.TASK_CLAIMED,
                from: 'worker',
                payload: {}
            });
            
            await waitFor(() => agent2Messages.length > 0, { timeout: 1000 });
            
            // Agent 2 should still receive despite agent 1 error
            expect(agent2Messages.length).toBe(1);
        });
        
        /**
         * INTENT: Verify invalid message handled gracefully
         * WHY: Protect против malformed messages
         */
        it('should handle missing message fields gracefully', async () => {
            // Should not throw
            await expect(messageBus.publish({} as any)).resolves.not.toThrow();
            
            await expect(messageBus.publish({
                type: MessageType.TASK_CREATED,
                // Missing 'from'
                payload: {}
            } as any)).resolves.not.toThrow();
        });
    });
    
    /**
     * INTENT: Verify performance characteristics
     * WHY: MessageBus должен быть fast (high throughput)
     * ADDRESSES: Производительность (message throughput)
     */
    describe('Performance', () => {
        
        /**
         * INTENT: Verify high message throughput
         * WHY: Many agents publishing simultaneously
         */
        it('should handle rapid message publishing', async () => {
            const messageCount = 1000;
            const receivedMessages: Message[] = [];
            
            messageBus.subscribe('test-agent', [MessageType.TASK_CREATED], async (msg) => {
                receivedMessages.push(msg);
            });
            
            const start = performance.now();
            
            // Publish many messages
            const promises = [];
            for (let i = 0; i < messageCount; i++) {
                promises.push(messageBus.publish({
                    type: MessageType.TASK_CREATED,
                    from: `agent-${i}`,
                    payload: { index: i }
                }));
            }
            
            await Promise.all(promises);
            
            const publishDuration = performance.now() - start;
            
            console.log(`Published ${messageCount} messages in ${publishDuration.toFixed(2)}ms`);
            console.log(`Throughput: ${(messageCount / publishDuration * 1000).toFixed(0)} msg/sec`);
            
            // Should be fast (< 1 second для 1000 messages)
            expect(publishDuration).toBeLessThan(1000);
            
            // Wait для delivery
            await waitFor(() => receivedMessages.length === messageCount, { 
                timeout: 5000 
            });
            
            expect(receivedMessages.length).toBe(messageCount);
        }, TEST_TIMEOUTS.PERFORMANCE);
        
        /**
         * INTENT: Verify statistics query не impact performance
         * WHY: Frequent monitoring queries
         */
        it('should retrieve statistics quickly', () => {
            const iterations = 10000;
            
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                messageBus.getStatistics();
            }
            const duration = performance.now() - start;
            
            console.log(`${iterations} stats queries in ${duration.toFixed(2)}ms`);
            
            // Should be very fast (< 100ms для 10k queries)
            expect(duration).toBeLessThan(100);
        });
    });
    
    /**
     * INTENT: Verify global message bus singleton
     * WHY: Application should use single shared bus
     * ADDRESSES: Архитектура (singleton pattern)
     */
    describe('Global Singleton', () => {
        
        /**
         * INTENT: Verify getGlobalMessageBus returns same instance
         * WHY: Singleton pattern для shared communication
         */
        it('should return same instance on multiple calls', () => {
            const bus1 = getGlobalMessageBus();
            const bus2 = getGlobalMessageBus();
            const bus3 = getGlobalMessageBus();
            
            expect(bus1).toBe(bus2);
            expect(bus2).toBe(bus3);
        });
        
        /**
         * INTENT: Verify global bus works correctly
         * WHY: Actual usage pattern verification
         */
        it('should work as global communication channel', async () => {
            const globalBus = getGlobalMessageBus();
            const messages: Message[] = [];
            
            globalBus.subscribe('test-agent', [MessageType.AGENT_STARTED], async (msg) => {
                messages.push(msg);
            });
            
            await globalBus.publish({
                type: MessageType.AGENT_STARTED,
                from: 'backend-agent',
                payload: {}
            });
            
            await waitFor(() => messages.length > 0, { timeout: 1000 });
            
            expect(messages.length).toBeGreaterThan(0);
        });
    });
    
    /**
     * INTENT: Test concurrent operations safety
     * WHY: Multiple agents operating simultaneously
     * ADDRESSES: Надежность (thread safety)
     */
    describe('Concurrent Operations', () => {
        
        /**
         * INTENT: Verify concurrent publishing safe
         * WHY: Many agents publish at once
         */
        it('should handle concurrent publishing safely', async () => {
            const concurrentPublishers = 50;
            const messagesPerPublisher = 10;
            const receivedMessages: Message[] = [];
            
            messageBus.subscribe('test-agent', [MessageType.TASK_CREATED], async (msg) => {
                receivedMessages.push(msg);
            });
            
            const promises: Promise<void>[] = [];
            
            for (let i = 0; i < concurrentPublishers; i++) {
                const promise = (async () => {
                    for (let j = 0; j < messagesPerPublisher; j++) {
                        await messageBus.publish({
                            type: MessageType.TASK_CREATED,
                            from: `agent-${i}`,
                            payload: { publisher: i, message: j }
                        });
                    }
                })();
                
                promises.push(promise);
            }
            
            await Promise.all(promises);
            
            await waitFor(() => 
                receivedMessages.length === concurrentPublishers * messagesPerPublisher,
                { timeout: 5000 }
            );
            
            expect(receivedMessages.length).toBe(concurrentPublishers * messagesPerPublisher);
        }, TEST_TIMEOUTS.INTEGRATION);
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track что протестировано
 * 
 * Coverage Summary:
 * - ✅ Pub/Sub pattern (publish/subscribe/filter)
 * - ✅ P2P communication (sendTo/request-response)
 * - ✅ Statistics tracking (total/by type)
 * - ✅ Subscription management (subscribe/unsubscribe/unsubscribeAll)
 * - ✅ Error handling (handler errors, invalid messages)
 * - ✅ Performance (throughput, stats queries)
 * - ✅ Global singleton (getGlobalMessageBus)
 * - ✅ Concurrent operations (parallel publishing)
 * 
 * Not covered (future):
 * - ⏳ Message persistence (if implemented)
 * - ⏳ Message replay (if implemented)
 * - ⏳ Priority messaging (if implemented)
 * - ⏳ Message filtering by sender (if needed)
 * 
 * Estimated coverage: ~80% of MessageBus functionality
 */
