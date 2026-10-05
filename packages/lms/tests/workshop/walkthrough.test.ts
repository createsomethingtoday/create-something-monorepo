import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setupSteps, initialSetup, restoreSetup, applySetup, starterGuide, healthResponse } from '../../src/lib/workshop/walkthrough';
import worker from '../../starter/pcn-workshop/worker';

const starter = fileURLToPath(new URL('../../starter/pcn-workshop/', import.meta.url));
const archive = fileURLToPath(new URL('../../static/workshop/pcn-starter.zip', import.meta.url));

test('interrupted navigation and self-reports resume without implying provider verification', () => {
  let state = applySetup(initialSetup(), { type: 'check', step: 'starter', checked: true });
  state = applySetup(state, { type: 'select', step: 'account' });
  assert.deepEqual(restoreSetup(JSON.stringify(state)), { step: 'account', checked: ['starter'] });
  state = applySetup(state, { type: 'select', step: 'starter' });
  assert.deepEqual(state.checked, ['starter']);
  assert.deepEqual(Object.keys(state).sort(), ['checked', 'step']);
});

test('fresh-state check intentions merge distinct tabs, repeat idempotently, and uncheck', () => {
  let state = initialSetup();
  for (const step of ['starter', 'repository', 'starter']) state = applySetup(state, { type: 'check', step, checked: true });
  assert.deepEqual(state.checked, ['starter', 'repository']);
  state = applySetup(state, { type: 'check', step: 'starter', checked: false });
  state = applySetup(state, { type: 'check', step: 'starter', checked: false });
  assert.deepEqual(state.checked, ['repository']);
});

test('malformed saved state cannot inject steps, duplicate checks, or arbitrary data', () => {
  for (const raw of [null, 'broken', '{}', 'null', '{"step":"unknown","checked":[]}']) assert.deepEqual(restoreSetup(raw), initialSetup());
  assert.deepEqual(restoreSetup('{"step":"deploy","checked":["starter","starter",null,{},"secret"]}'), { step: 'deploy', checked: ['starter'] });
  assert.deepEqual(applySetup(initialSetup(), { type: 'select', step: 'unknown' }), initialSetup());
});

test('downloadable README and every archived file match the actual starter', () => {
  assert.equal(readFileSync(starter + 'README.md', 'utf8'), starterGuide());
  const files = readdirSync(starter).sort();
  const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n').map(s => s.replace('pcn-workshop-starter/', '')).sort();
  assert.deepEqual(entries, files);
  for (const file of files) assert.deepEqual(execFileSync('unzip', ['-p', archive, 'pcn-workshop-starter/' + file]), readFileSync(starter + file), file);
  const ignored = readFileSync(starter + '.gitignore', 'utf8');
  for (const item of ['node_modules/', '.wrangler/', '.env', '.dev.vars']) assert.ok(ignored.includes(item));
});

test('walkthrough health contract matches Worker and shipped test/deploy commands', async () => {
  const response = worker.fetch();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), healthResponse);
  const pkg = JSON.parse(readFileSync(starter + 'package.json', 'utf8'));
  assert.equal(pkg.scripts.deploy, 'wrangler deploy');
  assert.equal(pkg.scripts.test, 'node --import tsx --test workflow.test.ts');
  const config = JSON.parse(readFileSync(starter + 'wrangler.jsonc', 'utf8'));
  assert.equal(config.main, 'worker.ts');
  assert.equal(config.compatibility_date, '2026-10-05');
  assert.equal(config.account_id, undefined); // Each learner supplies their own ID, never ours.
});

test('all five steps have success, recovery and evidence without credential collection', () => {
  assert.deepEqual(setupSteps.map(s => s.id), ['starter', 'repository', 'account', 'deploy', 'confirm']);
  for (const step of setupSteps) {
    assert.ok(step.success.length > 40);
    assert.ok(step.evidence.length > 40);
    assert.ok(step.recovery.length >= 2);
  }
  const text = starterGuide();
  assert.ok(text.includes('D1, R2, or real integration secrets'));
  assert.ok(text.includes('result unknown'));
  assert.ok(text.includes('Private'));
  assert.ok(text.includes('do not force-push'));
  assert.ok(!text.includes('9645bd52e640b8a4f40a3a55ff1dd75a'));
});
