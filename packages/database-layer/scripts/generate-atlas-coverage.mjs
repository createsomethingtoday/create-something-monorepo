import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-atlas-coverage.json');
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

function stableId(kind, key) {
  return `substrate:create-something:${kind}:${slug(key)}`;
}

function groupKind(node) {
  if (node.surface === 'app') return 'application_surface';
  if (node.surface === 'mcp') return 'mcp_surface';
  if (node.surface === 'policy') return 'judgment_surface';
  if (node.surface === 'guide' || node.surface === 'doc') return 'knowledge_surface';
  if (node.tier === 'Database') return 'database_surface';
  if (node.tier === 'Automation' || node.surface === 'worker' || node.surface === 'agent') return 'automation_surface';
  if (node.tier === 'Judgment') return 'judgment_surface';
  return 'package_surface';
}

function groupKey(node) {
  return `${groupKind(node)}:${node.tier}:${node.surface}`;
}

function groupTitle(group) {
  const surface = group.surface === 'mcp' ? 'MCP' : group.surface;
  return `${group.tier} ${surface} Atlas coverage`;
}

function relationCount(topology, nodeId) {
  return topology.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).length;
}

function sourceRecordFor(topology, node, groupId) {
  return {
    id: node.id,
    source: 'CREATE SOMETHING Atlas coverage',
    sourceType: node.surface,
    title: node.title,
    owner: node.owner,
    status: 'ready',
    bindingHealth: 'bound',
    atlasCanvasId: topology.atlasCanvasId,
    atlasNodeId: node.atlasNodeId,
    relationCount: relationCount(topology, node.id),
    receiptId: `receipt:${node.id}`,
    updatedAt: generatedAt,
    summary: `${node.path} is grouped into ${groupId} for Atlas operating coverage.`
  };
}

function buildCoverage(topology) {
  const atlasGaps = topology.nodes.filter((node) => node.id !== topology.rootNodeId);
  const grouped = new Map();
  for (const node of atlasGaps) {
    const key = groupKey(node);
    const current = grouped.get(key) ?? [];
    current.push(node);
    grouped.set(key, current);
  }

  const groupEntries = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  const groups = groupEntries
    .map(([key, nodes]) => {
      const [kind, tier, surface] = key.split(':');
      const id = stableId('atlas-coverage-group', key);
      return {
        id,
        kind,
        title: groupTitle({ tier, surface }),
        tier,
        surface,
        owner: 'CREATE SOMETHING',
        nodeCount: nodes.length,
        summary: `${nodes.length} ${surface}/${tier} nodes are grouped for Atlas coverage before any external write-back.`
      };
    });
  const groupByKey = new Map(groupEntries.map(([key], index) => [key, groups[index]]));

  const records = atlasGaps
    .sort((a, b) => a.path.localeCompare(b.path) || a.id.localeCompare(b.id))
    .map((node) => {
      const group = groupByKey.get(groupKey(node));
      const sourceRecord = sourceRecordFor(topology, node, group.id);
      return {
        recordId: node.id,
        atlasNodeId: node.atlasNodeId,
        groupId: group.id,
        path: node.path,
        title: node.title,
        tier: node.tier,
        surface: node.surface,
        owner: node.owner,
        relationCount: relationCount(topology, node.id),
        sourceRecord,
        receipt: {
          id: `receipt:${node.id}`,
          recordId: node.id,
          type: 'proof',
          summary: `${node.title} has first-class Atlas coverage grouping.`,
          evidence: `${node.path} was grouped into ${group.id} at ${generatedAt}.`,
          createdAt: generatedAt
        },
        reviewAction: {
          id: `action:atlas-coverage-review:${node.id}`,
          recordId: node.id,
          state: 'wait',
          title: `Review Atlas coverage for ${node.title}`,
          owner: node.owner,
          policy: 'Atlas coverage review before external writes',
          detail: `${node.path} is mapped into the Atlas coverage group ${group.title}. Review layout, ownership, workflow edges, and evidence before writing back to production Atlas or third-party systems.`
        }
      };
    });

  return {
    id: 'substrate:create-something:atlas-coverage:internal',
    generatedAt,
    topologyId: topology.id,
    atlasCanvasId: topology.atlasCanvasId,
    groups,
    records
  };
}

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const coverage = buildCoverage(topology);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(coverage, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      coverageId: coverage.id,
      outputPath: relative(outputPath),
      groups: coverage.groups.length,
      records: coverage.records.length,
      surfaces: coverage.groups.reduce((counts, group) => {
        counts[group.surface] = (counts[group.surface] ?? 0) + group.nodeCount;
        return counts;
      }, {})
    },
    null,
    2
  )
);
