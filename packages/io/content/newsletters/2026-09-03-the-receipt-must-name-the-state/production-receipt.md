# Production preparation receipt

## Candidate

- Issue: `CRE-1920`
- Delivery target: Thursday, September 3, 2026 at 9:00 AM America/Chicago (`2026-09-03T14:00:00Z`)
- Subject: `The new bottleneck is proof`
- Preview: `Webflow Source gives agents the code. Fable 5.1 gives them more endurance. Neither tells you when the work is accepted.`
- Sender: `CREATE SOMETHING <hello@createsomething.io>`
- Reply-to: `micah@createsomething.io`
- Primary CTA: `https://createsomething.io/papers/proof-surface`
- Editorial state: production candidate
- Audience state: unverified
- Approval state: pending explicit operator approval
- Provider state: not scheduled
- Public archive state: draft
- Recommended public release: one day after verified delivery; do not infer the timestamp from the target alone

## Candidate hashes

- Markdown email: `sha256:380c3ec2db29d46f738b46973f04c9d4024b86ec413afa16583fe79067326923`
- Plain text before subscriber-specific unsubscribe substitution: `sha256:b70b7a86fc95c6ae58d21b529e5757e793831e9fceb614a4d65fc858ec35fb23`
- Performance/Meridian template: `sha256:0ef7b9301df682047862521b95f87e63e96d96f7a165140f6c6b09d95cf8a271`
- Rendered HTML before subscriber-specific unsubscribe substitution: `sha256:e9a6508c54de57c638d672400e6ca4915d9783ba95ed60da899f2faf2e64140f`

The HTML and plain-text hashes prove this repository candidate only. They are not final per-recipient content hashes because `{{unsubscribe_url}}` remains a required provider merge field in both parts.

## Resend operator test

- Issue: `CRE-1921`
- Recipient: `micah@createsomething.io`
- Gmail profile readback: `micah@createsomething.io` (`Micah Johnson`)
- Subject: `[TEST] The new bottleneck is proof`
- Sender: `CREATE SOMETHING <hello@createsomething.io>`
- Reply-to: `micah@createsomething.io`
- Resend domain readback: `createsomething.io`, `verified`, `us-east-1`
- Idempotency key: `cre-1921-operator-test-f97bd20-b70b7a86-v1`
- Resend email ID: `01a0634d-34b5-72c1-9a32-7c4e2767daba`
- Provider accepted at: `2026-09-02T18:06:39.463Z`
- Provider readback state: `delivered`
- Personalized HTML SHA-256: `f0deb6f5971059104a872b83388e71f051d908e5761a0bd7e6a89daa567c36d7`
- Personalized plain-text SHA-256: `0205aa851555c105521433f5acb5701c0ae2bbf33d4d2a1c773a2f1393f3b42f`
- Unsubscribe mode: non-mutating operator-seed preview at `https://createsomething.io/unsubscribe?preview=operator-seed`
- Gmail message ID: `1a0634d3bc142dd4`
- Gmail thread ID: `1a0634d3bc142dd4`
- Gmail received at: `2026-09-02T18:06:39Z`
- Gmail labels: `INBOX`, `UNREAD`, `IMPORTANT`, `CATEGORY_UPDATES`
- Gmail MIME readback: `multipart/alternative` with `text/plain` and `text/html`; both parts contained the title and exact operator-seed unsubscribe URL.

This receipt proves that Resend reported delivery and the exact named Gmail account received both MIME alternatives with working test-only unsubscribe controls. It does not approve an audience, schedule a cohort send, publish the archive, or prove that the operator read and accepted the content.

## Content contract

- One operating thesis: execution capacity is rising faster than proof capacity; every receipt names the state it proves and the next state it does not prove.
- One primary CTA.
- Includes a six-field receipt pattern, practical state chain, and explicit proof limits.
- Grounded in Exa research, CTX evidence, and current repository, deployment, public-route, and provider readbacks.
- Plain-text source: `email.txt`.
- Markdown email source: `email.md`.
- Email-safe Performance and Meridian shell: `email-template.html`.
- Exact pre-personalization render: `email-rendered.html`.

## Required gates before scheduling

- [x] Complete the target-reader review; verdict recorded in `reader-review.md`.
- [ ] Complete the final human read.
- [x] Render exact pre-personalization HTML from `email.md` through `email-template.html`.
- [x] Record SHA-256 hashes for the repository candidate and plain text.
- [x] Verify desktop and 390px mobile rendering with Chromium; both report viewport width equal to document width.
- [x] Verify image-blocked behavior: the candidate contains no `<img>` elements and has no image dependency.
- [ ] Generate a current governed audience count and fingerprint.
- [x] Send the exact candidate to the operator inbox and verify provider plus inbox readback.
- [ ] Receive explicit operator approval for the exact content, audience, and target time.
- [ ] Schedule idempotently and read back subject, recipient, scheduled time, and provider state.
- [ ] Preserve cancellation IDs and the operator cancellation deadline.

## Current completion boundary

This receipt proves that the editorial candidate, source evidence, render, target-reader review, and layout checks exist. It also proves that the operator-specific HTML and plain-text test reached Micah's named Gmail inbox. It does not prove audience eligibility, final human approval, production-recipient personalization, scheduling, audience delivery or inbox placement, operator acceptance, or public release.
