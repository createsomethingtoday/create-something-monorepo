import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const paths = {
  topology: path.join(packageRoot, 'data', 'create-something-internal-topology.json'),
  organizationReview: path.join(packageRoot, 'data', 'create-something-organization-review.json'),
  managementSurface: path.join(packageRoot, 'data', 'create-something-management-surface.json'),
  operatingSliceReadiness: path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json'),
  clientOverlayCoverage: path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json'),
  runtimeBindingCoverage: path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json')
};
const outputPath = path.join(packageRoot, 'data', 'create-something-business-operating-recommendations.json');
const generatedAt = new Date().toISOString();

function findRepoRoot(start) {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  throw new Error(`Could not find repo root from ${start}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickMove(review, id) {
  const move = review.recommendedMoves.find((candidate) => candidate.id === id);
  if (!move) throw new Error(`Missing organization-review recommended move: ${id}`);
  return move;
}

function countBindings(records) {
  return records.reduce((total, record) => total + (record.bindings?.length ?? 0), 0);
}

function countRoutes(records) {
  return records.reduce((total, record) => total + (record.routes?.length ?? 0), 0);
}

function countBindingKinds(records) {
  const counts = {};
  for (const record of records) {
    for (const binding of record.bindings ?? []) {
      counts[binding.kind] = (counts[binding.kind] ?? 0) + 1;
    }
    if ((record.routes ?? []).length > 0) {
      counts.route = (counts.route ?? 0) + record.routes.length;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function topResources(management, kinds) {
  return management.resources
    .filter((resource) => kinds.includes(resource.kind))
    .slice(0, 12)
    .map((resource) => ({
      kind: resource.kind,
      title: resource.title,
      apiPath: resource.apiPath,
      mcpUri: resource.mcpUri,
      agentCommand: resource.agentCommand
    }));
}

function sliceSummary(item) {
  return {
    sliceId: item.sliceId,
    title: item.title,
    tier: item.tier,
    surface: item.surface,
    status: item.status,
    productionStatus: item.productionStatus,
    recordCount: item.recordCount,
    mappedRecordCount: item.mappedRecordCount,
    apiPath: `/api/substrate/operating-slices/${slug(item.sliceId)}`,
    readinessApiPath: `/api/substrate/operating-slices/${slug(item.sliceId)}/readiness`,
    validationCommands: item.validationCommands,
    nextAction: item.nextAction
  };
}

function clientDeliveryPacket(overlay) {
  const overlaySlug = slug(overlay.clientSlug);
  return {
    clientSlug: overlay.clientSlug,
    title: overlay.title,
    status: overlay.status,
    atlasCanvasId: overlay.atlasCanvasId,
    packageCount: overlay.packages.length,
    receiptCount: overlay.receipts.length,
    nextActionCount: overlay.nextActions.length,
    runtimeCount: overlay.packages.filter((pkg) => Boolean(pkg.runtime)).length,
    docCount: overlay.packages.reduce((total, pkg) => total + pkg.docs.length, 0),
    workerConfigCount: overlay.packages.reduce((total, pkg) => total + pkg.workerConfigs.length, 0),
    apiPath: `/api/substrate/client-overlays/${overlaySlug}`,
    mcpUri: `substrate://client-overlays/${overlaySlug}`,
    agentCommand: 'databaseLayer.clientOverlays.get',
    packages: overlay.packages.map((pkg) => ({
      packageName: pkg.packageName,
      path: pkg.path,
      tier: pkg.tier,
      runtime: pkg.runtime ?? 'none',
      commandCount: pkg.commands.length,
      docCount: pkg.docs.length,
      workerConfigCount: pkg.workerConfigs.length
    })),
    receiptIds: overlay.receipts.map((receipt) => receipt.id),
    actionIds: overlay.nextActions.map((action) => action.id),
    approvalBoundary:
      'Client overlay packets are read-only delivery context. Client communication, client system writes, and production promotion require explicit operator approval.'
  };
}

function policyGuideAttachments(readiness, topology) {
  const policyRecords = topology.nodes
    .filter((node) => node.surface === 'policy')
    .sort((a, b) => a.path.localeCompare(b.path));
  const guideRecords = topology.nodes
    .filter((node) => node.surface === 'guide')
    .sort((a, b) => a.path.localeCompare(b.path));
  const docRecords = topology.nodes
    .filter((node) => node.surface === 'doc')
    .sort((a, b) => a.path.localeCompare(b.path));
  const policyByTier = new Map();
  for (const tier of ['Database', 'Automation', 'Judgment', 'Mixed']) {
    const tierPolicies = policyRecords.filter((node) => node.tier === tier);
    policyByTier.set(tier, tierPolicies.length ? tierPolicies : policyRecords);
  }

  return readiness.items.map((item) => {
    const surfaceGuides = guideRecords.filter((node) => node.tier === item.tier || node.surface === item.surface);
    const selectedPolicies = (policyByTier.get(item.tier) ?? policyRecords).slice(0, 6);
    const selectedGuides = (surfaceGuides.length ? surfaceGuides : guideRecords).slice(0, 6);
    const selectedDocs = docRecords.slice(0, 4);

    return {
      sliceId: item.sliceId,
      title: item.title,
      tier: item.tier,
      surface: item.surface,
      productionStatus: item.productionStatus,
      policyRecordIds: selectedPolicies.map((node) => node.id),
      guideRecordIds: selectedGuides.map((node) => node.id),
      docRecordIds: selectedDocs.map((node) => node.id),
      policyPaths: selectedPolicies.map((node) => node.path),
      guidePaths: selectedGuides.map((node) => node.path),
      docPaths: selectedDocs.map((node) => node.path),
      approvalBoundary: item.promotionBoundary,
      receiptPath: `/api/substrate/operating-slices/${slug(item.sliceId)}/readiness`,
      attachmentStatus: selectedPolicies.length > 0 && selectedGuides.length > 0 ? 'attached' : 'review'
    };
  });
}

function lane({
  move,
  operatingLane,
  sourceArtifacts,
  resources,
  metrics,
  relatedSliceIds = [],
  deliveryPacketIds = [],
  policyAttachmentCount = 0,
  nextAction
}) {
  const laneId = `business:${move.id}`;
  return {
    id: laneId,
    sourceMoveId: move.id,
    title: move.title,
    tier: move.tier,
    status: 'operationalized',
    operatingLane,
    summary: move.summary,
    evidence: move.evidence,
    sourceArtifacts,
    resources,
    metrics,
    relatedSliceIds,
    deliveryPacketIds,
    policyAttachmentCount,
    apiPath: `/api/substrate/business/recommendations#${move.id}`,
    mcpUri: `substrate://business/recommendations/${slug(move.id)}`,
    agentCommand: 'databaseLayer.business.recommendations.get',
    receiptId: `receipt:${laneId}`,
    approvalBoundary:
      'This lane is an operating recommendation and read-only proof surface. External writes, client communication, deployment, and production promotion require explicit operator approval and the owning workflow.',
    nextAction,
    verification: [
      'pnpm --filter @create-something/database-layer business-recommendations:generate',
      'pnpm --filter @create-something/database-layer test',
      'pnpm substrate:agent-wiki:check'
    ]
  };
}

const topology = readJson(paths.topology);
const organizationReview = readJson(paths.organizationReview);
const management = readJson(paths.managementSurface);
const readiness = readJson(paths.operatingSliceReadiness);
const clientOverlayCoverage = readJson(paths.clientOverlayCoverage);
const runtimeBindingCoverage = readJson(paths.runtimeBindingCoverage);

const workerSlices = readiness.items.filter((item) => item.surface === 'worker');
const primaryWorkerSlice =
  readiness.items.find((item) => item.title === 'Automation worker Atlas coverage') ?? workerSlices[0];
const clientPackets = clientOverlayCoverage.overlays.map(clientDeliveryPacket);
const attachments = policyGuideAttachments(readiness, topology);
const runtimeRecords = runtimeBindingCoverage.records ?? [];
const businessRecommendations = {
  id: 'substrate:create-something:business-operating-recommendations:internal',
  generatedAt,
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  sourceOrganizationReviewId: organizationReview.id,
  sourceManagementSurfaceId: management.id,
  valueState: 'operationalized_recommendations',
  answer:
    'CREATE SOMETHING business recommendations are now represented as generated operating lanes with receipts, policy boundaries, and API/MCP/agent read paths.',
  summary: {
    recommendedMoves: organizationReview.recommendedMoves.length,
    operationalizedLanes: 4,
    topologyNodes: topology.nodes.length,
    topologyEdges: topology.edges.length,
    managementResources: management.resources.length,
    managementOperations: management.operations.length,
    operatingSlices: readiness.items.length,
    workerSlices: workerSlices.length,
    clientDeliveryPackets: clientPackets.length,
    policyGuideAttachments: attachments.length,
    approvalRequiredForExternalWrites: true
  },
  lanes: [
    lane({
      move: pickMove(organizationReview, 'promote_database_layer_as_product_surface'),
      operatingLane: 'substrate_product_surface',
      sourceArtifacts: [
        relative(paths.managementSurface),
        relative(paths.organizationReview),
        relative(paths.topology)
      ],
      resources: topResources(management, ['capabilities', 'health', 'openapi', 'contract_audit', 'topology', 'organization_review']),
      metrics: {
        databaseRecords: organizationReview.summary.databaseRecords,
        automationRecords: organizationReview.summary.automationRecords,
        resourceCount: management.resources.length,
        operationCount: management.operations.length,
        readOperations: management.operations.filter((operation) => operation.apiMethod === 'GET').length
      },
      nextAction: 'Use `/api/substrate/management`, `/api/substrate/capabilities`, and `/api/substrate/openapi.json` as the product entrypoints for agent-run CREATE SOMETHING operations.'
    }),
    lane({
      move: pickMove(organizationReview, 'review_worker_runtime_slice_first'),
      operatingLane: 'worker_runtime_review',
      sourceArtifacts: [
        relative(paths.operatingSliceReadiness),
        relative(paths.runtimeBindingCoverage)
      ],
      resources: primaryWorkerSlice ? [sliceSummary(primaryWorkerSlice)] : [],
      metrics: {
        workerSlices: workerSlices.length,
        primaryWorkerSliceRecords: primaryWorkerSlice?.recordCount ?? 0,
        runtimeConfigRecords: runtimeRecords.length,
        bindingRefs: countBindings(runtimeRecords),
        routeRefs: countRoutes(runtimeRecords),
        bindingKinds: countBindingKinds(runtimeRecords),
        secretValuesCaptured: false
      },
      relatedSliceIds: workerSlices.map((item) => item.sliceId),
      nextAction: 'Review worker slices through runtime binding coverage before any Cloudflare mutation or production execution claim.'
    }),
    lane({
      move: pickMove(organizationReview, 'turn_client_overlays_into_repeatable_delivery'),
      operatingLane: 'client_overlay_delivery',
      sourceArtifacts: [
        relative(paths.clientOverlayCoverage),
        relative(paths.managementSurface)
      ],
      resources: topResources(management, ['client_overlay']),
      metrics: {
        clientOverlays: clientOverlayCoverage.overlays.length,
        clientPackages: clientOverlayCoverage.overlays.reduce((total, overlay) => total + overlay.packages.length, 0),
        clientReceipts: clientOverlayCoverage.overlays.reduce((total, overlay) => total + overlay.receipts.length, 0),
        clientNextActions: clientOverlayCoverage.overlays.reduce((total, overlay) => total + overlay.nextActions.length, 0)
      },
      deliveryPacketIds: clientPackets.map((packet) => packet.clientSlug),
      nextAction: 'Use client delivery packets as the repeatable proof path for mapping and operating client businesses with Atlas/Substrate receipts.'
    }),
    lane({
      move: pickMove(organizationReview, 'attach_policy_to_slices'),
      operatingLane: 'policy_guide_attachment',
      sourceArtifacts: [
        relative(paths.operatingSliceReadiness),
        relative(paths.topology)
      ],
      resources: topResources(management, ['slice', 'readiness']),
      metrics: {
        operatingSlices: readiness.items.length,
        attachedSlices: attachments.filter((attachment) => attachment.attachmentStatus === 'attached').length,
        policyRecords: topology.nodes.filter((node) => node.surface === 'policy').length,
        guideRecords: topology.nodes.filter((node) => node.surface === 'guide').length,
        docRecords: topology.nodes.filter((node) => node.surface === 'doc').length
      },
      relatedSliceIds: readiness.items.map((item) => item.sliceId),
      policyAttachmentCount: attachments.length,
      nextAction: 'Treat missing policy/guide attachment as a review signal before promotion, and keep approval boundaries beside each operating slice.'
    })
  ],
  workerRuntimeReview: {
    primarySlice: primaryWorkerSlice ? sliceSummary(primaryWorkerSlice) : null,
    workerSlices: workerSlices.map(sliceSummary),
    runtime: {
      runtime: runtimeBindingCoverage.runtime,
      runtimeConfigRecords: runtimeRecords.length,
      bindingRefs: countBindings(runtimeRecords),
      routeRefs: countRoutes(runtimeRecords),
      bindingKinds: countBindingKinds(runtimeRecords),
      secretHandling:
        'Runtime recommendation uses binding names, route refs, and environment variable keys from repo config. It does not capture secret values.'
    }
  },
  clientDeliveryPackets: clientPackets,
  policyGuideAttachments: attachments,
  receipts: organizationReview.recommendedMoves.map((move) => ({
    id: `receipt:business:${move.id}`,
    recordId: `business:${move.id}`,
    type: 'proof',
    summary: `${move.title} is represented as a CREATE SOMETHING business operating lane.`,
    evidence: `${relative(outputPath)} generated from ${relative(paths.organizationReview)} at ${generatedAt}.`,
    createdAt: generatedAt
  })),
  approvalBoundary:
    'This artifact completes local business operating recommendations only. Production, third-party, client, Cloudflare, Dify, Slack, Airtable, Webflow, and external writes remain approval-gated.'
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(businessRecommendations, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      businessRecommendationsId: businessRecommendations.id,
      outputPath: relative(outputPath),
      lanes: businessRecommendations.lanes.length,
      clientDeliveryPackets: businessRecommendations.clientDeliveryPackets.length,
      policyGuideAttachments: businessRecommendations.policyGuideAttachments.length,
      workerRuntimeConfigRecords: businessRecommendations.workerRuntimeReview.runtime.runtimeConfigRecords
    },
    null,
    2
  )
);
