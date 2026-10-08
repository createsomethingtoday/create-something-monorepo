# Native acceptance and provider readiness

2026-10-08; implementation checkpoint `a4ec5d16f`. Preparation only. No provider
was started, registered, authenticated or granted Draw access during this pass.

## Manual acceptance prepared

Native computer control was checked once and returned `Sky Computer Use native
pipe startup failed`. No retries or alternate UI automation were used. The tested
arm64 development executable was launched in a new private, synthetic-only profile
with LAN disabled and ephemeral WebView storage. Process launch was verified;
visible rendering and interactions are **not** verified. The exact PID/profile
are recorded locally in `offline-preview/manual-native-launch.json`. This is not
an installed app or a release bundle. Quit this development Draw when finished.

Before any provider activation:

1. Confirm the title is **SYNTHETIC — manual native acceptance** and the only
   note identifies synthetic acceptance. Do not import private artwork.
2. Edit its text (including spaces), move it, then use Undo and Redo. Confirm both
   text and position restore correctly. Export JSON/SVG/PNG into the disposable
   profile and inspect each; record pass/fail rather than assuming an export click
   produced valid bytes.
3. Open **Local agent**. Confirm read-only is the default. Stop before starting
   access until the provider acceptance scope below is approved.
4. Quit and relaunch the same development executable with the same
   `CREATE_SOMETHING_DRAW_HOME`, `CREATE_SOMETHING_DRAW_ENABLE_LAN=0`, and
   `CREATE_SOMETHING_DRAW_EPHEMERAL_WEBVIEW=1`. Confirm document and Undo/Redo
   survive. The `verify-native-profile.py` script independently proves process
   exclusion and journal preservation, but does not substitute for these gestures.

After approval, test one 10-minute read-only session first. For a separately
approved selected-note proposal session: inspect; propose; verify nothing changes
before approval; reject once; propose afresh; approve; Undo/Redo; then test stale
revision rejection and revoke. Avoid typing private information into fixtures.
Record exact revision and outcomes without saving or sharing the token. Imported
or reset documents must invalidate the old session. A provider may retain Canvas
content in its conversation even after Draw revokes access.

## Verified local clients and exact drafts

- Node: `/opt/homebrew/bin/node`, 26.11.0.
- Claude Code: `/Users/createsomething/.local/bin/claude`, 2.1.294.
  Its local help confirms `--mcp-config`, `--strict-mcp-config`, `--tools`,
  `--permission-mode manual`, `--restricted`, and session-only `--plugin-dir`.
- Codex is absent from shell PATH, but the bundled executable exists at
  `/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex`,
  version 0.162.0-alpha.2. Local `--help` and `mcp add --help` were read only.
  Help emitted a sandbox PATH-alias warning; no installation was attempted.

The adjacent `offline-agent/examples/native-claude.mcp.example.json` is an
explicit, session-loaded configuration draft. It contains variable references,
not credentials. The Codex TOML draft is disabled and limits tools to inspect and
status. Neither is named or placed as an active project/user config.

Recommended first acceptance, **only after approval**, is Claude Code with this
JSON passed by absolute path using `--mcp-config`, `--strict-mcp-config`,
`--restricted`, `--tools ''`, and `--permission-mode manual`, from an empty
acceptance working directory. This exposes only the explicitly configured MCP
surface in addition to managed policy; it does not install a plugin. Set
`DRAW_AGENT_SOCKET` to the exact path shown in Draw and supply `DRAW_AGENT_TOKEN`
through the process environment. Enter the token through a hidden terminal prompt,
not a command literal, config, conversation, shell history or receipt. Launch a
fresh local client from that environment; an already-running desktop client will
not automatically inherit a shell variable. Revoke in Draw and exit the provider
at the end; clear the shell variable. Do not use `mcp add --env TOKEN=value`, which
can persist the credential. A new Draw session requires a new socket/token.

The companion itself has no general filesystem, shell, grant or approval tool.
Read authorization covers the **whole open Canvas, including hidden layers**;
selected IDs restrict proposals, not reads. Real model use sends returned Canvas
content to the selected model provider under that account's policies and may
incur normal usage. Local transport and offline native editing do not imply
offline cloud-model inference. Token possession is a local capability, not an OS
sandbox against another process running as the same user.

Codex's project-scoped `.codex/config.toml` is a possible later persistent target,
with `env_vars` forwarding the ephemeral token and explicit tool approval policy.
Do not merge the draft or enable it until the exact target/project is approved.
Use a dedicated acceptance directory, not the monorepo's shared configuration.
Persistent setup offers little benefit until the changing session socket/token
handoff is designed. No ambient configuration or account secrets were inspected.

## Public support and plugin boundary

[OpenAI MCP docs](https://learn.chatgpt.com/docs/extend/mcp) describe local stdio,
project configuration and environment forwarding for local Codex hosts; hosted
ChatGPT web does not consume local config. [Plugin packaging docs](https://developers.openai.com/plugins/build/plugins)
describe portable manifests and the existing Codex compatibility layout. A local
manifest alone is not evidence that a hosted chat can reach this Mac.
[Claude MCP docs](https://code.claude.com/docs/en/mcp) document stdio and environment
substitution in MCP configuration. These were checked on 2026-10-08; installed
provider connection acceptance remains pending.

The existing generated plugin is an **export-file pilot**, not this live native
companion. A source-bound live plugin can follow after direct client acceptance;
bundling Node/the companion, secure session handoff and platform/client testing
remain product work. No tunnel, HTTP listener, remote executor transport, public
registration, cloud sync or plugin installation is proposed here.

## Artifact and signing truth

The actual tested executable is Mach-O arm64, ad-hoc linker-signed, with no team
identifier or bound Info.plist. SHA-256:
`fc46f59c55071a26e3ef25b288720bfac7fbd605922dcf0efc7a19b1fc296fdd`.
Current Tauri metadata declares 0.1.0, `agency.createsomething.draw`, macOS >=13,
and app/DMG targets. Neither this worktree's standard release/bundle/dmg path nor
the isolated Cargo target's release/bundle/dmg path contains a DMG.

Historical sibling receipts identify `CREATE SOMETHING Draw_0.1.1_aarch64.dmg`
with SHA-256 `25c4394b1ab71ab7e71ec28b0711f084bf6a5dace321cc212c9e30a57153e141`.
Their recorded path is `apps/draw-native/src-tauri/target/release/bundle/dmg/` in
the old workspace, not a verified current local artifact or public download.
They describe Developer ID, notarization and Gatekeeper acceptance. This pass
read receipt/configuration metadata only; no signing keys or keychain identities.

The existing release workflow requires the protected signing owner gate,
Developer ID verification, notarization/stapling and exact-byte acceptance.
It also couples production promotion to physical iPhone acceptance. An offline
Mac-only release needs an explicit release-policy decision, reconciliation with
0.1.1 editor changes, and fresh artifact verification. Do not run the workflow:
it can upload TestFlight and create release assets. No distribution copy changed.

## Concrete next approval

Proposed first action: start **one 10-minute read-only Draw session** on the
synthetic Canvas above and connect the installed local **Claude Code** using the
session-only JSON draft. Permit inspecting that entire synthetic Canvas through
Anthropic; no proposal edits, persistent registration or plugin installation.
Normal provider tool approval remains enabled. Revoke and exit after verification.

This is pending because the task explicitly reserves real provider activation
and grants for action-time approval. It is not blocked by the code review or by
an inferred SKILL.md rule. A later proposal session needs selected IDs and native
owner approval for each edit. Without new authority, documentation, synthetic
broker tests, package design and source/release reconciliation can continue;
provider activation, persistent registration and release cannot.


## Approved secure local handoff

The owner approved the bounded read-only provider test and subsequently reported
starting access. The isolated process now exposes a Draw Unix socket, but native
computer control still fails. Socket existence alone does not establish its mode,
expiry or token availability. No token was read or requested through chat.

Run the reviewed helper **in a local interactive Terminal**, not an agent tool
input or chat, with Python 3:

```sh
python3 /Users/createsomething/Documents/Codex/2026-10-08/task-3/draw-offline/packages/mapping-canvas/scripts/run-approved-provider-test.py
```

It asks for owner confirmation of **Session active / 0 layers available for
proposals**, identifies the unique socket belonging to the recorded isolated Draw
process automatically, then accepts a hidden token paste. If already expired, revoke and start a fresh read-only session under the
same approval immediately before running. Never paste a token into this chat.

Before invoking Claude, the helper authenticates against that exact process's
socket and matches the full synthetic document hash. Its acceptance-only gateway
exposes a single inspect tool, checks the document again before returning it, and
rejects proposals or other methods. Claude gets no built-in tools, uses explicit
MCP configuration only, and only the already-approved inspect tool is allowlisted.
No permission-bypass mode or persistent registration is used. The provider run is
limited to 180 seconds. This helper is source-bound to the recorded synthetic
profile and will fail if it has changed; it is not a general Draw launcher.

After the attempt, the helper terminates the provider process group, closes only
the identified isolated Draw process (releasing its ephemeral grant), verifies
that process exited, and tests the former token/socket again. Uncertain responses
are not accepted as proof of revocation. It checks that state bytes did not change.
Cleanup status and redacted stream evidence go in a private
`offline-preview/provider-readonly-*` directory. The helper deliberately does not
mark provider readback verified; inspect the actual tool result and final answer
before claiming success. If it exits before a final receipt, manually revoke.

Gateway tests use a disposable synthetic UDS, never a real provider. They cover
Unicode hash matching, exact-document rejection, inspect-only tool exposure, and
reject malformed-response errors as proof of revocation. Python syntax was
checked without running the provider. Independent review covers the handoff
runner. Native UI scope still requires the owner's observation; this source
version does not expose grant metadata through authenticated inspect.


The first owner-run attempt stopped at an unlabeled pre-token assertion; Claude
never started. Its receipt confirmed native process exit and unchanged state.
Independent follow-up also confirmed the old socket refused connection. The exact
failed assertion cannot be reconstructed. The runner now records phases, uses
named checks that remain active under Python optimization, normalizes the scope
confirmation, and avoids manual socket entry. The same unchanged synthetic
profile was relaunched with fresh process metadata and no grant. A fresh read-only
grant is required before retrying under the existing approval.
