# Refreshed candidate receipt — November 3, 2026

This is a revised candidate for operator review. It has not been tested by email, approved for an audience, scheduled, sent, or published.

## Source and ownership

- Coordination: `CRE-2337`; original editorial preparation: `CRE-1952`.
- Editorial owner: Micah Johnson.
- Author attribution: CREATE SOMETHING.
- Stable edition/campaign ID: `2026-09-08-test-the-checker`.
- Original September 8 delivery target: historical review target only. A new target must be chosen during approval.
- Web status: draft. Keeping the stable slug preserves the existing campaign allowlist; it does not make the September date a current promise.
- Evidence: [Ground seeded trial](../../../../../docs/guides/GROUND_SEEDED_TRIAL.md), historical [`ground-v0.4.1` trial source](https://github.com/createsomethingtoday/create-something-monorepo/blob/ground-v0.4.1/docs/guides/GROUND_SEEDED_TRIAL.md), and the retained September research notes.

## What changed

The introduction now identifies the trial as September work. The 0.4.1 repair is a historical example instead of a current release announcement. Repository `packages/ground/Cargo.toml` declares 0.5.4 at this review; this candidate makes no new claim about that release's coverage or performance. The eleven-case, seven-pass/four-fail result remains explicitly about 0.4.0.

The reader's next action remains testing one checker with one known fault and restoring the valid case. The fixture was authored during implementation, so the copy retains the limit that it is not an independent blind evaluation.

## Candidate files and hashes

`email-template.html` and `email.txt` contain the literal `{{unsubscribe_url}}` merge field. The approved send workflow must replace it with each selected subscriber's real unsubscribe URL before sending. The placeholder itself must never reach Resend. `email-review.html` remains visibly review-only and is not a sending source.

- `email.md`: `sha256:0a101c955837c17e2acf49c61149996c01044784e2a7ffac2cfcdbd238561d86`.
- `email.txt`: `sha256:5055e01ea927b6b51016b50eeab91c6f12e6dab6706a6eeb95d64272ef009385`.
- `email-template.html`: `sha256:5583d94c0a451e34474e866d5202473cca4c0b48402f5bafbc056aa93d9a666d`.
- `email-review.html`: `sha256:66ec4f1d65a846993ae34e712a0f7c85eefb2612d784e1aa79af5713ccb6bf4f`.
- `newsletter.md`: `sha256:e698a3c7baabee8e542ceccbb11858397c10c9516854a4e6b3a745532ce76898`.

These are repository template hashes, not final personalized-message hashes. This revision requires a new operator test and a new approval. No earlier review or approval transfers to the changed content.

## Remaining gates

1. Inspect the exact HTML template at desktop and mobile widths, including image-blocked rendering.
2. Send the revised content to the authenticated operator only when that test is authorized; retain its provider ID and receiving-inbox evidence.
3. Complete the final human read.
4. Generate the current strict consent-qualified audience and fingerprint. Review exclusions without converting them to consent.
5. Bind explicit approval to the exact content hash, audience fingerprint, and new send time.
6. Deliver once through the governed workflow and reconcile each provider message ID. Keep any uncertain outcome blocked pending reconciliation.
7. Publish the web edition only through its separate approval and verify the public URL.
8. Review tagged visits, confirmed signups, and substantive replies at the next editorial checkpoint. Unavailable metrics remain unavailable.

No subscriber record or production delivery state was changed by this editorial refresh.
