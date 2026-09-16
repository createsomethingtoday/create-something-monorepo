# Newsletter engagement review

Open `https://createsomething.io/admin/newsletter-analytics` while signed in as an administrator. Refresh before editorial review. The JSON equivalent is `/api/admin/newsletter-analytics`; it uses the same first-party admin role gate and private, no-store responses.

## Read the evidence

- Delivery: fresh Resend readback of exact message IDs from reviewed production receipts. A provider failure is unavailable. Drafts without registered IDs are not proof of a send. Delivery is mail-server acceptance, not inbox placement.
- Visits: browser sessions with `utm_source=newsletter`, `utm_medium=email`, and a reviewed campaign ID. Existing analytics preferences, profile opt-out and DNT apply; this is not a new consent mechanism.
- Resource use: sessions with a content link click or copy after the tagged landing, within 30 minutes. Repeat events count once per session. This measures on-site activity, not a recipient click rate or causal attribution.
- Traffic: read external, internal, test, automated, preview and unknown separately. Mark operator checks with `traffic_class=test`. User-agent detection is imperfect; external is not a guarantee of human traffic.
- List health: active and unsubscribed are current totals, not send eligibility or campaign unsubscribe rates. Opens, email clicks, replies and campaign unsubscribe attribution remain unavailable. Record substantive replies manually in the approved editorial evidence; do not fabricate a rate.

## Prepare the next edition

1. Review the last audience delivery, current engagement, and known gaps. Use raw counts with a tiny audience; do not infer subject-line winners from two deliveries.
2. Add a public, non-personal campaign ID to `packages/io/src/lib/newsletter/measurement.ts`. Link the primary CTA to an existing first-party resource using the tags above. Never place recipient IDs, addresses or unsubscribe tokens in measurement tags.
3. Prepare the source, plain text, and HTML review render. Keep `web_status: draft` until publication is separately approved. Preserve a real subscriber-specific unsubscribe link when rendering a send; preview files are not send payloads.
4. Obtain the exact content/audience/time approval required by the newsletter delivery workflow. Register audience provider IDs in `NEWSLETTER_DELIVERIES` only after the approved send/schedule. Never include operator test IDs in audience delivery counts.
5. Read delivery after send; review engagement at the next editorial checkpoint. Keep unavailable metrics explicit.

## Operations and rollback

Storage reuses production `unified_events`; there is no new table, cookie, tracking pixel or Resend domain-setting change. The page reports a rolling 30-day window. Historical untagged engagement cannot be recovered. The existing first-party analytics ingestion, traffic classifier and retention policy remain the owners of event storage.

Validate with `node --import tsx --test packages/io/test/newsletter-analytics.test.ts`, package checks, and production browser readback. Exercise a tagged resource with `traffic_class=test`; confirm its row appears only under test traffic. Do not simulate external-reader engagement. Verify an unauthenticated API request is rejected.

Rollback through a reviewed revert and Pages redeploy of the prior production artifact. Existing events remain intact. No subscriber mutation or audience send is part of rollback.
