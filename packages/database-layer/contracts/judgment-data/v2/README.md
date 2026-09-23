# Reusable judgment data v2

Node-only import: `@create-something/database-layer/judgment-data/v2`.
Build with `pnpm --filter @create-something/database-layer build`.
The original `judgment-data` export remains the v1 exception-specific contract.
New shared integrations should use v2.

The persisted chain is evidence snapshot → question set → inference run → decision
policy → decision run. SHA-256 digests bind canonical JSON, not reviewer identity or
source authenticity. Files are written atomically without overwriting existing records.
These are local offline artifacts, not a database service or production activation.

`compileRequest(snapshot, questions, model)` emits TypeSafe's `{state, model, questions}`
envelope. Instructions contain explicit evidence paths because question IDs do not
convey meaning to the model. Structured context, facts, source identities, timestamps,
instructions and primitive-specific criteria survive compilation. Only referenced
sources are included. The caller must select relevant context and keep downstream
labels, outcomes and action thresholds out of it; structural checks cannot detect
semantic leakage inside arbitrary text. Evidence timestamps cannot exceed the cutoff,
and recorded inference cannot precede capture. Historical authenticity still needs an
independent owner.

`recordInference` preserves Noul probability, Choice selection/distribution/confidence,
Score mean/legend/distribution/confidence, served model, token usage, exact compiled
request and trace. A local invocation ID is distinct from an optional provider request
ID. Aliases retain requested and resolved served model identities. Validation rejects
mismatched answers, options, legends and usage. Distribution sums and score expectations
use a 1e-6 tolerance. This is verified against documented response shapes and synthetic
fixtures; live provider compatibility has not been tested. Provider errors retain no
invented response. There is no provider client, retry loop or paid API call here.

`decide` and `replayDecision` apply separately sealed policies to saved inference.
Changing a threshold creates a new decision without changing inference. Changed evidence
or questions require a new inference. Policies support required signals and forbidden
violations; no risk averaging is performed. Missing facts, unknown applicability,
provider failure, incomplete scope and mandatory review route to `needs_human`.
Measurements can still be collected for review-required cases. Even
`prerequisites_supported` has `authority: advisory_only`; this is never permission to
approve, publish, send, or mutate a system. Model confidence is not workflow correctness.

`validateLabels` separates development from effectiveness eligibility. Development
allows explicit synthetic, model-generated, human-reviewed and observed-outcome
provenance. Effectiveness requires independently reviewed labels, reviewer-verified
snapshots and distinct development/held-out groups. Intake authenticates reviewers;
this function checks declared structure. Eligibility always returns effectiveness
`not_established`: it does not calculate business improvement or replace the stricter
v1 exception evaluation gate.

## CLI

Run `node packages/database-layer/scripts/judgment-v2.mjs` from the repository root.
The usage output documents capture, compile, record, decide, replay and labels arguments.
`record` consumes JSON with exactly `response`, `trace`, and `error` fields.
`decide` consumes a raw policy and persists both the sealed policy and decision.
`replay` consumes five sealed artifacts. Inputs are JSON files; output is canonical JSON.

Run `pnpm --filter @create-something/database-layer judgment:test` for both v1 and v2
regressions, including the actual CLI in fresh processes. Synthetic fixtures demonstrate
all three primitives, changed-policy recomposition and rejection of damaged artifacts.
No test establishes model robustness, accuracy or business effectiveness.

## Adoption boundary

An owning adapter still must capture real responses and attempt telemetry, explicitly
configure retries, redact sensitive state before capture, enforce retention/access
policy, and validate the pinned provider API. Before business promotion, acquire
certified pre-decision cases and independent reviewer labels, freeze policy thresholds,
and compare candidate against baseline on held-out groups. Datasette can later inspect
an authorized SQLite projection; it is optional and does not supply these contracts.

Sources: [TypeSafe API](https://docs.typesafe.ai/api),
[advanced primitives](https://docs.typesafe.ai/primitives/advanced),
[confidence](https://docs.typesafe.ai/confidence),
[models](https://docs.typesafe.ai/models).
