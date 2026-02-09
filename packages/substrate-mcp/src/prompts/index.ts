/**
 * MCP Prompt handlers — the Judgment tier (user-controlled).
 * 4 prompts. Registration accepts getD1 accessor for both modes.
 */

import type { D1Exec } from '../services/executor.js';
import { z } from 'zod';
import * as db from '../services/d1.js';

interface AnyMcpServer {
  prompt(name: string, description: string, schema: Record<string, unknown> | undefined, handler: (...args: any[]) => any): void;
}

type PromptResult = { description: string; messages: Array<{ role: string; content: { type: string; text: string } }> };

export function registerPrompts(server: AnyMcpServer, getD1: () => D1Exec): void {

  async function withDb<T>(fn: (e: D1Exec) => Promise<T>): Promise<T> {
    const e = getD1(); await db.ensureInitialized(e); return fn(e);
  }

  // ─── workspace_setup ─────────────────────────────────────────────

  server.prompt('workspace_setup',
    'Guide for setting up a new workspace.',
    { use_case: z.string().optional().describe('What this workspace is for') },
    async (params: Record<string, unknown>): Promise<PromptResult> => {
      const useCase = params.use_case as string | undefined;
      let sys = `You are helping set up an agent-native workspace — a structured data layer that teams interact with through agents, not through a database UI.

Core concepts: Workspaces, Tables (typed column schemas), Records, Relations (bidirectional links), Files (R2 storage).

Column types: text, number, boolean, date, datetime, select, multi_select, url, email, json, relation.

Design principles:
- One concept per table (Projects, Tasks, People)
- Relations to connect concepts
- select/multi_select for constrained values
- Files for documents/images linked via record_id
- Design for agent queries`;

      try { await withDb(async e => {
        const wss = await db.listWorkspaces(e);
        if (wss.length) {
          sys += `\n\n**Existing workspaces (${wss.length}):**`;
          for (const ws of wss) {
            sys += `\n- ${ws.name}: ${ws.description || '(no description)'}`;
            const tbls = await db.listTables(e, ws.id);
            for (const t of tbls) sys += `\n  - Table "${t.name}": ${t.columns.length} columns`;
          }
        }
      }); } catch { /* ok */ }

      return { description: useCase ? `Workspace setup: ${useCase}` : 'Workspace setup guide', messages: [
        { role: 'user', content: { type: 'text', text: sys } },
        { role: 'user', content: { type: 'text', text: useCase ? `Set up a workspace for: ${useCase}\n\nRecommend tables, columns, and relations.` : 'Help me set up a new workspace.' } },
      ] };
    });

  // ─── data_modeling ───────────────────────────────────────────────

  server.prompt('data_modeling',
    'Design tables and relations. Produces concrete define_table parameters.',
    { workspace_id: z.string().optional().describe('Workspace ID'), requirement: z.string().optional().describe('What you need') },
    async (params: Record<string, unknown>): Promise<PromptResult> => {
      const wsId = params.workspace_id as string | undefined;
      const req = params.requirement as string | undefined;
      let sys = `You are a data modeling expert. Design table schemas that map to define_table.

Patterns: One-to-Many via relation columns. Many-to-Many via the relations system. System auto-tracks created_at/updated_at. Files are separate (upload_file with record_id).`;

      if (wsId) { try { await withDb(async e => {
        const ws = await db.getWorkspace(e, wsId);
        if (ws) {
          const tbls = await db.listTables(e, wsId);
          sys += `\n\n**Current schema for "${ws.name}":**`;
          if (!tbls.length) sys += '\n(no tables yet)';
          else for (const t of tbls) {
            sys += `\n\n**${t.name}** — ${t.description || ''}`;
            for (const col of t.columns) {
              const a: string[] = [col.type];
              if (col.required) a.push('required');
              if (col.options) a.push(`options: ${col.options.join(', ')}`);
              if (col.relation_table_id) a.push(`→ ${col.relation_table_id}`);
              sys += `\n  - ${col.name} (${a.join(', ')})`;
            }
          }
        }
      }); } catch { /* ok */ } }

      return { description: req ? `Data modeling: ${req}` : 'Data modeling guide', messages: [
        { role: 'user', content: { type: 'text', text: sys } },
        { role: 'user', content: { type: 'text', text: req ? `Design the schema for: ${req}` : 'Help me design the data model.' } },
      ] };
    });

  // ─── role_perspective ────────────────────────────────────────────

  server.prompt('role_perspective',
    'View workspace data through a role\'s lens. Replaces static Notion views.',
    { workspace_id: z.string().describe('Workspace ID'), role: z.string().describe('Your role'), question: z.string().optional().describe('Specific question') },
    async (params: Record<string, unknown>): Promise<PromptResult> => {
      const wsId = params.workspace_id as string;
      const role = params.role as string;
      const question = params.question as string | undefined;
      let sys = `You are an agent for a **${role}**. Highlight what matters to this role.`;

      try { await withDb(async e => {
        const ws = await db.getWorkspace(e, wsId);
        if (ws) {
          const stats = await db.getWorkspaceStats(e, wsId);
          const tables = await db.listTables(e, wsId);
          sys += `\n\n**Workspace: ${ws.name}** — ${stats.total_tables} tables, ${stats.total_records} records, ${stats.total_files} files, ${stats.recent_changes} changes (24h)`;
          for (const tbl of tables) {
            sys += `\n\n**${tbl.name}**: ${tbl.columns.map(c => `${c.name}[${c.type}]`).join(', ')}`;
            const qr = await db.queryRecords(e, { table_id: tbl.id, limit: 5, offset: 0 });
            if (qr.total_count) {
              sys += ` (${qr.total_count} records)`;
              for (const r of qr.records) sys += `\n  - ${Object.entries(r.data).slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(', ')}`;
            }
          }
        } else sys += `\n\nWorkspace '${wsId}' not found.`;
      }); } catch (e) { sys += `\n\nError: ${e instanceof Error ? e.message : String(e)}`; }

      return { description: `${role} perspective`, messages: [
        { role: 'user', content: { type: 'text', text: sys } },
        { role: 'user', content: { type: 'text', text: question ? `As a ${role}: ${question}` : `As a ${role}, brief me. What needs my attention?` } },
      ] };
    });

  // ─── data_audit ──────────────────────────────────────────────────

  server.prompt('data_audit',
    'Review recent changes for trust and oversight.',
    { workspace_id: z.string().describe('Workspace ID'), table_id: z.string().optional().describe('Filter to table') },
    async (params: Record<string, unknown>): Promise<PromptResult> => {
      const wsId = params.workspace_id as string;
      const tableId = params.table_id as string | undefined;
      let sys = `Data audit. Review changes: action, actor, changes, timestamp.`;

      try { await withDb(async e => {
        const ws = await db.getWorkspace(e, wsId);
        if (ws) {
          const entries = await db.getAuditLog(e, wsId, 50, tableId);
          sys += `\n\n**Audit for "${ws.name}"** (${entries.length} entries):`;
          for (const en of entries.slice(0, 25)) {
            const ch = typeof en.changes === 'object' ? JSON.stringify(en.changes).slice(0, 200) : String(en.changes);
            sys += `\n- [${en.timestamp}] ${String(en.action).toUpperCase()} ${en.table_id}${en.record_id ? `/${en.record_id}` : ''} by ${en.actor}: ${ch}`;
          }
          if (entries.length > 25) sys += `\n... and ${entries.length - 25} more`;
        } else sys += `\n\nWorkspace '${wsId}' not found.`;
      }); } catch (e) { sys += `\n\nError: ${e instanceof Error ? e.message : String(e)}`; }

      return { description: 'Data audit', messages: [
        { role: 'user', content: { type: 'text', text: sys } },
        { role: 'user', content: { type: 'text', text: 'Summarize recent changes. Any patterns or concerns?' } },
      ] };
    });
}
