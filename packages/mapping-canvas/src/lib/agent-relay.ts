import type { ShareDb } from './share';
import { capabilityHash } from './share';

const token = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
const validToken = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max;
export class RelayError extends Error { constructor(message: string, public status = 400) { super(message); } }
type Session = { id: string; project_id: string; agent_name: string | null; agent_hash: string | null; expires: number; heartbeat: number; mode: string; tools_json: string };
export type RelayInput = Record<string, unknown>;
function schemas(value: unknown): string {
  if (!Array.isArray(value) || value.length > 64 || value.some(t => !t || !text(t.name, 100) || !t.inputSchema || typeof t.inputSchema !== 'object')) throw new RelayError('Invalid tool catalog.');
  const result = JSON.stringify(value);
  if (new TextEncoder().encode(result).byteLength > 180_000) throw new RelayError('Tool catalog too large.', 413);
  return result;
}
function mode(value: unknown): string { if (value !== 'canvas' && value !== 'motion') throw new RelayError('Invalid project mode.'); return value; }
export async function relay(db: ShareDb, input: RelayInput, credential: string, now = Date.now()) {
  const action = input.action;
  if (action === 'create') {
    await db.prepare('DELETE FROM draw_agent_commands WHERE rowid IN (SELECT rowid FROM draw_agent_commands WHERE created < ? LIMIT 200)').bind(now - 600_000).run();
    await db.prepare('DELETE FROM draw_agent_sessions WHERE id IN (SELECT id FROM draw_agent_sessions WHERE expires < ? LIMIT 25)').bind(now).run();
    if (!text(input.projectId, 120)) throw new RelayError('Invalid project.');
    const id = crypto.randomUUID(), browserToken = token(), pairingToken = token();
    const expires = now + 86_400_000;
    await db.prepare('INSERT INTO draw_agent_sessions (id, project_id, browser_hash, pairing_hash, pairing_expires, expires, heartbeat, mode, tools_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, input.projectId, await capabilityHash(browserToken), await capabilityHash(pairingToken), now + 600_000, expires, now, mode(input.mode), schemas(input.tools)).run();
    return { sessionId: id, browserToken, pairingCode: `${id}.${pairingToken}`, expires };
  }
  if (action === 'pair') {
    if (!text(input.code, 110) || (!text(input.agentName, 60) || !(input.agentName as string).trim())) throw new RelayError('Pairing code and agent name are required.');
    const [id, code] = (input.code as string).split('.');
    if (!validToken(code)) throw new RelayError('Invalid pairing code.', 403);
    const agentToken = token();
    const paired = await db.prepare('UPDATE draw_agent_sessions SET agent_hash = ?, agent_name = ?, pairing_hash = NULL WHERE id = ? AND pairing_hash = ? AND pairing_expires > ? AND expires > ? AND revoked = 0 AND agent_hash IS NULL RETURNING project_id, expires')
      .bind(await capabilityHash(agentToken), (input.agentName as string).trim(), id, await capabilityHash(code), now, now).first<{ project_id: string; expires: number }>();
    if (!paired) throw new RelayError('Pairing expired or already used. Create a new connection in Draw.', 403);
    return { sessionId: id, agentToken, projectId: paired.project_id, expires: paired.expires };
  }
  if (!text(input.sessionId, 36) || !validToken(credential)) throw new RelayError('Connection authorization required.', 403);
  const browserAction = action === 'poll' || action === 'result' || action === 'revoke';
  const column = browserAction ? 'browser_hash' : 'agent_hash';
  const session = await db.prepare(`SELECT * FROM draw_agent_sessions WHERE id = ? AND ${column} = ? AND expires > ? AND revoked = 0`)
    .bind(input.sessionId, await capabilityHash(credential), now).first<Session>();
  if (!session) throw new RelayError('Connection expired or disconnected.', 403);
  const info = { projectId: session.project_id, agentName: session.agent_name, expires: session.expires, mode: session.mode, online: now - session.heartbeat < 15_000 };
  if (action === 'status') return info;
  if (action === 'tools') return { ...info, tools: JSON.parse(session.tools_json) };
  if (action === 'revoke' || action === 'disconnect') {
    await db.batch([
      db.prepare('DELETE FROM draw_agent_commands WHERE session_id = ?').bind(session.id),
      db.prepare('UPDATE draw_agent_sessions SET revoked = 1, pairing_hash = NULL, agent_hash = NULL, tools_json = ? WHERE id = ?').bind('[]', session.id)
    ]);
    return { disconnected: true };
  }
  if (action === 'poll') {
    if (input.projectId !== session.project_id) throw new RelayError('Project does not match this connection.', 409);
    const nextMode = mode(input.mode);
    if (input.tools) await db.prepare('UPDATE draw_agent_sessions SET heartbeat = ?, mode = ?, tools_json = ? WHERE id = ? AND revoked = 0').bind(now, nextMode, schemas(input.tools), session.id).run();
    else await db.prepare('UPDATE draw_agent_sessions SET heartbeat = ?, mode = ? WHERE id = ? AND revoked = 0').bind(now, nextMode, session.id).run();
    await db.prepare('DELETE FROM draw_agent_commands WHERE session_id = ? AND created < ?').bind(session.id, now - 600_000).run();
    // Never replay a claimed operation after reload or a lost acknowledgement.
    await db.prepare("UPDATE draw_agent_commands SET state = 'unknown', result_json = ? WHERE session_id = ? AND state = 'running' AND deadline <= ?")
      .bind(JSON.stringify({ error: 'Execution acknowledgement lost. Inspect the project before deciding whether to retry.' }), session.id, now).run();
    await db.prepare("UPDATE draw_agent_commands SET state = 'failed', result_json = ? WHERE session_id = ? AND state = 'queued' AND (deadline <= ? OR mode != ?)")
      .bind(JSON.stringify({ error: 'Command expired or project mode changed before execution.' }), session.id, now, nextMode).run();
    const command = await db.prepare("UPDATE draw_agent_commands SET state = 'running' WHERE session_id = ? AND id = (SELECT id FROM draw_agent_commands WHERE session_id = ? AND state = 'queued' AND deadline > ? AND mode = ? ORDER BY created LIMIT 1) AND state = 'queued' RETURNING id, tool, arguments_json, deadline")
      .bind(session.id, session.id, now, nextMode).first<{ id: string; tool: string; arguments_json: string; deadline: number }>();
    return { ...info, mode: nextMode, online: true, command: command ? { id: command.id, tool: command.tool, arguments: JSON.parse(command.arguments_json), deadline: command.deadline } : null };
  }
  if (action === 'result') {
    const result = JSON.stringify(input.result ?? null);
    if (new TextEncoder().encode(result).byteLength > 500_000) throw new RelayError('Tool result exceeds connection limit.', 413);
    const updated = await db.prepare("UPDATE draw_agent_commands SET state = ?, result_json = ?, arguments_json = '{}' WHERE session_id = ? AND id = ? AND state = 'running'")
      .bind(input.failed ? 'failed' : 'completed', result, session.id, input.commandId).run();
    return { recorded: updated.meta.changes === 1 };
  }
  if (action === 'enqueue') {
    if (!info.online) throw new RelayError('Open this project in Draw and wait for reconnection.', 409);
    if (!text(input.commandId, 100) || !/^[\w-]+$/.test(input.commandId as string) || !text(input.tool, 100)) throw new RelayError('Invalid command.');
    const catalog = JSON.parse(session.tools_json) as Array<{ name: string }>;
    if (!catalog.some(t => t.name === input.tool)) throw new RelayError('Tool unavailable in the current project mode.', 409);
    if (!input.arguments || typeof input.arguments !== 'object' || Array.isArray(input.arguments)) throw new RelayError('Tool arguments must be an object.');
    const args = JSON.stringify(input.arguments);
    if (new TextEncoder().encode(args).byteLength > 300_000) throw new RelayError('Tool arguments too large.', 413);
    const argumentHash = await capabilityHash(args);
    const existing = await db.prepare('SELECT tool, arguments_hash, state FROM draw_agent_commands WHERE session_id = ? AND id = ?').bind(session.id, input.commandId).first<{ tool: string; arguments_hash: string; state: string }>();
    if (existing) {
      if (existing.tool !== input.tool || existing.arguments_hash !== argumentHash) throw new RelayError('Command ID already used.', 409);
      return { commandId: input.commandId, state: existing.state };
    }
    await db.prepare("INSERT INTO draw_agent_commands (session_id, id, tool, arguments_json, arguments_hash, mode, state, created, deadline) SELECT ?, ?, ?, ?, ?, ?, 'queued', ?, ? WHERE (SELECT count(*) FROM draw_agent_commands WHERE session_id = ? AND state IN ('queued','running')) < 8 AND EXISTS (SELECT 1 FROM draw_agent_sessions WHERE id = ? AND revoked = 0 AND expires > ?) ON CONFLICT(session_id,id) DO NOTHING")
      .bind(session.id, input.commandId, input.tool, args, argumentHash, session.mode, now, now + 30_000, session.id, session.id, now).run();
    const inserted = await db.prepare('SELECT tool, arguments_hash FROM draw_agent_commands WHERE session_id = ? AND id = ?').bind(session.id, input.commandId).first<{ tool: string; arguments_hash: string }>();
    if (!inserted) throw new RelayError('Connection closed or command queue full. Wait before trying again.', 429);
    if (inserted.tool !== input.tool || inserted.arguments_hash !== argumentHash) throw new RelayError('Command ID already used.', 409);
    return { commandId: input.commandId, state: 'queued' };
  }
  if (action === 'receipt') {
    const row = await db.prepare('SELECT state, result_json, deadline FROM draw_agent_commands WHERE session_id = ? AND id = ? AND created > ?').bind(session.id, input.commandId, now - 600_000).first<{ state: string; result_json: string | null; deadline: number }>();
    if (!row) throw new RelayError('Command receipt is unavailable. Inspect before retrying.', 404);
    return { commandId: input.commandId, state: row.deadline <= now && ['running','queued'].includes(row.state) ? 'unknown' : row.state, result: row.result_json ? JSON.parse(row.result_json) : null };
  }
  throw new RelayError('Unknown connection action.');
}
