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
