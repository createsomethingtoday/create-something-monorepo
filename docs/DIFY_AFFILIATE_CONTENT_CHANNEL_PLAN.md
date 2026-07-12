# Dify Affiliate Content Channel Plan

> Owner: CREATE SOMETHING
> Status: ready for execution
> Tracker: CRE-373
> Source packet: `docs/DIFY_PARTNER_AFFILIATE_LEAD_PACKET.md`
> Public surface: `/dify`

## Decision

Use the CREATE SOMETHING custom-domain site as the canonical Dify affiliate
content channel. Use Substack as a distribution and relationship channel that
points back to the public Dify cluster on the custom domain.

This keeps SEO, canonical URLs, analytics, disclosures, CTAs, and lead routing
under repo control while still using Substack for audience capture and regular
dispatch.

## Channel Roles

| Channel                  | Role                                     | What Goes There                                                                                    | What Does Not Go There                                                                                                     |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `createsomething.agency` | Canonical content and conversion surface | Long-form Dify guides, templates, lead magnets, demos, affiliate disclosures, partner handoff CTAs | Duplicated Substack-first articles, undeclared affiliate links, official partner claims before approval                    |
| Substack                 | Distribution and subscriber relationship | Short weekly dispatches, commentary, reader replies, linkbacks to canonical articles               | Canonical ownership of the Dify content cluster, undisclosed affiliate links, copied full posts without canonical handling |
| Social and video         | Discovery                                | Native clips, screenshots, build notes, short demos, comments that point to the canonical page     | Link-only posting as the primary conversion system                                                                         |

## Why Custom Domain Wins

1. The Dify lane is already a partner and affiliate funnel, not only a
   newsletter.
2. Affiliate links must appear only on approved and disclosed surfaces after
   acceptance.
3. Custom-domain pages can separate self-serve affiliate clicks from partner,
   reseller, enterprise, or implementation leads.
4. Custom-domain pages can connect directly to `/dify`, `/dify/mcp-control-plane`,
   `/partners`, `/book`, and repo-backed proof artifacts.
5. Canonical URLs and internal links keep the Dify proof cluster measurable in
   one place.

Substack remains useful because it reduces publishing friction, creates a
subscriber list, and gives a recurring distribution habit. It should not become
the primary source of truth for Dify affiliate content.

## Operating Targets

### First 30 Days

- Publish 4 custom-domain Dify pieces.
- Send 4 Substack dispatches pointing to those pieces.
- Add one downloadable or reusable artifact.
- Keep all Dify links direct until affiliate acceptance.
- Target 100-200 newsletter subscribers.
- Target 1-2 paid affiliate conversions after approval.

### First 90 Days

- Publish 8-12 canonical Dify pieces.
- Reach 500-1,000 Dify content-cluster visits per month.
- Reach 300-500 newsletter subscribers.
- Target 35-45% open rate and 3-5% click rate for Dify dispatches.
- Target 4-6 paid affiliate conversions after approval.

### First 6 Months

- Reach 2,500-5,000 Dify content-cluster visits per month.
- Reach 750-1,500 newsletter subscribers.
- Publish at least one Dify marketplace template or template-ready proof asset.
- Reach 20 paid affiliate conversions, which is the Dify upgrade milestone.

### First 12 Months

- Reach 6,000-10,000 Dify content-cluster visits per month.
- Reach 2,000-3,500 newsletter subscribers.
- Maintain 2 or more marketplace template or demo assets.
- Target 50 paid affiliate conversions.

## Economics Targets

Current working assumptions, verified against Dify's public affiliate page on
2026-05-18:

- Professional plan: `$59/month`
- Team plan: `$159/month`
- Starting commission: `30%`
- Upgrade point: `20 paid conversions`
- Upgraded commission: `50%`
- Eligible commission window: first `12 months` after conversion, subject to
  program rules and the Affiliate Tool.

Per-customer monthly commission:

| Plan         |      30% |      50% |
| ------------ | -------: | -------: |
| Professional | `$17.70` | `$29.50` |
| Team         | `$47.70` | `$79.50` |

Blended run-rate targets using a 70% Professional / 30% Team mix:

| Paid conversions | Commission state                | Estimated monthly commission run rate |
| ---------------: | ------------------------------- | ------------------------------------: |
|               20 | All at 30%                      |                                `$534` |
|               50 | First 20 at 30%, next 30 at 50% |                              `$1,869` |
|              100 | First 20 at 30%, next 80 at 50% |                              `$4,094` |

Treat these as run-rate targets, not booked revenue. Real payout depends on
accepted attribution, locking period, churn, plan mix, program changes, and the
12-month commission window.

## Canonical Content Cluster

Publish these as custom-domain pages first. Substack dispatches should summarize
and link back to the canonical page.

| Priority | Canonical Piece                                  | Target Audience                     | Primary CTA                                            | Substack Dispatch                                          |
| -------: | ------------------------------------------------ | ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
|        1 | `Dify + MCP Control Plane`                       | Builders and technical operators    | Read `/dify/mcp-control-plane` or book mapping session | "Dify is the surface. MCP is the boundary."                |
|        2 | `Dify Agent Eval Gates`                          | Operators and implementation buyers | Book mapping session                                   | "The evals that make Dify safer to operate."               |
|        3 | `How To Ship A Dify App With MCP Tools`          | Builders and agencies               | Read `/dify/ship-dify-app-with-mcp-tools` or book mapping session | "A practical shipping checklist for Dify plus MCP."        |
|        4 | `Client-Safe Dify Delivery Evidence`             | Client buyers and agency partners   | See proof packet or book mapping session               | "What proof can be public without leaking traces."         |
|        5 | `Dify Template Marketplace Workflow`             | Marketplace builders                | Read marketplace proof and setup steps                 | "Turn a Dify workflow into a reusable asset."              |
|        6 | `Dify vs Custom Agent Stack For Operators`       | Business operators                  | Book mapping session                                   | "When Dify is enough and when it needs a control layer."   |
|        7 | `Dify Affiliate Starter Kit For Agencies`        | Agencies and consultants            | Approved affiliate link after acceptance               | "How agencies should route self-serve Dify leads."         |
|        8 | `Dify Governance Checklist`                      | Operators                           | Download checklist or book mapping session             | "The preflight before connecting Dify to real tools."      |

## Weekly Publishing Rhythm

Run this as a weekly operating loop:

1. Choose one canonical piece from the cluster.
2. Publish or update the custom-domain page first.
3. Add internal links from `/dify`, `/dify/mcp-control-plane`, and relevant
   partner pages.
4. Add or confirm affiliate disclosure only after acceptance.
5. Send a Substack dispatch that links back to the canonical page.
6. Add the exact URL, audience, disclosure state, link type, and campaign note
   to `docs/examples/dify-affiliate-link-ledger.template.csv` or the active
   Linear issue.
7. Record visits, clicks, affiliate clicks, conversions, and service leads in
   Linear.

## Measurement

Track these weekly:

| Metric                            | 30-day target | 90-day target | 6-month target |
| --------------------------------- | ------------: | ------------: | -------------: |
| Canonical Dify posts live         |             4 |          8-12 |          16-24 |
| Dify content-cluster visits/month |       200-500 |     500-1,000 |    2,500-5,000 |
| Newsletter subscribers            |       100-200 |       300-500 |      750-1,500 |
| Dispatch open rate                |        35-45% |        35-45% |         32-42% |
| Dispatch click rate               |          3-5% |          3-5% |       2.5-4.5% |
| Dify affiliate clicks/month       |         25-50 |       100-200 |        400-800 |
| Paid affiliate conversions        |           1-2 |           4-6 |             20 |
| Partner or implementation leads   |           1-2 |           3-5 |           8-12 |

The key business measure is not raw audience size. It is the split between
self-serve Dify subscriptions and implementation leads that should stay in the
partner or service lane.

## Compliance Rules

- Keep all Dify links direct until Dify accepts the affiliate application.
- Add clear affiliate disclosure wherever affiliate links appear.
- Register exact domains and channels in the affiliate dashboard after
  acceptance.
- Do not use affiliate links for self-purchases.
- Do not use affiliate links for transactions already covered by partner,
  reseller, enterprise, or co-sell programs.
- Do not claim official, certified, or approved partner status before Dify
  approves it.
- Do not duplicate long-form posts onto Substack unless the custom-domain page
  remains the canonical source.

## Source Notes

Checked on 2026-05-18:

- Dify Affiliate Program: `https://dify.ai/affiliate-program`
- Dify Affiliate Program Agreement: `https://dify.ai/dify-affiliate-program-agreement`
- Google canonical URL guidance:
  `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Substack custom-domain guidance:
  `https://support.substack.com/hc/en-us/articles/360051222571-How-do-I-set-up-my-custom-domain-on-Substack`
