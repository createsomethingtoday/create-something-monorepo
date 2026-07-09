# Zellij Agent Cockpit

This guide defines the cockpit for Codex-supervised visible terminal workers.
Use it when the worker needs a persistent terminal session that Codex can inspect
and steer through stable command-line primitives.

Zellij is the default for this lane because it has a clean automation loop:
create a background session, create a named pane, capture or stream pane output,
send bounded input, and let the operator attach to the same session when visual
supervision matters.

Zellij is the supported CREATE SOMETHING cockpit for visible worker sessions.
Codex browser/computer-use remains the browser-proof surface.

## Operating Model

Codex remains the coordinator, repo-truth surface, and done authority. Zellij is
only the terminal/session substrate. Claude, Ornith, or another worker may run
inside a Zellij pane, but its output is evidence to review, not an automatic done
decision.

```text
Codex operator
  -> repo docs, Linear, git, tests, browser/computer-use proof
  -> Zellij CLI for visible worker terminal sessions
    -> Claude, Ornith, local logs, or server panes
```

## Install

```bash
brew install zellij
zellij --version
mkdir -p /tmp/zellij ~/.config/zellij
export ZELLIJ_SOCKET_DIR=/tmp/zellij
ln -sf ~/Code/create-something-monorepo/packages/dotfiles/zellij/config.kdl ~/.config/zellij/config.kdl
```

This machine currently uses `zellij 0.44.3` from Homebrew.

The short socket directory avoids macOS Unix socket path-length failures caused
by long per-user `$TMPDIR` paths.

## Design

The repo config uses the CREATE SOMETHING terminal canon:

- Pure black background.
- White foreground.
- Restrained semantic accents: white/gray for active terminal structure, blue
  for Database, amber for Judgment, red for blocked/error, cyan/magenta only for
  metadata. Completed/ready states inherit the white/gray structure palette.
- Compact layout instead of decorative bars.
- Release notes and hover-effect noise disabled.

## Start A Worker

Use the repo launcher:

```bash
pnpm zellij:agent -- --name claude-webflow --pane-name claude --command 'claude'
```

For the Claude default:

```bash
pnpm zellij:claude -- --name claude-webflow
```

The launcher creates a background session, starts a worker pane, and prints the
exact commands for attach, inspect, stream, send, and cleanup.

## Linear To Lane Workflow

Use the workflow wrapper when a Linear issue or explicit operator task should
become a visible, auditable worker lane:

```bash
pnpm zellij:workflow -- \
  --issue CRE-123 \
  --title "Debug template publish pipeline" \
  --goal "Find the failing runtime path and return evidence" \
  --autonomy-level A1 \
  --authority "May inspect and prepare evidence; no external mutation" \
  --receipt-contract "intent authority source action verification rollback client-facing proof" \
  --rollback "no write authority by default" \
  --escalation "escalate if source, authority, verifier, rollback, or receipt evidence is missing" \
  --acceptance "Identify the owner/runtime and failing command" \
  --acceptance "Return exact verification output" \
  --verification "Run the narrowest relevant repo or log check"
```

Dry-run is the default. It does not create, claim, update, or close Linear
issues, and it does not launch a worker. It prints:

- the derived Zellij session and pane names;
- the autonomy level, authority envelope, receipt contract, rollback path, and
  escalation condition;
- the worker prompt packet;
- the launch command;
- board, attach, inspect, stream, send, and kill commands;
- an evidence template and approval-gated Linear comment command.

Launch the lane explicitly:

```bash
pnpm zellij:workflow -- \
  --issue CRE-123 \
  --title "Debug template publish pipeline" \
  --launch
```

Paste the generated prompt only after reviewing it, or use `--send-prompt` with
`--launch` when the lane is safe to start immediately:

```bash
pnpm zellij:workflow -- \
  --issue CRE-123 \
  --title "Debug template publish pipeline" \
  --launch \
  --send-prompt
```

Approval safety is enforced by this workflow boundary, not by trusting a
specific model. Opus, GPT, Claude, local models, or future foundation models can
run inside the pane; public, irreversible, credential, deploy, purchase, send,
or third-party mutation actions still require explicit operator approval.

CREATE SOMETHING is agent-run with receipts: the lane is complete only when the
receipt contract is satisfied. Closeout remains Codex/operator-owned: inspect
the pane, run the verifier, then paste reviewed evidence into Linear or the
owning handoff surface.

## Agent Board

Use the repo board for a sidebar-style lane overview:

```bash
pnpm zellij:board
pnpm zellij:board -- --watch
```

The board reads `.codex/zellij-agent-lanes.json`, merges it with live Zellij
session and pane state, and renders cards with status, pane id, command, attach,
inspect, and stream commands.

## Codex Control Checks

List sessions:

```bash
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij list-sessions --short --no-formatting
```

Attach visually:

```bash
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij attach <session>
```

Capture pane output:

```bash
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij --session <session> action dump-screen --pane-id <pane-id> --full
```

Stream pane output as JSON:

```bash
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij --session <session> subscribe --pane-id <pane-id> --format json --scrollback 200
```

Send bounded input:

```bash
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij --session <session> action paste --pane-id <pane-id> '<text>'
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij --session <session> action send-keys --pane-id <pane-id> Enter
```

Stop the lane:

```bash
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij kill-session <session>
```

## Transparency Bar

Zellij is acceptable for this lane only when all are true:

1. Codex can name the session and pane id.
2. Codex can read recent output with `dump-screen`.
3. Codex can stream output with `subscribe --format json` when continuous
   monitoring matters.
4. Codex can send bounded input with `paste` plus `send-keys Enter`.
5. The operator can attach to the same session without changing ownership.
6. Browser evidence comes from Codex browser/computer-use or another explicit
   proof surface.
7. Final evidence records commands, pane ids, outputs, and any browser proof.

If those checks fail, use direct Claude CLI for the specific task and fix the
Zellij lane before launching more visible worker sessions.

## Stop Conditions

Stop the Zellij lane and fall back if:

- Codex cannot capture or stream the pane output.
- Codex cannot send bounded input to the pane.
- The session cannot be named, attached, or cleaned up.
- The worker mutates an external surface without readback proof.
- Evidence is weaker than direct Claude CLI output.
