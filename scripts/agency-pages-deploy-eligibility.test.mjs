import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  comparisonForAgencyPush,
  evaluateAgencyDeployEligibility
} from './agency-pages-deploy-eligibility.mjs';

test('branch pushes compare owned work to main instead of the previous branch head', () => {
  assert.deepEqual(
    comparisonForAgencyPush({
      refName: 'codex/CRE-1272-main-home-base',
      before: '1111111111111111111111111111111111111111',
      after: '2222222222222222222222222222222222222222'
    }),
    ['origin/main...2222222222222222222222222222222222222222']
  );

  assert.deepEqual(
    comparisonForAgencyPush({
      refName: 'main',
      before: '1111111111111111111111111111111111111111',
      after: '2222222222222222222222222222222222222222'
    }),
    ['1111111111111111111111111111111111111111', '2222222222222222222222222222222222222222']
  );
});

test('generic root and deployment-policy files stay build-only', () => {
  assert.deepEqual(
    evaluateAgencyDeployEligibility({
      eventName: 'push',
      changedPaths: [
        'package.json',
        'pnpm-lock.yaml',
        'scripts/run-wrangler.mjs',
        '.github/workflows/agency-pages-deploy.yml'
      ]
    }),
    { eligible: false, reason: 'no Agency runtime source change; build-only guard' }
  );
});

test('Agency, Canon, and Tufte source changes are deploy-eligible', () => {
  for (const changedPath of [
    'packages/agency/src/routes/+page.svelte',
    'packages/canon/src/lib/Button.svelte',
    'packages/tufte/src/lib/index.ts'
  ]) {
    assert.deepEqual(
      evaluateAgencyDeployEligibility({ eventName: 'push', changedPaths: [changedPath] }),
      { eligible: true, reason: `Agency runtime source changed: ${changedPath}` }
    );
  }
});

test('manual dispatch remains explicit and unsupported events fail closed', () => {
  assert.deepEqual(
    evaluateAgencyDeployEligibility({ eventName: 'workflow_dispatch', changedPaths: [] }),
    { eligible: true, reason: 'manual workflow dispatch' }
  );
  assert.deepEqual(
    evaluateAgencyDeployEligibility({ eventName: 'pull_request', changedPaths: [] }),
    { eligible: false, reason: 'unsupported event: pull_request' }
  );
});

test('a failed Git comparison emits two valid fail-closed outputs', () => {
  const result = spawnSync(
    process.execPath,
    [
      new URL('./agency-pages-deploy-eligibility.mjs', import.meta.url).pathname,
      '--event',
      'push',
      '--ref',
      'main',
      '--before',
      '1111111111111111111111111111111111111111',
      '--after',
      '2222222222222222222222222222222222222222'
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0);
  const outputLines = result.stdout.trim().split('\n');
  assert.equal(outputLines.length, 2);
  assert.equal(outputLines[0], 'eligible=false');
  assert.match(
    outputLines[1],
    /^reason=unable to determine changed paths; build-only guard \(.+\)$/
  );
});

test('workflow triggers its policy and gates deploy plus preview emission', async () => {
  const workflow = await readFile(
    new URL('../.github/workflows/agency-pages-deploy.yml', import.meta.url),
    'utf8'
  );

  assert.equal(
    workflow.match(/scripts\/agency-pages-deploy-eligibility\.mjs/g)?.length,
    2,
    'the eligibility policy must trigger and execute its own workflow'
  );
  assert.match(workflow, /name: Resolve deploy eligibility/);
  assert.match(workflow, /name: Skip Agency deploy/);

  for (const stepName of ['Deploy Agency to Cloudflare Pages', 'Emit preview URL']) {
    const escapedName = stepName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      workflow,
      new RegExp(`name: ${escapedName}\\n\\s+if: .*steps\\.deploy\\.outputs\\.eligible == 'true'`)
    );
  }
});
