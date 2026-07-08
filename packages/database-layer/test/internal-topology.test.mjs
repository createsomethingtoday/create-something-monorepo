import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));

function nodeByPath(pathname) {
  return topology.nodes.find((node) => node.path === pathname);
}

function nodeByPackageName(packageName) {
  return topology.nodes.find((node) => node.packageName === packageName);
}

test('internal topology has a stable Substrate root and Atlas canvas id', () => {
  assert.equal(topology.id, 'substrate:create-something:topology:internal');
  assert.equal(topology.rootNodeId, 'substrate:create-something:root');
  assert.equal(topology.atlasCanvasId, 'create-something-internal-operating-topology');

  const root = topology.nodes.find((node) => node.id === topology.rootNodeId);
  assert.equal(root?.surface, 'repo');
  assert.equal(root?.status, 'mapped');
});

test('internal topology covers the current repo package and runtime surfaces', () => {
  assert.ok(topology.coverage.packageCount >= 150);
  assert.ok(topology.coverage.workerCount >= 50);
  assert.ok(topology.coverage.policyCount >= 40);
  assert.ok(topology.coverage.guideCount >= 40);
  assert.ok(topology.coverage.configCount >= 20);
  assert.equal(topology.coverage.clientOverlayCount, 6);
});

test('internal topology includes the key Atlas and Substrate packages', () => {
  const databaseLayer = nodeByPackageName('@create-something/database-layer');
  const substrate = nodeByPackageName('@create-something/substrate-mcp');
  const atlas = nodeByPackageName('@create-something/interaction-atlas-mcp');

  assert.equal(databaseLayer?.tier, 'Database');
  assert.equal(databaseLayer?.status, 'mapped');
  assert.equal(substrate?.surface, 'mcp');
  assert.equal(substrate?.status, 'mapped');
  assert.equal(atlas?.status, 'mapped');
});

test('internal topology maps managed client overlays when coverage exists', () => {
  const clientNodes = topology.nodes.filter((node) => node.surface === 'client');

  assert.ok(clientNodes.some((node) => node.clientSlug === 'outerfields'));
  assert.ok(clientNodes.some((node) => node.clientSlug === 'jandjhomehealth'));
  assert.ok(clientNodes.some((node) => node.clientSlug === 'cato-supply-insights-review'));
  assert.ok(clientNodes.every((node) => node.status === 'mapped'));
});

test('internal topology maps Cloudflare worker configs when runtime coverage exists', () => {
  const workerConfigNodes = topology.nodes.filter(
    (node) => node.surface === 'worker' && /wrangler\.(toml|json|jsonc)$/.test(node.path)
  );

  assert.equal(workerConfigNodes.length, topology.coverage.workerCount);
  assert.ok(workerConfigNodes.length >= 90);
  assert.ok(workerConfigNodes.every((node) => node.status === 'mapped'));
});

test('internal topology maps Dify and MCP config files when agent coverage exists', () => {
  const configNodes = topology.nodes.filter(
    (node) => (node.surface === 'agent' || node.surface === 'config') && node.path.startsWith('config/')
  );

  assert.equal(configNodes.length, topology.coverage.configCount);
  assert.equal(configNodes.filter((node) => node.surface === 'agent').length, 16);
  assert.equal(configNodes.filter((node) => node.surface === 'config').length, 24);
  assert.ok(configNodes.every((node) => node.status === 'mapped'));
});

test('internal topology has no open coverage gaps after Atlas coverage exists', () => {
  assert.equal(topology.nodes.every((node) => node.status === 'mapped'), true);
});

test('internal topology has stable ids and connected root edges', () => {
  const ids = new Set();
  for (const node of topology.nodes) {
    assert.match(node.id, /^substrate:create-something:/);
    assert.match(node.atlasNodeId, /^atlas_create-something_/);
    assert.equal(ids.has(node.id), false, `duplicate node id ${node.id}`);
    ids.add(node.id);
  }

  assert.ok(
    topology.edges.some(
      (edge) =>
        edge.source === topology.rootNodeId &&
        edge.target === nodeByPackageName('@create-something/substrate-mcp')?.id &&
        edge.relation === 'contains'
    )
  );
  assert.ok(topology.edges.length > topology.nodes.length);
});

test('internal topology normalizes owners into displayable strings', () => {
  const badOwner = topology.nodes.find((node) => typeof node.owner !== 'string' || !node.owner.trim());

  assert.equal(badOwner, undefined);
});

test('internal topology includes direct repo truth paths for current proof surfaces', () => {
  assert.equal(nodeByPath('packages/substrate-mcp/worker/wrangler.toml')?.surface, 'worker');
  assert.equal(nodeByPath('docs/README.md')?.surface, 'doc');
  assert.equal(nodeByPath('packages/agency/clients/outerfields')?.surface, 'client');
});
