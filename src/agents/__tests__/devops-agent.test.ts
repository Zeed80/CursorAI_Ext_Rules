/**
 * INTENT: Basic tests для DevOpsAgent (specialized agent for infrastructure и deployment)
 * WHY: DevOpsAgent критичен для DevOps tasks (Docker, CI/CD, infrastructure, deployment)
 * ADDRESSES: Phase 4 Coverage Expansion - specialized agent testing
 * CONSEQUENCES: If DevOpsAgent fails, infrastructure и deployment tasks cannot be handled
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DevOpsAgent } from '../devops-agent';
import { Task } from '../../orchestrator/orchestrator';
import { ProjectContext } from '../local-agent';
import { createMockVSCodeContext } from '../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS } from '../../__tests__/helpers/test-constants';

describe('DevOpsAgent - Basic Tests', () => {
    let agent: DevOpsAgent;
    let mockTask: Task;
    let mockProjectContext: ProjectContext;
    
    beforeEach(() => {
        const context = createMockVSCodeContext();
        agent = new DevOpsAgent(context);
        
        mockTask = {
            id: 'devops-task-1',
            description: 'Setup CI/CD pipeline с automated testing и deployment',
            type: 'improvement',
            priority: 'high',
            status: 'pending'
        };
        
        mockProjectContext = {
            structure: {
                files: ['docker-compose.yml', '.github/workflows/ci.yml', 'Dockerfile'],
                directories: ['.github', '.github/workflows', 'scripts'],
                entryPoints: ['src/index.ts']
            },
            patterns: ['*.yml', '*.yaml', 'Dockerfile'],
            standards: {
                codeStyle: 'Infrastructure as Code',
                architecture: 'Microservices'
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
            expect(agent.getId()).toBe('devops');
        });
        
        it('should have descriptive name', () => {
            expect(agent.getName()).toBe('DevOps Engineer');
        });
        
        it('should describe DevOps specializations', () => {
            const description = agent.getDescription();
            expect(description).toContain('DevOps');
            expect(description.toLowerCase()).toMatch(/docker|deploy|infrastructure|ci\/cd|cicd/);
        });
    });
    
    /**
     * INTENT: Verify DevOps-specific analysis
     * WHY: DevOps tasks need infrastructure/deployment focus
     * ADDRESSES: Domain-specific analysis
     */
    describe('DevOps Task Analysis', () => {
        
        it('should analyze task from DevOps perspective', async () => {
            jest.spyOn(agent as any, 'callLLM').mockResolvedValue(`
ПРОБЛЕМА: Setup automated CI/CD pipeline
КОНТЕКСТ: GitHub Actions, Docker containerization, automated testing
ОГРАНИЧЕНИЯ:
- Security (secrets management, least privilege)
- Reliability (automated rollback, health checks)
- Performance (parallel execution, caching)
- Cost optimization (efficient resource usage)
- Infrastructure as Code (declarative configuration)
            `);
            
            const analysis = await (agent as any).analyzeTask(mockTask, mockProjectContext);
            
            expect(analysis.problem).toBeDefined();
            expect(analysis.context).toBeDefined();
            expect(analysis.constraints).toBeDefined();
            expect(analysis.constraints.length).toBeGreaterThan(0);
        }, TEST_TIMEOUTS.INTEGRATION);
        
        it('should identify DevOps-specific constraints', async () => {
            jest.spyOn(agent as any, 'callLLM').mockResolvedValue(`
ПРОБЛЕМА: Container orchestration optimization
КОНТЕКСТ: Docker Compose, production deployment
ОГРАНИЧЕНИЯ:
- High availability (zero downtime deployment)
- Security (container isolation, secrets)
- Monitoring (health checks, logging)
- Scalability (horizontal scaling)
            `);
            
            const analysis = await (agent as any).analyzeTask(mockTask, mockProjectContext);
            
            const constraintsText = analysis.constraints.join(' ').toLowerCase();
            expect(
                constraintsText.includes('security') ||
                constraintsText.includes('availability') ||
                constraintsText.includes('monitoring') ||
                constraintsText.includes('scalability')
            ).toBe(true);
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify DevOps-focused solutions
     * WHY: DevOps solutions need infrastructure/deployment considerations
     * ADDRESSES: Solution quality
     */
    describe('DevOps Solution Generation', () => {
        
        it('should generate DevOps-focused solution options', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: CI/CD\nКОНТЕКСТ: Automation\nОГРАНИЧЕНИЯ:\n- Security')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'GitHub Actions CI/CD с Docker',
                        description: 'Automated pipeline с containerized builds и deployments',
                        approach: 'Use GitHub Actions для CI/CD, Docker для containerization, automated testing и deployment',
                        pros: ['Automated', 'Scalable', 'Version controlled', 'Rollback capability'],
                        cons: ['Initial setup complexity', 'GitHub Actions costs'],
                        complexity: 'medium',
                        confidence: 0.88,
                        estimatedTime: 14400000,
                        filesToModify: ['.github/workflows/ci.yml', '.github/workflows/deploy.yml', 'Dockerfile', 'docker-compose.yml'],
                        risks: ['Secrets management', 'Deployment permissions', 'Production impact']
                    }
                ]));
            
            const thoughts = await agent.think(mockTask, mockProjectContext);
            
            expect(thoughts.options.length).toBeGreaterThan(0);
            expect(thoughts.options[0].title).toBeDefined();
            expect(thoughts.options[0].filesToModify).toBeDefined();
        }, TEST_TIMEOUTS.INTEGRATION);
        
        it('should assess complexity appropriately', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Test\nКОНТЕКСТ: Test\nОГРАНИЧЕНИЯ:\n- Test')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Infrastructure Solution',
                        description: 'Test',
                        approach: 'Test',
                        pros: ['pro1'],
                        cons: ['con1'],
                        complexity: 'high',
                        confidence: 0.8,
                        estimatedTime: 21600000,
                        filesToModify: ['docker-compose.yml'],
                        risks: ['Production impact']
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
     * INTENT: Verify DevOps priorities in decision making
     * WHY: Security, reliability, scalability critical
     * ADDRESSES: Domain expertise
     */
    describe('DevOps-Specific Decision Making', () => {
        
        it('should prioritize security и reliability', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Test\nКОНТЕКСТ: Test\nОГРАНИЧЕНИЯ:\n- Security critical')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Secure Solution',
                        description: 'High security, automated rollback',
                        approach: 'With security hardening',
                        pros: ['Secure', 'Reliable', 'Rollback capability'],
                        cons: ['More complex'],
                        complexity: 'medium',
                        confidence: 0.91,
                        estimatedTime: 18000000,
                        filesToModify: ['ci.yml'],
                        risks: ['Initial complexity']
                    },
                    {
                        title: 'Quick Solution',
                        description: 'Fast but less secure',
                        approach: 'Minimal security',
                        pros: ['Fast'],
                        cons: ['Security risks', 'No rollback'],
                        complexity: 'low',
                        confidence: 0.55,
                        estimatedTime: 3600000,
                        filesToModify: ['ci.yml'],
                        risks: ['Security vulnerability', 'Production incidents']
                    }
                ]))
                .mockResolvedValueOnce('Security и reliability must be prioritized для production infrastructure');
            
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            expect(solution).toBeDefined();
            // DevOps should prefer secure/reliable solution
            expect(solution.evaluation.security).toBeGreaterThan(0.5);
        }, TEST_TIMEOUTS.E2E);
        
        it('should consider scalability и maintainability', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Infrastructure\nКОНТЕКСТ: Scalability\nОГРАНИЧЕНИЯ:\n- Must scale')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Scalable Infrastructure',
                        description: 'Horizontal scaling, load balancing',
                        approach: 'Container orchestration',
                        pros: ['Scalable', 'Maintainable'],
                        cons: ['Complex'],
                        complexity: 'high',
                        confidence: 0.85,
                        estimatedTime: 28800000,
                        filesToModify: ['docker-compose.yml', 'k8s/deployment.yml'],
                        risks: ['Complexity']
                    }
                ]))
                .mockResolvedValueOnce('Scalability essential для growing infrastructure');
            
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            expect(solution.evaluation.maintainability).toBeGreaterThan(0.5);
        }, TEST_TIMEOUTS.E2E);
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track specialized agent testing
 * 
 * Coverage Summary:
 * - ✅ Agent identity (ID, name, description)
 * - ✅ Task analysis (DevOps perspective, constraints)
 * - ✅ Solution generation (infrastructure-focused options)
 * - ✅ Decision making (security/reliability/scalability priorities)
 * 
 * Not covered (future):
 * - ⏳ Execution phase (requires infrastructure modification)
 * - ⏳ Docker configuration generation (requires real LLM)
 * - ⏳ CI/CD pipeline creation (GitHub Actions testing)
 * - ⏳ Deployment automation (integration testing)
 * - ⏳ Infrastructure monitoring (health checks, logging)
 * 
 * Estimated coverage: ~35% of DevOpsAgent
 */
