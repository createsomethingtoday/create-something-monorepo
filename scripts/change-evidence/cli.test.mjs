import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { initialize, validate, report } from './cli.mjs';
const cli = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const valid = () => ({
  ...initialize(), issue: 'CRE-2467', request: 'issue request', repository: 'repository URL',
  owner: 'engineering', builder: 'builder-session', scope: 'CLI', acceptance: ['validates'],
  policy: ['policy.git-light-agent-delivery.v1'], allowedActions: ['local edits'],
  sourceRevision: 'a'.repeat(40), followUp: ['review']
});
const released = () => {
  const record = valid();
  record.stage = 'released';
  for (const key of ['functional', 'release']) record.gates[key] = { status: 'passed', evidence: ['receipt'], limits: 'fixture only' };
  record.gates.product = { status: 'not-applicable', evidence: [], limits: 'No UI; report reviewed separately' };
  record.independentReview = { status: 'passed', reviewer: 'review-session', sourceRevision: record.sourceRevision, evidence: ['review receipt'] };
  record.merge = { receipt: 'PR receipt', revision: record.sourceRevision };
  record.release = { authorization: 'authorization receipt', artifact: 'artifact digest', sourceRevision: record.sourceRevision, liveVerification: ['live receipt'], rollback: 'revert' };
  return record;
};
const metric = () => ({ name: 'cost', period: 'baseline', unit: 'USD', sampleSize: 0, value: null, source: 'not collected', reason: 'pending', limits: 'no invoice', cohort: 'maintenance', window: 'pilot week 1' });

test('local and released fixtures satisfy distinct contracts', () => {
  assert.deepEqual(validate(valid()), []);
  assert.deepEqual(validate(released()), []);
  assert.equal(initialize().issue, '');
});
test('malformed shapes return errors without throwing', () => {
  for (const value of [null, [], {}, initialize()]) assert.ok(validate(value).length);
  for (const field of ['metrics', 'release', 'independentReview', 'gates', 'merge']) {
    for (const value of [null, [], {}, 1, 'bad']) {
      const record = valid(); record[field] = value;
      // An empty metrics array is explicitly permitted as unavailable.
      if (field === 'metrics' && Array.isArray(value)) continue;
      assert.ok(validate(record).length, `${field}: ${JSON.stringify(value)}`);
    }
  }
});
test('every required release receipt is enforced', () => {
  for (const field of ['authorization', 'artifact', 'rollback', 'sourceRevision', 'liveVerification']) {
    const record = released(); record.release[field] = field === 'liveVerification' ? [] : '';
    assert.ok(validate(record).length, field);
  }
  const record = valid(); record.stage = 'released';
  assert.ok(validate(record).some(error => error.includes('authorization')));
});
test('failed or untested product cannot claim release', () => {
  for (const status of ['failed', 'untested']) {
    const record = released(); record.gates.product.status = status;
    assert.ok(validate(record).some(error => error.includes('product must pass')));
  }
});
test('review must be separate and bound to evaluated source', () => {
  const record = released(); record.independentReview.reviewer = ` ${record.builder.toUpperCase()} `;
  assert.ok(validate(record).some(error => error.includes('differ')));
  record.independentReview.reviewer = 'review-session'; record.independentReview.sourceRevision = 'b'.repeat(40);
  assert.ok(validate(record).some(error => error.includes('evaluated revision')));
});
test('merged and accepted claims need their own proof', () => {
  const record = released(); record.stage = 'merged'; record.merge.receipt = '';
  assert.ok(validate(record).some(error => error.includes('merge proof')));
  const accepted = released(); accepted.stage = 'business-accepted';
  assert.ok(validate(accepted).some(error => error.includes('business acceptance')));
  accepted.businessAcceptance = 'client receipt'; assert.deepEqual(validate(accepted), []);
});
test('passed gate needs evidence', () => {
  const record = valid(); record.gates.functional.status = 'passed';
  assert.ok(validate(record).length);
});
test('unavailable, measured zero and empty metrics retain meaning', () => {
  const record = valid(); record.metrics = [metric()]; assert.deepEqual(validate(record), []);
  delete record.metrics[0].reason; assert.ok(validate(record).length);
  record.metrics = [{ ...metric(), value: 0, sampleSize: 1 }]; assert.deepEqual(validate(record), []);
  record.metrics[0].sampleSize = 0; assert.ok(validate(record).some(error => error.includes('require samples')));
  assert.equal(report(valid()).measurement.status, 'unavailable');
});
test('metrics reject missing context and duplicate observations', () => {
  for (const key of ['source', 'limits', 'cohort', 'window', 'unit']) {
    const record = valid(); record.metrics = [metric()]; delete record.metrics[0][key];
    assert.ok(validate(record).length, key);
  }
  const record = valid(); record.metrics = [metric(), metric()]; assert.ok(validate(record).length);
});
test('report preserves all evidence and does not infer uplift', () => {
  const record = released(); const output = report(record);
  for (const [key, value] of Object.entries(record)) assert.deepEqual(output[key], value);
  assert.match(output.authority, /does not authenticate/);
});
test('CLI init refuses overwrite; validate and report exercise real files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'change-evidence-'));
  try {
    const file = join(dir, 'record.json');
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(run('init', file).status, 0);
    const draft = readFileSync(file, 'utf8');
    assert.equal(run('init', file).status, 1); assert.equal(readFileSync(file, 'utf8'), draft);
    assert.equal(run('validate', file).status, 1);
    writeFileSync(file, JSON.stringify(valid()));
    assert.equal(run('validate', file).status, 0);
    assert.equal(JSON.parse(run('report', file).stdout).sourceRevision, valid().sourceRevision);
    assert.equal(run('execute', file).status, 1);
    assert.equal(run('validate', file, 'extra').status, 1);
    writeFileSync(file, '{'); assert.equal(run('validate', file).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
