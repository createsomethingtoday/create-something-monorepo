import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';

import { processZipBuffer, isUnsafeEntryPath, normalizeEntryPath } from './zip';
import { defaultConfig } from '../policy/default-config';
import type { ScanConfig } from '../types';

const noop = () => {};

async function makeZip(files: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('processZipBuffer', () => {
  it('extracts safe files and normalizes path separators', async () => {
    const buffer = await makeZip({ 'src/app.js': 'ok', 'sub\\nested.js': 'ok' });
    const files = await processZipBuffer(buffer, defaultConfig, noop);

    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(['src/app.js', 'sub/nested.js']);
  });

  it('skips __MACOSX system paths during extraction', async () => {
    // NB: JSZip collapses `../` when *building* a fixture, so traversal paths
    // are exercised directly against the guard below. __MACOSX survives.
    const buffer = await makeZip({ 'good.js': 'ok', '__MACOSX/._app.js': 'junk' });
    const files = await processZipBuffer(buffer, defaultConfig, noop);

    expect(files.map((f) => f.path)).toEqual(['good.js']);
  });

  it('flags zip-slip, absolute, and __MACOSX paths as unsafe', () => {
    expect(isUnsafeEntryPath('../evil.js')).toBe(true);
    expect(isUnsafeEntryPath('nested/../../evil.js')).toBe(true);
    expect(isUnsafeEntryPath('/etc/passwd')).toBe(true);
    expect(isUnsafeEntryPath('__MACOSX/._app.js')).toBe(true);
    expect(isUnsafeEntryPath('src/app.js')).toBe(false);
  });

  it('normalizes backslashes and strips leading slashes', () => {
    expect(normalizeEntryPath('sub\\nested\\file.js')).toBe('sub/nested/file.js');
    expect(normalizeEntryPath('/leading/slash.js')).toBe('leading/slash.js');
  });

  it('throws when file count exceeds the limit', async () => {
    const buffer = await makeZip({ 'a.js': '1', 'b.js': '2', 'c.js': '3' });
    const config: ScanConfig = {
      ...defaultConfig,
      globalScanConfig: {
        ...defaultConfig.globalScanConfig,
        zipSafety: { ...defaultConfig.globalScanConfig.zipSafety, maxFiles: 2 }
      }
    };

    await expect(processZipBuffer(buffer, config, noop)).rejects.toThrow(/too many files/i);
  });

  it('throws when total unzipped size exceeds the limit', async () => {
    const buffer = await makeZip({ 'big.js': 'x'.repeat(1000) });
    const config: ScanConfig = {
      ...defaultConfig,
      globalScanConfig: {
        ...defaultConfig.globalScanConfig,
        zipSafety: { ...defaultConfig.globalScanConfig.zipSafety, maxTotalUnzippedBytes: 100 }
      }
    };

    await expect(processZipBuffer(buffer, config, noop)).rejects.toThrow(/exceeds limit/i);
  });

  it('wraps invalid ZIP input in a descriptive error', async () => {
    const notAZip = new TextEncoder().encode('this is not a zip file').buffer;
    await expect(processZipBuffer(notAZip, defaultConfig, noop)).rejects.toThrow(/Failed to process ZIP/i);
  });
});
