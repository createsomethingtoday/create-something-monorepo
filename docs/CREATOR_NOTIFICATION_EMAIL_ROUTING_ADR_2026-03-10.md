## ADR: Creator Notification Email Routing

Date: `2026-03-10`
Status: `Proposed`

## Context

The triggering issue was narrow:

- a request came in to support an additional recipient on review emails by extending the existing `creator override email` behavior to allow a CC recipient
- during implementation, a test version was accidentally published from the wrong tab
- outgoing review emails were then routed to the wrong person
- cleanup required locating affected assets, removing Zendesk IDs, retriggering `ready to review`, updating the Zap, and closing incorrect Zendesk tickets

The immediate need is not a broad notification-system rewrite. The immediate need is a safe, documented recipient model for review emails so this class of change can be implemented and updated without guessing.

## Airtable Findings

Using the Hub Airtable MCP tools against base `👛Marketplace Assets` (`appMoIgXMTTTNIc3p`), the current data model is already more normalized than the meeting discussion alone suggested.

Observed structure:

- creator records link to a dedicated email table via `📧Emails`
- the creator table already computes recipient integrity conditions such as `Multiple Primary Emails`, `No Emails`, and other email-related errors in `🚩Errs?`
- the linked email table stores one record per email identity, with fields including:
  - `Email`
  - `🌟Email Type(s)` with values seen including `Primary` and `WF Account`
  - `🎨Creators`
- creator records also roll up email-derived counts such as `#️⃣📧Primary Emails`

This means the repo does not need to invent a net-new normalized recipient structure. A normalized structure already exists in Airtable.

## Decision

The Airtable Email table will be treated as the canonical source of truth for creator notification email identity.

Specifically:

- primary creator email should come from the linked Email table, not from a comma-separated string packed into `creator override email`
- `creator override email` should remain an explicit override or escape hatch, not the canonical storage model for multi-recipient routing
- CC behavior should be modeled as explicit recipient data, not as informal parsing logic hidden inside a Zap or script
- CC routing should apply to the full Zendesk thread, not only to the first outbound email
- the recipient model should support multiple CC recipients when explicitly represented and validated
- the review-status notification automation should consume already-separated recipient fields when building the Zendesk payload

## Rationale

This decision fits the current database shape better than the original workaround.

- Airtable already models email identities as separate records
- Airtable already distinguishes at least some email roles through `🌟Email Type(s)`
- Airtable already tracks integrity issues like multiple primary emails
- pushing multi-recipient logic into a comma-separated override field would duplicate data modeling in the automation layer and make correctness harder to reason about

In repo terms, this follows the stated debugging order:

1. Database: use the existing normalized email records
2. Automation: map those records cleanly into the review notification flow
3. Judgment: document when overrides are allowed and how they should be applied

## Implementation Direction

Short term:

- keep the current review-status automation in place
- document where the relevant Airtable automation and Zendesk payload mapping live
- define the current recipient contract explicitly:
  - one primary recipient
  - zero or more CC recipients
  - override behavior only when needed
- stop treating `creator override email` as the default place to encode both the primary and CC recipients
- stop treating a comma-separated override string as an acceptable way to infer primary-vs-CC routing inside the script or Zap

Near term:

- add or confirm an explicit way to identify notification roles using the existing Email table
- map the primary notification recipient from the Email table
- map the CC recipients from explicit data, not from positional comma parsing
- apply CC recipients at ticket creation and preserve them for the full Zendesk thread
- validate recipient addresses before Zendesk send

If temporary compatibility is needed, the system may continue to accept the current override behavior for migration purposes, but that behavior should be documented as transitional.

## Operational Rules

- Any change to notification routing must identify the database source of truth before changing automation logic.
- Recipient parsing should happen once, before payload construction.
- Zendesk payload construction should use explicit primary-recipient and CC-recipient values.
- CC routing applies to the full Zendesk thread.
- Multiple CC recipients are allowed when they are explicitly modeled and validated before send.
- `creator override email` may not be used as an implicit comma-separated primary-plus-CC transport.
- Changes must be tested in the correct Airtable automation/version context before publish.
- Recovery steps for a bad publish should be documented alongside the automation.

## Consequences

Positive:

- aligns the notification model with the existing Airtable schema
- reduces hidden parsing logic in automations
- makes email integrity checks part of the data model instead of an afterthought
- gives documentation a stable boundary: database fields first, automation mapping second

Tradeoffs:

- the change requires a small schema clarification around how notification roles are represented in the existing Email table or related records
- the current override-based workaround may need a short migration period

## Addendum

Date: `2026-03-12`

The follow-up implementation discussion resolved two previously open policy questions:

- CC routing applies to the full Zendesk thread.
- Zendesk supports multiple CC recipients, so the notification contract should support an explicit CC list rather than a single optional CC.
- the live Airtable implementation now uses the existing `🌟Email Type(s)` field with an added `CC Recipient` option.

This addendum does not change the core decision. It narrows the implementation direction:

- the canonical recipient model remains the Airtable Email table
- the automation should resolve one primary recipient and zero-or-more CC recipients before constructing the Zendesk payload
- overrides remain exception-only and should use explicit fields, not positional comma parsing

## Open Questions

- what should the operational reroute path be when recipients need to change after a Zendesk ticket already exists?
- what exact validation should block Zendesk sends when recipient data is malformed?

## Next Step

Write and maintain a follow-on implementation note that answers:

1. where primary and CC data live in Airtable
2. how override behavior is permitted and documented
3. how the review-status automation maps database fields into the Zendesk payload
4. how full-thread CC preservation works for existing Zendesk tickets

Current note: `docs/CREATOR_NOTIFICATION_EMAIL_ROUTING_IMPLEMENTATION_NOTE_2026-03-12.md`
