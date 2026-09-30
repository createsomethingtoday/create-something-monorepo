import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { runOperation } from '../src/runner.ts';

test('runner reports unconfigured broker without claiming a connection', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-'));
  try {
    const result = await runOperation({ operation: 'connections.status', input: { provider: 'gmail' } }, { dataDir: root });
    assert.deepEqual(result, { ok: false, error: { operation: 'connections.status', reason: 'reauthentication_required' } });
  } finally { await rm(root, { recursive: true }); }
});

test('runner requires private session file and never returns its bearer token', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-session-'));
  const session = join(root, 'broker-session.json');
  await writeFile(session, JSON.stringify({ baseUrl: 'https://gigi-connector.createsomething.workers.dev', accessToken: 'secret-token',
    refreshToken: 'refresh-secret', clientId: 'client-1', sub: 'user-1', expiresAt: Math.floor(Date.now() / 1000) + 3600, status: 'active' }));
  try {
    await chmod(session, 0o644);
    const unsafe = await runOperation({ operation: 'connections.status', input: { provider: 'gmail' } }, { dataDir: root });
    assert.deepEqual(unsafe, { ok: false, error: { operation: 'connections.status', reason: 'unsafe_session_file' } });
    await chmod(session, 0o600);
    const result = await runOperation({ operation: 'connections.status', input: { provider: 'gmail' } }, {
      dataDir: root,
      fetch: async () => Response.json({ provider: 'gmail', state: 'connected', connectedAccountId: 'account-1' }),
    });
    assert.deepEqual(result, { ok: true, value: { provider: 'gmail', state: 'connected', connectedAccountId: 'account-1' } });
    assert.equal(JSON.stringify(result).includes('secret-token'), false);
  } finally { await rm(root, { recursive: true }); }
});

test('connections import returns canonical local inputs only after verified broker page', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-import-'));
  const session = join(root, 'broker-session.json');
  await writeFile(session, JSON.stringify({ baseUrl: 'https://gigi-connector.createsomething.workers.dev', accessToken: 'secret-token',
    refreshToken: 'refresh-secret', clientId: 'client-1', sub: 'user-1', expiresAt: Math.floor(Date.now() / 1000) + 3600, status: 'active' }), { mode: 0o600 });
  try {
    const result = await runOperation({ operation: 'connections.import', input: { provider: 'gmail', connectedAccountId: 'ca_123', workspaceId: 'workspace-1' } }, {
      dataDir: root,
      fetch: async () => Response.json({ provider: 'gmail', connectedAccountId: 'ca_123', nextCursor: null,
        records: [{ externalId: 'msg-1', kind: 'message', observedAt: '2026-09-30T12:00:00Z', data: { subject: 'Hello', threadId: 'thread-1' } }] }),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      const value = result.value as Record<string, unknown>;
      assert.equal((value.records as Array<Record<string, unknown>>)[0]?.entity, 'interactions');
      assert.equal((value.records as Array<Record<string, unknown>>)[0]?.workspaceId, 'workspace-1');
      assert.equal(JSON.stringify(value).includes('secret-token'), false);
    }
  } finally { await rm(root, { recursive: true }); }
});

test('context sync imports the app-owned history export without a user-supplied path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-ctx-'));
  const imports = join(root, 'imports');
  const binary = join(root, 'ctx-fixture');
  await mkdir(imports);
  await writeFile(join(imports, 'gigi-history.jsonl'), '{"record_type":"manifest","schema_version":"ctx-history-jsonl-v2"}\n');
  await writeFile(binary, '#!/usr/bin/env node\nconsole.log(JSON.stringify({schema_version:2,outcome:"success",failure_scope:"none",sources:[{status:"published"}],totals:{current_indexed_documents:1,current_rejected_records:0,failed_sources:0}}));\n');
  await chmod(binary, 0o700);
  try {
    const result = await runOperation({ operation: 'context.sync', input: {} }, { dataDir: root, ctxBinary: binary });
    assert.deepEqual(result, { ok: true, value: { imported: true } });
  } finally { await rm(root, { recursive: true }); }
});
