# Draw offline file pilot

This is a local, source-run vertical slice, not a shipped desktop update.
It reuses Draw's Canvas v1 validator, typed operation engine and layer locks.
No dependencies, network listener, cloud relay, credentials, transcript discovery,
or JavaScript execution tool are included. Run with Node >=24; verified on 26.11.0.
The repository pins Node 22; this pilot's built-in TypeScript loader is an explicit
additional runtime requirement until the companion is bundled for release.

Export Canvas JSON from Draw, select that exact file, and create an empty proposal
directory. Do not select the app's internal persistence file. Source and output
paths must be canonical, with no symlinks.

```sh
node packages/mapping-canvas/offline-agent/server.mjs \
  --input /absolute/canvas.json --output /absolute/proposals
# Operator may grant creation of reviewed copies by adding --allow-proposals.
node --test packages/mapping-canvas/offline-agent/server.test.mjs
node packages/mapping-canvas/offline-agent/package-plugin.mjs \
  /absolute/canvas.json /absolute/proposals /absolute/new-plugin --allow-proposals
```

Generated `.codex-plugin` and `.claude-plugin` manifests, `.mcp.json` and a skill
bind that exact file and this source worktree. They are a configuration draft,
not an installed or registered plugin. The worktree must remain at its path.
The tests launch the generated MCP command, not a real provider session.

`draw_offline_read` returns the Canvas document and SHA-256 of its source bytes.
`draw_offline_propose` requires that hash and 1–100 existing Canvas operations.
It validates the entire batch and locks before publishing a new private directory
containing `document.json`, `before.json` and `receipt.json`. Each process owns a
unique output session; each proposal owns a unique directory. No shared state is
written, so conflicting agents cannot overwrite the source or each other's copies.
The source is rechecked before publication. Retrying produces another proposal,
not an idempotent native edit. Input/output documents are capped at 2 MiB and each
process at 100 proposals. Staging failures are cleaned up; crash leftovers are not
committed proposals. This is not a crash-durable database or an OS sandbox against
other processes running as the same user. Ordinary user-controlled directories
are required. The configured file itself is the read grant.

Review the copy and compare current work before importing through Draw's UI.
Import is a whole-document action, not a merge. A proposal is **not** a commit to
the open app. The hash cannot detect unsaved or unexported app changes. The original
remains untouched; `before.json` supports recovery, but must never overwrite newer
work without review. Native import checks its authority revision but clears the current undo history;
retain and review backups. This adapter neither exercises nor claims native undo
acceptance.

Only Canvas v1 is supported. Motion/assets, complete `draw.project.v1` portability,
registry bundles, live gestures, native authority, provider identity, persistent
scripts and automatic undo/redo are outside this slice.

See [audit and phased architecture](../docs/offline-desktop-audit.md).

## Native reviewed companion

`native-client.mjs` is a separate built-in-only stdio MCP companion for the running
Mac authority (Node >=22; acceptance used 26.11). It reads an ephemeral token from
`DRAW_AGENT_TOKEN` and accepts `--socket /absolute/path/from/Draw`. It never reads
the native database or stores a token. Start a bounded session in Draw's Local
agent panel, supply the token only through the client process environment, and
review every proposed edit in Draw. No plugin/provider is registered by this script.
See [native review UX, authority policy and acceptance](../docs/native-agent-review-slice.md).
