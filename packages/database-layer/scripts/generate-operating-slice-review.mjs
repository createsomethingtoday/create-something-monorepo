import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const atlasCoveragePath = path.join(packageRoot, 'data', 'create-something-atlas-coverage.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
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

function validationCommandsFor(group) {
  if (group.surface === 'client') return ['pnpm --filter @create-something/database-layer test'];
  if (group.surface === 'worker') return ['pnpm --filter @create-something/database-layer runtime-bindings:generate', 'pnpm --filter @create-something/database-layer test'];
  if (group.surface === 'agent' || group.surface === 'config' || group.surface === 'mcp') {
    return ['pnpm --filter @create-something/database-layer agent-configs:generate', 'pnpm --filter @create-something/database-layer test'];
  }
  if (group.surface === 'policy' || group.surface === 'guide' || group.surface === 'doc') {
    return ['pnpm --filter @create-something/database-layer atlas-coverage:generate', 'pnpm --filter @create-something/database-layer test'];
  }
  return ['pnpm --filter @create-something/database-layer test'];
}

function nextActionFor(group) {
  if (group.surface === 'policy' || group.surface === 'guide' || group.surface === 'doc') {
    return 'Review the mapped knowledge lane, attach it to owning workflows, and promote approved policy/guide references into operator runbooks.';
  }
  if (group.surface === 'worker') {
    return 'Review runtime ownership and bind approved worker slices to production workflow checks before Cloudflare mutation.';
  }
  if (group.surface === 'mcp' || group.surface === 'agent' || group.surface === 'config') {
    return 'Review tool risk, agent ownership, and MCP evidence before enabling production workflow use.';
  }
  if (group.surface === 'client') {
    return 'Review client overlay boundaries and promote approved slices into client-specific Atlas sessions.';
  }
  return 'Review the mapped slice and promote only approved records into production workflow use.';
}

function selectEvidence(records) {
  const paths = records.map((record) => record.path).filter(Boolean);
  return [...new Set(paths)].slice(0, 12);
}

function buildSlice(group, records) {
  return {
    id: stableId('operating-slice', group.id),
    title: group.title,
    status: 'review_ready',
    atlasCoverageGroupIds: [group.id],
    recordIds: records.map((record) => record.recordId),
    owner: group.owner,
    tier: group.tier,
    surface: group.surface,
    nodeCount: group.nodeCount,
    evidence: selectEvidence(records),
    validationCommands: validationCommandsFor(group),
    promotionBoundary:
      'Local coverage only. Production Atlas write-back, Cloudflare mutation, Dify Studio changes, client communication, and third-party writes require explicit operator approval and the owning promotion workflow.',
    rollbackNote:
      'Rollback is local-first: regenerate coverage artifacts from repo truth or revert the approved production write through its owning workflow. Do not delete external state from this artifact alone.',
    nextAction: nextActionFor(group)
  };
}

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const atlasCoverage = JSON.parse(fs.readFileSync(atlasCoveragePath, 'utf8'));
const recordsByGroup = new Map();
for (const record of atlasCoverage.records) {
  const current = recordsByGroup.get(record.groupId) ?? [];
  current.push(record);
  recordsByGroup.set(record.groupId, current);
}

const slices = atlasCoverage.groups
  .slice()
  .sort((a, b) => b.nodeCount - a.nodeCount || a.title.localeCompare(b.title))
  .map((group) => buildSlice(group, recordsByGroup.get(group.id) ?? []));

const review = {
  id: 'substrate:create-something:operating-slice-review:internal',
  generatedAt,
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  sourceCoverageId: atlasCoverage.id,
  slices
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(review, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      reviewId: review.id,
      outputPath: relative(outputPath),
      slices: review.slices.length,
      records: review.slices.reduce((count, slice) => count + slice.recordIds.length, 0),
      firstSlices: review.slices.slice(0, 5).map((slice) => ({
        title: slice.title,
        nodeCount: slice.nodeCount,
        surface: slice.surface,
        tier: slice.tier
      }))
    },
    null,
    2
  )
);
