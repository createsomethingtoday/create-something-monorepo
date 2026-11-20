import { createHash } from 'node:crypto';
import { verifyWorkflowArtifactSnapshot } from '../../packages/workflow-compiler/dist/index.js';
import {
  parseWorkflowRuntimeManifest,
  verifyWorkflowRuntimeRun
} from '../../packages/workflow-runtime/dist/index.js';
import { projectSymphonyReview } from './symphony.mjs';

const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])])
        )
      : value;
export const evidenceDigest = (value) =>
  `sha256:${createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')}`;
const bytesDigest = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const id = (...parts) => parts.map((part) => encodeURIComponent(part)).join(':');
const text = (value) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Nonempty string required');
  return value;
};
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function closed(value, keys) {
  if (
    !object(value) ||
    Object.keys(value).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new TypeError('Unknown or missing input field');
}
function timestamp(value) {
  if (
    typeof value !== 'string' ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new TypeError('Canonical ISO timestamp required');
  return Date.parse(value);
}
function scope(value) {
  closed(value, ['accountId', 'tenantId', 'workspaceId']);
  Object.values(value).forEach(text);
  return evidenceDigest(value);
}

/** Offline projection only: no storage, network, executor, identity or command port. */
export async function projectExecutionEvidence(value, { trustedPublicKey } = {}) {
  // Snapshot before the first await so caller mutation cannot change verified inputs.
  const input = structuredClone(value);
  closed(input, [
    'schemaVersion',
    'scope',
    'asOf',
    'maxAgeSeconds',
    'runtime',
    'reviews',
    'bindings'
  ]);
  if (input.schemaVersion !== 'execution_evidence_input.v0.1')
    throw new TypeError('Unknown input schema');
  if (!trustedPublicKey)
    throw new TypeError('An independently trusted compiler public key is required');
  const asOf = timestamp(input.asOf);
  if (!Number.isSafeInteger(input.maxAgeSeconds) || input.maxAgeSeconds <= 0)
    throw new TypeError('Positive maxAgeSeconds required');
  const expectedScope = scope(input.scope);
  if (!Array.isArray(input.reviews) || !Array.isArray(input.bindings))
    throw new TypeError('Observation arrays required');
  const sources = new Map();
  function source(envelope, owner, digest, verification) {
    if (scope(envelope.scope) !== expectedScope)
      throw new TypeError('Cross-scope observation rejected');
    text(envelope.sourceId);
    text(envelope.evidenceRef);
    if (!['current', 'stale', 'unknown'].includes(envelope.freshness))
      throw new TypeError('Unknown freshness');
    let freshness = envelope.freshness;
    if (envelope.observedAt === null) freshness = 'unknown';
    else {
      const observed = timestamp(envelope.observedAt);
      if (observed > asOf) throw new TypeError('Observation is later than asOf');
      if (asOf - observed > input.maxAgeSeconds * 1000 && freshness === 'current')
        freshness = 'stale';
    }
    const record = {
      id: envelope.sourceId,
      owner,
      artifactDigest: digest,
      evidenceRef: envelope.evidenceRef,
      observedAt: envelope.observedAt,
      freshness,
      verification,
      scopeProvenance: 'caller_declared_not_authenticated'
    };
    if (sources.has(record.id) && evidenceDigest(sources.get(record.id)) !== evidenceDigest(record))
      throw new TypeError('Conflicting source identity');
    sources.set(record.id, record);
    return record;
  }
  const runtime = input.runtime;
  closed(runtime, [
    'sourceId',
    'evidenceRef',
    'scope',
    'observedAt',
    'freshness',
    'artifactFiles',
    'run'
  ]);
  if (
    !object(runtime.artifactFiles) ||
    Object.values(runtime.artifactFiles).some((bytes) => typeof bytes !== 'string')
  )
    throw new TypeError('UTF-8 artifact snapshot required');
  const snapshot = new Map(
    Object.entries(runtime.artifactFiles).map(([path, content]) => [path, Buffer.from(content)])
  );
  const inventory = await verifyWorkflowArtifactSnapshot(snapshot, { publicKey: trustedPublicKey });
  if (inventory.status !== 'verified' || inventory.attestation.status !== 'verified')
    throw new TypeError('Signed compiler verification required');
  const manifestBytes = snapshot.get('runtime-manifest.json');
  if (!manifestBytes) throw new TypeError('Signed runtime manifest required');
  const manifest = parseWorkflowRuntimeManifest(JSON.parse(manifestBytes.toString('utf8')));
  for (const [field, inventoryField] of [
    ['id', 'workflowId'],
    ['version', 'workflowVersion'],
    ['definitionHash', 'definitionHash'],
    ['compilerVersion', 'compilerVersion']
  ]) {
    if (manifest.workflow[field] !== inventory[inventoryField])
      throw new TypeError('Compiler workflow identity mismatch');
  }
  const run = runtime.run;
  if (
    run.artifactManifestSha256 !== inventory.manifestHash ||
    run.runtimeManifestSha256 !== bytesDigest(manifestBytes)
  )
    throw new TypeError('Runtime artifact binding mismatch');
  await verifyWorkflowRuntimeRun(manifest, run);
  if (
    runtime.observedAt !== null &&
    run.receipts.some((receipt) => timestamp(receipt.createdAt) > timestamp(runtime.observedAt))
  )
    throw new TypeError('Observation predates runtime evidence');
  const origin = source(
    runtime,
    'control_runtime',
    evidenceDigest(run),
    'signed_artifacts_and_runtime_chain'
  );
  origin.compilerManifestSha256 = inventory.manifestHash;
  origin.runtimeManifestSha256 = run.runtimeManifestSha256;
  origin.signerFingerprint = inventory.attestation.publicKeyFingerprint;
  origin.runtimeAuthenticity = 'unattested_offline_export';
  const nodes = new Map();
  const edges = new Map();
  function node(kind, canonicalId, status, origin, extra = {}) {
    const record = {
      id: id(origin.id, kind, canonicalId),
      kind,
      canonicalId,
      status,
      owner: origin.owner,
      sourceId: origin.id,
      verification: origin.verification,
      ...extra
    };
    const previous = nodes.get(record.id);
    if (previous && evidenceDigest(previous) !== evidenceDigest(record))
      throw new TypeError('Conflicting node identity');
    nodes.set(record.id, record);
    return record.id;
  }
  function edge(from, to, relation, sourceId) {
    if (!nodes.has(from) || !nodes.has(to)) throw new TypeError('Missing graph reference');
    const record = { id: id(relation, from, to), source: from, target: to, relation, sourceId };
    edges.set(record.id, record);
  }
  const runNode = node('run', run.id, run.status, origin, {
    version: run.version,
    policySha256: run.activation.policySha256
  });
  for (const step of manifest.steps) {
    const state = run.steps.find((candidate) => candidate.id === step.id);
    const task = node('task', step.id, state.status, origin, {
      actionId: step.actionId,
      version: state.version,
      evidenceDigest: step.evidenceDigest,
      disposition: step.disposition
    });
    edge(runNode, task, 'run_contains_task', origin.id);
    for (const attempt of state.attempts) {
      const attemptNode = node('attempt', id(step.id, attempt.id), attempt.status, origin);
      edge(task, attemptNode, 'task_has_attempt', origin.id);
    }
  }
  for (const step of manifest.steps)
    for (const predecessor of step.dependsOn)
      edge(
        id(origin.id, 'task', predecessor),
        id(origin.id, 'task', step.id),
        'runtime_precedes',
        origin.id
      );
  for (const receipt of run.receipts) {
    const event = node('receipt', receipt.id, receipt.status, origin, {
      eventType: receipt.eventType,
      digest: receipt.receiptSha256,
      eventIndex: receipt.eventIndex,
      actionId: receipt.actionId ?? null
    });
    edge(
      event,
      receipt.stepId === null ? runNode : id(origin.id, 'task', receipt.stepId),
      'records_transition',
      origin.id
    );
  }
  const reviews = new Map();
  for (const envelope of input.reviews) {
    closed(envelope, ['sourceId', 'evidenceRef', 'scope', 'observedAt', 'freshness', 'receipt']);
    if (envelope.sourceId === origin.id) throw new TypeError('Source owner identity conflict');
    const review = projectSymphonyReview(envelope.receipt);
    const originReview = source(
      envelope,
      'symphony',
      evidenceDigest(envelope.receipt),
      'schema_validated'
    );
    const reviewNode = node('review_run', review.runId, review.status, originReview);
    // Linear ownership is a claim in this receipt, not a live tracker read.
    const issue = node('linear_issue_reference', review.issue, 'unknown', originReview, {
      verification: 'declared_reference'
    });
    edge(reviewNode, issue, 'declares_linear_issue', originReview.id);
    for (const stage of review.stages) {
      const stageNode = node('assignment', stage.workUnitId, stage.status, originReview, {
        role: stage.role
      });
      edge(
        stageNode,
        reviewNode,
        stage.role === 'reviewer' ? 'reports_review_of' : 'reports_stage_of',
        originReview.id
      );
    }
    reviews.set(originReview.id, { origin: originReview, node: reviewNode });
  }
  const bound = new Set();
  for (const binding of input.bindings) {
    closed(binding, [
      'runtimeRunId',
      'runtimeManifestSha256',
      'artifactManifestSha256',
      'reviewSourceId',
      'reviewDigest'
    ]);
    const review = reviews.get(binding.reviewSourceId);
    if (
      !review ||
      binding.runtimeRunId !== run.id ||
      binding.runtimeManifestSha256 !== run.runtimeManifestSha256 ||
      binding.artifactManifestSha256 !== inventory.manifestHash ||
      binding.reviewDigest !== review.origin.artifactDigest
    )
      throw new TypeError('Missing or mismatched explicit review binding');
    edge(review.node, runNode, 'declared_review_binding', review.origin.id);
    bound.add(binding.reviewSourceId);
  }
  const unresolved = ['runtime_to_substrate'];
  if (bound.size === 0) unresolved.push('runtime_to_review');
  for (const sourceId of reviews.keys())
    if (!bound.has(sourceId)) unresolved.push(`unbound_review:${sourceId}`);
  const sort = (values) => [...values].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const graph = {
    schemaVersion: 'execution_evidence_graph.v0.1',
    authority: 'read_only',
    scopeProvenance: 'caller_declared_not_authenticated',
    scope: input.scope,
    asOf: input.asOf,
    maxAgeSeconds: input.maxAgeSeconds,
    sources: sort(sources.values()),
    nodes: sort(nodes.values()),
    edges: sort(edges.values()),
    unresolved: unresolved.sort()
  };
  return { ...graph, digest: evidenceDigest(graph) };
}
