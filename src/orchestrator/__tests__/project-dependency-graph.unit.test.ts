/**
 * Unit Tests для ProjectDependencyGraph
 * 
 * INTENT: Проверка correctness graph operations
 * ПОЧЕМУ: Оптимизация может сломать correctness - нужны invariant tests
 * ПОСЛЕДСТВИЯ: Без correctness tests баги в dependency resolution попадут в production
 */

import { ProjectDependencyGraph, DependencyGraph, ImpactAnalysis } from '../project-dependency-graph';
import { createTempWorkspace, waitFor, expectArrayToContainSameElements } from '../../__tests__/helpers/test-utils';
import { mockDependencyGraph } from '../../__tests__/helpers/mock-factories';
import { TEST_TIMEOUTS } from '../../__tests__/helpers/test-constants';
import * as fs from 'fs';
import * as path from 'path';

describe('ProjectDependencyGraph Unit Tests', () => {
    jest.setTimeout(TEST_TIMEOUTS.UNIT);

    /**
     * INTENT: Проверка базовой функциональности buildGraph()
     * ПОЧЕМУ: Core functionality - должен правильно строить граф из файлов
     * ПОСЛЕДСТВИЯ: Если неправильно парсит dependencies, impact analysis будет неверным
     */
    describe('buildGraph()', () => {
        it('should build dependency graph from source files', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                // Создаём файлы с зависимостями: fileB → fileA
                fs.writeFileSync(
                    path.join(srcDir, 'fileA.ts'),
                    'export function funcA() { return "A"; }',
                    'utf-8'
                );

                fs.writeFileSync(
                    path.join(srcDir, 'fileB.ts'),
                    'import { funcA } from "./fileA";\nexport function funcB() { return funcA(); }',
                    'utf-8'
                );

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };

                // Act
                await graph.buildGraph();
                const result = graph.getGraph();

                // Assert
                expect(result).not.toBeNull();
                expect(result!.files).toHaveProperty('src/fileA.ts');
                expect(result!.files).toHaveProperty('src/fileB.ts');

                // fileB должен импортировать fileA
                expect(result!.files['src/fileB.ts'].imports).toContain('./fileA');

                // fileA должен экспортировать funcA
                expect(result!.files['src/fileA.ts'].exports).toContain('funcA');
            } finally {
                await tempWorkspace.cleanup();
            }
        });

        it('should build dependents correctly', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                fs.writeFileSync(
                    path.join(srcDir, 'base.ts'),
                    'export const BASE = "base";',
                    'utf-8'
                );

                fs.writeFileSync(
                    path.join(srcDir, 'dependent1.ts'),
                    'import { BASE } from "./base";',
                    'utf-8'
                );

                fs.writeFileSync(
                    path.join(srcDir, 'dependent2.ts'),
                    'import { BASE } from "./base";',
                    'utf-8'
                );

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };

                // Act
                await graph.buildGraph();
                const dependents = graph.getDependents('src/base.ts');

                // Assert
                expect(dependents).toHaveLength(2);
                expectArrayToContainSameElements(dependents, ['src/dependent1.ts', 'src/dependent2.ts']);
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });

    /**
     * INTENT: Проверка что incremental update дает тот же результат что и full rebuild
     * ПОЧЕМУ: Ключевой invariant для correctness оптимизации
     * ПОСЛЕДСТВИЯ: Если результаты расходятся, incremental update содержит баг
     */
    describe('updateFile() correctness invariant', () => {
        it('should produce same dependents as full rebuild after incremental update', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                // Создаём chain: C → B → A
                fs.writeFileSync(path.join(srcDir, 'A.ts'), 'export const A = 1;', 'utf-8');
                fs.writeFileSync(path.join(srcDir, 'B.ts'), 'import { A } from "./A";\nexport const B = A + 1;', 'utf-8');
                fs.writeFileSync(path.join(srcDir, 'C.ts'), 'import { B } from "./B";\nexport const C = B + 1;', 'utf-8');

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Получаем dependents через initial build
                const initialDependents = graph.getDependents('src/A.ts');

                // Act - обновляем файл B через incremental update
                const fileBPath = path.join(srcDir, 'B.ts');
                fs.appendFileSync(fileBPath, '\n// Updated', 'utf-8');
                await graph.updateFile(fileBPath);

                const incrementalDependents = graph.getDependents('src/A.ts');

                // Теперь делаем full rebuild
                await graph.buildGraph();
                const fullRebuildDependents = graph.getDependents('src/A.ts');

                // Assert - результаты должны совпадать
                expectArrayToContainSameElements(incrementalDependents, fullRebuildDependents);
                expectArrayToContainSameElements(incrementalDependents, initialDependents);
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });

    /**
     * INTENT: Проверка impact analysis для file changes
     * ПОЧЕМУ: ImpactAnalysis критичен для smart task generation при file changes
     * ПОСЛЕДСТВИЯ: Неверный impact = неправильные tasks = потраченное время агентов
     */
    describe('getImpactAnalysis()', () => {
        it('should correctly identify directly affected files', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                fs.writeFileSync(path.join(srcDir, 'utils.ts'), 'export function util() {}', 'utf-8');
                fs.writeFileSync(path.join(srcDir, 'service.ts'), 'import { util } from "./utils";', 'utf-8');
                fs.writeFileSync(path.join(srcDir, 'controller.ts'), 'import { util } from "./utils";', 'utf-8');

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Act - модифицируем utils.ts
                const impact = graph.getImpactAnalysis([
                    { file: path.join(srcDir, 'utils.ts'), type: 'modify' }
                ]);

                // Assert
                expect(impact.directlyAffected).toHaveLength(2);
                expectArrayToContainSameElements(impact.directlyAffected, ['src/service.ts', 'src/controller.ts']);
                expect(impact.impactLevel).toBe('low'); // 2 файла = low impact
            } finally {
                await tempWorkspace.cleanup();
            }
        });

        it('should calculate impact level correctly', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                // Создаём base file с 25 dependents (high impact)
                fs.writeFileSync(path.join(srcDir, 'base.ts'), 'export const BASE = 1;', 'utf-8');

                for (let i = 0; i < 25; i++) {
                    fs.writeFileSync(
                        path.join(srcDir, `dep${i}.ts`),
                        'import { BASE } from "./base";',
                        'utf-8'
                    );
                }

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Act
                const impact = graph.getImpactAnalysis([
                    { file: path.join(srcDir, 'base.ts'), type: 'modify' }
                ]);

                // Assert - 25 файлов = high impact (threshold = 20)
                expect(impact.impactLevel).toBe('high');
                expect(impact.totalAffected).toBeGreaterThanOrEqual(25);
            } finally {
                await tempWorkspace.cleanup();
            }
        });

        it('should identify risks for delete operations', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                fs.writeFileSync(path.join(srcDir, 'critical.ts'), 'export const CRITICAL = 1;', 'utf-8');
                fs.writeFileSync(path.join(srcDir, 'user.ts'), 'import { CRITICAL } from "./critical";', 'utf-8');

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Act - удаление файла
                const impact = graph.getImpactAnalysis([
                    { file: path.join(srcDir, 'critical.ts'), type: 'delete' }
                ]);

                // Assert
                expect(impact.risks).toContain(expect.stringMatching(/удаление.*critical\.ts.*сломать/i));
                expect(impact.directlyAffected).toContain('src/user.ts');
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });

    /**
     * INTENT: Edge case testing для graph algorithms
     * ПОЧЕМУ: Real codebases имеют circular dependencies, orphaned files, etc.
     * ПОСЛЕДСТВИЯ: Без edge case tests граф может зависнуть или вернуть неверные результаты
     */
    describe('Edge cases', () => {
        it('should handle files without dependencies or dependents', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                // Orphaned file (no imports, no one imports it)
                fs.writeFileSync(path.join(srcDir, 'orphan.ts'), 'export const ORPHAN = 1;', 'utf-8');

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };

                // Act
                await graph.buildGraph();
                const dependents = graph.getDependents('src/orphan.ts');
                const deps = graph.getDependencies('src/orphan.ts');

                // Assert
                expect(dependents).toEqual([]);
                expect(deps?.imports).toEqual([]);
            } finally {
                await tempWorkspace.cleanup();
            }
        });

        it('should handle circular dependencies gracefully', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                // Circular: A → B → A
                fs.writeFileSync(
                    path.join(srcDir, 'A.ts'),
                    'import { B } from "./B";\nexport const A = 1;',
                    'utf-8'
                );
                fs.writeFileSync(
                    path.join(srcDir, 'B.ts'),
                    'import { A } from "./A";\nexport const B = 2;',
                    'utf-8'
                );

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };

                // Act - не должен зависнуть
                await expect(graph.buildGraph()).resolves.not.toThrow();

                // Assert - оба файла должны быть в графе
                const result = graph.getGraph();
                expect(result!.files).toHaveProperty('src/A.ts');
                expect(result!.files).toHaveProperty('src/B.ts');
            } finally {
                await tempWorkspace.cleanup();
            }
        });

        it('should handle non-existent file updates gracefully', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Act - обновляем несуществующий файл
                const nonExistentPath = path.join(tempWorkspace.path, 'src/nonexistent.ts');
                
                await expect(
                    graph.updateFile(nonExistentPath)
                ).resolves.not.toThrow();

                // Assert - граф остался валидным
                const result = graph.getGraph();
                expect(result).not.toBeNull();
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });

    /**
     * INTENT: Проверка parseCache TTL и invalidation
     * ПОЧЕМУ: Кэш с TTL=60s может вернуть stale data при rapid updates
     * ПОСЛЕДСТВИЯ: Stale cache = incorrect dependency info = wrong tasks
     */
    describe('parseCache behavior', () => {
        it('should invalidate cache entry after file modification', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();

            try {
                const srcDir = path.join(tempWorkspace.path, 'src');
                fs.mkdirSync(srcDir, { recursive: true });

                const testFilePath = path.join(srcDir, 'test.ts');
                fs.writeFileSync(testFilePath, 'export const V1 = 1;', 'utf-8');

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Первый парсинг - попадает в кэш
                const deps1 = graph.getDependencies('src/test.ts');
                expect(deps1?.exports).toContain('V1');

                // Act - модифицируем файл
                fs.writeFileSync(testFilePath, 'export const V2 = 2;', 'utf-8');
                await graph.updateFile(testFilePath);

                // Assert - должен вернуть новые exports (не из кэша)
                const deps2 = graph.getDependencies('src/test.ts');
                expect(deps2?.exports).toContain('V2');
                expect(deps2?.exports).not.toContain('V1');
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });
});
