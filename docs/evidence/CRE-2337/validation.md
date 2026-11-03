# Newsletter workflow validation

Issue: CRE-2337. Checked November 3, 2026. This evidence distinguishes local behavior, historical provider records, and current live access.

## Acceptance and independent review

The independent Sol 6.1 reviewer ran 48 Node behavioral checks and 8 Vitest checks after reproducing and repairing three release blockers: provider complaints becoming retryable; a stale dispatch window during concurrent re-approval; and stale browser approval accepting unseen content/audience. Those checks passed. Parent also added two actual checked-in candidate import checks.

Functional coverage includes exact inspected content/audience/time binding, approval invalidation, strict consent, fresh suppression checks, atomic duplicate prevention, immutable approval details, personalized unsubscribe, known rejection recovery, unknown-outcome receipt attachment, provider readback mismatch, signed delivery-event handling, same-origin/admin API boundaries, and consent-aware edition/channel/campaign attribution through navigation and once-only direct confirmation. Attribution fixtures use the actual IO analytics schema and assert persisted ingestion. Opens/click tracking and causal conversion rates remain unavailable.

## Render and interaction evidence

The operator screenshots show the actual component in a local Vite harness with synthetic data. They do not establish authenticated production behavior. Parent exercised loading, empty, unavailable, uncertain delivery, disabled approval, deliberate checkbox/time approval, sandboxed preview, and replacement of an existing approval. Widths 320, 390, 768 and 1440 had no document overflow; keyboard focus and reduced-motion preference were checked. Email screenshots show the exact checked-in HTML template at 390 and 900 pixels. The email has zero image dependencies and no horizontal overflow at 390. Independent review inspected these outputs and found no visual blocker in the viewed regions. Browser preview does not prove Gmail or another inbox renderer.

## Current external evidence and limits

A fresh Resend read confirmed createsomething.io is verified. The two retained September 1 audience message IDs and September 3 operator-test ID returned HTTP404 on November 3. Their earlier delivery evidence remains historical; fresh delivery is unavailable. No recipient or unsubscribe token is included here.

Production subscriber review found 14 records: 1 strict eligible, 9 consent-unproved, 2 unconfirmed, 1 audience-unreviewed, 1 suppressed. No consent, classification or suppression was changed by this implementation. The pending-review records need operator review; missing consent evidence does not authorize sending a confirmation campaign.

Production admin navigation reached the existing login gate. No authenticated admin session or current operator inbox render was available during local validation. No audience email has been approved or sent. The refreshed candidate remains a web/email draft.

## Release requirements

Apply additive migrations 018 and 019 before deployment; preserve subscriber and historical data. Release through PR review/CI, deploy the exact qualified artifact to create-something-io, verify unauthenticated API rejection and seeded runtime records, then record deployment and readback in Linear. Roll back code using the prior production artifact; retain additive tables and receipts. Rollback does not retract sent email or cancel any provider schedule.

An operator must inspect the revised candidate, send/reconcile the operator test, and approve the exact displayed content hash, audience fingerprint, and delivery time before an audience send. Dispatch is deliberately manual within the approved 15-minute window, with at most 20 recipients per request. Larger batches require a separately reviewed execution path.
