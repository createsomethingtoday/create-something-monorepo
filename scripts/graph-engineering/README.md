# Execution evidence graph pilot

Inspect a compiled workflow, its recorded runtime history, and related agent
review evidence through one read-only JSON graph. This is an offline prototype
tracked in Linear as CRE-2322. It does not dispatch work or change any source.

The graph preserves three views: tasks and their execution order; worker,
reviewer, and integrator assignments; and runtime attempts and receipts. Each
relationship retains its owning system and evidence source. A package dependency,
a runtime prerequisite, and an approval are different contracts.

## Run the synthetic example

From the repository root, bootstrap the pinned toolchain and build the owning
compiler/runtime packages:

```bash
bash scripts/bootstrap-worktree.sh
pnpm graph:evidence:build
pnpm graph:evidence demo
```

If `pnpm` is unavailable in your shell, prefix each command with
`bash scripts/ona-bootstrap-local.sh`, for example:

```bash
bash scripts/ona-bootstrap-local.sh pnpm graph:evidence demo
```

The example prints a JSON wrapper labeled `synthetic_no_live_execution`. It uses
an ephemeral compiler signing key and the real compiler, runtime, and Symphony
review aggregator APIs with inert fixture inputs. No provider call or verification
command runs. Repeated demonstrations can have different signing fingerprints;
the determinism guarantee applies to identical input bytes and trusted key.

## Project an existing offline export

Supply a separately trusted compiler public key. Keep it outside the export so
the export cannot select its own trust root:

```bash
node scripts/graph-engineering/cli.mjs project \
  --input /absolute/path/export.json \
  --trusted-key /absolute/path/trusted-compiler-public.pem
```

The command prints the graph to stdout and leaves both inputs unchanged. Use
the direct `node` command when redirecting JSON to a file; package-manager
command banners may otherwise appear in the redirected stream. No output path,
network destination, execution command, approval command, or retry option exists.

On failure the command returns exit code 1, writes a diagnostic to stderr, and
prints no graph. Check the input schema, separately trusted signer, artifact
hashes, scope labels, and receipt consistency. Re-export from the owning system
if evidence is inconsistent; do not repair receipt hashes to manufacture success.

## Export contract

`execution_evidence_input.v0.1` is a closed JSON object with these required fields:

| Field           | Value                                                            |
| --------------- | ---------------------------------------------------------------- |
| `schemaVersion` | Exact string `execution_evidence_input.v0.1`                     |
| `scope`         | Nonempty `accountId`, `tenantId`, and `workspaceId` strings      |
| `asOf`          | Explicit canonical ISO timestamp, including milliseconds and `Z` |
| `maxAgeSeconds` | Positive integer used to age observations                        |
| `runtime`       | One runtime export envelope, described below                     |
| `reviews`       | Array of Symphony review envelopes; may be empty                 |
| `bindings`      | Array of explicit review bindings; may be empty                  |

Each envelope contains `sourceId`, `evidenceRef`, `scope`, `observedAt`, and
`freshness`. The source ID identifies an export observation, and `evidenceRef`
is its source pointer. Observation time is canonical ISO or `null` when unknown.
Freshness is `current`, `stale`, or `unknown`. Old current observations become
stale relative to `asOf`; unknown observations remain unknown. Future observations
and runtime observations predating their receipts are rejected.

The runtime envelope also contains:

- `artifactFiles`: a JSON object mapping every compiler artifact path to its exact
  UTF-8 file contents, including `manifest.json`, `attestation.json`, and the
  signed `runtime-manifest.json`. Preserve bytes, including whitespace.
- `run`: the raw runtime checkpoint containing its complete receipt chain.

The compiler's public snapshot verifier checks the artifact inventory and
Ed25519 signature against the independently supplied key. The runtime's public
parser and verifier then check the serial manifest, checkpoint, and receipt
chain. Both artifact hashes must match the run. Standalone redacted Control
proof JSON is insufficient for this offline verifier.

A review envelope also contains `receipt`, a
`multi-agent-reviewed-run-receipt.v1` object. The Symphony validator checks its
worker/reviewer/integrator structure and read-only reviewer guard. The adapter
also rejects conflicting work-unit IDs and passed reports contradicted by failed
stages or command exit codes. It outputs roles and work-unit references, not
commands, free-text summaries, or actor subjects.

A binding contains exactly `runtimeRunId`, `runtimeManifestSha256`,
`artifactManifestSha256`, `reviewSourceId`, and `reviewDigest`.
`reviewDigest` is the receipt's SHA-256 computed by the exported `evidenceDigest`
function, which sorts object keys recursively and preserves array order. Every
binding must match both artifacts and the complete review receipt. Matching
titles, run IDs, or Linear issue IDs alone never creates a join. Bindings remain
caller declarations, represented as `declared_review_binding` edges.

Identical repeated observations and bindings deduplicate. Reusing a source ID
with different content or provenance fails. Input envelopes reject unknown
fields; owning validators handle the inner compiler/runtime/Symphony contracts.

## Read the result

`execution_evidence_graph.v0.1` contains sorted `sources`, `nodes`, `edges`, and
`unresolved` arrays, plus its canonical SHA-256 `digest`. The digest covers the
whole graph except the digest field itself. It detects changes; it is not a
signature or authorization token. The module snapshots its input before async
verification and never mutates the caller's objects.

- **Task view:** `task` nodes and `runtime_precedes` edges. Execution remains
  constrained to the existing serial manifest; projection adds no fork/join.
- **Coordination view:** `review_run`, `assignment`, and `linear_issue_reference`
  nodes. Role labels do not establish distinct authenticated actors. Linear issue
  status stays `unknown` because this tool does not read Linear.
- **Runtime view:** `run`, `attempt`, and `receipt` nodes. Waiting, failed,
  ambiguous, and other owner-defined states retain their original labels.

Each node points to its source ID, whose record carries the artifact digest,
owner, observation time, freshness, verification kind, and evidence pointer.
Receipt nodes retain their exact receipt digest and event index. Source IDs and
canonical IDs are encoded separately to avoid accidental identity collisions.

## Evidence and authority limits

`signed_artifacts_and_runtime_chain` means the compiler signature and runtime
chain consistency checks passed. The raw runtime export itself is not signed:
`runtimeAuthenticity` is `unattested_offline_export`. It is not evidence of live
execution, an external effect, authenticated export provenance, or production
acceptance. Hash-chain consistency alone cannot authenticate a history.

Symphony evidence remains `schema_validated`. Structural validity does not prove
the reported commands ran, authenticate a reviewer, or make a passed report a
verified runtime completion. These trust levels remain separate in the graph.

All scope is `caller_declared_not_authenticated`. Exact scope comparisons reject
accidental cross-scope joins; they do not replace host Identity or tenant checks.
A future hosted integration should obtain evidence through the existing scoped
Control proof reader and explicitly preserve that stronger provenance.

`authority` is always `read_only`. Linear owns tracked work, Control owns runtime
transitions and approval bindings, Substrate owns its records, and Atlas owns
presentation. No graph flag changes those owners. The pilot leaves
`runtime_to_substrate` unresolved and records unbound reviews explicitly. It does
not infer topology links or write back to Atlas.

## Verify or remove the pilot

```bash
pnpm graph:evidence:test
node --test packages/database-layer/test/ontology.test.mjs
```

The tests exercise trusted signatures, tampering, explicit bindings, scope
rejection, duplicate/conflicting observations, freshness, runtime attempts,
approval waits, redaction, CLI behavior, and unchanged source files. The ontology
suite also verifies the upstream root-preservation and relation-parity fixes.
These checks use offline synthetic evidence, not a deployed runtime.

The pilot adds only these scripts and root package commands. Remove them to
roll back; no database migration, service deployment, runtime schema migration,
or external state reversal is required.

## Prior art

The [Control graph explanation candidate](../../packages/owned-agent-runtime/docs/control-graph.md)
adds an authenticated host read boundary and a bounded blocker/owner/evidence
query. It remains separate from this offline export verifier and has an explicit
real-run acceptance hold.

The design applies task organization, agent coordination, and runtime state
management from [Graph Engineering, sections 4–7](https://arxiv.org/html/2608.21156v1).
It keeps record ownership, execution, and policy decisions separate.
[LLMCompiler](https://arxiv.org/abs/2312.04511) informs the separation of planning
and execution, while [PROV-O](https://www.w3.org/TR/prov-o/) and
[PROV-AGENT](https://arxiv.org/abs/2508.02866) provide prior art for later
interoperable provenance mappings. This pilot does not claim standards conformance
or introduce a scheduler.
