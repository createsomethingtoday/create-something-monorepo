# Half Dozen Current MCP Onboarding Pack

**Status:** Working draft  
**Audience:** Half Dozen team  
**Purpose:** operational onboarding pack for the MCPs currently in active team use

---

## 1. Onboarding objective

This onboarding is for governed team use of the current Half Dozen MCP fleet.

The goal is that team members can answer:

- which MCP supports which workflow
- which actions are safe to run directly
- which actions require approval or operator involvement
- which actions are blocked or out of scope
- what to do when an MCP is unavailable or returns uncertain state

---

## 2. MCP inventory

| MCP | Primary users | Primary workflow | Safe actions | Approval-required or operator-gated actions | Blocked or out-of-scope actions | Primary owner |
|-----|---------------|------------------|--------------|---------------------------------------------|---------------------------------|---------------|
| `halfdozen-notion-mcp` | operators, coordinators | work across Half Dozen internal Notion and a client Notion workspace | search, read schema, query data sources, draft or update content in the correct workspace | client-facing updates when internal review is required; any action where workspace targeting is unclear | writing to the wrong workspace; destructive changes without explicit intent | Half Dozen operator lead |
| `halfdozen-operator-notion-mcp` | platform/operator admins | manage pinned Notion accounts and onboarding state | list account state, inspect status, use pinned tools in the configured workspace | account onboarding wizard, pin changes, cross-account copy/sync | caller-selected workspace/account overrides on pinned tools | MCP operator/admin |
| `halfdozen-gmail-sync` | ops, relationship managers | search Gmail and sync interactions into Notion | search mail, preview query results, sync known-safe email records | bulk syncs or canonical record creation when team policy requires review | arbitrary destructive mailbox actions; unreviewed changes outside sync workflow | workflow owner |
| `halfdozen-dm-mcp` | DM operators | DM workspace work plus allow-listed Composio tools | Notion CRUD in DM workspace, inventory/check allowed toolkits, connection status | new toolkit connection via connect-link, writes through allow-listed proxy tools where business workflow requires review | tools outside allow-list; bypassing entity/account policy; unauthorized toolkit access | DM workflow owner |
| `halfdozen-zoom-sync` | meeting capture team | Zoom Clips extraction and Notion sync | search clips, get session status, transcript analysis, clip summarization | syncs that publish new canonical records; operator-only session/profile maintenance | asking end users to manage session cookies/profile; destructive edits outside clip workflow | technical owner |
| `half-dozen-youtube-sync` | content and research operators | extract playlist/video transcripts and sync to Notion | transcript extraction, playlist scraping, guided analysis, status/resource reads | end-to-end sync to canonical Notion target when internal review is required | arbitrary edits outside sync target; unsupported browser-only workflows on remote worker | content workflow owner |
| `halfdozen-telemetry-mcp` | maintainers, operators | inspect MCP fleet health and usage | query health, usage, activity, error trends | direct SQL or cleanup actions if maintainers choose to restrict them operationally | mutating operational data outside approved admin path | MCP maintainer |

---

## 3. Per-MCP operating notes

### `halfdozen-notion-mcp`

- Purpose: one operator surface for two workspaces, `halfdozen` and `client`
- Read path: safe for search, schema inspection, and workspace-aware reads
- Write path: safe only when the operator is certain which workspace is intended
- Approval boundary: use internal review when a client-facing page update changes project state or when workspace targeting is uncertain
- Block rule: do not write when the correct workspace is ambiguous
- Failure path: stop, confirm workspace, then retry or use manual Notion path

### `halfdozen-operator-notion-mcp`

- Purpose: admin/operator layer for pinned workspaces and onboarding state
- Safe path: status inspection, account listing, pinned tool execution in fixed workspaces
- Operator-gated path: onboarding wizard, account pinning, sync/copy across managed accounts
- Block rule: pinned tools reject workspace/account overrides and should stay that way
- Failure path: escalate to MCP operator/admin rather than improvising account changes

### `halfdozen-gmail-sync`

- Purpose: governed Gmail-to-Notion interaction and contact sync
- Safe path: search emails, preview queries, sync individually identified records
- Approval boundary: bulk or canonical writes should follow team review rules when they affect shared operating records
- Block rule: do not treat it as a general mailbox-management tool
- Failure path: if OAuth or sync fails, stop and hand off to manual Notion entry or auth repair

### `halfdozen-dm-mcp`

- Purpose: DM workspace plus DM-namespaced Composio proxies with allow-list controls
- Safe path: use currently exposed Notion tools and inspect enabled toolsets/status
- Approval boundary: new external connections and write actions through proxy tools need workflow-specific review if they affect canonical state
- Block rule: no tool outside the allow-list, no override around entity/account policy
- Failure path: if a toolkit is missing, verify allow-list and connection status before proceeding

### `halfdozen-zoom-sync`

- Purpose: governed Zoom Clips extraction and Notion sync
- Safe path: check session status, search synced clips, analyze transcripts
- Operator-gated path: `set_clips_profile` and `upload_session_context` are operator-only and should not be delegated to end users
- Approval boundary: syncs that publish or modify canonical records may require review by workflow owner
- Block rule: do not ask Half Dozen end users to manage session cookies or Steel profiles
- Failure path: if Clips auth is invalid, report temporary unavailability and route to MCP administrator

### `half-dozen-youtube-sync`

- Purpose: transcript extraction and Notion sync for playlist/video workflows
- Safe path: extract transcripts, scrape playlists, analyze transcript content
- Approval boundary: syncs into canonical Notion databases can be reviewed before broad rollout or high-volume runs
- Block rule: do not use the remote worker as if it supports all local/browser-only behavior
- Failure path: if extraction or sync fails, use connection test or CLI/manual fallback path

### `halfdozen-telemetry-mcp`

- Purpose: inspect fleet health, errors, and usage as a conversational operational layer
- Safe path: health and usage queries
- Approval boundary: if maintainers expose SQL/cleanup workflows, restrict them to maintainers
- Block rule: do not use operational mutation paths casually
- Failure path: fall back to direct logs/database review when the telemetry MCP itself is degraded

---

## 4. Team-wide policy framing

### Auto-allow

- reading status, resources, schemas, and search results
- draft generation and non-destructive analysis
- health and observability queries

### Approval-required or operator-gated

- client-facing sends or publishes
- writes to canonical client systems when review is required
- onboarding/account-connection changes
- high-volume or bulk syncs that affect shared operating records

### Blocked

- destructive actions outside explicit workflow scope
- writing into the wrong workspace or system on ambiguous context
- bypassing allow-list or account-pinning controls
- asking non-operator users to perform admin-only auth/session maintenance

---

## 5. Braintrust positioning

When Braintrust is part of the discussion:

- use it for traces, evals, and observability
- use it to inspect policy outcomes and runtime behavior
- do not present it as the system that grants permission or enforces approval

---

## 6. Live onboarding agenda for the Half Dozen team

### Part 1. Fleet overview

- introduce each MCP and the workflow it supports
- show the MCP inventory table

### Part 2. Policy boundary

- explain auto-allow, approval-required, and blocked actions
- give one real example from Notion, one from sync, and one from telemetry

### Part 3. Failure handling

- show the fallback owner for each MCP family
- explain when to stop instead of improvising

### Part 4. Evidence

- show where runbooks and golden-task checks live
- show where Braintrust or logs are used for evidence

---

## 7. Completion criteria

- the team can map each MCP to the correct workflow
- the team can identify at least one safe action, one gated action, and one blocked action for each MCP they use
- the team knows which MCPs are operator-only in parts of their workflow
- the team knows the fallback and escalation path
