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

## Open production gates

- Human review of the received test message and hero.
- Current aggregate audience receipt from the production consent database using `packages/canon/src/lib/newsletter/audience.ts`.
- Explicit approval of the eligible count and exclusions.
- Final production HTML must include a subscriber-specific unsubscribe URL.
- Idempotent schedule receipt for `2026-09-01T14:00:00Z`, including the cancellation path and deadline.
