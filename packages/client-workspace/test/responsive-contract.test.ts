import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeSource = await readFile(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

test('mobile workspace contains long agent and evidence strings inside the viewport', () => {
  assert.match(routeSource, /\.workspace-shell \{[^}]*width: 100%;/s);
  assert.match(routeSource, /\.conversation \{[^}]*min-width: 0;/s);
  assert.match(routeSource, /\.message p \{[^}]*overflow-wrap: anywhere;/s);
  assert.match(routeSource, /\.activity-item p \{[^}]*overflow-wrap: anywhere;/s);
  assert.match(routeSource, /@media \(max-width: 720px\) \{[\s\S]*\.topbar \{[^}]*min-width: 0;/s);
});

test('desktop runtime can recheck Codex and restores inactive receipts read-only', () => {
  assert.match(routeSource, /fetch\('\/api\/runtime\/codex'\)/);
  assert.match(routeSource, />Recheck Codex</);
  assert.match(routeSource, /sessionActive = result\.active/);
  assert.match(routeSource, /disabled=\{sending \|\| !sessionActive\}/);
});
