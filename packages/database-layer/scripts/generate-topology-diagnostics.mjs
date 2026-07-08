import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json');

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function signal({ id, classification, severity, title, summary, evidence = [], nodeIds = [], paths = [], nextAction }) {
  return {
    id,
    classification,
    severity,
    title,
    summary,
    evidence,
    nodeIds,
    paths,
    nextAction
  };
}

const surfaceCounts = countBy(topology.nodes, (node) => node.surface);
const tierCounts = countBy(topology.nodes, (node) => node.tier);
const pathGroups = new Map();
for (const node of topology.nodes) {
  const group = pathGroups.get(node.path) ?? [];
  group.push(node);
  pathGroups.set(node.path, group);
}

const exactDuplicatePaths = [...pathGroups.entries()].filter(([, nodes]) => nodes.length > 1);
const connectedIds = new Set();
for (const edge of topology.edges) {
  connectedIds.add(edge.source);
  connectedIds.add(edge.target);
}
const isolatedNodes = topology.nodes.filter((node) => !connectedIds.has(node.id));
const hardGapNodes = topology.nodes.filter((node) => node.status !== 'mapped');
const workerNodes = topology.nodes.filter((node) => node.surface === 'worker');
const automationCount = tierCounts.Automation ?? 0;
const databaseCount = tierCounts.Database ?? 0;
const signals = [];

signals.push(
  signal({
    id: 'exact_duplicate_paths',
    classification: exactDuplicatePaths.length > 0 ? 'hard_gap' : 'positive_signal',
    severity: exactDuplicatePaths.length > 0 ? 'high' : 'info',
    title: 'Exact duplicate paths',
    summary:
      exactDuplicatePaths.length > 0
        ? `${exactDuplicatePaths.length} exact duplicate path group(s) need record identity review.`
        : 'No exact duplicate paths are present in the topology.',
    evidence: exactDuplicatePaths.slice(0, 8).map(([pathValue, nodes]) => `${pathValue}: ${nodes.length} records`),
    nodeIds: exactDuplicatePaths.flatMap(([, nodes]) => nodes.map((node) => node.id)).slice(0, 24),
    paths: exactDuplicatePaths.map(([pathValue]) => pathValue).slice(0, 24),
    nextAction: exactDuplicatePaths.length > 0 ? 'Split or merge duplicate Substrate records.' : 'No action required.'
  })
);

signals.push(
  signal({
    id: 'isolated_nodes',
    classification: isolatedNodes.length > 0 ? 'hard_gap' : 'positive_signal',
    severity: isolatedNodes.length > 0 ? 'high' : 'info',
    title: 'Isolated topology records',
    summary:
      isolatedNodes.length > 0
        ? `${isolatedNodes.length} record(s) have no topology edge.`
        : 'No isolated nodes are present in the topology.',
    evidence: isolatedNodes.slice(0, 8).map((node) => `${node.title}: ${node.path}`),
    nodeIds: isolatedNodes.slice(0, 24).map((node) => node.id),
    paths: isolatedNodes.slice(0, 24).map((node) => node.path),
    nextAction: isolatedNodes.length > 0 ? 'Attach isolated records to an owning Substrate relation.' : 'No action required.'
  })
);

signals.push(
  signal({
    id: 'automation_database_balance',
    classification: 'review_signal',
    severity: 'review',
    title: 'Automation and Database balance',
    summary: `Automation has ${automationCount} record(s); Database has ${databaseCount} record(s). This is a business-shape review signal, not a hard gap.`,
    evidence: [`Automation=${automationCount}`, `Database=${databaseCount}`, `Total nodes=${topology.nodes.length}`],
    nodeIds: [],
    paths: [],
    nextAction: 'Use this as a lens for investment balance; do not treat it as a correctness failure.'
  })
);

signals.push(
  signal({
    id: 'surface_overlap_worker',
    classification: 'review_signal',
    severity: 'review',
    title: 'Worker surface concentration',
    summary: `${workerNodes.length} worker record(s) carry runtime delivery context. This is where Substrate receipts and Cloudflare proof matter most.`,
    evidence: workerNodes.slice(0, 8).map((node) => `worker: ${node.path}`),
    nodeIds: workerNodes.slice(0, 24).map((node) => node.id),
    paths: workerNodes.slice(0, 24).map((node) => node.path),
    nextAction: 'Review worker records through runtime binding coverage before promoting execution claims.'
  })
);

for (const [surface, count] of Object.entries(surfaceCounts).sort(([, a], [, b]) => b - a).slice(0, 4)) {
  signals.push(
    signal({
      id: `surface_review_${surface}`,
      classification: 'review_signal',
      severity: 'review',
      title: `${surface} surface review`,
      summary: `${count} record(s) are classified as ${surface}.`,
      evidence: topology.nodes
        .filter((node) => node.surface === surface)
        .slice(0, 5)
        .map((node) => `${node.title}: ${node.path}`),
      nodeIds: topology.nodes.filter((node) => node.surface === surface).slice(0, 12).map((node) => node.id),
      paths: topology.nodes.filter((node) => node.surface === surface).slice(0, 12).map((node) => node.path),
      nextAction: 'Use group explanation before drawing product or business conclusions from this surface.'
    })
  );
}

const hardGapCount = hardGapNodes.length + exactDuplicatePaths.length + isolatedNodes.length;
const reviewSignalCount = signals.filter((item) => item.classification === 'review_signal').length;

const diagnostics = {
  id: 'substrate:create-something:topology-diagnostics:internal',
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  generatedAt: topology.coverage.generatedAt,
  summary: {
    valueState:
      hardGapCount > 0
        ? 'hard_gaps_present'
        : reviewSignalCount > 0
          ? 'connected_map_with_review_signals'
          : 'connected_map',
    nodes: topology.nodes.length,
    edges: topology.edges.length,
    mapped: topology.nodes.filter((node) => node.status === 'mapped').length,
    hardGapCount,
    reviewSignalCount,
    exactDuplicatePathCount: exactDuplicatePaths.length,
    isolatedNodeCount: isolatedNodes.length,
    surfaceCounts,
    tierCounts
  },
  signals
};

fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(diagnostics, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      outputPath: path.relative(packageRoot, outputPath),
      valueState: diagnostics.summary.valueState,
      hardGapCount: diagnostics.summary.hardGapCount,
      reviewSignalCount
    },
    null,
    2
  )
);
