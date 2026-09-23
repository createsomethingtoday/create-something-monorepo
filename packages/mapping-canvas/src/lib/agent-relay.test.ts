import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { relay } from './agent-relay';
import type { ShareDb } from './share';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../migrations/0003_agent_connections.sql', import.meta.url), 'utf8'));
  const prepare = (sql: string) => {
    let args: (string | number | null)[] = [];
    return { bind(...values: (string | number | null)[]) { args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...args) ?? null; },
      async run() { const result = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; }
    };
  };
  const db = { prepare, async batch(statements: { run: () => Promise<unknown> }[]) { return Promise.all(statements.map(s => s.run())); } } as unknown as ShareDb;
  return { db, sqlite };
}
const now = 1_800_000_000_000;
const tools = [{ name: 'draw_inspect', inputSchema: { type: 'object' } }, { name: 'draw_compose', inputSchema: { type: 'object' } }];
async function setup() {
  const { db, sqlite } = database();
  const connection = await relay(db, { action: 'create', projectId: 'test-project', mode: 'canvas', tools }, '', now) as { sessionId: string; browserToken: string; pairingCode: string };
  const paired = await relay(db, { action: 'pair', code: connection.pairingCode, agentName: 'Test agent' }, '', now) as { agentToken: string };
  const browser = (input: Record<string, unknown>, time = now) => relay(db, { ...input, sessionId: connection.sessionId }, connection.browserToken, time);
  const agent = (input: Record<string, unknown>, time = now) => relay(db, { ...input, sessionId: connection.sessionId }, paired.agentToken, time);
  return { db, sqlite, connection, paired, browser, agent };
}
const command = { action: 'enqueue', commandId: 'command-1', tool: 'draw_compose', arguments: { nodes: [] } };
const poll = { action: 'poll', projectId: 'test-project', mode: 'canvas' };
describe('Draw project relay against SQLite', () => {
  it('pairs once, stores hashed capabilities, claims once, and returns the actual result', async () => {
    const { db, sqlite, connection, paired, browser, agent } = await setup();
    const row = sqlite.prepare('SELECT * FROM draw_agent_sessions').get();
    expect(JSON.stringify(row)).not.toContain(connection.browserToken);
    expect(JSON.stringify(row)).not.toContain(paired.agentToken);
    await expect(relay(db, { action: 'pair', code: connection.pairingCode, agentName: 'Other' }, '', now)).rejects.toThrow('Pairing expired');
    await agent(command);
    expect(await browser(poll)).toMatchObject({ command: { id: 'command-1', tool: 'draw_compose' } });
    expect(await browser(poll)).toMatchObject({ command: null });
    await browser({ action: 'result', commandId: 'command-1', result: { ok: true, ids: ['note-1'] } });
    expect(await agent({ action: 'receipt', commandId: 'command-1' })).toMatchObject({ state: 'completed', result: { ids: ['note-1'] } });
    await agent(command);
    expect(await browser(poll)).toMatchObject({ command: null });
  });
  it('isolates browser/agent roles and project capabilities, and revokes access', async () => {
    const { db, connection, browser, agent } = await setup();
    await expect(relay(db, { action: 'tools', sessionId: connection.sessionId }, connection.browserToken, now)).rejects.toThrow('expired or disconnected');
    await expect(agent(poll)).rejects.toThrow('expired or disconnected');
    await expect(browser({ ...poll, projectId: 'different-project' })).rejects.toThrow('does not match');
    await expect(relay(db, { action: 'tools', sessionId: connection.sessionId }, 'a'.repeat(64), now)).rejects.toThrow();
    await browser({ action: 'revoke' });
    await expect(agent({ action: 'tools' })).rejects.toThrow('expired or disconnected');
  });
  it('never replays interrupted mutations and reports uncertainty after the deadline', async () => {
    const { browser, agent } = await setup();
    await agent(command); await browser(poll);
    expect(await browser(poll, now + 31_000)).toMatchObject({ command: null });
    expect(await agent({ action: 'receipt', commandId: 'command-1' }, now + 31_000)).toMatchObject({ state: 'unknown' });
  });
  it('rejects stale queued commands when the human switches modes and accepts refreshed catalogs', async () => {
    const { browser, agent } = await setup();
    await agent(command);
    await browser({ ...poll, mode: 'motion', tools: [{ name: 'animation_get_state', inputSchema: { type: 'object' } }] });
    expect(await agent({ action: 'receipt', commandId: 'command-1' })).toMatchObject({ state: 'failed' });
    await expect(agent({ ...command, commandId: 'command-2' })).rejects.toThrow('unavailable');
    expect(await agent({ action: 'tools' })).toMatchObject({ mode: 'motion', tools: [{ name: 'animation_get_state' }] });
  });
  it('denies expired/offline sessions, mismatched retries, and oversized arguments', async () => {
    const { agent } = await setup();
    await expect(agent(command, now + 20_000)).rejects.toThrow('reconnection');
    await expect(agent(command, now + 86_400_001)).rejects.toThrow('expired');
    const fresh = await setup();
    await fresh.agent(command);
    await expect(fresh.agent({ ...command, arguments: { different: true } })).rejects.toThrow('already used');
    await expect(fresh.agent({ ...command, commandId: 'large', arguments: { text: 'x'.repeat(300_000) } })).rejects.toThrow('too large');
  });
  it('rejects different arguments for a completed command ID and bounds the active queue atomically', async () => {
    const { agent, browser } = await setup();
    await agent(command); await browser(poll);
    await browser({ action: 'result', commandId: 'command-1', result: { ok: true } });
    await expect(agent({ ...command, arguments: { changed: true } })).rejects.toThrow('already used');
    await Promise.all(Array.from({ length: 8 }, (_, i) => agent({ ...command, commandId: `queued-${i}` })));
    await expect(agent({ ...command, commandId: 'overflow' })).rejects.toThrow('queue full');
  });
  it('expires pairing and receipts and measures payload limits in UTF-8 bytes', async () => {
    const { db } = database();
    const unpaired = await relay(db, { action: 'create', projectId: 'one', mode: 'canvas', tools }, '', now) as { pairingCode: string };
    await expect(relay(db, { action: 'pair', code: unpaired.pairingCode, agentName: 'Late' }, '', now + 600_001)).rejects.toThrow('Pairing expired');
    const { agent, browser } = await setup();
    await agent(command); await browser(poll);
    await browser({ action: 'result', commandId: 'command-1', result: { ok: true } });
    await expect(agent({ action: 'receipt', commandId: 'command-1' }, now + 600_001)).rejects.toThrow('unavailable');
    await expect(agent({ ...command, commandId: 'utf8', arguments: { text: '🌍'.repeat(80_000) } })).rejects.toThrow('too large');
  });

});
