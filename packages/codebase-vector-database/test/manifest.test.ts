import { describe, expect, it } from 'vitest';
import type { FileEntry } from '@create-something/bundle-scanner-core';

import { buildContentManifestHash } from '../src/manifest.js';

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

describe('content manifest hashing', () => {
  it('is stable across file order and newline style', async () => {
    const first = await buildContentManifestHash([
      fileEntry({ path: 'src/a.ts', content: 'export const a = 1;\r\n' }),
      fileEntry({ path: 'src/b.ts', content: 'export const b = 2;\n' }),
    ]);
    const second = await buildContentManifestHash([
      fileEntry({ path: 'src/b.ts', content: 'export const b = 2;\n' }),
      fileEntry({ path: 'src/a.ts', content: 'export const a = 1;\n' }),
    ]);

    expect(first).toBe(second);
  });

  it('ignores archive-only files that are not indexed as text candidates', async () => {
    const withBinary = await buildContentManifestHash([
      fileEntry({ path: 'src/a.ts', content: 'export const a = 1;' }),
      fileEntry({ path: 'image.png', ext: '.png', isTextCandidate: false, content: undefined }),
    ]);
    const withoutBinary = await buildContentManifestHash([fileEntry({ path: 'src/a.ts', content: 'export const a = 1;' })]);

    expect(withBinary).toBe(withoutBinary);
  });
});
