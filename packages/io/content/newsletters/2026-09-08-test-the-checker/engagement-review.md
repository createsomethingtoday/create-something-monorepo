# Engagement review — September 7, 2026

## Confirmed current evidence

- Live subscriber admin: 13 total records, 12 active, 1 unsubscribed. Active is not equivalent to consent-qualified audience.
- September 1: both exact audience message IDs from the production receipt now have Resend `last_event: delivered`. Two of two messages reached the receiving mail servers. This is not inbox placement, reading, or a meaningful basis for content optimization.
- September 3: provider history contains only `[TEST] The new bottleneck is proof`, delivered. No audience message with that subject appeared in 300 paginated records covering August 30 through September 7. Linear CRE-1922 remains In Progress.
- Resend domain: `createsomething.io` verified; `open_tracking: false`, `click_tracking: false`. These settings remain unchanged. Open rate and email click rate are unavailable, not zero.
- Production D1: `newsletter_campaigns` exists but contains zero rows. It records dispatch counts, not engagement. The existing newsletter webhook retains re-engagement delivery receipts and deliberately ignores open/click events.
- Existing archive analytics: 59 events on URLs containing `/newsletters` in the last 30 days at audit time. These are mixed event types and may include operator activity. They cannot be attributed to newsletter recipients or treated as 59 readers. A grouped read found 14 external-classified page views across 11 sessions, 3 content-link clicks across 3 sessions, and one automated page-view session. External classification can include unmarked operator visits; do not call these confirmed readers.

## Editorial implications

There is no reliable evidence to rank topics, subject lines, send times, or conversion rates. Keep a single useful lesson and one primary CTA. The September 8 campaign link establishes prospective measurement; it cannot repair earlier missing attribution.

The new admin report reads provider message IDs and first-party events live, keeps provider failures unavailable, and splits operator/automated/preview traffic. It reports visits and resource-use sessions, not recipient click rates. Replies need an editorial review of actual responses; campaign unsubscribe attribution is not available. Do not divide total list unsubscribes by the two-message audience.

## Delivery boundary

September 8 remains a draft. The local HTML is visibly review-only and contains no functional unsubscribe placeholder. A sending workflow must render each approved subscriber's actual unsubscribe URL, send the operator test when authorized, and bind approval to content, current audience, and time. This preparation does not schedule or send email.
