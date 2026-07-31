import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  createAcceptanceSummary,
  replayWorkflow
} from '../dist/index.js';

const fixtureRoot = new URL('../fixtures/internal-delivery/', import.meta.url);

async function readFixture(name) {
  return JSON.parse(await readFile(new URL(name, fixtureRoot), 'utf8'));
}

test('compiles the CREATE SOMETHING reference mission as one identity and proof contract', async () => {
  const [identity, workflow, cases] = await Promise.all([
    readFixture('identity.json'),
    readFixture('workflow.json'),
    readFixture('cases.json')
  ]);

  assert.equal(identity.schemaVersion, 'create_something_reference_mission.v1');
  assert.equal(identity.workflowId, workflow.workflowId);
  assert.equal(identity.positioning.public, 'The Performance Lab for workflows.');
  assert.equal(identity.positioning.privateHeuristic.internalOnly, true);
  assert.deepEqual(identity.operatingLoop, [
    'signal',
    'decision',
    'action',
    'verification',
    'proof',
    'recovery',
    'lesson'
  ]);

  const requiredReceiptFields = [
    'workflow_id',
    'action_id',
    'correlation_id',
    'outcome',
    'intent',
    'authority',
    'source_of_truth',
    'action',
    'verification',
    'recovery',
    'client_proof'
  ];
  assert.deepEqual(identity.receiptEnvelope.requiredFields, requiredReceiptFields);
  assert.deepEqual(identity.publicProjection.redactedFields, [
    'credentials',
    'private_context',
    'private_urls',
    'subject_identifiers'
  ]);
  assert.deepEqual(identity.extensionDeclaration.requiredFields, [
    'mode',
    'invariants_preserved',
    'source_truth',
    'proof',
    'exception',
    'recovery'
  ]);

  for (const stage of identity.operatingLoop) {
    assert.ok(identity.stateTranslations[stage], `missing state translation for ${stage}`);
  }
  for (const action of workflow.actions.filter((entry) => entry.kind !== 'read')) {
    assert.ok(
      requiredReceiptFields.every((field) => action.receipt.requiredFields.includes(field)),
      `${action.id} does not emit the complete reference-mission receipt`
    );
  }

  const bundle = compileWorkflowDefinition(workflow);
  const replay = replayWorkflow(bundle, cases);
  const summary = createAcceptanceSummary(bundle, replay.report);

  assert.equal(bundle.workflowId, 'create-something.internal-delivery.reference-mission');
  assert.equal(summary.allExpectationsMatched, true);
  assert.equal(summary.governanceComplete, true);
  assert.ok(Object.values(summary.requiredCoverage).every(Boolean));
  assert.deepEqual(summary.counts, { pass: 3, approval_required: 2, blocked: 3 });

  const path = workflow.transitions.map(({ from, to }) => [from, to]);
  assert.deepEqual(path.slice(0, 6), [
    ['signal_received', 'scope_governed'],
    ['scope_governed', 'implementation_bounded'],
    ['implementation_bounded', 'verified'],
    ['verified', 'promoted'],
    ['promoted', 'live_proven'],
    ['live_proven', 'lesson_canonized']
  ]);
});
