# Bounded decision evidence

The shared decision service lets a host ask Jev or OpenAI Decisions to choose
among a finite set of candidates. The host still owns tool access, user intent,
policy and dispatch. A receipt is advisory evidence; it grants no execution or
promotion authority. The library and offline operator CLI also support a bounded
public Guide shadow integration. Control execution and approval paths do not
consume selector choices.

Use the host's existing authenticated provider client with
`createJevDecisionSelector(evaluate)` or
`createOpenAIDecisionSelector(client)`. Jev expects the decoded `evaluate` body,
not an MCP `content` envelope. The OpenAI adapter calls the injected client's
`decisions.create` once with `maxRetries: 0` and a cancellation signal. Provider
availability and permission to send the supplied evidence remain host concerns.
The adapters currently pin `jev-1.13.0` and `gpt-6-luna` respectively.

Before selection, the host supplies a request like this:

```json
{
  "id": "inspect-001",
  "scope": "local-project-a",
  "policyVersion": "inspect-policy-v1",
  "stateVersion": "source-sha-or-state-digest",
  "question": "Which source should be inspected first for the reported parser bug?",
  "candidates": [
    { "id": "parser", "description": "Canonical parser implementation and its regression tests" },
    { "id": "ordinary", "description": "Continue ordinary source inspection" }
  ],
  "fallbackId": "ordinary",
  "mode": "fresh"
}
```

Candidate IDs must be unique; `no_match` is reserved for provider abstention.
The host must offer only currently eligible choices, and supply a fresh request
through the service's revalidation callback. Changed scope, policy, state,
question or candidates prevent a usable selection. Pinned and resumed requests
require `fixedChoiceId` and bypass the selector. A fallback is a host-defined
choice, not evidence that the selector succeeded.

Minimize the question and candidate descriptions before sending them to a
provider or saving them locally. The request is retained in the receipt for
replay. Do not include credentials, unrelated private records, raw conversations
or hidden chain of thought. Provider responses may also contain sensitive data;
keep captured input files private and retain only the necessary evidence.

## Offline operator commands

From this package, run `pnpm exec tsx scripts/decisions.ts --help`. The CLI makes
no provider or business-tool calls. Capture a result from your already configured
provider, then validate it against the request and a separate current-state file:

```bash
pnpm exec tsx scripts/decisions.ts resolve \
  --request /private/request.json --current /private/current.json \
  --response /private/provider-response.json --provider openai \
  --store /private/decision-store
```

The captured response must name the question `selection`. Jev uses
`answers.selection` with a probability object keyed by every candidate ID plus
`no_match`. OpenAI uses an `answers` array with one `choice` answer named
`selection` and probabilities shaped as `{ "value": "parser", "probability": 0.8 }`.
The adapters validate the complete distribution and served model. Invalid output
uses the service's explicit fallback path; it does not become an arbitrary action.
Offline elapsed time measures validation, not provider latency.

Read the exact stored receipt before using its ID again:

```bash
pnpm exec tsx scripts/decisions.ts get \
  --scope local-project-a --id inspect-001 --store /private/decision-store
```

After the owning host verifies the downstream result, save a bound outcome:

```json
{
  "decisionId": "inspect-001",
  "scope": "local-project-a",
  "requestHash": "copy-the-64-character-hash-from-the-stored-receipt",
  "status": "verified_success",
  "evidenceRef": "local:regression-test-receipt",
  "durationMs": 2500,
  "costUsd": 0.01,
  "retries": 0
}
```

```bash
pnpm exec tsx scripts/decisions.ts observe \
  --outcome /private/outcome.json --store /private/decision-store
```

An outcome must bind an actionable receipt in the same scope with the exact
request hash. `unknown` is a valid result when downstream correctness is not
established. Identical outcome writes are idempotent; conflicting observations
are rejected. An uncertain write requires scoped readback, not blind replay.

## Replay a fixed suite

Use an array of cases shaped as `{ "request": { ... }, "current": { ... },
"expectedChoiceId": "parser" }`. The request and current objects use the full
request shape above. Use `null` for an expected blocked choice. Keep expected
labels fixed before comparing versions; the replay service does not pass labels
to either selector. Each request ID must be unique across this CLI suite.

Capture baseline and candidate provider responses separately as JSON objects
keyed by request ID, for example `{ "inspect-001": { "model": "gpt-6-luna",
"answers": [ ... ] } }`. Then run:

```bash
pnpm exec tsx scripts/decisions.ts replay \
  --suite /private/suite.json --baseline /private/baseline-responses.json \
  --candidate /private/candidate-responses.json --provider openai
```

The report contains a suite hash, per-case decisions, fallback and failure
counts, and a comparison against the expected labels. Missing responses count
as selector failures. The CLI revalidates captured responses offline and makes
no network or tool calls. Its elapsed times describe local validation, not model
latency. A `review_candidate` proposal is a review artifact, not automatic policy
promotion or proof that downstream task outcomes improved.
Missing or failed configured-selector comparisons suppress that proposal and
retain the baseline. Observed downstream failures or increased observed cost,
duration or retries also retain the baseline. Optional replay observations must
name the exact selected ID and selector version; their evidence remains a host
attestation, not a verifier rerun by this CLI.

## Storage and evidence limits

`FileDecisionRepository` creates a private directory and files, hashes scope and
ID into safe filenames, refuses symlink files, and publishes each immutable file
without overwriting an existing destination. It validates record schemas,
identity bindings and request hashes on readback. It is an operator-local store;
it does not sign records or protect them from the same machine's owner. Keep the
directory outside shared writable locations and do not replace it during a run.

Provider fixture tests and offline replay establish contract behavior. They do
not prove live provider access, task-quality gains or autonomous learning.
Compare fixed scenarios and scoring against a baseline, retain failures and
missing outcomes, then review any proposed prompt, model or policy change through
the owning promotion workflow. This service never rewrites rules or promotes a
change itself.

Sources: the [Jev harness article](https://x.com/av1dlive/status/2102802621664985241)
and [OpenAI Decisions documentation](https://developers.openai.com/api/docs/guides/decisions).

## Public Guide shadow lane

`AGENT_DECISION_MODE=shadow` starts one OpenAI evidence-focus decision after a
fresh request passes existing admission and obtains its conversation lease.
The choice is among the existing three public MCP sources, ordinary discovery,
and no tools. It never filters the executor's tools, changes the worker model,
or takes over the provider's tool loop. Resumed conversations skip the selector.
Provider or evidence-store failure leaves the ordinary Guide response path in
place and emits only a fixed failure code to operator logs.

The selector receives at most the first 1,500 characters of query text through
the existing OpenAI recipient. That text exists only in the provider request;
D1 retains a generic question, fixed public capabilities, policy/template
version and digest of the full request and definition. It does not retain the
query or provider payload. A receipt alone therefore cannot reconstruct private
query text for semantic replay: an authorized original input or a curated
sanitized scenario must be supplied separately.

The decision is published to additive `agent_decisions` rows, with its ID bound
to the existing Guide run ID. After the ordinary run receipt commits, a matching
`agent_decision_outcomes` row records a reference to the completed or failed run.
Both tables are scoped and append-only, with exact request-hash binding. An
unrecorded/uncertain terminal run receives no invented outcome. Quality remains
`unknown`: successful text generation is not an independently verified answer.
`retries=0` here records this shadow selector's no-retry invocation, not unknown
provider-internal task retries. Cost is omitted when it is not observed.

The observation starts alongside ordinary execution and is attached to
`ExecutionContext.waitUntil`, so it does not delay the streamed response. Selector
and state checks have a five-second deadline. Existing public client/budget
admission bounds the extra decision call; rejected and busy requests never call
the selector. Jev is available for explicitly scoped qualification and host use,
but public Guide queries are not sent to it by this integration.

Apply migration `0018_agent_decisions.sql` through the owning runtime D1 release
path before deploying the shadow flag. Rollback: redeploy with
`AGENT_DECISION_MODE=off`, or restore the prior Worker version. Keep the additive
evidence tables and their records; code rollback does not roll back D1 data.
Use independent D1 readback joined by run ID to verify decision/outcome/run
binding; the public response does not expose internal decision evidence.

Live synthetic provider qualification is retained in
[decision-live-qualification.json](decision-live-qualification.json). Both
providers passed the same four frozen cases using their existing runtime/dev
credential sources. The initial generic OpenAI production key's HTTP 429 results
are retained separately. These are contract checks, not task-quality benchmarks.

## Qualification checkpoint — 2026-10-31

- Functional correctness: passed locally. The package typecheck and 146-test
  runtime suite passed. After the final receipt-semantic hardening, all 32
  decision-loop tests and the typecheck passed independent Sol 6.1 re-testing.
  The malformed-receipt regression failed before the repair and passed afterward.
- Perceptual/product quality: passed for the actual CLI and operator guide,
  including resolve/readback/observe/conflict behavior and evidence labels.
  Graphical UI review is not applicable.
- Release readiness: passed for the offline, opt-in library/CLI scope only.
  Hosted activation, live provider behavior, a deployed artifact and downstream
  quality improvements are untested. No production promotion occurred.

The terminal used the existing `node_modules/.bin/tsc` and `tsx` executables
because `pnpm` was unavailable in PATH. Workflow compiler/runtime dependency
builds completed before checking the owning package. Linear coordination was
unavailable because `LINEAR_API_KEY` was absent. The current checkout is dirty
and diverges from `origin/main`; production promotion requires reconciliation
and the owning branch/review/release path. Unrelated edits were preserved.

Worktree disposition: preserved in the current checkout, with changes limited
to `packages/owned-agent-runtime`. Rollback is to remove this additive decision
slice and its exports/script entry; no deployed configuration, policy, customer
activation or source data needs restoration. Retained operator receipt files
are separate evidence and should be preserved according to their owning policy.
