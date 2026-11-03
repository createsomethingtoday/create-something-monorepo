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

## PR review follow-up

All three substantive automated findings were reproduced and repaired: provider `suppressed` is a terminal failure and excludes the subscriber; exact `opened`/`clicked` provider receipts normalize to delivery without retaining engagement counts; issuing a new confirmation replaces all unresolved attribution fields while confirmed history remains unchanged. Provider states were checked against the [Resend suppression contract](https://resend.com/changelog/email-suppression-visibility) and [sent-email response examples](https://resend.com/changelog/list-sent-emails-endpoint).

Independent review additionally reproduced a late-event concurrency case. Reconciliation now preserves the current terminal ledger state and error atomically, updates seed state from the live ledger, and derives edition outcomes in one SQL statement. Legacy re-engagement receipts likewise preserve failure against late delivery events. The signed-webhook test exercises authentication rejection, suppression, and late delivery; suppressed addresses cannot re-subscribe through the public API.

Final bounded independent re-test passed 41 Node checks and 11 Vitest checks, including the original concurrent suppression reproducer. No UI or schema change was needed for this follow-up. Existing visual evidence applies. No audience send or new consent mutation occurred during these tests.

The next automated review found overlapping signup responses could overwrite the current confirmation receipt and campaign. An actual SQLite signup regression with deferred provider responses failed before repair. Both the receipt update and attribution write now require the request's confirmation token to match the current subscriber token. Independent re-test passed 30 Node workflow checks and 11 Vitest checks: the older response cannot overwrite the newer receipt/campaign, the older link remains invalid, and the valid newer link confirms the expected campaign. Attribution does not store the token. No UI, schema, or live subscriber mutation was required.

## Recovery and checkout follow-up

A further review reproduced two recovery gaps: a transient attribution write after successful confirmation could never retry; and a smaller newly approved audience could never finish because old excluded receipts were counted. Matching confirmed links now retry pending attribution without welcome/lead duplication. Approval freezes private member keys/hashes in the new `audience_snapshot` field, included in approval audit details; completion joins only that snapshot while all delivery history remains intact.

Independent bounded re-test passed 31 Node newsletter checks, 13 Vitest checks, and 21 wiki/CI contract checks. The actual confirmation route and the smaller-audience partial-send case were each demonstrated failing before repair. Existing privacy, suppression, duplicate and uncertain-outcome gates remain exercised.

Migration 020 was applied to production after independent review and before code deployment. Independent readback showed all three historical/draft editions retain empty membership and no approval; 14 subscribers (13 active, 1 unsubscribed) and two retained historical receipts remain unchanged. No historical approval membership was inferred.

Two hosted Agent Wiki attempts hit the five-minute job cap during repository checkout, before validation. The tracked tree measured 1.05 GiB. Recovery raises the bounded checkout limit to ten minutes within a fifteen-minute job, preserving all commands, assertions and immutable action pins. Local wiki/ontology/pin checks passed; hosted recovery requires the next CI run.

## Prepared-subject and adapter checkout follow-up

Review reproduced a prepared edition's valid provider receipt being rejected against the registry's older default subject. Runtime edition metadata now replaces that default during receipt merging. The regression failed before repair and passes through actual merged entry/provider readback afterward; all 13 analytics checks pass.

The current Draw adapter job also exceeded its five-minute cap during checkout, before either validation command. Its checkout is now bounded to ten minutes within a fifteen-minute job, retaining both validation commands and immutable action references. The configuration regression failed before repair; eight CI contract checks, nine Python adapter tests and 55 native-release contract tests pass locally. Composition was green on the inspected current run and is unchanged. Hosted adapter recovery remains pending the next CI run. No UI, schema, consent or sending change is part of this follow-up.

## Existing signup-client compatibility

Review identified two older first-party forms that omitted the explicit analytics preference after the server began requiring it. All three first-party clients now use one shared `newsletterSignupContext()` helper: Canon footer, Canon newsletter signup, and IO subscribe page. It reuses an enabled existing client/session, respects disabled tracking and GPC, and supplies an explicit disabled flag without analytics context when permission is unavailable. The server does not infer permission from an omitted flag.

Five helper contract tests pass. A local browser harness mounted the actual three components and captured their HTTP request bodies without delivery: enabled, disabled preference, DNT, and GPC were exercised on each form, twelve cases total. Enabled context included the session and landing; disabled modes omitted session/landing/referrer. Existing form layout/copy was not changed by this compatibility fix. Full IO check reports zero errors/warnings and production build/lint pass. No live email, schema, subscriber or analytics writes occurred.

## Fresh re-subscription classification

The next review reproduced a legacy/pending-review address remaining ineligible after a new self-requested signup and direct confirmation. Fresh signup now uses the same audience classification as a new address, while clearing prior confirmation evidence and requiring the newly issued link. This does not promote existing legacy records in bulk.

Actual SQLite regressions failed before repair and pass afterward for both classifications, rejection of the old link, eligibility only after the new confirmation, and terminal suppression arriving during the update. A guarded update returns a retryable conflict without provider delivery if subscriber confirmation, opt-out or suppression state changed after inspection.

Validation passed: 33 Node newsletter checks, 18 Vitest workflow checks, eight shared email contracts, full IO check with zero errors/warnings, and the production build. No UI or schema changes, production subscriber mutation, or live email send were required. Existing visual evidence applies; hosted CI/review and live release remain pending.

## Provider readback rate limits

Review reproduced analytics losing campaign evidence on a 429 once the governed ledger exceeds ten receipts. The actual 20-receipt readback now spaces requests by at least 125 ms and retries a rate-limited receipt at most twice. Numeric or HTTP-date Retry-After is honored up to five seconds; longer or malformed instructions stop with unavailable evidence rather than retrying early. Missing Retry-After uses a one-second pause. Exact ID/subject validation and null delivery on failure remain intact. The provider request includes an explicit User-Agent. See [Resend API rate limits](https://resend.com/docs/api-reference/introduction#rate-limit).

Both new regressions failed before repair. All 16 analytics checks now pass, including 20 verified receipts after a simulated shared-quota 429, bounded persistent throttling and no early retry for a longer requested pause. Full IO check passed with zero errors/warnings; production build and lint passed. These are offline provider fixtures; no live rate-limit exhaustion was attempted. No UI, schema, consent or send changes were required.
