import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractMotion, closeBrowser } from '../dist/extractor.js';
for (const [name, value] of [
  ['unset', undefined],
  ['relative', 'chromium'],
  ['missing', '/no-such-gigi-synthetic-browser'],
]) {
  test(`fails clearly when browser is ${name}`, async () => {
    const before = process.env.PUPPETEER_EXECUTABLE_PATH;
    try {
      if (value === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH;
      else process.env.PUPPETEER_EXECUTABLE_PATH = value;
      await assert.rejects(
        extractMotion('data:text/html,synthetic', { type: 'hover' }),
        /configured browser|Configure PUPPETEER_EXECUTABLE_PATH/,
      );
    } finally {
      if (before === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH;
      else process.env.PUPPETEER_EXECUTABLE_PATH = before;
      await closeBrowser();
    }
  });
}
test('directory and non-executable file fail before launch', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gigi-browser-'));
  const before = process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    await writeFile(path.join(dir, 'browser'), 'synthetic', { mode: 0o600 });
    // Windows does not implement POSIX executable permission bits.
    const invalidPaths =
      process.platform === 'win32' ? [dir] : [dir, path.join(dir, 'browser')];
    for (const p of invalidPaths) {
      process.env.PUPPETEER_EXECUTABLE_PATH = p;
      await assert.rejects(
        extractMotion('data:text/html,synthetic', { type: 'hover' }),
        /missing or not executable/,
      );
    }
  } finally {
    if (before === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH;
    else process.env.PUPPETEER_EXECUTABLE_PATH = before;
    await rm(dir, { recursive: true, force: true });
  }
});
