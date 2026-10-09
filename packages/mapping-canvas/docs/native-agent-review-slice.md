# Native agent review — local development acceptance

2026-10-08. Continues local commit `58a3e4ba6` on
`codex/draw-offline-local-slice`; no release, provider registration, real persistent
grant, signing, public networking, app replacement, or deployment occurred.

## What is usable locally

The built native Canvas has a **Local agent** panel. It defaults to read-only
access. The owner can choose proposals for selected layer IDs and start a
10-minute, in-memory session. The token is shown once, masked, with explicit copy;
it is never stored in the Draw state, a plugin configuration, or a receipt.
Closing the panel does not revoke; **Revoke local access** does, including queued
proposals. Restart loses all agent authority. Import/reset rotates the document
epoch, so grants stop working even when the Canvas ID is reused.

An owner-started Unix-domain socket lives in a unique private `/tmp/draw-agent-*`
directory (0700, socket 0600). No agent listener starts automatically. Socket
methods are only inspect, propose, and proposal-status. They cannot create grants,
approve, commit, execute code, open arbitrary files, or access other app profiles.
The standard LAN phone transport remains opt-in.

The source-run stdio MCP companion is `offline-agent/native-client.mjs`. It uses
Node built-ins, accepts one explicit `--socket` path, and reads the ephemeral token
from `DRAW_AGENT_TOKEN`. It exposes `draw_native_inspect`, `draw_native_propose`,
and `draw_native_proposal_status`. The provider must run on this Mac. The existing
export-only plugin draft remains separate; no live native plugin was installed.
A reviewed local plugin can launch the companion, inheriting the token from its
process environment rather than saving a token in its manifest. This still needs
actual provider acceptance; hosted Work cannot reach the private socket.

Proposals bind exact session/document identity, epoch, revision, stable operation
ID, and typed operations. They are validated against granted leaf IDs and locked
group descendants. Group creation/mutation, lock/visibility changes, hidden-layer
changes and document settings are outside agent scope. The native review panel
shows the exact operations and base/current revisions. Only its **Approve
proposal** action commits, after note buffers and pending UI operations drain.
Gesture or wheel-debounce activity blocks approval. Socket requests cannot bypass
that boundary. Rejection and revocation remain available during a gesture.

The batch commit rechecks scope, expiry, identity and revision under the authority
mutex. Exact retries return receipts; changed payloads reusing an ID are rejected.
The queue holds at most 10 pending and 100 combined pending/completed requests;
outcomes are compact receipts, not retained document copies. Requests are limited
to 100 operations and 2 MiB; socket reads/writes have timeouts.

## Shared history and ownership

Native UI batches, approved agent edits, legacy local operations, and phone
operations enter one journal. Document, revision, receipts and history are written
in the same atomic state-file replacement. Native Undo/Redo uses backend commands
with expected revision and stable IDs; it no longer accepts frontend snapshots as
history. Camera changes remain history entries. New edits clear redo. Import/reset
is an explicit history boundary and clears the journal.

History retains at most 50 entries and 16 MiB. Old files migrate to empty history;
unknown, corrupt or inconsistent history fails closed. Oversized legacy phone IDs
are mapped to bounded history actor keys, while new pairing IDs are bounded.
Profile/state permissions are 0700/0600. No raw agent token is persisted.

A retained `File::try_lock` on the stable `native-writer.lock` inode is acquired
before loading or writing canonical state. A second cooperating native process
fails before changing the state. The lockfile is never unlinked, and process exit
releases ownership. Older Draw versions ignore this advisory lock: close them or
use an isolated profile. This is not an OS sandbox against a hostile process
running as the same user.

## Preview and test matrix

Run the interactive fixture with Node >=24 after the native static frontend build:

```sh
node packages/mapping-canvas/scripts/preview-native-agent.mjs
```

It prints a loopback URL and seeds a note explaining the flow. Select that note,
open **Local agent**, allow selected-layer proposals, and start the synthetic
session. Approve/reject the example; close the panel to use Undo/Redo. This is the
actual built UI with mocked IPC, disposable memory and deliberately fake tokens.
It does not access the native app or register a provider. The task preview was
served at `http://127.0.0.1:49785`; restart the script if that process has stopped.

| Check | Result | Boundary |
| --- | --- | --- |
| Native Rust | 52 passed, one existing LAN-discovery test excluded | Real native operations and persistence; synthetic inputs |
| Real stdio → private Unix socket | Inspect, propose and status passed; no write before owner review | No real provider session |
| Approval, rejection, expiry, revocation, ID reuse, epoch replacement | Passed | Synthetic grants only |
| Shared UI/phone/agent history, restart, stale undo, failure atomicity | Passed | Native test API; no GUI gesture claim |
| Built UI approval/revocation/undo/redo | Passed | Disposable Chrome, mocked IPC, external requests blocked |
| Wheel debounce and reactive viewport snapshot | Passed | Regression found during browser acceptance and fixed |
| Svelte | 0 errors, 0 warnings | Existing locally linked dependencies |
| Canvas document/pairing/editing | 54 passed | Existing domain suites |
| File-agent and native-queue tests | 14 passed | Includes reactive-proxy snapshot regression |
| Native binary | Built without warnings | Development binary, not signed/notarized release |
| Two-process native profile exclusion and reopen | Passed | Disposable profile; second process rejected without changing state |
| Native binary document + journal preservation, no network sockets at sampled check | Passed | LAN disabled; no agent session started |
| Actual native GUI interaction | **Not accepted** | Computer-use native pipe unavailable |
| Real Claude/Codex/ChatGPT connection | **Not accepted** | No provider registration or real grant activation |

Receipts and logs remain in `offline-preview/`; the redacted summary is committed
as `apps/draw-native/evidence/native-agent-review-20261008.json`. Native binary
SHA-256 observed in the process smoke:
`fc46f59c55071a26e3ef25b288720bfac7fbd605922dcf0efc7a19b1fc296fdd`.

## Independent validators and review

Ground owner supplied the exact installed 0.5.0 binary. This task independently
verified build-info source `58d5ed035d936725d292e37ef38abf1ba3236b7c` and SHA-256
`d218138f26ce176a0b2e70b6bc6b7785a74e79dc00a270759978eaafa3337776`.
An ignored worktree-local symlink lets the existing pre-commit script invoke that
binary; Ground's toolchain and target were not changed. The actual hook ran rather
than self-skipping. Its generated local registry database was restored; it is not
part of the Draw change.

Independent staged MCP coverage passed. Its existing ancestor-manifest probes
print nonfatal `git show` diagnostics for directories without a package manifest;
exit status and the hook's coverage result were inspected. Registry schema/policy
validation passed with one existing naming warning. Lockfile sync ran and found no
applicable manifest/lockfile changes. Svelte design-token and legacy-prop checks
ran in the hook.

Structured Ground duplicate analysis of Canvas found an existing `openLegacy`
duplicate in animation/storage and persistence; neither is changed here. An initial
mixed-check invocation was explicitly INCOMPLETE because environment had no entry
points; it is not counted as passed. Scoped changed-file duplicate receipts record
coverage and outcomes separately. The final scoped duplicate check passed with complete coverage of 11 analyzable changed Canvas files; Rust and Python are outside that check. Independent source review found and prompted
fixes for wheel/approval races, completed proposal ID reuse, oversized actor
compatibility, and bounded broker memory; final review found no remaining blocker
for local synthetic acceptance. A final independent source review also cleared the explicit ownership unlock and disposable two-process acceptance script.

## Remaining acceptance gates

The native GUI must be exercised manually or when the native computer-use pipe
is available: select scope, start/revoke, approve/reject during real gestures,
restart history, and inspect/export the result. A real provider session requires
explicit confirmation before activating authority or registration. None was
activated by this task.

This is Canvas-only. Motion/assets, full `draw.project.v1` portability and end-user
bundling of the MCP runtime remain separate work. Historical signed 0.1.1 receipts
on the sibling branch do not verify the current 0.1.0 pilot source or an artifact
on this Mac. No signing keys, public download copy or distribution was touched.
The native 0.1.1 editor changes still need deliberate reconciliation before release.
Linear remains unavailable; no issue was created or claimed. The worktree is
preserved for the native GUI/provider acceptance checkpoint.
