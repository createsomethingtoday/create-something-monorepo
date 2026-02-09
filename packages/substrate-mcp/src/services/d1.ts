/**
 * Cloudflare D1 service — the Database tier of Substrate.
 *
 * All functions accept a D1Exec. Soft-delete via archived_at.
 * Sensitive fields redacted in read paths.
 */

import type {
  Workspace, TableDefinition, Record, Relation,
  AuditEntry, QueryParams, QueryResult, WorkspaceStats,
  ColumnDefinition, FileMetadata, AccessToken,
} from '../types.js';
import type { D1Exec, QueryResult as QR } from './executor.js';
import { DEFAULT_QUERY_LIMIT, MAX_RECORDS_PER_QUERY, FilterOperator } from '../constants.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function rows(r: QR) { return r.results; }
function first(r: QR) { const rr = rows(r); return rr.length ? rr[0] : null; }
function chg(r: QR) { return r.meta.changes; }
function uid(): string { return crypto.randomUUID(); }
function parseJson<T>(val: unknown): T {
  return (typeof val === 'string' ? JSON.parse(val) : val) as T;
}

// ─── Auto-Init ──────────────────────────────────────────────────────

let _init = false;

export async function ensureInitialized(e: D1Exec): Promise<void> {
  if (_init) return;
  try { await e('SELECT 1 FROM workspaces LIMIT 1'); _init = true; await migrateSchema(e); }
  catch { await initSchema(e); _init = true; }
}

async function initSchema(e: D1Exec): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '',
      archived_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,

    `CREATE TABLE IF NOT EXISTS table_definitions (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', columns TEXT NOT NULL DEFAULT '[]',
      archived_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      UNIQUE(workspace_id, name))`,

    `CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY, table_id TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',
      archived_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (table_id) REFERENCES table_definitions(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY, source_table_id TEXT NOT NULL, source_record_id TEXT NOT NULL,
      target_table_id TEXT NOT NULL, target_record_id TEXT NOT NULL,
      relation_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_record_id) REFERENCES records(id) ON DELETE CASCADE,
      FOREIGN KEY (target_record_id) REFERENCES records(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS file_metadata (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, record_id TEXT,
      filename TEXT NOT NULL, content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL, storage_key TEXT NOT NULL UNIQUE,
      uploaded_by TEXT NOT NULL DEFAULT 'agent', description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, table_id TEXT NOT NULL,
      record_id TEXT, action TEXT NOT NULL, actor TEXT NOT NULL,
      changes TEXT NOT NULL DEFAULT '{}',
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE)`,

    `CREATE TABLE IF NOT EXISTS access_tokens (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'editor',
      workspace_ids TEXT NOT NULL DEFAULT '["*"]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT NULL)`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_tables_ws ON table_definitions(workspace_id)`,
    `CREATE INDEX IF NOT EXISTS idx_records_tbl ON records(table_id)`,
    `CREATE INDEX IF NOT EXISTS idx_records_updated ON records(table_id, updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_rels_src ON relations(source_record_id)`,
    `CREATE INDEX IF NOT EXISTS idx_rels_tgt ON relations(target_record_id)`,
    `CREATE INDEX IF NOT EXISTS idx_files_ws ON file_metadata(workspace_id)`,
    `CREATE INDEX IF NOT EXISTS idx_files_rec ON file_metadata(record_id)`,
    `CREATE INDEX IF NOT EXISTS idx_files_key ON file_metadata(storage_key)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_ws ON audit_log(workspace_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_rec ON audit_log(record_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_tokens_hash ON access_tokens(token_hash)`,
  ];
  for (const sql of stmts) await e(sql);
}

/** Add columns to existing databases that don't have them yet */
async function migrateSchema(e: D1Exec): Promise<void> {
  const migrations = [
    'ALTER TABLE workspaces ADD COLUMN archived_at TEXT DEFAULT NULL',
    'ALTER TABLE table_definitions ADD COLUMN archived_at TEXT DEFAULT NULL',
    'ALTER TABLE records ADD COLUMN archived_at TEXT DEFAULT NULL',
    `CREATE TABLE IF NOT EXISTS access_tokens (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'editor',
      workspace_ids TEXT NOT NULL DEFAULT '["*"]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT NULL)`,
    'CREATE INDEX IF NOT EXISTS idx_tokens_hash ON access_tokens(token_hash)',
  ];
  for (const sql of migrations) {
    try { await e(sql); } catch { /* column/table already exists */ }
  }
}

// ─── Sensitive Field Redaction ───────────────────────────────────────

/** Redact sensitive fields in record data based on table schema */
export function redactSensitiveFields(data: globalThis.Record<string, unknown>, columns: ColumnDefinition[]): globalThis.Record<string, unknown> {
  const redacted = { ...data };
  for (const col of columns) {
    if (col.sensitive && col.name in redacted) {
      redacted[col.name] = '[REDACTED]';
    }
  }
  return redacted;
}

// ═══════════════════════════════════════════════════════════════════
// WORKSPACE CRUD (with archived_at filtering)
// ═══════════════════════════════════════════════════════════════════

export async function createWorkspace(e: D1Exec, name: string, description = ''): Promise<Workspace> {
  return first(await e('INSERT INTO workspaces (id,name,description) VALUES (?,?,?) RETURNING *', [uid(), name, description])) as unknown as Workspace;
}

export async function getWorkspace(e: D1Exec, wid: string): Promise<Workspace | null> {
  return first(await e('SELECT * FROM workspaces WHERE id=? AND archived_at IS NULL', [wid])) as unknown as Workspace | null;
}

export async function getWorkspaceByName(e: D1Exec, name: string): Promise<Workspace | null> {
  return first(await e('SELECT * FROM workspaces WHERE name=? AND archived_at IS NULL', [name])) as unknown as Workspace | null;
}

export async function listWorkspaces(e: D1Exec, includeArchived = false): Promise<Workspace[]> {
  const sql = includeArchived ? 'SELECT * FROM workspaces ORDER BY name' : 'SELECT * FROM workspaces WHERE archived_at IS NULL ORDER BY name';
  return rows(await e(sql)) as unknown as Workspace[];
}

export async function updateWorkspace(e: D1Exec, wid: string, u: { name?: string; description?: string }): Promise<Workspace | null> {
  const s: string[] = []; const p: unknown[] = [];
  if (u.name !== undefined) { s.push('name=?'); p.push(u.name); }
  if (u.description !== undefined) { s.push('description=?'); p.push(u.description); }
  if (!s.length) return getWorkspace(e, wid);
  s.push("updated_at=datetime('now')"); p.push(wid);
  return first(await e(`UPDATE workspaces SET ${s.join(',')} WHERE id=? AND archived_at IS NULL RETURNING *`, p)) as unknown as Workspace | null;
}

export async function archiveWorkspace(e: D1Exec, wid: string): Promise<boolean> {
  return chg(await e("UPDATE workspaces SET archived_at=datetime('now') WHERE id=? AND archived_at IS NULL", [wid])) > 0;
}

export async function restoreWorkspace(e: D1Exec, wid: string): Promise<boolean> {
  return chg(await e('UPDATE workspaces SET archived_at=NULL WHERE id=? AND archived_at IS NOT NULL', [wid])) > 0;
}

export async function purgeWorkspace(e: D1Exec, wid: string): Promise<boolean> {
  return chg(await e('DELETE FROM workspaces WHERE id=?', [wid])) > 0;
}

// Keep deleteWorkspace for backward compat (archive alias)
export const deleteWorkspace = archiveWorkspace;

// ═══════════════════════════════════════════════════════════════════
// TABLE DEFINITION CRUD
// ═══════════════════════════════════════════════════════════════════

export async function createTable(e: D1Exec, wsId: string, name: string, desc = '', cols: ColumnDefinition[] = []): Promise<TableDefinition> {
  const r = first(await e('INSERT INTO table_definitions (id,workspace_id,name,description,columns) VALUES (?,?,?,?,?) RETURNING *', [uid(), wsId, name, desc, JSON.stringify(cols)])) as unknown as TableDefinition;
  r.columns = parseJson(r.columns); return r;
}

export async function getTable(e: D1Exec, tid: string): Promise<TableDefinition | null> {
  const r = first(await e('SELECT * FROM table_definitions WHERE id=? AND archived_at IS NULL', [tid])) as unknown as TableDefinition | null;
  if (r) r.columns = parseJson(r.columns); return r;
}

export async function getTableByName(e: D1Exec, wsId: string, name: string): Promise<TableDefinition | null> {
  const r = first(await e('SELECT * FROM table_definitions WHERE workspace_id=? AND name=? AND archived_at IS NULL', [wsId, name])) as unknown as TableDefinition | null;
  if (r) r.columns = parseJson(r.columns); return r;
}

export async function listTables(e: D1Exec, wsId: string): Promise<TableDefinition[]> {
  return (rows(await e('SELECT * FROM table_definitions WHERE workspace_id=? AND archived_at IS NULL ORDER BY name', [wsId])) as unknown as TableDefinition[]).map(t => { t.columns = parseJson(t.columns); return t; });
}

export async function updateTable(e: D1Exec, tid: string, u: { name?: string; description?: string; columns?: ColumnDefinition[] }): Promise<TableDefinition | null> {
  const s: string[] = []; const p: unknown[] = [];
  if (u.name !== undefined) { s.push('name=?'); p.push(u.name); }
  if (u.description !== undefined) { s.push('description=?'); p.push(u.description); }
  if (u.columns !== undefined) { s.push('columns=?'); p.push(JSON.stringify(u.columns)); }
  if (!s.length) return getTable(e, tid);
  s.push("updated_at=datetime('now')"); p.push(tid);
  const r = first(await e(`UPDATE table_definitions SET ${s.join(',')} WHERE id=? AND archived_at IS NULL RETURNING *`, p)) as unknown as TableDefinition | null;
  if (r) r.columns = parseJson(r.columns); return r;
}

export async function archiveTable(e: D1Exec, tid: string): Promise<boolean> {
  return chg(await e("UPDATE table_definitions SET archived_at=datetime('now') WHERE id=? AND archived_at IS NULL", [tid])) > 0;
}

export const deleteTable = archiveTable;

// ═══════════════════════════════════════════════════════════════════
// RECORD CRUD
// ═══════════════════════════════════════════════════════════════════

export async function createRecord(e: D1Exec, tableId: string, data: globalThis.Record<string, unknown>): Promise<Record> {
  const r = first(await e('INSERT INTO records (id,table_id,data) VALUES (?,?,?) RETURNING *', [uid(), tableId, JSON.stringify(data)])) as unknown as Record;
  r.data = parseJson(r.data); return r;
}

export async function getRecord(e: D1Exec, rid: string): Promise<Record | null> {
  const r = first(await e('SELECT * FROM records WHERE id=? AND archived_at IS NULL', [rid])) as unknown as Record | null;
  if (r) r.data = parseJson(r.data); return r;
}

export async function updateRecord(e: D1Exec, rid: string, data: globalThis.Record<string, unknown>): Promise<Record | null> {
  const existing = await getRecord(e, rid);
  if (!existing) return null;
  const merged = { ...existing.data, ...data };
  const r = first(await e("UPDATE records SET data=?, updated_at=datetime('now') WHERE id=? AND archived_at IS NULL RETURNING *", [JSON.stringify(merged), rid])) as unknown as Record | null;
  if (r) r.data = parseJson(r.data); return r;
}

export async function archiveRecord(e: D1Exec, rid: string): Promise<boolean> {
  return chg(await e("UPDATE records SET archived_at=datetime('now') WHERE id=? AND archived_at IS NULL", [rid])) > 0;
}

export async function restoreRecord(e: D1Exec, rid: string): Promise<boolean> {
  return chg(await e('UPDATE records SET archived_at=NULL WHERE id=? AND archived_at IS NOT NULL', [rid])) > 0;
}

export const deleteRecord = archiveRecord;

// ═══════════════════════════════════════════════════════════════════
// QUERY ENGINE (filters out archived by default)
// ═══════════════════════════════════════════════════════════════════

export async function queryRecords(e: D1Exec, q: QueryParams): Promise<QueryResult> {
  const limit = Math.min(q.limit ?? DEFAULT_QUERY_LIMIT, MAX_RECORDS_PER_QUERY);
  const offset = q.offset ?? 0;
  const where = ['table_id=?']; const wp: unknown[] = [q.table_id];

  if (!q.include_archived) {
    where.push('archived_at IS NULL');
  }

  if (q.filters) {
    for (const f of q.filters) {
      const { sql, params } = filterClause(f.column, f.operator, f.value);
      where.push(sql); wp.push(...params);
    }
  }
  const wc = where.join(' AND ');
  let order = 'ORDER BY updated_at DESC';
  if (q.sorts?.length) {
    order = 'ORDER BY ' + q.sorts.map(s => `json_extract(data,'$.${esc(s.column)}') ${s.direction === 'asc' ? 'ASC' : 'DESC'}`).join(',');
  }

  const total = ((first(await e(`SELECT COUNT(*) as count FROM records WHERE ${wc}`, wp)) as { count: number })?.count) ?? 0;
  const recs = (rows(await e(`SELECT * FROM records WHERE ${wc} ${order} LIMIT ? OFFSET ?`, [...wp, limit, offset])) as unknown as Record[]).map(r => { r.data = parseJson(r.data); return r; });

  if (q.columns?.length) {
    for (const r of recs) {
      const proj: globalThis.Record<string, unknown> = {};
      for (const col of q.columns) if (col in r.data) proj[col] = r.data[col];
      r.data = proj;
    }
  }

  return { records: recs, total_count: total, has_more: offset + limit < total, limit, offset };
}

export async function searchRecords(e: D1Exec, tableId: string, term: string, limit = DEFAULT_QUERY_LIMIT): Promise<Record[]> {
  return (rows(await e('SELECT * FROM records WHERE table_id=? AND archived_at IS NULL AND data LIKE ? ORDER BY updated_at DESC LIMIT ?', [tableId, `%${term}%`, Math.min(limit, MAX_RECORDS_PER_QUERY)])) as unknown as Record[]).map(r => { r.data = parseJson(r.data); return r; });
}

function esc(col: string) { return col.replace(/['"\\]/g, ''); }

function filterClause(col: string, op: FilterOperator, val: unknown): { sql: string; params: unknown[] } {
  const p = `json_extract(data,'$.${esc(col)}')`;
  switch (op) {
    case FilterOperator.EQ: return { sql: `${p}=?`, params: [val] };
    case FilterOperator.NEQ: return { sql: `${p}!=?`, params: [val] };
    case FilterOperator.GT: return { sql: `${p}>?`, params: [val] };
    case FilterOperator.GTE: return { sql: `${p}>=?`, params: [val] };
    case FilterOperator.LT: return { sql: `${p}<?`, params: [val] };
    case FilterOperator.LTE: return { sql: `${p}<=?`, params: [val] };
    case FilterOperator.CONTAINS: return { sql: `${p} LIKE ?`, params: [`%${val}%`] };
    case FilterOperator.NOT_CONTAINS: return { sql: `${p} NOT LIKE ?`, params: [`%${val}%`] };
    case FilterOperator.STARTS_WITH: return { sql: `${p} LIKE ?`, params: [`${val}%`] };
    case FilterOperator.ENDS_WITH: return { sql: `${p} LIKE ?`, params: [`%${val}`] };
    case FilterOperator.IS_EMPTY: return { sql: `(${p} IS NULL OR ${p}='' OR ${p}='null')`, params: [] };
    case FilterOperator.IS_NOT_EMPTY: return { sql: `(${p} IS NOT NULL AND ${p}!='' AND ${p}!='null')`, params: [] };
    case FilterOperator.IN: { const a = Array.isArray(val) ? val : [val]; return { sql: `${p} IN (${a.map(() => '?').join(',')})`, params: a }; }
    default: return { sql: `${p}=?`, params: [val] };
  }
}

// ═══════════════════════════════════════════════════════════════════
// RELATION CRUD
// ═══════════════════════════════════════════════════════════════════

export async function createRelation(e: D1Exec, sTbl: string, sRec: string, tTbl: string, tRec: string, name = ''): Promise<Relation> {
  return first(await e('INSERT INTO relations (id,source_table_id,source_record_id,target_table_id,target_record_id,relation_name) VALUES (?,?,?,?,?,?) RETURNING *', [uid(), sTbl, sRec, tTbl, tRec, name])) as unknown as Relation;
}

export async function getRelationsForRecord(e: D1Exec, rid: string): Promise<Relation[]> {
  return rows(await e('SELECT * FROM relations WHERE source_record_id=? OR target_record_id=? ORDER BY created_at DESC', [rid, rid])) as unknown as Relation[];
}

export async function deleteRelation(e: D1Exec, rid: string): Promise<boolean> {
  return chg(await e('DELETE FROM relations WHERE id=?', [rid])) > 0;
}

// ═══════════════════════════════════════════════════════════════════
// FILE METADATA
// ═══════════════════════════════════════════════════════════════════

export async function createFileMetadata(e: D1Exec, f: Omit<FileMetadata, 'created_at'>): Promise<FileMetadata> {
  return first(await e(
    'INSERT INTO file_metadata (id,workspace_id,record_id,filename,content_type,size_bytes,storage_key,uploaded_by,description) VALUES (?,?,?,?,?,?,?,?,?) RETURNING *',
    [f.id, f.workspace_id, f.record_id, f.filename, f.content_type, f.size_bytes, f.storage_key, f.uploaded_by, f.description],
  )) as unknown as FileMetadata;
}

export async function getFileMetadata(e: D1Exec, fid: string): Promise<FileMetadata | null> {
  return first(await e('SELECT * FROM file_metadata WHERE id=?', [fid])) as unknown as FileMetadata | null;
}

export async function listFiles(e: D1Exec, wsId: string, recordId?: string): Promise<FileMetadata[]> {
  if (recordId) return rows(await e('SELECT * FROM file_metadata WHERE workspace_id=? AND record_id=? ORDER BY created_at DESC', [wsId, recordId])) as unknown as FileMetadata[];
  return rows(await e('SELECT * FROM file_metadata WHERE workspace_id=? ORDER BY created_at DESC', [wsId])) as unknown as FileMetadata[];
}

export async function deleteFileMetadata(e: D1Exec, fid: string): Promise<FileMetadata | null> {
  const f = await getFileMetadata(e, fid);
  if (!f) return null;
  await e('DELETE FROM file_metadata WHERE id=?', [fid]);
  return f;
}

// ═══════════════════════════════════════════════════════════════════
// ACCESS TOKENS
// ═══════════════════════════════════════════════════════════════════

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createAccessToken(e: D1Exec, token: string, label: string, role: string, workspaceIds: string[] = ['*']): Promise<AccessToken> {
  const id = uid();
  const hash = await hashToken(token);
  const r = first(await e(
    'INSERT INTO access_tokens (id,token_hash,label,role,workspace_ids) VALUES (?,?,?,?,?) RETURNING *',
    [id, hash, label, role, JSON.stringify(workspaceIds)],
  )) as unknown as AccessToken;
  r.workspace_ids = parseJson(r.workspace_ids);
  return r;
}

export async function resolveToken(e: D1Exec, token: string): Promise<AccessToken | null> {
  const hash = await hashToken(token);
  const r = first(await e('SELECT * FROM access_tokens WHERE token_hash=?', [hash])) as unknown as AccessToken | null;
  if (!r) return null;
  // Check expiry
  if (r.expires_at && new Date(r.expires_at) < new Date()) return null;
  r.workspace_ids = parseJson(r.workspace_ids);
  return r;
}

export async function listTokens(e: D1Exec): Promise<Array<Omit<AccessToken, 'token_hash'>>> {
  return (rows(await e('SELECT id,label,role,workspace_ids,created_at,expires_at FROM access_tokens ORDER BY created_at DESC')) as unknown as AccessToken[])
    .map(t => { t.workspace_ids = parseJson(t.workspace_ids); return t; });
}

export async function revokeToken(e: D1Exec, tokenId: string): Promise<boolean> {
  return chg(await e('DELETE FROM access_tokens WHERE id=?', [tokenId])) > 0;
}

export async function hasAnyTokens(e: D1Exec): Promise<boolean> {
  const r = first(await e('SELECT COUNT(*) as cnt FROM access_tokens'));
  return ((r as { cnt: number })?.cnt ?? 0) > 0;
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════

export async function createAuditEntry(e: D1Exec, entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
  await e('INSERT INTO audit_log (id,workspace_id,table_id,record_id,action,actor,changes) VALUES (?,?,?,?,?,?,?)',
    [uid(), entry.workspace_id, entry.table_id, entry.record_id, entry.action, entry.actor, JSON.stringify(entry.changes)]);
}

export async function getAuditLog(e: D1Exec, wsId: string, limit = 50, tableId?: string, recordId?: string): Promise<AuditEntry[]> {
  let sql = 'SELECT * FROM audit_log WHERE workspace_id=?'; const p: unknown[] = [wsId];
  if (tableId) { sql += ' AND table_id=?'; p.push(tableId); }
  if (recordId) { sql += ' AND record_id=?'; p.push(recordId); }
  sql += ' ORDER BY timestamp DESC LIMIT ?'; p.push(limit);
  return (rows(await e(sql, p)) as unknown as AuditEntry[]).map(a => { a.changes = parseJson(a.changes); return a; });
}

// ═══════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════

export async function getWorkspaceStats(e: D1Exec, wsId: string): Promise<WorkspaceStats> {
  const ws = await getWorkspace(e, wsId);
  if (!ws) throw new Error(`Workspace '${wsId}' not found`);
  const tables = await listTables(e, wsId);
  const tids = tables.map(t => t.id);

  let totalRecords = 0, totalRelations = 0;
  if (tids.length) {
    const ph = tids.map(() => '?').join(',');
    totalRecords = ((first(await e(`SELECT COUNT(*) as count FROM records WHERE table_id IN (${ph}) AND archived_at IS NULL`, tids)) as { count: number })?.count) ?? 0;
    totalRelations = ((first(await e(`SELECT COUNT(*) as count FROM relations WHERE source_table_id IN (${ph})`, tids)) as { count: number })?.count) ?? 0;
  }

  const fr = first(await e('SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes),0) as sz FROM file_metadata WHERE workspace_id=?', [wsId])) as { cnt: number; sz: number } | null;
  const recentChanges = ((first(await e("SELECT COUNT(*) as count FROM audit_log WHERE workspace_id=? AND timestamp>datetime('now','-1 day')", [wsId])) as { count: number })?.count) ?? 0;

  return {
    workspace_id: wsId, workspace_name: ws.name,
    total_tables: tables.length, total_records: totalRecords, total_relations: totalRelations,
    total_files: fr?.cnt ?? 0, total_file_size_bytes: fr?.sz ?? 0, recent_changes: recentChanges,
  };
}

// ═══════════════════════════════════════════════════════════════════
// BULK OPS
// ═══════════════════════════════════════════════════════════════════

export async function bulkCreateRecords(e: D1Exec, tableId: string, recs: globalThis.Record<string, unknown>[]): Promise<Record[]> {
  const out: Record[] = [];
  for (const d of recs) out.push(await createRecord(e, tableId, d));
  return out;
}

export async function bulkDeleteRecords(e: D1Exec, ids: string[]): Promise<number> {
  let n = 0;
  for (const rid of ids) if (await archiveRecord(e, rid)) n++;
  return n;
}
