import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const managementPath = path.join(packageRoot, 'data', 'create-something-management-surface.json');
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const reviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const readinessPath = path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json');
const clientOverlayCoveragePath = path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json');

const management = JSON.parse(fs.readFileSync(managementPath, 'utf8'));
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
const clientOverlayCoverage = JSON.parse(fs.readFileSync(clientOverlayCoveragePath, 'utf8'));

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

test('management surface exposes client overlays through API, MCP, and agent resources', () => {
  const overlayResources = management.resources.filter((resource) => resource.kind === 'client_overlay');
  const overlayListResource = overlayResources.find((resource) => resource.mcpUri === 'substrate://client-overlays');

  assert.equal(overlayResources.length, clientOverlayCoverage.overlays.length + 1);
  assert.equal(overlayListResource?.apiPath, '/api/substrate/client-overlays');
  assert.equal(overlayListResource?.agentCommand, 'databaseLayer.clientOverlays.list');
  assert.ok(
    overlayResources.some(
      (resource) =>
        resource.recordId === 'outerfields' &&
        resource.apiPath === '/api/substrate/client-overlays/outerfields' &&
        resource.mcpUri === 'substrate://client-overlays/outerfields' &&
        resource.agentCommand === 'databaseLayer.clientOverlays.get'
    )
  );
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
        operation.apiPath === '/api/substrate/contract/audit' &&
        operation.mcpTool === 'database_layer_get_contract_audit' &&
        operation.agentCommand === 'databaseLayer.contract.audit'
    )
  );
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/topology/internal' &&
        operation.mcpTool === 'database_layer_get_topology' &&
        operation.agentCommand === 'databaseLayer.topology.get'
    )
  );
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/atlas-sessions/{sessionId}' &&
        operation.mcpTool === 'database_layer_get_atlas_session' &&
        operation.agentCommand === 'databaseLayer.atlasSessions.get'
    )
  );
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/atlas-sessions/{sessionId}/viewport' &&
        operation.mcpTool === 'database_layer_get_atlas_viewport' &&
        operation.agentCommand === 'databaseLayer.atlasSessions.viewport'
    )
  );
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/coverage/runtime-bindings/cloudflare' &&
        operation.mcpTool === 'database_layer_get_runtime_binding_coverage' &&
        operation.agentCommand === 'databaseLayer.coverage.runtimeBindings'
    )
  );
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
        operation.apiPath === '/api/substrate/operating-slices/{sliceId}' &&
        operation.mcpTool === 'database_layer_get_operating_slice' &&
        operation.agentCommand === 'databaseLayer.operatingSlices.get'
    )
  );
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/client-overlays/{clientSlug}' &&
        operation.mcpTool === 'database_layer_get_client_overlay' &&
        operation.agentCommand === 'databaseLayer.clientOverlays.get'
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
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/performance' &&
        operation.mcpTool === 'database_layer_get_performance_contract' &&
        operation.agentCommand === 'databaseLayer.performance.get'
    )
  );
  assert.ok(
    readOperations.some(
      (operation) =>
        operation.apiPath === '/api/substrate/organization-review' &&
        operation.mcpTool === 'database_layer_get_organization_review' &&
        operation.agentCommand === 'databaseLayer.organization.review'
    )
  );
});

test('management surface includes topology, diagnostics, performance, organization review, Atlas session, and runtime coverage resources', () => {
  const resourceKinds = new Set(management.resources.map((resource) => resource.kind));

  assert.ok(resourceKinds.has('topology'));
  assert.ok(resourceKinds.has('contract_audit'));
  assert.ok(resourceKinds.has('diagnostics'));
  assert.ok(resourceKinds.has('performance'));
  assert.ok(resourceKinds.has('organization_review'));
  assert.ok(resourceKinds.has('business_recommendations'));
  assert.ok(resourceKinds.has('atlas_session'));
  assert.ok(resourceKinds.has('atlas_viewport'));
  assert.ok(resourceKinds.has('compute_snapshot'));
  assert.ok(resourceKinds.has('coverage'));
  assert.ok(
    management.resources.some(
      (resource) =>
        resource.apiPath === '/api/substrate/contract/audit' &&
        resource.mcpUri === 'substrate://contract/audit' &&
        resource.agentCommand === 'databaseLayer.contract.audit'
    )
  );
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
        resource.apiPath === '/api/substrate/atlas-sessions/create-something-internal-operating-topology/viewport' &&
        resource.mcpUri === 'substrate://atlas-sessions/create-something-internal-operating-topology/viewport' &&
        resource.agentCommand === 'databaseLayer.atlasSessions.viewport'
    )
  );
  assert.ok(
    management.resources.some(
      (resource) =>
        resource.apiPath === '/api/substrate/atlas-sessions/create-something-internal-operating-topology/compute-snapshot' &&
        resource.mcpUri === 'substrate://compute-snapshot' &&
        resource.agentCommand === 'databaseLayer.compute.snapshot'
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
  assert.ok(
    management.resources.some(
      (resource) =>
        resource.apiPath === '/api/substrate/performance' &&
        resource.mcpUri === 'substrate://performance' &&
        resource.agentCommand === 'databaseLayer.performance.get'
    )
  );
  assert.ok(
    management.resources.some(
      (resource) =>
        resource.apiPath === '/api/substrate/organization-review' &&
        resource.mcpUri === 'substrate://organization-review' &&
        resource.agentCommand === 'databaseLayer.organization.review'
    )
  );
  assert.ok(
    management.resources.some(
      (resource) =>
        resource.apiPath === '/api/substrate/business/recommendations' &&
        resource.mcpUri === 'substrate://business/recommendations' &&
        resource.agentCommand === 'databaseLayer.business.recommendations.get'
    )
  );
});
