/**
 * MCP Resource handlers — the Database tier (application-controlled).
 * 8 resources. Registration accepts getD1 accessor for both modes.
 */

import type { D1Exec } from '../services/executor.js';
import * as db from '../services/d1.js';

interface AnyMcpServer {
  resource(name: string, uri: string, meta: { description: string; mimeType: string }, handler: (...args: any[]) => any): void;
}

type ResourceResult = { contents: Array<{ uri: string; mimeType: string; text: string }> };

function json(uri: string, data: unknown): ResourceResult {
  return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data) }] };
}
function err(uri: string, e: unknown): ResourceResult {
  return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) }] };
}

export function registerResources(server: AnyMcpServer, getD1: () => D1Exec): void {

  async function withDb<T>(fn: (e: D1Exec) => Promise<T>): Promise<T> {
    const e = getD1(); await db.ensureInitialized(e); return fn(e);
  }

  server.resource('All Workspaces', 'substrate://workspaces',
    { description: 'List of all workspaces.', mimeType: 'application/json' },
    async (): Promise<ResourceResult> => {
      try { return json('substrate://workspaces', { workspaces: await withDb(e => db.listWorkspaces(e)) }); }
      catch (e) { return err('substrate://workspaces', e); }
    });

  server.resource('Workspace Detail', 'substrate://workspace/{id}',
    { description: 'Workspace detail with stats.', mimeType: 'application/json' },
    async (uri: URL): Promise<ResourceResult> => {
      const wid = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const ru = `substrate://workspace/${encodeURIComponent(wid)}`;
      try {
        if (!wid) return err(ru, 'Workspace ID required');
        return await withDb(async e => {
          const ws = await db.getWorkspace(e, wid);
          if (!ws) return err(ru, `Workspace '${wid}' not found`);
          const stats = await db.getWorkspaceStats(e, wid);
          const tables = await db.listTables(e, wid);
          return json(ru, { workspace: ws, stats, tables: tables.map(t => ({ id: t.id, name: t.name, description: t.description, column_count: t.columns.length })) });
        });
      } catch (e) { return err(ru, e); }
    });

  server.resource('Workspace Tables', 'substrate://tables/{workspace_id}',
    { description: 'All tables in a workspace.', mimeType: 'application/json' },
    async (uri: URL): Promise<ResourceResult> => {
      const wid = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const ru = `substrate://tables/${encodeURIComponent(wid)}`;
      try { if (!wid) return err(ru, 'Workspace ID required');
        return json(ru, { workspace_id: wid, tables: await withDb(e => db.listTables(e, wid)) });
      } catch (e) { return err(ru, e); }
    });

  server.resource('Table Detail', 'substrate://table/{id}',
    { description: 'Full table schema + record count.', mimeType: 'application/json' },
    async (uri: URL): Promise<ResourceResult> => {
      const tid = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const ru = `substrate://table/${encodeURIComponent(tid)}`;
      try { if (!tid) return err(ru, 'Table ID required');
        return await withDb(async e => {
          const tbl = await db.getTable(e, tid); if (!tbl) return err(ru, `Table '${tid}' not found`);
          const qr = await db.queryRecords(e, { table_id: tid, limit: 1, offset: 0 });
          return json(ru, { table: tbl, record_count: qr.total_count });
        });
      } catch (e) { return err(ru, e); }
    });

  server.resource('Table Records', 'substrate://records/{table_id}',
    { description: 'Most recent 25 records.', mimeType: 'application/json' },
    async (uri: URL): Promise<ResourceResult> => {
      const tid = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const ru = `substrate://records/${encodeURIComponent(tid)}`;
      try { if (!tid) return err(ru, 'Table ID required');
        const res = await withDb(e => db.queryRecords(e, { table_id: tid, limit: 25, offset: 0 }));
        return json(ru, { table_id: tid, records: res.records, total_count: res.total_count, showing: res.records.length });
      } catch (e) { return err(ru, e); }
    });

  server.resource('Record Relations', 'substrate://relations/{record_id}',
    { description: 'All relations for a record.', mimeType: 'application/json' },
    async (uri: URL): Promise<ResourceResult> => {
      const rid = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const ru = `substrate://relations/${encodeURIComponent(rid)}`;
      try { if (!rid) return err(ru, 'Record ID required');
        const rels = await withDb(e => db.getRelationsForRecord(e, rid));
        return json(ru, { record_id: rid, relations: rels, count: rels.length });
      } catch (e) { return err(ru, e); }
    });

  server.resource('Workspace Files', 'substrate://files/{workspace_id}',
    { description: 'Files in a workspace (metadata only).', mimeType: 'application/json' },
    async (uri: URL): Promise<ResourceResult> => {
      const wid = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const ru = `substrate://files/${encodeURIComponent(wid)}`;
      try { if (!wid) return err(ru, 'Workspace ID required');
        const files = await withDb(e => db.listFiles(e, wid));
        return json(ru, { workspace_id: wid, files, count: files.length, total_size_bytes: files.reduce((s, f) => s + f.size_bytes, 0) });
      } catch (e) { return err(ru, e); }
    });

  server.resource('Audit Log', 'substrate://audit/{workspace_id}',
    { description: 'Recent audit log (last 50).', mimeType: 'application/json' },
    async (uri: URL): Promise<ResourceResult> => {
      const wid = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const ru = `substrate://audit/${encodeURIComponent(wid)}`;
      try { if (!wid) return err(ru, 'Workspace ID required');
        const entries = await withDb(e => db.getAuditLog(e, wid, 50));
        return json(ru, { workspace_id: wid, entries, count: entries.length });
      } catch (e) { return err(ru, e); }
    });
}
