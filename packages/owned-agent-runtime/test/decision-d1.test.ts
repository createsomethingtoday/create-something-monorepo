import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { D1DecisionRepository } from '../src/decision-d1.js';
import {
  createDecisionService, decisionRequestHash, type DecisionOutcome, type DecisionReceipt, type DecisionRequest
} from '../src/decisions.js';
import { d1, literal } from './sqlite-d1.fixture.js';

const request = (): DecisionRequest => ({ id: 'run-1', scope: 'public-guide', policyVersion: 'focus-v1',
  stateVersion: 'query-digest', question: 'Which public evidence focus is useful?', mode: 'fresh',
  fallbackId: 'ordinary', candidates: [{ id: 'framework', description: 'Public framework sources' },
    { id: 'ordinary', description: 'Ordinary public source inspection' }] });

function fixture(t: { after: (fn: () => void) => void }) {
  const directory = mkdtempSync(join(tmpdir(), 'agent-decisions-d1-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'runtime.sqlite');
  const sql = (input: string) => execFileSync('sqlite3', ['-bail', '-json', path], {
    input: `PRAGMA foreign_keys=ON; ${input}`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
  const oldMigration = readFileSync(new URL('../migrations/0001_agent_runtime.sql', import.meta.url), 'utf8');
  sql(oldMigration + `\nINSERT INTO agent_conversations VALUES ('keep-conversation', 'keep-agent', 'keep-response', 'keep-created', 'keep-updated');`);
  const before = sql('SELECT * FROM agent_conversations;');
  sql(readFileSync(new URL('../migrations/0018_agent_decisions.sql', import.meta.url), 'utf8'));
  return { path, sql, before, repository: new D1DecisionRepository(d1(path)) };
}

async function record(repository: D1DecisionRepository, value = request()) {
  const receipt = await createDecisionService({ repository,
    selector: { provider: 'fixture', model: 'fixture', version: '1', async select() { return { choice: 'framework' }; } }
  }).decide(value, async () => value);
  const outcome: DecisionOutcome = { decisionId: value.id, scope: value.scope,
    requestHash: receipt.requestHash, status: 'unknown', evidenceRef: `agent-run:${value.id}`,
    durationMs: 25, retries: 0 };
  return { receipt, outcome };
}

function insertReceipt(receipt: DecisionReceipt) {
  return `INSERT INTO agent_decisions(scope,decision_id,request_hash,selected_id,reason,fallback,receipt_json)
    VALUES (${literal(receipt.request.scope)},${literal(receipt.request.id)},${literal(receipt.requestHash)},
    ${literal(receipt.selectedId)},${literal(receipt.reason)},${receipt.fallback ? 1 : 0},${literal(JSON.stringify(receipt))});`;
}
function insertOutcome(outcome: DecisionOutcome) {
  return `INSERT INTO agent_decision_outcomes(scope,decision_id,request_hash,status,outcome_json)
    VALUES (${literal(outcome.scope)},${literal(outcome.decisionId)},${literal(outcome.requestHash)},
    ${literal(outcome.status)},${literal(JSON.stringify(outcome))});`;
}

test('D1 appends scoped decisions and outcomes idempotently, preserving existing runtime rows', async t => {
  const { repository, sql, before } = fixture(t);
  const { receipt, outcome } = await record(repository);
  await repository.putDecision(receipt);
  await repository.putOutcome(outcome);
  await repository.putOutcome(outcome);
  assert.deepEqual(await repository.getDecision(request().scope, request().id), receipt);
  assert.deepEqual(await repository.getOutcome(request().scope, request().id), outcome);
  assert.equal(sql('SELECT * FROM agent_conversations;'), before);
  assert.equal(sql('SELECT count(*) AS count FROM agent_decisions;'), '[{"count":1}]');
  assert.equal(sql('SELECT count(*) AS count FROM agent_decision_outcomes;'), '[{"count":1}]');
  assert.equal(await repository.getDecision('different-scope', request().id), undefined);
  assert.equal(await repository.getOutcome('different-scope', request().id), undefined);
  await assert.rejects(repository.putDecision({ ...receipt, elapsedMs: receipt.elapsedMs + 1 }), /conflict|immutable/);
  await assert.rejects(repository.putOutcome({ ...outcome, status: 'verified_success' }), /conflict|immutable/);
  assert.deepEqual(await repository.getOutcome(request().scope, request().id), outcome);
});

test('D1 validates outcome scope, hash, selected choice and observation shape', async t => {
  const { repository, sql } = fixture(t);
  const { outcome } = await record(repository);
  await assert.rejects(repository.putOutcome({ ...outcome, scope: 'different-scope' }), /binding/);
  await assert.rejects(repository.putOutcome({ ...outcome, requestHash: '0'.repeat(64) }), /binding/);
  await assert.rejects(repository.putOutcome({ ...outcome, durationMs: -1 }));
  const blockedRequest = { ...request(), id: 'blocked' };
  await createDecisionService({ repository }).decide(blockedRequest,
    async () => ({ ...blockedRequest, stateVersion: 'changed' }));
  const blocked = (await repository.getDecision(blockedRequest.scope, blockedRequest.id))!;
  const blockedOutcome = { ...outcome, decisionId: blockedRequest.id, requestHash: blocked.requestHash };
  await assert.rejects(repository.putOutcome(blockedOutcome), /binding/);
  assert.throws(() => sql(insertOutcome(blockedOutcome)), /binding_missing/);
  assert.throws(() => sql(insertOutcome({ ...outcome, requestHash: '0'.repeat(64) })), /binding_missing/);
});

test('D1 tables reject overwrites, deletion, impossible receipts and SQL identity drift', async t => {
  const { repository, sql } = fixture(t);
  const { receipt, outcome } = await record(repository);
  await repository.putOutcome(outcome);
  for (const table of ['agent_decisions', 'agent_decision_outcomes']) {
    assert.throws(() => sql(`UPDATE ${table} SET scope = 'changed';`), /immutable/);
    assert.throws(() => sql(`DELETE FROM ${table};`), /immutable/);
  }
  for (const mutation of [{ reason: 'state_changed' }, { fallback: true }, { selectedId: 'missing' }]) {
    const changed = { ...receipt, request: { ...receipt.request, id: `bad-${JSON.stringify(mutation)}` }, ...mutation } as DecisionReceipt;
    changed.requestHash = await decisionRequestHash(changed.request);
    await assert.rejects(repository.putDecision(changed));
    assert.throws(() => sql(insertReceipt(changed)));
  }
  const mismatch = { ...receipt, request: { ...receipt.request, id: 'new' } };
  assert.throws(() => sql(insertReceipt(mismatch).replace("'public-guide','new'", "'wrong-scope','new'")));
});

test('D1 readback detects tampered payload hashes, scope bindings and receipt semantics', async t => {
  const { repository, sql } = fixture(t);
  const { receipt, outcome } = await record(repository);
  await repository.putOutcome(outcome);
  // Simulate storage corruption after deliberately removing storage-level safeguards.
  sql('DROP TRIGGER agent_decisions_no_update; PRAGMA ignore_check_constraints=ON; ' +
    `UPDATE agent_decisions SET receipt_json = ${literal(JSON.stringify({ ...receipt,
      request: { ...receipt.request, stateVersion: 'tampered' } }))};`);
  await assert.rejects(repository.getDecision(request().scope, request().id), /hash mismatch/);
  sql('PRAGMA ignore_check_constraints=ON; ' +
    `UPDATE agent_decisions SET receipt_json = ${literal(JSON.stringify({ ...receipt, reason: 'state_changed' }))};`);
  await assert.rejects(repository.getDecision(request().scope, request().id), /semantics/);
  await assert.rejects(repository.getOutcome(request().scope, request().id), /semantics/);
  sql('PRAGMA ignore_check_constraints=ON; ' +
    `UPDATE agent_decisions SET receipt_json = ${literal(JSON.stringify({ ...receipt,
      request: { ...receipt.request, scope: 'other' } }))};`);
  await assert.rejects(repository.getDecision(request().scope, request().id), /binding/);
});

test('D1 rejects conflicting simultaneous observations without changing the retained result', async t => {
  const { repository } = fixture(t);
  const { outcome } = await record(repository);
  const results = await Promise.allSettled([
    repository.putOutcome(outcome), repository.putOutcome({ ...outcome, status: 'verified_failure' })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.ok(['unknown', 'verified_failure'].includes((await repository.getOutcome(outcome.scope, outcome.decisionId))!.status));
});

test('D1 append-only evidence also rejects INSERT OR REPLACE with recursive triggers disabled', async t => {
  const { repository, sql } = fixture(t);
  const { receipt, outcome } = await record(repository);
  await repository.putOutcome(outcome);
  assert.throws(() => sql('PRAGMA recursive_triggers=OFF; ' +
    insertReceipt({ ...receipt, elapsedMs: receipt.elapsedMs + 1 }).replace('INSERT INTO', 'INSERT OR REPLACE INTO')), /immutable/);
  assert.throws(() => sql('PRAGMA recursive_triggers=OFF; ' +
    insertOutcome({ ...outcome, status: 'verified_success' }).replace('INSERT INTO', 'INSERT OR REPLACE INTO')), /immutable/);
  assert.deepEqual(await repository.getDecision(request().scope, request().id), receipt);
  assert.deepEqual(await repository.getOutcome(request().scope, request().id), outcome);
});
