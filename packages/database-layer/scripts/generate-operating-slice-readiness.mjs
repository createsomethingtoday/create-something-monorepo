import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const operatingSliceReviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const runtimeBindingCoveragePath = path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json');
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

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function gate(id, status, summary, evidence) {
  return { id, status, summary, evidence };
}

function isWorkerPackageNode(node) {
  return node?.id?.includes(':package:') && /cloudflare/.test(node.runtime ?? '');
}

function isWranglerNode(node) {
  return /\/wrangler\.(toml|json|jsonc)$/.test(node?.path ?? '');
}

function buildWorkerRuntimeReadiness(slice, topologyNodesById, runtimeRecordsById) {
  const records = slice.recordIds.map((recordId) => runtimeRecordsById.get(recordId)).filter(Boolean);
  const topologyNodes = slice.recordIds.map((recordId) => topologyNodesById.get(recordId)).filter(Boolean);
  const bindings = records.flatMap((record) => record.bindings ?? []);

  return {
    runtime: 'cloudflare',
    runtimeConfigRecords: records.length,
    workerPackageRecords: topologyNodes.filter(isWorkerPackageNode).length,
    bindingRefs: bindings.length,
    routeRefs: records.reduce((count, record) => count + (record.routes?.length ?? 0), 0),
    bindingKinds: Object.fromEntries(
      Object.entries(countBy(bindings, (binding) => binding.kind)).sort(([a], [b]) => a.localeCompare(b))
    ),
    workersWithD1: records.filter((record) => record.bindings?.some((binding) => binding.kind === 'd1')).length,
    workersWithDurableObjects: records.filter((record) =>
      record.bindings?.some((binding) => binding.kind === 'durable_object')
    ).length,
    workersWithQueues: records.filter((record) => record.bindings?.some((binding) => binding.kind === 'queue')).length,
    workersWithR2: records.filter((record) => record.bindings?.some((binding) => binding.kind === 'r2')).length,
    secretHandling:
      'Readiness uses binding names, route refs, and environment variable keys from repo config. It does not capture secret values.'
  };
}

function buildReadinessItem(slice, topologyNodesById, runtimeRecordsById) {
  const topologyNodes = slice.recordIds.map((recordId) => topologyNodesById.get(recordId));
  const missingRecordIds = slice.recordIds.filter((recordId, index) => !topologyNodes[index]);
  const presentNodes = topologyNodes.filter(Boolean);
  const mappedRecordCount = presentNodes.filter((node) => node.status === 'mapped').length;
  const wranglerNodes = presentNodes.filter(isWranglerNode);
  const runtimeCoveredWranglerNodes = wranglerNodes.filter((node) => runtimeRecordsById.has(node.id));
  const workerRuntime = slice.surface === 'worker'
    ? buildWorkerRuntimeReadiness(slice, topologyNodesById, runtimeRecordsById)
    : undefined;

  const gates = [
    gate(
      'topology_records_exist',
      missingRecordIds.length === 0 ? 'pass' : 'fail',
      `${presentNodes.length}/${slice.recordIds.length} slice records exist in the internal topology.`,
      'packages/database-layer/data/create-something-internal-topology.json'
    ),
    gate(
      'topology_records_mapped',
      mappedRecordCount === slice.recordIds.length ? 'pass' : 'review',
      `${mappedRecordCount}/${slice.recordIds.length} slice records are mapped.`,
      'packages/database-layer/data/create-something-internal-topology.json'
    ),
    gate(
      'validation_commands_declared',
      slice.validationCommands.length > 0 ? 'pass' : 'fail',
      `${slice.validationCommands.length} validation command(s) are attached to the slice.`,
      'packages/database-layer/data/create-something-operating-slice-review.json'
    ),
    gate(
      'evidence_paths_declared',
      slice.evidence.length > 0 ? 'pass' : 'review',
      `${slice.evidence.length} evidence path(s) are attached to the slice.`,
      'packages/database-layer/data/create-something-operating-slice-review.json'
    ),
    gate(
      'approval_boundary_declared',
      /explicit operator approval/.test(slice.promotionBoundary) ? 'pass' : 'fail',
      'Production mutation remains approval-gated.',
      'packages/database-layer/data/create-something-operating-slice-review.json'
    )
  ];

  if (slice.surface === 'worker') {
    gates.push(
      gate(
        'cloudflare_runtime_configs_joined',
        wranglerNodes.length === runtimeCoveredWranglerNodes.length ? 'pass' : 'review',
        `${runtimeCoveredWranglerNodes.length}/${wranglerNodes.length} Wrangler config node(s) join to runtime binding coverage.`,
        'packages/database-layer/data/create-something-runtime-binding-coverage.json'
      ),
      gate(
        'secret_values_not_captured',
        'pass',
        'Runtime readiness records binding names, routes, and variable keys only.',
        'packages/database-layer/scripts/generate-runtime-binding-coverage.mjs'
      )
    );
  }

  const hasFailure = gates.some((item) => item.status === 'fail');

  return {
    sliceId: slice.id,
    title: slice.title,
    status: slice.status,
    productionStatus: hasFailure ? 'blocked' : 'approval_required',
    tier: slice.tier,
    surface: slice.surface,
    owner: slice.owner,
    recordCount: slice.recordIds.length,
    mappedRecordCount,
    missingRecordIds,
    gates,
    validationCommands: slice.validationCommands,
    promotionBoundary: slice.promotionBoundary,
    rollbackNote: slice.rollbackNote,
    nextAction: slice.nextAction,
    ...(workerRuntime ? { workerRuntime } : {})
  };
}

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const operatingSliceReview = JSON.parse(fs.readFileSync(operatingSliceReviewPath, 'utf8'));
const runtimeBindingCoverage = JSON.parse(fs.readFileSync(runtimeBindingCoveragePath, 'utf8'));
const topologyNodesById = new Map(topology.nodes.map((node) => [node.id, node]));
const runtimeRecordsById = new Map(runtimeBindingCoverage.records.map((record) => [record.recordId, record]));

const readiness = {
  id: 'substrate:create-something:operating-slice-readiness:internal',
  generatedAt,
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  sourceReviewId: operatingSliceReview.id,
  items: operatingSliceReview.slices.map((slice) => buildReadinessItem(slice, topologyNodesById, runtimeRecordsById))
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(readiness, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

const firstItem = readiness.items[0];
console.log(
  JSON.stringify(
    {
      readinessId: readiness.id,
      outputPath: relative(outputPath),
      items: readiness.items.length,
      firstItem: {
        title: firstItem.title,
        productionStatus: firstItem.productionStatus,
        recordCount: firstItem.recordCount,
        gates: firstItem.gates.map((item) => `${item.id}:${item.status}`),
        workerRuntime: firstItem.workerRuntime
      }
    },
    null,
    2
  )
);
