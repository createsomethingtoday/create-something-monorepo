# Half Dozen Contract Bundles

Each scenario ships as a 5-artifact bundle:

- `agent_contract`
- `mcp_contract`
- `outcome_contract`
- `golden_tasks`
- `runbook`

Use `templates/runbook.md` as the canonical runbook starting point for each
scenario until a scenario-specific runbook is written.

## Runtime Wiring

Smoke runner scenario mapping is implemented in:

- `scripts/openai-agent-sdk-halfdozen-smoke.ts` via `--scenario dedup|inbox-triage|fleet-watchdog`
- Default model: `gpt-5.5` (`--model` overrides per run)

List scenario metadata:

```bash
pnpm agent:halfdozen:smoke --list-scenarios
```

Run the repo-owned governance eval while Notion programmatic agent testing is
private-beta gated:

```bash
pnpm agent:halfdozen:governance-eval
```

## 1) Dedup + Canonicalization (`hd-dedup-v1`)

- `templates/agent_contract_halfdozen_dedup.yaml`
- `templates/mcp_contract_halfdozen_dedup.yaml`
- `templates/outcome_contract_halfdozen_dedup.md`
- `templates/golden_tasks_halfdozen_dedup.yaml`
- Run: `pnpm agent:halfdozen:dedup`
- Connect-only: `pnpm agent:halfdozen:dedup:connect`

## 2) Inbox Triage + Sync (`hd-inbox-triage-v1`)

- `templates/agent_contract_halfdozen_inbox_triage.yaml`
- `templates/mcp_contract_halfdozen_inbox_triage.yaml`
- `templates/outcome_contract_halfdozen_inbox_triage.md`
- `templates/golden_tasks_halfdozen_inbox_triage.yaml`
- Run: `pnpm agent:halfdozen:inbox-triage`
- Connect-only: `pnpm agent:halfdozen:inbox-triage:connect`

## 3) Fleet Reliability Watchdog (`hd-fleet-watchdog-v1`)

- `templates/agent_contract_halfdozen_fleet_watchdog.yaml`
- `templates/mcp_contract_halfdozen_fleet_watchdog.yaml`
- `templates/outcome_contract_halfdozen_fleet_watchdog.md`
- `templates/golden_tasks_halfdozen_fleet_watchdog.yaml`
- Run: `pnpm agent:halfdozen:fleet-watchdog`
- Connect-only: `pnpm agent:halfdozen:fleet-watchdog:connect`
