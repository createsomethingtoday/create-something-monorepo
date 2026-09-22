import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('Worker Puppeteer serializes browser functions when local code generation is forbidden', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--disallow-code-generation-from-strings',
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { stringifyFunction } from '@cloudflare/puppeteer/lib/esm/puppeteer/util/Function.js';
    assert.throws(() => new Function('return 1'));
    const serialized = stringifyFunction(() => document.title);
    assert.match(serialized, /document.title/);
  `
    ],
    { encoding: 'utf8', cwd: new URL('../../', import.meta.url) }
  );
  assert.equal(result.status, 0, result.stderr);
});
