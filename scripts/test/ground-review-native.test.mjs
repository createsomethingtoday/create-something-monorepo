import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const binary = process.env.GROUND_TEST_BINARY || fileURLToPath(new URL('../../packages/ground/target/debug/ground', import.meta.url));
const wrapper = fileURLToPath(new URL('../ground-review.mjs', import.meta.url));

test('real native receipts distinguish recovered types, findings and incomplete mixed coverage', t => {
  const root = mkdtempSync(join(tmpdir(), 'ground-native-review-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GROUND_BINARY: binary, GIT_AUTHOR_NAME: 'Ground fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_NAME: 'Ground fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test' };
  const run = (command, args) => spawnSync(command, args, { cwd: root, env, encoding: 'utf8', timeout: 30000 });
  const git = (...args) => { const r = run('git', args); assert.equal(r.status, 0, r.stderr); };
  const write = (path, value) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), value); };
  git('init', '-q');
  write('.gitignore', '.ground/\n');
  for (const name of ['one', 'two']) {
    write(`packages/${name}/package.json`, JSON.stringify({ name }));
    write(`packages/${name}/entry.ts`, 'export const value = 1;\n');
  }
  git('add', '.'); git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'synthetic baseline');
  const review = () => {
    const result = run(process.execPath, [wrapper, '--base', 'HEAD', '--format', 'json']);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  write('packages/one/entry.ts', "export async function load(original: <T>() => Promise<T>) { return await original<typeof import('./module')>(); }\n");
  let receipt = review();
  assert.equal(receipt.status, 'clear');
  assert.equal(receipt.coverage.checks.duplicates.status, 'completed');
  assert.equal(receipt.coverage.checks.duplicates.analyzable_changed_files, 1);

  write('packages/two/entry.ts', 'export function broken( {');
  receipt = review();
  assert.equal(receipt.coverage.checks.duplicates.status, 'failed');
  assert.equal(receipt.targets.find(target => target.path === 'packages/one').coverage.checks.duplicates.status, 'completed');
  assert.equal(receipt.targets.find(target => target.path === 'packages/two').coverage.checks.duplicates.status, 'failed');
  assert.notEqual(receipt.status, 'clear');

  write('packages/two/entry.ts', 'export const value = 1;\n');
  const duplicate = 'export function compute(value: number) {\n const doubled = value * 2;\n const adjusted = doubled + 3;\n const result = adjusted * adjusted;\n return result;\n}\n';
  write('packages/one/entry.ts', duplicate); write('packages/one/copy.ts', duplicate);
  receipt = review();
  assert.equal(receipt.status, 'findings');
  assert.equal(receipt.coverage.checks.duplicates.status, 'completed');
  assert(receipt.findings.some(finding => finding.type === 'duplicate_function'));
});
