# SEO/AEO impact and measurement follow-up

Agency activity increased during October 25–31. A small search-referral signal is visible. The available evidence does not establish that SEO or AI answers caused most of the growth, or that it produced more completed bookings.

Linear: [CRE-2336](https://linear.app/createsomething/issue/CRE-2336).

## Use the fixed-date API baseline

The [November 3 Cloudflare email](https://mail.google.com/mail/u/?authuser=micah%40createsomething.io#all/1a1a1fca58a3a29e) agrees with a fresh API query of both weeks. The [October 27 email](https://mail.google.com/mail/u/?authuser=micah%40createsomething.io#all/1a17d4fe91831b75)'s per-property numbers differ. Preserve both emails as historical snapshots; use the same API query shape for comparisons. The cause of the earlier snapshot difference is unknown.

Both API windows use UTC, an inclusive start and an exclusive end: October 18–25 and October 25–November 1. The query uses `rumPageloadEventsAdaptiveGroups`, `bot:0`, and the same `siteTag`, `requestHost`, and `refererHost` dimensions. Values are sampled estimates; visits are not verified unique people.

| Property | Oct 18–24 visits | Oct 25–31 visits | Previous page views | Latest page views |
| --- | ---: | ---: | ---: | ---: |
| agency | 330 | 560 | 450 | 580 |
| io | 270 | 210 | 290 | 210 |
| ltd | 170 | 250 | 180 | 260 |
| space | 100 | 50 | 100 | 70 |
| Total | 870 | 1,070 | 1,020 | 1,120 |

These are property rollups including subdomains. They must not be presented as acquisition traffic to the public websites alone.

| Agency scope/source | Previous visits | Latest visits |
| --- | ---: | ---: |
| Public apex and www, all sources | 240 | 420 |
| Operational/client subdomains | 90 | 140 |
| Public apex and www, no referrer | 230 | 380 |
| Public apex and www, own-property referral | 10 | 20 |
| Public apex and www, Google referral | None observed | 20 |

The source rows subdivide public visits; do not add them again to the public total. Latest subdomain visits include Draw 80, scheduling 50, and Outerfields 10. No identifiable AI referral hosts appeared in either query. Missing referrers can include privacy filtering, stripped referrals, internal checks, automation, and direct readers. They do not establish direct human acquisition. Google referrals do not distinguish conventional results from Google's AI features.

## Keep booking clicks separate from completed bookings

A production D1 query of the exact public agency hosts, using the existing `external` traffic classification, returned:

| Observed first-party metric | Previous | Latest |
| --- | ---: | ---: |
| Distinct recorded sessions | 32 | 43 |
| Page views | 77 | 201 |
| Booking CTA events | 1 | 7 |
| Sessions with a booking CTA event | 1 | 3 |
| Booking completion events | 0 | 0 |
| Sessions with a booking completion event | 0 | 0 |

`external` is the classifier's fallback, not proof that a person visited. D1 and Cloudflare have different collection and counting rules; their counts are not interchangeable. Do not calculate a cross-system conversion rate.

No observed completion events is not proof of zero actual bookings. The scheduler stores authoritative bookings in a host-scoped SQLite Durable Object. Its existing API supports a known booking lookup, without a read-only aggregate reporting interface. No private booking records or new administrative endpoints were exposed for this review. Completed bookings and revenue remain unreconciled with that source.

## Repeat the report without changing tracking

Run from the repository root after `pnpm bootstrap:worktree`. The first command prints SQL only; it does not query or change production:

```bash
pnpm --filter @create-something/agency analytics:search-impact --start 2026-10-25 --end 2026-11-01
```

With the authorized Cloudflare read credential loaded through Infisical, append `--remote` to execute the read-only D1 query. Use `--start 2026-10-18 --end 2026-10-25` for the comparison. Dates are required and limited to 1–365 days.

To print the corresponding Cloudflare GraphQL query for the connected Cloudflare API tool:

```bash
pnpm --filter @create-something/agency analytics:search-impact --start 2026-10-25 --end 2026-11-01 --cloudflare-query --account-id 9645bd52e640b8a4f40a3a55ff1dd75a
```

The D1 report groups by property, exact host, public/private/subdomain scope, traffic class, first observed landing source, and landing path. It strips query strings and fragments and suppresses private-route paths. First observed means the first page view within the requested window and host/scope, not an inferred lifetime acquisition source. No new cookie, storage, consent rule, or tracking event was added. Session counts are scoped to each host and public/private scope; do not sum across hosts or scopes to claim unique sessions or people. Public-site scope includes public legal or noindex pages; use landing paths and the sitemap to identify acquisition pages.

Traffic classification is conservative across each property/session. Test, internal, preview, and detected automation labels take precedence over external. Missing classifications remain `unclassified`. Search and AI referral hosts use explicit allowlists; unrecognized hosts remain other referrals. A known referrer does not prove an unpaid click, and an absent AI referrer does not prove the absence of AI influence. Campaign attribution remains in the existing marketing-attribution report.

The Cloudflare query returns at most 1,000 groups. If it returns exactly 1,000, narrow the host/date scope before publishing totals. Keep dimensions, bot filtering, timezone, and windows the same across comparisons. See [Cloudflare sampling](https://developers.cloudflare.com/analytics/graphql-api/sampling/).

## Finish the Search Console comparison when access is available

The connected tools do not expose Search Console. The available browser session redirects to Google's sign-in page. No existing query integration or matching credential names were found in the root production secret scope. Google rankings, impressions, click-through rates, and query changes were not verified.

The property owner can unblock the comparison with a Performance export from a verified Search Console account, or by connecting authorized read access. Do not send passwords or tokens in chat. For each public property:

1. Export Web performance for October 18–24 and October 25–31, including totals, queries, and pages. Preserve the export's timezone and final/preliminary status.
2. Separate apex/www pages from operational and client subdomains. Apply the same country, device, and search-type filters to both periods.
3. Compare clicks and impressions by landing page and query. Separate branded queries from service/problem queries before claiming new acquisition.
4. Compare the winning landing pages with the report's observed booking-click and completion sessions. Treat the systems as parallel evidence; Search Console cannot join individual queries to first-party sessions.
5. Reconcile actual bookings through an owner-approved scheduler report before claiming conversion or revenue impact. Do not create fake bookings to fill missing evidence.

AI-answer contribution remains a separate unanswered question. Referral evidence and verified citations can support it; crawlability and valid schema alone cannot. Google's AI features use the existing search foundations: [Google's guidance](https://developers.google.com/search/docs/appearance/ai-features).

## Validate and release the bounded fixes

The change corrects Offer prices, preserves zero-cost starters and custom-quote terms, updates `.ltd` and `.space` WebSite descriptions, and clarifies the MCP/API guide description. Regression checks cover the rendered JSON-LD and reporting behavior. The agency HTML cache revision changes with the release.

Promotion uses a reviewed PR and the repository's production deployment workflows. Agency deploys from main after its release gate; `.ltd` and `.space` use the manual Property Pages Deploy workflow after merge. Retain the previous production deployment IDs for rollback. Do not treat a merged PR, preview, or build as live verification. Check canonical HTML and repeated warm-cache reads after deployment.

Search Console access and authoritative booking reconciliation remain explicit open checkpoints even after the code ships. Record exact deployment receipts, independent review, three quality gates, and worktree disposition in CRE-2336.
