# Creator Notification Email Routing Implementation Note

Date: `2026-03-12`
Status: `Draft`
Related ADR: `docs/CREATOR_NOTIFICATION_EMAIL_ROUTING_ADR_2026-03-10.md`

## Purpose

This note converts the ADR into an implementation contract for Airtable, the review-status automation, and the Zendesk payload.

It resolves the current policy boundary as follows:

- one primary recipient
- zero or more CC recipients
- CC recipients apply to the full Zendesk thread
- multiple CC recipients are supported
- override behavior is exception-only and explicit

## Database

The Airtable Email table remains the canonical source of truth for creator notification routing.

Recommended representation:

- keep `Email` as the email identity field
- keep `🎨Creators` as the creator link
- do not rely on `creator override email` as canonical storage
- do not rely on positional comma parsing to infer primary vs CC
- add a notification-specific role field on the Email table rather than overloading identity fields

Recommended field shape:

- Email table:
  - `Email`
  - `🎨Creators`
  - `🌟Email Type(s)` for identity semantics such as `Primary` and `WF Account`
  - new `🔔Review Notification Role(s)` multi-select with values:
    - `Primary`
    - `CC`

Recommended creator-level rollups/lookups:

- `🔔Review Primary Recipient`
- `🔔Review CC Recipients`
- `#️⃣🔔Review Primary Recipients`
- `#️⃣🔔Review CC Recipients`
- `🚩Review Recipient Errors`

Recommended version-level lookups:

- `🔔Review Primary Recipient (from Creator)`
- `🔔Review CC Recipients (from Creator)`
- `🚩Review Recipient Errors (from Creator)`

Reasoning:

- the automation triggers on Asset Versions, so the resolved values must be available on the version record without hidden parsing
- `🌟Email Type(s)` already mixes identity meaning such as `Primary` and `WF Account`; notification behavior should be represented separately

## Override Policy

Overrides are allowed only for explicit exceptions such as:

- the creator record is temporarily wrong
- the working contact differs from the canonical creator recipient
- incident recovery requires a one-off reroute

Override rules:

- overrides are version-level, because the review-status trigger is version-level and the routing change is ticket-specific
- existing `creator override email` should be treated as `override primary recipient` only
- `creator override email` must not contain primary-plus-CC comma-separated data
- if CC override support is needed, add a separate explicit field such as `creator override CC recipients`
- override precedence should be:
  - `override primary recipient`, else creator primary recipient
  - `override CC recipients`, else creator CC recipients
- if no explicit CC override field exists, keep canonical CC recipients from Airtable and do not encode them into the primary override field

Thread policy:

- the resolved recipient set becomes the ticket-level routing contract for the Zendesk thread
- recipient changes after ticket creation are reroutes, not ordinary recomputation
- reroutes should be explicit and auditable

## Automation

Current location:

- Airtable base: `👛Marketplace Assets` (`appMoIgXMTTTNIc3p`)
- table: `Asset Versions`
- automation: `Review Status Trigger`

Current implementation pattern:

- separate scripts build per-status message bodies and post a webhook to Zapier
- this flow should remain in place for now
- the work here is recipient normalization, not automation refactoring

Statuses that currently send Zendesk messages:

- `Ready for Review`
- `Changes Requested`
- `Rejected`
- `Approved`

Status that does not currently send Zendesk:

- `In Review`

Recipient resolution must happen once before webhook construction:

1. read version-level override fields
2. read version-level creator lookups
3. resolve one primary recipient
4. resolve zero-or-more CC recipients
5. validate and normalize
6. construct the webhook payload

Webhook payload contract:

```json
{
  "creatorEmail": "primary@example.com",
  "zendeskAdditionalRecipients": "cc1@example.com,cc2@example.com"
}
```

Payload rules:

- `creatorEmail` is always a single resolved primary email address
- `zendeskAdditionalRecipients` is a normalized list of CC recipients in the format expected by the Zap/Zendesk action
- if the Zap action expects a comma-separated string, build that string once from the resolved CC list
- if there are no CC recipients, send an empty value or omit the field consistently across all scripts
- no script or Zap step should split `creatorEmail` or `creator override email` on commas

Zendesk thread rules:

- on ticket creation, apply both the resolved primary recipient and the resolved CC recipient list
- on later ticket updates, preserve the existing CC recipient list for that ticket unless an explicit reroute is requested
- update flows must not silently drop CC recipients because a later status transition omitted the field

## Validation

Validation should happen before the webhook is sent.

Blocking conditions:

- no resolved primary recipient
- more than one resolved primary recipient
- malformed email address in primary or CC list
- primary email also appears in the CC list after normalization
- duplicate CC emails after normalization
- recipient errors present on the creator or version record

Normalization rules:

- trim whitespace
- lowercase for comparison
- deduplicate case-insensitively
- preserve a stable output order
- remove the primary recipient from the CC list if it appears there

Failure behavior:

- do not send the Zendesk message
- notify the reviewer in Slack
- surface the recipient validation issue on the record

## Migration

Phase 1:

- document the current automation location and payload contract
- add the notification-role field on the Email table
- add creator and version lookup fields for resolved primary and CC recipients

Phase 2:

- update the Zendesk-sending scripts to pass `creatorEmail` and `zendeskAdditionalRecipients`
- update the Zap step to map the explicit CC field through to Zendesk
- preserve CC recipients across ticket updates

Phase 3:

- deprecate comma-parsed use of `creator override email`
- add a dedicated override CC field only if exception handling still requires it
- remove transitional parsing behavior once the migration is complete

## Test Matrix

Minimum cases:

- one primary, no CC
- one primary, one CC
- one primary, multiple CC recipients
- primary override only
- primary override with canonical CC recipients
- explicit CC override, if that field is added
- malformed CC email
- no primary recipient
- multiple primary recipients
- update to an existing Zendesk ticket with existing CC recipients

## Recovery

If the wrong recipient routing is published:

- identify affected asset versions
- correct the Airtable routing data
- remove incorrect Zendesk IDs where retriggering is required
- retrigger the relevant review-status step
- close or otherwise remediate incorrect Zendesk tickets
- document the cause in the automation/runbook notes
