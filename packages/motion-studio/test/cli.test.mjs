import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('plans the real Signal Decision Proof scene with a preflight cost', () => {
  const scenePath = fileURLToPath(
    new URL(
      '../../agency/content/assets/brand/create-something-stop-motion-signal-proof.v20260719/source/scene.v3.json',
      import.meta.url
    )
  );
  const cliPath = fileURLToPath(new URL('../dist/scene/cli.js', import.meta.url));
  const result = spawnSync(
    process.execPath,
    [cliPath, 'plan', '--scene', scenePath, '--quality', 'draft'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.sceneId, 'create-something.signal-decision-proof.v3');
  assert.equal(plan.estimatedSpendUsd, 0.8);
  assert.equal(plan.withinBudget, true);
  assert.deepEqual(plan.pendingCellIds, ['proof-resolution-v1']);
});
