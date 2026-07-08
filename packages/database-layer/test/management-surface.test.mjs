import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const managementPath = path.join(packageRoot, 'data', 'create-something-management-surface.json');
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const reviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const readinessPath = path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json');

const management = JSON.parse(fs.readFileSync(managementPath, 'utf8'));
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));

test('management surface is tied to the current topology and readiness artifact', () => {
  assert.equal(management.id, 'substrate:create-something:management-surface:internal');
  assert.equal(management.topologyId, topology.id);
  assert.equal(management.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(management.sourceReadinessId, readiness.id);
  assert.equal(management.posture, 'agent_native');
});

test('management surface exposes every operating slice through API, MCP, and agent resources', () => {
  const sliceResources = management.resources.filter((resource) => resource.kind === 'slice');
  const readinessResources = management.resources.filter((resource) => resource.kind === 'readiness');

  assert.equal(sliceResources.length, review.slices.length);
  assert.equal(readinessResources.length, readiness.items.length);

  for (const slice of review.slices) {
    const sliceResource = sliceResources.find((resource) => resource.recordId === slice.id);
    const readinessResource = readinessResources.find((resource) => resource.recordId === slice.id);

    assert.ok(sliceResource?.apiPath.startsWith('/api/substrate/operating-slices/'));
    assert.ok(sliceResource?.mcpUri.startsWith('substrate://operating-slices/'));
    assert.equal(sliceResource?.agentCommand, 'databaseLayer.operatingSlices.get');
    assert.ok(sliceResource?.access.includes('propose'));

    assert.ok(readinessResource?.apiPath.endsWith('/readiness'));
    assert.ok(readinessResource?.mcpUri.endsWith('/readiness'));
    assert.equal(readinessResource?.agentCommand, 'databaseLayer.operatingSlices.readiness');
    assert.ok(readinessResource?.access.includes('approve'));
  }
});

test('management surface exposes every topology record as an API, MCP, and agent resource', () => {
  const topologyRecordResources = management.resources.filter((resource) => resource.kind === 'topology_record');
  const apiPaths = new Set(topologyRecordResources.map((resource) => resource.apiPath));
  const mcpUris = new Set(topologyRecordResources.map((resource) => resource.mcpUri));

  assert.equal(topologyRecordResources.length, topology.nodes.length);
  assert.equal(apiPaths.size, topology.nodes.length);
  assert.equal(mcpUris.size, topology.nodes.length);

  for (const node of topology.nodes) {
    const resource = topologyRecordResources.find((candidate) => candidate.recordId === node.id);

    assert.ok(resource, `missing topology record resource for ${node.id}`);
    assert.ok(resource.apiPath.startsWith('/api/substrate/topology/internal/records/'));
    assert.ok(resource.mcpUri.startsWith('substrate://topology/internal/records/'));
    assert.equal(resource.agentCommand, 'databaseLayer.topology.records.get');
    assert.deepEqual(resource.access, ['read']);
  }
});

test('management operations preserve approval boundaries for write-shaped actions', () => {
  const readOperations = management.operations.filter((operation) => operation.apiMethod === 'GET');
  const writeOperations = management.operations.filter((operation) => operation.apiMethod === 'POST');

  assert.ok(readOperations.length >= 4);
  assert.ok(writeOperations.length >= 3);
  assert.ok(readOperations.every((operation) => operation.requiresApproval === false));
  assert.ok(writeOperations.every((operation) => operation.requiresApproval === true));
  assert.ok(writeOperations.every((operation) => /do not mutate Cloudflare/.test(operation.mutationBoundary)));
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/topology/internal/records/{recordId}' &&
        operation.mcpTool === 'database_layer_get_topology_record' &&
        operation.agentCommand === 'databaseLayer.topology.records.get'
    )
  );
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/topology/internal/diagnostics' &&
        operation.mcpTool === 'database_layer_get_topology_diagnostics' &&
        operation.agentCommand === 'databaseLayer.topology.diagnostics'
    )
  );
});

test('management surface includes topology, diagnostics, Atlas session, and runtime coverage resources', () => {
  const resourceKinds = new Set(management.resources.map((resource) => resource.kind));

  assert.ok(resourceKinds.has('topology'));
  assert.ok(resourceKinds.has('diagnostics'));
  assert.ok(resourceKinds.has('atlas_session'));
  assert.ok(resourceKinds.has('coverage'));
  assert.ok(
    management.resources.some(
      (resource) =>
        resource.apiPath === '/api/substrate/topology/internal' &&
        resource.mcpUri === 'substrate://topology/internal' &&
        resource.agentCommand === 'databaseLayer.topology.get'
    )
  );
  assert.ok(
    management.resources.some(
      (resource) =>
        resource.apiPath === '/api/substrate/topology/internal/diagnostics' &&
        resource.mcpUri === 'substrate://topology/internal/diagnostics' &&
        resource.agentCommand === 'databaseLayer.topology.diagnostics'
    )
  );
});
