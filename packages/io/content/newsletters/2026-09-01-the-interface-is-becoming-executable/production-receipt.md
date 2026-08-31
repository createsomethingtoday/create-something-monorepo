# Production preparation receipt

## Content candidate

- Issue: `CRE-1898`
- Delivery target: September 1, 2026 at 9:00 AM America/Chicago (`2026-09-01T14:00:00Z`)
- Subject: `The interface is becoming executable`
- Test subject: `[TEST] The interface is becoming executable`
- Sender: `CREATE SOMETHING <hello@createsomething.io>`
- Reply-to: `micah@createsomething.io`
- HTML SHA-256: `97d4ab28240088d8b86b8b0db20687c90dbfa1b354bb4384e3cc849ecb134e3f`
- Plain-text SHA-256: `eaafba2d5fd21d62cf5ad92334542b0d20479f163d7530618617d18c05262049`
- Hero SHA-256: `b9322e00fbd3f426d0c33f7c7edef44a23871fc848f7b47b68a20f2748442af3`
- Inline hero content ID: `executable-interface-hero`

The production render replaces the test-only footer with a subscriber-specific unsubscribe link:

- Production HTML template SHA-256: `d638c9b012fba58c0390b1e8d2d040b03628d5686b4ef48a40d5e6329fa6ce69`
- Production plain-text template SHA-256: `2271e7643f5bc53261da3e961cad66c8fbd56ae7e7b8da3f5f3a2af021676b52`

## Render verification

- Desktop render: passed at 900px with the owned hero enabled.
- Mobile render: passed with Chrome device metrics at 390px; `innerWidth`, document scroll width, body scroll width, and shell width all equal `390`.
- Image-blocked render: passed; informative alt text and the caption remain visible.
- Prose check: passed with zero findings before production preparation.
- Repository whitespace check: `git diff --check` passed before the test send.

## Resend test

- Recipient: `micah@createsomething.io`
- Idempotency key: `cre-1898-production-test-97d4ab282400-v1`
- Resend email ID: `b0b1871a-faf4-4ebe-bd62-ba9fd24097e6`
- Provider accepted at: `2026-08-31T14:01:25.726Z`
- Provider readback state: `queued`
- Gmail message ID: `1a0582004636bdcf`
- Gmail received at: `2026-08-31T14:01:26Z`
- Gmail labels: `INBOX`, `UNREAD`, `IMPORTANT`, `CATEGORY_UPDATES`
- Inline hero readback: `the-interface-is-becoming-executable.png`, PNG, content ID `executable-interface-hero`

This receipt proves the exact test candidate reached the approved Gmail inbox with its inline hero. It does not approve, schedule, or prove a production audience send.

## Production audience receipt

- Live source: authenticated production subscriber administration surface backed by `create-something-db.newsletter_subscribers`.
- Governing selector: `packages/canon/src/lib/newsletter/audience.ts`.
- Generated during the August 31, 2026 production schedule pass.
- Total records: `13`.
- Strict double-opt-in eligible: `1`.
- Unconfirmed: `2`.
- Consent unproved by the strict selector: `9`.
- Audience unreviewed: `0`.
- Suppressed: `1`.
- New records since the August 27 production-preparation checkpoint: `0`.
- New records or confirmations since the August 31 test checkpoint: `0`.
- Named operator-approved legacy exception: `1` active, confirmed, unsuppressed `single_opt_in` record with `legacy_signup_form` evidence.
- Scheduled audience: `2`.
- Audience SHA-256 fingerprint: `58ab620701d2af0cc6e6be2b272f13f2fac408ecf1124ae509f8379b3984d844`.

No subscriber address or unsubscribe token is stored in this receipt. The named approval exists in the operator conversation; the fingerprint locks the exact selected records without publishing their contact details.

## Production schedule receipt

- Human approval: received August 31, 2026.
- Scheduled delivery: September 1, 2026 at 9:00 AM America/Chicago (`2026-09-01T14:00:00Z`).
- Provider: Resend.
- Provider state after readback: `scheduled` for both messages.
- Scheduled message count: `2`.
- Resend ID: `bdb288f4-ba0f-40eb-b0db-303ca0ba9f36`.
  - Provider accepted at: `2026-08-31T14:27:07.879Z`.
  - Idempotency key: `cre-1898-prod-58ab620701d2-24-v1`.
  - Personalized content SHA-256: `69832a244ffb3116c927ed85597d6afe97b295b18591b9d9b6b259458df2fe06`.
- Resend ID: `02ac98bc-4570-4035-9856-a68d7e180175`.
  - Provider accepted at: `2026-08-31T14:27:09.540Z`.
  - Idempotency key: `cre-1898-prod-58ab620701d2-1-v1`.
  - Personalized content SHA-256: `a993899441f08fe3056298fda3cf2626c3d45fe72836a874f7a31a3ef98150e8`.
- Readback checks: subject, recipient, scheduled timestamp, and provider state matched for both messages.
- Partial-failure rollback: not invoked; both schedules and readbacks succeeded.
- Cancellation endpoint: `POST /emails/:email_id/cancel` for each Resend ID, or cancel from the Resend dashboard.
- Operator cancellation deadline: September 1, 2026 at 8:45 AM America/Chicago (`2026-09-01T13:45:00Z`). This is a conservative operating deadline, not a provider-stated minimum.

## Remaining delivery gate

- After the scheduled time, read back provider delivery events and record delivery, bounce, complaint, or cancellation evidence. A scheduled state is not a delivery receipt.
