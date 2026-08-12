import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createD1AgentCommercialAuthorizationStore } from '../dist/index.js';

const receipt = {
  receiptId: 'agent-commercial:contract:decision-1',
  decisionId: 'decision-1',
  contractId: 'contract',
  capabilityId: 'audit.agent-readiness',
  principalId: 'agent:test',
  decision: 'allow',
  reason: 'verified_payment',
  entitlementOrPaymentRef: 'x402-authorization-1',
  approvalReceiptId: null,
  outcome: 'authorized',
  environment: 'preview',
  occurredAt: '2026-08-12T06:00:00.000Z'
};

function receiptRow(value = receipt) {
  return {
    receipt_id: value.receiptId,
    decision_id: value.decisionId,
    contract_id: value.contractId,
    capability_id: value.capabilityId,
    principal_id: value.principalId,
    decision: value.decision,
    reason: value.reason,
    entitlement_or_payment_ref: value.entitlementOrPaymentRef,
    approval_receipt_id: value.approvalReceiptId,
    outcome: value.outcome,
    environment: value.environment,
    occurred_at: value.occurredAt
  };
}

function createFakeD1({ changes = 1, row = receiptRow() } = {}) {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      return {
        bind(...values) {
          const statement = { sql, values };
          statements.push(statement);
          return statement;
        }
      };
    },
    async batch() {
      return [
        { success: true, meta: { changes } },
        { success: true, results: row ? [row] : [] }
      ];
    }
  };
}

test('D1 receipt store commits with prepared statements and reads back primary truth', async () => {
  const db = createFakeD1();
  const result = await createD1AgentCommercialAuthorizationStore(db).commit(receipt);

  assert.equal(result.status, 'inserted');
  assert.deepEqual(result.receipt, receipt);
  assert.equal(db.statements.length, 2);
  assert.match(db.statements[0].sql, /INSERT INTO agent_commercial_authorization_receipts/);
  assert.match(db.statements[0].sql, /ON CONFLICT\(decision_id\) DO NOTHING/);
  assert.doesNotMatch(db.statements[0].sql, /decision-1/);
  assert.equal(db.statements[0].values[1], 'decision-1');
  assert.match(db.statements[1].sql, /WHERE decision_id = \?/);
  assert.deepEqual(db.statements[1].values, ['decision-1']);
});

test('D1 receipt store reports an existing idempotent receipt', async () => {
  const db = createFakeD1({ changes: 0 });
  const result = await createD1AgentCommercialAuthorizationStore(db).commit(receipt);

  assert.equal(result.status, 'existing');
  assert.deepEqual(result.receipt, receipt);
});

test('D1 receipt store fails closed when primary readback is missing', async () => {
  const db = createFakeD1({ row: null });

  await assert.rejects(
    createD1AgentCommercialAuthorizationStore(db).commit(receipt),
    /did not commit and read back/
  );
});

test('D1 preview migration owns a unique decision id and no production binding', () => {
  const migration = readFileSync(
    new URL(
      '../contracts/agent-commercial/v1/d1-preview/0001_authorization_receipts.sql',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(migration, /decision_id TEXT PRIMARY KEY/);
  assert.match(migration, /receipt_id TEXT NOT NULL UNIQUE/);
  assert.doesNotMatch(migration, /database_id|binding|remote/i);
});
