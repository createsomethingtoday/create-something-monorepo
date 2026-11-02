import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixture } from './fixtures.mjs';
import { evidenceDigest, projectExecutionEvidence } from './evidence.mjs';
import {
  parseWorkflowRuntimeManifest,
  reduceWorkflowRuntimeRun,
  planWorkflowRuntimeStep
} from '../../packages/workflow-runtime/dist/index.js';

function reviewEnvelope(input) {
  const metrics = {
    duration_ms: 1,
    retry_count: 0,
    human_intervention_count: 0,
    tokens: { input: 1, output: 1, total: 2 }
  };
  return {
    sourceId: 'review-export',
    evidenceRef: 'fixture:review',
    scope: input.scope,
    observedAt: input.runtime.observedAt,
    freshness: 'current',
    receipt: {
      schema_version: 'multi-agent-reviewed-run-receipt.v1',
      run_id: 'review-run',
      linear: { issue: 'CRE-2322' },
      status: 'passed',
      stages: ['worker', 'reviewer', 'integrator'].map((role) => ({
        schema_version: 'multi-agent-evidence-receipt.v1',
        work_unit_id: `unit-${role}`,
        run_id: 'review-run',
        linear: { issue: 'CRE-2322' },
        role,
        status: 'passed',
        commands: [{ command: 'private-shell-command', exit_code: 0, summary: 'private-summary' }],
        changed_paths: [],
        evidence: 'private-evidence',
        next_decision: 'private-decision',
        metrics
      })),
      reviewer_guard: { sandbox: 'read-only', before: 'same', after: 'same', unchanged: true },
      changed_paths: [],
      next_decision: 'private-next',
      metrics: {
        elapsed_ms: 3,
        retry_count: 0,
        human_intervention_count: 0,
        tokens: { input: 3, output: 3, total: 6 },
        stage_duration_ms: { worker: 1, reviewer: 1, integrator: 1 }
      }
    }
  };
}
function binding(input, review) {
  return {
    runtimeRunId: input.runtime.run.id,
    runtimeManifestSha256: input.runtime.run.runtimeManifestSha256,
    artifactManifestSha256: input.runtime.run.artifactManifestSha256,
    reviewSourceId: review.sourceId,
    reviewDigest: evidenceDigest(review.receipt)
  };
}

test('projects the exact signed serial workflow and verified runtime history deterministically', async () => {
  const { input, trustedPublicKey } = await createFixture();
  const before = structuredClone(input);
  const graph = await projectExecutionEvidence(input, { trustedPublicKey });
  assert.deepEqual(graph, await projectExecutionEvidence(input, { trustedPublicKey }));
  assert.deepEqual(input, before);
  assert.equal(graph.authority, 'read_only');
  assert.equal(graph.scopeProvenance, 'caller_declared_not_authenticated');
  assert.equal(graph.sources[0].verification, 'signed_artifacts_and_runtime_chain');
  assert.equal(graph.nodes.filter((node) => node.kind === 'task').length, 2);
  assert.equal(graph.edges.filter((edge) => edge.relation === 'runtime_precedes').length, 1);
  assert.ok(graph.unresolved.includes('runtime_to_substrate'));
  assert.ok(graph.unresolved.includes('runtime_to_review'));
  assert.equal(JSON.stringify(graph).includes('actorSubject'), false);
});

test('rejects wrong signer, tampered artifacts, tampered state, and changed manifest bindings', async () => {
  const fixture = await createFixture();
  const other = await createFixture();
  await assert.rejects(() =>
    projectExecutionEvidence(fixture.input, { trustedPublicKey: other.trustedPublicKey })
  );
  await assert.rejects(() => projectExecutionEvidence(fixture.input));
  for (const mutate of [
    (input) => {
      input.runtime.artifactFiles['runtime-manifest.json'] += ' ';
    },
    (input) => {
      input.runtime.run.status = 'completed';
    },
    (input) => {
      input.runtime.run.receipts[0].outcome = 'forged';
    },
    (input) => {
      input.runtime.run.runtimeManifestSha256 = `sha256:${'0'.repeat(64)}`;
    }
  ]) {
    const input = structuredClone(fixture.input);
    mutate(input);
    await assert.rejects(() => projectExecutionEvidence(input, fixture));
  }
});

test('rejects unknown input schema and fields, malformed times, and cross-scope observations', async () => {
  const fixture = await createFixture();
  for (const mutate of [
    (input) => {
      input.schemaVersion = 'future';
    },
    (input) => {
      input.execute = true;
    },
    (input) => {
      input.runtime.scope = { ...input.scope, tenantId: 'other' };
    },
    (input) => {
      input.runtime.observedAt = 'tomorrow';
    },
    (input) => {
      input.runtime.observedAt = '2027-01-01T00:00:00.000Z';
    },
    (input) => {
      input.scope.accountId = '';
    },
    (input) => {
      input.maxAgeSeconds = 0;
    }
  ]) {
    const input = structuredClone(fixture.input);
    mutate(input);
    await assert.rejects(() => projectExecutionEvidence(input, fixture));
  }
});

test('requires digest-bound joins and keeps unbound reviews and tracker references unknown', async () => {
  const fixture = await createFixture();
  const { input } = fixture;
  const review = reviewEnvelope(input);
  input.reviews = [review];
  const unbound = await projectExecutionEvidence(input, fixture);
  assert.ok(unbound.unresolved.includes('unbound_review:review-export'));
  assert.equal(
    unbound.edges.some((edge) => edge.relation === 'declared_review_binding'),
    false
  );
  input.bindings = [binding(input, review)];
  const graph = await projectExecutionEvidence(input, fixture);
  assert.equal(graph.edges.filter((edge) => edge.relation === 'declared_review_binding').length, 1);
  assert.equal(
    graph.sources.find((source) => source.owner === 'symphony').verification,
    'schema_validated'
  );
  assert.equal(
    graph.nodes.find((node) => node.kind === 'linear_issue_reference').status,
    'unknown'
  );
  assert.equal(JSON.stringify(graph).includes('private-'), false);
  for (const key of [
    'runtimeRunId',
    'runtimeManifestSha256',
    'artifactManifestSha256',
    'reviewSourceId',
    'reviewDigest'
  ]) {
    const invalid = structuredClone(input);
    invalid.bindings[0][key] = 'missing-or-forged';
    await assert.rejects(() => projectExecutionEvidence(invalid, fixture), /binding/);
  }
  const crossScope = structuredClone(input);
  crossScope.reviews[0].scope = { ...crossScope.scope, tenantId: 'other' };
  await assert.rejects(() => projectExecutionEvidence(crossScope, fixture), /scope/);
});

test('deduplicates identical observations and bindings but rejects conflicting identities', async () => {
  const fixture = await createFixture();
  const { input } = fixture;
  const review = reviewEnvelope(input);
  input.reviews = [review];
  input.bindings = [binding(input, review)];
  const expected = await projectExecutionEvidence(input, fixture);
  input.reviews.push(structuredClone(review));
  input.bindings.push(structuredClone(input.bindings[0]));
  assert.deepEqual(await projectExecutionEvidence(input, fixture), expected);
  input.reviews[1].evidenceRef = 'conflicting-export';
  await assert.rejects(() => projectExecutionEvidence(input, fixture), /Conflicting/);
});

test('source age and unknown observations stay visible', async () => {
  const fixture = await createFixture();
  fixture.input.asOf = '2026-11-05T00:00:00.000Z';
  assert.equal(
    (await projectExecutionEvidence(fixture.input, fixture)).sources[0].freshness,
    'stale'
  );
  fixture.input.runtime.observedAt = null;
  assert.equal(
    (await projectExecutionEvidence(fixture.input, fixture)).sources[0].freshness,
    'unknown'
  );
});

test('freezes caller inputs before asynchronous verification and binds the output digest', async () => {
  const fixture = await createFixture();
  const pending = projectExecutionEvidence(fixture.input, fixture);
  fixture.input.runtime.run.status = 'completed';
  const { digest, ...graph } = await pending;
  assert.equal(graph.nodes.find((node) => node.kind === 'run').status, 'queued');
  assert.equal(evidenceDigest(graph), digest);
  assert.equal(graph.sources[0].runtimeAuthenticity, 'unattested_offline_export');
});

test('projects attempts and approval history without gaining an executor or losing evidence', async () => {
  const fixture = await createFixture();
  const { input } = fixture;
  const manifest = parseWorkflowRuntimeManifest(
    JSON.parse(input.runtime.artifactFiles['runtime-manifest.json'])
  );
  let run = input.runtime.run;
  const plan = await planWorkflowRuntimeStep(manifest, run);
  run = await reduceWorkflowRuntimeRun(manifest, run, {
    type: 'effect_intent',
    stepId: plan.stepId,
    attemptId: 'attempt-1',
    capability: plan.capability,
    observedAt: '2026-11-02T00:00:01.000Z'
  });
  run = await reduceWorkflowRuntimeRun(manifest, run, {
    type: 'step_succeeded',
    stepId: plan.stepId,
    attemptId: 'attempt-1',
    verifier: 'fixture-verifier',
    observedAt: '2026-11-02T00:00:02.000Z'
  });
  const wait = await planWorkflowRuntimeStep(manifest, run);
  run = await reduceWorkflowRuntimeRun(manifest, run, {
    type: 'wait_created',
    stepId: wait.stepId,
    approval: wait.approval,
    observedAt: '2026-11-02T00:00:03.000Z'
  });
  input.runtime.run = run;
  input.runtime.observedAt = '2026-11-02T00:00:04.000Z';
  const graph = await projectExecutionEvidence(input, fixture);
  assert.equal(graph.nodes.find((node) => node.kind === 'run').status, 'waiting_for_approval');
  assert.equal(graph.nodes.filter((node) => node.kind === 'attempt').length, 1);
  assert.equal(graph.nodes.filter((node) => node.kind === 'receipt').length, run.receipts.length);
  assert.ok(graph.nodes.some((node) => node.eventType === 'wait_created'));
  assert.equal(JSON.stringify(graph).includes('parameterDigest'), false);
});
