import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Always create isolated synthetic profiles. Never default to an installed app or real HOME.
assert.ok(process.argv[2], 'Usage: node source-proposal-acceptance.mjs /explicit/path/to/gigi-mcp');
const binary = resolve(process.argv[2]);
const binarySha256 = createHash('sha256').update(await readFile(binary)).digest('hex');
const root = await mkdtemp(join(tmpdir(), 'gigi-source-proposal-acceptance-'));
const checks = [];
const processes = new Set();
let calls = 0;
let report;
function start(profile) {
  const child = spawn(binary, [], { env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: root, GIGI_DATA_DIR: join(root, profile) }, stdio: ['pipe', 'pipe', 'pipe'] });
  processes.add(child);
  let sequence = 0, buffer = '', errors = '';
  const pending = new Map();
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-2000); });
  child.stdout.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const end = buffer.indexOf('\n');
      const response = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
      const waiter = pending.get(response.id);
      if (waiter) { clearTimeout(waiter.timeout); pending.delete(response.id); waiter.resolve(response); }
    }
  });
  const fail = error => { for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(error); } pending.clear(); };
  child.on('error', fail);
  child.on('exit', code => { processes.delete(child); if (pending.size) fail(new Error(`MCP exited ${code}: ${errors}`)); });
  return {
    async call(name, args = {}, reject = false) {
      calls++;
      const id = ++sequence;
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`MCP timeout: ${name}`)); }, 10000);
        pending.set(id, { resolve, reject, timeout });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } })}\n`);
      });
      assert.equal(response.error, undefined, JSON.stringify(response.error));
      if (reject) { assert.equal(response.result.isError, true); return; }
      assert.notEqual(response.result.isError, true, JSON.stringify(response.result.content));
      return JSON.parse(response.result.content.find(item => item.type === 'text').text);
    },
    async close() { child.stdin.end(); await exited; },
  };
}
const lookup = input => ({ workspaceId: input.workspaceId, entity: input.entity, id: input.id, saveReceipt: { idempotencyKey: input.idempotencyKey, expectedInput: input } });
const clone = value => JSON.parse(JSON.stringify(value));
try {
  let client = start('primary');
  const workspace = await client.call('gigi_workspace_create', { name: 'Synthetic acceptance only' });
  const fixtures = [];
  for (const [entity, provider] of [['interactions', 'gmail'], ['schedule', 'googlecalendar']]) {
    const source = await client.call('gigi_records_save', { workspaceId: workspace.id, entity, title: `Synthetic ${provider}`, fields: entity === 'schedule' ? { Date: '2026-11-01T06:30:00Z/2026-11-01T07:30:00Z', 'All Day': false } : {}, source: { kind: 'import', provider, connectedAccountId: `ca_synthetic_${provider}`, collectionId: 'synthetic_collection', externalId: 'synthetic_external', timeZone: 'America/Chicago' } });
    for (const target of ['tasks', 'gigs']) {
      const input = { workspaceId: workspace.id, entity: target, id: `synthetic_${provider}_${target}`, title: `Review synthetic ${provider}`, fields: { Status: 'Open' }, idempotencyKey: `synthetic_${provider}_${target}`, sourceRecord: { entity, id: source.id, connectedAccountId: source.source.connectedAccountId, expectedRecord: { title: source.title, fields: source.fields, source: source.source } } };
      assert.deepEqual(await client.call('gigi_records_get', lookup(input)), { receiptFound: false });
      const saved = await client.call('gigi_records_save', input);
      assert.equal(saved.sourceProposal.outcome, 'created');
      assert.equal(saved.relationCount, 1);
      assert.equal(saved.source.timeZone, 'America/Chicago');
      assert.equal(saved.source.connectedAccountId, input.sourceRecord.connectedAccountId);
      fixtures.push({ input, saved });
    }
  }
  checks.push('four Gmail/Calendar to task/gig creates preserve source and relation');
  await client.close();
  client = start('primary');
  for (const { input, saved } of fixtures) {
    assert.deepEqual(await client.call('gigi_records_save', input), saved);
    const reopened = await client.call('gigi_records_get', { workspaceId: workspace.id, entity: input.entity, id: saved.id, detail: 'full' });
    assert.equal(reopened.id, saved.id); assert.equal(reopened.relationCount, 1);
    assert.deepEqual((await client.call('gigi_records_get', lookup(input))).record, saved);
  }
  checks.push('process restart exact retry, full reopen, read-only created receipt');
  const input = clone(fixtures[0].input);
  await client.call('gigi_records_save', { workspaceId: workspace.id, entity: input.entity, id: input.id, title: 'User corrected title' });
  const duplicate = { ...input, id: 'synthetic_duplicate_intended_id', idempotencyKey: 'synthetic_duplicate_key' };
  const existing = await client.call('gigi_records_save', duplicate);
  assert.equal(existing.sourceProposal.outcome, 'existing'); assert.equal(existing.id, input.id); assert.equal(existing.title, 'User corrected title');
  await client.close();
  client = start('primary');
  const recovered = await client.call('gigi_records_get', lookup(duplicate));
  assert.deepEqual(recovered.record, existing);
  assert.deepEqual(await client.call('gigi_records_save', duplicate), existing);
  for (const entity of ['tasks', 'gigs']) assert.equal((await client.call('gigi_records_list', { workspaceId: workspace.id, entity, limit: 10 })).count, 2);
  checks.push('duplicate receipt recovery after restart preserves user corrections and original ID without extra records');
  const before = await client.call('gigi_history_list', { workspaceId: workspace.id, limit: 50 });
  const missing = { ...input, id: 'not_written', idempotencyKey: 'not_written' };
  assert.deepEqual(await client.call('gigi_records_get', lookup(missing)), { receiptFound: false });
  const forged = clone(input); forged.sourceRecord.connectedAccountId = 'ca_wrong';
  await client.call('gigi_records_get', lookup(forged), true);
  forged.id = 'synthetic_wrong_account'; forged.idempotencyKey = 'synthetic_wrong_account';
  await client.call('gigi_records_save', forged, true);
  const stale = clone(input); stale.id = 'synthetic_stale'; stale.idempotencyKey = 'synthetic_stale'; stale.sourceRecord.expectedRecord.title = 'Outdated source';
  await client.call('gigi_records_save', stale, true);
  const wrongWorkspace = clone(input); wrongWorkspace.workspaceId = 'foreign_workspace';
  await client.call('gigi_records_save', wrongWorkspace, true);
  await client.call('gigi_records_get', lookup(wrongWorkspace), true);
  assert.deepEqual(await client.call('gigi_history_list', { workspaceId: workspace.id, limit: 50 }), before);
  checks.push('missing receipt, wrong account/workspace and stale proposal reject without history mutation');
  const other = start('separate-profile');
  await other.call('gigi_workspace_create', { name: 'Separate synthetic workspace' });
  await other.call('gigi_records_get', lookup(input), true);
  await other.close(); await client.close();
  checks.push('separate process profile cannot read primary receipt');
  report = { passed: true, binary, binarySha256, calls, checks, syntheticProfiles: true, cleanup: 'temporary profiles removed', providerCalls: 0 };
} finally {
  for (const child of processes) child.kill();
  await rm(root, { recursive: true, force: true });
}

console.log(JSON.stringify(report, null, 2));
