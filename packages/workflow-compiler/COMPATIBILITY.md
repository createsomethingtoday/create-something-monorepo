# Compatibility policy

## Runtime

The supported production matrix is Node.js 22 and Node.js 24 on Linux and
macOS. Both lines are exercised as clean npm consumers in CI. The package is
ESM-only. Its npm install floor remains `node >=20` so the package can coexist
with the monorepo's current downstream build lane, but Node 20 is end-of-life
and is not a supported production runtime. Untested odd-numbered and newer
Current releases are also outside the production matrix. Browser runtimes and
CommonJS `require()` are not supported.

Supporting a Node line means the package builds, imports, compiles the shipped
release-promotion fixture, verifies its artifact bundle, and runs the public
CLI from an isolated tarball install. Other Node versions may work but are not
release gates.

## Version surfaces

The npm version, workflow input schema, replay schema, compiled artifact schema,
and governed-interaction schema are independent compatibility surfaces. A
minor npm release may add an explicitly optional field or export while keeping
existing schema versions readable. It does not silently reinterpret an
existing versioned field.

Unknown schema versions and unknown fields fail closed. A breaking TypeScript,
CLI, semantic, or schema change requires either a new npm major version or a
new explicitly versioned schema with a documented migration path.

Interaction hosts must independently declare their supported
`governed_interaction_bundle` schema versions. Compatibility rejects a bundle
whose exact schema is absent from that host allowlist; matching language,
runtime, capabilities, and operations alone is not sufficient.

Compatibility decisions have their own schema boundary. Historical
`governed_interaction_compatibility.v0.1` decisions retain the original error
vocabulary. The evaluator emits `governed_interaction_compatibility.v0.2` when
it can report `UNSUPPORTED_SCHEMA_VERSION`; consumers must branch on that
decision `schemaVersion` rather than apply v0.2 error codes to a v0.1 result.

Inspection envelopes retain that compatibility boundary. Historical
`client_workspace_governed_interaction_inspection.v0.1` values contain v0.1
compatibility receipts; the current Client Workspace inspector emits v0.2 with
a v0.2 receipt. A historical v0.1 envelope also contains only a v0.1
interaction bundle; v0.2 envelopes can contain either supported interaction
bundle version. Atlas Studio follows the same v0.1/v0.2 envelope pairing.

Operator-console data has a separate correlated schema. Historical
`workflow_operator_console.v0.1` embeds a v0.1 decision inventory and replay
report. The v0.2 console embeds the corresponding v0.2 artifacts. The console
generator rejects a mixed pair instead of reusing either envelope version.

### Workflow and interaction v0.2

`workflow_definition.v0.1` remains readable but rejects
`requiredEvidenceValues` and `requiredEvidenceMatchers`. Those fields require
`workflow_definition.v0.2`; its compiler emits
`compiled_workflow_bundle.v0.2`, `decision_inventory.v0.2`, and
`governed_interaction_bundle.v0.2` so the same constraints survive into the
replay and read-only interaction contracts. The corresponding v0.1 contracts
reject the fields instead of silently dropping them.

When a v0.2 action supplies an exact evidence value and matcher for the same
field, that value must satisfy the matcher. Compilation rejects a contradictory
definition with `EVIDENCE_VALUE_MATCHER_CONFLICT`; it never emits a replay
contract that is impossible to satisfy.

The current package reads both versions and exports explicit detached-copy
migrations for each. A v0.1 parser rejects v0.2 input, so callers must retain
the original artifact, migrate deliberately, and validate, compile, and replay
the result before promotion.

Replay reports follow the same boundary. v0.1 compiled bundles produce
`workflow_replay_report.v0.1`, which omits evidence-value and
evidence-matcher mismatch fields and reason codes. v0.2 compiled bundles
produce `workflow_replay_report.v0.2`, which carries those fields. Consumers
must discriminate replay reports by `schemaVersion`; a historical v0.1 report
is not silently widened or relabeled.

The public TypeScript definitions preserve this correlation: a v0.1 compiled
bundle contains only `decision_inventory.v0.1`,
`governed_interaction_bundle.v0.1`, and unconstrained decisions; v0.2 contains
their v0.2 counterparts. This prevents callers from assembling an impossible
cross-version contract before replay begins.

MCP and OpenAI Responses adapter plans preserve it too. A v0.1 compiled bundle
produces `workflow_adapter_plan.v0.1` with the legacy governance-reason
vocabulary; v0.2 produces `workflow_adapter_plan.v0.2` when constrained replay
can report exact-value or matcher mismatches. Consumers must branch on the
adapter plan's `schemaVersion` rather than assume an expanded v0.1 envelope.

## Prereleases

`0.1.0-beta.*` releases are public integration candidates. Their documented
public seams are intentional, but a later beta may still make a breaking
change with a changelog and migration entry. Stable `0.1.x` releases retain
the documented interfaces for the remainder of the `0.1` line.

## Operating systems and filesystems

Atomic artifact promotion requires a local filesystem that supports symbolic
links and atomic rename within one parent directory. Callers must not place the
public output path and its compiler control directory on different filesystems.
Windows is not currently a supported production target.
