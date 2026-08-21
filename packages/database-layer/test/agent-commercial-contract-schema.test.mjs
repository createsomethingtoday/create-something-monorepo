import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('CREATE SOMETHING agent commercial contract is schema-valid and fail-closed', async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['scripts/verify-agent-commercial-contract.mjs'],
    {
      cwd: new URL('..', import.meta.url)
    }
  );
  const report = JSON.parse(stdout);

  assert.equal(report.status, 'pass');
  assert.equal(report.contractId, 'create-something.agent-commercial.v1');
  assert.equal(report.defaultDecision, 'deny');
  assert.equal(report.receiptsRequired, true);
  assert.deepEqual(report.accessClasses, ['entitled', 'free', 'paid', 'private']);
  assert.equal(report.paymentActivation, 'approval_required');
});
