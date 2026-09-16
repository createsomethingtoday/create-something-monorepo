# Judgment Layer Dogfood Playbook (OpenAI + CREATE SOMETHING)

This guide defines how CREATE SOMETHING should dogfood the Judgment Layer using a hybrid setup:

- **OpenAI** for high-quality reasoning under realistic multi-tool scenarios
- **CREATE SOMETHING** for policy artifacts, approval gates, and Andon escalation

The intent is to test the **experience**, not just model output quality.

## Outcome We Want

A repeatable operating loop where:

1. OpenAI agents generate evidence and candidate actions.
2. CREATE SOMETHING policy artifacts decide what is allowed, blocked, or escalated.
3. Andon logs capture uncertainty and approval moments for later harness tuning.

This keeps the system aligned with the Three-Tier model:

- **Database**: `.judgment/policies/*.toml`, `.judgment/checks.toml`, `.judgment/andon.jsonl`
- **Automation**: agent/tool execution (`@openai/agents`, MCP tools, Codex app-server)
- **Judgment**: policy pack selection, approval policy, non-interactive decisions, escalation behavior

## Product Positioning (Internal)

Use this sentence as the default internal framing:

> OpenAI gives us reasoning throughput; CREATE SOMETHING gives us judgment control.

Interpretation:

- OpenAI is the cognitive engine.
- CREATE SOMETHING is the policy operating system.
- Dogfooding validates that the operator experience is legible, safe, and tuneable.

## Dogfood Loop

### 0) Prerequisites

```bash
# OpenAI scenario runner
export OPENAI_API_KEY=...

# Build Judgment Layer CLI
pnpm --filter @create-something/judgment-layer build
```

### 1) Run an OpenAI scenario (evidence lane)

Use a scenario that already maps to contract bundles:

```bash
pnpm agent:halfdozen:fleet-watchdog
# or:
pnpm agent:halfdozen:dedup
pnpm agent:halfdozen:inbox-triage
```

What to capture after each run:

- tool coverage vs required tools
- blocked tool attempts
- final recommendation set

### 2) Run Judgment Layer review (policy lane)

Initialize local judgment artifacts once per repo clone:

```bash
pnpm exec cs-judge init
pnpm exec cs-judge policies
```

Then run a review pass:

```bash
pnpm exec cs-judge run \
  --policy standard \
  --prompt "Evaluate the latest scenario output against CREATE SOMETHING policy posture. Return: (1) allowed actions, (2) actions requiring approval, (3) one Andon object if uncertainty remains."
```

This gives a policy-shaped decision, not only a capability-shaped decision.

### 3) Inspect escalation trail (insight lane)

```bash
pnpm exec cs-judge andon --tail 20
```

Track:

- how often the system escalates
- whether escalations are high signal
- whether a policy change would have prevented avoidable interruptions

### 4) Tune and rerun

Tune one variable at a time:

- policy pack fields (`approval_policy`, `non_interactive_decision`, `sandbox_policy`)
- auto-approve rules
- scenario prompt strictness

Rerun the same scenario to compare behavior before/after policy changes.

## Suggested Dogfood Policy Packs

Create these under `.judgment/policies/` as project artifacts.

### `dogfood_fast.toml`

Use when you need fast iteration with explicit safety boundaries.

```toml
id = "dogfood_fast"
label = "Dogfood Fast"
description = "Fast iteration for daily dogfooding; escalate when uncertain."
model = "gpt-5.5"
effort = "low"
summary = "concise"
approval_policy = "untrusted"
non_interactive_decision = "decline"

[sandbox_policy]
type = "workspaceWrite"
network_access = false
writable_roots = ["$CWD"]

[auto_approve]
command_action_types = ["read", "listFiles", "search"]
command_regex = ["^git\\s+(status|diff|log|show)\\b", "^rg\\b", "^pnpm\\b"]
```

### `dogfood_strict.toml`

Use before demos, handoffs, and production-facing runs.

```toml
id = "dogfood_strict"
label = "Dogfood Strict"
description = "Strict approvals and escalation posture for high-trust runs."
model = "gpt-5.5"
effort = "medium"
summary = "concise"
approval_policy = "untrusted"
non_interactive_decision = "decline"

[sandbox_policy]
type = "readOnly"

[auto_approve]
command_action_types = ["read", "listFiles", "search"]
command_regex = ["^git\\s+(status|diff|log|show)\\b", "^rg\\b"]
```

### `dogfood_deep.toml`

Use for retrospective analysis and policy redesign sessions.

```toml
id = "dogfood_deep"
label = "Dogfood Deep"
description = "Deep reasoning and explicit escalation artifact generation."
model = "gpt-5.5"
effort = "high"
summary = "detailed"
approval_policy = "on-request"
non_interactive_decision = "cancel"

[sandbox_policy]
type = "workspaceWrite"
network_access = false
writable_roots = ["$CWD"]

[auto_approve]
command_action_types = ["read", "listFiles", "search"]
command_regex = ["^git\\s+(status|diff|log|show)\\b", "^rg\\b"]
```

## Andon Contract for Dogfooding

When the system is uncertain, require a single machine-readable object:

```json
{
  "type": "stop",
  "question": "What authority level is required to proceed with this write action?",
  "context": "Scenario requested data mutation without explicit operator approval.",
  "proposedAction": "Pause and request human approval before any write or delete operation.",
  "confidence": 0.74
}
```

This object is the handoff boundary between Automation and Judgment.

## Weekly Scorecard

Review weekly and track trends:

- **Policy compliance rate**: `% of proposed actions that were policy-valid without manual correction`
- **Escalation quality rate**: `% of Andon records judged useful by operator review`
- **False-stop rate**: `% of escalations that should have auto-approved`
- **Silent-risk rate**: `% of incidents with no Andon despite later discovering ambiguity`
- **Time-to-resolution**: median time from Andon creation to decision

If compliance rises while silent-risk stays low, the Judgment Layer experience is improving.

## 14-Day Dogfood Plan

1. Days 1-3: Baseline with `standard` and existing scenarios.
2. Days 4-7: Introduce `dogfood_fast` and measure interruption vs risk tradeoff.
3. Days 8-11: Run `dogfood_strict` on demo-critical paths.
4. Days 12-14: Use `dogfood_deep` to produce policy revisions and update defaults.

## Decision Rule

Promote policy changes only when both are true:

1. They reduce silent-risk or reduce operator correction work.
2. They do not increase unresolved Andon volume for two consecutive runs.

This keeps policy tuning outcome-driven instead of preference-driven.

## Related Files

- `packages/judgment-layer/README.md`
- `docs/THREE_TIER_FRAMEWORK.md`
- `docs/OPENAI_AGENT_SDK_HALFDOZEN_SMOKE.md`
- `scripts/openai-agent-sdk-halfdozen-smoke.ts`
