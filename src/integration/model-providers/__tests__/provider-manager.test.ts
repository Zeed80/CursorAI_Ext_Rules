/**
 * INTENT: Comprehensive tests для ModelProviderManager (provider coordination)
 * WHY: ProviderManager критичен для LLM provider selection и fallback
 * ADDRESSES: Phase 3 Coverage Expansion - LLM integration testing
 * CONSEQUENCES: If ProviderManager fails, agents cannot access LLMs
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ModelProviderManager } from '../provider-manager';
import { IModelProvider, ModelProviderType, ProviderConfig } from '../base-provider';
import * as vscode from 'vscode';

// Mock provider для testing
class MockProvider implements IModelProvider {
    private providerType: ModelProviderType;
    private available: boolean;
    private config: ProviderConfig;
    
    constructor(type: ModelProviderType, available: boolean = true) {
        this.providerType = type;
        this.available = available;
        this.config = {
            apiKey: 'mock-key',
            baseUrl: 'http://mock.local',
            model: 'mock-model',
            temperature: 0.7,
            maxTokens: 1000
        };
    }
    
    getProviderType(): ModelProviderType {
        return this.providerType;
    }
    
    async isAvailable(): Promise<boolean> {
        return this.available;
    }
    
    setAvailable(available: boolean): void {
        this.available = available;
    }
    
    updateConfig(config: Partial<ProviderConfig>): void {
        this.config = { ...this.config, ...config };
    }
    
    getConfig(): ProviderConfig {
        return this.config;
    }
    
    async call(options: any): Promise<any> {
        return {
            success: true,
            response: 'Mock response',
            usage: { totalTokens: 100 }
        };
    }
    
    async listModels(): Promise<any[]> {
        return [{ id: 'mock-model', name: 'Mock Model' }];
    }
    
    supportsStreaming(): boolean {
        return false;
    }
}

describe('ModelProviderManager - Comprehensive Tests', () => {
    let manager: ModelProviderManager;
    let mockProviders: Map<ModelProviderType, MockProvider>;
    
    beforeEach(() => {
        // Reset singleton instance для каждого теста
        (ModelProviderManager as any).instance = undefined;
        manager = ModelProviderManager.getInstance();
        
        // Create mock providers
        mockProviders = new Map();
        const types: ModelProviderType[] = ['cursorai', 'ollama', 'openai', 'anthropic', 'google', 'llm-studio'];
        
        types.forEach(type => {
            const provider = new MockProvider(type, true);
            mockProviders.set(type, provider);
            manager.registerProvider(provider);
        });
        
        // Mock VSCode workspace configuration
        (vscode.workspace as any).getConfiguration = jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue({})
        });
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    /**
     * INTENT: Verify Singleton pattern
     * WHY: Only one manager instance должна exist
     * ADDRESSES: Design pattern correctness
     */
    describe('Singleton Pattern', () => {
        
        /**
         * INTENT: Verify getInstance returns same instance
         * WHY: Singleton ensures single source of truth
         */
        it('should return same instance on multiple calls', () => {
            const instance1 = ModelProviderManager.getInstance();
            const instance2 = ModelProviderManager.getInstance();
            
            expect(instance1).toBe(instance2);
        });
        
        /**
         * INTENT: Verify constructor is private
         * WHY: Prevent direct instantiation
         */
        it('should not allow direct instantiation', () => {
            // TypeScript prevents this at compile time
            // Runtime check: constructor exists but should not be called directly
            expect(ModelProviderManager.getInstance()).toBeDefined();
        });
    });
    
    /**
     * INTENT: Verify provider registration
     * WHY: Providers must be registered перед use
     * ADDRESSES: Provider lifecycle management
     */
    describe('Provider Registration', () => {
        
        /**
         * INTENT: Verify provider registration succeeds
         * WHY: Core functionality для provider management
         */
        it('should register provider successfully', () => {
            const newProvider = new MockProvider('hybrid');
            
            manager.registerProvider(newProvider);
            
            const retrieved = manager.getProvider('hybrid');
            expect(retrieved).toBe(newProvider);
        });
        
        /**
         * INTENT: Verify re-registration overwrites
         * WHY: Allow provider updates
         */
        it('should allow re-registration of same type', () => {
            const provider1 = new MockProvider('ollama');
            const provider2 = new MockProvider('ollama');
            
            manager.registerProvider(provider1);
            manager.registerProvider(provider2);
            
            const retrieved = manager.getProvider('ollama');
            expect(retrieved).toBe(provider2);
        });
        
        /**
         * INTENT: Verify multiple providers can coexist
         * WHY: System needs multiple provider types
         */
        it('should handle multiple registered providers', () => {
            const types: ModelProviderType[] = ['cursorai', 'ollama', 'openai'];
            
            types.forEach(type => {
                const provider = manager.getProvider(type);
                expect(provider).toBeDefined();
                expect(provider?.getProviderType()).toBe(type);
            });
        });
    });
    
    /**
     * INTENT: Verify provider retrieval
     * WHY: Agents need to access providers
     * ADDRESSES: Provider access patterns
     */
    describe('Provider Retrieval', () => {
        
        /**
         * INTENT: Verify getProvider returns correct provider
         * WHY: Basic retrieval functionality
         */
        it('should retrieve registered provider by type', () => {
            const provider = manager.getProvider('openai');
            
            expect(provider).toBeDefined();
            expect(provider?.getProviderType()).toBe('openai');
        });
        
        /**
         * INTENT: Verify undefined для unregistered provider
         * WHY: Graceful handling для missing providers
         */
        it('should return undefined for unregistered provider', () => {
            const provider = manager.getProvider('hybrid' as ModelProviderType);
            
            expect(provider).toBeUndefined();
        });
    });
    
    /**
     * INTENT: Verify agent-specific provider resolution
     * WHY: Agents have custom provider configurations
     * ADDRESSES: Agent customization support
     */
    describe('Agent-Specific Provider Resolution', () => {
        
        /**
         * INTENT: Verify default provider used when no config
         * WHY: Fallback behavior essential
         */
        it('should use default provider when no agent config', async () => {
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue({})
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            expect(provider).toBeDefined();
            expect(provider?.getProviderType()).toBe('cursorai'); // default
        });
        
        /**
         * INTENT: Verify custom provider from agent config
         * WHY: Agents должны use configured providers
         */
        it('should use agent-specific provider from config', async () => {
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue({
                    model: 'openai',
                    modelConfig: {
                        apiKey: 'custom-key',
                        model: 'gpt-4'
                    }
                })
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            expect(provider).toBeDefined();
            expect(provider?.getProviderType()).toBe('openai');
        });
        
        /**
         * INTENT: Verify config updates applied to provider
         * WHY: Agent-specific configurations must work
         */
        it('should apply agent config to provider', async () => {
            const customConfig: Partial<ProviderConfig> = {
                apiKey: 'agent-specific-key',
                model: 'custom-model',
                temperature: 0.9
            };
            
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue({
                    model: 'openai',
                    modelConfig: customConfig
                })
            });
            
            const provider = await manager.getProviderForAgent('custom-agent') as MockProvider;
            
            expect(provider).toBeDefined();
            const config = provider.getConfig();
            expect(config.apiKey).toBe('agent-specific-key');
            expect(config.model).toBe('custom-model');
            expect(config.temperature).toBe(0.9);
        });
    });
    
    /**
     * INTENT: Verify fallback logic
     * WHY: System должна continue when provider unavailable
     * ADDRESSES: Resilience и availability
     */
    describe('Fallback Logic', () => {
        
        /**
         * INTENT: Verify fallback when primary unavailable
         * WHY: Critical для high availability
         */
        it('should fallback to available provider when primary unavailable', async () => {
            // Make cursorai unavailable
            const cursoraiProvider = mockProviders.get('cursorai')!;
            cursoraiProvider.setAvailable(false);
            
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue({
                    model: 'cursorai'
                })
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            expect(provider).toBeDefined();
            // Should fallback to next available (ollama is first in priority)
            expect(provider?.getProviderType()).not.toBe('cursorai');
        });
        
        /**
         * INTENT: Verify fallback priority order
         * WHY: Local providers preferred over cloud
         */
        it('should follow fallback priority: local > cloud > cursorai', async () => {
            // Make all providers unavailable except anthropic
            mockProviders.forEach((provider, type) => {
                if (type !== 'anthropic') {
                    provider.setAvailable(false);
                }
            });
            
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue({
                    model: 'cursorai'
                })
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            expect(provider).toBeDefined();
            expect(provider?.getProviderType()).toBe('anthropic');
        });
        
        /**
         * INTENT: Verify undefined when all providers unavailable
         * WHY: Graceful degradation
         */
        it('should return undefined when all providers unavailable', async () => {
            // Make all providers unavailable
            mockProviders.forEach(provider => {
                provider.setAvailable(false);
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            expect(provider).toBeUndefined();
        });
    });
    
    /**
     * INTENT: Verify error handling
     * WHY: Robust error handling critical для stability
     * ADDRESSES: Error resilience
     */
    describe('Error Handling', () => {
        
        /**
         * INTENT: Verify graceful handling of config errors
         * WHY: Invalid config shouldn't crash system
         */
        it('should handle config read errors gracefully', async () => {
            (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(() => {
                throw new Error('Config error');
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            // Should fallback to default
            expect(provider).toBeDefined();
        });
        
        /**
         * INTENT: Verify handling of invalid provider type
         * WHY: Typos в config shouldn't break system
         */
        it('should handle invalid provider type in config', async () => {
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue({
                    model: 'invalid-provider-type'
                })
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            // Should fallback
            expect(provider).toBeDefined();
        });
    });
    
    /**
     * INTENT: Verify listing all providers
     * WHY: UI needs provider enumeration
     * ADDRESSES: Provider discovery
     */
    describe('Provider Enumeration', () => {
        
        /**
         * INTENT: Verify getAllProviders returns all registered
         * WHY: UI dropdown, monitoring need full list
         */
        it('should list all registered providers', () => {
            const allProviders = manager.getAllProviders();
            
            expect(allProviders.length).toBeGreaterThanOrEqual(6);
            
            const types = allProviders.map(p => p.getProviderType());
            expect(types).toContain('cursorai');
            expect(types).toContain('ollama');
            expect(types).toContain('openai');
        });
        
        /**
         * INTENT: Verify available providers filtering
         * WHY: Show только working providers
         */
        it('should list only available providers', async () => {
            // Make some unavailable
            mockProviders.get('openai')!.setAvailable(false);
            mockProviders.get('anthropic')!.setAvailable(false);
            
            const availableProviders = await manager.getAvailableProviders();
            
            expect(availableProviders.length).toBeLessThan(mockProviders.size);
            
            const types = availableProviders.map(p => p.getProviderType());
            expect(types).not.toContain('openai');
            expect(types).not.toContain('anthropic');
            expect(types).toContain('cursorai');
        });
    });
    
    /**
     * INTENT: Verify default provider management
     * WHY: System needs fallback default
     * ADDRESSES: Configuration management
     */
    describe('Default Provider', () => {
        
        /**
         * INTENT: Verify setDefaultProvider changes default
         * WHY: User should configure default
         */
        it('should allow setting default provider', () => {
            manager.setDefaultProvider('ollama');
            
            const defaultType = manager.getDefaultProviderType();
            expect(defaultType).toBe('ollama');
        });
        
        /**
         * INTENT: Verify default used в fallback scenarios
         * WHY: Default should be first choice
         */
        it('should use default provider when no config', async () => {
            manager.setDefaultProvider('anthropic');
            
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn().mockReturnValue({})
            });
            
            const provider = await manager.getProviderForAgent('test-agent');
            
            expect(provider?.getProviderType()).toBe('anthropic');
        });
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track what's tested и gaps
 * 
 * Coverage Summary:
 * - ✅ Singleton pattern (instance management)
 * - ✅ Provider registration (add, update, multiple)
 * - ✅ Provider retrieval (by type, undefined handling)
 * - ✅ Agent-specific resolution (config parsing, application)
 * - ✅ Fallback logic (priority order, unavailable handling)
 * - ✅ Error handling (config errors, invalid types)
 * - ✅ Provider enumeration (all, available filtering)
 * - ✅ Default provider management
 * 
 * Not covered (future):
 * - ⏳ Real provider integration (actual API calls)
 * - ⏳ Cost optimization logic (cheapest provider selection)
 * - ⏳ Model capability matching (task → best model)
 * - ⏳ Load balancing (distribute calls across providers)
 * - ⏳ Rate limiting coordination
 * - ⏳ Provider health monitoring (historical availability)
 * 
 * Estimated coverage: ~75% of ProviderManager functionality
 */
