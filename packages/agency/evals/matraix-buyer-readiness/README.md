# MatrAIx buyer-readiness pilot

This is a local-only MatrAIx web-evaluation task for the public AI Buyer
Readiness Audit page. It evaluates a simulated buyer's *intent decision* after
reading the offer; it does not simulate a conversion or authorize any write.

## Contract

- Target: a loopback `/agent-readiness` page only.
- Required output: `buyer_readiness_trajectory.json`.
- Terminal outcomes: `book_intent` or `abandoned`.
- Forbidden: opening `/book`, booking/calendar submission, payment, CRM,
  analytics, production writes, or external web navigation.
- Output is a hypothesis and decision trajectory, never a conversion metric.

`verify.mjs` is the fast, repository-owned contract check. The mirrored
`task/tests/test_state.py` is what MatrAIx/Harbor runs inside its Python
Playwright verifier image.

## Prepare an isolated MatrAIx checkout

Run from `packages/agency` after choosing a disposable checkout. This copies
only this task and never changes upstream source files:

```bash
node evals/matraix-buyer-readiness/install-matraix-task.mjs \
  --matraix-root /absolute/path/to/MatrAIx-Persona-8B
```

It writes `application/tasks/local-buyer-readiness-intent` under that checkout.
Use `--dry-run` to inspect the destination first.

## Live-run network boundary

MatrAIx's Docker provider cannot enforce a hostname allowlist itself. The
included `environment/` template instead puts the persona container on an
internal Docker network. It can resolve only two task-owned proxies:

- `agency-bridge`, which makes read-only GET/HEAD requests to the host-local
  Agency app and rejects `/book` plus every write method;
- `llm-bridge`, which is an HTTP CONNECT tunnel restricted to
  `auth.openai.com`, `chatgpt.com`, and `api.openai.com` on port 443. It is
  not a browser destination; the Codex subscription credential is supplied
  only to the short-lived task process and never stored in this repository.

The bridge yields a real MatrAIx web-agent run without public browser egress.

## Comparative page study

`study/` is a local-only matched-persona experiment for three query-selected
renderings of the same route: `baseline`, `proof-first`, and `outcome-first`.
It preserves the audit offer, source evidence, booking URL, and no-guarantees
boundary while changing only the hierarchy of the opening, proof rail, and
three-scene diagnostic.

The runner creates three fresh MatrAIx task directories and a recipe with four
fresh Docker containers per candidate. It runs at most three trials at once.
It uses the locally signed-in Codex CLI's `auth.json` only when the host has
already completed `codex login`; the credential is uploaded to a short-lived
task container and is never stored in this package or its report.

```bash
node evals/matraix-buyer-readiness/study/run-study.mjs \
  --matraix-root /absolute/path/to/MatrAIx-Persona-8B \
  --jobs-dir /absolute/path/to/matraix-jobs

cd /absolute/path/to/MatrAIx-Persona-8B
uv run harbor run -c configs/jobs/cre-1763-local-buyer-readiness-study.yaml

node /path/to/packages/agency/evals/matraix-buyer-readiness/study/aggregate-study.mjs \
  --jobs-dir /absolute/path/to/matraix-jobs \
  --output-dir /absolute/path/to/study-report
```

The resulting score is a standardized qualitative signal from synthetic agents.
It is not a conversion, demand, or human-research metric. Every completed
trajectory must still have zero booking, payment, calendar, CRM, analytics, and
external-navigation activity.
