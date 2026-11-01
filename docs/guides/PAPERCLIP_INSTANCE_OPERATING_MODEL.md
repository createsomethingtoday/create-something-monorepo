# Paperclip instance operating model

## Decision

Use the existing local `create-something` instance as the single Paperclip home for CREATE SOMETHING monorepo work. Do not spin up a new Paperclip instance for each checkout or worktree. Cloudflare Tunnel and Access provide remote entry while the Mac is awake and online. Linear remains canonical for tracked scope, ownership, status, and delivery evidence; Paperclip holds execution and collaboration records.

Keep `client-agent-pilot` separate while the controlled client experience and phone-origin acceptance are in progress. This is a deliberate client boundary, not a second monorepo home. Revisit migration only after its active work is reconciled and the client access model is agreed.

## Current routes

| Purpose | Instance | Local URL | Company | Company ID | Access URL |
| --- | --- | --- | --- | --- | --- |
| CREATE SOMETHING monorepo | `create-something` | `http://127.0.0.1:3101` | CREATE SOMETHING | `1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5` | `https://paperclip.createsomething.agency` |
| Controlled client experience | `client-agent-pilot` | `http://127.0.0.1:3100` | CREATE SOMETHING Control Client Pilot | `9eedb5af-efe3-4f17-a236-ec9dc3682334` | Client pilot tunnel; verify its current hostname before use |

These IDs are instance-local. Both companies use the Paperclip `CRE` issue prefix. Always include the instance name or full issue URL in handoffs. Do not infer a Linear issue from a Paperclip issue number.

## Read-only preflight

```bash
curl -fsS http://127.0.0.1:3101/api/health | jq '{status,version,deploymentMode,databaseBackup}'
curl -fsS http://127.0.0.1:3100/api/health | jq '{status,version,deploymentMode,databaseBackup}'
curl -fsS http://127.0.0.1:3101/api/companies | jq '[.[] | {id,name,issuePrefix}]'
```

Use the Paperclip CLI context profile `create-something` for monorepo work and `client-agent-pilot` only for the pilot. Check `paperclipai context show` before a mutation. Both running services use Node `v24.11.0`. The default interactive shell currently uses Node 22, which Paperclip does not support; select Node 24 before CLI work. A shell warning alone is not a reason to restart either healthy service.

## Inventory at decision time: 2026-09-27

- Both local health endpoints returned `200` with Paperclip `2026.916.1`, `status: ok`, and a recent database backup.
- `create-something`: 82 Paperclip issues, 12 agents, 23 workspace directories, approximately 1.2 GB of instance data.
- `client-agent-pilot`: 7 Paperclip issues, 2 agents, 3 workspace directories, approximately 164 MB of instance data. Its `CRE-2` and `CRE-5` phone and qualification tasks were still open; `CRE-4` was blocked.
- Unauthenticated requests to the two Cloudflare Paperclip entry points redirected to Access. This confirms the gate, not authenticated phone acceptance.

## Migration and hosting threshold

Preserve both databases, uploaded data, workspaces, run history, and tunnel settings. No pilot work was migrated by this decision. Before moving a company, compare its issue and run inventory, retain database and file backups, and test the destination without replaying uncertain work. Paperclip's [company export/import](https://docs.paperclip.ing/guides/power/export-import/) moves configuration and tasks but excludes approvals, cost history, activity logs, secrets, and machine-specific paths.

Use a VPS when unattended execution must continue while this Mac is offline. Paperclip's [supported deployment recipe](https://docs.paperclip.ing/how-to/deploy-to-vps-or-fly/) requires durable Postgres and a persistent home volume. Cloudflare Workers are not the current host for this server and its child agent processes. Cloudflare Containers use ephemeral disk and would require external persistence; keep Tunnel/Access as the lower-cost access layer until uptime justifies the VPS move.
