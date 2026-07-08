import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const topologyDiagnosticsPath = path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json');
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

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const topologyDiagnostics = JSON.parse(fs.readFileSync(topologyDiagnosticsPath, 'utf8'));
const operatingSliceReview = JSON.parse(fs.readFileSync(operatingSliceReviewPath, 'utf8'));
const operatingSliceReadiness = JSON.parse(fs.readFileSync(operatingSliceReadinessPath, 'utf8'));
const readinessBySliceId = new Map(operatingSliceReadiness.items.map((item) => [item.sliceId, item]));

const resources = [
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
    kind: 'coverage',
    title: 'Cloudflare runtime binding coverage',
    sourcePath: 'packages/database-layer/data/create-something-runtime-binding-coverage.json',
    apiPath: '/api/substrate/coverage/runtime-bindings/cloudflare',
    mcpUri: 'substrate://coverage/runtime-bindings/cloudflare',
    agentCommand: 'databaseLayer.coverage.runtimeBindings',
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
  ...topology.nodes.map(topologyRecordResource),
  ...operatingSliceReview.slices.flatMap((slice) => sliceResources(slice, readinessBySliceId.get(slice.id)))
];

const operations = [
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
