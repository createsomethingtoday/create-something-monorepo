import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = resolve(packageRoot, 'fixtures/abercrombie-august-9.json');

test('resolve CLI emits the representative deterministic decision set', () => {
  const result = spawnSync(
    resolve(packageRoot, 'node_modules/.bin/tsx'),
    ['src/cli.ts', 'resolve', '--input', fixture],
    { cwd: packageRoot, encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.summary, { recommend: 1, verify: 1, lead: 2, rejected: 1 });
  assert.deepEqual(
    output.decisions.map((decision: { observationId: string; status: string }) => [
      decision.observationId,
      decision.status
    ]),
    [
      ['fixture-official-20', 'recommend'],
      ['fixture-ltk-15', 'verify'],
      ['fixture-app-only', 'lead'],
      ['fixture-deal-lead', 'lead'],
      ['fixture-expired', 'rejected']
    ]
  );
});

test('CLI fails closed when required request data is invalid', () => {
  const result = spawnSync(
    resolve(packageRoot, 'node_modules/.bin/tsx'),
    ['src/cli.ts', 'live', '--merchant', 'Abercrombie', '--budget', '200'],
    { cwd: packageRoot, encoding: 'utf8' }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /--need.*--zip.*--deadline/i);
});
