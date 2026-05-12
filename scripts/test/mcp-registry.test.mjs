import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'mcp-registry.ts');
const SCHEMA_SRC = path.join(REPO_ROOT, 'config', 'mcp-hub', 'registry.schema.json');

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'mcp-registry-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  // Mirror the layout the script expects.
  const configDir = path.join(root, 'config', 'mcp-hub');
  const playbookDir = path.join(root, 'packages', 'playbook-mcp', 'src');
  const docsDir = path.join(root, 'docs');
  for (const dir of [configDir, playbookDir, docsDir]) {
    spawnSync('mkdir', ['-p', dir]);
  }

  // The script reads SCHEMA_PATH directly under cwd, so copy the real one.
  cpSync(SCHEMA_SRC, path.join(configDir, 'registry.schema.json'));

  return { root, configDir, playbookDir, docsDir };
}

function runValidate(cwd) {
  return spawnSync(TSX_BIN, [SCRIPT, 'validate'], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
}

function runRegistry(cwd, ...args) {
  return spawnSync(TSX_BIN, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
}

function writeCoreLayer(configDir, layer) {
  writeFileSync(
    path.join(configDir, 'registry.core.json'),
    `${JSON.stringify(layer, null, 2)}\n`,
    'utf8',
  );
}

function writeComposioLayer(configDir, layer) {
  writeFileSync(
    path.join(configDir, 'registry.composio.generated.json'),
    `${JSON.stringify(layer, null, 2)}\n`,
    'utf8',
  );
}

function readRegistryJson(configDir) {
  return JSON.parse(readFileSync(path.join(configDir, 'registry.json'), 'utf8'));
}

function writeRegistry(configDir, registry) {
  writeFileSync(
    path.join(configDir, 'registry.json'),
    `${JSON.stringify(registry, null, 2)}\n`,
    'utf8',
  );
}

function writeState(configDir, state) {
  writeFileSync(
    path.join(configDir, 'state.json'),
    `${JSON.stringify(state, null, 2)}\n`,
    'utf8',
  );
}

const baseRegistry = () => ({
  version: 1,
  servers: {
    'example-mcp': {
      transport: 'http',
      url: 'https://example.com/mcp',
      description: 'Example MCP',
      tags: ['core'],
      catalog_exposure_mode: 'direct',
      estimated_tool_count: 5,
    },
  },
  bundles: {
    core: ['example-mcp'],
  },
});

test('validate passes on a minimal well-formed registry', (t) => {
  const { root, configDir } = makeWorkspace(t);
  writeRegistry(configDir, baseRegistry());

  const result = runValidate(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Registry validation passed/);
});

test('validate rejects non-kebab-case server names', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers.Bad_Name = registry.servers['example-mcp'];
  delete registry.servers['example-mcp'];
  registry.bundles.core = ['Bad_Name'];
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /server names must be kebab-case/);
});

test('validate now rejects the previously grandfathered slack legacy names (CRE-263 drained the list)', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers.slack_create_something = {
    transport: 'http',
    url: 'https://mcp.slack.com/mcp',
    description: 'legacy',
    tags: ['slack'],
    catalog_exposure_mode: 'direct',
    estimated_tool_count: 0,
  };
  registry.bundles.core.push('slack_create_something');
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /server names must be kebab-case/);
});

test('validate accepts the renamed slack-create-something / slack-webflow', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers['slack-create-something'] = {
    transport: 'http',
    url: 'https://mcp.slack.com/mcp',
    description: 'renamed',
    tags: ['slack'],
    catalog_exposure_mode: 'direct',
    estimated_tool_count: 0,
  };
  registry.servers['slack-webflow'] = {
    transport: 'http',
    url: 'https://mcp.slack.com/mcp',
    description: 'renamed',
    tags: ['slack'],
    catalog_exposure_mode: 'direct',
    estimated_tool_count: 0,
  };
  registry.bundles.slack = ['slack-create-something', 'slack-webflow'];
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('validate rejects unknown bundle and server references in state.json', (t) => {
  const { root, configDir } = makeWorkspace(t);
  writeRegistry(configDir, baseRegistry());
  writeState(configDir, {
    enabledBundles: ['missing-bundle'],
    enabledServers: ['unknown-mcp'],
    disabledServers: ['also-unknown-mcp'],
  });

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /state\.json: enabledBundles references unknown bundle: missing-bundle/);
  assert.match(result.stderr, /state\.json: enabledServers references unknown server: unknown-mcp/);
  assert.match(result.stderr, /state\.json: disabledServers references unknown server: also-unknown-mcp/);
});

test('validate enforces exposure policy: >=75 tools cannot be direct', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers['example-mcp'].estimated_tool_count = 100;
  registry.servers['example-mcp'].catalog_exposure_mode = 'direct';
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /direct catalog exposure is not allowed for estimated_tool_count >= 75/);
});

test('validate enforces exposure policy: 26-75 direct requires reason+owner', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers['example-mcp'].estimated_tool_count = 50;
  registry.servers['example-mcp'].catalog_exposure_mode = 'direct';
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires exposure_exception_reason and exposure_review_owner/);

  // Now supply both and ensure it passes.
  registry.servers['example-mcp'].exposure_exception_reason = 'partner requirement';
  registry.servers['example-mcp'].exposure_review_owner = 'security@createsomething.io';
  writeRegistry(configDir, registry);
  const result2 = runValidate(root);
  assert.equal(result2.status, 0, result2.stderr || result2.stdout);
});

test('validate accepts the dormant exposure mode', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers['example-mcp'].catalog_exposure_mode = 'dormant';
  registry.servers['example-mcp'].lifecycle = 'dormant';
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('Ajv catches invalid transport via the JSON schema', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers['example-mcp'].transport = 'sse'; // not allowed in schema
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /schema /);
});

test('validate rejects bundle members that do not exist', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.bundles.core = ['example-mcp', 'ghost-mcp'];
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /bundle core: unknown server ghost-mcp/);
});

test('validate detects duplicate catalog slugs', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers['example-mcp'].catalog = {
    include: true,
    slug: 'shared-slug',
    category: 'create-something',
  };
  registry.servers['second-mcp'] = {
    transport: 'http',
    url: 'https://example.com/second/mcp',
    description: 'Second',
    tags: ['core'],
    catalog_exposure_mode: 'direct',
    estimated_tool_count: 1,
    catalog: {
      include: true,
      slug: 'shared-slug',
      category: 'create-something',
    },
  };
  registry.bundles.core.push('second-mcp');
  writeRegistry(configDir, registry);

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /duplicate catalog slug: shared-slug/);
});

// --- Two-layer split / merge tests (CRE-267) -------------------------------

test('split partitions registry.json into core + composio-generated layers', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const registry = baseRegistry();
  registry.servers['composio-toolkit-gmail'] = {
    transport: 'http',
    url: 'https://composio/mcp/gmail',
    description: 'Composio Gmail',
    tags: ['composio', 'toolkit', 'composio-email'],
    catalog_exposure_mode: 'brokered',
    estimated_tool_count: 63,
  };
  registry.bundles['composio-all'] = ['composio-toolkit-gmail'];
  registry.bundles['composio-category-email'] = ['composio-toolkit-gmail'];
  writeRegistry(configDir, registry);

  const result = runRegistry(root, 'split');
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const core = JSON.parse(readFileSync(path.join(configDir, 'registry.core.json'), 'utf8'));
  const composio = JSON.parse(
    readFileSync(path.join(configDir, 'registry.composio.generated.json'), 'utf8'),
  );

  assert.equal(core.version, 1);
  assert.equal(composio.version, 1);
  assert.ok('example-mcp' in core.servers);
  assert.ok(!('composio-toolkit-gmail' in core.servers));
  assert.ok('composio-toolkit-gmail' in composio.servers);
  assert.ok('core' in core.bundles);
  assert.ok(!('composio-all' in core.bundles));
  assert.ok('composio-all' in composio.bundles);
  assert.ok('composio-category-email' in composio.bundles);
  // defaults must live in the core layer, not composio.
  assert.equal(composio.defaults, undefined);
});

test('merge reconstructs registry.json identically from the two layers', (t) => {
  const { root, configDir } = makeWorkspace(t);
  const original = baseRegistry();
  original.servers['composio-toolkit-gmail'] = {
    transport: 'http',
    url: 'https://composio/mcp/gmail',
    description: 'Composio Gmail',
    tags: ['composio', 'toolkit'],
    catalog_exposure_mode: 'brokered',
    estimated_tool_count: 63,
  };
  original.bundles['composio-all'] = ['composio-toolkit-gmail'];
  writeRegistry(configDir, original);

  assert.equal(runRegistry(root, 'split').status, 0);
  // Wipe registry.json so merge has to rebuild it from layers alone.
  rmSync(path.join(configDir, 'registry.json'));
  assert.equal(runRegistry(root, 'merge').status, 0);

  const merged = readRegistryJson(configDir);
  // Same server set + bundle set + defaults.
  assert.deepEqual(Object.keys(merged.servers).sort(), Object.keys(original.servers).sort());
  assert.deepEqual(Object.keys(merged.bundles).sort(), Object.keys(original.bundles).sort());
  assert.deepEqual(merged.defaults, original.defaults);
});

test('check fails when registry.json drifts from merge(core, composio)', (t) => {
  const { root, configDir, playbookDir, docsDir } = makeWorkspace(t);
  const original = baseRegistry();
  writeRegistry(configDir, original);
  assert.equal(runRegistry(root, 'split').status, 0);
  // Generate the supporting artifacts so they are not the reason check fails.
  const gen = runRegistry(root, 'generate');
  assert.equal(gen.status, 0, gen.stderr || gen.stdout);

  // Corrupt registry.json without updating the layers.
  const drifted = readRegistryJson(configDir);
  drifted.servers['inserted-by-hand'] = { transport: 'http', url: 'https://x/mcp' };
  writeRegistry(configDir, drifted);

  const result = runRegistry(root, 'check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /registry\.json/);
  assert.match(result.stderr, /Run: pnpm mcp:registry:generate/);
});

test('validate rejects collisions between core and composio layers', (t) => {
  const { root, configDir } = makeWorkspace(t);
  // Both layers declare the same composio server.
  const sharedServer = {
    transport: 'http',
    url: 'https://composio/mcp/gmail',
    description: 'Composio Gmail',
    tags: ['composio', 'toolkit'],
    catalog_exposure_mode: 'brokered',
    estimated_tool_count: 63,
  };
  writeCoreLayer(configDir, {
    version: 1,
    servers: { 'composio-toolkit-gmail': sharedServer, 'example-mcp': baseRegistry().servers['example-mcp'] },
    bundles: { core: ['example-mcp'] },
  });
  writeComposioLayer(configDir, {
    version: 1,
    servers: { 'composio-toolkit-gmail': sharedServer },
    bundles: { 'composio-all': ['composio-toolkit-gmail'] },
  });

  const result = runValidate(root);
  assert.equal(result.status, 1);
  // Each invariant fires once per layer arrangement.
  assert.match(
    result.stderr,
    /server composio-toolkit-gmail: matches composio-toolkit-\* prefix but lives in core layer/,
  );
});

test('validate rejects defaults in the composio layer', (t) => {
  const { root, configDir } = makeWorkspace(t);
  writeCoreLayer(configDir, {
    version: 1,
    servers: baseRegistry().servers,
    bundles: baseRegistry().bundles,
    defaults: { enabledBundles: ['core'] },
  });
  writeComposioLayer(configDir, {
    version: 1,
    servers: {},
    bundles: {},
    defaults: { enabledBundles: ['composio-all'] },
  });

  const result = runValidate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /defaults must live in the core layer/);
});

// Sanity check that the real repo registry validates with the new rules.
test('real config/mcp-hub/registry.json validates clean', () => {
  const result = spawnSync(TSX_BIN, [SCRIPT, 'validate'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

// Sanity check: ensure the file we just wrote is readable.
test('schema file is readable and is JSON Schema 2020-12', () => {
  const schema = JSON.parse(readFileSync(SCHEMA_SRC, 'utf8'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.title, 'MCP Hub Registry');
});
