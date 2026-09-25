import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkLocalLinks } from '../scripts/agent-wiki-support.mjs';

test('wiki link validation rejects broken local targets but accepts generated siblings and external URLs', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'wiki-links-'));
  try {
    mkdirSync(path.join(root, 'docs'));
    writeFileSync(path.join(root, 'policy.md'), '# Policy');
    const pages = new Map([
      ['README.md', '[policy](../policy.md) [page](./routes.md) [missing](../missing.md) [web](https://example.com)'],
      ['routes.md', '# Routes'],
    ]);
    assert.deepEqual(checkLocalLinks(path.join(root, 'docs'), pages), ['README.md:1: ../missing.md']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
