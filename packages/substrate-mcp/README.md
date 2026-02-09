# @create-something/substrate-mcp

**Substrate** — the agent-native data layer. Replaces Notion with MCP-managed workspaces where teams interact through agents, not UI. Structured data in D1, files in R2, connectivity through MCP.

## The Paradigm

> Why does a human need to see rows in a table when an agent can just answer their question?

Notion collapses Database, Automation, and Judgment into one opinionated UI. Substrate separates them cleanly through MCP:

| Tier | MCP Primitive | What It Does |
|------|---------------|--------------|
| **Database** | Resources | Expose workspace state — schemas, records, relations, files |
| **Automation** | Tools | CRUD, queries, search, relations, file upload/download |
| **Judgment** | Prompts | Role-based perspectives, data modeling, audits |

The UI becomes the conversation. Each team member's agent connects to the shared data and interprets it through their role's lens.

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

### 4. Connect from Claude Desktop

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

## MCP Primitives

### Tools (Automation Tier) — 19 tools

| Category | Tool | Description |
|----------|------|-------------|
| Workspace | `create_workspace` | Create a workspace |
| | `update_workspace` | Update name/description |
| | `delete_workspace` | Delete workspace + all contents |
| Table | `define_table` | Create table with typed columns |
| | `update_table` | Update schema |
| | `delete_table` | Delete table + records |
| Record | `create_record` | Create (validated against schema) |
| | `update_record` | Partial update (merge) |
| | `delete_record` | Delete record |
| Query | `query_records` | Filter, sort, paginate |
| | `search_records` | Full-text search |
| Relation | `create_relation` | Link two records |
| | `delete_relation` | Remove link |
| Bulk | `bulk_create_records` | Create up to 50 records |
| | `bulk_delete_records` | Delete up to 50 records |
| File | `upload_file` | Upload file (base64) to R2 |
| | `download_file` | Download file as base64 |
| | `delete_file` | Delete from R2 + D1 |
| | `list_files` | List files (metadata only) |

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
- **Automation** (Tools): 19 tools for full CRUD lifecycle including file operations
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
