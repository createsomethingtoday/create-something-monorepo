# app-governance-desktop

**Status: optional shell, not the primary distribution.** The canonical
application is `packages/app-governance-db`: Cloudflare D1, the MCP Worker, and
the deployed dashboard. Desktop exists only for native operator affordances and
must not introduce a competing state model.

Phase 2 of the app-governance collaboration plan: a Tauri v2 desktop shell that adds
native powers around the existing deployed web surfaces. Phase 1 was the presence
layer (live collaboration view + presence WebSocket on the MCP worker).

**One UI, two shells.** This app does not rebuild any dashboard UI. It opens the
already-deployed web surfaces in native webviews and adds what a browser tab cannot:
keychain storage, native notifications, a tray menu, and local script execution.

## What it does

| Surface | Source |
|---------|--------|
| Dashboard window | `https://app-governance-dash.createsomething.agency` (remote; its own cookie gate handles auth) |
| Live feed window | `https://app-governance.mcp.createsomething.agency/live?key=<operator key>` (key injected from keychain at open time) |
| Settings window | Local static page (`src/settings.html`) — the only window with IPC |

- **Keychain** — the operator MCP key is stored in the macOS keychain
  (service `app-governance`, account `mcp-key`) via the `keyring` crate. Paste it
  once in Settings; get it from Infisical (`APP_GOVERNANCE_MCP_KEY_<NAME>`).
- **Presence notifications** — a background task connects to
  `wss://app-governance.mcp.createsomething.agency/presence?key=<key>`
  (tokio-tungstenite + rustls) and fires native notifications **only** for
  high-signal actions: `flag_misalignment`, `create_finding`, `queue_notification`,
  `drift_notifications`, `doc_changed`. Everything else (cursors, heartbeats,
  joins) is dropped. Reconnects with backoff (5s doubling to a 60s cap); if no key
  is stored it idles and rechecks every 60s.
- **Tray menu** — Open Dashboard · Open Live Feed · Run Admin Sync · Run Doc Check ·
  Settings · Quit. The sync/check items spawn the existing node scripts in
  `packages/app-governance-db/scripts/` (cwd: the configured monorepo root) and
  fire a native notification with the exit status. Admin sync exit code 2 means
  the saved session is stale — rerun the script with `--login`.

## Security model

Only the local settings window gets IPC (see `src-tauri/capabilities/default.json`,
scoped to the `settings` window with `core:default` + `notification:default`).
The remote dashboard/live windows are plain webviews with no Tauri IPC exposure.

## Setup

1. `pnpm install --filter app-governance-desktop` (installs the Tauri CLI)
2. `pnpm --filter app-governance-desktop dev` (or `cargo build` inside `src-tauri/`)
3. On first run the Settings window opens — paste your operator MCP key from
   Infisical (`APP_GOVERNANCE_MCP_KEY_<NAME>`) and save.
4. Confirm the monorepo checkout path in Settings. Tray scripts use
   `APP_GOVERNANCE_REPO_DIR` when set, then the saved Settings path, then
   `~/Code/create-something-monorepo`.

The repo path is validated before a tray script starts. It must contain the
`packages/app-governance-db/scripts/` files used by Admin Sync and Doc Check.

## Commands

```bash
pnpm --filter app-governance-desktop dev     # tauri dev
pnpm --filter app-governance-desktop build   # tauri build (bundle)

APP_GOVERNANCE_REPO_DIR=/path/to/create-something-monorepo \
  pnpm --filter app-governance-desktop dev

# or, shell-only verification without the CLI:
cd packages/app-governance-desktop/src-tauri
cargo build          # debug build
cargo test           # event-filter unit tests
```

The frontend is a plain static directory (`src/`) — no bundler, no node build step.
Debug profile is tuned for low disk usage (`debug = 0`, `incremental = false`).

## Phase 3 note

Deeper Rust/native work (local caching, offline queues, custom protocol handlers)
only happens when a hot path demands it and still syncs through the same
Cloudflare API/MCP contract. The shell stays thin; the web surfaces remain the
single UI, and D1 remains the source of truth for Atlas maps, source records,
workflow actions, receipts, and transfer reviews.
