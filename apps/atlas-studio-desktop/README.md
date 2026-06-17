# Atlas Studio Desktop

Tauri desktop app for the local CREATE SOMETHING Atlas Studio canvas.

The desktop app starts the local Atlas Studio server internally, opens the canvas in the Tauri window, and stores sessions in a stable app-data directory:

```text
~/Library/Application Support/CREATE SOMETHING/Atlas Studio
```

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
