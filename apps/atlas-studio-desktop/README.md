# Atlas Studio Desktop

Tauri desktop app for the local CREATE SOMETHING Atlas Studio canvas.

The desktop app starts the local Atlas Studio server internally, opens the canvas in the Tauri window, and stores sessions in a stable app-data directory:

```text
~/Library/Application Support/CREATE SOMETHING/Atlas Studio
```

## Product Contract

Atlas workflow state is database-layer state. The desktop app is a local-first
client over the same Atlas sessions, API routes, MCP tools, and agent-managed
app-data store; it is not a separate desktop-only vault.

- **Database**: sessions, canvases, nodes, edges, bindings, proposals, story state, and receipts.
- **Automation**: local API server plus MCP/CLI tools that create, inspect, heal, propose, and export the same records.
- **Judgment**: proposal review, approval status, handoff notes, and policy-bound writeback decisions.

The database layer must be comprehensive enough to operate the mapped workflow:
each node is an executable unit with dependencies, owner or agent, binding
health, proof coverage, run/wait/stop gate, and receipts. The UI is a map plus
database console over that run contract; API/MCP/agent surfaces manage the same
state.

SvelteFlow is the current renderer for the workflow canvas. The durable contract
is the Atlas graph/session record model exposed through API/MCP/agent surfaces.

## Codex Browser Portal

For Codex-led client calls, prefer the browser portal. It keeps chat on the left and the
canvas in the Codex browser pane.

From the repo root:

```bash
pnpm atlas:portal
```

To start a named onboarding session:

```bash
pnpm atlas:portal --client "CREATE SOMETHING Test" --workflow "Agent-assisted Atlas onboarding" --owner "Micah"
```

The command starts or reuses a detached local server, stores sessions in app data, and prints the URL Codex should open in the browser pane. It also writes the active runtime here:

```text
~/Library/Application Support/CREATE SOMETHING/Atlas Studio/runtime.json
```

Useful control commands:

```bash
pnpm atlas:portal --status
pnpm atlas:portal --restart
pnpm atlas:portal --stop
```

For agent or terminal mutations against the same app-data sessions:

```bash
pnpm atlas:desktop:studio observe --session <session-id> --suggest --text "client says approval is required"
pnpm atlas:desktop:studio list
pnpm atlas:desktop:studio export --session <session-id>
```

## Desktop App

From the repo root:

```bash
pnpm atlas:desktop:session
```

This opens the Tauri desktop app. No separate Atlas Studio server terminal is required.

### Story API invoke bridge

The desktop app exposes native Tauri commands over the same local Atlas Story API v1 endpoints used by HTTP, MCP, and CLI callers. The commands do not create a desktop-only story schema; they forward JSON to the local server and return the normalized Story API response:

```ts
invoke('atlas_story_get', { sessionId });
invoke('atlas_story_focus', { sessionId, payload });
invoke('atlas_story_clear', { sessionId });
invoke('atlas_story_question_add', { sessionId, payload });
invoke('atlas_story_step_activate', { sessionId, stepId });
invoke('atlas_story_step_next', { sessionId });
invoke('atlas_story_step_previous', { sessionId });
```

`atlas_story_focus` accepts camelCase, snake_case, or Canon `PublicAtlasStoryArtifact`-compatible chapter payloads. Responses include `meta.apiVersion`, `meta.storyContract`, invalid focus id arrays, `story`, and `session`.

## Install Launchers

Install a clickable macOS app and short terminal command:

```bash
pnpm atlas:desktop:install-launchers
```

That builds an unsigned debug app and installs:

- `~/Applications/Atlas Studio.app`
- `~/.local/bin/atlas-studio`

After installation, launch from Applications or run this from any folder:

```bash
atlas-studio
```

The installed app is built from this monorepo checkout. If the checkout moves, reinstall the launcher.

## Validation

Run the native compile check without opening a window or creating a signed bundle:

```bash
pnpm atlas:desktop:check
```

## Operator Model

- Use `pnpm atlas:portal` when Codex is driving the session and the canvas should live in the in-app browser.
- Use the desktop app when you want a standalone macOS window outside Codex.
- Use `pnpm atlas:desktop:studio ...` for agent writes into the app-data session store.
- Use the canvas for review, fit-to-view, selection, and export.
