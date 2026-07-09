import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const clientOverlayCoveragePath = path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json');
const topologyDiagnosticsPath = path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json');
const organizationReviewPath = path.join(packageRoot, 'data', 'create-something-organization-review.json');
const businessRecommendationsPath = path.join(packageRoot, 'data', 'create-something-business-operating-recommendations.json');
const operatingSliceReviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const operatingSliceReadinessPath = path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-management-surface.json');
const generatedAt = new Date().toISOString();

function findRepoRoot(start) {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  throw new Error(`Could not find repo root from ${start}`);
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resource({ kind, title, recordId, sourcePath, apiPath, mcpUri, agentCommand, access }) {
  return {
    id: `substrate:create-something:management-resource:${kind}:${slug(recordId ?? title)}`,
    kind,
    title,
    ...(recordId ? { recordId } : {}),
    sourcePath,
    apiPath,
    mcpUri,
    agentCommand,
    access,
    policy:
      access.some((mode) => mode !== 'read')
        ? 'Proposal and approval records are local review state until an owning production workflow promotes them.'
        : 'Read-only management resource; safe for API, MCP, and agent inspection.'
  };
}

function operation({ id, title, mode, apiMethod, apiPath, mcpTool, agentCommand, inputSchema, outputRef, requiresApproval }) {
  return {
    id,
    title,
    mode,
    apiMethod,
    apiPath,
    mcpTool,
    agentCommand,
    inputSchema,
    outputRef,
    requiresApproval,
    mutationBoundary:
      requiresApproval
        ? 'Writes create local proposals, approval records, or receipts only. They do not mutate Cloudflare, Atlas production, Dify Studio, clients, or third-party systems without explicit operator approval and the owning promotion workflow.'
        : 'Read-only operation. No production state mutation.'
  };
}

function sliceResources(slice, readinessItem) {
  const sliceSlug = slug(slice.id);
  return [
    resource({
      kind: 'slice',
      title: slice.title,
      recordId: slice.id,
      sourcePath: 'packages/database-layer/data/create-something-operating-slice-review.json',
      apiPath: `/api/substrate/operating-slices/${sliceSlug}`,
      mcpUri: `substrate://operating-slices/${sliceSlug}`,
      agentCommand: 'databaseLayer.operatingSlices.get',
      access: ['read', 'propose']
    }),
    resource({
      kind: 'readiness',
      title: `${slice.title} readiness`,
      recordId: readinessItem?.sliceId ?? slice.id,
      sourcePath: 'packages/database-layer/data/create-something-operating-slice-readiness.json',
      apiPath: `/api/substrate/operating-slices/${sliceSlug}/readiness`,
      mcpUri: `substrate://operating-slices/${sliceSlug}/readiness`,
      agentCommand: 'databaseLayer.operatingSlices.readiness',
      access: ['read', 'approve', 'receipt']
    })
  ];
}

function topologyRecordResource(node) {
  const recordSlug = slug(node.id);
  return resource({
    kind: 'topology_record',
    title: node.title,
    recordId: node.id,
    sourcePath: 'packages/database-layer/data/create-something-internal-topology.json',
    apiPath: `/api/substrate/topology/internal/records/${recordSlug}`,
    mcpUri: `substrate://topology/internal/records/${recordSlug}`,
    agentCommand: 'databaseLayer.topology.records.get',
    access: ['read']
  });
}

function clientOverlayResource(overlay) {
  return resource({
    kind: 'client_overlay',
    title: overlay.title,
    recordId: overlay.clientSlug,
    sourcePath: 'packages/database-layer/data/create-something-client-overlay-coverage.json',
    apiPath: `/api/substrate/client-overlays/${slug(overlay.clientSlug)}`,
    mcpUri: `substrate://client-overlays/${slug(overlay.clientSlug)}`,
    agentCommand: 'databaseLayer.clientOverlays.get',
    access: ['read']
  });
}

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const clientOverlayCoverage = JSON.parse(fs.readFileSync(clientOverlayCoveragePath, 'utf8'));
const topologyDiagnostics = JSON.parse(fs.readFileSync(topologyDiagnosticsPath, 'utf8'));
const organizationReview = JSON.parse(fs.readFileSync(organizationReviewPath, 'utf8'));
const businessRecommendations = JSON.parse(fs.readFileSync(businessRecommendationsPath, 'utf8'));
const operatingSliceReview = JSON.parse(fs.readFileSync(operatingSliceReviewPath, 'utf8'));
const operatingSliceReadiness = JSON.parse(fs.readFileSync(operatingSliceReadinessPath, 'utf8'));
const readinessBySliceId = new Map(operatingSliceReadiness.items.map((item) => [item.sliceId, item]));

const resources = [
  resource({
    kind: 'capabilities',
    title: 'Substrate API capabilities index',
    recordId: 'substrate:create-something:capabilities',
    sourcePath: 'packages/database-layer/data/create-something-management-surface.json',
    apiPath: '/api/substrate/capabilities',
    mcpUri: 'substrate://capabilities',
    agentCommand: 'databaseLayer.capabilities.get',
    access: ['read']
  }),
  resource({
    kind: 'health',
    title: 'Substrate health and readiness',
    recordId: 'substrate:create-something:health',
    sourcePath: 'packages/database-layer/data/create-something-management-surface.json',
    apiPath: '/api/substrate/health',
    mcpUri: 'substrate://health',
    agentCommand: 'databaseLayer.health.get',
    access: ['read']
  }),
  resource({
    kind: 'openapi',
    title: 'Substrate OpenAPI contract',
    recordId: 'substrate:create-something:openapi',
    sourcePath: 'packages/database-layer/data/create-something-management-surface.json',
    apiPath: '/api/substrate/openapi.json',
    mcpUri: 'substrate://openapi',
    agentCommand: 'databaseLayer.openapi.get',
    access: ['read']
  }),
  resource({
    kind: 'contract_audit',
    title: 'Substrate contract audit',
    recordId: 'substrate:create-something:contract-audit',
    sourcePath: 'packages/database-layer/data/create-something-management-surface.json',
    apiPath: '/api/substrate/contract/audit',
    mcpUri: 'substrate://contract/audit',
    agentCommand: 'databaseLayer.contract.audit',
    access: ['read']
  }),
  resource({
    kind: 'query',
    title: 'Substrate topology record query',
    recordId: 'substrate:create-something:query',
    sourcePath: 'packages/database-layer/data/create-something-internal-topology.json',
    apiPath: '/api/substrate/query',
    mcpUri: 'substrate://query',
    agentCommand: 'databaseLayer.query.records',
    access: ['read']
  }),
  resource({
    kind: 'workbench',
    title: 'Substrate topology workbench snapshot',
    recordId: 'substrate:create-something:workbench',
    sourcePath: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    apiPath: '/api/substrate/workbench',
    mcpUri: 'substrate://workbench',
    agentCommand: 'databaseLayer.workbench.get',
    access: ['read']
  }),
  resource({
    kind: 'workflow_queue',
    title: 'Substrate workflow queue',
    recordId: 'substrate:create-something:workflow-queue',
    sourcePath: 'packages/database-layer/data/create-something-operating-slice-readiness.json',
    apiPath: '/api/substrate/workflow/queue',
    mcpUri: 'substrate://workflow/queue',
    agentCommand: 'databaseLayer.workflow.queue',
    access: ['read']
  }),
  resource({
    kind: 'receipts',
    title: 'Substrate receipt ledger',
    recordId: 'substrate:create-something:receipts',
    sourcePath: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    apiPath: '/api/substrate/receipts',
    mcpUri: 'substrate://receipts',
    agentCommand: 'databaseLayer.receipts.list',
    access: ['read']
  }),
  resource({
    kind: 'topology',
    title: 'CREATE SOMETHING internal topology',
    recordId: topology.id,
    sourcePath: 'packages/database-layer/data/create-something-internal-topology.json',
    apiPath: '/api/substrate/topology/internal',
    mcpUri: 'substrate://topology/internal',
    agentCommand: 'databaseLayer.topology.get',
    access: ['read']
  }),
  resource({
    kind: 'atlas_session',
    title: 'CREATE SOMETHING internal Atlas session',
    recordId: topology.atlasCanvasId,
    sourcePath: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    apiPath: '/api/substrate/atlas-sessions/create-something-internal-operating-topology',
    mcpUri: 'substrate://atlas-sessions/create-something-internal-operating-topology',
    agentCommand: 'databaseLayer.atlasSessions.get',
    access: ['read']
  }),
  resource({
    kind: 'canvas_state',
    title: 'CREATE SOMETHING shared canvas state',
    recordId: `${topology.atlasCanvasId}:canvas-state`,
    sourcePath: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    apiPath: '/api/substrate/atlas-sessions/create-something-internal-operating-topology/canvas-state',
    mcpUri: 'substrate://canvas-state',
    agentCommand: 'databaseLayer.canvas.state',
    access: ['read']
  }),
  resource({
    kind: 'compute_snapshot',
    title: 'CREATE SOMETHING Substrate compute snapshot',
    recordId: `${topology.atlasCanvasId}:compute-snapshot`,
    sourcePath: 'packages/database-layer/data/create-something-internal-topology.json',
    apiPath: '/api/substrate/atlas-sessions/create-something-internal-operating-topology/compute-snapshot',
    mcpUri: 'substrate://compute-snapshot',
    agentCommand: 'databaseLayer.compute.snapshot',
    access: ['read']
  }),
  resource({
    kind: 'atlas_viewport',
    title: 'CREATE SOMETHING internal Atlas viewport',
    recordId: `${topology.atlasCanvasId}:viewport`,
    sourcePath: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    apiPath: '/api/substrate/atlas-sessions/create-something-internal-operating-topology/viewport',
    mcpUri: 'substrate://atlas-sessions/create-something-internal-operating-topology/viewport',
    agentCommand: 'databaseLayer.atlasSessions.viewport',
    access: ['read']
  }),
  resource({
    kind: 'coverage',
    title: 'Cloudflare runtime binding coverage',
    sourcePath: 'packages/database-layer/data/create-something-runtime-binding-coverage.json',
    apiPath: '/api/substrate/coverage/runtime-bindings/cloudflare',
    mcpUri: 'substrate://coverage/runtime-bindings/cloudflare',
    agentCommand: 'databaseLayer.coverage.runtimeBindings',
    access: ['read']
  }),
  resource({
    kind: 'client_overlay',
    title: 'CREATE SOMETHING client overlays',
    recordId: clientOverlayCoverage.id,
    sourcePath: 'packages/database-layer/data/create-something-client-overlay-coverage.json',
    apiPath: '/api/substrate/client-overlays',
    mcpUri: 'substrate://client-overlays',
    agentCommand: 'databaseLayer.clientOverlays.list',
    access: ['read']
  }),
  resource({
    kind: 'diagnostics',
    title: 'CREATE SOMETHING topology diagnostics',
    recordId: topology.id,
    sourcePath: 'packages/database-layer/data/create-something-topology-diagnostics.json',
    apiPath: '/api/substrate/topology/internal/diagnostics',
    mcpUri: 'substrate://topology/internal/diagnostics',
    agentCommand: 'databaseLayer.topology.diagnostics',
    access: ['read']
  }),
  resource({
    kind: 'performance',
    title: 'Substrate performance contract',
    recordId: topology.id,
    sourcePath: 'packages/database-layer/data/create-something-performance-contract.json',
    apiPath: '/api/substrate/performance',
    mcpUri: 'substrate://performance',
    agentCommand: 'databaseLayer.performance.get',
    access: ['read']
  }),
  resource({
    kind: 'organization_review',
    title: 'CREATE SOMETHING organization review',
    recordId: organizationReview.id,
    sourcePath: 'packages/database-layer/data/create-something-organization-review.json',
    apiPath: '/api/substrate/organization-review',
    mcpUri: 'substrate://organization-review',
    agentCommand: 'databaseLayer.organization.review',
    access: ['read']
  }),
  resource({
    kind: 'business_recommendations',
    title: 'CREATE SOMETHING business operating recommendations',
    recordId: businessRecommendations.id,
    sourcePath: 'packages/database-layer/data/create-something-business-operating-recommendations.json',
    apiPath: '/api/substrate/business/recommendations',
    mcpUri: 'substrate://business/recommendations',
    agentCommand: 'databaseLayer.business.recommendations.get',
    access: ['read']
  }),
  ...topology.nodes.map(topologyRecordResource),
  ...clientOverlayCoverage.overlays.map(clientOverlayResource),
  ...operatingSliceReview.slices.flatMap((slice) => sliceResources(slice, readinessBySliceId.get(slice.id)))
];

const operations = [
  operation({
    id: 'database_layer_get_capabilities',
    title: 'Get Substrate API capabilities index',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/capabilities',
    mcpTool: 'database_layer_get_capabilities',
    agentCommand: 'databaseLayer.capabilities.get',
    inputSchema: {},
    outputRef: 'derived from packages/database-layer/data/create-something-management-surface.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_health',
    title: 'Get Substrate health and readiness',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/health',
    mcpTool: 'database_layer_get_health',
    agentCommand: 'databaseLayer.health.get',
    inputSchema: {},
    outputRef: 'derived from packages/database-layer/data/create-something-management-surface.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_openapi',
    title: 'Get Substrate OpenAPI contract',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/openapi.json',
    mcpTool: 'database_layer_get_openapi',
    agentCommand: 'databaseLayer.openapi.get',
    inputSchema: {},
    outputRef: 'derived from packages/database-layer/data/create-something-management-surface.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_contract_audit',
    title: 'Get Substrate contract audit',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/contract/audit',
    mcpTool: 'database_layer_get_contract_audit',
    agentCommand: 'databaseLayer.contract.audit',
    inputSchema: {},
    outputRef: 'derived from packages/database-layer/data/create-something-management-surface.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_query_records',
    title: 'Query Substrate topology records',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/query',
    mcpTool: 'database_layer_query_records',
    agentCommand: 'databaseLayer.query.records',
    inputSchema: {
      q: 'Optional text query matched against id, title, path, summary, owner, runtime, client slug, package name, and tags.',
      surface: 'Optional topology surface filter such as worker, package, mcp, agent, policy, guide, or doc.',
      tier: 'Optional topology tier filter: Database, Automation, Judgment, or Mixed.',
      status: 'Optional topology status filter: mapped, needs_atlas, or needs_substrate.',
      limit: 'Maximum records to return, from 1 to 100. Defaults to 25.'
    },
    outputRef: 'packages/database-layer/data/create-something-internal-topology.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_workbench',
    title: 'Get Substrate topology workbench snapshot',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/workbench',
    mcpTool: 'database_layer_get_workbench',
    agentCommand: 'databaseLayer.workbench.get',
    inputSchema: {
      q: 'Optional text query matched against id, title, path, summary, owner, runtime, client slug, package name, and tags.',
      surface: 'Optional topology surface filter such as worker, package, mcp, agent, policy, guide, or doc.',
      tier: 'Optional topology tier filter: Database, Automation, Judgment, or Mixed.',
      status: 'Optional topology status filter: mapped, needs_atlas, or needs_substrate.',
      limit: 'Maximum records to return, from 1 to 100. Defaults to 25.',
      recordId: 'Optional selected topology record id, Atlas node id, or stable slug for the context panel.'
    },
    outputRef: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_workflow_queue',
    title: 'Get Substrate workflow queue',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/workflow/queue',
    mcpTool: 'database_layer_get_workflow_queue',
    agentCommand: 'databaseLayer.workflow.queue',
    inputSchema: {
      state: 'Optional workflow action state filter: run, wait, stop, or complete.',
      source: 'Optional workflow source filter such as operating_slice, client_overlay, runtime_binding, agent_config, or topology_gap.',
      limit: 'Maximum actions to return, from 1 to 250. Defaults to 25.'
    },
    outputRef: 'derived workflow actions and receipts from generated Substrate coverage artifacts',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_list_receipts',
    title: 'List Substrate receipts',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/receipts',
    mcpTool: 'database_layer_list_receipts',
    agentCommand: 'databaseLayer.receipts.list',
    inputSchema: {
      recordId: 'Optional topology record id, Atlas node id, or stable slug.',
      type: 'Optional receipt type filter such as proof, decision, transfer, or handoff.',
      source: 'Optional receipt source filter such as atlas, client_overlay, runtime_binding, or agent_config.',
      limit: 'Maximum receipts to return, from 1 to 250. Defaults to 25.'
    },
    outputRef: 'derived receipt ledger from generated Substrate coverage artifacts',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_performance_contract',
    title: 'Get Substrate performance contract',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/performance',
    mcpTool: 'database_layer_get_performance_contract',
    agentCommand: 'databaseLayer.performance.get',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-performance-contract.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_organization_review',
    title: 'Get CREATE SOMETHING organization review',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/organization-review',
    mcpTool: 'database_layer_get_organization_review',
    agentCommand: 'databaseLayer.organization.review',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-organization-review.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_business_recommendations',
    title: 'Get CREATE SOMETHING business operating recommendations',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/business/recommendations',
    mcpTool: 'database_layer_get_business_recommendations',
    agentCommand: 'databaseLayer.business.recommendations.get',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-business-operating-recommendations.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_topology',
    title: 'Get internal topology',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/topology/internal',
    mcpTool: 'database_layer_get_topology',
    agentCommand: 'databaseLayer.topology.get',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-internal-topology.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_atlas_session',
    title: 'Get Atlas session',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/atlas-sessions/{sessionId}',
    mcpTool: 'database_layer_get_atlas_session',
    agentCommand: 'databaseLayer.atlasSessions.get',
    inputSchema: { sessionId: 'Atlas session id. Defaults to the internal operating topology session.' },
    outputRef: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_canvas_state',
    title: 'Get shared Substrate canvas state',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/atlas-sessions/{sessionId}/canvas-state',
    mcpTool: 'database_layer_get_canvas_state',
    agentCommand: 'databaseLayer.canvas.state',
    inputSchema: {
      sessionId: 'Atlas session id. Defaults to the internal operating topology session.',
      x: 'Viewport left coordinate in shared canvas units. Defaults to the minimum node x.',
      y: 'Viewport top coordinate in shared canvas units. Defaults to the minimum node y.',
      width: 'Viewport width in shared canvas units. Defaults to 4800.',
      height: 'Viewport height in shared canvas units. Defaults to 3600.',
      zoom: 'Current viewport zoom. Used to choose detail, compact, or skeleton rendering metadata.',
      limit: 'Maximum visible nodes to return, from 1 to 500. Defaults to 250.',
      lens: 'Optional operator lens name. Defaults to all.',
      query: 'Optional text query associated with this canvas read.',
      selectedNodeId: 'Optional selected Atlas node id.'
    },
    outputRef: 'flow.shared-canvas-state.v1 derived from packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_compute_snapshot',
    title: 'Get Substrate compute snapshot',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/atlas-sessions/{sessionId}/compute-snapshot',
    mcpTool: 'database_layer_get_compute_snapshot',
    agentCommand: 'databaseLayer.compute.snapshot',
    inputSchema: {
      sessionId: 'Atlas session id. Defaults to the internal operating topology session.',
      sourceNodeId: 'Optional topology record id to use as the read-only scenario source. Defaults to the root topology node.',
      maxDepth: 'Maximum propagation depth, from 1 to 8. Defaults to 3.',
      limit: 'Maximum impact, attention, bottleneck, and work queue items to return, from 1 to 100. Defaults to 24.',
      scenario: 'Optional scenario label for this read-only compute preview.'
    },
    outputRef: 'flow.substrate-compute-snapshot.v1 derived from packages/database-layer/data/create-something-internal-topology.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_atlas_viewport',
    title: 'Get bounded Atlas viewport',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/atlas-sessions/{sessionId}/viewport',
    mcpTool: 'database_layer_get_atlas_viewport',
    agentCommand: 'databaseLayer.atlasSessions.viewport',
    inputSchema: {
      sessionId: 'Atlas session id. Defaults to the internal operating topology session.',
      x: 'Viewport left coordinate in Atlas canvas units. Defaults to the minimum node x.',
      y: 'Viewport top coordinate in Atlas canvas units. Defaults to the minimum node y.',
      width: 'Viewport width in Atlas canvas units. Defaults to 1200.',
      height: 'Viewport height in Atlas canvas units. Defaults to 800.',
      zoom: 'Current viewport zoom. Used to choose detail, compact, or skeleton rendering metadata.',
      limit: 'Maximum visible nodes to return, from 1 to 250. Defaults to 100.'
    },
    outputRef: 'bounded viewport derived from packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_runtime_binding_coverage',
    title: 'Get Cloudflare runtime binding coverage',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/coverage/runtime-bindings/cloudflare',
    mcpTool: 'database_layer_get_runtime_binding_coverage',
    agentCommand: 'databaseLayer.coverage.runtimeBindings',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-runtime-binding-coverage.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_topology_diagnostics',
    title: 'Get topology diagnostics',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/topology/internal/diagnostics',
    mcpTool: 'database_layer_get_topology_diagnostics',
    agentCommand: 'databaseLayer.topology.diagnostics',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-topology-diagnostics.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_list_topology_records',
    title: 'List topology records',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/topology/internal/records',
    mcpTool: 'database_layer_list_topology_records',
    agentCommand: 'databaseLayer.topology.records.list',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-internal-topology.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_topology_record',
    title: 'Get topology record',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/topology/internal/records/{recordId}',
    mcpTool: 'database_layer_get_topology_record',
    agentCommand: 'databaseLayer.topology.records.get',
    inputSchema: { recordId: 'Topology record id, Atlas node id, or stable slug.' },
    outputRef: 'packages/database-layer/data/create-something-internal-topology.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_topology_record_context',
    title: 'Get compact topology record context',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/topology/internal/records/{recordId}/context',
    mcpTool: 'database_layer_get_topology_record_context',
    agentCommand: 'databaseLayer.topology.records.context',
    inputSchema: { recordId: 'Topology record id, Atlas node id, or stable slug.' },
    outputRef: 'packages/database-layer/data/create-something-internal-operating-topology.atlas-session.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_list_client_overlays',
    title: 'List client overlays',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/client-overlays',
    mcpTool: 'database_layer_list_client_overlays',
    agentCommand: 'databaseLayer.clientOverlays.list',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-client-overlay-coverage.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_client_overlay',
    title: 'Get client overlay',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/client-overlays/{clientSlug}',
    mcpTool: 'database_layer_get_client_overlay',
    agentCommand: 'databaseLayer.clientOverlays.get',
    inputSchema: { clientSlug: 'Client slug or stable overlay id.' },
    outputRef: 'packages/database-layer/data/create-something-client-overlay-coverage.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_list_operating_slices',
    title: 'List operating slices',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/operating-slices',
    mcpTool: 'database_layer_list_operating_slices',
    agentCommand: 'databaseLayer.operatingSlices.list',
    inputSchema: {},
    outputRef: 'packages/database-layer/data/create-something-operating-slice-review.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_operating_slice',
    title: 'Get operating slice',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/operating-slices/{sliceId}',
    mcpTool: 'database_layer_get_operating_slice',
    agentCommand: 'databaseLayer.operatingSlices.get',
    inputSchema: { sliceId: 'Operating slice id or slug.' },
    outputRef: 'packages/database-layer/data/create-something-operating-slice-review.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_get_operating_slice_readiness',
    title: 'Get operating slice readiness',
    mode: 'read',
    apiMethod: 'GET',
    apiPath: '/api/substrate/operating-slices/{sliceId}/readiness',
    mcpTool: 'database_layer_get_operating_slice_readiness',
    agentCommand: 'databaseLayer.operatingSlices.readiness',
    inputSchema: { sliceId: 'Operating slice id or slug.' },
    outputRef: 'packages/database-layer/data/create-something-operating-slice-readiness.json',
    requiresApproval: false
  }),
  operation({
    id: 'database_layer_propose_operating_slice_promotion',
    title: 'Propose operating slice promotion',
    mode: 'propose',
    apiMethod: 'POST',
    apiPath: '/api/substrate/operating-slices/{sliceId}/promotion-proposals',
    mcpTool: 'database_layer_propose_operating_slice_promotion',
    agentCommand: 'databaseLayer.operatingSlices.proposePromotion',
    inputSchema: {
      sliceId: 'Operating slice id or slug.',
      evidence: 'Validation evidence and intended workflow boundary.',
      rollback: 'Rollback note for the owning workflow.'
    },
    outputRef: 'local proposal record and receipt',
    requiresApproval: true
  }),
  operation({
    id: 'database_layer_record_operator_approval',
    title: 'Record operator approval',
    mode: 'approve',
    apiMethod: 'POST',
    apiPath: '/api/substrate/operating-slices/{sliceId}/approvals',
    mcpTool: 'database_layer_record_operator_approval',
    agentCommand: 'databaseLayer.operatingSlices.recordApproval',
    inputSchema: {
      sliceId: 'Operating slice id or slug.',
      approver: 'Operator identity.',
      decision: 'approved, rejected, or needs_changes.',
      evidence: 'Human-readable approval evidence.'
    },
    outputRef: 'local approval record and receipt',
    requiresApproval: true
  }),
  operation({
    id: 'database_layer_write_receipt',
    title: 'Write operating receipt',
    mode: 'receipt',
    apiMethod: 'POST',
    apiPath: '/api/substrate/receipts',
    mcpTool: 'database_layer_write_receipt',
    agentCommand: 'databaseLayer.receipts.write',
    inputSchema: {
      recordId: 'Substrate record id.',
      summary: 'Receipt summary.',
      evidence: 'Evidence path, command, URL, or operator note.'
    },
    outputRef: 'local receipt record',
    requiresApproval: true
  })
];

const managementSurface = {
  id: 'substrate:create-something:management-surface:internal',
  generatedAt,
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  sourceReadinessId: operatingSliceReadiness.id,
  posture: 'agent_native',
  resources,
  operations
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(managementSurface, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      managementSurfaceId: managementSurface.id,
      outputPath: relative(outputPath),
      resources: managementSurface.resources.length,
      operations: managementSurface.operations.length,
      topologyRecordResources: managementSurface.resources.filter((item) => item.kind === 'topology_record').length,
      diagnosticsValueState: topologyDiagnostics.summary.valueState,
      organizationValueState: organizationReview.valueState,
      clientOverlayResources: managementSurface.resources.filter((item) => item.kind === 'client_overlay').length,
      sliceResources: managementSurface.resources.filter((item) => item.kind === 'slice').length,
      readinessResources: managementSurface.resources.filter((item) => item.kind === 'readiness').length,
      writeOperationsApprovalGated: managementSurface.operations
        .filter((item) => item.apiMethod === 'POST')
        .every((item) => item.requiresApproval)
    },
    null,
    2
  )
);
