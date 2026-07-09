# @create-something/substrate-mcp

**Substrate** — the first-class CREATE SOMETHING database-layer runtime
direction. It combines Cloudflare D1/R2 records, API/MCP access, Atlas topology,
workflow actions/runs/receipts, audit state, and a fast operator-facing database
UI.

Current product direction is documented in
`../../docs/CREATE_SOMETHING_DATABASE_LAYER.md`. `packages/app-governance-db`
is the first realized instance of the direction; Substrate is the reusable
runtime target. Its generic workspace/record model must be reconciled with the
newer app-governance patterns before production extraction: source records,
Atlas bindings, workflow actions, workflow runs, receipts,
transfer/readiness reviews, and meticulous front-end database interaction.

## The Paradigm

> Why should a human trust an agent-managed database unless the records,
> bindings, actions, and receipts are visible when they need to inspect them?

Notion collapses Database, Automation, and Judgment into one opinionated
workspace. Substrate should separate them through API/MCP while still providing
a fast, Canon-aligned operator UI. Obsidian is the local-feel baseline for the
operator path: fast navigation, instant filtering over the active working set,
stable object URLs, and almost no perceived interface drag.

| Tier | MCP Primitive | What It Does |
|------|---------------|--------------|
| **Database** | Resources | Expose workspace state — schemas, records, relations, files |
| **Automation** | Tools | CRUD, queries, search, relations, file upload/download |
| **Judgment** | Prompts | Role-based perspectives, data modeling, audits |

The UI is not optional. Agents should be able to operate the shared data, and
humans should be able to inspect the same state through a fast database
experience: filtered rows, selected records, Atlas bindings, relations, actions,
runs, receipts, and audit history. The UI is a projection over the record model,
not a second state owner.

## System Design Bar

Substrate should be the best database experience CREATE SOMETHING can design
for mapped AI workflows, not merely an internal admin table.

| Principle | Requirement |
|-----------|-------------|
| **Topology is data** | Atlas canvases, nodes, edges, source bindings, relations, and geometry are durable records first. SvelteFlow, desktop, and browser views render those records. |
| **Execution is inspectable** | Actions propose what should happen, runs record what happened, and receipts explain why the current state is trustworthy. |
| **Judgment is attached** | Approvals, waivers, stop reasons, owners, policy gates, and handoff notes live beside the affected record. |
| **UI is a fast projection** | The interface should feel closer to Obsidian than a heavy SaaS workspace: local filtering, direct record movement, stable layout, keyboard-friendly selection, and small refreshes. |
| **API/MCP parity** | Any state visible in the UI must be readable through API/MCP, and any agent mutation must be visible in the UI/audit trail. |
| **Cloudflare-native durability** | D1 owns relational state; R2 owns files and large evidence; Workers expose API/MCP boundaries; local desktop enhances the same state. |

Performance claims must stay evidence-backed. Until benchmarked, the bar is a
budget: Obsidian-like responsiveness for loaded working sets, Cloudflare-backed
durability for shared state, and API/MCP access without a separate agent-only
schema.

## Architecture

```
Team Member → Agent (Claude) → substrate-mcp → D1 (data) + R2 (files)
    ↑                                              ↓
    └── "What tasks are overdue?" ←── structured data + documents
```

- **Workspaces** — Top-level containers (one per team or project)
- **Tables** — Schema definitions with typed columns
- **Records** — Data entries stored as JSON
- **Relations** — Bidirectional links between records
- **Files** — Documents, images, attachments (R2 storage, D1 metadata)
- **Audit Log** — Every mutation tracked for trust
- **Dashboard** — Read-only HTML views for trust and verification

## Database UI (Trust Layer)

The agent can manage the data; the UI proves it. Read-only HTML views that
auto-refresh every 60 seconds are the minimum trust layer. The broader CREATE
SOMETHING database layer needs a richer front-end experience, similar in
discipline to the app-governance dashboard and faster in feel: dense records,
quick filtering, selection state, source bindings, map context, workflow
actions/runs, receipts, direct URLs, and keyboard-friendly movement.

| URL | What It Shows |
|-----|---------------|
| `/dashboard` | All workspaces, tables, records, audit log (admin overview / demo) |
| `/dashboard/{workspace_id}` | Single workspace view (shareable with clients / team members) |
| `/records/{record_id}` | Direct record inspection with bindings, actions, receipts, and audit context |
| `/atlas/{canvas_id}` | Map view rendered from durable Atlas records |
| `/actions` | Workflow action/run queue with policy and receipt state |

### Share Links

Every workspace gets a dashboard URL the moment it's created. No extra setup:

```
https://substrate.mcp.createsomething.agency/dashboard/ws-abc-123-def
```

Hand this to a client or stakeholder. They see exactly what's in their workspace -- tables, records, recent activity -- without needing an agent or a token. The workspace ID is a UUID, so the link is unguessable.

### When to Use the Dashboard vs. the Agent

| Need | Use |
|------|-----|
| Day-to-day work (create, query, update) | Agent via MCP |
| Verify what the agent stored | Dashboard share link |
| Client status check | Dashboard share link |
| System overview / demo | `/dashboard` (all workspaces) |

The dashboard is the instrument cluster -- you don't drive by staring at it, but you glance at it to know the engine is doing what you expect.

## Authentication

Substrate uses **Bearer token auth** for all remote MCP endpoints. Tokens are SHA-256 hashed and stored in D1 with role-based access control and workspace scoping.

### Roles

| Role | Permissions |
|------|------------|
| **admin** | Full access + token management (`create_token`, `revoke_token`, `list_tokens`) + `purge_workspace` |
| **editor** | CRUD on workspaces, tables, records, files, relations. No token management. |
| **reader** | Read-only: `find_records`, `list_workspaces`, `get_record`, `upvote_content` |

### Bootstrap (First-Time Setup)

On first deploy with no tokens in the database, Substrate enters **bootstrap mode**: unauthenticated admin access is granted so you can create the first token.

1. Connect your MCP client to the remote URL (no auth header needed)
2. Use the `create_token` tool to create an admin token:
   ```
   create_token({ label: "my-admin", role: "admin" })
   ```
3. Save the returned token — it is shown only once
4. From now on, all connections require `Authorization: Bearer <token>`

### Connecting with Auth

#### Remote (Production)

**URL**: `https://substrate.mcp.createsomething.agency`

```json
{
  "mcpServers": {
    "substrate": {
      "url": "https://substrate.mcp.createsomething.agency/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

#### Reader-Only Access

```json
{
  "mcpServers": {
    "substrate-reader": {
      "url": "https://substrate.mcp.createsomething.agency/reader/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_READER_TOKEN"
      }
    }
  }
}
```

#### Local (stdio — no auth)

Stdio mode is single-user and does not require tokens:

```json
{
  "mcpServers": {
    "substrate": {
      "command": "node",
      "args": ["/path/to/packages/substrate-mcp/dist/index.js"],
      "env": {
        "CF_ACCOUNT_ID": "...",
        "CF_API_TOKEN": "...",
        "CF_D1_DATABASE_ID": "...",
        "R2_ACCESS_KEY_ID": "...",
        "R2_SECRET_ACCESS_KEY": "...",
        "R2_BUCKET_NAME": "substrate-files"
      }
    }
  }
}
```

### Workspace Scoping

Tokens can be scoped to specific workspaces:

```
create_token({ label: "project-a-editor", role: "editor", workspace_ids: ["ws-id-1", "ws-id-2"] })
```

- `["*"]` (default) — access all workspaces
- `["ws-123", "ws-456"]` — restrict to listed workspace IDs only

Workspace-scoped tokens can only read/write data in their allowed workspaces. Operations on other workspaces return "Access denied."

### Token Management (Admin Only)

| Tool | Description |
|------|-------------|
| `create_token` | Create a new access token with role and workspace scope |
| `revoke_token` | Revoke a token by ID |
| `list_tokens` | List all tokens (hashes hidden) |

All token operations are logged in the audit trail.

## Quick Start

### 1. Create Cloudflare resources

```bash
# D1 database for structured data
wrangler d1 create substrate-mcp-db

# R2 bucket for files
wrangler r2 bucket create substrate-files

# R2 API token (S3-compatible) — create at:
# Cloudflare Dashboard → R2 → Manage R2 API Tokens
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in: CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DATABASE_ID
#          R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
```

### 3. Build and run

```bash
pnpm install  # from monorepo root
pnpm --filter=substrate-mcp build
pnpm --filter=substrate-mcp start
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `src/index.ts` |
| Boot command | `pnpm --filter=substrate-mcp dev` for local iteration, or `pnpm --filter=substrate-mcp start` after `pnpm --filter=substrate-mcp build` for the compiled stdio server |
| Smoke command | `pnpm --filter=substrate-mcp typecheck && pnpm --filter=substrate-mcp build` |
| Validation surfaces | typecheck output, stdio startup, Cloudflare-backed tool responses, database UI views at `/dashboard`, `/dashboard/{workspace_id}`, direct record/Atlas/action URLs, D1 audit log rows, R2 file metadata |
| UI validation path | `/dashboard` for fleet state, `/dashboard/{workspace_id}` for a single workspace trust view, and direct object URLs for record/action/receipt inspection |
| Escalation rule | Stop if MCP responses and dashboard state diverge, or if auth, D1, or R2 behavior depends on secrets or Cloudflare bindings that are unavailable in the current local environment. |

## MCP Primitives

### Tools (Automation Tier) — 22 tools

| Category | Tool | Description | Min Role |
|----------|------|-------------|----------|
| Workspace | `create_workspace` | Create a workspace | editor |
| | `update_workspace` | Update name/description | editor |
| | `archive_workspace` | Soft-delete workspace | editor |
| | `purge_workspace` | Permanently delete (requires confirm) | **admin** |
| Table | `define_table` | Create table with typed columns | editor |
| | `update_table` | Update schema | editor |
| | `archive_table` | Soft-delete table | editor |
| Record | `add_record` | Create (validated against schema) | editor |
| | `update_record` | Partial update (merge) | editor |
| | `archive_record` | Soft-delete record | editor |
| | `restore_record` | Restore archived record | editor |
| Query | `find_records` | Filter, sort, search by name | reader |
| | `get_record` | Get by ID with relations | reader |
| | `list_workspaces` | List all with schemas | reader |
| | `read_sensitive` | Read redacted field (audited) | editor |
| Relation | `create_relation` | Link two records | editor |
| | `delete_relation` | Remove link | editor |
| Bulk | `bulk_create_records` | Create up to 50 records | editor |
| | `bulk_archive_records` | Archive up to 50 records | editor |
| File | `upload_file` | Upload file (base64) to R2 | editor |
| | `download_file` | Download file as base64 | reader |
| | `delete_file` | Delete from R2 + D1 | editor |
| | `list_files` | List files (metadata only) | reader |
| Auth | `create_token` | Create access token | **admin** |
| | `revoke_token` | Revoke token by ID | **admin** |
| | `list_tokens` | List all tokens (hashes hidden) | **admin** |

### Resources (Database Tier) — 8 resources

| Resource | Description |
|----------|-------------|
| `substrate://workspaces` | All workspaces |
| `substrate://workspace/{id}` | Detail with stats |
| `substrate://tables/{workspace_id}` | Tables in workspace |
| `substrate://table/{id}` | Table schema + record count |
| `substrate://records/{table_id}` | Recent 25 records |
| `substrate://relations/{record_id}` | Relations for a record |
| `substrate://files/{workspace_id}` | Files in workspace |
| `substrate://audit/{workspace_id}` | Recent audit log |

### Prompts (Judgment Tier) — 4 prompts

| Prompt | Description |
|--------|-------------|
| `workspace_setup` | Guide for structuring a new workspace |
| `data_modeling` | Design tables from requirements |
| `role_perspective` | View data through a role's lens |
| `data_audit` | Review changes for trust |

## File Storage

Files are stored in Cloudflare R2 (S3-compatible object storage). Metadata is tracked in D1 alongside the structured data.

```
Agent: "Upload this project proposal PDF and attach it to the Main Street project."
→ upload_file with content_base64, record_id pointing to the project record
→ Stored in R2 at: {workspace_id}/files/{file_id}/{filename}
→ Metadata in D1: filename, size, content_type, record association

Agent: "What documents are attached to the Main Street project?"
→ list_files filtered by record_id
→ Returns metadata for all attached files

Agent: "Download the latest site plan."
→ download_file by file_id
→ Returns base64 content + metadata
```

## Three-Tier Framework

This server is a reference implementation of the [Three-Tier Framework](../../docs/THREE_TIER_FRAMEWORK.md):

- **Database** (Resources): D1 for schemas/records/relations/metadata, R2 for file bytes
- **Automation** (Tools): 22 tools for full CRUD lifecycle including file operations and auth management
- **Judgment** (Prompts): 4 prompts for dynamic, role-based perspectives
- **Insight** (cross-cutting): Every operation emits structured events
- **Artifacts**: Workspace, TableDefinition, Record, Relation, FileMetadata, AuditEntry

## Built With

- [@create-something/mcp-core](../mcp-core/) — Multi-account MCP abstractions
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — Edge SQL database
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — Object storage
- [Zod](https://zod.dev/) — Schema validation
- [Model Context Protocol](https://modelcontextprotocol.io/) — The connectivity standard

---

*The primitive is always relative. The UI becomes the conversation.*
