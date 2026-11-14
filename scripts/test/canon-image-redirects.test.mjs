import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const cases = [
  ['an exact static exclusion reaches the redirect', ['/workshop/canon.png'], 0],
  ['a static prefix exclusion reaches the redirect', ['/workshop/*'], 0],
  ['a similarly named file still reaches the worker', ['/workshop/canonXpng'], 1],
  ['a trailing slash does not exclude the image', ['/workshop/canon.png/'], 1],
  ['an existing redirect without a static exclusion fails', [], 1]
];
for (const [name, exclude, expected] of cases) {
  test(name, () => {
    const artifact = mkdtempSync(join(tmpdir(), 'canon-redirect-'));
    try {
      writeFileSync(join(artifact, '_redirects'), readFileSync(resolve(root, 'packages/lms/_redirects')));
      writeFileSync(join(artifact, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude }));
      const result = spawnSync(process.execPath, [resolve(root, 'scripts/check-canon-image-redirects.mjs'), '--property', 'lms', '--artifact', artifact], { encoding: 'utf8' });
      assert.equal(result.status, expected, result.stderr || result.stdout);
      const report = JSON.parse(result.stdout);
      assert.equal(report.findings.length, expected);
      if (expected) assert.match(report.findings[0].reason, /worker intercepts/);
    } finally {
      rmSync(artifact, { recursive: true, force: true });
    }
  });
}
