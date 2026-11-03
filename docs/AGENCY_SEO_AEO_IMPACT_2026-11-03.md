# SEO/AEO impact and measurement follow-up

Agency activity increased during October 25–31, but Search Console recorded zero conventional Google Search clicks in both weeks. Google's generative-AI report showed 2 agency impressions, down from 4. The available evidence does not establish that SEO or AI answers caused the agency traffic increase or produced more completed bookings.

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

The source rows subdivide public visits; do not add them again to the public total. Latest subdomain visits include Draw 80, scheduling 50, and Outerfields 10. No identifiable AI referral hosts appeared in either query. Missing referrers can include privacy filtering, stripped referrals, internal checks, automation, and direct readers. They do not establish direct human acquisition. Cloudflare's Google-host referral estimate does not distinguish conventional results from Google's AI features and is not corroborated by the zero agency clicks in Search Console.

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

The D1 report groups by property, exact host, public/private/subdomain scope, traffic class, first observed landing source, and landing path. It strips query strings and fragments and suppresses private-route paths, including Map bearer links and workspaces. Percent-encoded paths are conservatively grouped as `redacted_path`; SQLite does not decode application routing segments. First observed means the first page view within the requested window and host/scope, not an inferred lifetime acquisition source. No new cookie, storage, consent rule, or tracking event was added. Session counts are scoped to each host and public/private scope; do not sum across hosts or scopes to claim unique sessions or people. Public-site scope includes public legal or noindex pages; use landing paths and the sitemap to identify acquisition pages.

Traffic classification is conservative across each property/session. Test, internal, preview, and detected automation labels take precedence over external. Missing classifications remain `unclassified`. Search and AI referral hosts use explicit allowlists; unrecognized hosts remain other referrals. A known referrer does not prove an unpaid click, and an absent AI referrer does not prove the absence of AI influence. Campaign attribution remains in the existing marketing-attribution report.

The Cloudflare query returns at most 1,000 groups. If it returns exactly 1,000, narrow the host/date scope before publishing totals. Keep dimensions, bot filtering, timezone, and windows the same across comparisons. See [Cloudflare sampling](https://developers.cloudflare.com/analytics/graphql-api/sampling/).

## Search Console does not corroborate the agency acquisition increase

The operator completed Google sign-in on November 3. The signed-in Search Console UI and a native agency CSV export now establish the following comparison. These are Search Console calendar dates, not an asserted UTC match to Cloudflare. Both periods use Web search, all countries and devices. The UI last-update label was four hours ago.

| Search Console metric | Oct 18–24 | Oct 25–31 |
| --- | ---: | ---: |
| Agency domain Web clicks | 0 | 0 |
| Agency domain Web impressions | 56 | 49 |
| Agency domain average position | 11.2 | 18.1 |
| Agency apex/www page-filter Web clicks | 0 | 0 |
| Agency apex/www page-filter impressions | 110 | 45 |
| Agency apex/www page-filter average position | 7.4 | 11.0 |
| Agency domain generative-AI impressions (Beta) | 4 | 2 |
| IO domain Web clicks | 0 | 2 |
| IO domain Web impressions | 8 | 26 |
| IO domain average position | 5.5 | 40.5 |
| IO domain generative-AI impressions (Beta) | 1 | 5 |

Sources: [agency Web comparison](https://search.google.com/u/1/search-console/performance/search-analytics?resource_id=sc-domain%3Acreatesomething.agency&start_date=20261025&end_date=20261031&compare_start_date=20261018&compare_end_date=20261024), [agency generative-AI comparison](https://search.google.com/u/1/search-console/performance/search-analytics/ai?resource_id=sc-domain%3Acreatesomething.agency&start_date=20261025&end_date=20261031&compare_start_date=20261018&compare_end_date=20261024), and the same reports for `sc-domain:createsomething.io`. The public agency filter was `^https?://(www\.)?createsomething\.agency/`.

Page-filtered and domain-level totals use different aggregation. They are not additive, and filtered totals must not be compared directly with unfiltered totals. Google also warns that filtered charts/tables can be partial. Average position is query-mix dependent; a larger number alone does not establish a site-wide ranking regression. The generative-AI Beta view exposed impressions without a click or conversion metric. Its chart accessibility label contained an invalid-date string; the visible metric cards and comparison dates were read directly and retained as evidence.

Agency landing-page impressions fell for `/agent-foundation` (18 to 5), `/services` (11 to 4), and the homepage (9 to 5). `/field-reports` increased from 5 to 7. Every one of these rows had zero clicks in both weeks. Visible nonbranded queries included `workflow reports` (2 to 5 impressions) and `agent foundation` (5 to 1), also without clicks. Query rows omit some data, so their totals are not the chart total. The sample is too small to justify a broad content rewrite or a reliable conversion-rate claim.

IO's two Web clicks both landed on `/experiments/living-arena-gpu`. First-party D1 separately recorded two Google-referred IO sessions on that path. The matching path/count supports a narrow search-acquisition observation; it is not a user-level join and does not explain agency growth or establish revenue. No visible query row carried those clicks, so their queries remain unknown.

The agency export contained 95 Draw project-URL rows, many with project query parameters. These are not agency service acquisition pages. Do not publish their identifiers or count them as evidence of buyer demand. A separate Draw indexing review must determine which application routes should be indexable before changing robots, canonicals, or removal settings. Domain indexing counts also include subdomains and legacy URLs; they do not measure how many of the 57 current acquisition routes are indexed.

The signed-in account listed agency and IO properties, but no `.ltd` or `.space` property. Those two Search Console comparisons remain access/configuration gaps. Authoritative scheduler booking reconciliation remains open as described above. Visibility in Google's AI results is now observed at a small scale; attributable AI visits, completed bookings, and revenue are still unproven.

## Sitemap discovery was repaired

Search Console initially showed the agency sitemap last read January 6, 2026, with 13 discovered URLs. The actual live XML contained 57 canonical URLs. The existing `https://createsomething.agency/sitemap.xml` was resubmitted once through the verified property. A fresh page reload showed submitted November 3, last read November 3, status **Success**, and **57 discovered pages**. This verifies renewed discovery, not indexing or ranking acceptance.

## Validate and release the bounded fixes

The change corrects Offer prices, preserves zero-cost starters and custom-quote terms, updates `.ltd` and `.space` WebSite descriptions, and clarifies the MCP/API guide description. Regression checks cover the rendered JSON-LD and reporting behavior. The agency HTML cache revision changes with the release.

Promotion uses a reviewed PR and the repository's production deployment workflows. Agency deploys from main after its release gate; `.ltd` and `.space` use the manual Property Pages Deploy workflow after merge. Retain the previous production deployment IDs for rollback. Do not treat a merged PR, preview, or build as live verification. Check canonical HTML and repeated warm-cache reads after deployment.

Search Console access for `.ltd`/`.space`, Draw indexing scope, and authoritative booking reconciliation remain explicit open checkpoints even after the code ships. Record exact deployment receipts, independent review, three quality gates, and worktree disposition in CRE-2336.
