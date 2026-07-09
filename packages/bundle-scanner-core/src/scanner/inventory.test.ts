import { describe, expect, it } from 'vitest';

import { buildInventory } from './inventory';
import { defaultConfig } from '../policy/default-config';
import type { UnzippedFile } from '../types';

const encoder = new TextEncoder();

function textFile(path: string, content: string): UnzippedFile {
  return { path, data: encoder.encode(content) };
}

function find(inv: ReturnType<typeof buildInventory>, path: string) {
  return inv.find((f) => f.path === path);
}

describe('buildInventory', () => {
  it('decodes text files and marks them as scan candidates', () => {
    const inv = buildInventory([textFile('src/app.js', 'const x = 1;')], defaultConfig);
    const entry = find(inv, 'src/app.js');
    expect(entry?.isTextCandidate).toBe(true);
    expect(entry?.content).toBe('const x = 1;');
    expect(entry?.ext).toBe('.js');
  });

  it('tags minified files', () => {
    const inv = buildInventory([textFile('huge.js', 'a'.repeat(600))], defaultConfig);
    expect(find(inv, 'huge.js')?.tags).toContain('MINIFIED_FILE');
  });

  it('tags generated/bundled files via bundler signatures', () => {
    const inv = buildInventory(
      [textFile('clean.js', 'console.log(1)\n//# sourceMappingURL=app.js.map')],
      defaultConfig
    );
    expect(find(inv, 'clean.js')?.tags).toContain('GENERATED_BUNDLE');
  });

  it('does not treat invalid UTF-8 as a text candidate', () => {
    const inv = buildInventory([{ path: 'weird.js', data: new Uint8Array([0xff, 0xfe, 0xfd]) }], defaultConfig);
    const entry = find(inv, 'weird.js');
    expect(entry?.isTextCandidate).toBe(false);
    expect(entry?.content).toBeUndefined();
  });

  it('ignores hard-excluded and inventory-only files', () => {
    const inv = buildInventory(
      [
        textFile('node_modules/pkg/index.js', 'x'),
        textFile('assets/app.min.js', 'x'),
        { path: 'logo.png', data: new Uint8Array([0x89, 0x50]) }
      ],
      defaultConfig
    );
    expect(find(inv, 'node_modules/pkg/index.js')?.isIgnored).toBe(true);
    expect(find(inv, 'assets/app.min.js')?.isIgnored).toBe(true);
    expect(find(inv, 'logo.png')?.isIgnored).toBe(true);
    expect(find(inv, 'logo.png')?.isTextCandidate).toBe(false);
  });

  it('tags source maps, test files, and vendor code', () => {
    const inv = buildInventory(
      [
        textFile('dist/app.js.map', '{}'),
        textFile('src/app.test.js', 'x'),
        textFile('vendor/lib.js', 'x')
      ],
      defaultConfig
    );
    expect(find(inv, 'dist/app.js.map')?.tags).toContain('SOURCE_MAP');
    expect(find(inv, 'src/app.test.js')?.tags).toContain('TEST_FILE');
    expect(find(inv, 'vendor/lib.js')?.tags).toContain('VENDOR_CODE');
  });
});
