import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  AgentCommercialAuthorizationInputError,
  authorizeAgentCommercialAccess,
  AgentCommercialReceiptConflictError,
  evaluateAgentCommercialAccess
} from '../dist/index.js';

const canonicalContract = JSON.parse(
  readFileSync(
    new URL('../contracts/agent-commercial/v1/create-something.json', import.meta.url),
    'utf8'
  )
);
const authorizationReceiptSchema = JSON.parse(
  readFileSync(
    new URL('../contracts/agent-commercial/v1/authorization-receipt.schema.json', import.meta.url),
    'utf8'
  )
);
const validateAuthorizationReceipt = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false
}).compile(authorizationReceiptSchema);

const contract = {
  contractId: 'agent-commercial-contract.test.v1',
  defaultDecision: 'deny',
  capabilities: [
    {
      id: 'content.search',
      kind: 'tool',
      accessClass: 'free',
      sideEffect: 'read',
      status: 'active',
      approval: 'never'
    },
    {
      id: 'client.workspace',
      kind: 'resource',
      accessClass: 'entitled',
      entitlementId: 'managed-operations',
      sideEffect: 'read',
      status: 'active',
      approval: 'never'
    },
    {
      id: 'audit.agent-readiness',
      kind: 'tool',
      accessClass: 'paid',
      paymentPolicyId: 'x402.agent-readiness.v1',
      sideEffect: 'read',
      status: 'preview',
      approval: 'never'
    },
    {
      id: 'production.execute',
      kind: 'tool',
      accessClass: 'private',
      grantId: 'production.execute',
      sideEffect: 'write',
      status: 'active',
      approval: 'always'
    }
  ]
};

test('free read capabilities allow agent access without identity or payment', () => {
  assert.deepEqual(
    evaluateAgentCommercialAccess(contract, {
      capabilityId: 'content.search'
    }),
    {
      decision: 'allow',
      reason: 'free_access',
      capabilityId: 'content.search',
      contractId: 'agent-commercial-contract.test.v1',
      receiptRequired: true
    }
  );
});

test('entitled capabilities require an authenticated matching entitlement', () => {
  assert.equal(
    evaluateAgentCommercialAccess(contract, {
      capabilityId: 'client.workspace',
      principal: { id: 'agent:client', authenticated: true }
    }).reason,
    'entitlement_required'
  );

  assert.equal(
    evaluateAgentCommercialAccess(contract, {
      capabilityId: 'client.workspace',
      principal: { id: 'agent:client', authenticated: true },
      entitlementIds: ['managed-operations']
    }).decision,
    'allow'
  );
});

test('paid preview capabilities return a provider-neutral payment requirement', () => {
  assert.deepEqual(
    evaluateAgentCommercialAccess(contract, {
      capabilityId: 'audit.agent-readiness',
      environment: 'preview'
    }),
    {
      decision: 'payment_required',
      reason: 'verified_payment_required',
      capabilityId: 'audit.agent-readiness',
      contractId: 'agent-commercial-contract.test.v1',
      receiptRequired: true,
      requiredPolicyId: 'x402.agent-readiness.v1'
    }
  );

  assert.equal(
    evaluateAgentCommercialAccess(contract, {
      capabilityId: 'audit.agent-readiness',
      environment: 'preview',
      payment: {
        status: 'verified',
        receiptId: 'payment-receipt-1',
        policyId: 'x402.agent-readiness.v1'
      }
    }).decision,
    'allow'
  );
});

test('preview capabilities remain unavailable in production', () => {
  assert.equal(
    evaluateAgentCommercialAccess(contract, {
      capabilityId: 'audit.agent-readiness',
      environment: 'production',
      payment: {
        status: 'verified',
        receiptId: 'payment-receipt-1',
        policyId: 'x402.agent-readiness.v1'
      }
    }).reason,
    'preview_not_promoted'
  );
});

test('private write capabilities require both a grant and an approval receipt', () => {
  const granted = {
    capabilityId: 'production.execute',
    principal: { id: 'operator:micah', authenticated: true },
    grantIds: ['production.execute']
  };

  assert.equal(evaluateAgentCommercialAccess(contract, granted).decision, 'approval_required');

  assert.equal(
    evaluateAgentCommercialAccess(contract, {
      ...granted,
      approval: { status: 'approved', receiptId: 'approval-receipt-1' }
    }).decision,
    'allow'
  );
});

test('mutating capabilities cannot bypass approval through a malformed catalog entry', () => {
  const malformed = {
    ...contract,
    capabilities: [
      {
        id: 'unsafe.free-write',
        kind: 'tool',
        accessClass: 'free',
        sideEffect: 'write',
        status: 'active',
        approval: 'never'
      }
    ]
  };

  assert.equal(
    evaluateAgentCommercialAccess(malformed, {
      capabilityId: 'unsafe.free-write'
    }).decision,
    'approval_required'
  );
});

test('uncataloged capabilities fail closed', () => {
  assert.deepEqual(
    evaluateAgentCommercialAccess(contract, {
      capabilityId: 'unknown.tool'
    }),
    {
      decision: 'deny',
      reason: 'capability_not_cataloged',
      capabilityId: 'unknown.tool',
      contractId: 'agent-commercial-contract.test.v1',
      receiptRequired: true
    }
  );
});

test('canonical CREATE SOMETHING catalog is executable through the public evaluator', () => {
  assert.equal(
    evaluateAgentCommercialAccess(canonicalContract, {
      capabilityId: 'content.search'
    }).decision,
    'allow'
  );

  assert.equal(
    evaluateAgentCommercialAccess(canonicalContract, {
      capabilityId: 'agency.managed-workspace',
      principal: { id: 'agent:client', authenticated: true },
      entitlementIds: ['managed-ai-operations']
    }).reason,
    'entitled_access'
  );

  assert.equal(
    evaluateAgentCommercialAccess(canonicalContract, {
      capabilityId: 'agency.agent-readiness-audit',
      environment: 'preview'
    }).reason,
    'capability_inactive'
  );
});

test('authorization commits a storage-ready receipt for an allowed request', async () => {
  const committed = [];
  const store = {
    async commit(receipt) {
      committed.push(receipt);
      return { status: 'inserted', receipt };
    }
  };

  const result = await authorizeAgentCommercialAccess(
    contract,
    { capabilityId: 'content.search', environment: 'preview' },
    {
      decisionId: 'decision-1',
      occurredAt: '2026-08-12T05:00:00.000Z'
    },
    store
  );

  assert.deepEqual(result, {
    decision: {
      decision: 'allow',
      reason: 'free_access',
      capabilityId: 'content.search',
      contractId: 'agent-commercial-contract.test.v1',
      receiptRequired: true
    },
    receipt: {
      receiptId: 'agent-commercial:agent-commercial-contract.test.v1:decision-1',
      decisionId: 'decision-1',
      contractId: 'agent-commercial-contract.test.v1',
      capabilityId: 'content.search',
      principalId: 'anonymous',
      decision: 'allow',
      reason: 'free_access',
      entitlementOrPaymentRef: null,
      approvalReceiptId: null,
      outcome: 'authorized',
      environment: 'preview',
      occurredAt: '2026-08-12T05:00:00.000Z'
    },
    replayed: false
  });
  assert.deepEqual(committed, [result.receipt]);
  assert.equal(
    validateAuthorizationReceipt(result.receipt),
    true,
    JSON.stringify(validateAuthorizationReceipt.errors)
  );
});

test('authorization replays the original receipt for an idempotent retry', async () => {
  let stored;
  const store = {
    async commit(receipt) {
      if (stored) return { status: 'existing', receipt: stored };
      stored = receipt;
      return { status: 'inserted', receipt };
    }
  };
  const context = {
    decisionId: 'decision-retry',
    occurredAt: '2026-08-12T05:01:00.000Z'
  };

  const first = await authorizeAgentCommercialAccess(
    contract,
    { capabilityId: 'content.search', environment: 'preview' },
    context,
    store
  );
  const replay = await authorizeAgentCommercialAccess(
    contract,
    { capabilityId: 'content.search', environment: 'preview' },
    context,
    store
  );

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.receipt, first.receipt);
});

test('authorization fails closed when a decision id is reused for different facts', async () => {
  let stored;
  const store = {
    async commit(receipt) {
      if (stored) return { status: 'existing', receipt: stored };
      stored = receipt;
      return { status: 'inserted', receipt };
    }
  };
  const context = {
    decisionId: 'decision-conflict',
    occurredAt: '2026-08-12T05:02:00.000Z'
  };

  await authorizeAgentCommercialAccess(
    contract,
    { capabilityId: 'content.search', environment: 'preview' },
    context,
    store
  );

  await assert.rejects(
    authorizeAgentCommercialAccess(
      contract,
      { capabilityId: 'client.workspace', environment: 'preview' },
      context,
      store
    ),
    AgentCommercialReceiptConflictError
  );
});

test('paid preview execution is blocked until a verified payment receipt is committed', async () => {
  const receipts = new Map();
  const store = {
    async commit(receipt) {
      const existing = receipts.get(receipt.decisionId);
      if (existing) return { status: 'existing', receipt: existing };
      receipts.set(receipt.decisionId, receipt);
      return { status: 'inserted', receipt };
    }
  };

  const blocked = await authorizeAgentCommercialAccess(
    contract,
    { capabilityId: 'audit.agent-readiness', environment: 'preview' },
    { decisionId: 'decision-unpaid', occurredAt: '2026-08-12T05:03:00.000Z' },
    store
  );
  const paid = await authorizeAgentCommercialAccess(
    contract,
    {
      capabilityId: 'audit.agent-readiness',
      environment: 'preview',
      payment: {
        status: 'verified',
        receiptId: 'x402-testnet-receipt-1',
        policyId: 'x402.agent-readiness.v1'
      }
    },
    { decisionId: 'decision-paid', occurredAt: '2026-08-12T05:04:00.000Z' },
    store
  );

  assert.equal(blocked.decision.decision, 'payment_required');
  assert.equal(blocked.receipt.outcome, 'blocked');
  assert.equal(blocked.receipt.entitlementOrPaymentRef, null);
  assert.equal(paid.decision.decision, 'allow');
  assert.equal(paid.receipt.outcome, 'authorized');
  assert.equal(paid.receipt.entitlementOrPaymentRef, 'x402-testnet-receipt-1');
});

test('authorization rejects invalid receipt identity before calling storage', async () => {
  let commitCalls = 0;
  const store = {
    async commit(receipt) {
      commitCalls += 1;
      return { status: 'inserted', receipt };
    }
  };

  await assert.rejects(
    authorizeAgentCommercialAccess(
      contract,
      { capabilityId: 'content.search', environment: 'preview' },
      { decisionId: ' ', occurredAt: 'not-a-timestamp' },
      store
    ),
    AgentCommercialAuthorizationInputError
  );
  assert.equal(commitCalls, 0);
});
