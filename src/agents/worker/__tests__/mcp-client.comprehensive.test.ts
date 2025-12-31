/**
 * INTENT: Comprehensive tests для MCPClient (workspace file/git/search operations)
 * WHY: MCPClient - critical infrastructure для всех agent operations
 * ADDRESSES: Phase 2 Coverage Expansion - core infrastructure testing
 * CONSEQUENCES: If MCPClient fails, agents cannot interact with workspace
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MCPClient, FileChange, SearchResult, FileInfo } from '../mcp-client';
import * as vscode from 'vscode';
import { createMockVSCodeContext } from '../../../__tests__/helpers/test-utils';
import { TEST_TIMEOUTS } from '../../../__tests__/helpers/test-constants';

describe('MCPClient - Comprehensive Tests', () => {
    let client: MCPClient;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;
    
    beforeEach(() => {
        // Mock workspace
        mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0
        };
        
        (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
        
        client = new MCPClient();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    /**
     * INTENT: Verify initialization and workspace detection
     * WHY: MCPClient must correctly identify workspace root
     * ADDRESSES: Core functionality (workspace context)
     */
    describe('Initialization', () => {
        
        /**
         * INTENT: Verify client initializes with workspace
         * WHY: Workspace root needed для всех file operations
         */
        it('should initialize with workspace folder', () => {
            expect(client).toBeDefined();
            // Workspace root captured during construction
        });
        
        /**
         * INTENT: Verify error when no workspace
         * WHY: Client should fail gracefully без workspace
         */
        it('should handle missing workspace folder', async () => {
            (vscode.workspace as any).workspaceFolders = undefined;
            
            const clientWithoutWorkspace = new MCPClient();
            
            // Should throw when trying file operations
            await expect(clientWithoutWorkspace.listFiles()).rejects.toThrow('No workspace folder found');
        });
    });
    
    /**
     * INTENT: Verify file listing functionality
     * WHY: Agents need to discover project files
     * ADDRESSES: File discovery operations
     */
    describe('File Listing', () => {
        
        /**
         * INTENT: Verify basic file listing
         * WHY: Core functionality для project exploration
         */
        it('should list all files in workspace', async () => {
            const mockFiles = [
                vscode.Uri.file('/test/workspace/src/index.ts'),
                vscode.Uri.file('/test/workspace/package.json')
            ];
            
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue(mockFiles);
            jest.spyOn(vscode.workspace, 'asRelativePath').mockImplementation((uri) => {
                if (uri instanceof vscode.Uri) {
                    return uri.fsPath.replace('/test/workspace/', '');
                }
                return '';
            });
            
            const files = await client.listFiles();
            
            expect(files).toHaveLength(2);
            expect(files).toContain('src/index.ts');
            expect(files).toContain('package.json');
        });
        
        /**
         * INTENT: Verify pattern filtering
         * WHY: Agents need to filter files по patterns
         */
        it('should filter files by pattern', async () => {
            const mockFiles = [vscode.Uri.file('/test/workspace/src/test.ts')];
            
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue(mockFiles);
            
            await client.listFiles('**/*.ts');
            
            expect(vscode.workspace.findFiles).toHaveBeenCalledWith('**/*.ts', '**/node_modules/**');
        });
        
        /**
         * INTENT: Verify exclude patterns work
         * WHY: Need to skip node_modules, build artifacts
         */
        it('should exclude files by pattern', async () => {
            jest.spyOn(vscode.workspace, 'findFiles').mockResolvedValue([]);
            
            await client.listFiles('**/*', '**/test/**');
            
            expect(vscode.workspace.findFiles).toHaveBeenCalledWith('**/*', '**/test/**');
        });
    });
    
    /**
     * INTENT: Verify file metadata operations
     * WHY: Agents need file size, modification time
     * ADDRESSES: File information retrieval
     */
    describe('File Information', () => {
        
        /**
         * INTENT: Verify file info retrieval
         * WHY: Metadata needed для decision making
         */
        it('should get file info', async () => {
            const mockStat: vscode.FileStat = {
                type: vscode.FileType.File,
                ctime: Date.now(),
                mtime: Date.now(),
                size: 1024
            };
            
            jest.spyOn(vscode.workspace.fs, 'stat').mockResolvedValue(mockStat);
            
            const info = await client.getFileInfo('src/index.ts');
            
            expect(info.path).toBe('src/index.ts');
            expect(info.size).toBe(1024);
            expect(info.isDirectory).toBe(false);
            expect(info.modified).toBeInstanceOf(Date);
        });
        
        /**
         * INTENT: Verify directory detection
         * WHY: Different handling для directories vs files
         */
        it('should detect directories', async () => {
            const mockStat: vscode.FileStat = {
                type: vscode.FileType.Directory,
                ctime: Date.now(),
                mtime: Date.now(),
                size: 0
            };
            
            jest.spyOn(vscode.workspace.fs, 'stat').mockResolvedValue(mockStat);
            
            const info = await client.getFileInfo('src');
            
            expect(info.isDirectory).toBe(true);
        });
        
        /**
         * INTENT: Verify error on non-existent file
         * WHY: Should fail gracefully для missing files
         */
        it('should throw error for non-existent file', async () => {
            jest.spyOn(vscode.workspace.fs, 'stat').mockRejectedValue(new Error('Not found'));
            
            await expect(client.getFileInfo('nonexistent.ts')).rejects.toThrow('File not found');
        });
    });
    
    /**
     * INTENT: Verify file read operations
     * WHY: Core functionality - agents must read code
     * ADDRESSES: File content access
     */
    describe('File Reading', () => {
        
        /**
         * INTENT: Verify UTF-8 content reading
         * WHY: Standard encoding для source files
         */
        it('should read file content', async () => {
            const content = 'export const test = "hello";';
            const buffer = Buffer.from(content, 'utf-8');
            
            jest.spyOn(vscode.workspace.fs, 'readFile').mockResolvedValue(buffer);
            
            const result = await client.readFile('src/test.ts');
            
            expect(result).toBe(content);
        });
        
        /**
         * INTENT: Verify error handling для read failures
         * WHY: Network issues, permissions могут fail reads
         */
        it('should handle read errors', async () => {
            jest.spyOn(vscode.workspace.fs, 'readFile').mockRejectedValue(new Error('Permission denied'));
            
            await expect(client.readFile('protected.ts')).rejects.toThrow('Failed to read file');
        });
    });
    
    /**
     * INTENT: Verify file creation operations
     * WHY: Agents create test files, configs, etc.
     * ADDRESSES: File modification capabilities
     */
    describe('File Creation', () => {
        
        /**
         * INTENT: Verify simple file creation
         * WHY: Basic write operation
         */
        it('should create file with content', async () => {
            const writeFileSpy = jest.spyOn(vscode.workspace.fs, 'writeFile').mockResolvedValue();
            
            await client.createFile('src/new.ts', 'const test = 1;');
            
            expect(writeFileSpy).toHaveBeenCalled();
            const callArgs = writeFileSpy.mock.calls[0];
            const buffer = callArgs[1] as Uint8Array;
            expect(Buffer.from(buffer).toString('utf-8')).toBe('const test = 1;');
        });
        
        /**
         * INTENT: Verify directory creation for nested files
         * WHY: Creating file в non-existent directory should auto-create dirs
         */
        it('should create directories for nested files', async () => {
            const createDirSpy = jest.spyOn(vscode.workspace.fs, 'createDirectory').mockResolvedValue();
            const writeFileSpy = jest.spyOn(vscode.workspace.fs, 'writeFile').mockResolvedValue();
            
            await client.createFile('src/deep/nested/file.ts', 'content');
            
            // Should create parent directories
            expect(createDirSpy).toHaveBeenCalled();
            expect(writeFileSpy).toHaveBeenCalled();
        });
    });
    
    /**
     * INTENT: Verify file modification operations
     * WHY: Agents modify existing files
     * ADDRESSES: File update capabilities
     */
    describe('File Modification', () => {
        
        /**
         * INTENT: Verify file modification succeeds
         * WHY: Core editing operation
         */
        it('should modify existing file', async () => {
            const mockStat: vscode.FileStat = {
                type: vscode.FileType.File,
                ctime: Date.now(),
                mtime: Date.now(),
                size: 100
            };
            
            jest.spyOn(vscode.workspace.fs, 'stat').mockResolvedValue(mockStat);
            jest.spyOn(vscode.workspace.fs, 'writeFile').mockResolvedValue();
            
            await client.modifyFile('src/existing.ts', 'new content');
            
            expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
        });
        
        /**
         * INTENT: Verify error when modifying non-existent file
         * WHY: Should validate file exists before modification
         */
        it('should throw error for non-existent file', async () => {
            jest.spyOn(vscode.workspace.fs, 'stat').mockRejectedValue(new Error('Not found'));
            
            await expect(client.modifyFile('missing.ts', 'content')).rejects.toThrow('File does not exist');
        });
    });
    
    /**
     * INTENT: Verify file deletion operations
     * WHY: Agents cleanup temporary files
     * ADDRESSES: File removal capabilities
     */
    describe('File Deletion', () => {
        
        /**
         * INTENT: Verify file deletion
         * WHY: Basic delete operation
         */
        it('should delete file', async () => {
            const deleteSpy = jest.spyOn(vscode.workspace.fs, 'delete').mockResolvedValue();
            
            await client.deleteFile('src/old.ts');
            
            expect(deleteSpy).toHaveBeenCalled();
        });
    });
    
    /**
     * INTENT: Verify batch file operations
     * WHY: Agents apply multiple changes atomically
     * ADDRESSES: Workspace edit transactions
     */
    describe('Batch Changes', () => {
        
        /**
         * INTENT: Verify multiple file changes applied atomically
         * WHY: All-or-nothing для consistency
         */
        it('should apply multiple changes atomically', async () => {
            const changes: FileChange[] = [
                { type: 'create', path: 'new.ts', content: 'const x = 1;' },
                { type: 'modify', path: 'existing.ts', content: 'const y = 2;' },
                { type: 'delete', path: 'old.ts' }
            ];
            
            jest.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(true);
            jest.spyOn(vscode.workspace, 'openTextDocument').mockResolvedValue({
                getText: () => 'old content',
                positionAt: (offset: number) => new vscode.Position(0, offset)
            } as any);
            
            await client.applyChanges(changes);
            
            expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(1);
        });
        
        /**
         * INTENT: Verify failure when edit rejected
         * WHY: Should propagate VSCode edit failures
         */
        it('should throw error if edit fails', async () => {
            jest.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(false);
            
            await expect(client.applyChanges([
                { type: 'create', path: 'test.ts', content: 'test' }
            ])).rejects.toThrow('Failed to apply workspace edits');
        });
    });
    
    /**
     * INTENT: Verify code search functionality
     * WHY: Agents need to find symbols, patterns
     * ADDRESSES: Search capabilities
     */
    describe('Code Search', () => {
        
        /**
         * INTENT: Verify basic search finds matches
         * WHY: Core search functionality
         */
        it('should search code and return results', async () => {
            const mockFiles = ['src/test.ts'];
            const fileContent = 'function test() {\n  return 42;\n}';
            
            jest.spyOn(client as any, 'listFiles').mockResolvedValue(mockFiles);
            jest.spyOn(client as any, 'readFile').mockResolvedValue(fileContent);
            
            const results = await client.searchCode('test');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].file).toBe('src/test.ts');
            expect(results[0].text).toContain('test');
        });
        
        /**
         * INTENT: Verify case-insensitive search
         * WHY: User-friendly search behavior
         */
        it('should perform case-insensitive search', async () => {
            jest.spyOn(client as any, 'listFiles').mockResolvedValue(['test.ts']);
            jest.spyOn(client as any, 'readFile').mockResolvedValue('const TEST = 1;');
            
            const results = await client.searchCode('test');
            
            expect(results.length).toBeGreaterThan(0);
        });
        
        /**
         * INTENT: Verify context lines included
         * WHY: Context helps understand match location
         */
        it('should include context lines around match', async () => {
            const content = 'line1\nline2\nMATCH here\nline4\nline5';
            
            jest.spyOn(client as any, 'listFiles').mockResolvedValue(['test.ts']);
            jest.spyOn(client as any, 'readFile').mockResolvedValue(content);
            
            const results = await client.searchCode('MATCH');
            
            expect(results[0].context).toBeDefined();
            expect(results[0].context.length).toBeGreaterThan(1);
        });
    });
    
    /**
     * INTENT: Verify symbol finding (references, definitions)
     * WHY: Agents need to understand code structure
     * ADDRESSES: Code intelligence operations
     */
    describe('Symbol Finding', () => {
        
        /**
         * INTENT: Verify finding symbol references
         * WHY: Track symbol usage across codebase
         */
        it('should find references to symbol', async () => {
            const searchSpy = jest.spyOn(client, 'searchCode').mockResolvedValue([
                {
                    file: 'src/test.ts',
                    line: 5,
                    column: 10,
                    text: 'myFunction()',
                    context: []
                }
            ]);
            
            const results = await client.findReferences('myFunction');
            
            expect(searchSpy).toHaveBeenCalledWith('myFunction', undefined);
            expect(results.length).toBeGreaterThan(0);
        });
        
        /**
         * INTENT: Verify finding symbol definition
         * WHY: Locate где symbol declared
         */
        it('should find definition of symbol', async () => {
            jest.spyOn(client, 'searchCode').mockResolvedValue([
                {
                    file: 'src/test.ts',
                    line: 1,
                    column: 10,
                    text: 'function myFunction() {',
                    context: []
                }
            ]);
            
            const result = await client.findDefinition('myFunction');
            
            expect(result).not.toBeNull();
            expect(result?.text).toContain('function myFunction');
        });
        
        /**
         * INTENT: Verify null when definition not found
         * WHY: Graceful handling для undefined symbols
         */
        it('should return null if definition not found', async () => {
            jest.spyOn(client, 'searchCode').mockResolvedValue([]);
            
            const result = await client.findDefinition('nonExistentFunction');
            
            expect(result).toBeNull();
        });
    });
    
    /**
     * INTENT: Verify utility functions
     * WHY: Helper methods используются agents extensively
     * ADDRESSES: Utility operations
     */
    describe('Utility Functions', () => {
        
        /**
         * INTENT: Verify file existence check
         * WHY: Common pre-condition check
         */
        it('should check file existence', async () => {
            jest.spyOn(client, 'getFileInfo').mockResolvedValue({
                path: 'test.ts',
                size: 100,
                modified: new Date(),
                isDirectory: false
            });
            
            const exists = await client.fileExists('test.ts');
            
            expect(exists).toBe(true);
        });
        
        /**
         * INTENT: Verify file extension extraction
         * WHY: Determine file type для processing
         */
        it('should get file extension', () => {
            expect(client.getFileExtension('test.ts')).toBe('.ts');
            expect(client.getFileExtension('README.md')).toBe('.md');
        });
        
        /**
         * INTENT: Verify file type detection
         * WHY: Language-specific processing
         */
        it('should detect file type from extension', () => {
            expect(client.getFileType('test.ts')).toBe('typescript');
            expect(client.getFileType('index.js')).toBe('javascript');
            expect(client.getFileType('unknown.xyz')).toBe('unknown');
        });
        
        /**
         * INTENT: Verify current file detection
         * WHY: Context for agent operations
         */
        it('should get current open file', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/workspace/src/current.ts')
                }
            };
            
            (vscode.window as any).activeTextEditor = mockEditor;
            jest.spyOn(vscode.workspace, 'asRelativePath').mockReturnValue('src/current.ts');
            
            const currentFile = client.getCurrentFile();
            
            expect(currentFile).toBe('src/current.ts');
        });
        
        /**
         * INTENT: Verify null when no active editor
         * WHY: Graceful handling для no editor state
         */
        it('should return null when no active editor', () => {
            (vscode.window as any).activeTextEditor = undefined;
            
            const currentFile = client.getCurrentFile();
            
            expect(currentFile).toBeNull();
        });
    });
    
    /**
     * INTENT: Verify test-related operations
     * WHY: Agents need to check test coverage
     * ADDRESSES: Test infrastructure integration
     */
    describe('Test Operations', () => {
        
        /**
         * INTENT: Verify test file detection
         * WHY: Identify untested files
         */
        it('should detect if file has tests', async () => {
            jest.spyOn(client, 'fileExists').mockImplementation(async (path) => {
                return path.includes('.test.ts');
            });
            
            const hasTests = await client.hasTests('src/index.ts');
            
            expect(hasTests).toBe(true);
        });
        
        /**
         * INTENT: Verify detection when no tests
         * WHY: Identify coverage gaps
         */
        it('should return false when no tests found', async () => {
            jest.spyOn(client, 'fileExists').mockResolvedValue(false);
            
            const hasTests = await client.hasTests('src/untested.ts');
            
            expect(hasTests).toBe(false);
        });
    });
});

/**
 * INTENT: Document test coverage
 * WHY: Track what's tested и gaps
 * 
 * Coverage Summary:
 * - ✅ Initialization (workspace detection, error handling)
 * - ✅ File listing (patterns, exclusions)
 * - ✅ File info (metadata, directories, errors)
 * - ✅ File reading (UTF-8, error handling)
 * - ✅ File creation (simple, nested directories)
 * - ✅ File modification (existing files, validation)
 * - ✅ File deletion
 * - ✅ Batch changes (atomic edits, failures)
 * - ✅ Code search (basic, case-insensitive, context)
 * - ✅ Symbol finding (references, definitions)
 * - ✅ Utilities (existence, extension, type, current file)
 * - ✅ Test operations (test detection)
 * 
 * Not covered (future):
 * - ⏳ Git operations (branches, commits, stash) - requires git mock
 * - ⏳ Linting operations (diagnostics) - complex VSCode API
 * - ⏳ File opening в editor (UI interaction)
 * - ⏳ Selected text retrieval (UI state)
 * - ⏳ Git status/diff (git extension mock)
 * 
 * Estimated coverage: ~70% of MCPClient core functionality
 * Git/UI operations need separate integration test suite
 */
