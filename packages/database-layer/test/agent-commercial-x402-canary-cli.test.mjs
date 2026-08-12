import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const script = new URL('../scripts/agent-commercial-x402-canary.mjs', import.meta.url);

test('wallet-create emits only the address and stores the disposable key mode 0600', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cre-1701-wallet-test-'));
  const keyFile = join(directory, 'payer.key');

  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      script.pathname,
      'wallet-create',
      '--key-file',
      keyFile
    ]);
    const output = JSON.parse(stdout);
    const privateKey = (await readFile(keyFile, 'utf8')).trim();
    const keyStat = await stat(keyFile);

    assert.equal(stderr, '');
    assert.equal(keyStat.mode & 0o777, 0o600);
    assert.match(output.address, /^0x[0-9a-fA-F]{40}$/);
    assert.match(privateKey, /^0x[0-9a-fA-F]{64}$/);
    assert.doesNotMatch(stdout, new RegExp(privateKey.slice(2), 'i'));

    await chmod(keyFile, 0o644);
    await assert.rejects(
      execFileAsync(process.execPath, [script.pathname, 'preflight', '--key-file', keyFile]),
      (error) => {
        assert.doesNotMatch(error.stderr, new RegExp(privateKey.slice(2), 'i'));
        assert.match(error.stderr, /"errorType":"Error"/);
        return true;
      }
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
