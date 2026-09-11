import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { load as loadRetiredAgent } from '../src/routes/agents/[agentId]/+page.server.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');

function read(relativePath: string): string {
  return readFileSync(resolve(workspaceRoot, relativePath), 'utf8');
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:svelte|ts)$/.test(entry.name) ? [path] : [];
  });
}

const agentsSource = read('packages/ona-agents/src/routes/agents/+page.svelte');
const signInSource = read('packages/ona-agents/src/routes/sign-in/+page.svelte');
const layoutSource = read('packages/ona-agents/src/routes/+layout.svelte');
const identitySource = read('packages/ona-agents/src/lib/server/auth/identity-access.ts');

test('classifies the complete retirement property truthfully', () => {
  const retirement = performancePageRegistry.find((group) => group.id === 'ona-agent-index');
  const detail = performancePageRegistry.find((group) => group.id === 'ona-agent-detail');
  const signIn = performancePageRegistry.find((group) => group.id === 'ona-sign-in');

  assert.equal(retirement?.status, 'migrated');
  assert.equal(retirement?.contract?.archetype, 'editorial');
  assert.match(retirement?.contract?.decision ?? '', /retir|closed|transition/i);
  assert.deepEqual(retirement?.contract?.chapters.map((chapter) => chapter.id), [
    'thesis',
    'evidence-body',
    'continuation'
  ]);

  assert.equal(detail?.status, 'technical-exclusion');
  assert.equal(detail?.exclusion?.kind, 'redirect');
  assert.match(detail?.exclusion?.reason ?? '', /308/);
  assert.match(detail?.exclusion?.reason ?? '', /\/agents/);

  assert.equal(signIn?.status, 'migrated');
  assert.equal(signIn?.contract?.archetype, 'tool');
});

test('makes the retirement decision compact and clear at first encounter', () => {
  assert.equal((agentsSource.match(/data-performance-chapter=/g) ?? []).length, 3);
  for (const chapter of ['thesis', 'evidence-body', 'continuation']) {
    assert.match(agentsSource, new RegExp(`data-performance-chapter="${chapter}"`));
  }

  assert.match(agentsSource, /standalone (?:agent )?app is closed/i);
  assert.match(agentsSource, /CREATE SOMETHING (?:now )?(?:runs|owns)/i);
  assert.doesNotMatch(
    agentsSource,
    /runtime boundary|Cloudflare substrate|provider-neutral|D1 continuation|MCP allowlists|edge admission/i
  );
  assert.doesNotMatch(agentsSource, /PerformanceThesisConditions|PerformanceEvidenceIndex/);
});

test('preserves every transition receipt and keeps historical Dify code unreachable', () => {
  for (const required of [
    'CRE-1233-RUNTIME',
    'CRE-1233-ROUTE',
    'CRE-1233-GATE',
    '2026-07-13',
    'Awaiting approval',
    'https://createsomething.agency/stack'
  ]) {
    assert.ok(agentsSource.includes(required), `retirement notice lost ${required}`);
  }
  assert.match(agentsSource, /Deploying, merging, or deleting the old provider secrets requires/i);
  assert.match(agentsSource, /approval/i);
  assert.match(agentsSource, /rollback/i);

  const activeSources = sourceFiles(resolve(workspaceRoot, 'packages/ona-agents/src/routes'));
  for (const path of activeSources) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /(?:\$lib|src\/lib|lib)\/server\/dify/);
  }
});

test('keeps sign-in fail-closed while making destination and recovery visible', async () => {
  const returnPathModule = await import(
    pathToFileURL(
      resolve(workspaceRoot, 'packages/ona-agents/src/lib/server/auth/return-path.ts')
    ).href
  );
  const safeAgentReturnPath = returnPathModule.safeAgentReturnPath as (
    value: string | null
  ) => string;
  const labelAgentReturnPath = returnPathModule.labelAgentReturnPath as (value: string) => string;

  assert.equal(safeAgentReturnPath('/agents?from=sign-in'), '/agents?from=sign-in');
  assert.equal(safeAgentReturnPath('/sign-in?redirect=/agents'), '/agents');
  assert.equal(safeAgentReturnPath('//evil.example'), '/agents');
  assert.equal(safeAgentReturnPath('https://evil.example'), '/agents');
  assert.equal(safeAgentReturnPath(null), '/agents');
  assert.equal(
    labelAgentReturnPath('/agents?from=sign-in'),
    'Agent transition notice (/agents?from=sign-in)'
  );

  assert.match(identitySource, /safeAgentReturnPath/);
  assert.match(signInSource, /returnDestinationLabel/);
  assert.match(signInSource, /After sign-in/);
  assert.match(signInSource, /friendlySignInError/);
  assert.match(signInSource, /The email or password did not match/);
  assert.match(signInSource, /<noscript>/);
  assert.doesNotMatch(signInSource, /error = payload\.error/);

  assert.match(layoutSource, /currentPath/);
  assert.match(layoutSource, /This account is verified but not approved/);
  assert.match(layoutSource, /Staff sign-in is not ready/);
  assert.match(layoutSource, /Your session could not be verified/);
  assert.doesNotMatch(layoutSource, /href=\{data\.authAccess\.signInUrl\}[\s\S]*Sign in[\s\S]*currentPath === '\/sign-in'/);
});

test('keeps every retired detail request on the permanent redirect boundary', () => {
  assert.throws(
    () => loadRetiredAgent({} as never),
    (error: unknown) => {
      assert.equal((error as { status?: number }).status, 308);
      assert.equal((error as { location?: string }).location, '/agents');
      return true;
    }
  );
});
