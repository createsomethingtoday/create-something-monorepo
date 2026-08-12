# Preflight Submission Artifact Receipts Goal

## Outcome

Complete CRE-1619 by shipping and verifying a versioned Submission Artifact Set across the Webflow Designer Extension Preflight service and the canonical App Marketplace submission flow. For minified or generated JavaScript, Preflight must accept the bundle plus private source maps, validate their association, persist immutable SHA-256 identities, and issue a server-owned receipt. The official submission form remains canonical and continues collecting the same artifacts for redundancy; exact hash reconciliation must expose and invalidate drift between the receipt and canonical submission.

## Baseline

- CRE-487 added source-map intake to the canonical submission form and scanner path.
- The current Preflight candidate exists on `codex/CRE-1264-app-review-companion-production-pilot`, is absent from `origin/main`, and uploads only one bundle artifact.
- Its review-version schema is singular and bundle-oriented rather than a versioned artifact set.
- The shared source-map scanner checks JSON shape, version, sources, and filename association, but a current test accepts empty `mappings`; it is not strong enough to gate submissions.
- CRE-1490 tracks the authenticated Designer Extension production 401. CRE-1264 is the production pilot; CRE-1605, CRE-1608, CRE-1609, and CRE-1610 cover adjacent readiness work.
- The dirty root contains protected unrelated changes. Implementation must use the CRE-1619 worktree.

## Product Contract

- Source maps are private static-review evidence and are never published as runtime assets.
- A source map is conditionally required for minified or generated bundles. A directly authored, unminified bundle may proceed without one only with a recorded policy reason.
- A receipt identifies the artifact-set version, bundle hash, source-map hashes, validation policy version, and scan status.
- During rollout, the canonical form remains usable. A missing receipt is fail-open and visibly unverified until an approved gate transition; a supplied receipt with mismatched hashes is invalid.
- The server-owned runtime path remains authoritative for the published bytes: hash/SRI, readiness, dynamically loaded scripts, and proxy behavior are not replaced by source-map checks.

## Constraints

- Keep maps private and access-controlled. Do not expose raw maps, source contents, secrets, or storage keys in public URLs, logs, or receipts.
- Preserve bundle-only review versions and canonical submissions during rollout.
- Do not weaken validators or substitute mocks for the real authenticated Designer verifier.
- Do not mutate the external form, deploy Workers, apply remote D1/R2 changes, install or publish the extension, or communicate completion externally without the applicable explicit approval.
- Preserve unrelated worktree changes.

## Non-goals

- Do not make source maps part of the published runtime.
- Do not replace the official submission form or make Preflight canonical.
- Do not claim static review proves runtime identity without matching runtime hash/SRI.
- Do not absorb unrelated CRE-1604 through CRE-1610 work unless a dependency prevents the verifier.

## Primary Verifier

On an authenticated Webflow Designer sandbox using the approved Preflight environment:

1. Submit a minified bundle and private source map through the Designer Extension.
2. Observe a server-owned receipt with exact artifact hashes, artifact-set version, policy version, and successful scan state without raw source content.
3. Replay the same artifacts through the canonical submission adapter and observe a matching reconciliation.
4. Change either artifact and observe an explicit mismatch that invalidates the supplied receipt.
5. Run the published-runtime check and observe hash/SRI, readiness, dynamically loaded scripts, and proxy results tied to the reviewed bundle identity.

Completion requires two consecutive clean matching runs plus the negative mismatch run. Local tests, a healthy Worker, or a database row do not substitute.

## Supporting Checks

- Public-interface tests cover artifact upload, conditional map policy, bundle-map association, immutable hashes, receipts, compatibility, and mismatch rejection.
- Migration tests prove additive compatibility and access-controlled artifact metadata.
- Package build, type, lint, scanner, and integration checks pass in the CRE-1619 worktree.
- Final review finds no secret material, raw source-map content, public storage URLs, or unrelated churn.
- Linear and PR evidence record exact commands, commit, deploy IDs when approved, live surface, rollback, and worktree disposition.

## Iteration Loop

Use RED to GREEN to REFACTOR one public behavior at a time. Update `plan.md` after each phase and keep only one phase in progress.

## Approval Gates

Separate approval is required for a production Worker deploy, remote D1/R2 migration, extension install/publication, external form or Airtable mutation, reviewer/partner communication, or enforcement change from fail-open to gated.

## Blocker Standard

Exhaust safe local work. Mark blocked only after the same required external capability or approval remains unavailable for three consecutive goal turns and no meaningful in-scope progress remains.

## Completion Proof

Every plan phase, CRE-1619 evidence, supporting check, and Primary Verifier must be complete. If promotion approval is absent, stop at that boundary with implementation ready; do not mark complete or share the completion-state copy.

## Plan

See `/Users/micahjohnson/Code/create-something-monorepo/.agent-goals/preflight-submission-artifact-receipts/plan.md`.
