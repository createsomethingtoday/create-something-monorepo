import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildPilotPlan, renderMarkdown } from '../repo-split-pilot-plan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'repo-split-pilot-plan.mjs');

function fixtureRegistry() {
  return {
    version: 1,
    summary: {
      totalSurfaces: 4,
    },
    surfaces: [
      {
        path: 'packages/agency/clients/outerfields',
        name: '@create-something/outerfields',
        ownership: 'mirrored',
        authorityConfidence: 'medium',
        syncMode: 'subtree',
        referencedRepositories: ['createsomethingtoday/outerfields-presentations'],
        workspaceDependencies: [],
        externalReferences: [{ relationship: 'subtree-sync' }],
        cautions: ['Treat this as a sync or mirror relationship until the authority direction is explicit.'],
      },
      {
        path: 'apps/marketplace-template-submission-cloud',
        name: '@create-something/marketplace-template-submission-cloud',
        ownership: 'mirrored',
        authorityConfidence: 'medium',
        syncMode: 'mirror-redundancy',
        referencedRepositories: ['createsomethingtoday/webflow-library-submission-form'],
        workspaceDependencies: [{ name: '@create-something/mcp-core', spec: 'workspace:*' }],
        externalReferences: [{ relationship: 'marketplace-config' }],
        cautions: ['Marketplace/config references may be registration dependencies rather than code ownership.'],
      },
      {
        path: 'packages/notion-tools',
        name: '@create-something/notion-tools',
        ownership: 'unclear',
        authorityConfidence: 'low',
        syncMode: 'none',
        referencedRepositories: ['create-something/create-something-monorepo'],
        workspaceDependencies: [],
        externalReferences: [],
        cautions: ['Repository metadata points at create-something/create-something-monorepo.'],
      },
      {
        path: 'packages/mcp-core',
        name: '@create-something/mcp-core',
        ownership: 'monorepo',
        authorityConfidence: 'high',
        syncMode: 'none',
        referencedRepositories: [],
        workspaceDependencies: [],
        externalReferences: [],
        cautions: [],
      },
    ],
  };
}

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'repo-split-pilot-plan-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeJson(path.join(root, 'config', 'repo-ownership-registry.generated.json'), fixtureRegistry());
  return root;
}

function writeFile(filePath, text) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text, 'utf8');
}

function writeJson(filePath, value) {
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test('builds a non-mutating pilot order from ownership registry', () => {
  const plan = buildPilotPlan(fixtureRegistry());

  assert.equal(plan.summary.candidateCount, 3);
  assert.equal(plan.summary.recommendedPilot, 'apps/marketplace-template-submission-cloud');
  assert.deepEqual(plan.recommendedOrder.slice(0, 2), [
    'apps/marketplace-template-submission-cloud',
    'packages/agency/clients/outerfields',
  ]);

  const first = plan.candidates[0];
  assert.equal(first.action, 'Pilot repo reconciliation');
  assert.match(first.approvalGates.join('\n'), /No repository creation/);
  assert.match(first.approvalGates.join('\n'), /Resolve workspace dependencies/);

  const metadata = plan.candidates.find((candidate) => candidate.surfacePath === 'packages/notion-tools');
  assert.equal(metadata.relationshipType, 'metadata-hygiene');
  assert.equal(metadata.action, 'Fix metadata before split planning');
});

test('renders advisory markdown with approval gates', () => {
  const markdown = renderMarkdown(buildPilotPlan(fixtureRegistry()));

  assert.match(markdown, /Repo Split Pilot Plan/);
  assert.match(markdown, /advisory plan/);
  assert.match(markdown, /apps\/marketplace-template-submission-cloud/);
  assert.match(markdown, /Mutation approval required: yes/);
});

test('--check fails when outputs are missing and passes after generation', (t) => {
  const root = makeWorkspace(t);

  const missing = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Repo split pilot plan is stale/);

  const generate = spawnSync(process.execPath, [SCRIPT, '--root', root], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(generate.status, 0, generate.stderr || generate.stdout);

  const current = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(current.status, 0, current.stderr || current.stdout);
  assert.match(current.stdout, /Repo split pilot plan is current/);

  const generated = JSON.parse(
    readFileSync(path.join(root, 'config', 'repo-split-pilot-plan.generated.json'), 'utf8'),
  );
  assert.equal(generated.summary.recommendedPilot, 'apps/marketplace-template-submission-cloud');
});
