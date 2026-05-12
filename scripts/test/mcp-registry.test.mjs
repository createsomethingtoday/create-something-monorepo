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
