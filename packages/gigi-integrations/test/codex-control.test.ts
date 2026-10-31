import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, chmod, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect } from 'node:net';
import { cancellationControl } from '../src/codex-control.ts';

async function request(path: string, operation: string) {
  return new Promise<any>((resolve, reject) => {
    const client = connect(path); let bytes = '';
    const timeout = setTimeout(() => { client.destroy(); reject(new Error('Control request stalled')); }, 1000);
    client.on('connect', () => client.write(JSON.stringify({ id: 1, operation, input: { workspaceId: 'w', sessionId: 's' } }) + '\n'));
    client.on('data', chunk => { bytes += chunk; });
    client.on('error', error => { clearTimeout(timeout); reject(error); });
    client.on('end', () => { clearTimeout(timeout); resolve(JSON.parse(bytes)); });
  });
}

test('private control socket delivers cancellation independently and refuses ordinary writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-control-')); await chmod(root, 0o700);
  const path = join(root, 'control.sock'); let calls = 0;
  const server = await cancellationControl(path, async input => { calls++; assert.equal(input.sessionId, 's'); return { state: 'interrupted' }; });
  try {
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal((await request(path, 'agent.chat.cancel')).ok, true);
    assert.equal((await request(path, 'agent.chat.approve')).error.reason, 'invalid_request');
    assert.equal(calls, 1);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('control socket rejects a non-private parent directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-control-public-')); await chmod(root, 0o755);
  await assert.rejects(cancellationControl(join(root, 'control.sock'), async () => ({})), /invalid_control_path/);
});
