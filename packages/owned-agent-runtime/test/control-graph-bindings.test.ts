import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RegisteredControlGraphBindings,
  type ControlGraphBinding,
  type ControlGraphBindingRequest
} from '../src/control-graph-bindings.js';

const digest = (value: string) => `sha256:${value.repeat(64)}` as const;
function binding(): ControlGraphBinding {
  return {
    schema: 'create-something/control-graph-binding@1',
    scope: {
      accountId: 'internal-account',
      tenantId: 'internal-tenant',
      workspaceAccountId: 'internal-workspace'
    },
    workflowId: 'internal.recorded-workflow',
    workflowVersion: '1.0.0',
    runtimeManifestSha256: digest('a'),
    artifactManifestSha256: digest('b'),
    buildReleaseId: 'internal-build',
    contractSha256: digest('c'),
    runtimePolicySha256: digest('d'),
    linearIssueId: 'd1654b7a-a9ce-4f08-a76b-3039752d1c01',
    linearIdentifier: 'CRE-1000',
    substrateNodeId: 'substrate:create-something:package:internal-workflow',
    stepOwners: [
      { stepId: 'review', actionId: 'review_record', ownerId: 'responsible-operator' },
      { stepId: 'observe', actionId: 'observe_record', ownerId: 'responsible-operator' }
    ]
  };
}
function request(value: ControlGraphBinding): ControlGraphBindingRequest {
  return {
    scope: value.scope,
    runtimeManifestSha256: value.runtimeManifestSha256,
    artifactManifestSha256: value.artifactManifestSha256,
    workflowId: value.workflowId,
    workflowVersion: value.workflowVersion,
    buildReleaseId: value.buildReleaseId,
    contractSha256: value.contractSha256,
    runtimePolicySha256: value.runtimePolicySha256
  };
}

test('resolves only an explicit scope- and artifact-bound host registration', async () => {
  const registered = binding();
  const authority = new RegisteredControlGraphBindings([registered]);
  const found = await authority.find(request(registered));
  assert.equal(found?.linearIssueId, registered.linearIssueId);
  assert.equal(found?.substrateNodeId, registered.substrateNodeId);
  assert.deepEqual(
    found?.stepOwners.map((owner) => owner.stepId),
    ['observe', 'review']
  );
  for (const field of ['accountId', 'tenantId', 'workspaceAccountId'] as const) {
    assert.equal(
      await authority.find({
        ...request(registered),
        scope: { ...registered.scope, [field]: 'other' }
      }),
      undefined
    );
  }
  for (const field of [
    'runtimeManifestSha256',
    'artifactManifestSha256',
    'contractSha256',
    'runtimePolicySha256'
  ] as const) {
    assert.equal(await authority.find({ ...request(registered), [field]: digest('e') }), undefined);
  }
  for (const field of ['workflowId', 'workflowVersion', 'buildReleaseId'] as const) {
    assert.equal(await authority.find({ ...request(registered), [field]: 'other' }), undefined);
  }
});

test('snapshots registrations and returns deeply frozen records without mutating inputs', async () => {
  const original = binding();
  const before = structuredClone(original);
  const lookup = request(structuredClone(original));
  const authority = new RegisteredControlGraphBindings([original]);
  assert.deepEqual(original, before);
  (original.scope as { accountId: string }).accountId = 'forged';
  (original.stepOwners[0] as { ownerId: string }).ownerId = 'forged';
  const found = await authority.find(lookup);
  assert.equal(found?.scope.accountId, before.scope.accountId);
  assert.equal(
    found?.stepOwners.find((owner) => owner.stepId === 'review')?.ownerId,
    'responsible-operator'
  );
  assert.ok(Object.isFrozen(found));
  assert.ok(Object.isFrozen(found?.scope));
  assert.ok(Object.isFrozen(found?.stepOwners));
  assert.ok(Object.isFrozen(found?.stepOwners[0]));
  assert.throws(() => {
    (found as unknown as { linearIdentifier: string }).linearIdentifier = 'CRE-9999';
  });
  assert.equal((await authority.find(lookup))?.linearIdentifier, before.linearIdentifier);
});

test('deduplicates equivalent registrations but rejects conflicting mapping identities', () => {
  const original = binding();
  const equivalent = {
    ...structuredClone(original),
    stepOwners: [...original.stepOwners].reverse()
  };
  assert.doesNotThrow(() => new RegisteredControlGraphBindings([original, equivalent]));
  for (const invalid of [
    { ...original, linearIdentifier: 'CRE-9999' },
    { ...original, substrateNodeId: 'substrate:other' },
    { ...original, stepOwners: [{ stepId: 'review', actionId: 'review_record', ownerId: 'other' }] }
  ])
    assert.throws(() => new RegisteredControlGraphBindings([original, invalid]), /conflict/i);
});

test('rejects unknown schema and fields, malformed identifiers, empty names, and duplicate steps', () => {
  const invalid = [
    (value: Record<string, unknown>) => {
      value.schema = 'future';
    },
    (value: Record<string, unknown>) => {
      value.approved = true;
    },
    (value: Record<string, unknown>) => {
      value.linearIssueId = 'CRE-1000';
    },
    (value: Record<string, unknown>) => {
      value.linearIdentifier = 'not-an-issue';
    },
    (value: Record<string, unknown>) => {
      value.substrateNodeId = 'display-label';
    },
    (value: Record<string, unknown>) => {
      value.runtimeManifestSha256 = 'a'.repeat(64);
    },
    (value: Record<string, unknown>) => {
      value.contractSha256 = digest('G');
    },
    (value: Record<string, unknown>) => {
      value.workflowId = ' ';
    },
    (value: Record<string, unknown>) => {
      value.workflowVersion = '';
    },
    (value: Record<string, unknown>) => {
      (value.scope as Record<string, unknown>).workspaceId = 'wrong-scope-term';
    },
    (value: Record<string, unknown>) => {
      value.stepOwners = [];
    },
    (value: Record<string, unknown>) => {
      value.stepOwners = [
        { stepId: 'a', actionId: 'act', ownerId: 'owner' },
        { stepId: 'a', actionId: 'act', ownerId: 'owner' }
      ];
    },
    (value: Record<string, unknown>) => {
      value.stepOwners = [{ stepId: 'a', actionId: 'act', ownerId: '' }];
    },
    (value: Record<string, unknown>) => {
      value.stepOwners = [
        { stepId: 'a', actionId: 'act', ownerId: 'owner', role: 'account_owner' }
      ];
    }
  ];
  for (const mutate of invalid) {
    const value = structuredClone(binding()) as unknown as Record<string, unknown>;
    mutate(value);
    assert.throws(
      () => new RegisteredControlGraphBindings([value as unknown as ControlGraphBinding])
    );
  }
});

test('rejects malformed lookup fields rather than silently matching a partial identity', async () => {
  const authority = new RegisteredControlGraphBindings([binding()]);
  await assert.rejects(
    authority.find({ ...request(binding()), scope: { ...binding().scope, tenantId: '' } })
  );
  await assert.rejects(
    authority.find({
      ...request(binding()),
      artifactManifestSha256: 'sha256:bad'
    } as ControlGraphBindingRequest)
  );
  await assert.rejects(
    authority.find({
      ...request(binding()),
      linearIdentifier: 'CRE-1000'
    } as ControlGraphBindingRequest)
  );
  const partial = request(binding()) as unknown as Record<string, unknown>;
  delete partial.runtimePolicySha256;
  await assert.rejects(authority.find(partial as unknown as ControlGraphBindingRequest));
});
