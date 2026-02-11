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

  // ─── getting_started ──────────────────────────────────────────────

  server.prompt('getting_started',
    'How to use Substrate. Tool sequences, workflows, and quick reference.',
    undefined,
    async (): Promise<PromptResult> => {
      let status = 'empty';
      try { await withDb(async e => {
        const wss = await db.listWorkspaces(e);
        status = wss.length ? `active (${wss.length} workspace${wss.length > 1 ? 's' : ''})` : 'empty';
      }); } catch { /* ok */ }

      const sys = `# Substrate — Getting Started

You are connected to Substrate, the agent-native data layer. Data lives in D1 + R2 on Cloudflare. You interact through MCP tools.

**Current status**: ${status}

## Tool Sequences

### 1. Discovery (read existing data)
\`\`\`
list_workspaces → find_records → get_record
\`\`\`
Always start with \`list_workspaces\` to see what exists, including table schemas. Then \`find_records\` to query/search by workspace + table name. Use \`get_record\` for a single record with its relations.

### 2. Creation (build new structures)
\`\`\`
create_workspace → define_table → add_record
\`\`\`
Create a workspace first (top-level container). Then define tables with typed columns. Then populate records. Records are validated against the table schema.

### 3. Relating data
\`\`\`
find_records (get IDs) → create_relation
\`\`\`
Relations link any two records bidirectionally. Use \`get_record\` to see a record's relations.

### 4. Files
\`\`\`
upload_file (with workspace_id, optional record_id) → list_files → download_file
\`\`\`
Files are stored in R2 with metadata in D1. Attach to records via record_id.

### 5. Admin (token management — admin role only)
\`\`\`
create_token → list_tokens → revoke_token
\`\`\`
Tokens have roles (admin/editor/reader) and optional workspace scoping.

## Key Tools (22 total)

| What you want | Tool | Notes |
|--------------|------|-------|
| See everything | \`list_workspaces\` | Returns workspaces + tables + column schemas |
| Find data | \`find_records\` | By workspace + table name, with filters or text search |
| Single record | \`get_record\` | By ID, includes relations |
| Add data | \`add_record\` | By workspace + table name, schema-validated |
| Update data | \`update_record\` | By record ID, merges with existing |
| Create structure | \`create_workspace\` → \`define_table\` | Workspace first, then tables |
| Link records | \`create_relation\` | Bidirectional, any two records |
| Upload files | \`upload_file\` | Base64, optional record attachment |
| Manage access | \`create_token\` | Admin only |

## Prompts

| Prompt | When to use |
|--------|------------|
| \`workspace_setup\` | "Set up a workspace for X" — guided creation |
| \`data_modeling\` | "Design tables for X" — produces define_table params |
| \`role_perspective\` | "Brief me as a [role]" — role-specific data view |
| \`data_audit\` | "What changed recently?" — audit trail review |

## Dashboard

Every workspace has a shareable read-only dashboard:
\`/dashboard/{workspace_id}\`

The dashboard auto-refreshes every 60 seconds. Share with stakeholders who need to verify data without using an agent.`;

      return { description: 'Getting started with Substrate', messages: [
        { role: 'user', content: { type: 'text', text: sys } },
      ] };
    });

  // ─── workspace_setup ─────────────────────────────────────────────

  server.prompt('workspace_setup',
    'Guide for setting up a new workspace. Walks through create_workspace → define_table → add_record.',
    { use_case: z.string().optional().describe('What this workspace is for') },
    async (params: Record<string, unknown>): Promise<PromptResult> => {
      const useCase = params.use_case as string | undefined;
      let sys = `You are helping set up an agent-native workspace — a structured data layer that teams interact with through agents, not through a database UI.

## Workflow
1. **create_workspace** — Create the top-level container
2. **define_table** — Define tables with typed column schemas (one per concept)
3. **add_record** — Populate initial data (validated against schema)
4. **create_relation** — Link related records across tables
5. Share the dashboard: /dashboard/{workspace_id}

## Concepts
- **Workspaces** — Top-level containers (one per team or project)
- **Tables** — Typed column schemas (text, number, boolean, date, datetime, select, multi_select, url, email, json, relation)
- **Records** — Data entries validated against table schema
- **Relations** — Bidirectional links between any two records
- **Files** — Documents/images in R2, linked via record_id

## Design Principles
- One concept per table (Projects, Tasks, People)
- Relations to connect concepts (use relation column type or create_relation)
- select/multi_select for constrained values (status, category, priority)
- Files for documents/images linked via record_id
- sensitive:true on columns to redact values in normal reads
- Design for agent queries — the agent is the primary interface`;

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
    'Design tables and relations. Produces concrete define_table tool parameters ready to execute.',
    { workspace_id: z.string().optional().describe('Workspace ID'), requirement: z.string().optional().describe('What you need') },
    async (params: Record<string, unknown>): Promise<PromptResult> => {
      const wsId = params.workspace_id as string | undefined;
      const req = params.requirement as string | undefined;
      let sys = `You are a data modeling expert. Design table schemas and produce concrete define_table parameters the agent can execute directly.

## Output Format
For each table, output the exact define_table call:
\`\`\`
define_table({ workspace_id: "...", name: "TableName", description: "...", columns: [...] })
\`\`\`

## Patterns
- One-to-Many: Use relation column type (e.g., { name: "project", type: "relation", relation_table_id: "tbl-id" })
- Many-to-Many: Use the relations system (create_relation after records exist)
- System auto-tracks: created_at, updated_at (no need to add these columns)
- Files: Separate system (upload_file with record_id), no file columns needed
- Sensitive data: Set sensitive:true on columns to auto-redact in reads`;

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
