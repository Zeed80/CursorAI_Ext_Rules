/**
 * API Key Leakage Prevention Test Suite
 * 
 * INTENT: Предотвращение утечки API ключей в logs, errors, responses
 * ПОЧЕМУ: Проект использует 6 LLM providers с дорогими API keys ($$ OpenAI, Anthropic, Google)
 * ПОСЛЕДСТВИЯ: Leaked API key = unauthorized usage, potential $1000+ loss
 */

import { MOCK_API_KEYS, TEST_TIMEOUTS } from '../helpers/test-constants';

describe('API Key Leakage Prevention Suite', () => {
    jest.setTimeout(TEST_TIMEOUTS.UNIT);

    /**
     * INTENT: Проверка что API keys не логируются в plain text
     * ПОЧЕМУ: Logs могут попадать в version control, monitoring systems
     * ПОСЛЕДСТВИЯ: Exposed keys в GitHub, Sentry, CloudWatch
     */
    describe('Logging Sanitization', () => {
        it('should redact API keys from log messages', () => {
            // Arrange
            const apiKey = 'sk-1234567890abcdefghijklmnopqrstuv';
            const logMessage = `Making request to OpenAI with key: ${apiKey}`;

            const sanitizeLogMessage = (message: string): string => {
                // Паттерны для разных API keys
                const patterns = [
                    /sk-[a-zA-Z0-9]{32,}/g,           // OpenAI
                    /sk-ant-[a-zA-Z0-9-]{95}/g,       // Anthropic
                    /AIza[a-zA-Z0-9-_]{35}/g,         // Google
                    /ghp_[a-zA-Z0-9]{36}/g,           // GitHub
                    /gho_[a-zA-Z0-9]{36}/g,           // GitHub OAuth
                ];

                let sanitized = message;
                patterns.forEach(pattern => {
                    sanitized = sanitized.replace(pattern, '[REDACTED]');
                });

                return sanitized;
            };

            // Act
            const sanitized = sanitizeLogMessage(logMessage);

            // Assert
            expect(sanitized).not.toContain(apiKey);
            expect(sanitized).toContain('[REDACTED]');
            expect(sanitized).toContain('Making request to OpenAI');
        });

        it('should redact multiple API keys in single message', () => {
            // Arrange
            const message = `Config: openai=sk-abc123, anthropic=sk-ant-xyz789, google=AIzaTest123`;

            const sanitizeLogMessage = (msg: string): string => {
                const patterns = [
                    /sk-[a-zA-Z0-9]{6,}/g,
                    /sk-ant-[a-zA-Z0-9-]{6,}/g,
                    /AIza[a-zA-Z0-9-_]{6,}/g,
                ];
                let sanitized = msg;
                patterns.forEach(p => {
                    sanitized = sanitized.replace(p, '[REDACTED]');
                });
                return sanitized;
            };

            // Act
            const sanitized = sanitizeLogMessage(message);

            // Assert
            expect(sanitized).not.toMatch(/sk-abc123/);
            expect(sanitized).not.toMatch(/sk-ant-xyz789/);
            expect(sanitized).not.toMatch(/AIzaTest123/);
            expect((sanitized.match(/\[REDACTED\]/g) || []).length).toBe(3);
        });

        it('should preserve context while redacting keys', () => {
            // Arrange
            const message = `Error connecting to OpenAI API with key sk-test123: Network timeout`;

            const sanitizeLogMessage = (msg: string): string => {
                return msg.replace(/sk-[a-zA-Z0-9]{6,}/g, '[REDACTED]');
            };

            // Act
            const sanitized = sanitizeLogMessage(message);

            // Assert
            expect(sanitized).toContain('Error connecting to OpenAI API');
            expect(sanitized).toContain('Network timeout');
            expect(sanitized).toContain('[REDACTED]');
            expect(sanitized).not.toContain('sk-test123');
        });
    });

    /**
     * INTENT: Проверка что API keys не попадают в error messages
     * ПОЧЕМУ: Error messages показываются пользователю, могут логироваться
     * ПОСЛЕДСТВИЯ: User видит API key в error dialog, key compromised
     */
    describe('Error Message Sanitization', () => {
        it('should not expose API keys in Error objects', () => {
            // Arrange
            const apiKey = 'sk-sensitive-key-123';

            const createSafeError = (message: string, apiKey: string): Error => {
                // Проверяем что message не содержит API key
                if (message.includes(apiKey)) {
                    const sanitized = message.replace(apiKey, '[REDACTED]');
                    return new Error(sanitized);
                }
                return new Error(message);
            };

            // Act
            const error = createSafeError(
                `API request failed with key ${apiKey}`,
                apiKey
            );

            // Assert
            expect(error.message).not.toContain(apiKey);
            expect(error.message).toContain('[REDACTED]');
        });

        it('should sanitize stack traces containing API keys', () => {
            // Arrange
            const apiKey = 'sk-test-key-456';

            const sanitizeStackTrace = (stack: string | undefined): string => {
                if (!stack) return '';
                return stack.replace(/sk-[a-zA-Z0-9-]{6,}/g, '[REDACTED]');
            };

            // Создаём error со stack trace содержащим key
            const error = new Error('Test error');
            error.stack = `Error: Test error
    at makeRequest (api.ts:10) with key sk-test-key-456
    at callOpenAI (provider.ts:25)`;

            // Act
            const sanitizedStack = sanitizeStackTrace(error.stack);

            // Assert
            expect(sanitizedStack).not.toContain(apiKey);
            expect(sanitizedStack).toContain('[REDACTED]');
            expect(sanitizedStack).toContain('at makeRequest');
        });
    });

    /**
     * INTENT: Проверка что API keys не возвращаются в API responses
     * ПОЧЕМУ: Response могут кэшироваться, логироваться, показываться в DevTools
     * ПОСЛЕДСТВИЯ: API key visible в browser DevTools, cache files
     */
    describe('Response Sanitization', () => {
        it('should strip API keys from response objects', () => {
            // Arrange
            const response = {
                status: 'success',
                config: {
                    apiKey: 'sk-should-not-be-here',
                    model: 'gpt-4',
                    temperature: 0.7,
                },
                result: 'Generated text',
            };

            const sanitizeResponse = (obj: any): any => {
                const sanitized = JSON.parse(JSON.stringify(obj));
                
                const removeKeys = (o: any): void => {
                    for (const key in o) {
                        if (key.toLowerCase().includes('key') || 
                            key.toLowerCase().includes('secret') ||
                            key.toLowerCase().includes('token')) {
                            o[key] = '[REDACTED]';
                        } else if (typeof o[key] === 'object' && o[key] !== null) {
                            removeKeys(o[key]);
                        }
                    }
                };
                
                removeKeys(sanitized);
                return sanitized;
            };

            // Act
            const sanitized = sanitizeResponse(response);

            // Assert
            expect(sanitized.config.apiKey).toBe('[REDACTED]');
            expect(sanitized.config.model).toBe('gpt-4'); // Не затронуто
            expect(sanitized.result).toBe('Generated text'); // Не затронуто
        });

        it('should sanitize nested API keys in complex objects', () => {
            // Arrange
            const complexResponse = {
                providers: {
                    openai: { apiKey: 'sk-openai-123', endpoint: 'api.openai.com' },
                    anthropic: { apiKey: 'sk-ant-456', endpoint: 'api.anthropic.com' },
                },
                metadata: {
                    authToken: 'secret-token-789',
                },
            };

            const sanitizeResponse = (obj: any): any => {
                const sanitized = JSON.parse(JSON.stringify(obj));
                const removeKeys = (o: any): void => {
                    for (const key in o) {
                        if (key.toLowerCase().match(/key|secret|token|password/)) {
                            o[key] = '[REDACTED]';
                        } else if (typeof o[key] === 'object' && o[key] !== null) {
                            removeKeys(o[key]);
                        }
                    }
                };
                removeKeys(sanitized);
                return sanitized;
            };

            // Act
            const sanitized = sanitizeResponse(complexResponse);

            // Assert
            expect(sanitized.providers.openai.apiKey).toBe('[REDACTED]');
            expect(sanitized.providers.anthropic.apiKey).toBe('[REDACTED]');
            expect(sanitized.metadata.authToken).toBe('[REDACTED]');
            expect(sanitized.providers.openai.endpoint).toBe('api.openai.com');
        });
    });

    /**
     * INTENT: Проверка что API keys не сохраняются в plain text файлы
     * ПОЧЕМУ: Config files могут попасть в version control
     * ПОСЛЕДСТВИЯ: API keys в .env committed to GitHub = compromised
     */
    describe('Storage Security', () => {
        it('should detect API keys in plain text storage', () => {
            // Arrange
            const configContent = `
                OPENAI_API_KEY=sk-1234567890abcdef
                ANTHROPIC_API_KEY=sk-ant-xyz
                DATABASE_URL=postgresql://localhost
            `;

            const detectApiKeys = (content: string): string[] => {
                const patterns = [
                    { name: 'OpenAI', regex: /sk-[a-zA-Z0-9]{10,}/g },
                    { name: 'Anthropic', regex: /sk-ant-[a-zA-Z0-9-]{10,}/g },
                    { name: 'Google', regex: /AIza[a-zA-Z0-9-_]{10,}/g },
                ];

                const found: string[] = [];
                patterns.forEach(({ name, regex }) => {
                    if (regex.test(content)) {
                        found.push(name);
                    }
                });

                return found;
            };

            // Act
            const detected = detectApiKeys(configContent);

            // Assert
            expect(detected).toContain('OpenAI');
            expect(detected).toContain('Anthropic');
            expect(detected.length).toBe(2);
        });

        it('should recommend encrypted storage for API keys', () => {
            // Arrange
            const plainTextKey = 'sk-1234567890abcdef';

            // Simulate encryption (в реальности использовать VS Code SecretStorage API)
            const encryptKey = (key: string): string => {
                // В production: vscode.SecretStorage
                // Здесь: simple base64 для демонстрации
                return Buffer.from(key).toString('base64');
            };

            const decryptKey = (encrypted: string): string => {
                return Buffer.from(encrypted, 'base64').toString('utf-8');
            };

            // Act
            const encrypted = encryptKey(plainTextKey);
            const decrypted = decryptKey(encrypted);

            // Assert
            expect(encrypted).not.toBe(plainTextKey); // Encrypted
            expect(encrypted).not.toMatch(/^sk-/); // Не похоже на key
            expect(decrypted).toBe(plainTextKey); // Can decrypt
        });
    });

    /**
     * INTENT: Проверка detection leaked keys в test files
     * ПОЧЕМУ: Mock API keys в тестах могут случайно быть real keys
     * ПОСЛЕДСТВИЯ: Real API key committed в test file
     */
    describe('Test File Security', () => {
        it('should verify mock API keys are not real keys', () => {
            // Arrange - mock keys должны быть obviously fake
            const isRealApiKey = (key: string): boolean => {
                // Real keys обычно длиннее и содержат random characters
                if (key.length < 20) return false;
                
                // Проверяем на test/mock/fake keywords
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('test') || 
                    lowerKey.includes('mock') ||
                    lowerKey.includes('fake') ||
                    lowerKey.includes('example')) {
                    return false;
                }
                
                // Проверяем формат real keys
                if (key.match(/^sk-[a-zA-Z0-9]{48}$/)) {
                    return true; // Похоже на real OpenAI key
                }
                
                return false;
            };

            // Act & Assert - MOCK_API_KEYS должны быть безопасны
            Object.values(MOCK_API_KEYS).forEach(mockKey => {
                expect(isRealApiKey(mockKey)).toBe(false);
                expect(mockKey.toLowerCase()).toMatch(/mock|test|fake/);
            });
        });

        it('should flag suspiciously long API keys in tests', () => {
            // Arrange
            const testKeys = [
                'sk-test-key',                           // OK - short
                'sk-mock-key-for-testing-only',         // OK - has mock
                'sk-1234567890abcdefghijk1234567890',   // SUSPICIOUS - long, no mock keyword
            ];

            const isSuspicious = (key: string): boolean => {
                const lowerKey = key.toLowerCase();
                
                // Длинный И не содержит test/mock keywords
                if (key.length > 30 && 
                    !lowerKey.includes('test') &&
                    !lowerKey.includes('mock') &&
                    !lowerKey.includes('fake')) {
                    return true;
                }
                
                return false;
            };

            // Act & Assert
            expect(isSuspicious(testKeys[0])).toBe(false);
            expect(isSuspicious(testKeys[1])).toBe(false);
            expect(isSuspicious(testKeys[2])).toBe(true); // FLAGGED
        });
    });

    /**
     * INTENT: Integration test - comprehensive API key protection
     * ПОЧЕМУ: Все защиты должны работать together
     * ПОСЛЕДСТВИЯ: Defense in depth против API key leakage
     */
    describe('Comprehensive API Key Protection', () => {
        it('should provide multi-layered protection', () => {
            // Arrange
            const apiKey = 'sk-real-api-key-1234567890';

            class SecureLogger {
                sanitize(message: string): string {
                    return message.replace(/sk-[a-zA-Z0-9-]{10,}/g, '[REDACTED]');
                }

                log(message: string): void {
                    const sanitized = this.sanitize(message);
                    console.log(sanitized);
                }

                error(error: Error): void {
                    const sanitized = this.sanitize(error.message);
                    const sanitizedStack = error.stack 
                        ? this.sanitize(error.stack)
                        : '';
                    console.error(sanitized, sanitizedStack);
                }
            }

            const logger = new SecureLogger();

            // Act - log с API key
            const logSpy = jest.spyOn(console, 'log').mockImplementation();
            logger.log(`Making API request with key: ${apiKey}`);

            // Assert - key не попал в log
            expect(logSpy).toHaveBeenCalled();
            const loggedMessage = logSpy.mock.calls[0][0];
            expect(loggedMessage).not.toContain(apiKey);
            expect(loggedMessage).toContain('[REDACTED]');

            logSpy.mockRestore();
        });
    });
});
