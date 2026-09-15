# Internal Marketplace handoff reconciliation

`workflow.json` is the owning compiler source for the bounded internal lane.
It declares two actions: account-owner authorization and the read-only
`template_review_observe_handoff` capability. It contains no review decision,
creator notification, publication, or source mutation action.

The runtime plan orders `authorize` (`authorize_observation`) before `validate`
(`observe_handoff`). Release preparation must supply an explicit approval expiry,
sign the generated artifacts through the trusted release signer, inspect the
Build acceptance package, and register the exact artifact and runtime digests.
The signed integration test consumes this source directly with a test-only signer;
that test signature and its acceptance fixture are not production release evidence.

The deployment fixes the source asset/version pair independently of the compiled
parameter-contract digest. This does not establish original-submission UUID
correlation. Source-owned ingestion must preserve and read back that UUID before
claiming submission-to-review reconciliation in the production verifier.

Owner labels describe the approved internal operating roles; they do not mint
Identity credentials or satisfy the persisted per-run approval requirement.
