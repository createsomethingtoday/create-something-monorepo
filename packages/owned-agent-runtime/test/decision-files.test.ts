import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDecisionService, type DecisionRequest, type DecisionOutcome } from '../src/decisions.js';
import { FileDecisionRepository } from '../src/decision-files.js';
import { runDecisionCli } from '../scripts/decisions.js';

const request: DecisionRequest = {
  id: '../../decision', scope: '../../tenant', policyVersion: 'policy-1', stateVersion: 'state-1',
  question: 'Which source should be inspected first?',
  candidates: [{ id: 'source', description: 'Canonical source' }, { id: 'fallback', description: 'Ordinary inspection' }],
  fallbackId: 'fallback', mode: 'fresh'
};

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'decision-files-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, 'private');
  const repository = new FileDecisionRepository(directory);
  const service = createDecisionService({ repository, selector: {
    provider: 'fixture', model: 'fixture', version: '1', select: async () => ({ choice: 'source' })
  } });
  const receipt = await service.decide(request, async () => request);
  const outcome: DecisionOutcome = {
    decisionId: request.id, scope: request.scope, requestHash: receipt.requestHash,
    status: 'verified_success', evidenceRef: 'local:test-proof', durationMs: 10, retries: 0
  };
  return { root, directory, repository, receipt, outcome };
}

test('file receipts are private, immutable, scoped and safe for arbitrary identity text', async t => {
  const { root, directory, repository, receipt, outcome } = await fixture(t);
  const files = await readdir(directory);
  assert.equal(files.length, 1);
  assert.match(files[0], /^decision-[a-f0-9]{64}\.json$/);
  assert.deepEqual((await readdir(root)).sort(), ['private']);
  assert.equal((await stat(directory)).mode & 0o077, 0);
  assert.equal((await stat(join(directory, files[0]))).mode & 0o077, 0);
  assert.deepEqual(await repository.getDecision(request.scope, request.id), receipt);
  assert.equal(await repository.getDecision('other-tenant', request.id), undefined);
  await repository.putDecision(receipt);
  await assert.rejects(repository.putDecision({ ...receipt, elapsedMs: receipt.elapsedMs + 1 }), /conflict/);
  await repository.putOutcome(outcome);
  await repository.putOutcome(outcome);
  assert.deepEqual(await repository.getOutcome(request.scope, request.id), outcome);
  await assert.rejects(repository.putOutcome({ ...outcome, status: 'verified_failure' }), /conflict/);
  await assert.rejects(repository.putOutcome({ ...outcome, scope: 'other-tenant' }), /binding/);
  await assert.rejects(repository.putOutcome({ ...outcome, requestHash: '0'.repeat(64) }), /binding/);
});

test('readback detects changed request hashes and malformed records', async t => {
  const { directory, repository, receipt } = await fixture(t);
  const filename = join(directory, (await readdir(directory))[0]);
  await writeFile(filename, JSON.stringify({ ...receipt, request: { ...receipt.request, stateVersion: 'changed' } }));
  await assert.rejects(repository.getDecision(request.scope, request.id), /hash mismatch/);
  await writeFile(filename, JSON.stringify({ ...receipt, authority: 'authorized' }));
  await assert.rejects(repository.getDecision(request.scope, request.id));
});

test('readback rejects impossible receipt semantics even when the request hash still matches', async t => {
  const { directory, repository, receipt } = await fixture(t);
  const filename = join(directory, (await readdir(directory))[0]);
  for (const mutation of [
    { reason: 'state_changed' }, { reason: 'pinned' }, { fallback: true },
    { selectedId: null }, { selector: null }
  ]) {
    await writeFile(filename, JSON.stringify({ ...receipt, ...mutation }));
    await assert.rejects(repository.getDecision(request.scope, request.id), /semantics/);
  }
});

test('concurrent conflicting outcomes preserve exactly one immutable result', async t => {
  const { repository, outcome } = await fixture(t);
  const results = await Promise.allSettled([
    repository.putOutcome(outcome), repository.putOutcome({ ...outcome, status: 'verified_failure' })
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  const stored = await repository.getOutcome(request.scope, request.id);
  assert.ok(stored?.status === 'verified_success' || stored?.status === 'verified_failure');
});

test('store and evidence symlinks cannot be read or clobbered', async t => {
  const { root, directory, repository, receipt } = await fixture(t);
  const filename = join(directory, (await readdir(directory))[0]);
  const target = join(root, 'protected');
  await writeFile(target, 'preserve');
  await rm(filename);
  await symlink(target, filename);
  await assert.rejects(repository.getDecision(request.scope, request.id), /safely opened/);
  await assert.rejects(repository.putDecision(receipt), /safely opened/);
  assert.equal(await readFile(target, 'utf8'), 'preserve');
  const alias = join(root, 'alias');
  await symlink(directory, alias);
  await assert.rejects(new FileDecisionRepository(alias).getDecision(request.scope, request.id), /private directory/);
});

test('offline CLI resolves captured response, rereads current state, observes and reads back', async t => {
  const root = await mkdtemp(join(tmpdir(), 'decision-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const requestFile = join(root, 'request.json');
  const currentFile = join(root, 'current.json');
  const responseFile = join(root, 'response.json');
  const store = join(root, 'store');
  await writeFile(requestFile, JSON.stringify(request));
  await writeFile(currentFile, JSON.stringify(request));
  await writeFile(responseFile, JSON.stringify({ model: 'gpt-6-luna', answers: [{
    type: 'choice', name: 'selection', choice: 'source', confidence: 0.8,
    probabilities: [{ value: 'source', probability: 0.8 }, { value: 'fallback', probability: 0.1 }, { value: 'no_match', probability: 0.1 }]
  }] }));
  const args = ['resolve', '--request', requestFile, '--current', currentFile, '--response', responseFile,
    '--provider', 'openai', '--store', store];
  const result = await runDecisionCli(args) as { decision: { requestHash: string; selectedId: string }; liveProviderVerified: boolean };
  assert.equal(result.decision.selectedId, 'source');
  assert.equal(result.liveProviderVerified, false);
  await assert.rejects(runDecisionCli(args), /already exists/);
  const outcomeFile = join(root, 'outcome.json');
  await writeFile(outcomeFile, JSON.stringify({ decisionId: request.id, scope: request.scope,
    requestHash: result.decision.requestHash, status: 'unknown', evidenceRef: 'local:pending', durationMs: 1, retries: 0 }));
  await runDecisionCli(['observe', '--outcome', outcomeFile, '--store', store]);
  const readback = await runDecisionCli(['get', '--scope', request.scope, '--id', request.id, '--store', store]) as { outcome: { status: string } };
  assert.equal(readback.outcome.status, 'unknown');
  await writeFile(currentFile, JSON.stringify({ ...request, stateVersion: 'changed' }));
  const stale = await runDecisionCli([...args.slice(0, -1), join(root, 'stale-store')]) as { decision: { selectedId: string | null; reason: string } };
  assert.equal(stale.decision.selectedId, null);
  assert.equal(stale.decision.reason, 'state_changed');
});

test('offline CLI replay compares captured responses and reports missing responses as failures', async t => {
  const root = await mkdtemp(join(tmpdir(), 'decision-replay-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const suite = join(root, 'suite.json');
  const baseline = join(root, 'baseline.json');
  const candidate = join(root, 'candidate.json');
  await writeFile(suite, JSON.stringify([{ request, current: request, expectedChoiceId: 'source' }]));
  await writeFile(baseline, '{}');
  await writeFile(candidate, JSON.stringify({ [request.id]: { model: 'gpt-6-luna', answers: [{
    type: 'choice', name: 'selection', choice: 'source', confidence: 0.8,
    probabilities: [{ value: 'source', probability: 0.8 }, { value: 'fallback', probability: 0.1 }, { value: 'no_match', probability: 0.1 }]
  }] } }));
  const report = await runDecisionCli(['replay', '--suite', suite, '--baseline', baseline,
    '--candidate', candidate, '--provider', 'openai']) as {
      baseline: { selectorFailures: number }; candidate: { matchesExpected: number };
      downstreamImprovement: string; liveProviderVerified: boolean;
      proposal: string; incompleteComparisons: number;
    };
  assert.equal(report.baseline.selectorFailures, 1);
  assert.equal(report.candidate.matchesExpected, 1);
  assert.equal(report.downstreamImprovement, 'not_established');
  assert.equal(report.liveProviderVerified, false);
  assert.equal(report.proposal, 'retain_baseline');
  assert.equal(report.incompleteComparisons, 1);
});
