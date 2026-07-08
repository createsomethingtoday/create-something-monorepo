import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  projectInternalTopology,
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
  assert.equal(projection.atlasBindings.length, topology.nodes.length);
  assert.equal(projection.receipts.length, topology.nodes.length);
  assert.equal(projection.gapActions.length, 0);
  assert.ok(projection.gapActions.every((action) => action.state === 'wait'));
});
