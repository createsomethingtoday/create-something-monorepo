import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'delivery-update.mjs');

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'delivery-update-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('delivery Image 2 prompts include Canon/Ona standard and audit metadata', (t) => {
  const outDir = makeWorkspace(t);
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT,
      '--project',
      'abundance',
      '--date',
      '2026-06-22',
      '--out',
      outDir,
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const promptPath = path.join(
    outDir,
    'abundance',
    'assets',
    'prompts',
    'abundance-image2-delivery-graph-2026-06-22.txt',
  );
  const prompt = readFileSync(promptPath, 'utf8');

  assert.match(prompt, /^Model: gpt-image-2$/m);
  assert.match(prompt, /^Snapshot: gpt-image-2-2026-04-21$/m);
  assert.match(prompt, /^Generated: 2026-06-22$/m);
  assert.match(prompt, /^Source manifest: config\/delivery\/projects\/abundance\.json$/m);
  assert.match(prompt, /^Image family: delivery-graph$/m);
  assert.match(prompt, /^Review status: draft$/m);
  assert.match(prompt, /Canon image standard:/);
  assert.match(prompt, /Use Ona\.com as the design and communication foundation/);
  assert.match(prompt, /Translate that foundation into CREATE SOMETHING artifact language/);
  assert.match(prompt, /system maps, MCP boundaries, policy gates, receipts, validation proof, owners, and handoff state/);
  assert.match(prompt, /Avoid glowing robots, circuit faces, blue AI gradients, generic brains/);
  assert.match(prompt, /Project prompt:/);
  assert.doesNotMatch(prompt, /Braintrust/i);
});
