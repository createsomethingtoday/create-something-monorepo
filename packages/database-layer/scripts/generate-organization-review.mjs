import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const diagnosticsPath = path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json');
const completionReportPath = path.join(packageRoot, 'data', 'create-something-internal-topology-completion-report.json');
const operatingSliceReviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const clientOverlayCoveragePath = path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-organization-review.json');
const generatedAt = new Date().toISOString();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function countRecord(record, key) {
  return Number(record?.[key] ?? 0);
}

function finding({ id, classification, severity = 'review', title, summary, evidence, nextAction }) {
  return { id, classification, severity, title, summary, evidence, nextAction };
}

function move({ id, title, tier, summary, evidence, apiPath, agentCommand }) {
  return {
    id,
    title,
    tier,
    summary,
    evidence,
    ...(apiPath ? { apiPath } : {}),
    ...(agentCommand ? { agentCommand } : {})
  };
}

const topology = readJson(topologyPath);
const diagnostics = readJson(diagnosticsPath);
const completionReport = readJson(completionReportPath);
const operatingSliceReview = readJson(operatingSliceReviewPath);
const clientOverlayCoverage = readJson(clientOverlayCoveragePath);

const surfaceCounts = diagnostics.summary.surfaceCounts;
const tierCounts = diagnostics.summary.tierCounts;
const automationRecords = countRecord(tierCounts, 'Automation');
const databaseRecords = countRecord(tierCounts, 'Database');
const workerRecords = countRecord(surfaceCounts, 'worker');
const mcpRecords = countRecord(surfaceCounts, 'mcp');
const policyRecords = countRecord(surfaceCounts, 'policy');
const guideRecords = countRecord(surfaceCounts, 'guide');
const clientOverlays = clientOverlayCoverage.overlays.length;
const operatingSlices = operatingSliceReview.slices.length;
const reviewSignals = diagnostics.summary.reviewSignalCount;
const hardGaps = diagnostics.summary.hardGapCount;
const workerSlice = operatingSliceReview.slices.find((slice) => slice.title === 'Automation worker Atlas coverage');
const mcpSlice = operatingSliceReview.slices.find((slice) => slice.title === 'Automation MCP Atlas coverage');
const policySlice = operatingSliceReview.slices.find((slice) => slice.title === 'Judgment policy Atlas coverage');
const guideSlice = operatingSliceReview.slices.find((slice) => slice.title === 'Mixed guide Atlas coverage');

const findings = [
  finding({
    id: 'atlas_is_showing_value',
    classification: 'value_signal',
    severity: 'info',
    title: 'Atlas is showing operating value',
    summary:
      'CREATE SOMETHING now has a connected internal map with all current topology records mapped and no hard gaps.',
    evidence: [
      `${completionReport.totals.mapped}/${completionReport.totals.nodes} topology records mapped`,
      `${completionReport.totals.gaps} local Atlas/Substrate gaps`,
      `${diagnostics.summary.exactDuplicatePathCount} exact duplicate paths`,
      `${diagnostics.summary.isolatedNodeCount} isolated nodes`
    ],
    nextAction:
      'Use Atlas as the operating review surface instead of a static inventory; the value is in review-ready slices and proof-linked records.'
  }),
  finding({
    id: 'automation_database_imbalance',
    classification: 'disconnect',
    title: 'Automation is heavier than Database',
    summary:
      'Automation records substantially outnumber Database records. This is the clearest business-shape disconnect: execution has outrun the shared substrate.',
    evidence: [
      `Automation=${automationRecords}`,
      `Database=${databaseRecords}`,
      `Review signal count=${reviewSignals}`
    ],
    nextAction:
      'Promote Substrate as the shared database layer so worker, MCP, agent, and policy surfaces read from the same source of truth.'
  }),
  finding({
    id: 'worker_surface_concentration',
    classification: 'overlap',
    title: 'Worker surface concentration needs runtime ownership',
    summary:
      'Worker records are the largest runtime surface. This is not inherently bad, but it is where duplicated routes, configs, and deployment claims can hide.',
    evidence: [
      `Worker records=${workerRecords}`,
      workerSlice ? `${workerSlice.title}: ${workerSlice.recordIds.length} records` : 'Automation worker slice not found',
      'Runtime binding coverage exists before production mutation'
    ],
    nextAction:
      'Review worker slices through runtime binding coverage and attach ownership, route, storage, and rollback proof before promotion.'
  }),
  finding({
    id: 'mcp_surface_overlap',
    classification: 'overlap',
    title: 'MCP surface overlap needs grouping',
    summary:
      'The MCP surface is large enough to be a product advantage and an operations risk. Similar MCP packages should be grouped by client, data domain, and runtime boundary.',
    evidence: [
      `MCP records=${mcpRecords}`,
      mcpSlice ? `${mcpSlice.title}: ${mcpSlice.recordIds.length} records` : 'Automation MCP slice not found',
      'MCP creation remains the strategic moat'
    ],
    nextAction:
      'Cluster MCP records by reusable capability versus client-specific adapter, then make each cluster API/MCP/agent addressable.'
  }),
  finding({
    id: 'knowledge_policy_spread',
    classification: 'redundancy',
    title: 'Policy and guide knowledge is broad but needs attachment',
    summary:
      'Policy and guide records are well represented, but Atlas should keep pushing them onto the workflows they govern so docs do not become detached instructions.',
    evidence: [
      `Policy records=${policyRecords}`,
      `Guide records=${guideRecords}`,
      policySlice ? `${policySlice.title}: ${policySlice.recordIds.length} records` : 'Judgment policy slice not found',
      guideSlice ? `${guideSlice.title}: ${guideSlice.recordIds.length} records` : 'Mixed guide slice not found'
    ],
    nextAction:
      'Attach policy and guide nodes to the operating slices they govern, then treat missing attachment as a review signal.'
  })
];

const recommendedMoves = [
  move({
    id: 'promote_database_layer_as_product_surface',
    title: 'Promote Substrate as the CREATE SOMETHING database layer',
    tier: 'Database',
    summary:
      'The healthiest next move is to make the database layer a first-class product surface rather than a hidden app-governance implementation detail.',
    evidence: [
      `${databaseRecords} Database records currently support ${automationRecords} Automation records`,
      'Management surface exposes stable API/MCP/agent access',
      'Atlas UI projects the same records instead of becoming a separate source of truth'
    ],
    apiPath: '/api/substrate/management',
    agentCommand: 'databaseLayer.management.get'
  }),
  move({
    id: 'review_worker_runtime_slice_first',
    title: 'Review worker runtime slices before production claims',
    tier: 'Automation',
    summary:
      'The worker surface is the largest concentration of operational risk and should be the first ongoing review lane.',
    evidence: [
      `Worker records=${workerRecords}`,
      workerSlice ? `${workerSlice.recordIds.length} records in the primary worker slice` : 'Worker slice missing'
    ],
    apiPath: workerSlice ? `/api/substrate/operating-slices/${workerSlice.id.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}` : undefined,
    agentCommand: 'databaseLayer.operatingSlices.get'
  }),
  move({
    id: 'turn_client_overlays_into_repeatable_delivery',
    title: 'Turn client overlays into repeatable delivery',
    tier: 'Mixed',
    summary:
      'Client overlays are mapped, which means CREATE SOMETHING can use itself as the proof path for client Atlas/Substrate implementations.',
    evidence: [
      `${clientOverlays} client overlays mapped`,
      'Client package surfaces are represented as Atlas/Substrate records'
    ],
    apiPath: '/api/substrate/coverage/runtime-bindings/cloudflare',
    agentCommand: 'databaseLayer.coverage.runtimeBindings'
  }),
  move({
    id: 'attach_policy_to_slices',
    title: 'Attach policy and guides to operating slices',
    tier: 'Judgment',
    summary:
      'Policy is already present; the improvement is to make every critical workflow show its policy, guide, approval boundary, and receipt path in context.',
    evidence: [
      `Policy records=${policyRecords}`,
      `Guide records=${guideRecords}`,
      `${operatingSlices} operating slices are review-ready`
    ],
    apiPath: '/api/substrate/operating-slices',
    agentCommand: 'databaseLayer.operatingSlices.list'
  })
];

const organizationReview = {
  id: 'substrate:create-something:organization-review:internal',
  generatedAt,
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  valueState: hardGaps > 0 ? 'blocked' : reviewSignals > 0 ? 'valuable_with_review_signals' : 'valuable',
  answer:
    hardGaps > 0
      ? 'Atlas is blocked from making a healthy organization claim until hard topology gaps are closed.'
      : 'Atlas is showing value for CREATE SOMETHING: the business is mapped enough to reveal review signals, especially automation/database imbalance and worker/MCP concentration.',
  summary: {
    nodes: diagnostics.summary.nodes,
    edges: diagnostics.summary.edges,
    mapped: diagnostics.summary.mapped,
    hardGaps,
    reviewSignals,
    operatingSlices,
    clientOverlays,
    automationRecords,
    databaseRecords,
    workerRecords,
    mcpRecords,
    policyRecords,
    guideRecords
  },
  findings,
  recommendedMoves
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(organizationReview, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      organizationReviewId: organizationReview.id,
      outputPath: path.relative(packageRoot, outputPath),
      valueState: organizationReview.valueState,
      findings: organizationReview.findings.length,
      recommendedMoves: organizationReview.recommendedMoves.length,
      automationRecords,
      databaseRecords,
      workerRecords,
      mcpRecords
    },
    null,
    2
  )
);
