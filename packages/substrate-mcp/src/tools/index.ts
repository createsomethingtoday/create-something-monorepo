/**
 * MCP Tool handlers — the Automation tier.
 *
 * Security-hardened: soft-delete (archive), sensitive field redaction,
 * token management (admin-only), purge with confirmation.
 */

import { z } from 'zod';
import type { D1Exec, R2Store } from '../services/executor.js';
import { generateStorageKey } from '../services/r2.js';
import * as db from '../services/d1.js';
import { ColumnType, MAX_FILE_SIZE_BYTES, MAX_RECORDS_PER_QUERY, MAX_BULK_OPERATIONS, Role } from '../constants.js';
import type { ColumnDefinition } from '../types.js';

import {
  FilterSchema, SortSchema, ColumnDefinitionSchema,
  UpdateWorkspaceSchema, ArchiveWorkspaceSchema, PurgeWorkspaceSchema,
  DefineTableSchema, UpdateTableSchema, ArchiveTableSchema,
  UpdateRecordSchema, ArchiveRecordSchema, RestoreRecordSchema,
  CreateRelationSchema, DeleteRelationSchema,
  BulkCreateRecordsSchema, BulkDeleteRecordsSchema,
  UploadFileSchema, DownloadFileSchema, DeleteFileSchema, ListFilesSchema,
  ReadSensitiveSchema, CreateTokenSchema, RevokeTokenSchema,
} from '../schemas/index.js';

import type {
  UpdateWorkspaceInput, ArchiveWorkspaceInput, PurgeWorkspaceInput,
  UpdateTableInput, ArchiveTableInput,
  UpdateRecordInput, ArchiveRecordInput, RestoreRecordInput,
  CreateRelationInput, DeleteRelationInput,
  BulkCreateRecordsInput, BulkDeleteRecordsInput,
  UploadFileInput, DownloadFileInput, DeleteFileInput, ListFilesInput,
  ReadSensitiveInput, CreateTokenInput, RevokeTokenInput,
} from '../schemas/index.js';

interface AnyMcpServer {
  tool(name: string, description: string, schema: Record<string, unknown>, handler: (...args: unknown[]) => unknown, opts?: { readOnly?: boolean }): void;
}

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}
function fail(msg: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], isError: true as const };
}

function validateRecordData(cols: ColumnDefinition[], data: globalThis.Record<string, unknown>) {
  for (const col of cols) {
    const v = data[col.name];
    if (col.required && (v === undefined || v === null))
      throw new Error(`Required column '${col.name}' is missing`);
    if (v === undefined || v === null) continue;
    if (col.type === ColumnType.NUMBER && typeof v !== 'number')
      throw new Error(`Column '${col.name}' expects number, got ${typeof v}`);
    if (col.type === ColumnType.BOOLEAN && typeof v !== 'boolean')
      throw new Error(`Column '${col.name}' expects boolean, got ${typeof v}`);
    if (col.type === ColumnType.SELECT && col.options && !col.options.includes(String(v)))
      throw new Error(`Column '${col.name}' value '${v}' not in options: ${col.options.join(', ')}`);
    if (col.type === ColumnType.MULTI_SELECT) {
      if (!Array.isArray(v)) throw new Error(`Column '${col.name}' expects array for multi_select`);
      if (col.options) for (const item of v) if (!col.options.includes(String(item)))
        throw new Error(`Column '${col.name}' value '${item}' not in options: ${col.options.join(', ')}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════

export function registerTools(
  server: AnyMcpServer,
  getD1: () => D1Exec,
  getR2: () => R2Store,
  getActor: () => string,
): void {

  async function withDb<T>(fn: (e: D1Exec) => Promise<T>): Promise<T> {
    const e = getD1(); await db.ensureInitialized(e); return fn(e);
  }

  /** Get table and redact sensitive fields from a record's data */
  async function redactRecord(e: D1Exec, rec: import('../types.js').Record): Promise<import('../types.js').Record> {
    const tbl = await db.getTable(e, rec.table_id);
    if (tbl) rec.data = db.redactSensitiveFields(rec.data, tbl.columns);
    return rec;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIMARY — by name, single-call
  // ═══════════════════════════════════════════════════════════════════

  server.tool('find_records',
    'Query or search by workspace + table name. Sensitive fields are redacted.',
    {
      workspace_name: z.string().min(1),
      table_name: z.string().min(1),
      filters: z.array(FilterSchema).optional(),
      sorts: z.array(SortSchema).optional(),
      limit: z.number().int().min(1).max(MAX_RECORDS_PER_QUERY).default(25),
      offset: z.number().int().min(0).default(0),
      search: z.string().optional().describe('text search instead of filters'),
      include_archived: z.boolean().optional(),
    } as Record<string, unknown>,
    async (p: unknown) => {
      const i = p as { workspace_name: string; table_name: string; filters?: unknown[]; sorts?: unknown[]; limit?: number; offset?: number; search?: string; include_archived?: boolean };
      try {
        return ok(await withDb(async e => {
          const ws = await db.getWorkspaceByName(e, i.workspace_name);
          if (!ws) return { error: `Workspace '${i.workspace_name}' not found. Use list_workspaces.` };
          const tbl = await db.getTableByName(e, ws.id, i.table_name);
          if (!tbl) {
            const tables = await db.listTables(e, ws.id);
            return { error: `Table '${i.table_name}' not found. Available: ${tables.map(t => t.name).join(', ')}` };
          }
          if (i.search) {
            const recs = await db.searchRecords(e, tbl.id, i.search, i.limit ?? 25);
            recs.forEach(r => { r.data = db.redactSensitiveFields(r.data, tbl.columns); });
            return { table: tbl.name, records: recs, count: recs.length };
          }
          const result = await db.queryRecords(e, {
            table_id: tbl.id,
            filters: i.filters as import('../types.js').QueryFilter[] | undefined,
            sorts: i.sorts as import('../types.js').QuerySort[] | undefined,
            limit: i.limit, offset: i.offset,
            include_archived: i.include_archived,
          });
          result.records.forEach(r => { r.data = db.redactSensitiveFields(r.data, tbl.columns); });
          return result;
        }));
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });

  server.tool('add_record',
    'Create record by workspace + table name. Validated against schema.',
    {
      workspace_name: z.string().min(1),
      table_name: z.string().min(1),
      data: z.record(z.unknown()),
    } as Record<string, unknown>,
    async (p: unknown) => {
      const i = p as { workspace_name: string; table_name: string; data: globalThis.Record<string, unknown> };
      try {
        return ok(await withDb(async e => {
          const ws = await db.getWorkspaceByName(e, i.workspace_name);
          if (!ws) return { error: `Workspace '${i.workspace_name}' not found. Use list_workspaces.` };
          const tbl = await db.getTableByName(e, ws.id, i.table_name);
          if (!tbl) {
            const tables = await db.listTables(e, ws.id);
            return { error: `Table '${i.table_name}' not found. Available: ${tables.map(t => t.name).join(', ')}` };
          }
          validateRecordData(tbl.columns, i.data);
          const rec = await db.createRecord(e, tbl.id, i.data);
          await db.createAuditEntry(e, { workspace_id: ws.id, table_id: tbl.id, record_id: rec.id, action: 'create', actor: getActor(), changes: { data: i.data } });
          return { success: true, record: rec };
        }));
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    });

  server.tool('list_workspaces',
    'List all workspaces with tables and column schemas. Start here.',
    {},
    async () => {
      try {
        return ok(await withDb(async e => {
          const workspaces = await db.listWorkspaces(e);
          const result = [];
          for (const ws of workspaces) {
            const tables = await db.listTables(e, ws.id);
            result.push({
              ...ws,
              tables: tables.map(t => ({ id: t.id, name: t.name, description: t.description, columns: t.columns })),
            });
          }
          return { workspaces: result };
        }));
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });

  // ═══════════════════════════════════════════════════════════════════
  // ID-BASED — follow-up operations
  // ═══════════════════════════════════════════════════════════════════

  server.tool('get_record',
    'Get record by ID with relations. Sensitive fields redacted.',
    { record_id: z.string().min(1) } as Record<string, unknown>,
    async (p: unknown) => {
      const i = p as { record_id: string };
      try {
        return ok(await withDb(async e => {
          const rec = await db.getRecord(e, i.record_id);
          if (!rec) return { error: 'Record not found' };
          await redactRecord(e, rec);
          const relations = await db.getRelationsForRecord(e, i.record_id);
          return { record: rec, relations };
        }));
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });

  server.tool('update_record',
    'Update record fields by ID. Merges with existing.',
    UpdateRecordSchema.shape,
    async (p: unknown) => { const i = p as UpdateRecordInput; try {
      return ok({ success: true, record: await withDb(async e => {
        const old = await db.getRecord(e, i.record_id); if (!old) throw new Error('Record not found');
        const tbl = await db.getTable(e, old.table_id);
        const rec = await db.updateRecord(e, i.record_id, i.data);
        if (tbl) await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: old.table_id, record_id: i.record_id, action: 'update', actor: getActor(), changes: { before: old.data, after: i.data } });
        return rec;
      }) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('archive_record',
    'Archive a record (soft-delete). Can be restored later.',
    ArchiveRecordSchema.shape,
    async (p: unknown) => { const i = p as ArchiveRecordInput; try {
      const archived = await withDb(async e => {
        const old = await db.getRecord(e, i.record_id); if (!old) return false;
        const tbl = await db.getTable(e, old.table_id);
        const success = await db.archiveRecord(e, i.record_id);
        if (success && tbl) await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: old.table_id, record_id: i.record_id, action: 'archive', actor: getActor(), changes: { data: old.data } });
        return success;
      });
      return archived ? ok({ success: true, archived: true }) : fail('Record not found');
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('restore_record',
    'Restore an archived record.',
    RestoreRecordSchema.shape,
    async (p: unknown) => { const i = p as RestoreRecordInput; try {
      const restored = await withDb(async e => {
        const success = await db.restoreRecord(e, i.record_id);
        if (success) {
          const rec = await db.getRecord(e, i.record_id);
          if (rec) {
            const tbl = await db.getTable(e, rec.table_id);
            if (tbl) await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: rec.table_id, record_id: i.record_id, action: 'restore', actor: getActor(), changes: {} });
          }
        }
        return success;
      });
      return restored ? ok({ success: true, restored: true }) : fail('Record not found or not archived');
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ═══════════════════════════════════════════════════════════════════
  // SENSITIVE FIELD ACCESS
  // ═══════════════════════════════════════════════════════════════════

  server.tool('read_sensitive',
    'Read the actual value of a sensitive (redacted) field. Logged in audit trail.',
    ReadSensitiveSchema.shape,
    async (p: unknown) => { const i = p as ReadSensitiveInput; try {
      return ok(await withDb(async e => {
        const rec = await db.getRecord(e, i.record_id);
        if (!rec) return { error: 'Record not found' };
        const tbl = await db.getTable(e, rec.table_id);
        if (!tbl) return { error: 'Table not found' };
        const col = tbl.columns.find(c => c.name === i.column_name);
        if (!col) return { error: `Column '${i.column_name}' not found` };
        if (!col.sensitive) return { error: `Column '${i.column_name}' is not marked sensitive` };
        const value = rec.data[i.column_name];
        // Audit the access
        await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: tbl.id, record_id: i.record_id, action: 'read_sensitive', actor: getActor(), changes: { column: i.column_name } });
        return { record_id: i.record_id, column: i.column_name, value };
      }));
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } },
    { readOnly: true });

  // ═══════════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════════

  server.tool('create_relation',
    'Link two records bidirectionally.',
    CreateRelationSchema.shape,
    async (p: unknown) => { const i = p as CreateRelationInput; try { return ok({ success: true, relation: await withDb(e => db.createRelation(e, i.source_table_id, i.source_record_id, i.target_table_id, i.target_record_id, i.relation_name)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('delete_relation',
    'Remove a relation.',
    DeleteRelationSchema.shape,
    async (p: unknown) => { const i = p as DeleteRelationInput; try { return (await withDb(e => db.deleteRelation(e, i.relation_id))) ? ok({ success: true }) : fail('Relation not found'); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN — workspace + table management
  // ═══════════════════════════════════════════════════════════════════

  server.tool('create_workspace',
    'Create a workspace. Names must be unique.',
    { name: z.string().min(1), description: z.string().default('') } as Record<string, unknown>,
    async (p: unknown) => { const i = p as { name: string; description: string }; try { return ok({ success: true, workspace: await withDb(e => db.createWorkspace(e, i.name, i.description)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('update_workspace',
    'Update workspace name or description.',
    UpdateWorkspaceSchema.shape,
    async (p: unknown) => { const i = p as UpdateWorkspaceInput; try { const w = await withDb(e => db.updateWorkspace(e, i.workspace_id, { name: i.name, description: i.description })); return w ? ok({ success: true, workspace: w }) : fail('Workspace not found'); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('archive_workspace',
    'Archive workspace (soft-delete). All contents hidden but preserved.',
    ArchiveWorkspaceSchema.shape,
    async (p: unknown) => { const i = p as ArchiveWorkspaceInput; try {
      const archived = await withDb(async e => {
        const success = await db.archiveWorkspace(e, i.workspace_id);
        if (success) await db.createAuditEntry(e, { workspace_id: i.workspace_id, table_id: '__workspace__', record_id: null, action: 'archive', actor: getActor(), changes: {} });
        return success;
      });
      return archived ? ok({ success: true, archived: true }) : fail('Workspace not found');
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('purge_workspace',
    'Permanently delete workspace. Requires confirm:true. Cannot be undone.',
    PurgeWorkspaceSchema.shape,
    async (p: unknown) => { const i = p as PurgeWorkspaceInput; try {
      if (!i.confirm) return fail('Set confirm:true to permanently delete. This cannot be undone.');
      return (await withDb(e => db.purgeWorkspace(e, i.workspace_id))) ? ok({ success: true, purged: true }) : fail('Workspace not found');
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('define_table',
    'Define a table with typed columns. Use sensitive:true on columns to redact values.',
    DefineTableSchema.shape,
    async (p: unknown) => { const i = p as import('../schemas/index.js').DefineTableInput; try { return ok({ success: true, table: await withDb(e => db.createTable(e, i.workspace_id, i.name, i.description, i.columns)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('update_table',
    'Update table schema. Columns list replaces existing.',
    UpdateTableSchema.shape,
    async (p: unknown) => { const i = p as UpdateTableInput; try { const t = await withDb(e => db.updateTable(e, i.table_id, { name: i.name, description: i.description, columns: i.columns })); return t ? ok({ success: true, table: t }) : fail('Table not found'); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('archive_table',
    'Archive table (soft-delete). Records preserved.',
    ArchiveTableSchema.shape,
    async (p: unknown) => { const i = p as ArchiveTableInput; try { return (await withDb(e => db.archiveTable(e, i.table_id))) ? ok({ success: true, archived: true }) : fail('Table not found'); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ═══════════════════════════════════════════════════════════════════
  // BULK
  // ═══════════════════════════════════════════════════════════════════

  server.tool('bulk_create_records',
    `Create multiple records (max ${MAX_BULK_OPERATIONS}). Validated.`,
    BulkCreateRecordsSchema.shape,
    async (p: unknown) => { const i = p as BulkCreateRecordsInput; try {
      const recs = await withDb(async e => {
        const tbl = await db.getTable(e, i.table_id); if (!tbl) throw new Error('Table not found');
        for (const d of i.records) validateRecordData(tbl.columns, d);
        const created = await db.bulkCreateRecords(e, i.table_id, i.records);
        await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: i.table_id, record_id: null, action: 'create', actor: getActor(), changes: { bulk: true, count: created.length } });
        return created;
      });
      return ok({ success: true, records: recs, count: recs.length });
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('bulk_archive_records',
    `Archive multiple records (max ${MAX_BULK_OPERATIONS}).`,
    BulkDeleteRecordsSchema.shape,
    async (p: unknown) => { const i = p as BulkDeleteRecordsInput; try { return ok({ success: true, archived_count: await withDb(e => db.bulkDeleteRecords(e, i.record_ids)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ═══════════════════════════════════════════════════════════════════
  // FILES
  // ═══════════════════════════════════════════════════════════════════

  server.tool('upload_file',
    `Upload file (base64). Max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB. Attach to record optionally.`,
    UploadFileSchema.shape,
    async (p: unknown) => {
      const i = p as UploadFileInput;
      try {
        const e = getD1(); const r2 = getR2(); await db.ensureInitialized(e);
        const bytes = Uint8Array.from(atob(i.content_base64), c => c.charCodeAt(0));
        if (bytes.length > MAX_FILE_SIZE_BYTES) return fail(`File too large (max ${MAX_FILE_SIZE_BYTES})`);
        const fileId = crypto.randomUUID();
        const storageKey = generateStorageKey(i.workspace_id, fileId, i.filename);
        await r2.put(storageKey, bytes.buffer as ArrayBuffer, i.content_type);
        const meta = await db.createFileMetadata(e, { id: fileId, workspace_id: i.workspace_id, record_id: i.record_id ?? null, filename: i.filename, content_type: i.content_type, size_bytes: bytes.length, storage_key: storageKey, uploaded_by: getActor(), description: i.description ?? '' });
        await db.createAuditEntry(e, { workspace_id: i.workspace_id, table_id: '__files__', record_id: i.record_id ?? null, action: 'upload', actor: getActor(), changes: { file_id: fileId, filename: i.filename, size: bytes.length } });
        return ok({ success: true, file: meta });
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    });

  server.tool('download_file',
    'Download file as base64.',
    DownloadFileSchema.shape,
    async (p: unknown) => {
      const i = p as DownloadFileInput;
      try {
        const e = getD1(); const r2 = getR2(); await db.ensureInitialized(e);
        const meta = await db.getFileMetadata(e, i.file_id);
        if (!meta) return fail('File not found');
        const data = await r2.get(meta.storage_key);
        if (!data) return fail('File data missing from storage');
        return ok({ file: meta, content_base64: btoa(String.fromCharCode(...new Uint8Array(data))) });
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });

  server.tool('delete_file',
    'Delete file permanently.',
    DeleteFileSchema.shape,
    async (p: unknown) => {
      const i = p as DeleteFileInput;
      try {
        const e = getD1(); const r2 = getR2(); await db.ensureInitialized(e);
        const meta = await db.deleteFileMetadata(e, i.file_id);
        if (!meta) return fail('File not found');
        await r2.delete(meta.storage_key);
        await db.createAuditEntry(e, { workspace_id: meta.workspace_id, table_id: '__files__', record_id: meta.record_id, action: 'delete_file', actor: getActor(), changes: { file_id: meta.id, filename: meta.filename } });
        return ok({ success: true, deleted_file: meta });
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    });

  server.tool('list_files',
    'List file metadata in a workspace.',
    ListFilesSchema.shape,
    async (p: unknown) => {
      const i = p as ListFilesInput;
      try { const files = await withDb(e => db.listFiles(e, i.workspace_id, i.record_id)); return ok({ files, count: files.length }); }
      catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });

  // ═══════════════════════════════════════════════════════════════════
  // TOKEN MANAGEMENT (admin-only in production)
  // ═══════════════════════════════════════════════════════════════════

  server.tool('create_token',
    'Create an access token. Returns the raw token (shown once). Admin only.',
    CreateTokenSchema.shape,
    async (p: unknown) => { const i = p as CreateTokenInput; try {
      const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
      const token = await withDb(e => db.createAccessToken(e, rawToken, i.label, i.role, i.workspace_ids));
      await withDb(e => db.createAuditEntry(e, { workspace_id: '__system__', table_id: '__tokens__', record_id: token.id, action: 'token_created', actor: getActor(), changes: { label: i.label, role: i.role } }));
      return ok({ success: true, token: rawToken, id: token.id, label: token.label, role: token.role, workspace_ids: token.workspace_ids, warning: 'Save this token — it will not be shown again.' });
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('revoke_token',
    'Revoke an access token by ID. Admin only.',
    RevokeTokenSchema.shape,
    async (p: unknown) => { const i = p as RevokeTokenInput; try {
      const revoked = await withDb(e => db.revokeToken(e, i.token_id));
      if (revoked) await withDb(e => db.createAuditEntry(e, { workspace_id: '__system__', table_id: '__tokens__', record_id: i.token_id, action: 'token_revoked', actor: getActor(), changes: {} }));
      return revoked ? ok({ success: true }) : fail('Token not found');
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });
}
