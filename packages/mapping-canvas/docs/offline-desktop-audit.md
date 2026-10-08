# Draw offline desktop audit — 2026-10-08

Scope: local exploratory implementation, no release, deployment, installation,
provider registration, credential grant, network tunnel or public copy changes.
Base: `606e5a50b02552718326dd0967deb31026fc44c7` from
`origin/codex/draw-session-registry-pilot`. Worktree:
`/Users/createsomething/Documents/Codex/2026-10-08/task-3/draw-offline`, branch
`codex/draw-offline-local-slice`. Active Agency/Ground and root edits were untouched.

## Verified inventory

| Surface | Existing contract | Gap |
| --- | --- | --- |
| Browser Draw | Svelte mapping-canvas; IndexedDB project storage; Canvas v1 JSON; SVG/PNG rendering/export; WebMCP editing queue, gestures, locks, revisions, history | Browser origin persistence is not an ordinary desktop file |
| Browser projects | `draw.project.v1` combines Canvas and Motion | Canvas export alone cannot preserve Motion/assets |
| Native Draw | Tauri Rust host; bundled static Svelte UI; `paired-session.json`; canonical document/revision; persisted operation receipts; iPhone queue/rebase; Keychain capabilities; TLS pairing | Different authority from browser project store; live WebMCP mutations/history deliberately rejected |
| Native concurrency | mutex and persist-before-memory; document replacement expects revision | single local operation uses latest revision internally, unsuitable as a direct agent CAS endpoint |
| Native network | prior startup bound `0.0.0.0` and advertised Bonjour | this slice adds exact opt-in env gate; compiled and isolated-launch checked |
| Existing plugin | dependency-free Python stdio adapter to remote `/api/agent`; one-time browser pairing; bounded tools | requires cloud relay; optional intent routing uses external credentials; not offline/native |
| Session registry pilot | explicit scoped references and synthetic CTX projections | no native transcript discovery or production/client-value acceptance |
| GiGi | private local state, typed stdio companion and exact-profile config generation | reuse pattern, not GiGi database/code access or ambient credentials |

Sources inspected: root AGENTS, `.agents/skills` inventory (Paperclip/newsletter/
video do not apply), required strategy documents, mapping-canvas document,
paired-session, editing, persistence/project storage and plugin sources, native
lib/transport/config/receipt, GiGi README and package-agent generator. No private
conversation/transcript stores were inspected. Linear API key is unavailable in
this execution environment; no issue was created or claimed. This document is
technical evidence, not an alternative work tracker.

## Architecture decision and phases

Concept: scoped local Canvas proposal.
Current interface: browser/cloud relay or native-only UI authority; agents cannot
safely mutate native files behind the host.
Proposed interface: read an explicitly chosen export and propose typed edits to
an immutable copy, using existing domain validators and layer-lock checks.
Tier ownership: Database = Canvas JSON and before/receipt artifacts; Automation =
stdio read/propose; Judgment = startup scope/grant and explicit UI import review.
Leverage: Claude Code, Codex and compatible local clients use the same two tools.
Locality: transport and file lifecycle stay in `offline-agent`; domain behavior
remains in existing document/paired-session/editing modules.
Test surface: real stdio process and generated config command, using only synthetic
Canvas files. Migration: additive file pilot; original file never changes. Revert
these new files and the native LAN env gate to roll back this branch.

1. **Delivered file pilot.** Read-only by default; explicit proposal grant;
   mandatory SHA-256 source revision; bounded atomic typed batch; lock preservation;
   original retained; before snapshot; private unique proposal directories. Human
   review/import is the approval boundary. Concurrent callers create independent
   proposals, not competing writes. No shared mutable file therefore no lockfile
   arbitration is required in this slice. Hashes do not see unexported app edits. Current native import clears undo
   history; retain and review backups rather than promising one-click undo.
2. **Native authority integration.** Add an explicit workspace/document grant and
   revocation UI. Use a local Unix-domain channel or owned stdio companion without
   LAN binding. One authoritative queue must serve UI and agent requests, with
   caller revision and stable operation ID checks, gesture exclusion, lock policy,
   atomic batch persistence, inspectable uncertain receipts and one undo history.
   Do not expose unrestricted document replacement or raw evaluation. Import,
   reset, delete, scripts and external calls require distinct policy/approval.
3. **Portable desktop files.** Reconcile Canvas + Motion + embedded assets in a
   versioned container. Define create/open/save-as, migration, attachment validation,
   backups, crash recovery and multi-process ownership. Existing JSON import/export
   remains a compatibility adapter. Never silently turn local data into cloud sync.
4. **Packaged clients and release.** Bundle companion/runtime so Node is not an
   end-user requirement; accept one actual Codex and Claude session plus local
   ChatGPT desktop where supported. Test offline native launch/save/reopen/export,
   concurrent gestures/agents, revocation and undo. Then separately verify exact
   signed/notarized bytes and distribution truth. Public registration and remote
   transport remain outside this authorization.

No security/product decision blocks phases 1–2 design. Before expanding scope,
choose whether direct live edits receive per-operation approvals or a bounded
session grant, and whether complete Motion portability belongs in the first
released desktop file format. Default here is reviewed copies and Canvas-only.

## Public API and transport support checked

- [tldraw offline announcement](https://tldraw.dev/blog/tldraw-offline): file-based
  app, local agents and executable scripts are the inspiration. Draw does not
  implement or inherit tldraw's format, licensing, SDK or raw-code execution model.
- [OpenAI MCP client docs](https://learn.chatgpt.com/docs/extend/mcp): local clients
  support stdio; current documentation describes ChatGPT desktop stdio setup as
  well as Codex CLI/config. Hosted Work uses installed remote tools and does not
  read this Mac's local config. Actual availability still needs provider acceptance.
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins):
  portable manifests are preferred; `.codex-plugin/plugin.json` remains a supported
  compatibility format, used by this source-bound draft. Public submission expects
  remote HTTPS or separately arranged local support. Packaging does not prove an
  installed connection. No local server was registered or tunneled.
- [Claude Code MCP docs](https://code.claude.com/docs/en/mcp): local stdio processes
  and plugin-bundled MCP configuration are supported. Generated configuration was
  launched directly in a synthetic test; actual Claude installation was not tested.

Local tool execution can work offline; cloud-model inference still needs its
provider connection. “Local agent support” is not a claim that Claude/Codex model
inference runs without internet. An entirely offline model is a separate choice.

## Source/release reconciliation (follow-up)

The exact pilot base `606e5a50b02552718326dd0967deb31026fc44c7` still declares
0.1.0, but it is **not the latest known desktop candidate**. Read-only local Git
inspection found `origin/codex/draw-text-desktop-20261004` at
`a9e24a7e8360d157e7f307443fc15514bce8c7e4`, sharing merge base
`62d7a20d4787fe54589a3a3fdc2a19b5d67fd18f` with the registry pilot.
`847d47cef939eb84b51042186d43305ef80c209c` prepares version 0.1.1 and hardened
runtime. The native authority `lib.rs` is unchanged between those two branch
baselines; the sibling also contains note-editor and viewport work, release
configuration and public-page changes. It must not be blindly substituted for
the registry pilot, which has separate synthetic CTX work.

The sibling's sanitized checked-in receipts establish historical acceptance of:

- `CREATE SOMETHING Draw_0.1.1_aarch64.dmg`, SHA-256
  `25c4394b1ab71ab7e71ec28b0711f084bf6a5dace321cc212c9e30a57153e141`;
- app SHA-256 `cebdc92092456e124e26475d22ac7b812b38206693e36de3a679545ebfd0ba75`;
- Developer ID signing, stapled notarization and accepted Gatekeeper assessment;
- isolated fresh/existing-document persistence, packaged native GUI note editing,
  undo/redo and separately verified JSON/SVG/PNG export bytes;
- physical iPhone acceptance remains unperformed.

Exact copies with Git provenance are in `offline-preview/release-evidence/`.
These are historical receipt verification, not fresh verification of the actual
DMG on this Mac, a claim of available signing keys, or proof of current public
download bytes. Live fetches failed earlier. This branch's original 0.1.0 receipt
remains older unsigned evidence. No release configuration, download copy, app
installation or public artifact was changed.

## Delivered native authority preparation

The new `draw_host_apply_batch` command is a **trusted native UI command**, not an
external agent endpoint. It binds session, document, caller revision and a stable
operation ID; reuses the protocol operation validator; clones/applies a bounded
batch under the existing host mutex; persists once; and only then publishes memory.
A batch advances revision once and returns one authoritative undo basis. Exact
retries return the saved receipt and current state; reused IDs with different
arguments fail. Duplicate recovery clears UI history rather than inventing a
before snapshot. The existing bounded receipt window still limits deduplication.
There is no automatic retry after an uncertain IPC result.

The host UI now reserves successive revisions when edits are authored, excludes
mirroring during outstanding work, and invalidates dependent optimistic edits on
conflict or uncertainty. Failed recovery blocks edits until reconciliation/relaunch.
History replacement excludes active gestures, including pinch and pending touch,
and native import/reset no longer consult a separate browser IndexedDB authority.
One batch is one undo checkpoint; import/reset still clear history. Phone operations
retain their existing protocol. This remains in-memory UI history, not a new durable
native undo journal or safe cross-process database ownership scheme.

Independent review caught bypassed operation validation and incomplete gesture
exclusion; both were fixed and source-reviewed again with no remaining blocker
identified for this internal slice. Native layer-lock policy is still enforced by
the UI, so this command must not be exposed directly to an agent.

## Unregistered native grant boundary

`src-tauri/src/local_agent.rs` is an in-process seam tested against the real native
batch/persistence path. No command, socket, startup option, or provider can activate
it. Synthetic tests issue ephemeral tokens scoped to one session/document, with an
explicit set of at most 200 editable layer IDs and a maximum one-hour lifetime.
Empty edit scope is read-only. Revocation serializes with in-flight commits; expiry
is checked again under the authority lock, including duplicate/read responses.
The token is not persisted. No real grant was issued.

The native boundary rejects changes to ungranted objects and locked group
descendants. This first seam forbids group mutation/creation, hidden-object changes,
and lock/visibility transitions; these require native-owner review. The operation
engine is shared with the existing native document contract. Scope/lock validation
and inverse-size preflight happen before the single persisted commit.

Each grant retains one in-memory inverse for its latest successful edit. Undo is
revision-guarded, cannot overwrite an intervening human/phone edit, and is consumed
once. Every accepted edit must fit the bounded inverse request. This is **not** a
shared durable UI/agent undo/redo journal or a live agent connection. Restart and
revocation discard authority/history. The export-scoped stdio adapter remains the
only runnable agent transport in this branch.

Independent review found and prompted fixes for expiry while waiting on the host,
indirect group scope, lock edits that blocked inverse restoration, and oversized
undo snapshots. Regression tests cover these constraints and revocation/scope.

## Current validation and toolchain evidence

Micah approved official Rust installation for native testing. The installer came
from `https://sh.rustup.rs`, as linked by the official Rust installation page.
Minimal stable Rust/Cargo 1.99.0 is installed at the standard `~/.cargo`/`~/.rustup`
locations without shell profile changes. Ground's separate 1.90.0 toolchain was
confirmed after installation completed; it was not modified. Draw builds use
`/Users/createsomething/Documents/Codex/2026-10-08/task-3/draw-cargo-target` with
2 build jobs and the committed native Cargo lockfile. No signing credentials were
read. No iOS target/toolchain was installed.

- Native Rust tests: **39 passed**, 1 LAN-discovery test explicitly filtered.
  An initial full test attempt hit the sandbox's network denial in that existing
  test; no broader network grant was requested for it. New tests cover atomic
  failure, persistence failure, stale/future revisions, document scope, duplicate
  recovery after later commits/reload, conflicting IDs, same-revision concurrent
  writers, batch bounds, title validation and unchanged scalar prefixes.
- Svelte: **0 errors, 0 warnings**; bundled native static frontend build passed.
- Existing document/paired-session/editing suites: **54 tests passed**.
- File-agent plus queue/history tests: **13 passed**. The file pilot's source-parent
  symlink finding was fixed and independently retested.
- Bundled UI acceptance in disposable Chrome: passed queued revision reservations,
  batch command routing, undo/redo, conflict recovery and discarded dependent edits.
  Tauri IPC was mocked; external browser requests were blocked. This is explicitly
  not a native-WebView or live-agent claim.
- Actual development binary built and launched with a disposable Draw home, exact
  LAN-disable setting, and `CREATE_SOMETHING_DRAW_EPHEMERAL_WEBVIEW=1`. Two relaunches
  retained a seeded synthetic document, session and revision exactly. `lsof` found
  no network sockets in those test processes. Every spawned process was terminated.
  The installed app and personal data were untouched.
- Actual native UI interaction remains blocked: the computer-use native pipe failed
  to start. No alternate UI automation bypass was used.

Evidence is in `offline-preview/native-tests.txt`, `domain-tests.txt`,
`native-build.txt`, `native-binary-build.txt`, `native-batch-ui.json/png`, and
`native-runtime-acceptance.json`. Final development binary SHA-256:
`de6b51441c1c5ef3297791c5963cade2feb1f2b33aeac1efd411238aacc903f0`.
The final binary also passed two isolated synthetic relaunches with no network sockets.
The portable redacted receipt is committed at
`apps/draw-native/evidence/offline-local-slice-20261008.json`.
Independent source review found no remaining blocker for this unregistered prototype;
that review does not authorize live transport or production release.

JavaScript dependencies were reused through worktree-local links to existing
installed packages; no redundant monorepo install was run. Frontend checks used
Node 22.21.1, Vite 7.3.6, Svelte 5.56.9 and available Vitest 4.1.8. A clean lockfile
bootstrap remains a promotion gate. Source-run file-agent tests use Node 26.11.0;
the companion must be bundled before distributing to end users.

## Next live-canvas slice and prerequisites

1. Add a scoped grant/revoke UI and local-only transport to the *running authority*,
   with document/session identity, expiry, explicit write policy, stable operation
   IDs, unknown-outcome inspection and no filesystem/database bypass. Connect the
   tested native scope/lock seam only after the approval UI and transport are reviewed.
2. Make native UI/agent changes share one visible, authoritative undo/redo journal;
   decide retention, restart recovery and multi-process ownership. Current UI history
   and whole-document replacement are insufficient as an external agent API.
3. Accept real native gestures plus concurrent agent requests, approval denial,
   revocation, stale writes, crash/relaunch, undo/redo and selected-file import/export
   using disposable data. Native computer-use availability or a manual walkthrough
   is required for actual UI acceptance. A provider connection remains separately
   authorized; no plugin has been registered or installed here.
4. Reconcile the 0.1.1 note/editor improvements with the registry pilot deliberately,
   without copying its download/public page changes. Motion/assets and full
   `draw.project.v1` portability remain out of scope for the Canvas-only file pilot.

The repository pre-commit script was run without bypass flags. It exited successfully
with `ground not found, skipping checks` because this worktree has no Ground release
binary. No Ground build or hook configuration was changed. The explicit native,
frontend, domain, stdio and independent-review checks above are the validation
evidence; the hook result is not a claim that its duplicate/design gates ran.

Worktree disposition: preserved at the path/branch above for native integration
and toolchain acceptance. Nothing was pushed, merged, deployed or replaced.
