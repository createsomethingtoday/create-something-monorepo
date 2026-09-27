---
name: paperclip-instance-operations
description: Route CREATE SOMETHING monorepo and client-pilot work to the correct local Paperclip instance, verify its health, and preserve issue and migration provenance.
---

# Paperclip instance operations

Use this skill when creating, reading, running, or reconciling Paperclip work for CREATE SOMETHING. Read [the operating model](../../../docs/guides/PAPERCLIP_INSTANCE_OPERATING_MODEL.md) for current instance identities and the consolidation decision.

## Route before acting

- The canonical monorepo instance is `create-something` at `http://127.0.0.1:3101`; its Cloudflare Access entry is `https://paperclip.createsomething.agency`.
- `client-agent-pilot` at `http://127.0.0.1:3100` is a separate controlled client experience. Keep client assignments, phone acceptance, and pilot workspace evidence there unless the owner explicitly changes that boundary.
- Both instances use the `CRE` Paperclip issue prefix. Identify a Paperclip issue with its instance or URL; a bare `CRE-6` is ambiguous. A Paperclip `CRE-*` identifier is not automatically a Linear issue identifier.
- For monorepo work, use the `create-something` CLI context or pass an explicit API URL and company ID. Verify the selected target before a write. Do not create a per-worktree Paperclip instance for ordinary monorepo tasks.

## Operating checks

1. Read `GET /api/health` on the intended local port. Confirm `status: ok`, expected version, and backup status before significant writes or upgrades.
2. Read `GET /api/companies` and verify the company name and ID. Read the target issue by its API ID or full URL when similarly numbered issues exist in both instances.
3. Keep Linear canonical for shared monorepo scope, owner, acceptance, and delivery evidence. Link the Paperclip run or issue as execution evidence. Distinguish authored, reviewed, merged, deployed, and accepted.
4. On an uncertain or interrupted run, inspect its output and current state before any retry. Preserve active workspaces and both instance data directories.

## Changes and migration

- Do not merge or delete the client pilot merely to reduce the number of processes. Its active acceptance work and client access boundary are separate.
- Before any instance migration, retain a verified database backup and full instance data copy. Paperclip company export/import does not carry approvals, cost history, activity logs, secret values, or machine-specific paths; reconfigure and verify those separately.
- Keep local loopback binding and Cloudflare Access in place. If wider human access is added, review Paperclip's authenticated deployment mode and permissions before changing exposure.
- If the Mac cannot meet uptime needs, evaluate a supported VPS deployment with durable Postgres, storage, workspace access, and restore proof. Cloudflare Tunnel/Access can remain the access layer.

Authoritative docs: [Paperclip deployment](https://docs.paperclip.ing/how-to/deploy-to-vps-or-fly/), [export/import](https://docs.paperclip.ing/guides/power/export-import/), [storage](https://docs.paperclip.ing/reference/deploy/storage/).
