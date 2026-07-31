import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReferenceMissionReadModel,
  type ReferenceMissionSourceRecords,
  type ReferenceMissionState
} from '../src/lib/governance/reference-mission.ts';

const PRIVATE_URL = 'https://linear.app/create-something/issue/CRE-1403/private';
const PRIVATE_SUBJECT = 'operator-subject-123';
const CURRENT_NOW = '2026-07-23T12:00:00.000Z';

function completeRecords(): ReferenceMissionSourceRecords {
  return {
    signals: [
      {
        id: 'gov_sig_reference',
        atlas_canvas_id: 'canvas_internal',
        atlas_node_id: 'node_private',
        source: 'linear',
        source_url: PRIVATE_URL,
        title: 'Internal title with private context',
        summary: `Private subject: ${PRIVATE_SUBJECT}`,
        status: 'resolved',
        payload: {
          reference_mission: {
            contract_version: 1,
            id: 'performance-mission-v1',
            correlation_id: 'CRE-1403:run-001',
            public: {
              title: 'Governed agent delivery',
              objective: 'Move one bounded change from signal to verified production proof.',
              scope: 'One internal reference mission.',
              authority_class: 'Bounded production delivery',
              source_class: 'Internal delivery record',
              verification_summary: 'Required checks and production readback passed.',
              proof_summary: 'The operator and public surfaces share one receipt chain.',
              recovery_summary: 'Rollback remains available through the prior deployment.',
              private_url: PRIVATE_URL,
              subject_id: PRIVATE_SUBJECT
            }
          }
        },
        created_at: '2026-07-22T19:00:00.000Z',
        updated_at: '2026-07-22T20:00:00.000Z'
      }
    ],
    decisions: [
      {
        id: 'gov_dec_reference',
        signal_id: 'gov_sig_reference',
        atlas_canvas_id: 'canvas_internal',
        atlas_node_id: 'node_private',
        decision_state: 'run',
        decision_owner: 'Private operator',
        reason: `Approved for ${PRIVATE_SUBJECT}`,
        payload: {},
        created_at: '2026-07-22T20:10:00.000Z',
        updated_at: '2026-07-22T20:10:00.000Z'
      }
    ],
    proofs: [
      {
        id: 'gov_proof_reference',
        signal_id: 'gov_sig_reference',
        decision_id: 'gov_dec_reference',
        atlas_canvas_id: 'canvas_internal',
        atlas_node_id: 'node_private',
        evidence: `Private evidence at ${PRIVATE_URL}`,
        outcome: 'passed',
        receipt_url: PRIVATE_URL,
        rollback_note: 'Restore the prior deployment.',
        payload: {},
        created_at: '2026-07-22T20:20:00.000Z',
        updated_at: '2026-07-22T20:20:00.000Z'
      }
    ],
    receipts: [
      {
        id: 'gov_rcpt_reference',
        connection_id: 'gov_connection_private',
        event_type: 'reference_mission.verified',
        record_product_id: 'proof',
        record_id: 'gov_proof_reference',
        status: 'delivered',
        status_code: 200,
        response_excerpt: PRIVATE_SUBJECT,
        delivered_at: '2026-07-22T20:30:00.000Z',
        metadata: { private_url: PRIVATE_URL },
        created_at: '2026-07-22T20:30:00.000Z'
      }
    ]
  };
}

test('a complete governance chain becomes one correlated public proof without private fields', () => {
  const model = buildReferenceMissionReadModel(completeRecords(), { now: CURRENT_NOW });

  assert.equal(model.public.state, 'proven');
  assert.equal(model.public.correlation_id, 'CRE-1403:run-001');
  assert.equal(model.public.freshness.state, 'current');
  assert.equal(model.operator?.source.signal_id, 'gov_sig_reference');
  assert.equal(model.operator?.source.proof_id, 'gov_proof_reference');
  assert.equal(model.operator?.source.receipt_id, 'gov_rcpt_reference');

  const publicJson = JSON.stringify(model.public);
  assert.equal(publicJson.includes(PRIVATE_URL), false);
  assert.equal(publicJson.includes(PRIVATE_SUBJECT), false);
});

test('missing, stale, failed, rolled-back, and recovered chains retain honest public states', () => {
  const empty = buildReferenceMissionReadModel(
    { signals: [], decisions: [], proofs: [], receipts: [] },
    { now: CURRENT_NOW }
  );
  assert.equal(empty.public.state, 'unavailable');
  assert.equal(empty.operator, null);

  const incompleteRecords = completeRecords();
  incompleteRecords.receipts = [];
  assert.equal(
    buildReferenceMissionReadModel(incompleteRecords, { now: CURRENT_NOW }).public.state,
    'incomplete'
  );

  const staleRecords = completeRecords();
  const stale = buildReferenceMissionReadModel(staleRecords, {
    now: '2026-09-23T12:00:00.000Z'
  });
  assert.equal(stale.public.state, 'stale');
  assert.equal(stale.public.freshness.state, 'stale');

  const expectedProofStates: Array<{
    outcome: 'failed' | 'rolled_back';
    state: ReferenceMissionState;
  }> = [
    { outcome: 'failed', state: 'failed' },
    { outcome: 'rolled_back', state: 'rolled_back' }
  ];
  for (const expected of expectedProofStates) {
    const records = completeRecords();
    records.proofs[0].outcome = expected.outcome;
    assert.equal(
      buildReferenceMissionReadModel(records, { now: CURRENT_NOW }).public.state,
      expected.state
    );
  }

  const recoveredRecords = completeRecords();
  recoveredRecords.proofs.push({
    ...recoveredRecords.proofs[0],
    id: 'gov_proof_failed_before_recovery',
    outcome: 'failed',
    created_at: '2026-07-22T20:15:00.000Z',
    updated_at: '2026-07-22T20:15:00.000Z'
  });
  assert.equal(
    buildReferenceMissionReadModel(recoveredRecords, { now: CURRENT_NOW }).public.state,
    'recovered'
  );
});

test('malformed or partially public mission metadata fails closed', () => {
  const malformed = completeRecords();
  malformed.signals[0].payload.reference_mission = { contract_version: 1, id: 'missing-public' };
  const model = buildReferenceMissionReadModel(malformed, { now: CURRENT_NOW });

  assert.equal(model.public.state, 'unavailable');
  assert.equal(model.public.correlation_id, null);
  assert.equal(model.operator, null);
});
