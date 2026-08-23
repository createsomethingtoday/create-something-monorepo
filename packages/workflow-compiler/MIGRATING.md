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
`decision_inventory.v0.2`, and `governed_interaction_bundle.v0.2`, which retain
them.
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

The package types enforce matching compiled-bundle, decision-inventory, and
governed-interaction versions. Do not hand-edit an outer schema version or mix
derived artifacts across revisions: migrate the source, then recompile and
replay so all three contracts carry the same version and definition hash.

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
