/**
 * Performance Regression Tests для ProjectDependencyGraph
 * 
 * INTENT: Проверка оптимизации "avoid overcalculating all for vertices"
 * ПОЧЕМУ: buildDependents() пересчитывает все файлы при updateFile() - O(n²) проблема
 * ПОСЛЕДСТВИЯ: Без этих тестов performance regression попадёт в production незамеченным
 */

import { ProjectDependencyGraph } from '../project-dependency-graph';
import { measurePerformance, createTempWorkspace, waitFor } from '../../__tests__/helpers/test-utils';
import { mockDependencyGraph } from '../../__tests__/helpers/mock-factories';
import { PERFORMANCE_BUDGETS, TEST_TIMEOUTS, TEST_DATA_SIZES } from '../../__tests__/helpers/test-constants';
import * as fs from 'fs';
import * as path from 'path';

describe('ProjectDependencyGraph Performance Tests', () => {
    jest.setTimeout(TEST_TIMEOUTS.PERFORMANCE);

    /**
     * INTENT: Проверка что updateFile() масштабируется линейно, не квадратично
     * ПОЧЕМУ: Исходная задача - "avoid overcalculating all for vertices"
     * ПОСЛЕДСТВИЯ: Если квадратичная сложность, проекты >100 файлов будут slow
     */
    describe('updateFile() scalability', () => {
        it('should scale linearly O(n) not quadratically O(n²) with file count', async () => {
            // Arrange - создаём графы разного размера
            const fileCounts = [10, 100, 500];
            const timings: number[] = [];

            for (const fileCount of fileCounts) {
                const tempWorkspace = createTempWorkspace();
                
                try {
                    // Создаём mock файлы
                    for (let i = 0; i < fileCount; i++) {
                        const filePath = path.join(tempWorkspace.path, `src/file-${i}.ts`);
                        const dirPath = path.dirname(filePath);
                        
                        if (!fs.existsSync(dirPath)) {
                            fs.mkdirSync(dirPath, { recursive: true });
                        }
                        
                        const imports = i > 0 ? `import { func${i-1} } from './file-${i-1}';` : '';
                        const content = `${imports}\nexport function func${i}() { return ${i}; }`;
                        fs.writeFileSync(filePath, content, 'utf-8');
                    }

                    // Инициализируем граф
                    const graph = new ProjectDependencyGraph();
                    (graph as any).workspaceFolder = {
                        uri: tempWorkspace.uri,
                        name: 'test',
                        index: 0,
                    };
                    await graph.initialize();

                    // Act - измеряем время updateFile()
                    const testFilePath = path.join(tempWorkspace.path, 'src/file-0.ts');
                    fs.appendFileSync(testFilePath, '\n// Updated', 'utf-8');

                    const { duration } = await measurePerformance(
                        () => graph.updateFile(testFilePath),
                        `updateFile (${fileCount} files)`
                    );

                    timings.push(duration);
                } finally {
                    await tempWorkspace.cleanup();
                }
            }

            // Assert - проверяем линейный рост
            console.log('Performance timings:', {
                '10 files': `${timings[0].toFixed(2)}ms`,
                '100 files': `${timings[1].toFixed(2)}ms`,
                '500 files': `${timings[2].toFixed(2)}ms`,
            });

            // Вычисляем growth ratios
            const ratio100_10 = timings[1] / timings[0];
            const ratio500_100 = timings[2] / timings[1];

            // Если O(n²): ratio500_100 будет ~5x больше ratio100_10 (т.к. 500/100 = 5)
            // Если O(n): ratios должны быть примерно равны
            const growthRatio = ratio500_100 / ratio100_10;

            console.log('Growth analysis:', {
                'ratio 100/10': ratio100_10.toFixed(2),
                'ratio 500/100': ratio500_100.toFixed(2),
                'growth ratio': growthRatio.toFixed(2),
            });

            // Assert: growth ratio должен быть близок к 1 для линейной сложности
            // Допускаем до 2.5x из-за вариативности I/O и GC
            expect(growthRatio).toBeLessThan(2.5);

            // Assert: абсолютное время для 100 файлов должно быть в бюджете
            expect(timings[1]).toBeLessThan(PERFORMANCE_BUDGETS.UPDATE_FILE_MAX_MS);
        });

        /**
         * INTENT: Проверка performance budget для realistic scenario
         * ПОЧЕМУ: FileWatcher triggers updateFile() в real-time при каждом изменении
         * ПОСЛЕДСТВИЯ: Если >50ms, IDE будет laggy при rapid file changes (git checkout)
         */
        it('should update single file within performance budget for medium project', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();
            const fileCount = TEST_DATA_SIZES.MEDIUM_GRAPH;

            try {
                // Создаём realistic dependency graph
                for (let i = 0; i < fileCount; i++) {
                    const filePath = path.join(tempWorkspace.path, `src/module-${i % 10}/file-${i}.ts`);
                    const dirPath = path.dirname(filePath);
                    
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    
                    // Создаём realistic dependencies (каждый файл импортирует 2-3 других)
                    const imports = [];
                    if (i > 0) imports.push(`import { func${i-1} } from './file-${i-1}';`);
                    if (i > 1) imports.push(`import { func${i-2} } from './file-${i-2}';`);
                    
                    const content = `${imports.join('\n')}\nexport function func${i}() { return ${i}; }`;
                    fs.writeFileSync(filePath, content, 'utf-8');
                }

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.initialize();

                // Act - обновляем файл в середине графа (worst case для зависимостей)
                const testFilePath = path.join(tempWorkspace.path, `src/module-5/file-50.ts`);
                fs.appendFileSync(testFilePath, '\n// Performance test update', 'utf-8');

                const { duration } = await measurePerformance(
                    () => graph.updateFile(testFilePath),
                    'updateFile (realistic)'
                );

                // Assert
                console.log(`✅ updateFile() took ${duration.toFixed(2)}ms for ${fileCount} files`);
                expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.UPDATE_FILE_MAX_MS);
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });

    /**
     * INTENT: Проверка что buildGraph() имеет acceptable performance для initial build
     * ПОЧЕМУ: buildGraph() вызывается при первом запуске и при outdated graph
     * ПОСЛЕДСТВИЯ: Если >5s для 100 файлов, плохой UX при открытии проекта
     */
    describe('buildGraph() initial build performance', () => {
        it('should build medium graph within budget', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();
            const fileCount = TEST_DATA_SIZES.MEDIUM_GRAPH;

            try {
                for (let i = 0; i < fileCount; i++) {
                    const filePath = path.join(tempWorkspace.path, `src/file-${i}.ts`);
                    const dirPath = path.dirname(filePath);
                    
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    
                    const content = `export function func${i}() { return ${i}; }`;
                    fs.writeFileSync(filePath, content, 'utf-8');
                }

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };

                // Act
                const { duration } = await measurePerformance(
                    () => graph.buildGraph(),
                    'buildGraph'
                );

                // Assert
                console.log(`✅ buildGraph() took ${duration.toFixed(2)}ms for ${fileCount} files`);
                expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.BUILD_GRAPH_100_FILES_MAX_MS);
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });

    /**
     * INTENT: Проверка memory efficiency для кэша parseCache
     * ПОЧЕМУ: parseCache (Map) не имеет size limit - потенциальный memory leak
     * ПОСЛЕДСТВИЯ: При 1000+ файлах может съесть >500MB RAM
     */
    describe('parseCache memory efficiency', () => {
        it('should not accumulate unbounded cache entries', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();
            const fileCount = 50;

            try {
                for (let i = 0; i < fileCount; i++) {
                    const filePath = path.join(tempWorkspace.path, `src/file-${i}.ts`);
                    const dirPath = path.dirname(filePath);
                    
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    
                    fs.writeFileSync(filePath, `export const x = ${i};`, 'utf-8');
                }

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Act - обновляем каждый файл несколько раз
                const initialCacheSize = (graph as any).parseCache.size;

                for (let round = 0; round < 3; round++) {
                    for (let i = 0; i < fileCount; i++) {
                        const filePath = path.join(tempWorkspace.path, `src/file-${i}.ts`);
                        fs.appendFileSync(filePath, `\n// Update ${round}`, 'utf-8');
                        await graph.updateFile(filePath);
                    }
                }

                const finalCacheSize = (graph as any).parseCache.size;

                // Assert - кэш не должен расти бесконечно
                console.log(`Cache size: initial=${initialCacheSize}, final=${finalCacheSize}`);
                
                // Cache может содержать max fileCount записей (одна на файл)
                // Плюс небольшой overhead для TTL management
                expect(finalCacheSize).toBeLessThanOrEqual(fileCount * 1.2);
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });

    /**
     * INTENT: Benchmark для сравнения full rebuild vs incremental update
     * ПОЧЕМУ: Оптимизация должна показать significant improvement
     * ПОСЛЕДСТВИЯ: Если нет разницы, оптимизация неэффективна
     */
    describe('Full rebuild vs incremental update comparison', () => {
        it('should demonstrate performance benefit of incremental update', async () => {
            // Arrange
            const tempWorkspace = createTempWorkspace();
            const fileCount = TEST_DATA_SIZES.MEDIUM_GRAPH;

            try {
                for (let i = 0; i < fileCount; i++) {
                    const filePath = path.join(tempWorkspace.path, `src/file-${i}.ts`);
                    const dirPath = path.dirname(filePath);
                    
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    
                    const imports = i > 0 ? `import { func${i-1} } from './file-${i-1}';` : '';
                    fs.writeFileSync(filePath, `${imports}\nexport function func${i}() {}`, 'utf-8');
                }

                const graph = new ProjectDependencyGraph();
                (graph as any).workspaceFolder = {
                    uri: tempWorkspace.uri,
                    name: 'test',
                    index: 0,
                };
                await graph.buildGraph();

                // Measure incremental update
                const testFilePath = path.join(tempWorkspace.path, 'src/file-50.ts');
                fs.appendFileSync(testFilePath, '\n// Test update', 'utf-8');

                const { duration: incrementalDuration } = await measurePerformance(
                    () => graph.updateFile(testFilePath),
                    'Incremental update'
                );

                // Measure full rebuild
                const { duration: fullRebuildDuration } = await measurePerformance(
                    () => graph.buildGraph(),
                    'Full rebuild'
                );

                // Assert
                console.log('Performance comparison:', {
                    incremental: `${incrementalDuration.toFixed(2)}ms`,
                    fullRebuild: `${fullRebuildDuration.toFixed(2)}ms`,
                    speedup: `${(fullRebuildDuration / incrementalDuration).toFixed(1)}x`,
                });

                // Incremental update должен быть минимум в 5x быстрее full rebuild
                expect(incrementalDuration).toBeLessThan(fullRebuildDuration / 5);
            } finally {
                await tempWorkspace.cleanup();
            }
        });
    });
});
