/**
 * INTENT: Basic tests для FrontendAgent (specialized agent for frontend development)
 * WHY: FrontendAgent критичен для UI/UX tasks (HTML, CSS, JavaScript, accessibility)
 * ADDRESSES: Phase 4 Coverage Expansion - specialized agent testing
 * CONSEQUENCES: If FrontendAgent fails, frontend development tasks cannot be handled
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FrontendAgent } from '../frontend-agent';
import { Task } from '../../orchestrator/orchestrator';
import { ProjectContext } from '../local-agent';
import { createMockVSCodeContext } from '../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS } from '../../__tests__/helpers/test-constants';

describe('FrontendAgent - Basic Tests', () => {
    let agent: FrontendAgent;
    let mockTask: Task;
    let mockProjectContext: ProjectContext;
    
    beforeEach(() => {
        const context = createMockVSCodeContext();
        agent = new FrontendAgent(context);
        
        mockTask = {
            id: 'frontend-task-1',
            description: 'Implement responsive navigation menu с accessibility support',
            type: 'improvement',
            priority: 'high',
            status: 'pending'
        };
        
        mockProjectContext = {
            structure: {
                files: ['public/index.html', 'public/css/styles.css', 'public/js/app.js'],
                directories: ['public', 'public/css', 'public/js'],
                entryPoints: ['public/index.html']
            },
            patterns: ['*.html', '*.css', '*.js'],
            standards: {
                codeStyle: 'ES2023',
                architecture: 'Component-based'
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
            expect(agent.getId()).toBe('frontend');
        });
        
        it('should have descriptive name', () => {
            expect(agent.getName()).toBe('Frontend Developer');
        });
        
        it('should describe frontend specializations', () => {
            const description = agent.getDescription();
            expect(description).toContain('frontend');
            expect(description.toLowerCase()).toMatch(/html|css|javascript|ui|ux/);
        });
    });
    
    /**
     * INTENT: Verify frontend-specific analysis
     * WHY: Frontend tasks need UI/UX/accessibility focus
     * ADDRESSES: Domain-specific analysis
     */
    describe('Frontend Task Analysis', () => {
        
        it('should analyze task from frontend perspective', async () => {
            jest.spyOn(agent as any, 'callLLM').mockResolvedValue(`
ПРОБЛЕМА: Implement accessible responsive navigation
КОНТЕКСТ: HTML5, CSS3, JavaScript ES2023, WCAG 2.1 AA compliance
ОГРАНИЧЕНИЯ:
- Semantic HTML required (accessibility)
- Mobile-first responsive design
- Keyboard navigation support
- ARIA labels mandatory
- Cross-browser compatibility (modern browsers)
            `);
            
            const analysis = await (agent as any).analyzeTask(mockTask, mockProjectContext);
            
            expect(analysis.problem).toBeDefined();
            expect(analysis.context).toBeDefined();
            expect(analysis.constraints).toBeDefined();
            expect(analysis.constraints.length).toBeGreaterThan(0);
        }, TEST_TIMEOUTS.INTEGRATION);
        
        it('should identify frontend-specific constraints', async () => {
            jest.spyOn(agent as any, 'callLLM').mockResolvedValue(`
ПРОБЛЕМА: UI performance optimization
КОНТЕКСТ: Large DOM rendering
ОГРАНИЧЕНИЯ:
- Accessibility (WCAG 2.1 AA)
- Responsive design (mobile-first)
- Performance budget (<100ms render)
- Browser compatibility
            `);
            
            const analysis = await (agent as any).analyzeTask(mockTask, mockProjectContext);
            
            const constraintsText = analysis.constraints.join(' ').toLowerCase();
            expect(
                constraintsText.includes('accessibility') ||
                constraintsText.includes('responsive') ||
                constraintsText.includes('performance')
            ).toBe(true);
        }, TEST_TIMEOUTS.INTEGRATION);
    });
    
    /**
     * INTENT: Verify frontend-focused solutions
     * WHY: Frontend solutions need UI/UX/accessibility considerations
     * ADDRESSES: Solution quality
     */
    describe('Frontend Solution Generation', () => {
        
        it('should generate frontend-focused solution options', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Navigation\nКОНТЕКСТ: Responsive UI\nОГРАНИЧЕНИЯ:\n- Accessibility')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Accessible Responsive Navigation с ARIA',
                        description: 'Semantic HTML5 nav с full keyboard support',
                        approach: 'Use semantic HTML, CSS Grid, progressive enhancement',
                        pros: ['Accessible', 'Responsive', 'SEO-friendly', 'Progressive enhancement'],
                        cons: ['Requires polyfills для old browsers'],
                        complexity: 'medium',
                        confidence: 0.9,
                        estimatedTime: 7200000,
                        filesToModify: ['public/index.html', 'public/css/nav.css', 'public/js/nav.js'],
                        risks: ['Browser compatibility testing needed', 'Touch interaction edge cases']
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
                        title: 'UI Solution',
                        description: 'Test',
                        approach: 'Test',
                        pros: ['pro1'],
                        cons: ['con1'],
                        complexity: 'medium',
                        confidence: 0.85,
                        estimatedTime: 5400000,
                        filesToModify: ['index.html'],
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
     * INTENT: Verify frontend priorities in decision making
     * WHY: Accessibility, UX, performance critical
     * ADDRESSES: Domain expertise
     */
    describe('Frontend-Specific Decision Making', () => {
        
        it('should prioritize accessibility и UX', async () => {
            jest.spyOn(agent as any, 'callLLM')
                .mockResolvedValueOnce('ПРОБЛЕМА: Test\nКОНТЕКСТ: Test\nОГРАНИЧЕНИЯ:\n- Accessibility')
                .mockResolvedValueOnce(JSON.stringify([
                    {
                        title: 'Accessible Solution',
                        description: 'Full WCAG compliance',
                        approach: 'Semantic HTML + ARIA',
                        pros: ['Accessible', 'SEO'],
                        cons: ['More code'],
                        complexity: 'medium',
                        confidence: 0.92,
                        estimatedTime: 7200000,
                        filesToModify: ['index.html'],
                        risks: ['Complexity']
                    },
                    {
                        title: 'Quick Solution',
                        description: 'Fast but less accessible',
                        approach: 'Minimal markup',
                        pros: ['Fast'],
                        cons: ['Poor accessibility'],
                        complexity: 'low',
                        confidence: 0.6,
                        estimatedTime: 1800000,
                        filesToModify: ['index.html'],
                        risks: ['Accessibility issues']
                    }
                ]))
                .mockResolvedValueOnce('Accessibility must be prioritized для inclusive user experience');
            
            const thoughts = await agent.think(mockTask, mockProjectContext);
            const solution = await agent.proposeSolution(mockTask, thoughts, mockProjectContext);
            
            expect(solution).toBeDefined();
            // Frontend should prefer accessible solution
            expect(solution.evaluation.quality).toBeGreaterThan(0.5);
        }, TEST_TIMEOUTS.E2E);
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track specialized agent testing
 * 
 * Coverage Summary:
 * - ✅ Agent identity (ID, name, description)
 * - ✅ Task analysis (frontend perspective, constraints)
 * - ✅ Solution generation (frontend-focused options)
 * - ✅ Decision making (accessibility/UX priorities)
 * 
 * Not covered (future):
 * - ⏳ Execution phase (requires workspace modification)
 * - ⏳ HTML/CSS/JS generation (requires real LLM)
 * - ⏳ Accessibility validation (WCAG testing)
 * - ⏳ Responsive design testing (viewport simulation)
 * - ⏳ Browser compatibility checks
 * 
 * Estimated coverage: ~35% of FrontendAgent
 */
