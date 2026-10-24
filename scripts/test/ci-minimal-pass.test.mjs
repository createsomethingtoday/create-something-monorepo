import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse } from 'yaml';

const root = new URL('../../', import.meta.url);
const workflow = (name) => parse(readFileSync(new URL(`.github/workflows/${name}.yml`, root), 'utf8'));
// These workflow paths use GitHub's simple * and ** syntax, without exclusions.
function matches(pattern, file) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*')}$`).test(file);
}
const triggered = (name, file, event = 'pull_request') => {
  const paths = workflow(name).on[event]?.paths;
  return paths ? paths.some((path) => matches(path, file)) : Boolean(workflow(name).on[event] === null);
};

test('MCP job runs all stages once, retaining active scope and independent hub checks', () => {
  const job = workflow('mcp-quality-gate').jobs['mcp-quality'];
  assert.equal(job.name, 'Typecheck, Lint, Test MCP Packages');
  assert.equal(job.env.MCP_GATE_SCOPE, 'active');
  const commands = job.steps.map((step) => step.run).filter(Boolean);
  assert.equal(commands.filter((command) => /pnpm mcp:gate(?:\s|$)/.test(command)).length, 1);
  assert(commands.includes('pnpm --filter @create-something/cs-mcp-hub typecheck'));
  assert(commands.includes('pnpm --filter @create-something/cs-mcp-hub test'));
  assert(!job.steps.some((step) => step['continue-on-error']));
});

test('legibility retains its complete verifier without dependency installation', () => {
  const job = workflow('agent-legibility-check').jobs['agent-legibility'];
  assert.equal(job.name, 'Verify package legibility contracts');
  assert(!job.steps.some((step) => /pnpm|install/i.test(`${step.run ?? ''} ${step.uses ?? ''}`)));
  const command = job.steps.map((step) => step.run ?? '').join('\n');
  for (const expected of [
    'node --check scripts/agent-legibility-check.mjs',
    'node --check scripts/agent-legibility-map.mjs',
    'node --test scripts/test/agent-legibility.test.mjs',
    'node scripts/agent-legibility-check.mjs --format json',
    'node scripts/agent-legibility-map.mjs --format json > /dev/null'
  ]) assert(command.includes(expected), expected);
});

test('shared Canon/auth changes reach strict checks and executable auth regressions', () => {
  for (const file of ['packages/canon/src/lib/auth/session.ts', 'packages/canon/src/lib/auth/session-verification.test.ts', 'packages/auth-platform/src/index.ts']) {
    assert(triggered('svelte-strict-check', file), `strict: ${file}`);
    assert(triggered('mcp-authz-policy', file), `authz PR: ${file}`);
    for (const event of ['pull_request', 'push']) assert(triggered('shared-auth-regressions', file, event), `session ${event}: ${file}`);
  }
  const job = workflow('mcp-authz-policy').jobs['authz-policy'];
  assert.equal(job.name, 'Compile and Verify Authz Policy');
  const commands = job.steps.map((step) => step.run ?? '').join('\n');
  const regressions = workflow('shared-auth-regressions').jobs['session-regressions'];
  assert.equal(workflow('shared-auth-regressions').permissions.contents, 'read');
  assert(!regressions.steps.some((step) => /publish|deploy/.test(step.run ?? '')));
  for (const pkg of ['mcp-authz', 'cs-mcp-hub-remote', 'interaction-atlas-mcp', 'identity-worker']) {
    assert(commands.includes(`pnpm --filter @create-something/${pkg} test`));
  }
  const regression = regressions.steps.find((step) => step.run?.includes('node scripts/ci-auth-regressions.mjs'));
  assert(!regression.if);
  assert(!regression['continue-on-error']);
});

test('representative Draw, Rust, lockfile and workflow changes retain their gates', () => {
  for (const [name, file] of [
    ['draw-agent', 'packages/mapping-canvas/src/routes/+page.svelte'],
    ['svelte-strict-check', 'packages/mapping-canvas/src/routes/+page.svelte'],
    ['chatgpt-connection', 'packages/chatgpt-connection/src/lib.rs'],
    ['mcp-quality-gate', 'packages/chatgpt-connection/src/lib.rs'],
    ['mcp-quality-gate', 'pnpm-lock.yaml'],
    ['mcp-authz-policy', 'pnpm-lock.yaml'],
    ['svelte-strict-check', 'pnpm-lock.yaml'],
    ['mcp-quality-gate', '.github/workflows/mcp-quality-gate.yml'],
    ['mcp-authz-policy', '.github/workflows/mcp-authz-policy.yml'],
    ['svelte-strict-check', '.github/workflows/svelte-strict-check.yml'],
    ['agent-legibility-check', '.github/workflows/agent-legibility-check.yml'],
    ['shared-auth-regressions', 'scripts/ci-auth-regressions.mjs'],
    ['shared-auth-regressions', '.github/workflows/shared-auth-regressions.yml'],
    ['shared-auth-regressions', 'packages/canon/vite.config.ts'],
    ['shared-auth-regressions', 'packages/canon/svelte.config.js'],
    ['shared-auth-regressions', 'packages/canon/tsconfig.json'],
    ['shared-auth-regressions', 'packages/io/vite.config.ts'],
    ['shared-auth-regressions', 'packages/io/tsconfig.json'],
    ['mcp-quality-gate', 'scripts/test/ci-minimal-pass.test.mjs']
  ]) assert(triggered(name, file), `${name}: ${file}`);
  assert.equal(workflow('chatgpt-connection').jobs['offline-contracts'].strategy.matrix.os.length, 2);
  assert.equal(workflow('public-distribution-ga').jobs.verify.name, 'Public Distribution GA');
  assert.equal(workflow('github-actions-policy').jobs[Object.keys(workflow('github-actions-policy').jobs)[0]].name, 'Require immutable action references');
});

// Main authz workflow can publish to Oso. New read-only coverage must not
// expand its publication trigger to a shared-library-only merge.
test('shared auth main pushes do not broaden Oso publication triggers', () => {
  for (const file of ['packages/canon/src/lib/auth/session.ts', 'packages/auth-platform/src/index.ts', 'packages/io/test/session-boundary.test.ts']) {
    assert(!triggered('mcp-authz-policy', file, 'push'), file);
    assert(triggered('shared-auth-regressions', file, 'push'), file);
  }
});

test('workflow-only changes execute the contract test for every inspected workflow', () => {
  for (const name of ['mcp-quality-gate', 'agent-legibility-check', 'svelte-strict-check', 'mcp-authz-policy', 'shared-auth-regressions', 'draw-agent', 'chatgpt-connection', 'public-distribution-ga', 'github-actions-policy']) {
    for (const event of ['pull_request', 'push']) {
      assert(triggered('mcp-quality-gate', `.github/workflows/${name}.yml`, event), `${event}: ${name}`);
    }
  }
});
