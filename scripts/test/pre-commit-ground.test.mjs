import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
const hook = readFileSync(new URL('../../.husky/pre-commit', import.meta.url), 'utf8');
function fixture(t, staged, validators = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ground-hook-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const write = (path, text, executable = false) => {
    const full = join(dir, path); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, text);
    if (executable) chmodSync(full, 0o755);
  };
  write('hook', hook);
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
  for (const [path, text] of Object.entries(staged)) write(path, text);
  assert.equal(spawnSync('git', ['add', '.'], { cwd: dir }).status, 0);
  for (const [path, text] of Object.entries(validators)) write(path, text, true);
  return { write, run: () => spawnSync('sh', ['hook'], { cwd: dir, encoding: 'utf8' }) };
}
for (const [name, staged, script] of [
  ['lockfile', 'package.json', 'scripts/check-staged-lockfile-sync.mjs'],
  ['MCP coverage', 'packages/example/index.ts', 'scripts/check-staged-mcp-registry-coverage.mjs'],
]) test(`missing Ground does not skip failing ${name} validation`, t => {
  const f = fixture(t, { [staged]: '{}' }, { [script]: "console.log('validator executed'); process.exit(1);" });
  const result = f.run();
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /validator executed/);
});
test('registry-only changes run their validator without Ground', t => {
  const f = fixture(t, { 'config/mcp-hub/registry.json': '{}' }, { 'node_modules/.bin/tsx': '#!/bin/sh\necho registry-executed\nexit 1\n' });
  const result = f.run(); assert.equal(result.status, 1, result.stdout); assert.match(result.stdout, /registry-executed/);
});
test('required registry validation fails when its runner is missing', t => {
  const result = fixture(t, { 'config/mcp-hub/registry.json': '{}' }).run();
  assert.equal(result.status, 1); assert.match(result.stdout, /registry validation.*(?:unavailable|cannot run)/i);
});
test('missing Ground leaves independent Svelte checks active and clearly unevaluated native checks', t => {
  const f = fixture(t, { 'src/Example.svelte': '<p style="color: #fff">x</p>\n<script>export let label: string;</script>' });
  const result = f.run(); assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Ground.*(?:unavailable|not found)/i);
  assert.match(result.stdout, /Svelte 4/);
  assert.doesNotMatch(result.stdout, /No duplicates found/);
});
test('native execution error is reported as unevaluated, not a clean advisory result', t => {
  const f = fixture(t, { 'src/a.ts': 'export const x = 1;' });
  f.write('packages/ground/target/release/ground', '#!/bin/sh\necho parse-error >&2\nexit 2\n', true);
  const result = f.run(); assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /duplicate.*(?:incomplete|unevaluated)/i);
  assert.doesNotMatch(result.stdout, /No duplicates found/);
});
test('CSS-only changes outside packages are evaluated or explicitly skipped', t => {
  const result = fixture(t, { 'styles/example.css': 'a {color: red}' }).run();
  assert.match(result.stdout, /Ground.*(?:unavailable|not found)/i);
});
