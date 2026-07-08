# Codex-Driven Claude in cmux

This guide defines the exception lane where Codex drives a visible Claude agent
through cmux for CREATE SOMETHING operator workflows that Codex cannot complete
directly.

cmux is not being evaluated as a replacement for Codex, Linear, or the repo
control plane. The primary operating model is CREATE SOMETHING operators driving
Codex directly. cmux is the transparent cockpit Codex uses only for the other
cases: inspecting, steering, and verifying a Claude worker when the user's
Webflow Claude agent has pre-installed internal tools or connectors that Codex
does not.

That connector set may include Slack, Fivetran, Figma, Google, Statsig,
Datadog, Snowflake, Webflow product/admin surfaces, and similar Webflow-internal
systems. Treat those tools as Webflow-owned authority surfaces, not as generic
internet research tools.

## Operating Model

Codex remains the normal agent surface, operator interface, coordinator, and
repo-truth surface for CREATE SOMETHING work. cmux is the terminal and browser
cockpit for exception cases. Claude is the Webflow-capable worker inside that
cockpit only when Claude owns the required Webflow-internal connector surface.

In short: operators drive Codex most of the time. When an outside capability is
needed, Codex drives Claude in cmux. cmux hosts the session; it does not own the
task, decide completion, replace Linear, or become the agent manager of record.

cmux may host that Claude session only if Codex can inspect and steer it through
cmux's CLI/socket API with evidence at least as transparent as direct Claude CLI
use.

The target architecture is:

```text
Codex operator
  -> repo docs, Linear, git, verification commands
  -> cmux CLI/socket API for visible Claude connector sessions
    -> Webflow Claude agent with pre-installed internal tools
    -> optional cmux browser surface for live proof/readback
```

Herdr remains the fallback terminal-native multiplexer for ordinary Claude,
Codex, Pi, log, and local server panes.

## Tier Mapping

| Tier | Ownership |
| --- | --- |
| Database | Linear issue/evidence, git state, repo docs, Webflow-internal readback artifacts |
| Automation | Codex-issued cmux CLI/socket commands, visible Claude session, browser automation, smoke commands |
| Judgment | Codex/operator decision about whether Claude output is accepted, escalated, or rejected |

## Why cmux

Public cmux docs describe the features that matter for this lane:

- It is a native macOS terminal built on Ghostty with a socket-based control API.
- It exposes workspaces, panes/surfaces, text input, notifications, sidebar
  metadata, and browser automation through CLI/socket commands.
- It can restore supported agent sessions when hooks capture native resume
  tokens.
- It can expose embedded browser surfaces for DOM snapshots, screenshots,
  console output, and network-visible verification.

Those properties make cmux a plausible bridge between Codex supervision and a
Claude session that owns Webflow-internal connector capabilities.

## Transparency Bar

cmux does not graduate unless all of these are true in a live pilot:

1. Codex can list the active workspaces and identify the Claude connector surface.
2. Codex can read the recent Claude terminal output without screen scraping from
   the macOS window.
3. Codex can send bounded input to the Claude surface and verify the response.
4. Codex can inspect any browser proof surface with structured snapshots or
   screenshots.
5. Claude's connector reads/actions are readback-verified from the owning
   surface before Codex treats them as true.
6. Linear or the final handoff records the exact command/output/browser evidence.
7. Failure is transparent: if cmux, Claude, or Webflow access fails, Codex can
   name which layer failed without guessing.

If any item fails, use direct Claude CLI handoff or Herdr instead.

## Pilot Commands

Install and expose the CLI:

```bash
brew tap manaflow-ai/cmux
brew install --cask cmux
sudo ln -sf "/Applications/cmux.app/Contents/Resources/bin/cmux" /usr/local/bin/cmux
```

Install supported agent hooks after Claude/Codex are on `PATH`:

```bash
cmux hooks setup claude
cmux hooks setup codex
```

Minimum operator checks:

```bash
cmux ping
cmux capabilities --json
cmux list-workspaces --json
cmux identify --json
cmux list-panels --json
cmux sidebar-state --json
```

Minimum terminal control checks:

```bash
cmux send --surface <surface-id> "pwd\n"
cmux send --surface <surface-id> "claude --dangerously-skip-permissions\n"
```

Minimum browser proof checks:

```bash
cmux browser open-split https://webflow.com
cmux browser identify
cmux browser <surface-id> snapshot --interactive --compact
cmux browser <surface-id> screenshot --out /tmp/cmux-webflow-proof.png
cmux browser <surface-id> console list
cmux browser <surface-id> errors list
```

## Webflow-Internal Use Rules

- Use Claude only for the Webflow-internal connector or browser surface Codex
  cannot access directly.
- Keep Claude prompts bounded and auditable.
- Require readback after every mutation or claim that affects an internal
  surface, metric, incident, experiment, sync, design, or customer-facing fact.
- Do not let Claude mark work done. Codex or the operator decides done after
  repo evidence, connector proof, and any Linear evidence are complete.
- Do not store Webflow credentials or internal tokens in repo files, cmux config,
  shell history, screenshots, browser state dumps, or prompt artifacts.
- Do not copy broad raw internal data into the repo or final handoff. Summarize
  the minimum necessary fact, name the owning surface, and preserve enough
  non-sensitive evidence for the operator to re-check.
- Treat Slack, Snowflake, Datadog, Statsig, Fivetran, Figma, Google, and similar
  outputs as confidential unless the operator explicitly says the information is
  safe to quote or publish.
- Prefer aggregate metrics, IDs, timestamps, links, and field names over raw
  customer/user records.

## Stop Conditions

Stop and fall back to direct Claude CLI or manual browser work if:

- cmux socket access must be set to unrestricted `allowAll` for routine use.
- Codex cannot read Claude output or browser proof through cmux commands.
- Claude performs an internal-tool mutation without readback proof.
- cmux hides session state behind UI that is not exposed through CLI/socket.
- Session restore or hooks change Claude/Codex config in a way the operator
  cannot inspect.
- Evidence is weaker than the current direct Claude CLI handoff pattern.
- The task would require exporting confidential Webflow data into repo files or
  an external prompt without explicit operator approval.

## Graduation Criteria

cmux can become the preferred Claude connector bridge only after one live,
low-risk Webflow-internal task proves:

- Claude can use the needed internal connector access from inside cmux.
- Codex can inspect, steer, and summarize the Claude session through cmux.
- Browser or connector readback proof is captured without leaking secrets or
  unnecessary confidential data.
- The repo remains clean except for intentional scoped changes.
- The final evidence is better than or equal to direct Claude CLI handoff.
- Rollback remains direct: stop using cmux and return to Herdr or direct Claude
  CLI without losing repo, Linear, or internal-system state.
