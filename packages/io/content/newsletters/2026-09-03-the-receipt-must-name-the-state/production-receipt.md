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
- Plain text: `sha256:3c3cccde45255057c864efab17109c4bfb24a3e2d8262c493eb5b62019e8eda3`
- Performance/Meridian template: `sha256:0ef7b9301df682047862521b95f87e63e96d96f7a165140f6c6b09d95cf8a271`
- Rendered HTML before subscriber-specific unsubscribe substitution: `sha256:e9a6508c54de57c638d672400e6ca4915d9783ba95ed60da899f2faf2e64140f`

The rendered HTML hash proves this repository candidate only. It is not the final per-recipient HTML hash because `{{unsubscribe_url}}` remains a required provider merge field.

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
- [ ] Send the exact candidate to the operator inbox and verify provider plus inbox readback.
- [ ] Receive explicit operator approval for the exact content, audience, and target time.
- [ ] Schedule idempotently and read back subject, recipient, scheduled time, and provider state.
- [ ] Preserve cancellation IDs and the operator cancellation deadline.

## Current completion boundary

This receipt proves that the editorial candidate, source evidence, pre-personalization render, target-reader review, and layout checks exist. It does not prove audience eligibility, final human approval, subscriber-specific rendering, scheduling, delivery, inbox placement, or public release.
