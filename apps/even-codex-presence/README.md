# Even G2 Codex Presence

This dedicated Even G2 client presents qualified Codex task state rather than a
terminal transcript. It consumes only the structured localhost Presence API,
keeps the current task selected as rankings change, and requires confirmation
for risky actions.

## Interaction model

- Scroll up/down: choose a task or action.
- Click: open, select, confirm, or return from a receipt.
- Ring double-click on overview: start voice capture.
- Ring double-click while recording: stop and transcribe.
- Ring double-click elsewhere: go back or cancel.
- Glasses double-click: exit.

Voice is always review-before-send. The client never receives an OpenAI key or
Even Terminal token and does not persist the Presence pairing token.

## Local development

Start the authenticated service:

```bash
CODEX_PRESENCE_TOKEN="$(openssl rand -hex 24)" \
  pnpm --filter @create-something/codex-presence start
```

Start the client and pass the same token at runtime:

```bash
pnpm --filter @create-something/even-codex-presence dev
```

Open:

```text
http://127.0.0.1:5173/?service=http%3A%2F%2F127.0.0.1%3A4782&token=<pairing-token>
```

Use the official simulator:

```bash
pnpm --filter @create-something/even-codex-presence simulator
```

## Validation

```bash
pnpm --filter @create-something/even-codex-presence test
pnpm --filter @create-something/even-codex-presence check
pnpm --filter @create-something/even-codex-presence build
pnpm --filter @create-something/even-codex-presence pack:even
pnpm codex:presence:verify
```

The `.ehpk` and `dist/` outputs are local artifacts and are not committed.
