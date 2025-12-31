/**
 * INTENT: Comprehensive tests для UsageTracker (cost monitoring и usage analytics)
 * WHY: UsageTracker критичен для cost control, usage analysis, и billing
 * ADDRESSES: Phase 3 Coverage Expansion - cost management testing
 * CONSEQUENCES: If UsageTracker fails, no visibility into LLM costs и usage
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { UsageTracker, UsageStats, ProviderUsageStats } from '../usage-tracker';
import { ModelProviderType, CallResult } from '../base-provider';
import { createMockVSCodeContext } from '../../../__tests__/helpers/test-utils';

describe('UsageTracker - Comprehensive Tests', () => {
    let tracker: UsageTracker;
    let mockContext: any;
    
    beforeEach(() => {
        // Reset singleton
        (UsageTracker as any).instance = undefined;
        
        mockContext = createMockVSCodeContext();
        tracker = UsageTracker.getInstance(mockContext);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    /**
     * INTENT: Verify Singleton pattern
     * WHY: Only one tracker instance для consistent stats
     * ADDRESSES: Design pattern correctness
     */
    describe('Singleton Pattern', () => {
        
        /**
         * INTENT: Verify getInstance returns same instance
         * WHY: Single source of truth для usage data
         */
        it('should return same instance on multiple calls', () => {
            const instance1 = UsageTracker.getInstance(mockContext);
            const instance2 = UsageTracker.getInstance(mockContext);
            
            expect(instance1).toBe(instance2);
        });
        
        /**
         * INTENT: Verify initialization with context
         * WHY: Context needed для persistence
         */
        it('should initialize with extension context', () => {
            expect(tracker).toBeDefined();
        });
    });
    
    /**
     * INTENT: Verify usage tracking functionality
     * WHY: Core functionality - track LLM usage
     * ADDRESSES: Usage monitoring
     */
    describe('Usage Tracking', () => {
        
        /**
         * INTENT: Verify basic usage tracking
         * WHY: Foundation of cost monitoring
         */
        it('should track successful API call', () => {
            const result: CallResult = {
                success: true,
                response: 'Test response',
                tokensUsed: {
                    input: 100,
                    output: 50,
                    total: 150
                },
                cost: 0.0025,
                responseTime: 1500
            };
            
            tracker.trackUsage('openai', 'test-agent', result);
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats.length).toBe(1);
            expect(stats[0].calls).toBe(1);
            expect(stats[0].totalTokens.input).toBe(100);
            expect(stats[0].totalTokens.output).toBe(50);
            expect(stats[0].totalCost).toBe(0.0025);
        });
        
        /**
         * INTENT: Verify error tracking
         * WHY: Need to track failed calls для reliability metrics
         */
        it('should track failed API call', () => {
            const result: CallResult = {
                success: false,
                error: 'API error'
            };
            const error = new Error('API failed');
            
            tracker.trackUsage('openai', 'test-agent', result, error);
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats[0].errors).toBe(1);
            expect(stats[0].calls).toBe(1);
        });
        
        /**
         * INTENT: Verify multiple calls accumulation
         * WHY: Stats должны accumulate over time
         */
        it('should accumulate stats across multiple calls', () => {
            const call1: CallResult = {
                success: true,
                response: 'Response 1',
                tokensUsed: { input: 100, output: 50, total: 150 },
                cost: 0.0025,
                responseTime: 1000
            };
            
            const call2: CallResult = {
                success: true,
                response: 'Response 2',
                tokensUsed: { input: 200, output: 100, total: 300 },
                cost: 0.005,
                responseTime: 2000
            };
            
            tracker.trackUsage('openai', 'test-agent', call1);
            tracker.trackUsage('openai', 'test-agent', call2);
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats[0].calls).toBe(2);
            expect(stats[0].totalTokens.input).toBe(300);
            expect(stats[0].totalTokens.output).toBe(150);
            expect(stats[0].totalCost).toBe(0.0075);
        });
        
        /**
         * INTENT: Verify average response time calculation
         * WHY: Performance monitoring depends on averages
         */
        it('should calculate average response time correctly', () => {
            const calls: CallResult[] = [
                { success: true, response: '1', responseTime: 1000 },
                { success: true, response: '2', responseTime: 2000 },
                { success: true, response: '3', responseTime: 3000 }
            ];
            
            calls.forEach(call => {
                tracker.trackUsage('openai', 'test-agent', call);
            });
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats[0].averageResponseTime).toBe(2000); // (1000+2000+3000)/3
        });
        
        /**
         * INTENT: Verify last used timestamp
         * WHY: Track когда agent last used provider
         */
        it('should update last used timestamp', () => {
            const result: CallResult = {
                success: true,
                response: 'Test'
            };
            
            const beforeTracking = new Date();
            tracker.trackUsage('openai', 'test-agent', result);
            const afterTracking = new Date();
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats[0].lastUsed).toBeDefined();
            expect(stats[0].lastUsed!.getTime()).toBeGreaterThanOrEqual(beforeTracking.getTime());
            expect(stats[0].lastUsed!.getTime()).toBeLessThanOrEqual(afterTracking.getTime());
        });
    });
    
    /**
     * INTENT: Verify agent-specific statistics
     * WHY: Need per-agent cost breakdown
     * ADDRESSES: Cost attribution
     */
    describe('Agent Statistics', () => {
        
        /**
         * INTENT: Verify stats filtered by agent
         * WHY: Each agent has separate usage
         */
        it('should return stats for specific agent', () => {
            const result1: CallResult = { success: true, response: '1' };
            const result2: CallResult = { success: true, response: '2' };
            
            tracker.trackUsage('openai', 'agent-1', result1);
            tracker.trackUsage('anthropic', 'agent-1', result2);
            tracker.trackUsage('openai', 'agent-2', result1);
            
            const agent1Stats = tracker.getAgentStats('agent-1');
            expect(agent1Stats.length).toBe(2); // 2 providers
            expect(agent1Stats.every(s => s.agentId === 'agent-1')).toBe(true);
        });
        
        /**
         * INTENT: Verify empty array для unknown agent
         * WHY: Graceful handling для new agents
         */
        it('should return empty array for agent with no usage', () => {
            const stats = tracker.getAgentStats('unknown-agent');
            expect(stats).toEqual([]);
        });
        
        /**
         * INTENT: Verify multiple providers per agent
         * WHY: Agents can use multiple providers
         */
        it('should track multiple providers for same agent', () => {
            tracker.trackUsage('openai', 'multi-agent', { success: true, response: '1' });
            tracker.trackUsage('anthropic', 'multi-agent', { success: true, response: '2' });
            tracker.trackUsage('google', 'multi-agent', { success: true, response: '3' });
            
            const stats = tracker.getAgentStats('multi-agent');
            expect(stats.length).toBe(3);
            
            const providers = stats.map(s => s.provider);
            expect(providers).toContain('openai');
            expect(providers).toContain('anthropic');
            expect(providers).toContain('google');
        });
    });
    
    /**
     * INTENT: Verify provider-level statistics
     * WHY: Need provider-wide cost и usage metrics
     * ADDRESSES: Provider comparison и optimization
     */
    describe('Provider Statistics', () => {
        
        /**
         * INTENT: Verify provider stats aggregation
         * WHY: Aggregate across all agents using provider
         */
        it('should aggregate stats across all agents for provider', () => {
            const result: CallResult = {
                success: true,
                response: 'Test',
                tokensUsed: { input: 100, output: 50, total: 150 },
                cost: 0.0025
            };
            
            tracker.trackUsage('openai', 'agent-1', result);
            tracker.trackUsage('openai', 'agent-2', result);
            tracker.trackUsage('openai', 'agent-3', result);
            
            const providerStats = tracker.getProviderStats('openai');
            expect(providerStats).toBeDefined();
            expect(providerStats!.totalCalls).toBe(3);
            expect(providerStats!.totalTokens.input).toBe(300);
            expect(providerStats!.totalCost).toBe(0.0075);
        });
        
        /**
         * INTENT: Verify success rate calculation
         * WHY: Track provider reliability
         */
        it('should calculate success rate correctly', () => {
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '1' });
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '2' });
            tracker.trackUsage('openai', 'agent-1', { success: false, error: 'Error' }, new Error());
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '4' });
            
            const providerStats = tracker.getProviderStats('openai');
            expect(providerStats!.successRate).toBeCloseTo(0.75, 2); // 3/4 = 75%
        });
        
        /**
         * INTENT: Verify provider average response time
         * WHY: Compare provider performance
         */
        it('should calculate provider average response time', () => {
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '1', responseTime: 1000 });
            tracker.trackUsage('openai', 'agent-2', { success: true, response: '2', responseTime: 2000 });
            tracker.trackUsage('openai', 'agent-3', { success: true, response: '3', responseTime: 3000 });
            
            const providerStats = tracker.getProviderStats('openai');
            expect(providerStats!.averageResponseTime).toBe(2000);
        });
        
        /**
         * INTENT: Verify undefined для unused provider
         * WHY: Graceful handling
         */
        it('should return undefined for provider with no usage', () => {
            const stats = tracker.getProviderStats('ollama');
            expect(stats).toBeUndefined();
        });
    });
    
    /**
     * INTENT: Verify cost calculations
     * WHY: Cost control depends on accurate calculations
     * ADDRESSES: Billing и budgeting
     */
    describe('Cost Calculations', () => {
        
        /**
         * INTENT: Verify cost accumulation
         * WHY: Track total spending
         */
        it('should accumulate costs correctly', () => {
            const costs = [0.001, 0.002, 0.003, 0.004];
            
            costs.forEach(cost => {
                tracker.trackUsage('openai', 'test-agent', {
                    success: true,
                    response: 'Test',
                    cost
                });
            });
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats[0].totalCost).toBeCloseTo(0.010, 3); // Sum = 0.01
        });
        
        /**
         * INTENT: Verify cost per agent tracking
         * WHY: Cost attribution critical для budgeting
         */
        it('should track costs separately per agent', () => {
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '1', cost: 0.05 });
            tracker.trackUsage('openai', 'agent-2', { success: true, response: '2', cost: 0.03 });
            
            const agent1Stats = tracker.getAgentStats('agent-1');
            const agent2Stats = tracker.getAgentStats('agent-2');
            
            expect(agent1Stats[0].totalCost).toBe(0.05);
            expect(agent2Stats[0].totalCost).toBe(0.03);
        });
    });
    
    /**
     * INTENT: Verify token tracking
     * WHY: Token usage affects cost и rate limits
     * ADDRESSES: Token management
     */
    describe('Token Tracking', () => {
        
        /**
         * INTENT: Verify input/output token separation
         * WHY: Different costs для input vs output
         */
        it('should track input and output tokens separately', () => {
            tracker.trackUsage('openai', 'test-agent', {
                success: true,
                response: 'Test',
                tokensUsed: {
                    input: 500,
                    output: 300,
                    total: 800
                }
            });
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats[0].totalTokens.input).toBe(500);
            expect(stats[0].totalTokens.output).toBe(300);
        });
        
        /**
         * INTENT: Verify token accumulation
         * WHY: Track total token usage
         */
        it('should accumulate tokens across calls', () => {
            tracker.trackUsage('openai', 'test-agent', {
                success: true,
                response: '1',
                tokensUsed: { input: 100, output: 50, total: 150 }
            });
            tracker.trackUsage('openai', 'test-agent', {
                success: true,
                response: '2',
                tokensUsed: { input: 200, output: 100, total: 300 }
            });
            
            const stats = tracker.getAgentStats('test-agent');
            expect(stats[0].totalTokens.input).toBe(300);
            expect(stats[0].totalTokens.output).toBe(150);
        });
    });
    
    /**
     * INTENT: Verify statistics reporting
     * WHY: Need summary reports для monitoring
     * ADDRESSES: Reporting и visualization
     */
    describe('Statistics Reporting', () => {
        
        /**
         * INTENT: Verify total stats retrieval
         * WHY: Dashboard needs overall statistics
         */
        it('should return total usage statistics', () => {
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '1', cost: 0.01 });
            tracker.trackUsage('anthropic', 'agent-2', { success: true, response: '2', cost: 0.02 });
            tracker.trackUsage('google', 'agent-3', { success: true, response: '3', cost: 0.03 });
            
            const totalStats = tracker.getTotalStats();
            
            expect(totalStats.totalCalls).toBe(3);
            expect(totalStats.totalCost).toBeCloseTo(0.06, 2);
        });
        
        /**
         * INTENT: Verify top agents by cost
         * WHY: Identify expensive agents
         */
        it('should return top agents by cost', () => {
            tracker.trackUsage('openai', 'expensive-agent', { success: true, response: '1', cost: 10.0 });
            tracker.trackUsage('openai', 'cheap-agent', { success: true, response: '2', cost: 0.01 });
            tracker.trackUsage('openai', 'medium-agent', { success: true, response: '3', cost: 1.0 });
            
            const topAgents = tracker.getTopAgentsByCost(2);
            
            expect(topAgents.length).toBe(2);
            expect(topAgents[0].agentId).toBe('expensive-agent');
            expect(topAgents[1].agentId).toBe('medium-agent');
        });
        
        /**
         * INTENT: Verify provider comparison
         * WHY: Compare cost/performance across providers
         */
        it('should enable provider comparison', () => {
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '1', cost: 0.05, responseTime: 1000 });
            tracker.trackUsage('anthropic', 'agent-1', { success: true, response: '2', cost: 0.03, responseTime: 1500 });
            
            const openaiStats = tracker.getProviderStats('openai');
            const anthropicStats = tracker.getProviderStats('anthropic');
            
            expect(openaiStats!.totalCost).toBeGreaterThan(anthropicStats!.totalCost);
            expect(openaiStats!.averageResponseTime).toBeLessThan(anthropicStats!.averageResponseTime);
        });
    });
    
    /**
     * INTENT: Verify stats reset functionality
     * WHY: Need to reset stats periodically (monthly, etc.)
     * ADDRESSES: Stats lifecycle management
     */
    describe('Statistics Reset', () => {
        
        /**
         * INTENT: Verify reset clears all stats
         * WHY: Fresh start для new period
         */
        it('should reset all statistics', () => {
            tracker.trackUsage('openai', 'agent-1', { success: true, response: '1', cost: 0.05 });
            tracker.trackUsage('anthropic', 'agent-2', { success: true, response: '2', cost: 0.03 });
            
            tracker.resetStats();
            
            const totalStats = tracker.getTotalStats();
            expect(totalStats.totalCalls).toBe(0);
            expect(totalStats.totalCost).toBe(0);
        });
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track what's tested и gaps
 * 
 * Coverage Summary:
 * - ✅ Singleton pattern (instance management)
 * - ✅ Usage tracking (successful/failed calls, accumulation)
 * - ✅ Agent statistics (per-agent breakdown, filtering)
 * - ✅ Provider statistics (aggregation, success rate, averages)
 * - ✅ Cost calculations (accumulation, per-agent, totals)
 * - ✅ Token tracking (input/output separation, accumulation)
 * - ✅ Statistics reporting (totals, top agents, comparisons)
 * - ✅ Stats reset (lifecycle management)
 * 
 * Not covered (future):
 * - ⏳ Stats persistence (save/load from storage)
 * - ⏳ Historical data (time-series analysis)
 * - ⏳ Budget alerts (threshold notifications)
 * - ⏳ Cost predictions (trend analysis)
 * - ⏳ Export functionality (CSV, JSON)
 * - ⏳ Real-time monitoring (live updates)
 * 
 * Estimated coverage: ~70% of UsageTracker functionality
 */
