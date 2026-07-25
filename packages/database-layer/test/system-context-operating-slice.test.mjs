import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  projectOperatingSlice,
  projectTopologyNodeSemantics,
  projectTopologyToAtlasCanvas,
  projectTopologyToSourceRecords,
  projectTopologyToSubstrateComputeSnapshot
} from '../dist/index.js';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = path.resolve(packageRoot, '../..');
const topology = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data/create-something-internal-topology.json'), 'utf8')
);
const designSource = JSON.parse(
  fs.readFileSync(
    path.join(repoRoot, 'docs/design/artifacts/template-review-operating-slice.v1.json'),
    'utf8'
  )
);

test('mapped topology coverage does not imply verification, health, authority, or proof', () => {
  const mappedNode = topology.nodes.find((node) => node.status === 'mapped');
  const semantics = projectTopologyNodeSemantics(mappedNode, {
    checkedAt: topology.coverage.generatedAt
  });

  assert.equal(semantics.coverage, 'mapped');
  assert.equal(semantics.verification, 'unverified');
  assert.equal(semantics.health, 'unknown');
  assert.equal(semantics.authority, 'unknown');
  assert.equal(semantics.proof, 'unknown');
  assert.equal(semantics.provenance.kind, 'derived');
  assert.equal(semantics.freshness.state, 'unknown');
});

test('source records carry explicit semantics beside legacy compatibility fields', () => {
  const records = projectTopologyToSourceRecords(topology);

  assert.ok(records.every((record) => record.semantics.coverage === 'mapped'));
  assert.ok(records.every((record) => record.semantics.verification === 'unverified'));
  assert.ok(records.every((record) => record.semantics.health === 'unknown'));
  assert.ok(records.every((record) => record.semantics.authority === 'unknown'));
  assert.ok(records.every((record) => record.semantics.proof === 'unknown'));
});

test('Atlas presentation does not turn mapped coverage into run authority', () => {
  const canvas = projectTopologyToAtlasCanvas(topology);
  const mappedIds = new Set(
    topology.nodes.filter((node) => node.status === 'mapped').map((node) => node.atlasNodeId)
  );

  assert.ok(canvas.nodes.filter((node) => mappedIds.has(node.id)).every((node) => node.status === 'unknown'));
});

test('compute weights declare a derived non-telemetry provenance model', () => {
  const snapshot = projectTopologyToSubstrateComputeSnapshot(topology);

  assert.equal(snapshot.weightModel.kind, 'derived');
  assert.equal(snapshot.weightModel.source, 'static_topology_heuristic');
  assert.equal(snapshot.weightModel.observedTelemetry, false);
});

test('client-safe projection preserves explicit authority and bounded lens state', () => {
  const projection = projectOperatingSlice(designSource, {
    audience: 'public',
    lens: 'authority',
    now: '2026-07-23T00:00:00-05:00'
  });
  const decision = projection.nodes.find((node) => node.id === 'reviewer-decision');
  const stop = projection.nodes.find((node) => node.id === 'ungrounded-approval-stop');

  assert.equal(projection.version, 'system-context.operating-slice.v1');
  assert.equal(projection.selectedLens, 'authority');
  assert.ok(projection.nodes.length >= 1 && projection.nodes.length <= 12);
  assert.ok(projection.visibleNodeIds.includes('reviewer-decision'));
  assert.equal(decision?.semantics.coverage, 'mapped');
  assert.equal(decision?.semantics.authority, 'wait');
  assert.equal(stop?.semantics.coverage, 'mapped');
  assert.equal(stop?.semantics.authority, 'stop');
  assert.equal(projection.source.freshness, 'current');
});

test('client-safe projection derives stale display state from the explicit review boundary', () => {
  const projection = projectOperatingSlice(designSource, {
    audience: 'public',
    lens: 'proof',
    now: '2026-09-01T00:00:00-05:00'
  });

  assert.equal(projection.source.freshness, 'stale');
  assert.ok(projection.nodes.every((node) => node.semantics.freshness === 'stale'));
});

test('public projection removes internal records and private implementation fields', () => {
  const source = structuredClone(designSource);
  source.nodes[0].internal = {
    path: 'packages/private-client/worker/wrangler.toml',
    tenantId: 'tenant_private'
  };
  source.nodes.push({
    ...structuredClone(source.nodes[0]),
    id: 'internal-only-record',
    label: 'Private worker',
    visibility: 'internal',
    internal: { path: 'packages/private-worker', accountId: 'account_private' }
  });
  source.lenses.dependencies.push('internal-only-record');

  const projection = projectOperatingSlice(source, {
    audience: 'public',
    lens: 'dependencies',
    now: '2026-07-23T00:00:00-05:00'
  });
  const serialized = JSON.stringify(projection);

  assert.equal(projection.nodes.some((node) => node.id === 'internal-only-record'), false);
  assert.equal(serialized.includes('packages/private'), false);
  assert.equal(serialized.includes('tenant_private'), false);
  assert.equal(serialized.includes('account_private'), false);
  assert.ok(projection.redactions.includes('internal-only-record'));
});
