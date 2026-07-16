# Client Workspace

First-party CREATE SOMETHING workspace for governed, real-time frontend edits.

The product gives an allowlisted client three connected rails:

1. **Chat** — text and bounded image input to a coding agent.
2. **Activity and diff** — normalized agent messages, tool/command/file events,
   approvals, terminal state, and the current Git diff.
3. **Live preview** — one declared project preview whose state follows file
   edits inside the isolated workspace.

## Runtime Boundary

`codex app-server` owns code turns, multimodal input, tools, file changes,
command execution, diffs, and approval requests. This package owns the
client-safe product contract around it:

- checked-in workspace registry
- writable-root and preview-command confinement
- attachment validation and private storage
- normalized HTTP/SSE events
- approval UI and policy decisions
- sanitized session receipts
- per-session editable-root baselines for a focused client-visible diff
- preview lifecycle and browser shell

The browser never connects directly to Codex and never receives API keys,
absolute local paths, process IDs, raw environment values, or raw provider
errors.

## V1 Scope

- CREATE SOMETHING-managed Git-backed Svelte/React projects
- one active turn and preview process per workspace session
- workspace-write sandbox with network disabled
- explicit approval requests surfaced to the operator/client UI
- local adapter plus an operator-only production Sandbox pilot

Not included: arbitrary Git URLs, greenfield sandboxes, direct Webflow Designer
mutation, terminal emulation, client invitation, allowlist expansion, merge, or
credential-management authority.

The workspace shell imports Canon's Performance token contract. The isolated
editable demo uses the same Performance token names with canonical fallbacks, so
visual edits stay portable without giving the seed a private monorepo dependency.

## Production Boundary

`workspace.createsomething.io` is an authenticated Cloudflare Worker in front
of one RPC-only `standard-1` Sandbox container. Canon verifies the dedicated
`client-workspace` Identity audience and the Worker applies the exact
`micah@createsomething.io` allow rule before deriving an opaque signed Sandbox
instance. Browser Identity cookies are removed before container proxying, and
the preview remains behind the same authenticated Worker path.

The container runs the adapter-node app, pinned Codex CLI, and an immutable demo
seed. It sleeps after ten minutes and never keeps provider credentials in an
image, durable file, receipt, app-server environment, or browser response. Codex
authentication is bootstrapped through a memory-backed home, then its cached auth
file is deleted after initialization. Access tokens rotate server-side from the
host-only refresh cookie. D1 contains only sanitized receipts, bounded action
metadata, and opaque snapshot pointers; private R2 archives the governed project
and receipt roots with a seven-day lifecycle rule. Successful diff reads and
explicit close/reset actions checkpoint state for recovery; close/reset also
destroy the running Sandbox.

## Local Development

```bash
pnpm --filter @create-something/client-workspace demo:reset
pnpm --filter @create-something/client-workspace dev
```

The checked-in demo project is
`packages/client-workspace/clients/demo-frontend`. It is allowlisted by server
configuration; browser requests cannot replace its path or preview command.
`demo:reset` restores the checked-in immutable seed through the declared demo
boundary; browser input cannot select another root, seed, command, storage key,
or Sandbox ID.

Open the printed local URL, choose **Demo frontend**, attach the declared PNG,
and submit the Performance acceptance prompt from the durable goal: change only
the hero eyebrow to `Governed product delivery`, the headline to `Move from intent
to proof.`, and add
`border-top: 4px solid var(--color-performance-pressure, #e54800);` to `.hero`
while preserving the navigation, CTA, and three proof cards. Approvals are deliberately
opaque in the browser; approve or decline only the bounded command/file card that
the activity rail presents. Reloading the same browser restores the sanitized
receipt, terminal state, baseline diff, and owned preview while the local server
is still running.

## Validation

```bash
pnpm --filter @create-something/client-workspace test
pnpm --filter @create-something/client-workspace check
pnpm --filter @create-something/client-workspace build
pnpm --filter @create-something/client-workspace cloudflare:check
pnpm --filter @create-something/client-workspace cloudflare:dry-run
```

The completion verifier is the real browser workflow documented in
`../../.codex/internal-client-workspace/goal.md`.

Local browser evidence is written under `output/playwright/`. The final two clean
runs use `run1-initial.png`, `run1-edited.png`, `run2-initial.png`,
`run2-edited.png`, and `run2-reloaded.png`.

## Rollback and Promotion Boundary

Stop the local shell and its declared preview process, then run `demo:reset` to
restore the fixture. Removing `packages/client-workspace` and its lockfile entry
fully rolls back this MVP because it changes no production route, identity policy,
credential, invitation, or third-party system.

The operator approved the separately tracked production promotion in CRE-1266.
The in-product **Close** action checkpoints state and releases the Sandbox; **Reset
demo** stops the owned preview/session processes, restores
`/app/seed/demo-frontend`, removes prior session authority, checkpoints the clean
state, and releases the Sandbox. Neither can select a root, seed, command, storage
key, or Sandbox ID.

The production target is `https://workspace.createsomething.io`; its durable
finish line and live browser verifier are in
`../../.codex/internal-client-workspace-promotion/goal.md`. Real client
invitations, allowlist expansion, merge, and credential removal remain separately
approval-gated.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/routes/+page.svelte`, `src/lib/server/workspaces/registry.ts`, `src/lib/cloudflare/worker.ts`, `cloudflare/src/index.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm test && pnpm check && pnpm build && pnpm cloudflare:check && pnpm cloudflare:dry-run` |
| Validation surfaces | workspace/session/preview and edge/Sandbox contract tests, Svelte and Worker checks, container build/smoke, Git diff, authenticated production browser and sanitized receipt readback |
| UI validation path | open `/`, select `demo-frontend`, submit the declared image-plus-text edit, inspect activity/diff, and verify the embedded preview |
| Escalation rule | stop if a request requires an arbitrary root/command, wider sandbox or network access, real client invitation, allowlist expansion, merge, credential removal, direct Webflow mutation, or an approval without a checked-in policy owner |
