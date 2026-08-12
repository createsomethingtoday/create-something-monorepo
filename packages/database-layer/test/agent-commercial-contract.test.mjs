import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { evaluateAgentCommercialAccess } from '../dist/index.js';

const canonicalContract = JSON.parse(
  readFileSync(
    new URL('../contracts/agent-commercial/v1/create-something.json', import.meta.url),
    'utf8'
  )
);

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
