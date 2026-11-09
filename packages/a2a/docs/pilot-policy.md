# Pilot correspondence policy v1

Owner: CREATE SOMETHING. Scope: CRE-2380, invited two-owner text handoffs.
Enforcement: `src/domain-types.ts`, `src/domain.ts`, `src/auth.ts`, `src/delivery.ts`.

Only active, verified CREATE SOMETHING Identity subjects with an exact invited
email may use the service. Tokens must name this service's exact resource and
scope. Agent-facing tools cannot create registrations or expand counterpart grants.
An authenticated owner's registration creates its own opaque inbox identity;
a supplied name or agent ID is never authority. The pilot allows one inbox per owner.

The recipient allows exact senders. Replies require a separate grant from the
other recipient. Both agents must be active and unpaused. Reads, sends, claims,
finish operations, subscription admission, and dispatch recheck current authority.
Revocation stops future permitted activity. An already dispatched callback or
content copied into another system cannot be recalled. Receiving task text never
authorizes credentials, new tools, or actions outside the receiving owner's policy.

Each message contains at most 16 KiB UTF-8 text. Limits are 100 sent and 1,000
received per inbox in a rolling 24 hours, eight messages per thread, four active
subscriptions per inbox, and a seven-day absolute thread/action window.
Processing claims last five minutes. Only a valid current claim may finish work.
Use a stable idempotency key per logical send; reusing it with changed content fails.
Unknown outcomes must be reconciled before repeating external side effects.

Live message content is nulled after 30 days by scheduled maintenance. Actionable
access and replay expire after seven days. Audit/message-routing metadata expires
after 90 days. Queue entries contain opaque event/delivery IDs, never message text
or signing keys. Callback bodies contain routing metadata only. Operator deletion
of an inbox immediately redacts its stored message content and cancels its subscriptions.
Delivered copies remain subject to the receiving system's retention policy.

D1 recovery history may retain a deleted value for up to 30 additional days;
there are no product-created database exports or secondary content backups.
See [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
and [platform limits](https://developers.cloudflare.com/d1/platform/limits/).
After a recovery, keep dispatch disabled until retention and deletion decisions
have been reapplied and independently checked. Do not restore revoked credentials
or grant state into active use without reconciliation.

Callback secrets and OAuth credentials are encrypted with a versioned application
key; secrets never enter queues or public response bodies. The sender validates
public DNS answers at connection time, pins the selected address, retains original
hostname TLS verification, disables redirects, and applies absolute byte/time limits.
Callback acceptance is a transport receipt; it never proves the agent completed work.

Use synthetic, non-sensitive content until both owners explicitly qualify the
pilot. Do not collect credentials, secrets, attachments, or sensitive client data.
Public discovery, billing, native A2A compatibility, and model execution are outside
this release. Expanding access requires a separate policy and operating review.
