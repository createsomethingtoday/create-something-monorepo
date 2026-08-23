# Migrating and upgrading

## Before every upgrade

1. Read the changelog entry for the target npm version.
2. Run existing definitions and replay manifests through the target parser in
   a disposable directory.
3. Compile twice and compare the generated manifests.
4. Independently verify the candidate bundle.
5. Review adapter dispositions and exact arguments before connecting an
   authenticated execution host.
6. Promote through the owning approval and rollback process.

## Schema changes

Never change `schemaVersion` just to make a newer parser accept an older
document. When a new schema is introduced, migrate a copy, validate it, and
retain the previous source and compiled revision until the new replay outcomes
and receipts are accepted.

The compiler intentionally rejects unknown schema versions. It does not guess
renamed fields, synthesize missing governance, or convert historical approval
strings into live authority.

### Workflow and interaction v0.2

Version `v0.2` introduces explicit evidence constraints. A v0.1 workflow
cannot carry `requiredEvidenceValues` or `requiredEvidenceMatchers`; a v0.2
workflow compiles to `compiled_workflow_bundle.v0.2`,
`decision_inventory.v0.2`, `governed_interaction_bundle.v0.2`,
`tool_contracts.v0.2`, and `approval_surfaces.v0.2`. The v0.2 tool and approval
contracts retain constraints for their governed actions.
Use the public helpers to create a detached v0.2 copy rather than editing a
source artifact in place:

```ts
import {
  migrateGovernedInteractionBundle,
  migrateWorkflowDefinition
} from '@create-something/workflow-compiler';

const workflowV0_2 = migrateWorkflowDefinition(workflowV0_1);
const interactionV0_2 = migrateGovernedInteractionBundle(interactionV0_1);
```

The helpers validate the source first and change only its schema version. They
do not invent constraints, add authority, or approve a replay. Revalidate,
compile, replay, and independently verify the migrated copy before promotion;
preserve the v0.1 source and compiled revision for rollback.

Compiled bundles and their decision inventories are derived artifacts, not
in-place migration targets. Migrate the source definition and recompile so the
new hashes and v0.2 artifact schemas describe one coherent contract.

Replay reports are also derived artifacts. A v0.1 bundle's
`workflow_replay_report.v0.1` stays readable in its historical shape. To
receive v0.2's exact-value and matcher mismatch details, migrate the source,
recompile it, and replay the retained cases; do not relabel or append fields to
an existing report.

The package types enforce matching compiled-bundle, decision-inventory,
governed-interaction, tool-contract, and approval-surface versions. Do not
hand-edit an outer schema version or mix derived artifacts across revisions:
migrate the source, then recompile and replay so all correlated contracts carry
the same version and definition hash.

When moving a delivery host to v0.2, update its
`GovernedInteractionHostContract.schemaVersions` allowlist only after that
host has validated the v0.2 parser and renderer. Compatibility intentionally
reports `UNSUPPORTED_SCHEMA_VERSION` until the exact interaction schema is
declared; do not treat matching runtime or capability lists as version support.
For hosts built against the older public contract, a missing `schemaVersions`
field remains valid and means v0.1-only support. Add an explicit allowlist
before claiming support for v0.2 or a later schema.
The resulting compatibility receipt is
`governed_interaction_compatibility.v0.2`; preserve historical v0.1 decisions
and branch on the decision schema before interpreting its error vocabulary.
The Client Workspace and Atlas Studio inspection envelopes that contain the
receipt are likewise v0.2. Preserve historical v0.1 envelopes and branch on
their outer schema before reading the nested compatibility result. A retained
v0.1 envelope can contain only a v0.1 interaction bundle; do not relabel a
v0.2 bundle into it.

Operator-console data is derived from both the compiled bundle and replay
report. Recompile and replay a migrated definition before generating a v0.2
console; do not combine a retained v0.1 replay report with a v0.2 bundle. The
generator rejects this mixed pair and preserves the v0.1 console as history.

Adapter plans are derived from that same replay. Recompile and replay a migrated
definition before requesting a new plan: only v0.2 bundles emit
`workflow_adapter_plan.v0.2`, which can include constrained-evidence mismatch
reasons. Do not relabel a previously retained v0.1 adapter plan.

## Artifact output upgrades

The compiler writes immutable revisions behind a managed pointer and retains
prior revisions. Remove an output pointer and its adjacent
`.OUTPUT.workflow-compiler/` control directory only when no compiler or reader
is active and the owning rollback policy permits deletion.

A narrow pre-marker migration exists only for outputs whose symlink, revision
directory, complete manifest, content hashes, and bundle identity prove prior
compiler ownership. Unrelated or ambiguous directories remain fail closed.

## From beta to stable

For the first stable release, replace a beta range with an exact `0.1.x`
version, rerun the clean-consumer gate on Node 22 and 24, and recompile all
production-bound definitions. Do not assume a beta-generated plan is approved
for live execution merely because the stable compiler can parse it.
