# Newsletter engagement review

Open `https://createsomething.io/admin/newsletter-analytics` while signed in as an administrator. Refresh before editorial review. The JSON equivalent is `/api/admin/newsletter-analytics`; it uses the same first-party admin role gate and private, no-store responses.

Prepare and operate editions at `/admin/newsletter`, following [the newsletter workflow](./NEWSLETTER_WORKFLOW.md). That workspace separates source preparation, editorial review, operator test, exact approval, dispatch, and reconciliation.

## Read the evidence

- Delivery: fresh Resend readback of exact message IDs from reviewed production receipts. A provider failure is unavailable. Drafts without registered IDs are not proof of a send. Delivery is mail-server acceptance, not inbox placement.
- Visits: browser sessions with `utm_source=newsletter`, `utm_medium=email`, and a reviewed campaign ID. Existing analytics preferences, profile opt-out and DNT apply; this is not a new consent mechanism.
- Resource use: sessions with a content link click or copy after the tagged landing, within 30 minutes. Repeat events count once per session. This measures on-site activity, not a recipient click rate or causal attribution.
- Attribution: the edition/channel/campaign table combines tagged visits with consent-enabled signup snapshots and their once-only direct confirmations. An untagged signup can reuse the latest reviewed landing in the existing analytics session within 30 minutes. Request and confirmation counts each use their own event date in the rolling window; do not divide them into a cohort conversion rate. DNT, GPC and profile opt-out gates apply. No historical signup attribution is inferred.
- Traffic: read external, internal, test, automated, preview and unknown separately. Mark operator checks with `traffic_class=test`. User-agent detection is imperfect; external is not a guarantee of human traffic.
- List health: active and unsubscribed are current totals, not send eligibility or campaign unsubscribe rates. Opens, email clicks, replies and campaign unsubscribe attribution remain unavailable. Record substantive replies manually in the approved editorial evidence; do not fabricate a rate.

## Prepare the next edition

1. Review the last audience delivery, current engagement, and known gaps. Use raw counts with a tiny audience; do not infer subject-line winners from two deliveries.
2. Add a public, non-personal campaign ID to the registry in `packages/canon/src/lib/newsletter/attribution.ts`, re-exported by `packages/io/src/lib/newsletter/measurement.ts`. Link the primary CTA to an existing first-party resource using the tags above. Never place recipient IDs, addresses or unsubscribe tokens in measurement tags.
3. Prepare the source, plain text, and HTML review render. Keep `web_status: draft` until publication is separately approved. Preserve a real subscriber-specific unsubscribe link when rendering a send; preview files are not send payloads.
4. Obtain exact content/audience/time approval in the newsletter workspace. It binds the inspected content hash and audience fingerprint, rechecks consent at dispatch, and records audience provider IDs separately from operator tests. `NEWSLETTER_DELIVERIES` retains historical receipts; new delivery records come from the edition ledger. Never include operator test IDs in audience counts.
5. Read delivery after send; review engagement at the next editorial checkpoint. Keep unavailable metrics explicit.

## Operations and rollback

Visit storage reuses production `unified_events`. Additive migration `018_newsletter_editions.sql` owns edition, approval-event and delivery records; `020_newsletter_approved_audience.sql` freezes private membership proof for each current approval so historical receipts cannot distort a newly approved audience. Migration `019_newsletter_signup_attribution.sql` owns permitted public signup attribution linked privately to the subscriber and confirmation receipt; it contains no raw landing URL, browser user-agent, or email address. This linkage is private operational data, not an anonymous dataset, and is removed with subscriber deletion. There is no new tracking cookie, pixel or Resend domain-setting change. The page reports a rolling 30-day window. Historical untagged engagement cannot be recovered. Existing first-party ingestion, classification and retention remain the owners of website event storage.

Validate with `node --import tsx --test packages/io/test/newsletter-analytics.test.ts`, package checks, and production browser readback. Exercise a tagged resource with `traffic_class=test`; confirm its row appears only under test traffic. Do not simulate external-reader engagement. Verify an unauthenticated API request is rejected.

Rollback through a reviewed revert and Pages redeploy of the prior production artifact. Existing events remain intact. No subscriber mutation or audience send is part of rollback.
