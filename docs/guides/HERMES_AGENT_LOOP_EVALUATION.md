# Hermes Agent Loop Evaluation

This guide defines the first production-safe Hermes test lane for CREATE
SOMETHING agent loops.

Hermes is evaluated as an execution candidate, not as the source of truth.
Linear and Symphony remain the control plane for tracked work, workspace
creation, dispatch boundaries, and evidence. Hermes may graduate only after it
can satisfy the same operational contract already proven by the bounded
code-quality Symphony lane.

## Why This Lane Exists

Hermes is attractive for CREATE SOMETHING because the upstream project is built
around long-lived agent use: memory, skills, scheduled automations, MCP tool
loading, messaging gateways, isolated subagents, and terminal backends that can
run away from a laptop. Those properties are useful only if they improve the
loop without weakening queue ownership, evidence, or cleanup.

Primary references:

- Hermes Agent repository: <https://github.com/nousresearch/hermes-agent>
- Hermes Agent docs: <https://hermes-agent.nousresearch.com/docs/>
- Hermes built-in tools reference:
  <https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/tools-reference.md>

The safe test is therefore:

1. Keep Linear issue state, labels, project membership, and evidence as the
   authority.
2. Keep Symphony as the repo-local loop that decides what may run.
3. Test Hermes as a host capability first.
4. Promote a Hermes worker backend only after the strict smoke and one bounded
   issue run produce boring evidence.

## Commands

Readiness mode records whether Hermes is available without failing CI when the
binary is not installed:

```bash
pnpm agent:hermes:evaluate
```

Strict production mode fails if Hermes is not installed or cannot answer basic
CLI probes:

```bash
pnpm agent:hermes:evaluate:strict
```

Machine-readable output:

```bash
pnpm agent:hermes:evaluate:json
```

Use `HERMES_COMMAND` when the binary is installed outside `PATH`:

```bash
HERMES_COMMAND="$HOME/.hermes/bin/hermes" pnpm agent:hermes:evaluate:strict
```

Full-agent smoke requires a configured model provider, not just an installed
binary. Keep provider secrets in Infisical and inject them at runtime instead of
writing API keys into `~/.hermes/.env`:

```bash
hermes config set model.provider custom
hermes config set model.default gpt-5-mini
hermes config set model.base_url https://api.openai.com/v1
hermes config set model.api_mode chat_completions

infisical run --env=prod --path=/ --include-imports=true -- \
  hermes --cli -z "Full-agent smoke. Reply with exactly: HERMES_FULL_AGENT_OK"
```

Hermes 0.17.0 exposes OpenAI API credentials under the `openai-api` setup path,
but the direct `provider: openai` runtime route is not accepted by the agent
loop. Use the OpenAI-compatible `custom` endpoint route above until upstream
accepts a native OpenAI runtime provider slug.

## What The Smoke Proves

The evaluator checks:

- repo control-plane files still exist
- the Hermes command resolves
- `hermes --version` exits successfully
- `hermes --help` exits successfully

This does not prove that Hermes should mutate the repo. It proves only that a
host is ready for the next controlled test.

The full-agent smoke proves one model-backed Hermes turn can start, call the
configured provider, return a deterministic response, and exit without file
changes. It still does not authorize Hermes to claim or mutate Linear work.

## Production Test Order

1. Run `pnpm agent:loop-pilot -- --json` from a clean worktree on latest
   `origin/main`.
2. Run `pnpm agent:hermes:evaluate:strict`.
3. Create one Linear issue in `CREATE SOMETHING Agent Coordination` with a
   Hermes-specific evaluation label.
4. Run exactly one bounded pass in an isolated worktree.
5. Compare against the current Codex/Symphony baseline:
   - issue claimed only when explicitly eligible
   - workspace created under a known root
   - no unrelated file changes
   - verification commands reported
   - Linear evidence recorded
   - linked git worktree unregistered on cleanup

## Stop Conditions

Stop before any Hermes worker promotion if:

- Hermes requires credentials or model selection that are not available through
  the approved secret path
- the worker cannot preserve Linear as the source of truth
- the worker cannot run inside an isolated git worktree
- cleanup leaves stale linked worktree registrations
- evidence is less specific than the current Codex/Symphony report
- the worker tries to broaden scope beyond the Linear issue

## Graduation Criteria

Hermes can move from evaluation to a real backend only when:

- strict smoke passes on the target production host
- one no-op issue run completes and leaves the repo clean
- one real low-risk issue run completes with better or equal evidence than the
  Codex baseline
- no daemon is left running without an owner, port, rollback note, and status
  URL
- the lane has a documented rollback to the existing Codex-backed Symphony
  workflow
