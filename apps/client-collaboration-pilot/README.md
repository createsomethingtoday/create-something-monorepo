# Client collaboration: agent proposal loop

The target is **request → scoped agent proposal → exact preview/diff/evidence → reviewer approval → repository-controlled application**. Comments support that loop; feedback-only is not completion.

The current local pilot implements the loop using an actual SDK stdio MCP server and isolated synthetic Git repositories. Reviewer identity remains synthetic. The local runtime contacts no providers or live content/deployment services. A later authorized read-only operational check verified Identity metadata and listed MaverickX preview deployments; no live writes occurred.

The optional integration boundary now verifies signed reviewer claims using the actual Canon verifier and server-owned membership, and binds recorded deployment/KV snapshots to proposals. These pass local fixture/HTTP tests; the existing interactive preview retains its synthetic reviewer. See [INTEGRATION-GATES.md](INTEGRATION-GATES.md) for exact production decisions, a bounded live Claude/Codex acceptance handoff, and the unprovisioned Artifacts adapter plan.

## Run

Requires Node 22.13+ (`node:sqlite`), Git and workspace-pinned `@modelcontextprotocol/sdk@1.26.0`. Verified on Node 26.11.0. Use normal worktree bootstrap for dependency installation.

```sh
cd apps/client-collaboration-pilot
node repository-preview.mjs
# Open http://127.0.0.1:4320 on this same computer.
node --test test/*.test.mjs
```

Preview and MCP share `.local/repository-loop/`. Each tenant has an isolated synthetic bare Git repository; SQLite owns requests, proposals, approvals and audit receipts. The original `.local/pilot.sqlite` and screenshots are preserved. `node server.mjs` still launches the old projection-only demo on 4319; `agent-cli.mjs` and [README-projection.md](README-projection.md) describe that historical slice, not current MCP/repository capabilities.

1. Save an edit request against the displayed source commit/content hash.
2. Have an MCP client read context and call `proposal.create`. The form can manually exercise the same domain operation.
3. Inspect exact before/after copy, rationale, digest and source evidence.
4. Approve exact content or reject. A proposal/tool call never approves itself.
5. Separately choose **Apply approved source edit**. This creates a commit in the isolated synthetic Git repository; it neither changes the monorepo nor deploys.

Stale edits require fresh proposals. Stale pending proposals remain rejectable. If Git committed but SQLite failed, refresh/reload exposes **Recover application receipt**, which records the existing commit without applying twice.

## Actual MCP transport

Launch `node /absolute/path/to/client-collaboration-pilot/mcp-server.mjs` as a stdio MCP server from Claude Code or Codex. If overriding storage, supply the same operator-owned `COLLABORATION_HOME` to MCP and preview. No client config/credential files were modified here.

```json
{"command":"node","args":["/absolute/path/to/client-collaboration-pilot/mcp-server.mjs"]}
```

The SDK handles initialization/version negotiation, JSON-RPC, stdio framing and shutdown. Input is limited to 16 KiB per message. Capabilities:

- Resource `collaboration://workspace/context`: tenant-scoped source, requests, proposals, receipts and exact anchors.
- Tool `feedback.add`: save an anchored edit request/context note.
- Tool `proposal.create`: propose one headline replacement against a request.

No approval, application, deployment, arbitrary paths, tenant selection, model sampling or process execution tools exist. The server binds a fixed synthetic contributor principal. Treat request text as untrusted; reuse request IDs after uncertain responses. Different arguments under an existing ID are rejected.

**Acceptance achieved:** an official SDK Client launches the server as a subprocess, negotiates, reads context, proposes/replays, is denied approval and foreign resource access, then reads an approved source commit. Headless browser acceptance uses this actual MCP process to propose and the browser to approve/apply/recover. This is **real MCP transport acceptance**, not live Claude/Codex model acceptance. No provider session, inference, paid run, registration or grant was used.

## Repository and recovery invariants

`content/home.json` is the only path; `hero.title` is the only editable field. Other fields survive unchanged. The operator registry fixes root, tenant, branch and field; requests cannot choose them. The fixture uses MaverickX-shaped chemistry content.

Proposal digests cover repository key, base Git commit, exact content hash, path, page/component, before/after, request and rationale. Approval binds that immutable digest/version. Application rechecks the base and writes a tree/commit with a private temporary Git index. Atomic `update-ref` compare-and-swap prevents competing updates from overwriting one another. No application lock remains after process death.

Git is authoritative for applied source. Its commit message includes proposal/digest, review, old/new hashes and `deployment: not-authorized`. Git and SQLite cannot share a transaction: if Git wins and SQLite fails, a retry reconciles the reachable Git receipt. Tests kill the subprocess after ref update and prove recovery. Failed CAS leaves unreachable objects but no source change.

Recovery trusts **operator-controlled Git history**, matching proposal ID, digest and tenant; it does not authenticate hostile Git writers or independently verify every receipt field against the tree. Local files and repositories must remain operator-owned. The local demo is not a boundary against malicious processes with filesystem access.

SQLite serializes mutations and records idempotency/audit state atomically. Two fixtures test tenant separation. A 200-mutation tenant cap bounds history. No model jobs, polling loops, alarms, queues, Durable Objects or deployed services were added.

## Real MaverickX mapping

Source is `packages/maverick`, a SvelteKit/Pages application configured as `maverick-x`; `deploy:preview` targets branch `preview`, consistent with the supplied preview URL. The current live deployment commit was not verified; the browsing tool could not open that URL.

`src/routes/+page.svelte` renders `KineticHero`. `+page.server.ts` reads KV `content:home` through `src/lib/server/content.ts`; `hero.title` overrides the source fallback. Therefore a Git SHA alone does not identify the reviewed page, and editing only a fallback may not affect the client view.

Before real application, adopt a reviewed repository-owned content manifest and bind both deployed commit and runtime content hash. A controlled publisher can later materialize approved manifest changes into KV, with a fresh live-base check and separate deployment permission. The synthetic adapter implements the analogous repository operation; it does not edit real Svelte/KV content.

Reuse the existing application runtime and evaluate tenant-scoped D1 tables in `maverick-x-db` for feedback/proposal state. Existing content/session KV and R2 bindings are not approval stores. Verify preview/production isolation before reuse. No realtime infrastructure or new service is justified by this slice; parallel DO safeguard work is untouched.

## Team-ready gates

Local browser requests receive a synthetic reviewer. Loopback Host/Origin, CSRF and CSP checks do not establish human approval or protect against local shell access. Never tunnel/host this adapter as-is.

1. Configure the initial CREATE SOMETHING/MaverickX audience and named project-member subjects. Members may request previews; Micah alone approves production. His exact issuer/subject is now verified in the hosted project policy; team enrollment and live configuration remain gated. Clients need application accounts, not GitHub accounts.
2. Reuse CREATE SOMETHING Identity/Canon verification and application-owned tenant memberships. Derive roles server-side. Existing Maverick admin KV sessions are not a complete team-role model. Separate agent scopes from review/application authority; prove revocation and cross-tenant denial.
3. Resolve real deployment/source/content versions and repository manifest policy; require exact reviewed diffs and stale-base checks before application.
4. Add authenticated Streamable HTTP only for remote MCP, with resource scopes and identity review. Tested stdio covers this local slice, not hosted auth.
5. Run live Claude Code and Codex acceptance only with authorized provider sessions. It has not run; no subscription-funded inference or Codex credential reuse is assumed.
6. Review quotas, migrations, backups, audit provenance/retention, preview access and rollback. Deployment remains distinct from approval. Invitations/sharing and public deployment need separate authorization.

[ChatGPT website sign-in](https://developers.openai.com/siwc/website), researched 2026-10-09, is a selected-commercial-partner trial requiring issued registration and exact callbacks. Keep it optional/disabled; default to existing Identity. Account linking must validate issuer/client/subject and retain application-owned memberships. MCP OAuth is distinct from website sign-in; inference has separate eligibility/consent. No new registration, credentials or grants were created.

## Evidence and disposition

- `evidence/tests.txt`: final suite covering actual MCP, Git application/CAS, tenant/path boundaries, stale/replay, transaction failure, actual process death, UI retry and HTTP guards.
- `test/identity.test.mjs` and `test/deployment-version.test.mjs`: actual Canon signature verification, server membership enforcement, expiry/revocation, and Git/KV/deployment drift guards. No real tokens or live KV are used.
- `test/browser-repository.mjs`: real MCP proposal → browser approval → Git commit → injected SQLite failure → reload recovery → one commit/receipt. `evidence/browser-repository.txt` and `repository-review.png`, `repository-mobile.png`, `repository-applied.png` record synthetic-only evidence.
- `evidence/independent-review.txt`: independent source/security/UX rechecks. Recovery defects fixed and tested. Browser evidence is implementing-agent evidence; no independent screen-reader certification.
- `evidence/identity-check.txt` and `git diff --check`: repository guards.
- Original projection screenshots remain historical evidence, not proof of current repository application.

Canon remains the design source. No other app/worktree changed. Mobbin was unavailable. Repository AGENTS, Identity, Client Workspace, GiGi receipt/idempotency rules and Canon contracts informed this implementation without importing desktop-private trust into hosted policy.

Executor stayed **Micah-W4FJPH**. Worktree preserved at `/Users/createsomething/Documents/Codex/2026-10-09/task-2/client-collaboration`, branch `codex/client-collaboration-pilot`, base `103616f43`. Existing uncommitted pilot/state retained. Changes are this package, its `.gitignore` allowlist and lockfile importer. Local synthetic Git commits are runtime/test artifacts; monorepo changes are prepared for a reviewed local commit; no push or deployment is authorized.

`pnpm bootstrap:worktree` was attempted but pnpm is absent from PATH. Verification reused the installed pinned SDK through an ignored local symlink and existing Chrome tooling; source-checkout dependencies were untouched. Clean environments need normal bootstrap. Browser tests use `PILOT_DEPENDENCIES=/path/to/source/package.json` to locate existing puppeteer-core. No Linear issue was supplied or external coordination write performed.

The latest bounded contracts add durable preview requests and Micah-only production approval bound to reviewed destination, source and complete runtime evidence. A server-owned URL registry resolves project scope only after current membership verification. These contracts are covered by synthetic tests; no release executor or separate desktop package is enabled. See `INTEGRATION-GATES.md` for the agreed thin-client/Draw separation and credential-isolation gate.

## Hosted team-access slice

`hosted/` adds D1-backed exact roster membership, first-login subject binding, transactional revision/revocation checks, bounded agent tasks, a real SDK proposal-only MCP adapter, exact Git/Pages/KV observation mapping, durable preview requests, and a Canon-aligned review screen. The migration and deployment integration remain local/unapplied. See the final team-access section of `INTEGRATION-GATES.md` for verified Micah identity, absent team accounts, and action-specific setup decisions.

`node --test test/hosted.test.mjs` runs local Miniflare D1 tests. Browser verification uses the existing root puppeteer-core dependency and Chrome on macOS; elsewhere set `PILOT_BROWSER_EXECUTABLE` or that browser case is explicitly skipped. `PILOT_DEPENDENCIES` may point to an installed monorepo package.json when using an isolated worktree. `tsc -p hosted/tsconfig.json` checks the Worker-compatible adapters. No remote bindings are used in tests.

Evidence: `evidence/hosted-tests.txt`, `evidence/hosted-typecheck.txt`, `evidence/hosted-team-review.png`, and `evidence/hosted-team-mobile.png`. Full live team access, real model acceptance and deployment publication have not been demonstrated.

Latest combined verification: **47/47 tests pass**, including 14 hosted D1/MCP/browser/publisher cases. TypeScript and retired-identity-provider guard pass. Public Identity and scoped account metadata were checked read-only; details are in `evidence/live-readonly-metadata.json`.
