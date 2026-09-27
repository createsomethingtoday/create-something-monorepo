# Codex client-agent pilot

CRE-2133 is an operator-only production pilot on a CREATE SOMETHING controlled Mac configured as a client environment. The operator uses [Client Agent](https://client-agent.createsomething.agency/) to chat with the device's installed, ChatGPT-signed-in Codex CLI. The client assignment and evidence live in a separate [client Paperclip](https://client-paperclip.createsomething.agency/CRE/issues/CRE-1) instance. CREATE SOMETHING's internal Paperclip and Linear track internal delivery, not client assignments.

## Boundary

- The browser reaches a loopback Node server only through a dedicated Cloudflare Tunnel. Cloudflare Access allows `micah@createsomething.io`; `cloudflared` validates the application JWT and audience before forwarding. The Node server independently checks the assertion signature, issuer, audience, and exact email. Unsafe HTTP methods require the exact `CLIENT_WORKSPACE_REMOTE_ORIGIN`; missing or foreign Origin fails closed.
- Codex credentials remain on the controlled device. The browser receives normalized events, approvals, a focused diff, and a sanitized receipt. Remote previews run in an opaque iframe sandbox without same-origin control-page authority. Codex runs in a verified workspace with workspace-write and network disabled.
- CTX history search is limited to the resolved verified workspace root and returns citation identifiers only, never raw transcript text. It reports explicit unavailable or empty states. The service resolves `CTX_BIN` or the launchd-safe `~/.local/bin/ctx` before falling back to `ctx` on PATH. An arbitrary device-wide filesystem root, process command, or external integration cannot be supplied through browser input.
- The pilot has no Claude adapter and does not require an Anthropic subscription. OpenAI API is a future local adapter; this release uses the installed Codex CLI's ChatGPT sign-in.
- Client Paperclip is a separate `client-agent-pilot` instance. Its assignment is `CRE-1`. Evidence is added to that issue through the owning Paperclip workflow. The current app links to the issue; it does not automatically mirror every turn into Paperclip or create internal Linear tasks.
- This exact Access policy is for the controlled pilot. General client invitation and identity policy require a separate first-party Identity rollout.

## Installed surfaces on the controlled Mac

| Surface | Local origin | Public URL | launchd label |
| --- | --- | --- | --- |
| Codex workspace | `127.0.0.1:19934` | `https://client-agent.createsomething.agency/` | `agency.createsomething.client-agent-pilot` |
| Client-agent tunnel | local origin above | same URL | `agency.createsomething.client-agent-tunnel` |
| Client Paperclip | `127.0.0.1:3100` | `https://client-paperclip.createsomething.agency/CRE/issues/CRE-1` | `ing.paperclip.paperclipai.client-agent-pilot` |
| Paperclip tunnel | local origin above | same URL | `agency.createsomething.client-paperclip-tunnel` |

The two tunnel configurations are `~/.cloudflared/client-agent.yml` and `~/.cloudflared/client-paperclip.yml`. Their credentials are separate local files and must never be copied into the repository. The launch agents live in `~/Library/LaunchAgents/`. The client-agent service runs the adapter-node build in the preserved `~/Code/create-something-client-agent-pilot` worktree. Its receipt state is under `~/Library/Application Support/CREATE SOMETHING/Client Agent Pilot`. Preserve the worktree until an immutable release replaces it.

## Verification

Run package tests, Svelte check, build, and the retired-auth-provider check in the preserved worktree. On the public site, sign in through Cloudflare Access, open the verified demo workspace, send a bounded Codex message, inspect the activity and diff, search CTX, reload, and send a follow-up that depends on prior context. Read the client Paperclip issue in a separate browser tab and confirm its assignment and evidence. Verify the anonymous public request redirects to Access and a direct origin request returns 403.

Revocation for this controlled device is `launchctl bootout gui/503/agency.createsomething.client-agent-tunnel`. Confirm the tunnel has no active connections and an authenticated browser receives the Cloudflare tunnel error. Restore with `launchctl bootstrap gui/503 /Users/micahjohnson/Library/LaunchAgents/agency.createsomething.client-agent-tunnel.plist` and recheck the live page. Session close inside the app independently removes that session's Codex authority while retaining its receipt. For a compromised tunnel, revoke its Cloudflare credentials and Access application through the owning Cloudflare workflow; stopping the connector is a tested immediate device disconnect, not credential rotation.

## Promotion and rollback

Source changes follow CRE-2133's branch/PR review gate. After merge, deploy the exact merged revision to the controlled Mac, rebuild, restart `agency.createsomething.client-agent-pilot`, and record the deployment SHA and browser readback in Linear. The launcher currently points at a preserved worktree rather than an immutable package; do not treat a passing candidate build as merged-release proof. Rollback is to the previous reviewed source revision followed by a rebuild and service restart; stop the tunnel if the origin's access behavior is uncertain.


## CRE-2138 acceptance repair promotion handoff

The client assignment for this repair is CRE-6 under current parent
[CRE-2](https://client-paperclip.createsomething.agency/CRE/issues/CRE-2).
During the owned release workflow, the orchestrator must update
`CLIENT_WORKSPACE_PAPERCLIP_ISSUE_URL` to that CRE-2 URL. The board reported that
the installed launchd value still links the completed prior CRE-1 pilot. This is
a release configuration change; implementation worktrees must not edit launchd
or restart the live service. After promotion, production review must click the
Client Agent header link and confirm it opens CRE-2.

For reset, the build now includes a hash-checked demo snapshot from Git revision
`d0c73c75142008014a90ae7d466723882f28af4c`. With no external seed configured, the
registered demo resets from that bundled snapshot while retaining installed
operator-owned dependencies. Never point `CLIENT_WORKSPACE_SEED_ROOT` at mutable
workspace source. An explicit invalid seed fails closed. Verify after promotion
that reset restores the demo, invalidates its previous session authority, and
preserves unrelated workspace/delivery state.

For preview proof, use the existing authenticated app route
`/api/workspaces/demo-frontend/preview`. Codex receives this route on both new and
resumed threads; it must not infer preview failure from arbitrary localhost probes
or claim visual verification without observed evidence. The turn remains network
disabled. Review the protected preview in the browser and compare the agent's final
report with the actual checks and visual evidence. These instructions and automated
contract tests do not constitute live browser or phone acceptance.


Independent-review reset recovery notes: authority is persisted as closed with
provider IDs removed before replacement source becomes visible. If this write
fails, replacement source is not exposed. If later cleanup fails, the reset
reports failure, prior authority stays revoked, and the sibling `.reset-*`
directory retains `original/` plus `reset.json` for operator recovery. A replacement
rename failure attempts to restore the original source; if that restoration fails,
the backup remains. Review the recorded phase and actual filesystem state before
any separately authorized recovery; do not restore revoked thread authority.
No automatic crash or power-loss recovery is claimed.

The intent gate now exempts only complete standalone prohibitions such as
“Do not deploy or publish.” Qualified requests (“Do not deploy only the frontend”
or “Do not deploy without approval”) remain blocked. Inline “without deploying”
phrases are deliberately not exempted; express the safety constraint in a separate
unambiguous prohibition. Sandbox and approval rules remain the enforcement boundary.


Reset concurrency verification: pause the original-source rename in an isolated
test, attempt same-workspace creation/resumption, and verify HTTP 409
`workspace_resetting`; an unrelated workspace must remain available. Already
admitted creation/resumption must finish before reset captures and revokes their
authority. After reset, a newly opened session must have the reset source baseline.
The runtime owns one service instance for its state root; these queues do not
coordinate independent processes sharing that root. Session close also drains
pending receipt saves and ignores late provider events.
