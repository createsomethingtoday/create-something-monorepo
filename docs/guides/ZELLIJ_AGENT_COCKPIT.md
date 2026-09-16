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

For the new Claude sidebar and receipt controller, use `cs-zellij launch` from
the extension section below. The following commands retain the legacy generic
terminal lane without the plugin:

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

Automatic `--send-prompt` is retired because pane creation does not prove Claude
is ready. Use the cockpit controller below to inspect the exact prompt before
sending. The legacy flag now fails before launching anything.

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

## CREATE SOMETHING cockpit extension

The first release adds a Rust/WASM sidebar and a local, persistent task controller.
The sidebar displays task identity, terminal connectivity, observed Claude state,
and the most recent event time. Enter or click focuses the assigned worker only
while that exact terminal exists and has not exited. It never approves Claude tools.

Build and install on this Mac:

```bash
rustup target add wasm32-wasip1
pnpm zellij:cockpit:build
pnpm zellij:agent:test
pnpm zellij:cockpit:install
```

The installer stores a content-addressed release beneath
`~/Library/Application Support/CREATE SOMETHING/Zellij/releases`, switches the
`current` symlink, and installs `~/.local/bin/cs-zellij`. Existing sessions keep
running. The install receipt includes hashes and the previous release path.

Launch a task (choose a unique task ID for each new conversation):

```bash
cs-zellij launch --id claude-review --title "Claude review"
```

The returned attach command opens the same session for operator supervision.
The plugin requests read/change workspace permissions for pane status and focus.
These permissions do not authorize Claude tools or external writes.

To register an existing session, use `adopt` with an explicitly inspected
`--session` and `--pane-id`. Adoption does not restart the worker, send text,
or install hooks into its existing process. Agent state is unknown until events
are available. Never guess among multiple terminal panes.

Codex control loop:

1. `cs-zellij inspect --id claude-review` checks the recorded target.
2. `cs-zellij capture --id claude-review` returns the screen and its SHA-256 hash.
3. Inspect that screen: Claude must be at an empty input prompt, not a dialog,
   tool permission, shell, or partially typed draft.
4. Save the exact approved task text in a UTF-8 file. Use `send --id`, `--file`,
   and `--screen-hash` from the capture. A changed screen refuses delivery.
5. Read the returned receipt. `accepted` requires a matching Claude
   UserPromptSubmit hook. `unconfirmed` must be inspected, never automatically
   retried. Neither state proves the task completed.
6. Capture the result and run the owning verifier before declaring completion.

The controller persists metadata, event summaries and prompt hashes, not raw
prompts or tool arguments. CLI capture intentionally returns terminal text to the
caller. Scope any retained captures to the task's privacy requirements.

Claude hooks are added only to newly launched cockpit sessions with `--settings`.
They observe startup, submissions, tools, approval requests, response completion,
and disconnect. They return no permission decision and do not change account,
MCP or approval configuration. A response-finished event is not verified completion.

A controller invocation can be restarted without losing task identity; task state
lives under the app-data `tasks` directory. If a worker disappears, exits, or a
managed Claude process identity changes, create/adopt a new task after inspection.
A crashed sender can leave `send.lock`: inspect any uncertain receipt and current
screen before removing that specific stale lock. Never replay a prompt blindly.

Rollback: retain the install receipt and identify a previously verified release.
Run the installer with `--rollback` and that release ID; it checks every checksum
before switching `current`. Verify `cs-zellij inspect` afterward. A receipt’s
`previous` field records history, not proof that the previous candidate passed. For an
initial install, stop using the new launcher; existing Zellij config and sessions
are unchanged. Do not delete task records or release directories during rollback.
