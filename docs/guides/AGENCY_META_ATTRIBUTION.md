# Agency Meta attribution

Use campaign tags to measure Facebook and Instagram traffic in Agency's
first-party analytics. Meta delivery uses a separate marketing choice, a
server-only Zaraz relay for public page views, and durable saved-inquiry receipts.

## Tag organic posts and ads

Keep campaign and creative names free of personal information. Values must be
lowercase letters, digits, underscores, or hyphens, start with a letter or digit,
and contain at most 80 characters. Source and medium values are case-insensitive.

For organic Facebook posts, append:

```text
utm_source=facebook&utm_medium=social&utm_campaign=workflow-support&utm_content=post-01
```

For Instagram ads, append:

```text
utm_source=instagram&utm_medium=paid_social&utm_campaign=workflow-support&utm_content=ad-01
```

Use `facebook` or `instagram` when the placement is known. Use `meta` for a
campaign spanning both. Paid Meta campaigns accept `paid_social` or `cpc`;
prefer `paid_social` consistently. Organic posts use `social`. The parser does
not infer paid attribution from a referrer or `fbclid` alone. Check the final
destination URL when using ad-platform substitutions: unresolved placeholders
and names containing spaces fail validation.

Agency captures these tags after analytics consent. The existing session entry
expires after 30 minutes and is cleared when analytics consent is withdrawn.
First-party campaign capture does not store `fbclid`, `_fbc`, or `_fbp`.
The separate Meta integration sends events only with marketing consent.

## Read the first-party report

From the repository root, print the read-only SQL:

```bash
pnpm --filter @create-something/agency analytics:marketing-attribution --days 30
```

Add `--remote` only with authorized access to the Agency D1 database. The
report groups consented sessions by source, medium, campaign, creative, and
traffic class. Keep internal traffic separate when assessing acquisition.

- `landing_sessions`: sessions with a tracked page view.
- `contact_submission_sessions`: sessions with a `contact_submitted` analytics
  event, counted once per group even if the event repeats.
- `booking_cta_sessions`: sessions with a booking-link click.
- `booking_completed_sessions`: sessions with a booking-completed analytics event.

Contact and booking analytics are funnel evidence. They do not establish that an
inquiry was durably saved, a booking is confirmed by the scheduler, or a campaign
caused a conversion. Missing consent, blocked delivery, and session expiry can
reduce coverage. A session can appear in multiple campaign groups if its tags
change; do not add those groups to claim unique visitors.

## Understand the delivery boundary

The Agency web dataset is **CREATE SOMETHING Agency**, ID `1875010363489307`,
owned by Create Something business `944898645691571`. It was created on November
5, 2026 after verifying that the previously identified `1198039375274836` is an
unlinked **App ID**. The existing Pixelflow dataset remains separate.

`GET/POST /api/marketing/consent` manages an independent default-off choice and
an HttpOnly, Secure, SameSite=Strict cookie. The consent record expires after
180 days. Existing analytics consent never enables marketing. DNT, GPC, and the
current user's opt-out suppress delivery. Withdrawal revokes the server record
and purges queued matching data. Events already accepted by Meta cannot be recalled
through this control.

`POST /api/marketing/page-view` checks consent and the exact public-route
allowlist in `meta-policy.ts`. It strips campaign queries and fragments and
rejects unknown or access-bearing query parameters. The server forwards only
the canonical public URL, event ID, IP address and browser user agent to Zaraz.
Zaraz has automatic script injection disabled, purpose `csMetaMarketing`, and a
header-protected HTTP endpoint. No Meta or Zaraz browser script is installed.
The route reports `forwarded`; only Meta's own evidence proves provider processing.

A new consented contact submission commits its Lead delivery record in the same
transaction as the saved inquiry. The payload contains a stable event ID,
canonical contact URL, event time, hashed normalized email, IP address and user
agent. It excludes the name, message, company, campaign strings and private URLs.
An old inquiry replay cannot acquire a newer consent. A verified Meta acceptance
records its trace ID and discards the matching payload. Only acknowledged
throttling retries, at most three attempts with the same event ID. Timeouts,
5xx responses and malformed acknowledgements remain `unknown` for reconciliation.

The hourly `agency-meta-maintenance` Worker checks at most ten active consent
records with due deliveries. It purges matching payloads after the 24-hour
delivery window on its next run, deletes delivery metadata after 90 days, and
deletes expired or revoked consent records 90 days later once references clear.
Withdrawal and accepted delivery purge their payload immediately. Source inquiry
receipts remain under the contact system's retention policy.

Booking clicks and browser completion messages remain first-party funnel
evidence. **No Meta Schedule or Purchase conversion is sent.** The scheduler has
authoritative receipts, but linking those to the visitor's marketing choice
requires a scoped booking proof. A browser message alone does not authorize
attributing a confirmed booking to that visitor.

## Configure and promote

Configure `META_DATASET_ID`, `META_GRAPH_VERSION` (`v26.0` verified),
`META_CAPI_ACCESS_TOKEN`, `META_ZARAZ_ENDPOINT`, and `META_ZARAZ_RELAY_KEY` on
Agency and its maintenance Worker. Tokens and relay credentials belong in
Infisical and encrypted Cloudflare bindings. Keep them out of source, URLs, logs,
and browser code. Production ignores `META_TEST_EVENT_CODE`.

Apply migration `0060_meta_marketing.sql` before enabling the feature. Run the
checks below, inspect responsive consent controls, and confirm synthetic events
in the intended Meta Test Events dataset. Clear Zaraz's test code before live
activation. Promote the reviewed PR, set `META_MARKETING_ENABLED=true`, and verify
the deployed version's consent behavior and a consented PageView. Live inquiry
delivery needs its own source receipt and provider receipt; a test event is not
a real lead. Keep Meta's attributed results separate from first-party counts.

For rollback, disable the Zaraz tool and the maintenance Worker, then roll Agency
back to the prior deployment. Restore the prior Zaraz configuration and verify
that events stop. The additive D1 tables can remain for reconciliation; do not
drop source inquiry receipts or restore an older database over new inquiries.

## Verify locally

```bash
pnpm --filter @create-something/agency test:meta-marketing
pnpm --filter @create-something/agency test:contact
pnpm --filter @create-something/agency-meta-maintenance test
```

These checks exercise campaign parsing, SQLite report aggregation, consent races,
and actual workerd/D1 persistence with simulated provider boundaries. They do not
replace rendered browser review or live provider verification. Release evidence
and worktree disposition belong in Linear `CRE-2359`.

Sources: [Zaraz supported tools](https://developers.cloudflare.com/zaraz/reference/supported-tools/),
[Zaraz consent management](https://developers.cloudflare.com/zaraz/consent-management/),
and [Zaraz HTTP Events API](https://developers.cloudflare.com/zaraz/http-events-api/).
