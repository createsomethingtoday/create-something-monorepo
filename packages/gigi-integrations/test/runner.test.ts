import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
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

test('context configuration details distinguish input and scoped policy without leaking paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-context-detail-'));
  try {
    for (const [name, input, detail] of [
      ['query', {query:'x'.repeat(201)}, 'query_bounds'],
      ['limit', {query:'synthetic',limit:6}, 'limit_bounds'],
      ['missing', {query:'synthetic'}, 'scoped_config_missing'],
      ['mismatch', {query:'synthetic'}, 'scoped_config_mismatch'],
    ] as const) {
      const dataDir=join(root,name); await mkdir(join(dataDir,'ctx'),{recursive:true});
      if(name==='missing')await writeFile(join(dataDir,'ctx','private-fixture'),'secret');
      if(name==='mismatch')await writeFile(join(dataDir,'ctx','config.toml'),'secret-config');
      const result=await runOperation({operation:'context.search',input},{dataDir,ctxBinary:'/nonexistent-fixture'});
      assert.deepEqual(result,{ok:false,error:{operation:'context.search',reason:'invalid_configuration',detail}});
      assert.ok(!JSON.stringify(result).includes(root));assert.ok(!JSON.stringify(result).includes('secret'));
    }
  } finally {await rm(root,{recursive:true});}
});

test('bounded source window filters a page without losing its continuation or claiming full coverage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-window-'));
  await writeFile(join(root, 'broker-session.json'), JSON.stringify({ baseUrl: 'https://gigi-connector.createsomething.workers.dev', accessToken: 'synthetic-token',
    refreshToken: 'synthetic-refresh', clientId: 'client-1', sub: 'user-1', expiresAt: Math.floor(Date.now() / 1000) + 3600, status: 'active' }), { mode: 0o600 });
  try {
    let requests = 0;
    const result = await runOperation({ operation: 'connections.import', input: {
      provider: 'gmail', connectedAccountId: 'ca_123', workspaceId: 'workspace-1',
      selection: { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' },
    } }, { dataDir: root, fetch: async (request) => {
      requests += 1;
      assert.equal(new URL((request as Request).url).searchParams.has('q'), false);
      return Response.json({ provider: 'gmail', connectedAccountId: 'ca_123', nextCursor: 'another-page', records: [
        { externalId: 'old', kind: 'message', observedAt: '2026-10-03T12:00:00Z', data: { subject: 'Outside', date: '2026-09-30T23:59:59Z' } },
        { externalId: 'selected', kind: 'message', observedAt: '2026-10-03T12:00:00Z', data: { subject: 'Inside', date: '2026-10-01T00:00:00Z' } },
      ] });
    } });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const value = result.value as { records: Array<{ title: string }>; nextCursor: string; coverage: Record<string, unknown> };
    assert.deepEqual(value.records.map((row) => row.title), ['Inside']);
    assert.equal(value.nextCursor, 'another-page');
    assert.deepEqual(value.coverage, { scannedCount: 2, selectedCount: 1, excludedCount: 1, unknownDateCount: 0,
      complete: false, dateFiltering: 'page-local', dateWindow: 'message-date-or-event-overlap' });
    assert.equal(requests, 1);
  } finally { await rm(root, { recursive: true }); }
});

test('source selection rejects unsupported calendars and invalid windows before reading a provider', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-scope-'));
  try {
    let requests = 0;
    for (const [provider, selection] of [
      ['gmail', { from: '2026-02-30T00:00:00Z' }],
      ['gmail', { from: '2026-10-02T00:00:00Z', to: '2026-10-01T00:00:00Z' }],
      ['gmail', { from: '2026-10-01' }],
      ['gmail', { from: '2026-10-01T00:00:00-05:00' }],
      ['gmail', { q: 'broader-scope' }],
      ['gmail', { calendarId: 'primary' }],
      ['googlecalendar', { calendarId: 'someone-else' }],
      ['googlecalendar', []],
    ] as const) {
      const result = await runOperation({ operation: 'connections.import', input: {
        provider, workspaceId: 'workspace-1', connectedAccountId: 'ca_123', selection,
      } }, { dataDir: root, fetch: async () => { requests += 1; throw new Error('must not read'); } });
      assert.deepEqual(result, { ok: false, error: { operation: 'connections.import', reason: 'invalid_request' } });
    }
    assert.equal(requests, 0);
  } finally { await rm(root, { recursive: true }); }
});

test('calendar windows include overlapping timed events, report all-day uncertainty and preserve empty-page cursors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-calendar-window-'));
  await writeFile(join(root, 'broker-session.json'), JSON.stringify({ baseUrl: 'https://gigi-connector.createsomething.workers.dev', accessToken: 'synthetic-token',
    refreshToken: 'synthetic-refresh', clientId: 'client-1', sub: 'user-1', expiresAt: Math.floor(Date.now() / 1000) + 3600, status: 'active' }), { mode: 0o600 });
  const request = { operation: 'connections.import', input: { provider: 'googlecalendar', workspaceId: 'workspace-1', connectedAccountId: 'ca_123',
    selection: { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z', calendarId: 'primary' } } };
  const record = (id: string, start: Record<string, string>, end: Record<string, string>) => ({ externalId: id, kind: 'event', observedAt: '2026-10-03T00:00:00Z', data: { calendarId: 'synthetic-calendar', summary: id, start, end } });
  try {
    const result = await runOperation(request, { dataDir: root, fetch: async () => Response.json({ provider: 'googlecalendar', connectedAccountId: 'ca_123', nextCursor: 'more', records: [
      record('overlap', { dateTime: '2026-09-30T23:00:00Z', timeZone: 'UTC' }, { dateTime: '2026-10-01T01:00:00Z', timeZone: 'UTC' }),
      record('at-end', { dateTime: '2026-10-02T00:00:00Z' }, { dateTime: '2026-10-02T01:00:00Z' }),
      record('all-day', { date: '2026-10-01', timeZone: 'America/Chicago' }, { date: '2026-10-02', timeZone: 'America/Chicago' }),
    ] }) });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const value = result.value as { records: Array<{ title: string; source: { calendarTiming: unknown } }>; coverage: Record<string, unknown> };
    assert.deepEqual(value.records.map((row) => row.title), ['overlap']);
    assert.deepEqual(value.records[0]?.source.calendarTiming, { start: { dateTime: '2026-09-30T23:00:00Z', timeZone: 'UTC' }, end: { dateTime: '2026-10-01T01:00:00Z', timeZone: 'UTC' }, endExclusive: true });
    assert.equal(value.coverage.unknownDateCount, 1);
    assert.equal(value.coverage.scannedCount, 3);
    const empty = await runOperation(request, { dataDir: root, fetch: async () => Response.json({ provider: 'googlecalendar', connectedAccountId: 'ca_123', nextCursor: 'more', records: [
      record('at-end', { dateTime: '2026-10-02T00:00:00Z' }, { dateTime: '2026-10-02T01:00:00Z' }),
    ] }) });
    assert.equal(empty.ok, true);
    if (empty.ok) {
      const page = empty.value as { records: unknown[]; nextCursor: string; coverage: { complete: boolean } };
      assert.deepEqual(page.records, []);
      assert.equal(page.nextCursor, 'more');
      assert.equal(page.coverage.complete, false);
    }
  } finally { await rm(root, { recursive: true }); }
});


test('source sign-out clears only the local session and is safe to repeat', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-runner-logout-'));
  const session = join(root, 'broker-session.json');
  await writeFile(session, JSON.stringify({ baseUrl: 'https://gigi-connector.createsomething.workers.dev', accessToken: 'synthetic-token',
    refreshToken: 'synthetic-refresh', clientId: 'client-1', sub: 'user-1', expiresAt: Math.floor(Date.now() / 1000) + 3600, status: 'active' }), { mode: 0o600 });
  const localRecord = join(root, 'synthetic-local-record');
  await writeFile(localRecord, 'keep imported data');
  let requests = 0;
  const options = { dataDir: root, fetch: async () => { requests += 1; throw new Error('sign-out must not call provider'); } };
  try {
    assert.deepEqual(await runOperation({ operation: 'auth.logout', input: {} }, options), { ok: true, value: { signedOut: true, localOnly: true } });
    await assert.rejects(stat(session), { code: 'ENOENT' });
    assert.deepEqual(await runOperation({ operation: 'connections.status', input: { provider: 'gmail' } }, options), { ok: false, error: { operation: 'connections.status', reason: 'reauthentication_required' } });
    assert.deepEqual(await runOperation({ operation: 'auth.logout', input: {} }, options), { ok: true, value: { signedOut: true, localOnly: true } });
    assert.equal(await readFile(localRecord, 'utf8'), 'keep imported data');
    assert.equal(requests, 0);
  } finally { await rm(root, { recursive: true }); }
});
