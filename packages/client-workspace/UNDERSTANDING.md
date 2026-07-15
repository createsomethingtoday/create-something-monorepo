# Understanding: @create-something/client-workspace

> The governed product boundary between an allowlisted client, Codex coding
> turns, an isolated Git workspace, and a live frontend preview.

## Ontological Position

**Mode of Being:** mixed-tier product package.

| Tier | Ownership |
| --- | --- |
| Database | workspace definitions, upload metadata, session/thread receipts, activity log, Git diff summary, production snapshot pointers |
| Automation | Codex app-server adapter, turn stream, preview process, file/preview refresh, authenticated Cloudflare Worker and RPC Sandbox gateway |
| Judgment | first-party identity allowlist, sandbox posture, writable roots, approval decisions, fail-closed errors, resource and promotion gates |

## Small Public Interface

- `WorkspaceRegistry.list/get` returns client-safe workspace metadata.
- `WorkspaceRegistry.resolve/resolveEditablePath` is server-only authority.
- `WorkspaceSession.open/startTurn/respondToApproval/events/receipt/close`
  composes Codex, receipts, and policy without exposing their protocols.
- `ClientWorkspaceService.createSession/sessionState/storeAttachment/workspaceDiff/closeSession/resetWorkspace`
  composes the registry, private uploads, restart-safe public receipts, a
  session-start baseline, and immutable-seed reset behind ID-only browser routes.
- `PreviewSession.start/status/url/close` owns the declared preview lifecycle.
- `createClientWorkspaceWorker().fetch` is the production edge interface. It
  resolves first-party application access, derives one signed opaque browser
  instance, strips browser authority, and delegates only to
  `ClientWorkspaceSandboxGateway.fetch`.
- `CloudflareSandboxGateway.fetch` hides RPC SDK, container process, lifecycle,
  port, path, environment, retry, checkpoint, and destroy details from the edge
  caller.
- `D1WorkspaceActivityLedger.recordResponse` persists only normalized public
  receipts and route-derived action metadata; it never reads prompt bodies or
  stores Codex thread/turn identifiers.
- `WorkspaceSnapshotStore.capture/restoreLatest` owns private R2 archive and D1
  pointer durability for `/workspace/projects` and `/workspace/state`, including
  isolated concurrent archives and rejection of empty snapshots.
- `PreviewSession.proxy` replaces private filesystem module paths with opaque
  per-session tokens and removes the Vite HMR transport at the authenticated
  preview boundary without changing application module exports.

## Critical Dependencies

- Codex app-server protocol for text/image turns, tools, diffs, approvals, and
  terminal events.
- Judgment Layer policy semantics for sandbox and approval posture.
- Symphony path/worktree/process patterns for confinement and lifecycle.
- Project-native Svelte/React preview commands from checked-in definitions.
- Identity Worker plus Canon for exact issuer/audience/token verification and
  app-owned operator authorization.
- Cloudflare Sandbox SDK/image `0.12.3` using RPC, one `standard-1` container,
  and an authenticated Worker proxy rather than a public preview URL.

## Validation Surface

Tests target the public registry/session/preview/edge/Sandbox contracts. The
local verifier uses a real container image, Codex app-server, Git-backed fixture,
and preview. Production completion additionally requires the authenticated real
browser, deployed Worker/Sandbox, durable recovery, and negative paths in the
promotion goal. Mocks support protocol edge cases but cannot complete either
real-surface verifier.

## To Understand This Package, Read

1. `README.md` — product, runtime, safety, and validation contract.
2. `src/lib/server/workspaces/registry.ts` — checked-in workspace authority and
   path confinement.
3. `src/lib/server/workspaces/default-registry.ts` — V1 allowlist and preview
   command ownership.
4. `src/lib/server/sessions/workspace-session.ts` — Codex and receipt boundary
   once the session slice is present.
5. `src/routes/+page.svelte` — client-facing three-rail workspace shell.
6. `src/routes/api/` — ID-only session, turn, approval, diff, SSE, and preview
   transport; no arbitrary root, command, origin, or environment input.
7. `scripts/reset-demo-fixture.ts` — preservation-safe clean-state verifier.
8. `src/lib/cloudflare/worker.ts`, `workspace-router.ts`, and
   `sandbox-gateway.ts` — production authority and execution boundary.
9. `src/lib/cloudflare/activity-ledger.ts`, `snapshot-store.ts`, and
   `snapshot-bindings.ts` — sanitized D1 evidence and private R2 recovery.
10. `cloudflare/src/index.ts`, `cloudflare/wrangler.jsonc`, and `Dockerfile` —
   deployment composition and resource caps.
11. `.codex/internal-client-workspace/goal.md` — local completion proof.
12. `.codex/internal-client-workspace-promotion/goal.md` — production proof.

## Escalation

Stop when a request needs an arbitrary root/command, broader filesystem or
network authority, a real client invitation, allowlist expansion, merge,
credential removal, direct Webflow mutation, or an approval decision not
represented by policy.
