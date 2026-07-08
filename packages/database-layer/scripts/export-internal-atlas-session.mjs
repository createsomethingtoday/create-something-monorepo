import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const atlasCoveragePath = path.join(packageRoot, 'data', 'create-something-atlas-coverage.json');
const managementSurfacePath = path.join(packageRoot, 'data', 'create-something-management-surface.json');
const operatingSliceReviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const operatingSliceReadinessPath = path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json');
const topologyDiagnosticsPath = path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json');
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const distPath = path.join(packageRoot, 'dist', 'index.js');
const sessionId = 'create-something-internal-operating-topology';
const outputPath = path.join(packageRoot, 'data', `${sessionId}.atlas-session.json`);
const args = new Set(process.argv.slice(2));

if (!fs.existsSync(distPath)) {
  throw new Error('Build the package first: pnpm --filter @create-something/database-layer build');
}

function findRepoRoot(start) {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  throw new Error(`Could not find repo root from ${start}`);
}

function atlasHome() {
  return (
    process.env.CREATE_SOMETHING_ATLAS_HOME ??
    path.join(repoRoot, '.atlas-studio')
  );
}

function atlasAppDataHome() {
  return path.join(os.homedir(), 'Library', 'Application Support', 'CREATE SOMETHING', 'Atlas Studio');
}

function installSession(targetHome) {
  const sessionsDir = path.join(targetHome, 'sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  const installedPath = path.join(sessionsDir, `${session.id}.json`);
  fs.writeFileSync(`${installedPath}.tmp`, `${JSON.stringify(session, null, 2)}\n`);
  fs.renameSync(`${installedPath}.tmp`, installedPath);
  return installedPath;
}

function chunked(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function productAttachments(kind) {
  if (kind === 'actor') return [{ productId: 'atlas', mode: 'connects', surface: 'map', required: true, source: 'internal-topology' }];
  if (kind === 'data' || kind === 'system') return [{ productId: 'signal', mode: 'produces', surface: 'inbox', required: true, source: 'internal-topology' }];
  if (kind === 'ai' || kind === 'human' || kind === 'constraint') return [{ productId: 'decision', mode: 'produces', surface: 'queue', required: true, source: 'internal-topology' }];
  return [{ productId: 'proof', mode: 'records', surface: 'proof-graph', required: true, source: 'internal-topology' }];
}

function governanceRecordsForNode(sourceRecord, receipt) {
  return [
    {
      id: receipt.id,
      productId: receipt.type === 'proof' ? 'proof' : receipt.type === 'decision' ? 'decision' : 'signal',
      title: receipt.summary,
      summary: receipt.evidence,
      status: sourceRecord.status,
      source: 'Substrate topology projection',
      attachedAt: receipt.createdAt,
      attachedBy: 'system'
    }
  ];
}

function ownerName(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && typeof value.name === 'string' && value.name.trim()) {
    return value.name.trim();
  }
  return 'CREATE SOMETHING';
}

function readAtlasCoverage() {
  if (!fs.existsSync(atlasCoveragePath)) return undefined;
  return JSON.parse(fs.readFileSync(atlasCoveragePath, 'utf8'));
}

function readManagementSurface() {
  if (!fs.existsSync(managementSurfacePath)) return undefined;
  return JSON.parse(fs.readFileSync(managementSurfacePath, 'utf8'));
}

function readOperatingSliceReview() {
  if (!fs.existsSync(operatingSliceReviewPath)) return undefined;
  return JSON.parse(fs.readFileSync(operatingSliceReviewPath, 'utf8'));
}

function readOperatingSliceReadiness() {
  if (!fs.existsSync(operatingSliceReadinessPath)) return undefined;
  return JSON.parse(fs.readFileSync(operatingSliceReadinessPath, 'utf8'));
}

function readTopologyDiagnostics() {
  if (!fs.existsSync(topologyDiagnosticsPath)) return undefined;
  return JSON.parse(fs.readFileSync(topologyDiagnosticsPath, 'utf8'));
}

function diagnosticSignalById(topologyDiagnostics, id) {
  return topologyDiagnostics?.signals?.find((signal) => signal.id === id);
}

function topologyDiagnosticsCallouts(topologyDiagnostics, projection) {
  if (!topologyDiagnostics) return [];
  return topologyDiagnostics.signals
    .filter((signal) => signal.classification === 'review_signal')
    .slice(0, 5)
    .map((signal, index) => ({
      id: `diagnostic_callout_${index + 1}`,
      nodeId: projection.atlasCanvas.nodes.find((node) => signal.nodeIds?.includes(node.sourceRecordId))?.id,
      text: `${signal.title}: ${signal.summary}`,
      severity: signal.severity === 'high' ? 'risk' : signal.severity === 'review' ? 'decision' : 'info'
    }));
}

function atlasCoverageCallouts(atlasCoverage, projection) {
  if (!atlasCoverage) return [];
  const recordsByGroup = new Map();
  for (const record of atlasCoverage.records) {
    const current = recordsByGroup.get(record.groupId) ?? [];
    current.push(record);
    recordsByGroup.set(record.groupId, current);
  }

  return atlasCoverage.groups
    .slice()
    .sort((a, b) => b.nodeCount - a.nodeCount || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map((group, index) => {
      const firstRecord = recordsByGroup.get(group.id)?.[0];
      return {
        id: `coverage_group_callout_${index + 1}`,
        nodeId: projection.atlasCanvas.nodes.find((node) => node.sourceRecordId === firstRecord?.recordId)?.id,
        text: `${group.title}: ${group.nodeCount} mapped nodes`,
        severity: group.kind === 'judgment_surface' ? 'decision' : 'info'
      };
    });
}

function operatingSliceCallouts(operatingSliceReview, operatingSliceReadiness, projection) {
  if (!operatingSliceReview) return [];
  const readinessBySliceId = new Map((operatingSliceReadiness?.items ?? []).map((item) => [item.sliceId, item]));
  return operatingSliceReview.slices
    .slice()
    .sort((a, b) => b.nodeCount - a.nodeCount || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map((slice, index) => {
      const readiness = readinessBySliceId.get(slice.id);
      const productionStatus = readiness?.productionStatus?.replace(/_/g, ' ');
      return {
        id: `operating_slice_callout_${index + 1}`,
        nodeId: projection.atlasCanvas.nodes.find((node) => node.sourceRecordId === slice.recordIds[0])?.id,
        text: `Review slice: ${slice.title} (${slice.nodeCount} nodes${productionStatus ? `, ${productionStatus}` : ''})`,
        severity:
          readiness?.productionStatus === 'blocked'
            ? 'risk'
            : readiness?.productionStatus === 'approval_required' || slice.tier === 'Judgment'
            ? 'decision'
            : 'info'
      };
    });
}

function buildStorySteps(projection, topology, report, topologyDiagnostics) {
  const rootNode = projection.atlasCanvas.nodes.find((node) => node.sourceRecordId === topology.rootNodeId);
  const databaseNode = projection.atlasCanvas.nodes.find((node) => node.sourceRecordId.includes('database-layer'));
  const substrateNode = projection.atlasCanvas.nodes.find((node) => node.sourceRecordId.includes('substrate-mcp'));
  const clientNodes = projection.atlasCanvas.nodes
    .filter((node) => /packages\/agency\/clients/.test(node.notes ?? ''))
    .slice(0, 12);
  const priorityNodeIds = new Set(report.firstCompletionWave.map((item) => item.recordId));
  const gapNodes = projection.atlasCanvas.nodes
    .filter((node) => priorityNodeIds.has(node.sourceRecordId))
    .slice(0, 16);
  const automationDatabaseSignal = diagnosticSignalById(topologyDiagnostics, 'automation_database_balance');
  const diagnosticFocusNodeIds = Array.from(
    new Set((topologyDiagnostics?.signals ?? []).flatMap((signal) => signal.nodeIds ?? []))
  );
  const diagnosticNodes = projection.atlasCanvas.nodes
    .filter((node) => diagnosticFocusNodeIds.includes(node.sourceRecordId))
    .slice(0, 16);

  return [
    {
      id: 'topology-root',
      title: 'Root topology',
      summary: `${topology.coverage.packageCount} packages, ${topology.coverage.workerCount} worker configs, and ${topology.coverage.clientOverlayCount} client overlays are now represented as Substrate records.`,
      focusNodeIds: [rootNode?.id, databaseNode?.id, substrateNode?.id].filter(Boolean),
      owner: 'CREATE SOMETHING',
      proof: `${projection.sourceRecords.length} source records / ${projection.atlasCanvas.edges.length} edges`,
      status: 'current'
    },
    {
      id: 'client-overlays',
      title: 'Client overlays',
      summary: 'Managed client surfaces attach to the CREATE SOMETHING root instead of becoming disconnected Atlas maps.',
      focusNodeIds: clientNodes.map((node) => node.id),
      owner: 'CREATE SOMETHING',
      proof: `${topology.coverage.clientOverlayCount} managed client overlays discovered`,
      status: 'next'
    },
    {
      id: 'gap-actions',
      title: 'Atlas and Substrate gaps',
      summary: `Coverage gaps are workflow actions. First wave: ${report.firstCompletionWave.length} ranked actions across ${report.totals.gapCounts.needs_atlas} Atlas gaps and ${report.totals.gapCounts.needs_substrate} Substrate gaps.`,
      focusNodeIds: gapNodes.map((node) => node.id),
      owner: 'CREATE SOMETHING',
      proof: `${projection.gapActions.length} gap actions`,
      status: 'next'
    },
    {
      id: 'topology-diagnostics',
      title: 'Business health signals',
      summary: topologyDiagnostics
        ? `${automationDatabaseSignal?.summary ?? 'Topology diagnostics are mapped.'} ${topologyDiagnostics.summary.reviewSignalCount} review signals are attached for overlap, balance, and slice ownership review.`
        : 'Topology diagnostics were not available when this session was exported.',
      focusNodeIds: diagnosticNodes.map((node) => node.id),
      owner: 'CREATE SOMETHING',
      proof: topologyDiagnostics
        ? `${topologyDiagnostics.summary.hardGapCount} hard gaps / ${topologyDiagnostics.summary.reviewSignalCount} review signals`
        : 'diagnostics unavailable',
      status: 'next'
    }
  ];
}

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const { buildTopologyCompletionReport, projectInternalTopology } = await import(pathToFileURL(distPath).href);
const projection = projectInternalTopology(topology);
const completionReport = buildTopologyCompletionReport(topology);
const atlasCoverage = readAtlasCoverage();
const managementSurface = readManagementSurface();
const operatingSliceReview = readOperatingSliceReview();
const operatingSliceReadiness = readOperatingSliceReadiness();
const topologyDiagnostics = readTopologyDiagnostics();
const clientAtlasLane = completionReport.completionLanes.find((lane) => lane.id === 'client_atlas');
const substrateRuntimeLane = completionReport.completionLanes.find((lane) => lane.id === 'substrate_runtime');
const sourceRecordById = new Map(projection.sourceRecords.map((record) => [record.id, record]));
const receiptByRecordId = new Map(projection.receipts.map((receipt) => [receipt.recordId, receipt]));
const createdAt = topology.coverage.generatedAt;
const diagnosticCallouts = topologyDiagnosticsCallouts(topologyDiagnostics, projection);
const reviewCallouts =
  operatingSliceCallouts(operatingSliceReview, operatingSliceReadiness, projection).length > 0
    ? operatingSliceCallouts(operatingSliceReview, operatingSliceReadiness, projection)
    : atlasCoverageCallouts(atlasCoverage, projection);
const gapCallouts = chunked(completionReport.firstCompletionWave, 1).slice(0, 5).map(([item], index) => ({
  id: `gap_callout_${index + 1}`,
  nodeId: projection.atlasCanvas.nodes.find((node) => node.sourceRecordId === item.recordId)?.id,
  text: `#${item.rank} ${item.title}`,
  severity: item.gapKind === 'needs_substrate' ? 'risk' : 'decision'
}));

const session = {
  version: 1,
  id: sessionId,
  client: 'CREATE SOMETHING',
  workflow: 'Internal operating topology',
  owner: 'CREATE SOMETHING',
  createdAt,
  updatedAt: createdAt,
  canvas: {
    nodes: projection.atlasCanvas.nodes.map((node) => {
      const sourceRecord = sourceRecordById.get(node.sourceRecordId);
      const receipt = receiptByRecordId.get(node.sourceRecordId);
      return {
        id: node.id,
        kind: node.kind,
        label: node.label,
        atlasId: node.sourceRecordId,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        owner: ownerName(node.owner),
        status: node.status,
        notes: node.notes,
        evidence: sourceRecord?.summary,
        products: productAttachments(node.kind),
        governanceRecords: sourceRecord && receipt ? governanceRecordsForNode(sourceRecord, receipt) : [],
        bindings: [
          {
            id: `binding:${node.sourceRecordId}`,
            kind: node.kind === 'constraint' ? 'policy' : node.kind === 'system' ? 'script' : 'repo_path',
            label: sourceRecord?.title ?? node.label,
            source: sourceRecord?.sourceType ?? 'repo',
            selector: sourceRecord?.id,
            required: true
          }
        ],
        sync: {
          status: sourceRecord?.bindingHealth === 'bound' ? 'synced' : 'missing',
          checkedAt: createdAt,
          summary: sourceRecord?.bindingHealth === 'bound' ? 'Mapped in the root topology.' : 'Needs Atlas/Substrate completion review.',
          bindingCount: 1,
          issueCount: sourceRecord?.bindingHealth === 'bound' ? 0 : 1,
          checks: []
        },
        createdBy: 'system',
        updatedAt: node.updatedAt
      };
    }),
    edges: projection.atlasCanvas.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      evidence: edge.evidence,
      createdBy: 'system',
      updatedAt: edge.updatedAt
    }))
  },
  products: ['atlas', 'signal', 'decision', 'proof'],
  productLinks: [
    { source: 'atlas', target: 'signal', mode: 'connects', label: 'Atlas maps the topology records.', required: true },
    { source: 'signal', target: 'decision', mode: 'produces', label: 'Topology gaps become review decisions.', required: true },
    { source: 'decision', target: 'proof', mode: 'produces', label: 'Reviewed gaps produce receipts.', required: true },
    { source: 'proof', target: 'atlas', mode: 'records', label: 'Receipts record back onto the map.', required: true }
  ],
  observations: [
    {
      id: 'observation_internal_topology_seed',
      text: `Generated from repo topology: ${projection.sourceRecords.length} source records, ${projection.atlasCanvas.nodes.length} Atlas nodes, ${projection.atlasCanvas.edges.length} Atlas edges, ${projection.receipts.length} receipts, and ${projection.gapActions.length} gap actions.`,
      source: 'system',
      createdAt
    },
    ...(managementSurface
      ? [
          {
            id: 'observation_management_surface',
            text: `API/MCP/agent management surface is mapped: ${managementSurface.resources.length} resources, ${managementSurface.operations.length} operations, ${managementSurface.resources.filter((resource) => resource.kind === 'slice').length} operating-slice resources, and all write-shaped operations approval-gated.`,
            source: 'system',
            createdAt
          }
        ]
      : []),
    ...(topologyDiagnostics
      ? [
          {
            id: 'observation_topology_diagnostics',
            text: `Topology diagnostics: ${topologyDiagnostics.summary.valueState}, ${topologyDiagnostics.summary.hardGapCount} hard gaps, ${topologyDiagnostics.summary.reviewSignalCount} review signals, ${topologyDiagnostics.summary.exactDuplicatePathCount} exact duplicate paths, and ${topologyDiagnostics.summary.isolatedNodeCount} isolated nodes.`,
            source: 'system',
            createdAt
          }
        ]
      : [])
  ],
  story: {
    active: true,
    activeStepId: 'topology-root',
    title: 'CREATE SOMETHING internal operating topology',
    narration: 'The complete root topology is now inspectable as an Atlas Studio session backed by Substrate source records.',
    nextAction:
      completionReport.totals.gaps === 0
        ? 'All modeled topology coverage is mapped. Review readiness gates for each operating slice, then promote approved slices into production workflows.'
        : completionReport.totals.gapCounts.needs_substrate === 0
        ? 'Substrate coverage is mapped for clients, Cloudflare runtime, and Dify/MCP config. Continue with the ranked Atlas coverage wave.'
        : clientAtlasLane?.count === 0 && substrateRuntimeLane?.count === 0
        ? 'Client overlay and Cloudflare runtime coverage are mapped. Continue with the ranked MCP/agent config wave.'
        : clientAtlasLane?.count === 0
        ? 'Client overlay coverage is mapped. Continue with the ranked Substrate runtime binding wave.'
        : 'Start with the ranked completion wave: client overlays first, then Substrate runtime bindings.',
    focusNodeIds: [],
    focusEdgeIds: [],
    dimUnfocused: false,
    callouts: [
      ...diagnosticCallouts,
      ...(completionReport.totals.gaps === 0 ? reviewCallouts : gapCallouts)
    ].slice(0, 8),
    questions: [
      {
        id: 'question_gap_priority',
        question:
          completionReport.totals.gaps === 0
            ? 'Which mapped operating slice should be reviewed for production workflow use first?'
            : completionReport.totals.gapCounts.needs_substrate === 0
            ? 'Which Atlas coverage lane should be mapped next?'
            : clientAtlasLane?.count === 0 && substrateRuntimeLane?.count === 0
            ? 'Which MCP or agent config should receive Substrate completion first?'
            : clientAtlasLane?.count === 0
            ? 'Which Cloudflare runtime binding should receive Substrate review first?'
            : 'Which client overlay should receive Atlas/Substrate completion first?',
        owner: 'CREATE SOMETHING',
        status: 'open'
      }
    ],
    steps: buildStorySteps(projection, topology, completionReport, topologyDiagnostics),
    updatedAt: createdAt,
    updatedBy: 'system'
  },
  proposals: [],
  suggestions: []
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(session, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

const installedPaths = [];
if (args.has('--install')) {
  installedPaths.push(installSession(atlasHome()));
}

if (args.has('--install-app-data')) {
  const installedPath = installSession(atlasAppDataHome());
  if (!installedPaths.includes(installedPath)) installedPaths.push(installedPath);
}

console.log(
  JSON.stringify(
    {
      sessionId: session.id,
      outputPath: path.relative(repoRoot, outputPath),
      installedPath: installedPaths[0] ? path.relative(repoRoot, installedPaths[0]) : undefined,
      installedPaths: installedPaths.map((installedPath) => path.relative(repoRoot, installedPath)),
      nodes: session.canvas.nodes.length,
      edges: session.canvas.edges.length,
      storySteps: session.story.steps.length,
      callouts: session.story.callouts.length
    },
    null,
    2
  )
);
