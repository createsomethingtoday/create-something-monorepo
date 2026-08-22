import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const outputPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const agentConfigCoveragePath = path.join(packageRoot, 'data', 'create-something-agent-config-coverage.json');
const atlasCoveragePath = path.join(packageRoot, 'data', 'create-something-atlas-coverage.json');
const clientOverlayCoveragePath = path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json');
const runtimeBindingCoveragePath = path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json');
const atlasCanvasId = 'create-something-internal-operating-topology';
const generatedAt = new Date().toISOString();
const rootNodeId = 'substrate:create-something:root';
const agentConfigCoverage = readAgentConfigCoverage();
const atlasCoverage = readAtlasCoverage();
const clientOverlayCoverage = readClientOverlayCoverage();
const runtimeBindingCoverage = readRuntimeBindingCoverage();
const coveredAgentConfigPaths = new Set(agentConfigCoverage?.records.map((record) => record.configPath) ?? []);
const coveredAtlasPaths = new Set(atlasCoverage?.records.map((record) => record.path) ?? []);
const coveredClientPackagePaths = new Set(
  clientOverlayCoverage?.overlays.flatMap((overlay) => overlay.packages.map((pkg) => pkg.path)) ?? []
);
const coveredWorkerConfigPaths = new Set(runtimeBindingCoverage?.records.map((record) => record.configPath) ?? []);

const ignoreDirs = new Set([
  '.git',
  '.next',
  '.open-next',
  '.svelte-kit',
  '.turbo',
  '.vercel',
  'dist',
  'node_modules',
  'output',
  'target',
  'tmp'
]);

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

function readClientOverlayCoverage() {
  if (!fs.existsSync(clientOverlayCoveragePath)) return undefined;
  return readJson(clientOverlayCoveragePath);
}

function readAgentConfigCoverage() {
  if (!fs.existsSync(agentConfigCoveragePath)) return undefined;
  return readJson(agentConfigCoveragePath);
}

function readAtlasCoverage() {
  if (!fs.existsSync(atlasCoveragePath)) return undefined;
  return readJson(atlasCoveragePath);
}

function readRuntimeBindingCoverage() {
  if (!fs.existsSync(runtimeBindingCoveragePath)) return undefined;
  return readJson(runtimeBindingCoveragePath);
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
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

function ownerName(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && typeof value.name === 'string' && value.name.trim()) {
    return value.name.trim();
  }
  return 'CREATE SOMETHING';
}

function atlasNodeId(nodeId) {
  return nodeId.replace(/^substrate:/, 'atlas:').replace(/:/g, '_');
}

function walkFiles(startDir, predicate) {
  const results = [];
  if (!fs.existsSync(startDir)) return results;

  const stack = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) stack.push(fullPath);
        continue;
      }

      if (predicate(fullPath, entry.name)) results.push(fullPath);
    }
  }

  return results.sort((a, b) => relative(a).localeCompare(relative(b)));
}

function packageTier(manifest, relativePath) {
  const text = [
    manifest.description,
    manifest.createSomething?.tier,
    manifest.name,
    relativePath,
    Object.keys(manifest.dependencies ?? {}).join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (manifest.createSomething?.tier === 'database') return 'Database';
  if (manifest.createSomething?.tier === 'automation') return 'Automation';
  if (manifest.createSomething?.tier === 'judgment') return 'Judgment';
  if (/policy|prompt|canon|taste|judgment/.test(text)) return 'Judgment';
  if (/db|database|data|search|substrate|d1|r2|registry|ledger/.test(text)) return 'Database';
  if (/mcp|worker|agent|automation|sync|scheduler|validator|review|hub|api/.test(text)) {
    return 'Automation';
  }
  return 'Mixed';
}

function packageSurface(manifest, relativePath) {
  const text = `${manifest.name ?? ''} ${manifest.description ?? ''} ${relativePath}`.toLowerCase();
  if (relativePath.startsWith('apps/')) return 'app';
  if (relativePath.includes('/clients/')) return 'client';
  if (/mcp/.test(text)) return 'mcp';
  if (/agent/.test(text)) return 'agent';
  if (
    exists(`${relativePath}/wrangler.toml`) ||
    exists(`${relativePath}/wrangler.json`) ||
    exists(`${relativePath}/wrangler.jsonc`)
  ) return 'worker';
  return 'package';
}

function runtimeForPackage(relativePath) {
  const runtimes = [];
  if (
    exists(`${relativePath}/wrangler.toml`) ||
    exists(`${relativePath}/wrangler.json`) ||
    exists(`${relativePath}/wrangler.jsonc`)
  ) {
    runtimes.push('cloudflare');
  }
  if (
    exists(`${relativePath}/worker/wrangler.toml`) ||
    exists(`${relativePath}/worker/wrangler.json`) ||
    exists(`${relativePath}/worker/wrangler.jsonc`)
  ) {
    runtimes.push('cloudflare-worker');
  }
  if (exists(`${relativePath}/src-tauri/Cargo.toml`)) runtimes.push('tauri');
  if (exists(`${relativePath}/Cargo.toml`)) runtimes.push('rust');
  if (exists(`${relativePath}/package.json`)) runtimes.push('node');
  return runtimes.join(', ') || undefined;
}

function clientSlug(relativePath) {
  const parts = relativePath.split('/');
  const clientIndex = parts.indexOf('clients');
  if (clientIndex === -1) return undefined;
  return parts[clientIndex + 1];
}

function collectPackageNodes() {
  return walkFiles(repoRoot, (_fullPath, name) => name === 'package.json')
    .filter((filePath) => !relative(filePath).includes('/node_modules/'))
    .map((filePath) => {
      const dir = relative(path.dirname(filePath));
      const manifest = readJson(filePath);
      const surface = packageSurface(manifest, dir);
      const id = stableId(surface === 'app' ? 'app' : 'package', `${manifest.name ?? path.basename(dir)}:${dir}`);
      const status =
        manifest.name === '@create-something/database-layer' ||
        manifest.name === '@create-something/substrate-mcp' ||
        manifest.name === '@create-something/interaction-atlas-mcp' ||
        coveredAtlasPaths.has(dir) ||
        coveredClientPackagePaths.has(dir)
          ? 'mapped'
          : 'needs_atlas';

      return {
        node: {
          id,
          atlasNodeId: atlasNodeId(id),
          title: manifest.name ?? dir,
          path: dir,
          tier: packageTier(manifest, dir),
          surface,
          owner: ownerName(manifest.author),
          status: coveredAtlasPaths.has(dir) ? 'mapped' : status,
          summary: manifest.description || `Workspace package at ${dir}.`,
          tags: [
            'package',
            surface,
            ...(manifest.keywords ?? []),
            ...(manifest.createSomething?.tier ? [manifest.createSomething.tier] : [])
          ],
          packageName: manifest.name,
          runtime: runtimeForPackage(dir),
          clientSlug: clientSlug(dir)
        },
        manifest
      };
    });
}

function collectWorkerNodes(packageEntries) {
  const workerPaths = new Set();
  for (const { node } of packageEntries) {
    for (const candidate of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc', 'worker/wrangler.toml', 'worker/wrangler.json', 'worker/wrangler.jsonc', 'dashboard/wrangler.toml', 'dashboard/wrangler.json', 'dashboard/wrangler.jsonc']) {
      const candidatePath = `${node.path}/${candidate}`;
      if (exists(candidatePath)) workerPaths.add(candidatePath);
    }
  }

  return [...workerPaths].sort().map((workerPath) => {
    const id = stableId('worker', workerPath);
    return {
      id,
      atlasNodeId: atlasNodeId(id),
      title: path.basename(path.dirname(workerPath)) === 'worker'
        ? `${path.basename(path.dirname(path.dirname(workerPath)))} worker`
        : workerPath,
      path: workerPath,
      tier: 'Automation',
      surface: 'worker',
      owner: 'CREATE SOMETHING',
      status: coveredAtlasPaths.has(workerPath)
        ? 'mapped'
        : coveredWorkerConfigPaths.has(workerPath)
        ? 'mapped'
        : 'needs_substrate',
      summary: `Cloudflare runtime configuration at ${workerPath}.`,
      tags: ['worker', 'cloudflare', 'runtime'],
      runtime: 'cloudflare'
    };
  });
}

function collectDocNodes() {
  const policyFiles = walkFiles(path.join(repoRoot, 'docs', 'policies'), (_fullPath, name) =>
    /\.(md|json)$/.test(name)
  );
  const guideFiles = walkFiles(path.join(repoRoot, 'docs', 'guides'), (_fullPath, name) => name.endsWith('.md'));
  const anchorDocs = [
    'docs/README.md',
    'docs/CREATE_SOMETHING_DATABASE_LAYER.md',
    'docs/CANON_DATABASE_LAYER_DESIGN.md',
    'docs/THREE_TIER_FRAMEWORK.md',
    'docs/MCP_FIRST_THESIS.md',
    'docs/MCP_HUB_CONTROL_PLANE.md'
  ].filter(exists);

  const seen = new Set();
  return [...anchorDocs.map((item) => path.join(repoRoot, item)), ...policyFiles, ...guideFiles]
    .filter((filePath) => {
      const rel = relative(filePath);
      if (seen.has(rel)) return false;
      seen.add(rel);
      return true;
    })
    .map((filePath) => {
      const rel = relative(filePath);
      const surface = rel.startsWith('docs/policies/') ? 'policy' : rel.startsWith('docs/guides/') ? 'guide' : 'doc';
      const id = stableId(surface, rel);
      return {
        id,
        atlasNodeId: atlasNodeId(id),
        title: path.basename(rel),
        path: rel,
        tier: surface === 'policy' ? 'Judgment' : 'Mixed',
        surface,
        owner: 'CREATE SOMETHING',
        status: coveredAtlasPaths.has(rel) ? 'mapped' : 'needs_atlas',
        summary: `${surface} artifact in the CREATE SOMETHING operating topology.`,
        tags: [surface, 'documentation']
      };
    });
}

function collectConfigNodes() {
  const difyAgents = walkFiles(path.join(repoRoot, 'config', 'dify-agents'), (_fullPath, name) =>
    name.endsWith('.json')
  );
  const difyMcp = walkFiles(path.join(repoRoot, 'config', 'dify-mcp-intake'), (_fullPath, name) =>
    name.endsWith('.json')
  );

  return [...difyAgents, ...difyMcp].map((filePath) => {
    const rel = relative(filePath);
    const isAgent = rel.includes('/dify-agents/');
    const id = stableId(isAgent ? 'agent-config' : 'mcp-config', rel);
    return {
      id,
      atlasNodeId: atlasNodeId(id),
      title: path.basename(rel, '.json'),
      path: rel,
      tier: 'Automation',
      surface: isAgent ? 'agent' : 'config',
      owner: 'CREATE SOMETHING',
      status: coveredAtlasPaths.has(rel)
        ? 'mapped'
        : coveredAgentConfigPaths.has(rel)
        ? 'mapped'
        : 'needs_substrate',
      summary: `${isAgent ? 'Dify agent' : 'MCP intake'} configuration tracked as topology source.`,
      tags: [isAgent ? 'agent' : 'mcp', 'config', 'dify']
    };
  });
}

function edgeId(source, target, relation) {
  return stableId('edge', `${source}-${relation}-${target}`);
}

function makeEdge(source, target, relation, evidence) {
  return { id: edgeId(source, target, relation), source, target, relation, evidence };
}

const tokenStopwords = new Set([
  'and',
  'app',
  'apps',
  'create',
  'creating',
  'doc',
  'docs',
  'guide',
  'guides',
  'json',
  'markdown',
  'mixed',
  'package',
  'packages',
  'policy',
  'readme',
  'something',
  'surface',
  'the',
  'v1'
]);

const knowledgeFallbackPackageNames = {
  doc: [
    '@create-something/database-layer',
    '@create-something/substrate-mcp',
    '@create-something/interaction-atlas-mcp',
    '@create-something/agency',
    '@create-something/io'
  ],
  guide: [
    '@create-something/interaction-atlas-mcp',
    '@create-something/database-layer',
    '@create-something/substrate-mcp',
    '@create-something/agency',
    '@create-something/io'
  ],
  policy: [
    '@create-something/mcp-authz',
    '@createsomething/pi-policy-os',
    '@create-something/canon',
    '@create-something/database-layer',
    '@create-something/substrate-mcp'
  ]
};

function hashText(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function tokensForNode(node) {
  const text = [
    node.title,
    node.path,
    node.surface,
    node.tier,
    node.summary,
    node.packageName,
    ...(node.tags ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return new Set(
    text
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2 && !tokenStopwords.has(token)) ?? []
  );
}

function scoreKnowledgeTarget(knowledgeTokens, target, targetTokens) {
  let score = 0;
  for (const token of knowledgeTokens) {
    if (targetTokens.has(token)) score += 1;
  }
  if (knowledgeTokens.has('mcp') && target.surface === 'mcp') score += 3;
  if (knowledgeTokens.has('agent') && target.surface === 'agent') score += 3;
  if (knowledgeTokens.has('worker') && target.surface === 'worker') score += 2;
  if (knowledgeTokens.has('cloudflare') && target.runtime?.includes('cloudflare')) score += 2;
  if (knowledgeTokens.has('atlas') && target.packageName === '@create-something/interaction-atlas-mcp') score += 4;
  if (knowledgeTokens.has('substrate') && target.packageName === '@create-something/substrate-mcp') score += 4;
  if (knowledgeTokens.has('database') && target.packageName === '@create-something/database-layer') score += 4;
  if (knowledgeTokens.has('canon') && target.packageName === '@create-something/canon') score += 4;
  if (knowledgeTokens.has('auth') && target.packageName === '@create-something/mcp-authz') score += 3;
  return score;
}

function fallbackKnowledgeTarget(doc, fallbackTargets, targetCandidates) {
  const preferredTargets = (knowledgeFallbackPackageNames[doc.surface] ?? [])
    .map((packageName) => fallbackTargets.get(packageName))
    .filter(Boolean);
  const targets = preferredTargets.length > 0 ? preferredTargets : targetCandidates;
  return targets[hashText(doc.path) % targets.length];
}

function operationalKnowledgeEdges(docNodes, targetCandidates, fallbackTargets) {
  const indexedTargets = targetCandidates.map((node) => ({
    node,
    tokens: tokensForNode(node)
  }));

  return docNodes.map((doc) => {
    const docTokens = tokensForNode(doc);
    const scoredTargets = indexedTargets
      .map((target) => ({
        ...target,
        score: scoreKnowledgeTarget(docTokens, target.node, target.tokens)
      }))
      .filter((target) => target.score > 0)
      .sort((a, b) => b.score - a.score || a.node.path.localeCompare(b.node.path));
    const target = scoredTargets[0]?.score >= 2
      ? scoredTargets[0].node
      : fallbackKnowledgeTarget(doc, fallbackTargets, targetCandidates);
    const relation = doc.surface === 'policy' ? 'governs' : 'documents';
    const evidence = scoredTargets[0]?.score >= 2
      ? `${doc.path} ${relation} ${target.path} through matching topology terms.`
      : `${doc.path} ${relation} ${target.path} through the stable ${doc.surface} platform anchor.`;

    return makeEdge(doc.id, target.id, relation, evidence);
  });
}

function buildTopology() {
  const packageEntries = collectPackageNodes();
  const packageNodes = packageEntries.map(({ node }) => node);
  const workerNodes = collectWorkerNodes(packageEntries);
  const docNodes = collectDocNodes();
  const configNodes = collectConfigNodes();
  const rootNode = {
    id: rootNodeId,
    atlasNodeId: atlasNodeId(rootNodeId),
    title: 'CREATE SOMETHING operating topology',
    path: '.',
    tier: 'Mixed',
    surface: 'repo',
    owner: 'CREATE SOMETHING',
    status: 'mapped',
    summary:
      'Root topology for everything that powers CREATE SOMETHING and the client surfaces it manages.',
    tags: ['root', 'atlas', 'substrate', 'topology']
  };
  const nodes = [rootNode, ...packageNodes, ...workerNodes, ...docNodes, ...configNodes];
  const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
  const nodeByPackageName = new Map(
    packageNodes.filter((node) => node.packageName).map((node) => [node.packageName, node])
  );
  const operationalKnowledgeTargets = nodes.filter(
    (node) => !['repo', 'doc', 'guide', 'policy'].includes(node.surface)
  );
  const edges = [];

  for (const node of nodes) {
    if (node.id !== rootNodeId) {
      edges.push(makeEdge(rootNodeId, node.id, 'contains', `${node.path} is present in the repo scan.`));
    }
  }

  for (const { node, manifest } of packageEntries) {
    const dependencies = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
      ...(manifest.optionalDependencies ?? {})
    };
    for (const [dependencyName, specifier] of Object.entries(dependencies)) {
      if (typeof specifier !== 'string' || !specifier.startsWith('workspace:')) continue;
      const target = nodeByPackageName.get(dependencyName);
      if (target) {
        edges.push(makeEdge(node.id, target.id, 'depends_on', `${node.packageName} declares ${dependencyName}.`));
      }
    }

    if (node.clientSlug) {
      edges.push(
        makeEdge(
          rootNodeId,
          node.id,
          'client_overlay',
          `${node.path} is a managed client overlay under packages/agency/clients.`
        )
      );
    }

    for (const candidate of ['wrangler.toml', 'wrangler.json', 'worker/wrangler.toml', 'worker/wrangler.json', 'dashboard/wrangler.toml']) {
      const worker = nodeByPath.get(`${node.path}/${candidate}`);
      if (worker) edges.push(makeEdge(node.id, worker.id, 'runs', `${candidate} configures runtime for ${node.path}.`));
    }
  }

  for (const doc of docNodes) {
    if (doc.surface === 'policy') edges.push(makeEdge(doc.id, rootNodeId, 'governs', `${doc.path} is a policy artifact.`));
    if (doc.surface === 'guide') edges.push(makeEdge(doc.id, rootNodeId, 'documents', `${doc.path} is an operating guide.`));
  }

  edges.push(...operationalKnowledgeEdges(docNodes, operationalKnowledgeTargets, nodeByPackageName));

  const databaseLayer = nodeByPackageName.get('@create-something/database-layer');
  const substrate = nodeByPackageName.get('@create-something/substrate-mcp');
  const atlas = nodeByPackageName.get('@create-something/interaction-atlas-mcp');
  if (databaseLayer) {
    edges.push(makeEdge(databaseLayer.id, rootNodeId, 'documents', 'Shared contract defines topology record shape.'));
  }
  if (substrate && databaseLayer) {
    edges.push(makeEdge(substrate.id, databaseLayer.id, 'depends_on', 'Substrate is the runtime target for the shared database-layer contract.'));
  }
  if (atlas && databaseLayer) {
    edges.push(makeEdge(atlas.id, databaseLayer.id, 'renders', 'Atlas renders database-layer topology as workflow maps.'));
  }

  const uniqueEdges = [...new Map(edges.map((edge) => [edge.id, edge])).values()];
  const coverage = {
    generatedAt,
    rootPath: '.',
    packageCount: packageNodes.length,
    appCount: packageNodes.filter((node) => node.surface === 'app').length,
    workerCount: workerNodes.length,
    clientOverlayCount: packageNodes.filter((node) => Boolean(node.clientSlug)).length,
    policyCount: docNodes.filter((node) => node.surface === 'policy').length,
    guideCount: docNodes.filter((node) => node.surface === 'guide').length,
    configCount: configNodes.length
  };

  return {
    id: 'substrate:create-something:topology:internal',
    title: 'CREATE SOMETHING internal operating topology',
    atlasCanvasId,
    rootNodeId,
    coverage,
    nodes,
    edges: uniqueEdges
  };
}

const topology = buildTopology();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(topology, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);
console.log(
  `Wrote ${relative(outputPath)} with ${topology.nodes.length} nodes and ${topology.edges.length} edges.`
);
