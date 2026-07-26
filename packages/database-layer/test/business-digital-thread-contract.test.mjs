import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('Business Digital Thread v1 contract, red-team cases, and scale oracle stay frozen', async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['scripts/verify-business-digital-thread-contract.mjs'],
    {
      cwd: new URL('..', import.meta.url),
      maxBuffer: 1024 * 1024
    }
  );
  const report = JSON.parse(stdout);

  assert.equal(report.status, 'pass');
  assert.equal(report.fixtureId, 'bdt-fixture-ten-year-30000-v1');
  assert.equal(report.counts.participantRelationships, 30_000);
  assert.equal(report.counts.months, 120);
  assert.equal(report.counts.recordKinds, 24);
  assert.deepEqual(report.negativeCasesRejected, [
    'invalid-present-only.json',
    'invalid-untyped-audit-log.json',
    'invalid-hand-authored-success.json'
  ]);
});
