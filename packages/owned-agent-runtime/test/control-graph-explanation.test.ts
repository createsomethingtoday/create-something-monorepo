import assert from 'node:assert/strict';
import test from 'node:test';
import { createControlGraphExplanationReader } from '../src/control-graph-explanation.js';
import { controlGraphFixture, graphDigest } from './control-graph.fixture.js';

test('approval-role advice is bound to the exact frozen runtime policy', async () => {
  const fixture = await controlGraphFixture();
  Object.assign(fixture.dependencies, { approvalPolicySha256: graphDigest('e') });
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.deepEqual(result?.requiredActorRoles, []);
  assert.ok(result?.unresolved.includes('approval_policy_roles_unknown'));
});

test('a compiler stop remains a policy stop rather than ready execution', async () => {
  const fixture = await controlGraphFixture('ready');
  const step = fixture.state.manifest!.steps[0];
  fixture.state.manifest!.steps[0] = {
    id: step.id,
    actionId: step.actionId,
    dependsOn: step.dependsOn,
    evidenceDigest: step.evidenceDigest,
    recovery: step.recovery,
    disposition: 'stop',
    reason: 'synthetic policy stop'
  };
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.equal(result?.reason.code, 'compiled_stop');
  assert.ok(result?.requirements.some((item) => item.kind === 'owning_host_policy_review'));
});

test('a cancelled parent has no pending execution evidence requirement', async () => {
  const fixture = await controlGraphFixture('ready');
  fixture.state.parent!.status = 'cancelled';
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.equal(result?.frontier, null);
  assert.equal(result?.nextOwner.state, 'unknown');
  assert.equal(
    result?.requirements.some((item) => item.kind === 'compiled_step_evidence'),
    false
  );
});

test('explains a pending approval with exact task, owner, actor role, and source evidence', async () => {
  const fixture = await controlGraphFixture();
  const before = structuredClone(fixture.state);
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.ok(result);
  assert.equal(result.schema, 'create-something/control-graph-explanation@1');
  assert.equal(result.authority, 'read_only');
  assert.equal(result.authorization, 'owning_host_required');
  assert.equal(result.scopeProvenance, 'scoped_control_reader');
  assert.equal(result.reason.code, 'pending_approval');
  assert.equal(result.frontier?.stepId, 'review');
  assert.equal(result.frontier?.actionId, 'review_record');
  assert.deepEqual(result.nextOwner, {
    state: 'known',
    id: 'responsible-operator',
    source: 'linear_assignee'
  });
  assert.deepEqual(result.requiredActorRoles, ['account_owner']);
  assert.equal(result.links.linear?.id, fixture.binding.linearIssueId);
  assert.equal(result.links.substrate?.id, fixture.binding.substrateNodeId);
  assert.ok(result.evidence.receipts.some((receipt) => receipt.eventType === 'wait_created'));
  assert.deepEqual(fixture.state, before);
  assert.equal(JSON.stringify(result).includes('private-'), false);
});

test('distinguishes an expired request and an explicit rejected approval', async () => {
  for (const [kind, code] of [
    ['expired', 'approval_expired'],
    ['rejected', 'approval_rejected']
  ] as const) {
    const fixture = await controlGraphFixture(kind);
    const result = await createControlGraphExplanationReader(fixture.dependencies).find({
      scope: fixture.scope,
      runId: fixture.parent.id
    });
    assert.equal(result?.reason.code, code);
    assert.equal(result?.authorization, 'owning_host_required');
    assert.ok(
      result?.requirements.some(
        (requirement) =>
          requirement.digest === fixture.proof.approvals[0].bindingSha256 &&
          requirement.status === 'missing'
      ),
      'required evidence retains the exact approval binding'
    );
  }
});

test('generic operator stop retains a redacted cause instead of inventing an explanation', async () => {
  const fixture = await controlGraphFixture('stopped');
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.equal(result?.reason.code, 'run_stopped');
  assert.equal(result?.reason.detail, 'redacted');
  assert.ok(result?.evidence.receipts.some((receipt) => receipt.eventType === 'blocked'));
  assert.equal(JSON.stringify(result).includes('private-'), false);
});

test('ambiguous effects require reconciliation without granting automatic retry', async () => {
  const fixture = await controlGraphFixture('ambiguous');
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.equal(result?.reason.code, 'effect_reconciliation_required');
  assert.equal(result?.frontier?.stepId, 'observe');
  assert.equal(result?.authority, 'read_only');
  assert.equal(result?.authorization, 'owning_host_required');
  assert.equal('capability' in (result ?? {}), false);
  assert.equal('retry' in (result ?? {}), false);
});

test('retryable failures report the manifest recovery contract rather than a retry command', async () => {
  const fixture = await controlGraphFixture('retryable');
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.equal(result?.reason.code, 'recovery_review_required');
  assert.equal(result?.frontier?.recovery, 'manual_fallback');
  assert.equal(result?.authorization, 'owning_host_required');
});

test('completed runs have no next action owner or active frontier', async () => {
  const fixture = await controlGraphFixture('completed');
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.equal(result?.reason.code, 'completed');
  assert.equal(result?.frontier, null);
  assert.equal(result?.nextOwner.state, 'unknown');
  assert.equal(result?.nextOwner.id, null);
  assert.deepEqual(result?.requiredActorRoles, []);
});

test('ready work and a running attempt retain distinct observed states', async () => {
  for (const [kind, code] of [
    ['ready', 'ready_for_host_evaluation'],
    ['running', 'awaiting_capability_evidence']
  ] as const) {
    const fixture = await controlGraphFixture(kind);
    const result = await createControlGraphExplanationReader(fixture.dependencies).find({
      scope: fixture.scope,
      runId: fixture.parent.id
    });
    assert.equal(result?.reason.code, code);
    assert.equal(result?.frontier?.stepId, 'observe');
    assert.equal(result?.authorization, 'owning_host_required');
  }
});

test('a missing registration exposes unresolved joins and never infers an owner', async () => {
  const fixture = await controlGraphFixture();
  fixture.state.binding = undefined;
  const result = await createControlGraphExplanationReader(fixture.dependencies).find({
    scope: fixture.scope,
    runId: fixture.parent.id
  });
  assert.equal(result?.nextOwner.state, 'unknown');
  assert.ok(result?.unresolved.includes('runtime_to_linear'));
  assert.ok(result?.unresolved.includes('runtime_to_substrate'));
  assert.equal(result?.links.linear, null);
  assert.equal(result?.links.substrate, null);
});

test('missing, stale, unknown, or mismatched work ownership remains unknown', async () => {
  for (const scenario of [
    'missing',
    'stale',
    'unknown',
    'unassigned',
    'different-owner'
  ] as const) {
    const fixture = await controlGraphFixture();
    if (scenario === 'missing') fixture.state.linear = undefined;
    else if (scenario === 'stale') fixture.state.linear!.observedAt = '2026-10-01T00:00:00.000Z';
    else if (scenario === 'unknown') fixture.state.linear!.observedAt = null;
    else if (scenario === 'unassigned') fixture.state.linear!.assigneeId = null;
    else fixture.state.linear!.assigneeId = 'different-owner';
    const result = await createControlGraphExplanationReader(fixture.dependencies).find({
      scope: fixture.scope,
      runId: fixture.parent.id
    });
    assert.equal(result?.nextOwner.state, 'unknown', scenario);
    assert.equal(result?.nextOwner.id, null, scenario);
    assert.ok(result && result.unresolved.length > 0, scenario);
    if (scenario === 'stale' || scenario === 'unknown')
      assert.equal(result?.links.linear?.freshness, scenario);
  }
});

test('stale and unknown canonical Substrate observations remain visible and unresolved', async () => {
  for (const observedAt of ['2026-10-01T00:00:00.000Z', null]) {
    const fixture = await controlGraphFixture();
    fixture.state.substrate!.observedAt = observedAt;
    const result = await createControlGraphExplanationReader(fixture.dependencies).find({
      scope: fixture.scope,
      runId: fixture.parent.id
    });
    assert.equal(result?.links.substrate?.freshness, observedAt === null ? 'unknown' : 'stale');
    assert.ok(result && result.unresolved.length > 0);
    assert.equal(result?.nextOwner.state, 'unknown');
  }
});

test('rejects wrong-scope or wrong-identity source observations instead of joining labels', async () => {
  const mutations = [
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.linear!.scope = { ...fixture.scope, tenantId: 'other' };
    },
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.substrate!.scope = { ...fixture.scope, accountId: 'other' };
    },
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.linear!.id = 'wrong-issue-id';
    },
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.linear!.identifier = 'CRE-9999';
    },
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.substrate!.id = 'substrate:wrong-node';
    }
  ];
  for (const mutate of mutations) {
    const fixture = await controlGraphFixture();
    mutate(fixture);
    await assert.rejects(
      createControlGraphExplanationReader(fixture.dependencies).find({
        scope: fixture.scope,
        runId: fixture.parent.id
      })
    );
  }
});

test('rejects mismatched trusted proof, parent activation, and manifest identities', async () => {
  const mutations = [
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.proof!.run.id = 'wrong-run';
    },
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.proof!.run.activation.id = 'wrong-activation';
    },
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.proof!.run.registration!.buildReleaseId = 'wrong-release';
    },
    (fixture: Awaited<ReturnType<typeof controlGraphFixture>>) => {
      fixture.state.manifest!.workflow.id = 'wrong-workflow';
    }
  ];
  for (const mutate of mutations) {
    const fixture = await controlGraphFixture();
    mutate(fixture);
    await assert.rejects(
      createControlGraphExplanationReader(fixture.dependencies).find({
        scope: fixture.scope,
        runId: fixture.parent.id
      })
    );
  }
  const wrongScope = await controlGraphFixture();
  wrongScope.state.parent!.tenantId = 'other';
  assert.equal(
    await createControlGraphExplanationReader(wrongScope.dependencies).find({
      scope: wrongScope.scope,
      runId: wrongScope.parent.id
    }),
    undefined,
    'out-of-scope parent is opaque not-found'
  );
});

test('rejects changed proof during a repeated read rather than returning mixed versions', async () => {
  const fixture = await controlGraphFixture();
  let reads = 0;
  fixture.dependencies.proofs.find = async () => {
    const proof = structuredClone(fixture.proof);
    if (++reads > 1) proof.run.version += 1;
    return proof;
  };
  await assert.rejects(
    createControlGraphExplanationReader(fixture.dependencies).find({
      scope: fixture.scope,
      runId: fixture.parent.id
    })
  );
  assert.ok(reads > 1);
});

test('unavailable scoped proof returns no graph and malformed source digest rejects', async () => {
  const fixture = await controlGraphFixture();
  fixture.state.proof = undefined;
  assert.equal(
    await createControlGraphExplanationReader(fixture.dependencies).find({
      scope: fixture.scope,
      runId: fixture.parent.id
    }),
    undefined
  );
  fixture.state.proof = fixture.proof;
  fixture.state.substrate!.snapshotSha256 = 'sha256:bad' as ReturnType<typeof graphDigest>;
  await assert.rejects(
    createControlGraphExplanationReader(fixture.dependencies).find({
      scope: fixture.scope,
      runId: fixture.parent.id
    })
  );
});
