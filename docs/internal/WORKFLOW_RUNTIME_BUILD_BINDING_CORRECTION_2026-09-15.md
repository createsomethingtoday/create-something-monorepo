# Build release and compiler artifact identity correction

Status: implementation route for CRE-2008; no production promotion evidence.

## Confirmed conflict

Agency's `controlActivationSourceFromBuildInspection` freezes the verified
`create-something/build-release-manifest@1` digest as `buildManifestSha256`.
That manifest identifies accepted Map handoff, five delivery artifacts,
staging/UAT evidence, acceptance and deployment/rollback information.

The compiler signs a separate `workflow_artifact_manifest.v0.1` inventory.
Its digest identifies the runtime manifest and compiler-generated governance
artifacts. These identities cannot be substituted for one another.

The current runtime checkpoint writer and migration 0009 equate the compiler
outer digest with the frozen delivery Build digest. Pending Agency migration
0057 and registry lookup repeat that condition to match the existing ledger.
Those checks reject a legitimate pair of distinct verified manifests. The
synthetic fixtures that assign one digest to both do not prove a real Build
handoff. Do not promote this contract unchanged.

Evidence owners:

- `packages/agency/src/lib/server/control-activation.ts`,
  `controlActivationSourceFromBuildInspection`.
- `packages/delivery-schema/src/build-release.ts`, `BuildReleaseManifest`.
- `packages/workflow-compiler/src/artifacts.ts`, `WorkflowArtifactManifest`.
- `packages/owned-agent-runtime/src/workflow-runtime-store.ts`, admission SQL.
- `packages/owned-agent-runtime/migrations/0009_control_workflow_runtime_registration_binding.sql`.

## Required correction

Preserve both hashes. Introduce a versioned, verified Build-to-compiler binding
that is covered by the accepted Build package. It must identify the compiler
outer/runtime digests, workflow/compiler identities, signer, runtime policy,
and content-addressed artifact prefix. Its digest must be frozen in Agency's
registration along with the unchanged delivery Build manifest identity.

The owning Build verifier must read and verify the binding artifact under the
accepted delivery artifact set and independently verify the signed compiler
inventory. Only that path may write Agency registration. Runtime admission
must read that registration under the exact frozen activation and persist the
binding proof in Control before preparing any source effect.

Replace the equality shortcut with verification of this explicit relation in
both application and D1 guards. Do not simply delete the old condition or
accept a caller-supplied pair of hashes. Preserve historical receipts with their
original registration interpretation through an explicit versioned transition.

## Required proof before promotion

1. A real generated delivery Build manifest and compiler manifest have distinct
   hashes and are accepted through a verified binding.
2. Swapping either manifest, the binding, signer, policy or activation fails.
3. A missing binding and legacy equality-only registration cannot enable new
   execution; historical proof remains readable.
4. The accepted Map/Build evidence, Agency registration and Control checkpoint
   agree on all identities and remain intact through suspension/recovery.
5. Update the full migration-chain and populated tests before remote migration.

This correction preserves the goal's signed-release and Agency authority
boundaries. It does not waive the original submission correlation, authenticated
source observation, approval/stop recovery, or Atlas/Control live verifier.
