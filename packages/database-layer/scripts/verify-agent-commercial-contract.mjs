import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractRoot = join(packageRoot, 'contracts', 'agent-commercial', 'v1');
const schema = JSON.parse(await readFile(join(contractRoot, 'schema.json'), 'utf8'));
const contract = JSON.parse(await readFile(join(contractRoot, 'create-something.json'), 'utf8'));

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
  validateFormats: false
});
const validate = ajv.compile(schema);

if (!validate(contract)) {
  throw new Error(`Agent commercial contract schema failed: ${ajv.errorsText(validate.errors)}`);
}

assert.equal(contract.defaultDecision, 'deny');
assert.equal(contract.receiptPolicy.required, true);
assert.deepEqual(contract.productionControls, {
  charging: 'disabled',
  maxPaidRequestsPerMinute: 0,
  maxPerRequestUsd: '0',
  maxDailySpendUsd: '0',
  automaticRetry: false,
  rollbackRunbookRef: 'packages/database-layer/contracts/agent-commercial/v1/PRODUCTION_ROLLBACK.md'
});

const capabilityIds = contract.capabilities.map((capability) => capability.id);
assert.equal(new Set(capabilityIds).size, capabilityIds.length, 'Capability IDs must be unique.');

const adapterIds = new Set(contract.providerAdapters.map((adapter) => adapter.id));
assert.ok(adapterIds.has(contract.receiptPolicy.sinkAdapterId), 'Receipt adapter must exist.');

const paymentPolicies = new Map(contract.paymentPolicies.map((policy) => [policy.id, policy]));

for (const capability of contract.capabilities) {
  if (capability.accessClass === 'free') {
    assert.equal(
      capability.sideEffect,
      'read',
      `Free capability ${capability.id} must be read-only.`
    );
    assert.equal(
      capability.approval,
      'never',
      `Free capability ${capability.id} cannot imply approval.`
    );
  }

  if (capability.accessClass === 'paid') {
    const policy = paymentPolicies.get(capability.paymentPolicyId);
    assert.ok(policy, `Paid capability ${capability.id} must reference a payment policy.`);
    assert.ok(
      adapterIds.has(policy.providerAdapterId),
      `Payment policy ${policy.id} adapter must exist.`
    );
    if (policy.status !== 'active') {
      assert.notEqual(
        capability.status,
        'active',
        `Paid capability ${capability.id} cannot precede its payment policy.`
      );
    }
  }

  if (capability.sideEffect !== 'read') {
    assert.equal(
      capability.approval,
      'always',
      `Mutating capability ${capability.id} must require approval.`
    );
  }
}

const x402 = contract.providerAdapters.find((adapter) => adapter.id === 'cloudflare.agents.x402');
assert.equal(x402?.status, 'inactive');
assert.equal(x402?.activationApproval, 'required');

const commercialReceipts = contract.providerAdapters.find(
  (adapter) => adapter.id === contract.receiptPolicy.sinkAdapterId
);
assert.equal(commercialReceipts?.status, 'active');
assert.equal(commercialReceipts?.activationApproval, 'required');

const paymentActivation = contract.paymentPolicies.some(
  (policy) => policy.status === 'approval_required'
)
  ? 'approval_required'
  : 'active';

process.stdout.write(
  `${JSON.stringify({
    status: 'pass',
    contractId: contract.contractId,
    defaultDecision: contract.defaultDecision,
    receiptsRequired: contract.receiptPolicy.required,
    accessClasses: Object.keys(contract.accessClasses).sort(),
    capabilityCount: contract.capabilities.length,
    adapterCount: contract.providerAdapters.length,
    paymentActivation
  })}\n`
);
