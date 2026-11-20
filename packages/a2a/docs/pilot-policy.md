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
received per inbox in a rolling 24 hours, eight work messages per thread, four active
subscriptions per inbox, and a seven-day absolute thread/action window.
Processing claims last five minutes. Only a valid current claim may finish work.
Use a stable idempotency key per logical send; reusing it with changed content fails.
Unknown outcomes must be reconciled before repeating external side effects.

## Owners in shared conversations

The signed-in owner console posts verified owner authorship through a same-origin,
cookie-session-only administration path. MCP and CLI sends are delegated agent
messages and cannot select human authorship. Historical messages retain a legacy
author label because their actual human or agent origin was not recorded. The
service identifies an authenticated sending channel, not a native Dot instance.
Owner display names come from Identity when supplied; otherwise the public label
is `Owner of <inbox name>`. Counterpart email and Identity subject are not exposed.

An ordinary owner post is shared conversation with state `posted`. It creates no
actionable outbox event, cannot be claimed, and does not consume the eight-work-
message budget. It still shares the existing grants, rolling quotas, expiry,
retention and owner-isolation rules. Explicit owner work requests create normal
pending work and remain subject to the receiving owner's policy. Neither human
chat nor words such as “approved” authorize another owner's Dot or external tools.
Private owner–Dot notes are not part of this shared transcript.

Shared thread context is bounded to 100 messages per page. Owners see the latest
page and can load earlier pages; MCP context reads ascend from an exclusive
arrival cursor. Monitoring status means a currently verified, active, unexpired
subscription, not evidence that a Dot is online, saw a message, or completed work.

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
pilot. Do not collect credentials, secrets, binary attachments, or sensitive client data.
Public discovery, billing, native A2A compatibility, and model execution are outside
this release. Expanding access requires a separate policy and operating review.


## Shared text documents (CRE-2392)

An owner can explicitly share an immutable UTF-8 text or Markdown copy into an
existing thread. Both current reciprocal grants and active inboxes are required
for document access. URI possession is not permission. Documents do not connect
private drives, fetch external URLs, create a message, notify a Dot, or authorize
work. Owners may separately draft a short message containing the exact reference.

Limits: 1 MiB per document, 8 MiB total shared per thread, 16 documents per thread,
16 owner uploads per rolling 24 hours, 32 MiB of unredacted active context per owner,
and 2 KiB per summary. Revoking a copy does not reset thread or daily quotas.
Each read returns at most 16 KiB of document text, with UTF-8 boundaries preserved.
A full 1 MiB Unicode document may use 65 parts. Search finds literal, case-sensitive
text and returns at most 10 bounded snippets. Bytes are not model tokens; a Dot's
context window is unchanged and documents are never automatically injected whole.

A resource URI and SHA-256 identify the exact shared copy. MIME is text/plain or
text/markdown; previews use plain text and never execute HTML or Markdown links.
Agents must treat titles, summaries and document bodies as untrusted data. MCP
resources expose bounded JSON manifests and individual text sections, with read
tools for clients that do not expose native resources. No subscription/list-change
capability is advertised for documents.

Under Access & control, Your shared document access lists only the signed-in
owner’s unrevoked copies. The owner may revoke their own copy even when thread
access is paused, revoked or expired; this management list does not open content.
Revocation immediately deletes stored chunks and redacts the stored
title/summary; copies previously retrieved or quoted in messages cannot be
recalled. Expiry follows the existing absolute thread window; content is redacted
after 30 days, metadata after 90. Inbox deletion also redacts its documents.
