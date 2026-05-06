import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHECK_SCRIPT = path.join(REPO_ROOT, 'scripts', 'agent-legibility-check.mjs');
const MAP_SCRIPT = path.join(REPO_ROOT, 'scripts', 'agent-legibility-map.mjs');

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'agent-legibility-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function writePackage(root, name, overrides = {}) {
  const packageDir = `packages/${name}`;
  const directive = {
    agentLegibilityContract: true,
    tier: 'automation',
    surface: 'mcp',
    entrypoints: ['src/index.ts'],
    boot: 'pnpm dev',
    smoke: 'pnpm test',
    ...overrides.createSomething,
  };

  write(root, `${packageDir}/package.json`, `${JSON.stringify({
    name: `@create-something/${name}`,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'node src/index.ts',
      test: 'node --test',
      ...overrides.scripts,
    },
    createSomething: directive,
  }, null, 2)}\n`);

  write(root, `${packageDir}/README.md`, `# ${name}

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | \`src/index.ts\` |
| Boot command | \`pnpm dev\` |
| Smoke command | \`pnpm test\` |
| Validation surfaces | stdout |
| UI validation path | none |
| Escalation rule | stop if package scripts drift from the directive |
`);

  write(root, `${packageDir}/AGENTS.md`, `# Agents: ${name}

## Agent Entry

- Start with \`src/index.ts\`.

## Validation

- Run \`pnpm test\`.
`);

  write(root, `${packageDir}/src/index.ts`, 'export const ok = true;\n');
}

function runNode(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function parseJson(stdout) {
  assert.doesNotThrow(() => JSON.parse(stdout), stdout);
  return JSON.parse(stdout);
}

test('agent legibility check accepts pnpm-style separator and validates package guidance', (t) => {
  const root = makeWorkspace(t);
  writePackage(root, 'sample');

  const result = runNode(CHECK_SCRIPT, ['--', '--format', 'json'], root);

  assert.equal(result.status, 0, result.stderr);
  const payload = parseJson(result.stdout);
  assert.equal(payload.audit.passed, true);
  assert.equal(payload.audit.target_count, 1);
  assert.deepEqual(payload.results.map((item) => item.target), ['packages/sample/README.md']);
});

test('agent legibility check fails opted-in packages without package-local AGENTS.md', (t) => {
  const root = makeWorkspace(t);
  writePackage(root, 'sample');
  rmSync(path.join(root, 'packages', 'sample', 'AGENTS.md'));

  const result = runNode(CHECK_SCRIPT, ['--format', 'json'], root);

  assert.equal(result.status, 1);
  const payload = parseJson(result.stdout);
  assert.equal(payload.audit.passed, false);
  assert(payload.results.some((item) =>
    item.target === 'packages/sample/AGENTS.md'
    && item.details.includes('Opted-in package is missing package-local AGENTS.md.')));
});

test('agent legibility map emits deterministic package routing metadata', (t) => {
  const root = makeWorkspace(t);
  writePackage(root, 'database-worker', {
    createSomething: {
      tier: 'database',
      surface: 'worker',
      entrypoints: ['src/index.ts'],
      boot: 'pnpm dev',
      smoke: 'pnpm test',
    },
  });
  writePackage(root, 'judgment-app', {
    createSomething: {
      tier: 'judgment',
      surface: 'app',
      entrypoints: ['src/index.ts'],
      boot: 'pnpm dev',
      smoke: 'pnpm test',
    },
  });

  const result = runNode(MAP_SCRIPT, ['--surface', 'worker', '--format', 'json'], root);

  assert.equal(result.status, 0, result.stderr);
  const payload = parseJson(result.stdout);
  assert.equal(payload.package_count, 1);
  assert.equal(payload.summary.by_tier.database, 1);
  assert.equal(payload.summary.by_surface.worker, 1);
  assert.equal(payload.packages[0].name, '@create-something/database-worker');
  assert.equal(payload.packages[0].docs.agents, 'packages/database-worker/AGENTS.md');
  assert.equal(payload.packages[0].docs.agent, null);
});
