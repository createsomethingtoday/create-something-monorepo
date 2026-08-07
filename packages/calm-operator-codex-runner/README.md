# Calm Operator Codex Runner

Private outbound Mac runner for the Core Ink Codex pager. It keeps
`@create-something/codex-presence` on loopback and polls the Ink bridge over
HTTPS, so the Mac requires no public inbound tunnel and the pager may use any
Wi-Fi network or an iPhone Personal Hotspot.

## Safety boundary

- Requires one exact `CORE_INK_CODEX_TASK_ID` whose live Presence title includes
  the word `disposable`.
- Publishes and executes only the current safe `follow_up` action.
- Accepts only the fixed text `Continue with the recommended next step.`.
- Claims the bridge command before local execution and uses the same request ID
  at Presence and Ink.
- Journals `claimed`, `executed`, and `terminal` locally without tokens.
- A restart with a `claimed` entry stops as ambiguous and never retries it.
- A restart with an `executed` receipt may finish posting that receipt without
  re-executing the Codex action.

## Configuration

Required environment:

- `INK_RUNNER_TOKEN`: distinct runner-only Ink token.
- `CODEX_PRESENCE_TOKEN`: token for the loopback Presence service.
- `CORE_INK_CODEX_TASK_ID`: explicitly selected disposable Codex task.

Optional environment:

- `INK_ORIGIN` (default `https://ink.createsomething.agency`)
- `CODEX_PRESENCE_ORIGIN` (default `http://127.0.0.1:4782`; non-loopback is rejected)
- `CORE_INK_CODEX_RUNNER_ID` (default `runner-macbook`)
- `CORE_INK_CODEX_DEVICE_ID` (default `core-ink`)
- `CORE_INK_CODEX_RUNNER_POLL_MS` (default `2000`)
- `CORE_INK_CODEX_RUNNER_RUNTIME_DIR`

Use Infisical or another secret manager to inject tokens. Do not put them in an
`.env` file or process receipt.

## Commands

```bash
pnpm --dir packages/calm-operator-codex-runner test
pnpm --dir packages/calm-operator-codex-runner check
pnpm --dir packages/calm-operator-codex-runner once
pnpm --dir packages/calm-operator-codex-runner start
pnpm --dir packages/calm-operator-codex-runner status
pnpm --dir packages/calm-operator-codex-runner stop
```

`start` writes a sanitized PID receipt and a mode-0600 journal under
`~/Library/Application Support/CREATE SOMETHING/Core Ink Codex Runner` by
default. `status` and `stop` do not require secret values.

## Persistent macOS service

After the production runner secret exists in Infisical, start the complete
loopback Presence plus outbound runner stack as a macOS user service:

```bash
pnpm --dir packages/calm-operator-codex-runner service:start -- \
  --task-id <fresh-disposable-codex-task-id>
pnpm --dir packages/calm-operator-codex-runner service:status
pnpm --dir packages/calm-operator-codex-runner service:stop
```

The service loads `INK_RUNNER_TOKEN` from Infisical `prod` `/` into process
memory, generates a separate ephemeral Presence token, and binds Presence to
`127.0.0.1`. Neither token is written to its config, status receipt, log, or
runner journal. Startup fails unless the selected task is fresh, explicitly
named disposable, and currently offers a safe unconfirmed follow-up.

## Physical verifier

After flashing firmware 0.2.0 and starting the service against a fresh
disposable task, capture each real pager pass with:

```bash
pnpm --dir packages/calm-operator-codex-runner verify:physical -- \
  --port /dev/cu.usbserial-... \
  --task-id <fresh-disposable-codex-task-id> \
  --pass 1 \
  --kind consecutive
```

The verifier only observes the serial button/state stream; it never creates a
bridge command or calls Presence actions. A pass requires firmware boot proof,
two real button edges within the arm window, matching task/action/request IDs,
an accepted bridge and pager receipt, and exactly one new fixed prompt in the
disposable Codex rollout. Pass 4 additionally requires a sanitized runner
restart receipt via `--recovery-receipt`.

For the recovery pass, `service:stop` writes a private sanitized stop receipt.
The next `service:start` refuses to start the runner if the production queue is
not empty, then records the completed restart and empty-outage proof in
`runner-recovery.json`. The physical verifier requires that receipt and a new
request created only after the restart.
