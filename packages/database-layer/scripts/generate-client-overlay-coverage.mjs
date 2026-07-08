import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const clientsRoot = path.join(repoRoot, 'packages', 'agency', 'clients');
const outputPath = path.join(packageRoot, 'data', 'create-something-client-overlay-coverage.json');
const generatedAt = new Date().toISOString();
const topologyId = 'substrate:create-something:topology:internal';
const atlasCanvasId = 'create-something-internal-operating-topology';

const ignoreDirs = new Set(['.svelte-kit', 'dist', 'node_modules', 'site', 'static', 'vendor']);

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

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
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
    manifest.name,
    relativePath,
    Object.keys(manifest.dependencies ?? {}).join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/mcp|agent|worker|automation|cloudflare|deploy/.test(text)) return 'Automation';
  if (/db|database|data|d1|r2|analytics|contact|cms/.test(text)) return 'Database';
  if (/policy|review|guide|judgment/.test(text)) return 'Judgment';
  return 'Mixed';
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
  if (exists(`${relativePath}/package.json`)) runtimes.push('node');
  return runtimes.join(', ') || undefined;
}

function clientSlug(relativePath) {
  const parts = relativePath.split('/');
  const index = parts.indexOf('clients');
  return parts[index + 1] ?? path.basename(relativePath);
}

function titleForClient(slugValue) {
  return slugValue
    .split('-')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function docsForPackage(relativePath) {
  return walkFiles(path.join(repoRoot, relativePath), (_fullPath, name) => name.endsWith('.md')).map(relative);
}

function workerConfigsForPackage(relativePath) {
  return ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc', 'worker/wrangler.toml', 'worker/wrangler.json']
    .map((candidate) => `${relativePath}/${candidate}`)
    .filter(exists);
}

function summaryForPackage(manifest, relativePath, docs) {
  if (manifest.description) return manifest.description;
  const readme = docs.find((doc) => doc.endsWith('/README.md'));
  if (!readme) return `Managed client package at ${relativePath}.`;

  const text = fs.readFileSync(path.join(repoRoot, readme), 'utf8');
  const firstParagraph = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^# .+\n+/, '').trim())
    .find((part) => part && !part.startsWith('```'));
  return firstParagraph?.replace(/\s+/g, ' ').slice(0, 280) || `Managed client package at ${relativePath}.`;
}

function collectClientPackages() {
  return walkFiles(clientsRoot, (_fullPath, name) => name === 'package.json').map((filePath) => {
    const packagePath = relative(path.dirname(filePath));
    const manifest = readJson(filePath);
    const docs = docsForPackage(packagePath);
    const recordId = stableId('package', `${manifest.name ?? path.basename(packagePath)}:${packagePath}`);
    return {
      recordId,
      atlasNodeId: atlasNodeId(recordId),
      packageName: manifest.name ?? packagePath,
      path: packagePath,
      tier: packageTier(manifest, packagePath),
      runtime: runtimeForPackage(packagePath),
      summary: summaryForPackage(manifest, packagePath, docs),
      commands: Object.keys(manifest.scripts ?? {}).sort(),
      docs,
      workerConfigs: workerConfigsForPackage(packagePath)
    };
  });
}

function sourceRecordForPackage(pkg, client) {
  return {
    id: pkg.recordId,
    source: 'CREATE SOMETHING client overlay coverage',
    sourceType: 'client',
    title: pkg.packageName,
    owner: 'CREATE SOMETHING',
    status: 'ready',
    bindingHealth: 'bound',
    atlasCanvasId: client.atlasCanvasId,
    atlasNodeId: pkg.atlasNodeId,
    relationCount: pkg.workerConfigs.length + pkg.docs.length + 1,
    receiptId: `receipt:${pkg.recordId}`,
    updatedAt: generatedAt,
    summary: pkg.summary
  };
}

function buildCoverage() {
  const packagesByClient = new Map();
  for (const pkg of collectClientPackages()) {
    const slugValue = clientSlug(pkg.path);
    const current = packagesByClient.get(slugValue) ?? [];
    current.push(pkg);
    packagesByClient.set(slugValue, current);
  }

  const overlays = [...packagesByClient.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slugValue, packages]) => {
      const recordId = stableId('client-overlay', slugValue);
      const overlayAtlasCanvasId = `${atlasCanvasId}:${slugValue}`;
      const overlay = {
        clientSlug: slugValue,
        recordId,
        atlasCanvasId: overlayAtlasCanvasId,
        title: `${titleForClient(slugValue)} Atlas/Substrate overlay`,
        owner: 'CREATE SOMETHING',
        status: 'mapped',
        packages,
        atlasNodes: packages.map((pkg) => ({
          id: pkg.atlasNodeId,
          recordId: pkg.recordId,
          label: pkg.packageName,
          kind: pkg.packageName.includes('mcp') || pkg.packageName.includes('tools') ? 'ai' : 'system',
          path: pkg.path
        })),
        substrateRecords: [],
        receipts: [],
        nextActions: []
      };
      overlay.substrateRecords = packages.map((pkg) => sourceRecordForPackage(pkg, overlay));
      overlay.receipts = packages.map((pkg) => ({
        id: `receipt:${pkg.recordId}`,
        recordId: pkg.recordId,
        type: 'proof',
        summary: `${pkg.packageName} has first-class client overlay coverage.`,
        evidence: `${pkg.path} was bound into ${overlayAtlasCanvasId} at ${generatedAt}.`,
        createdAt: generatedAt
      }));
      overlay.nextActions = packages.map((pkg) => ({
        id: `action:client-overlay-review:${pkg.recordId}`,
        recordId: pkg.recordId,
        state: 'wait',
        title: `Review ${pkg.packageName} Atlas/Substrate overlay`,
        owner: 'CREATE SOMETHING',
        policy: 'Client overlay review before external writes',
        detail: `${pkg.path} is mapped as a client overlay. Review workflow, agent, MCP, database, proof, and runtime bindings before mutating client systems.`
      }));
      return overlay;
    });

  return {
    id: 'substrate:create-something:client-overlay-coverage',
    generatedAt,
    topologyId,
    atlasCanvasId,
    overlays
  };
}

const coverage = buildCoverage();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(coverage, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);
console.log(
  JSON.stringify(
    {
      coverageId: coverage.id,
      outputPath: relative(outputPath),
      overlays: coverage.overlays.length,
      packages: coverage.overlays.reduce((count, overlay) => count + overlay.packages.length, 0),
      clients: coverage.overlays.map((overlay) => overlay.clientSlug)
    },
    null,
    2
  )
);
