import { describe, expect, it } from 'vitest';
import type { FileEntry } from '@create-something/bundle-scanner-core';

import { buildEmbeddingText, createCodeChunks, languageForExtension } from '../src/chunk.js';

function fileEntry(overrides: Partial<FileEntry>): FileEntry {
  return {
    path: 'src/index.ts',
    sizeBytes: 0,
    ext: '.ts',
    isTextCandidate: true,
    content: '',
    tags: [],
    isIgnored: false,
    ...overrides,
  };
}

describe('code chunking', () => {
  it('maps common source extensions to languages', () => {
    expect(languageForExtension('.ts')).toBe('typescript');
    expect(languageForExtension('.svelte')).toBe('svelte');
    expect(languageForExtension('.rs')).toBe('rust');
    expect(languageForExtension('.unknown')).toBe('unknown');
  });

  it('chunks text candidates and skips ignored or binary files', async () => {
    const chunks = await createCodeChunks(
      [
        fileEntry({
          path: 'src/a.ts',
          content: ['export function a() {', '  return 1;', '}', 'export function b() {', '  return 2;', '}'].join('\n'),
        }),
        fileEntry({ path: 'dist/bundle.js', isIgnored: true, content: 'ignored' }),
        fileEntry({ path: 'image.png', ext: '.png', isTextCandidate: false, content: undefined }),
      ],
      { bundleId: 'bundle_1', maxChars: 45, overlapLines: 1, createdAt: '2026-05-12T00:00:00.000Z' },
    );

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      bundleId: 'bundle_1',
      filePath: 'src/a.ts',
      language: 'typescript',
      chunkIndex: 0,
      startLine: 1,
      endLine: 3,
    });
    expect(chunks[1]?.startLine).toBe(3);
    expect(chunks[0]?.vectorId).toBe(chunks[0]?.id);
    expect(chunks.every((chunk) => chunk.contentHash.length === 64)).toBe(true);
  });

  it('splits oversized minified lines before embedding', async () => {
    const chunks = await createCodeChunks(
      [
        fileEntry({
          path: 'assets/index.js',
          ext: '.js',
          content: 'a'.repeat(25),
          tags: ['MINIFIED_FILE'],
        }),
      ],
      { bundleId: 'bundle_1', maxChars: 10, overlapLines: 1, createdAt: '2026-05-12T00:00:00.000Z' },
    );

    expect(chunks.map((chunk) => chunk.content.length)).toEqual([10, 10, 5]);
    expect(chunks.every((chunk) => chunk.startLine === 1 && chunk.endLine === 1)).toBe(true);
  });

  it('builds embedding text with repository context and code location', () => {
    const text = buildEmbeddingText(
      {
        filePath: 'src/auth.ts',
        language: 'typescript',
        startLine: 4,
        endLine: 9,
        content: 'export function validateAdminToken() {}',
      },
      { repository: 'create-something/monorepo', ref: 'main', commitSha: 'abc123' },
    );

    expect(text).toContain('Repository: create-something/monorepo');
    expect(text).toContain('Path: src/auth.ts');
    expect(text).toContain('Lines: 4-9');
    expect(text).toContain('validateAdminToken');
  });
});
