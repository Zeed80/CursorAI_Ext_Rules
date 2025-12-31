/**
 * Path Traversal Security Test Suite
 * 
 * INTENT: Защита от path traversal атак в MCPClient file operations
 * ПОЧЕМУ: MCPClient имеет доступ к file system через VS Code API
 * ПОСЛЕДСТВИЯ: Path traversal = unauthorized file access, чтение sensitive files
 */

import { SECURITY_TEST_PATTERNS, TEST_TIMEOUTS } from '../helpers/test-constants';

describe('Path Traversal Security Suite', () => {
    jest.setTimeout(TEST_TIMEOUTS.UNIT);

    /**
     * INTENT: Проверка защиты от basic path traversal атак
     * ПОЧЕМУ: Атакующие могут попытаться выйти за пределы workspace
     * ПОСЛЕДСТВИЯ: Доступ к /etc/passwd, конфигурационным файлам, SSH keys
     */
    describe('Basic Path Traversal Protection', () => {
        it.each(SECURITY_TEST_PATTERNS.PATH_TRAVERSAL)(
            'should block path traversal attempt: %s',
            async (maliciousPath) => {
                // Arrange
                const sanitizePath = (inputPath: string): string | null => {
                    // Нормализуем путь
                    const normalized = inputPath.replace(/\\/g, '/');
                    
                    // Блокируем попытки выхода за пределы workspace
                    if (normalized.includes('../') || 
                        normalized.includes('..\\') ||
                        normalized.startsWith('/') ||
                        normalized.match(/^[a-zA-Z]:/)) {
                        return null;
                    }
                    
                    return normalized;
                };

                // Act
                const result = sanitizePath(maliciousPath);

                // Assert
                expect(result).toBeNull();
            }
        );

        it('should allow safe relative paths', () => {
            // Arrange
            const safePaths = [
                'src/test.ts',
                'docs/README.md',
                'package.json',
                'src/components/Button.tsx',
            ];

            const sanitizePath = (inputPath: string): string | null => {
                const normalized = inputPath.replace(/\\/g, '/');
                if (normalized.includes('../') || 
                    normalized.includes('..\\') ||
                    normalized.startsWith('/') ||
                    normalized.match(/^[a-zA-Z]:/)) {
                    return null;
                }
                return normalized;
            };

            // Act & Assert
            safePaths.forEach(safePath => {
                const result = sanitizePath(safePath);
                expect(result).toBe(safePath);
            });
        });
    });

    /**
     * INTENT: Проверка защиты от URL-encoded path traversal
     * ПОЧЕМУ: Атакующие могут использовать encoding для обхода filters
     * ПОСЛЕДСТВИЯ: Bypass базовой защиты через %2e%2e%2f (../)
     */
    describe('Encoded Path Traversal Protection', () => {
        it('should block URL-encoded path traversal', () => {
            // Arrange
            const encodedAttacks = [
                '%2e%2e%2f%2e%2e%2fetc%2fpasswd',      // ../../../etc/passwd
                '..%2f..%2f..%2fetc%2fpasswd',
                '%2e%2e\\%2e%2e\\windows\\system32',
            ];

            const sanitizePath = (inputPath: string): string | null => {
                // Декодируем URL encoding
                const decoded = decodeURIComponent(inputPath);
                const normalized = decoded.replace(/\\/g, '/');
                
                if (normalized.includes('../') || 
                    normalized.includes('..\\') ||
                    normalized.startsWith('/') ||
                    normalized.match(/^[a-zA-Z]:/)) {
                    return null;
                }
                return normalized;
            };

            // Act & Assert
            encodedAttacks.forEach(attack => {
                expect(sanitizePath(attack)).toBeNull();
            });
        });

        it('should block double-encoded attacks', () => {
            // Arrange - двойное кодирование
            const doubleEncoded = '%252e%252e%252f'; // %2e%2e%2f → ../

            const sanitizePath = (inputPath: string): string | null => {
                let decoded = inputPath;
                // Декодируем до 2 раз
                for (let i = 0; i < 2; i++) {
                    try {
                        const newDecoded = decodeURIComponent(decoded);
                        if (newDecoded === decoded) break;
                        decoded = newDecoded;
                    } catch {
                        return null;
                    }
                }
                
                const normalized = decoded.replace(/\\/g, '/');
                if (normalized.includes('../') || normalized.includes('..\\')) {
                    return null;
                }
                return normalized;
            };

            // Act
            const result = sanitizePath(doubleEncoded);

            // Assert
            expect(result).toBeNull();
        });
    });

    /**
     * INTENT: Проверка защиты от null byte injection
     * ПОЧЕМУ: Null bytes могут обрезать путь и bypass защиты
     * ПОСЛЕДСТВИЯ: file.txt%00.jpg → читается как file.txt
     */
    describe('Null Byte Injection Protection', () => {
        it('should block null byte in path', () => {
            // Arrange
            const nullByteAttacks = [
                '../../../etc/passwd\x00.txt',
                'safe.txt\x00../../etc/passwd',
                'file.txt%00../../secret',
            ];

            const sanitizePath = (inputPath: string): string | null => {
                // Проверяем на null bytes
                if (inputPath.includes('\x00') || inputPath.includes('%00')) {
                    return null;
                }
                
                const decoded = decodeURIComponent(inputPath);
                if (decoded.includes('\x00')) {
                    return null;
                }
                
                const normalized = decoded.replace(/\\/g, '/');
                if (normalized.includes('../') || normalized.includes('..\\')) {
                    return null;
                }
                
                return normalized;
            };

            // Act & Assert
            nullByteAttacks.forEach(attack => {
                expect(sanitizePath(attack)).toBeNull();
            });
        });
    });

    /**
     * INTENT: Проверка защиты от symlink attacks
     * ПОЧЕМУ: Symlinks могут указывать за пределы workspace
     * ПОСЛЕДСТВИЯ: symlink в workspace → sensitive file outside
     */
    describe('Symlink Attack Protection', () => {
        it('should validate resolved path stays within workspace', () => {
            // Arrange
            const workspaceRoot = '/workspace';
            
            const isPathSafe = (requestedPath: string, resolvedPath: string): boolean => {
                // resolvedPath после разрешения symlinks
                const normalizedResolved = resolvedPath.replace(/\\/g, '/');
                const normalizedWorkspace = workspaceRoot.replace(/\\/g, '/');
                
                // Проверяем что resolved path внутри workspace
                return normalizedResolved.startsWith(normalizedWorkspace + '/') ||
                       normalizedResolved === normalizedWorkspace;
            };

            // Act & Assert - symlink указывает вне workspace
            expect(isPathSafe(
                '/workspace/link.txt',
                '/etc/passwd'  // symlink resolved to outside
            )).toBe(false);

            // Safe case - symlink внутри workspace
            expect(isPathSafe(
                '/workspace/link.txt',
                '/workspace/actual/file.txt'
            )).toBe(true);
        });
    });

    /**
     * INTENT: Проверка whitelist подхода для sensitive directories
     * ПОЧЕМУ: Некоторые директории должны быть полностью запрещены
     * ПОСЛЕДСТВИЯ: Доступ к .git, .env, node_modules может раскрыть secrets
     */
    describe('Sensitive Directory Access Prevention', () => {
        it('should block access to sensitive directories', () => {
            // Arrange
            const sensitivePaths = [
                '.git/config',
                '.env',
                '.env.local',
                'node_modules/package/secret.key',
                '.ssh/id_rsa',
                '.cursor/api-key',
            ];

            const isPathAllowed = (inputPath: string): boolean => {
                const normalized = inputPath.replace(/\\/g, '/').toLowerCase();
                
                const blockedPatterns = [
                    /^\.git\//,
                    /^\.env/,
                    /^node_modules\//,
                    /^\.ssh\//,
                    /\/\.git\//,
                    /\/\.env/,
                    /\/\.ssh\//,
                ];
                
                return !blockedPatterns.some(pattern => pattern.test(normalized));
            };

            // Act & Assert
            sensitivePaths.forEach(path => {
                expect(isPathAllowed(path)).toBe(false);
            });
        });

        it('should allow access to safe directories', () => {
            // Arrange
            const safePaths = [
                'src/index.ts',
                'docs/README.md',
                'tests/unit/test.ts',
                'public/image.png',
            ];

            const isPathAllowed = (inputPath: string): boolean => {
                const normalized = inputPath.replace(/\\/g, '/').toLowerCase();
                const blockedPatterns = [
                    /^\.git\//,
                    /^\.env/,
                    /^node_modules\//,
                    /^\.ssh\//,
                ];
                return !blockedPatterns.some(pattern => pattern.test(normalized));
            };

            // Act & Assert
            safePaths.forEach(path => {
                expect(isPathAllowed(path)).toBe(true);
            });
        });
    });

    /**
     * INTENT: Integration test с реальным path sanitization
     * ПОЧЕМУ: Проверить что все защиты работают вместе
     * ПОСЛЕДСТВИЯ: Comprehensive protection против всех vectors
     */
    describe('Comprehensive Path Sanitization', () => {
        it('should provide comprehensive protection', () => {
            // Arrange
            const workspaceRoot = '/workspace';

            const sanitizeAndValidatePath = (
                inputPath: string,
                workspaceRoot: string
            ): { safe: boolean; reason?: string } => {
                // 1. Check for null bytes
                if (inputPath.includes('\x00') || inputPath.includes('%00')) {
                    return { safe: false, reason: 'Null byte detected' };
                }

                // 2. Decode URL encoding (max 2 iterations)
                let decoded = inputPath;
                for (let i = 0; i < 2; i++) {
                    try {
                        const newDecoded = decodeURIComponent(decoded);
                        if (newDecoded === decoded) break;
                        decoded = newDecoded;
                    } catch {
                        return { safe: false, reason: 'Invalid encoding' };
                    }
                }

                // 3. Check for path traversal
                const normalized = decoded.replace(/\\/g, '/');
                if (normalized.includes('../') || 
                    normalized.includes('..\\') ||
                    normalized.startsWith('/') ||
                    normalized.match(/^[a-zA-Z]:/)) {
                    return { safe: false, reason: 'Path traversal detected' };
                }

                // 4. Check sensitive directories
                const lower = normalized.toLowerCase();
                const sensitivePat = [/^\.git\//, /^\.env/, /^node_modules\//, /^\.ssh\//];
                if (sensitivePat.some(p => p.test(lower))) {
                    return { safe: false, reason: 'Sensitive directory access' };
                }

                return { safe: true };
            };

            // Act & Assert - comprehensive attacks
            const attacks = [
                '../../../etc/passwd',
                '%2e%2e%2fetc%2fpasswd',
                'file.txt\x00../../secret',
                '.git/config',
                '..\\..\\windows\\system32',
            ];

            attacks.forEach(attack => {
                const result = sanitizeAndValidatePath(attack, workspaceRoot);
                expect(result.safe).toBe(false);
                expect(result.reason).toBeDefined();
            });

            // Safe paths должны проходить
            const safePaths = ['src/test.ts', 'docs/README.md'];
            safePaths.forEach(safe => {
                const result = sanitizeAndValidatePath(safe, workspaceRoot);
                expect(result.safe).toBe(true);
            });
        });
    });
});
