import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'marketing-image-assets-check.mjs');

function runCheck(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
}

test('marketing image asset check validates templates and existing article metadata', () => {
  const result = runCheck('--format', 'json');
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.audit.passed, true);
  assert(payload.results.some((item) =>
    item.target === 'packages/agency/content/templates/marketing/buyer-intent-article-brief.md'
    && item.ok === true));
  assert(payload.results.some((item) =>
    item.target === 'packages/agency/content/templates/marketing/image-prompt.md'
    && item.ok === true));
  assert(payload.results.some((item) =>
    item.target === 'packages/agency/content/templates/marketing/image-metadata.md'
    && item.ok === true));
  assert(payload.results.some((item) =>
    item.target.endsWith('/metadata.md')
    && item.ok === true));
});
