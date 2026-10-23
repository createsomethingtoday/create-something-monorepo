import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { Gate, GATE_SCHEMA, gateToken, gateCreationProperties } from '../src/readiness-gate.ts';

function fixture() {
  const sql = new DatabaseSync(':memory:'); sql.exec(GATE_SCHEMA);
  sql.exec('CREATE TABLE transcript_write_journal (operation_key TEXT PRIMARY KEY, reserved_at TEXT NOT NULL)');
  const db = { prepare(query: string) { let args: any[] = []; const s = {
    bind(...a: any[]) { args = a; return s; }, async first() { return sql.prepare(query).get(...args) ?? null; },
    async run() { return { meta: { changes: Number(sql.prepare(query).run(...args).changes) } }; },
  }; return s; } } as unknown as D1Database;
  const properties: Record<string, any> = { Reviewed: { checkbox: true }, Contacts: { relation: [{ id: 'human-contact' }] } };
  const reservations = new Set<string>(); let owner = true; let sends = 0; let loss: 'before' | 'after' | null = null;
  const journal = { async assertOwner() { if (!owner) throw Error('ownership lost'); }, async reserve(k: string) { if (reservations.has(k)) return false; reservations.add(k); sql.prepare('INSERT INTO transcript_write_journal VALUES (?, ?)').run(k, new Date().toISOString()); return true; } };
  const transport = { async getPage() { return { properties: structuredClone(properties) }; }, async updatePage(_id: string, next: any) {
    sends++; if (loss === 'before') throw Error('unknown absent'); Object.assign(properties, structuredClone(next));
    if (loss === 'after') throw Error('lost committed response'); return { properties: structuredClone(properties) };
  } };
  const gate = new Gate(db, transport, journal, 'page');
  return { sql, properties, gate, journal, transport, get sends() { return sends; }, set loss(v: typeof loss) { loss = v; }, set owner(v: boolean) { owner = v; } };
}
const hash = 'a'.repeat(64);
const text = (p: any) => (p?.rich_text ?? []).map((x: any) => x.text?.content ?? x.plain_text).join('');
test('managed creation is unready; completion is idempotent and preserves human metadata', async () => {
  const f = fixture(), token = gateToken(hash, 1); Object.assign(f.properties, gateCreationProperties(hash));
  assert.equal(text(f.properties['Transcript Version']), token); assert.equal(text(f.properties['Transcript Ready Version']), '');
  await f.gate.prepare(token, true); await f.gate.publish(token, 'index', async () => {});
  assert.equal(text(f.properties['Transcript Ready Version']), token); assert.equal(f.sends, 1);
  await f.gate.prepare(token, false); await f.gate.publish(token, 'index', async () => {}); assert.equal(f.sends, 1);
  assert.equal(f.properties.Reviewed.checkbox, true); assert.deepEqual(f.properties.Contacts.relation, [{ id: 'human-contact' }]);
  f.sql.close();
});
test('committed lost property response reconciles without a duplicate send', async () => {
  const f = fixture(); Object.assign(f.properties, gateCreationProperties(hash)); f.loss = 'after';
  await f.gate.publish(gateToken(hash, 1), 'index', async () => {});
  f.loss = null; await f.gate.publish(gateToken(hash, 1), 'index', async () => {});
  assert.equal(f.sends, 1); f.sql.close();
});
test('absent uncertain Current write blocks all successor transitions and is never resent', async () => {
  const f = fixture(); Object.assign(f.properties, gateCreationProperties(hash)); f.loss = 'before';
  await assert.rejects(f.gate.prepare(gateToken('b'.repeat(64), 2), true), /unknown absent/);
  const sends = f.sends; f.loss = null;
  await assert.rejects(f.gate.prepare(gateToken('c'.repeat(64), 3), true), /Uncertain/);
  await assert.rejects(f.gate.invalidate(), /Uncertain/); assert.equal(f.sends, sends); f.sql.close();
});
test('unsent persisted Ready intent is canceled, never published by invalidation or recovery', async () => {
  const f = fixture(); Object.assign(f.properties, gateCreationProperties(hash));
  const pending = JSON.stringify({ key: 'never-reserved', properties: { 'Transcript Ready Version': { rich_text: [{ text: { content: gateToken(hash, 1) } }] } } });
  f.sql.prepare('INSERT INTO transcript_gate_intent VALUES (?, ?)').run('page', pending);
  await f.gate.invalidate(); assert.equal(f.sends, 0);
  assert.equal(text(f.properties['Transcript Ready Version']), ''); assert.equal(f.sql.prepare('SELECT pending FROM transcript_gate_intent').get()!.pending, null); f.sql.close();
});
test('A to B to A uses a new generation and rejects stale preparation', async () => {
  const f = fixture(); Object.assign(f.properties, gateCreationProperties(hash));
  await f.gate.publish(gateToken(hash, 1), 'index-a', async () => {});
  await f.gate.prepare(gateToken('b'.repeat(64), 2), true); assert.equal(text(f.properties['Transcript Ready Version']), '');
  await f.gate.publish(gateToken('b'.repeat(64), 2), 'index-b', async () => {});
  await f.gate.prepare(gateToken(hash, 3), true); assert.equal(text(f.properties['Transcript Ready Version']), '');
  await assert.rejects(f.gate.prepare(gateToken(hash, 1), true), /Stale/);
  f.properties['Transcript Ready Version'] = { rich_text: [{ text: { content: gateToken(hash, 1) } }] };
  assert.notEqual(text(f.properties['Transcript Version']), text(f.properties['Transcript Ready Version'])); f.sql.close();
});
test('readiness proof is checked immediately before sending, and cannot set Current', async () => {
  const f = fixture(); Object.assign(f.properties, gateCreationProperties(hash)); let proofs = 0;
  await assert.rejects(f.gate.publish(gateToken(hash, 1), 'index', async () => { if (++proofs === 3) throw Error('readiness fence changed'); }), /fence changed/);
  assert.equal(f.sends, 0); assert.equal(text(f.properties['Transcript Version']), gateToken(hash, 1));
  assert.equal(text(f.properties['Transcript Ready Version']), ''); f.sql.close();
});
