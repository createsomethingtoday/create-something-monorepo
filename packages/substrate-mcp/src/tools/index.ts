/**
 * MCP Tool handlers — the Automation tier (model-controlled).
 *
 * 19 tools: workspace (3) + table (3) + record (3) + query (2) +
 *           relation (2) + bulk (2) + file (4) = 19
 *
 * Registration accepts accessor functions so the same code works with
 * both ScopedMcpServer (stdio) and McpServer (Worker/McpAgent).
 */

import { z } from 'zod';
import type { D1Exec, R2Store } from '../services/executor.js';
import { generateStorageKey } from '../services/r2.js';
import * as db from '../services/d1.js';
import { ColumnType, MAX_FILE_SIZE_BYTES, MAX_RECORDS_PER_QUERY } from '../constants.js';
import type { ColumnDefinition } from '../types.js';

import {
  FilterSchema, SortSchema,
  CreateWorkspaceSchema, UpdateWorkspaceSchema, DeleteWorkspaceSchema,
  DefineTableSchema, UpdateTableSchema, DeleteTableSchema,
  CreateRecordSchema, UpdateRecordSchema, DeleteRecordSchema,
  QueryRecordsSchema, SearchRecordsSchema,
  CreateRelationSchema, DeleteRelationSchema,
  BulkCreateRecordsSchema, BulkDeleteRecordsSchema,
  UploadFileSchema, DownloadFileSchema, DeleteFileSchema, ListFilesSchema,
} from '../schemas/index.js';

import type {
  CreateWorkspaceInput, UpdateWorkspaceInput, DeleteWorkspaceInput,
  DefineTableInput, UpdateTableInput, DeleteTableInput,
  CreateRecordInput, UpdateRecordInput, DeleteRecordInput,
  QueryRecordsInput, SearchRecordsInput,
  CreateRelationInput, DeleteRelationInput,
  BulkCreateRecordsInput, BulkDeleteRecordsInput,
  UploadFileInput, DownloadFileInput, DeleteFileInput, ListFilesInput,
} from '../schemas/index.js';

// ─── Server type that works for both McpServer and ScopedMcpServer ──

interface AnyMcpServer {
  tool(name: string, description: string, schema: Record<string, unknown>, handler: (...args: unknown[]) => unknown, opts?: { readOnly?: boolean }): void;
}

// ─── Response helpers (work in both modes) ───────────────────────────

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
// Registration — accepts accessors so it works in both modes
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

  // ─── Discovery (read-only) ────────────────────────────────────────
  // These let the agent navigate the data independently.
  // Without them, the agent has no way to find workspace/table IDs.

  server.tool('list_workspaces',
    'List all workspaces with IDs, names, descriptions.',
    {},
    async () => { try { return ok({ workspaces: await withDb(e => db.listWorkspaces(e)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } },
    { readOnly: true });

  server.tool('list_tables',
    'List tables in a workspace with IDs, names, column schemas.',
    { workspace_id: z.string().min(1) } as Record<string, unknown>,
    async (p: unknown) => { const i = p as { workspace_id: string }; try { return ok({ tables: await withDb(e => db.listTables(e, i.workspace_id)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } },
    { readOnly: true });

  server.tool('get_record',
    'Get a single record by ID.',
    { record_id: z.string().min(1) } as Record<string, unknown>,
    async (p: unknown) => { const i = p as { record_id: string }; try { const rec = await withDb(e => db.getRecord(e, i.record_id)); return rec ? ok({ record: rec }) : fail('Record not found'); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } },
    { readOnly: true });

  server.tool('get_relations',
    'Get all relations for a record.',
    { record_id: z.string().min(1) } as Record<string, unknown>,
    async (p: unknown) => { const i = p as { record_id: string }; try { const rels = await withDb(e => db.getRelationsForRecord(e, i.record_id)); return ok({ relations: rels, count: rels.length }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } },
    { readOnly: true });

  // ─── High-Level Query (reduces 3 tool calls to 1) ────────────────

  server.tool('find_records',
    'Query by workspace name + table name + filters. One call instead of list_workspaces → list_tables → query_records. Use this for most queries.',
    {
      workspace_name: z.string().min(1).describe('workspace name'),
      table_name: z.string().min(1).describe('table name'),
      filters: z.array(FilterSchema).optional(),
      sorts: z.array(SortSchema).optional(),
      limit: z.number().int().min(1).max(MAX_RECORDS_PER_QUERY).default(25),
      offset: z.number().int().min(0).default(0),
      search: z.string().optional().describe('text search (instead of filters)'),
    } as Record<string, unknown>,
    async (p: unknown) => {
      const i = p as { workspace_name: string; table_name: string; filters?: unknown[]; sorts?: unknown[]; limit?: number; offset?: number; search?: string };
      try {
        return ok(await withDb(async e => {
          const ws = await db.getWorkspaceByName(e, i.workspace_name);
          if (!ws) return { error: `Workspace '${i.workspace_name}' not found. Use list_workspaces to see available.` };
          const tbl = await db.getTableByName(e, ws.id, i.table_name);
          if (!tbl) {
            const tables = await db.listTables(e, ws.id);
            return { error: `Table '${i.table_name}' not found in '${i.workspace_name}'. Available: ${tables.map(t => t.name).join(', ')}` };
          }
          if (i.search) {
            const recs = await db.searchRecords(e, tbl.id, i.search, i.limit ?? 25);
            return { table: tbl.name, records: recs, count: recs.length };
          }
          return await db.queryRecords(e, {
            table_id: tbl.id,
            filters: i.filters as import('../types.js').QueryFilter[] | undefined,
            sorts: i.sorts as import('../types.js').QuerySort[] | undefined,
            limit: i.limit, offset: i.offset,
          });
        }));
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });

  // ─── Workspace ───────────────────────────────────────────────────

  server.tool('create_workspace',
    'Create a workspace. Names must be unique.',
    CreateWorkspaceSchema.shape,
    async (p: unknown) => { const i = p as CreateWorkspaceInput; try { return ok({ success: true, workspace: await withDb(e => db.createWorkspace(e, i.name, i.description)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('update_workspace',
    'Update workspace name or description.',
    UpdateWorkspaceSchema.shape,
    async (p: unknown) => { const i = p as UpdateWorkspaceInput; try { const w = await withDb(e => db.updateWorkspace(e, i.workspace_id, { name: i.name, description: i.description })); return w ? ok({ success: true, workspace: w }) : fail(`Workspace '${i.workspace_id}' not found`); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('delete_workspace',
    'Delete workspace and all contents. Irreversible.',
    DeleteWorkspaceSchema.shape,
    async (p: unknown) => { const i = p as DeleteWorkspaceInput; try { return (await withDb(e => db.deleteWorkspace(e, i.workspace_id))) ? ok({ success: true }) : fail(`Workspace '${i.workspace_id}' not found`); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ─── Table ───────────────────────────────────────────────────────

  server.tool('define_table',
    'Define a table with typed columns in a workspace.',
    DefineTableSchema.shape,
    async (p: unknown) => { const i = p as DefineTableInput; try { return ok({ success: true, table: await withDb(e => db.createTable(e, i.workspace_id, i.name, i.description, i.columns)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('update_table',
    'Update table schema. Columns list replaces existing.',
    UpdateTableSchema.shape,
    async (p: unknown) => { const i = p as UpdateTableInput; try { const t = await withDb(e => db.updateTable(e, i.table_id, { name: i.name, description: i.description, columns: i.columns })); return t ? ok({ success: true, table: t }) : fail(`Table '${i.table_id}' not found`); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('delete_table',
    'Delete table and all records. Irreversible.',
    DeleteTableSchema.shape,
    async (p: unknown) => { const i = p as DeleteTableInput; try { return (await withDb(e => db.deleteTable(e, i.table_id))) ? ok({ success: true }) : fail(`Table '${i.table_id}' not found`); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ─── Record ──────────────────────────────────────────────────────

  server.tool('create_record',
    'Create a record. Validated against table schema.',
    CreateRecordSchema.shape,
    async (p: unknown) => { const i = p as CreateRecordInput; try {
      return ok({ success: true, record: await withDb(async e => {
        const tbl = await db.getTable(e, i.table_id); if (!tbl) throw new Error(`Table '${i.table_id}' not found`);
        validateRecordData(tbl.columns, i.data);
        const rec = await db.createRecord(e, i.table_id, i.data);
        await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: i.table_id, record_id: rec.id, action: 'create', actor: getActor(), changes: { data: i.data } });
        return rec;
      }) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('update_record',
    'Update record fields. Merges with existing data.',
    UpdateRecordSchema.shape,
    async (p: unknown) => { const i = p as UpdateRecordInput; try {
      return ok({ success: true, record: await withDb(async e => {
        const old = await db.getRecord(e, i.record_id); if (!old) throw new Error(`Record '${i.record_id}' not found`);
        const tbl = await db.getTable(e, old.table_id);
        const rec = await db.updateRecord(e, i.record_id, i.data);
        if (tbl) await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: old.table_id, record_id: i.record_id, action: 'update', actor: getActor(), changes: { before: old.data, after: i.data } });
        return rec;
      }) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('delete_record',
    'Delete a record. Irreversible.',
    DeleteRecordSchema.shape,
    async (p: unknown) => { const i = p as DeleteRecordInput; try {
      const deleted = await withDb(async e => {
        const old = await db.getRecord(e, i.record_id); if (!old) return false;
        const tbl = await db.getTable(e, old.table_id);
        const success = await db.deleteRecord(e, i.record_id);
        if (success && tbl) await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: old.table_id, record_id: i.record_id, action: 'delete', actor: getActor(), changes: { data: old.data } });
        return success;
      });
      return deleted ? ok({ success: true }) : fail(`Record '${i.record_id}' not found`);
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ─── Query ───────────────────────────────────────────────────────

  server.tool('query_records',
    'Query records with filters, sorting, and pagination.',
    QueryRecordsSchema.shape,
    async (p: unknown) => { const i = p as QueryRecordsInput; try { return ok(await withDb(e => db.queryRecords(e, { table_id: i.table_id, filters: i.filters, sorts: i.sorts, limit: i.limit, offset: i.offset, columns: i.columns }))); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } },
    { readOnly: true });

  server.tool('search_records',
    'Search records by text across all fields.',
    SearchRecordsSchema.shape,
    async (p: unknown) => { const i = p as SearchRecordsInput; try { const recs = await withDb(e => db.searchRecords(e, i.table_id, i.query, i.limit)); return ok({ records: recs, count: recs.length }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } },
    { readOnly: true });

  // ─── Relation ────────────────────────────────────────────────────

  server.tool('create_relation',
    'Link two records bidirectionally.',
    CreateRelationSchema.shape,
    async (p: unknown) => { const i = p as CreateRelationInput; try { return ok({ success: true, relation: await withDb(e => db.createRelation(e, i.source_table_id, i.source_record_id, i.target_table_id, i.target_record_id, i.relation_name)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('delete_relation',
    'Remove a relation.',
    DeleteRelationSchema.shape,
    async (p: unknown) => { const i = p as DeleteRelationInput; try { return (await withDb(e => db.deleteRelation(e, i.relation_id))) ? ok({ success: true }) : fail(`Relation '${i.relation_id}' not found`); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ─── Bulk ────────────────────────────────────────────────────────

  server.tool('bulk_create_records',
    'Create multiple records (max 50). Validated against schema.',
    BulkCreateRecordsSchema.shape,
    async (p: unknown) => { const i = p as BulkCreateRecordsInput; try {
      const recs = await withDb(async e => {
        const tbl = await db.getTable(e, i.table_id); if (!tbl) throw new Error(`Table '${i.table_id}' not found`);
        for (const d of i.records) validateRecordData(tbl.columns, d);
        const created = await db.bulkCreateRecords(e, i.table_id, i.records);
        await db.createAuditEntry(e, { workspace_id: tbl.workspace_id, table_id: i.table_id, record_id: null, action: 'create', actor: getActor(), changes: { bulk: true, count: created.length } });
        return created;
      });
      return ok({ success: true, records: recs, count: recs.length });
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  server.tool('bulk_delete_records',
    'Delete multiple records (max 50).',
    BulkDeleteRecordsSchema.shape,
    async (p: unknown) => { const i = p as BulkDeleteRecordsInput; try { return ok({ success: true, deleted_count: await withDb(e => db.bulkDeleteRecords(e, i.record_ids)) }); } catch (e) { return fail(e instanceof Error ? e.message : String(e)); } });

  // ─── File Operations ─────────────────────────────────────────────

  server.tool('upload_file',
    `Upload a file (base64). Max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB. Optionally attach to a record.`,
    UploadFileSchema.shape,
    async (p: unknown) => {
      const i = p as UploadFileInput;
      try {
        const e = getD1(); const r2 = getR2();
        await db.ensureInitialized(e);

        const bytes = Uint8Array.from(atob(i.content_base64), c => c.charCodeAt(0));
        if (bytes.length > MAX_FILE_SIZE_BYTES) return fail(`File too large: ${bytes.length} bytes (max ${MAX_FILE_SIZE_BYTES})`);

        const fileId = crypto.randomUUID();
        const storageKey = generateStorageKey(i.workspace_id, fileId, i.filename);

        await r2.put(storageKey, bytes.buffer as ArrayBuffer, i.content_type);

        const meta = await db.createFileMetadata(e, {
          id: fileId, workspace_id: i.workspace_id, record_id: i.record_id ?? null,
          filename: i.filename, content_type: i.content_type, size_bytes: bytes.length,
          storage_key: storageKey, uploaded_by: getActor(), description: i.description ?? '',
        });

        await db.createAuditEntry(e, {
          workspace_id: i.workspace_id, table_id: '__files__', record_id: i.record_id ?? null,
          action: 'upload', actor: getActor(), changes: { file_id: fileId, filename: i.filename, size: bytes.length },
        });

        return ok({ success: true, file: meta });
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    });

  server.tool('download_file',
    'Download file as base64.',
    DownloadFileSchema.shape,
    async (p: unknown) => {
      const i = p as DownloadFileInput;
      try {
        const e = getD1(); const r2 = getR2();
        await db.ensureInitialized(e);

        const meta = await db.getFileMetadata(e, i.file_id);
        if (!meta) return fail(`File '${i.file_id}' not found`);

        const data = await r2.get(meta.storage_key);
        if (!data) return fail(`File data not found in storage for key '${meta.storage_key}'`);

        const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));

        return ok({ file: meta, content_base64: base64 });
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });

  server.tool('delete_file',
    'Delete a file. Irreversible.',
    DeleteFileSchema.shape,
    async (p: unknown) => {
      const i = p as DeleteFileInput;
      try {
        const e = getD1(); const r2 = getR2();
        await db.ensureInitialized(e);

        const meta = await db.deleteFileMetadata(e, i.file_id);
        if (!meta) return fail(`File '${i.file_id}' not found`);

        await r2.delete(meta.storage_key);

        await db.createAuditEntry(e, {
          workspace_id: meta.workspace_id, table_id: '__files__', record_id: meta.record_id,
          action: 'delete_file', actor: getActor(), changes: { file_id: meta.id, filename: meta.filename },
        });

        return ok({ success: true, deleted_file: meta });
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    });

  server.tool('list_files',
    'List file metadata in a workspace.',
    ListFilesSchema.shape,
    async (p: unknown) => {
      const i = p as ListFilesInput;
      try {
        const files = await withDb(e => db.listFiles(e, i.workspace_id, i.record_id));
        return ok({ files, count: files.length });
      } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
    },
    { readOnly: true });
}
