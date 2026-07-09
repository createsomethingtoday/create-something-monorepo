import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  projectInternalTopology,
  projectTopologyToSubstrateComputeSnapshot,
  projectTopologyToSharedCanvasState,
  projectTopologyToAtlasCanvas,
  projectTopologyToGapActions,
  projectTopologyToSourceRecords
} from '../dist/index.js';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));

function sourceRecordByPath(projection, pathname) {
  const node = topology.nodes.find((candidate) => candidate.path === pathname);
  return projection.sourceRecords.find((record) => record.id === node?.id);
}

test('topology projects every node into a Substrate source record', () => {
  const records = projectTopologyToSourceRecords(topology);

  assert.equal(records.length, topology.nodes.length);
  assert.ok(records.every((record) => record.id.startsWith('substrate:create-something:')));
  assert.ok(records.every((record) => record.atlasCanvasId === topology.atlasCanvasId));
});

test('topology projects into an Atlas canvas with node and edge parity', () => {
  const canvas = projectTopologyToAtlasCanvas(topology);

  assert.equal(canvas.id, topology.atlasCanvasId);
  assert.equal(canvas.nodes.length, topology.nodes.length);
  assert.equal(canvas.edges.length, topology.edges.length);
  assert.ok(canvas.nodes.some((node) => node.sourceRecordId === topology.rootNodeId));
});

test('topology projection spreads the operating map into scan-friendly board sections', () => {
  const canvas = projectTopologyToAtlasCanvas(topology);
  const xs = canvas.nodes.map((node) => node.x);
  const ys = canvas.nodes.map((node) => node.y);
  const root = canvas.nodes.find((node) => node.sourceRecordId === topology.rootNodeId);

  assert.equal(root?.x, 84);
  assert.equal(root?.y, 168);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 3600);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 5200);
});

test('topology projects into a shared CanvasKernel-compatible canvas state', () => {
  const canvasState = projectTopologyToSharedCanvasState(topology, {
    sessionId: topology.atlasCanvasId,
    viewport: { x: 64, y: 148, width: 900, height: 420, zoom: 1, limit: 12 },
    selectedNodeId: 'atlas_create-something_root',
    focusedNodeIds: ['atlas_create-something_root'],
    storyStepId: 'topology-root'
  });

  assert.equal(canvasState.version, 'flow.shared-canvas-state.v1');
  assert.equal(canvasState.renderer, 'canvas-kernel');
  assert.equal(canvasState.source, 'substrate');
  assert.equal(canvasState.topologyId, topology.id);
  assert.equal(canvasState.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(canvasState.sessionId, topology.atlasCanvasId);
  assert.equal(canvasState.storyStepId, 'topology-root');
  assert.equal(canvasState.selectedNodeId, 'atlas_create-something_root');
  assert.deepEqual(canvasState.focusedNodeIds, ['atlas_create-something_root']);
  assert.equal(canvasState.counts.totalNodes, topology.nodes.length);
  assert.equal(canvasState.counts.totalEdges, topology.edges.length);
  assert.ok(canvasState.counts.visibleNodes > 0);
  assert.ok(canvasState.counts.visibleNodes <= 12);
  assert.equal(canvasState.visibleNodeIds.length, canvasState.nodes.length);
  assert.equal(canvasState.visibleEdgeIds.length, canvasState.edges.length);
  assert.ok(canvasState.joins.every((join) => join.substrateRecordId === join.topologyNodeId));
  assert.ok(canvasState.endpoints.canvasState.includes('/canvas-state'));
});

test('topology projects into a CPU Substrate compute snapshot for future GPU buffers', () => {
  const snapshot = projectTopologyToSubstrateComputeSnapshot(topology, {
    sessionId: topology.atlasCanvasId,
    scenario: {
      sourceNodeId: topology.rootNodeId,
      kind: 'impact',
      maxDepth: 2,
      description: 'Test impact walk from root.'
    },
    limit: 12
  });

  assert.equal(snapshot.version, 'flow.substrate-compute-snapshot.v1');
  assert.equal(snapshot.engine, 'cpu');
  assert.equal(snapshot.source, 'substrate');
  assert.equal(snapshot.topologyId, topology.id);
  assert.equal(snapshot.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(snapshot.sessionId, topology.atlasCanvasId);
  assert.equal(snapshot.scenario.sourceNodeId, topology.rootNodeId);
  assert.equal(snapshot.scenario.maxDepth, 2);
  assert.equal(snapshot.counts.nodes, topology.nodes.length);
  assert.equal(snapshot.counts.edges, topology.edges.length);
  assert.equal(snapshot.buffers.nodeIds.length, topology.nodes.length);
  assert.equal(snapshot.buffers.edgeIds.length, topology.edges.length);
  assert.equal(snapshot.buffers.edgeSources.length, topology.edges.length);
  assert.equal(snapshot.buffers.edgeTargets.length, topology.edges.length);
  assert.deepEqual(snapshot.buffers.weightKeys, [
    'latency',
    'cost',
    'trust',
    'confidence',
    'reliability',
    'impact'
  ]);
  assert.ok(snapshot.nodes.every((node, index) => node.index === index));
  assert.ok(snapshot.edges.every((edge, index) => edge.index === index));
  assert.ok(snapshot.edges.every((edge) => snapshot.nodes[edge.source]?.id === edge.sourceId));
  assert.ok(snapshot.edges.every((edge) => snapshot.nodes[edge.target]?.id === edge.targetId));
  assert.ok(snapshot.outputs.impact.some((item) => item.nodeId === topology.rootNodeId && item.score === 1));
  assert.ok(snapshot.outputs.attention.length > 0);
  assert.ok(snapshot.outputs.attention.every((item, index) => item.rank === index + 1));
  assert.ok(snapshot.outputs.bottlenecks.length > 0);
  assert.ok(snapshot.outputs.agentWorkQueue.length > 0);
  assert.ok(snapshot.outputs.agentWorkQueue.every((item, index) => item.rank === index + 1));
  assert.ok(snapshot.endpoints.computeSnapshot.endsWith('/compute-snapshot'));
  assert.ok(snapshot.endpoints.canvasState.endsWith('/canvas-state'));
});

test('topology projection marks covered clients and runtime bindings as bound', () => {
  const projection = projectInternalTopology(topology);
  const substrateRecord = sourceRecordByPath(projection, 'packages/substrate-mcp');
  const outerfieldsRecord = sourceRecordByPath(projection, 'packages/agency/clients/outerfields');
  const workerRecord = sourceRecordByPath(
    projection,
    'packages/substrate-mcp/worker/wrangler.toml'
  );
  const agentConfigRecord = sourceRecordByPath(projection, 'config/dify-agents/abundance-hub.json');

  assert.equal(substrateRecord?.status, 'ready');
  assert.equal(substrateRecord?.bindingHealth, 'bound');
  assert.equal(outerfieldsRecord?.status, 'ready');
  assert.equal(outerfieldsRecord?.bindingHealth, 'bound');
  assert.equal(workerRecord?.status, 'ready');
  assert.equal(workerRecord?.bindingHealth, 'bound');
  assert.equal(agentConfigRecord?.status, 'ready');
  assert.equal(agentConfigRecord?.bindingHealth, 'bound');
});

test('topology projection has no workflow gap actions after all coverage artifacts exist', () => {
  const actions = projectTopologyToGapActions(topology);

  assert.equal(actions.length, 0);
});

test('full topology projection preserves action and receipt ownership boundaries', () => {
  const projection = projectInternalTopology(topology);

  assert.equal(projection.topologyId, topology.id);
  assert.equal(projection.sourceRecords.length, topology.nodes.length);
  assert.equal(projection.sharedCanvasState.version, 'flow.shared-canvas-state.v1');
  assert.equal(projection.sharedCanvasState.renderer, 'canvas-kernel');
  assert.equal(projection.sharedCanvasState.counts.totalNodes, topology.nodes.length);
  assert.equal(projection.computeSnapshot.version, 'flow.substrate-compute-snapshot.v1');
  assert.equal(projection.computeSnapshot.counts.nodes, topology.nodes.length);
  assert.equal(projection.atlasBindings.length, topology.nodes.length);
  assert.equal(projection.receipts.length, topology.nodes.length);
  assert.equal(projection.gapActions.length, 0);
  assert.ok(projection.gapActions.every((action) => action.state === 'wait'));
});
