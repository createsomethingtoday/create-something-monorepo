import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const outputPath = path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json');
const generatedAt = new Date().toISOString();
const topologyId = 'substrate:create-something:topology:internal';
const atlasCanvasId = 'create-something-internal-operating-topology';

const ignoreDirs = new Set([
  '.git',
  '.svelte-kit',
  '.turbo',
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

function atlasNodeId(nodeId) {
  return nodeId.replace(/^substrate:/, 'atlas:').replace(/:/g, '_');
}

function walkFiles(startDir, predicate) {
  const results = [];
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

function findPackagePath(filePath) {
  let current = path.dirname(filePath);
  while (current !== repoRoot && current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'package.json'))) return relative(current);
    current = path.dirname(current);
  }
  return relative(path.dirname(filePath));
}

function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/,\s*([}\]])/g, '$1');
}

function stringValue(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*[\"']([^\"']+)[\"']`, 'm'));
  return match?.[1];
}

function sectionChunks(text, sectionName) {
  const expression = new RegExp(
    `\\[\\[${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]([\\s\\S]*?)(?=\\n\\s*\\[\\[|\\n\\s*\\[|$)`,
    'g'
  );
  return [...text.matchAll(expression)].map((match) => match[1] ?? '');
}

function namedBlock(text, sectionName) {
  const expression = new RegExp(
    `\\[${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]([\\s\\S]*?)(?=\\n\\s*\\[|$)`,
    'm'
  );
  return text.match(expression)?.[1] ?? '';
}

function tableBlock(text, sectionName) {
  const lines = text.split(/\r?\n/);
  const output = [];
  let active = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === `[${sectionName}]`) {
      active = true;
      continue;
    }
    if (active && trimmed.startsWith('[')) break;
    if (active) output.push(line);
  }

  return output.join('\n');
}

function dedupeBindings(bindings) {
  return [...new Map(bindings.map((binding) => [`${binding.kind}:${binding.name}:${binding.target ?? ''}`, binding])).values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
  );
}

function parseTomlConfig(text) {
  const bindings = [];
  const routes = [];

  for (const chunk of sectionChunks(text, 'd1_databases')) {
    const name = stringValue(chunk, 'binding');
    if (name) bindings.push({ kind: 'd1', name, target: stringValue(chunk, 'database_name') });
  }
  for (const chunk of sectionChunks(text, 'durable_objects.bindings')) {
    const name = stringValue(chunk, 'name');
    if (name) bindings.push({ kind: 'durable_object', name, target: stringValue(chunk, 'class_name') });
  }
  for (const chunk of sectionChunks(text, 'kv_namespaces')) {
    const name = stringValue(chunk, 'binding');
    if (name) bindings.push({ kind: 'kv', name, target: stringValue(chunk, 'id') });
  }
  for (const chunk of sectionChunks(text, 'r2_buckets')) {
    const name = stringValue(chunk, 'binding');
    if (name) bindings.push({ kind: 'r2', name, target: stringValue(chunk, 'bucket_name') });
  }
  for (const chunk of [...sectionChunks(text, 'queues.producers'), ...sectionChunks(text, 'queues.consumers')]) {
    const name = stringValue(chunk, 'binding') ?? stringValue(chunk, 'queue');
    if (name) bindings.push({ kind: 'queue', name, target: stringValue(chunk, 'queue') });
  }
  for (const chunk of sectionChunks(text, 'vectorize')) {
    const name = stringValue(chunk, 'binding');
    if (name) bindings.push({ kind: 'vectorize', name, target: stringValue(chunk, 'index_name') });
  }

  const assetsBlock = tableBlock(text, 'assets');
  const assetsBinding = stringValue(assetsBlock, 'binding');
  if (assetsBinding) bindings.push({ kind: 'assets', name: assetsBinding, target: stringValue(assetsBlock, 'directory') });

  const varsBlock = tableBlock(text, 'vars');
  for (const match of varsBlock.matchAll(/^\s*([A-Z0-9_]+)\s*=/gm)) {
    bindings.push({ kind: 'var', name: match[1] });
  }

  for (const chunk of sectionChunks(text, 'routes')) {
    const pattern = stringValue(chunk, 'pattern');
    if (pattern) routes.push(pattern);
  }
  for (const match of text.matchAll(/^\s*pattern\s*=\s*["']([^"']+)["']/gm)) routes.push(match[1]);
  for (const route of [...new Set(routes)]) bindings.push({ kind: 'route', name: route });

  return {
    name: stringValue(text, 'name'),
    main: stringValue(text, 'main'),
    compatibilityDate: stringValue(text, 'compatibility_date'),
    pagesBuildOutputDir: stringValue(text, 'pages_build_output_dir'),
    bindings: dedupeBindings(bindings),
    routes: [...new Set(routes)].sort()
  };
}

function bindingArray(input, kind, nameKey, targetKey) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const name = item?.[nameKey];
      if (typeof name !== 'string' || !name) return undefined;
      const target = typeof item?.[targetKey] === 'string' ? item[targetKey] : undefined;
      return { kind, name, target };
    })
    .filter(Boolean);
}

function parseJsonConfig(text) {
  const parsed = JSON.parse(stripJsonComments(text));
  const bindings = [
    ...bindingArray(parsed.d1_databases, 'd1', 'binding', 'database_name'),
    ...bindingArray(parsed.durable_objects?.bindings, 'durable_object', 'name', 'class_name'),
    ...bindingArray(parsed.kv_namespaces, 'kv', 'binding', 'id'),
    ...bindingArray(parsed.r2_buckets, 'r2', 'binding', 'bucket_name'),
    ...bindingArray(parsed.vectorize, 'vectorize', 'binding', 'index_name')
  ];
  const routes = Array.isArray(parsed.routes)
    ? parsed.routes.map((route) => (typeof route === 'string' ? route : route?.pattern)).filter(Boolean)
    : [];
  if (parsed.assets?.binding) {
    bindings.push({ kind: 'assets', name: parsed.assets.binding, target: parsed.assets.directory });
  }
  if (parsed.vars && typeof parsed.vars === 'object') {
    for (const key of Object.keys(parsed.vars)) bindings.push({ kind: 'var', name: key });
  }
  for (const route of routes) bindings.push({ kind: 'route', name: route });

  return {
    name: parsed.name,
    main: parsed.main,
    compatibilityDate: parsed.compatibility_date,
    pagesBuildOutputDir: parsed.pages_build_output_dir,
    bindings: dedupeBindings(bindings),
    routes: [...new Set(routes)].sort()
  };
}

function parseConfig(filePath) {
  const rel = relative(filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const format = rel.endsWith('.toml') ? 'toml' : rel.endsWith('.jsonc') ? 'jsonc' : 'json';
  return {
    format,
    ...(format === 'toml' ? parseTomlConfig(text) : parseJsonConfig(text))
  };
}

function buildRuntimeRecord(filePath) {
  const configPath = relative(filePath);
  const packagePath = findPackagePath(filePath);
  const parsed = parseConfig(filePath);
  const recordId = stableId('worker', configPath);
  const title = parsed.name ?? configPath;
  const bindingKinds = [...new Set(parsed.bindings.map((binding) => binding.kind))].join(', ') || 'no bindings';

  const sourceRecord = {
    id: recordId,
    source: 'CREATE SOMETHING Cloudflare runtime binding coverage',
    sourceType: 'worker',
    title,
    owner: 'CREATE SOMETHING',
    status: 'ready',
    bindingHealth: 'bound',
    atlasCanvasId,
    atlasNodeId: atlasNodeId(recordId),
    relationCount: parsed.bindings.length + parsed.routes.length + 1,
    receiptId: `receipt:${recordId}`,
    updatedAt: generatedAt,
    summary: `${configPath} is bound as a Cloudflare runtime config with ${parsed.bindings.length} binding refs (${bindingKinds}).`
  };

  return {
    recordId,
    atlasNodeId: atlasNodeId(recordId),
    configPath,
    packagePath,
    name: parsed.name,
    main: parsed.main,
    compatibilityDate: parsed.compatibilityDate,
    pagesBuildOutputDir: parsed.pagesBuildOutputDir,
    format: parsed.format,
    bindings: parsed.bindings,
    routes: parsed.routes,
    sourceRecord,
    receipt: {
      id: `receipt:${recordId}`,
      recordId,
      type: 'proof',
      summary: `${title} has first-class Substrate runtime binding coverage.`,
      evidence: `${configPath} was parsed into Cloudflare runtime binding coverage at ${generatedAt}.`,
      createdAt: generatedAt
    },
    reviewAction: {
      id: `action:runtime-binding-review:${recordId}`,
      recordId,
      state: 'wait',
      title: `Review Cloudflare runtime binding for ${title}`,
      owner: 'CREATE SOMETHING',
      policy: 'Runtime binding review before external writes',
      detail: `${configPath} is mapped as Substrate runtime state. Review routes, D1, Durable Object, KV, R2, queue, asset, variable, and migration expectations before mutating Cloudflare.`
    }
  };
}

const configFiles = walkFiles(repoRoot, (_fullPath, name) =>
  name === 'wrangler.toml' || name === 'wrangler.json' || name === 'wrangler.jsonc'
);
const records = configFiles.map(buildRuntimeRecord);
const coverage = {
  id: 'substrate:create-something:runtime-binding-coverage:cloudflare',
  generatedAt,
  topologyId,
  atlasCanvasId,
  runtime: 'cloudflare',
  records
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(coverage, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      coverageId: coverage.id,
      outputPath: relative(outputPath),
      runtime: coverage.runtime,
      records: coverage.records.length,
      bindingRefs: coverage.records.reduce((count, record) => count + record.bindings.length, 0),
      routeRefs: coverage.records.reduce((count, record) => count + record.routes.length, 0)
    },
    null,
    2
  )
);
