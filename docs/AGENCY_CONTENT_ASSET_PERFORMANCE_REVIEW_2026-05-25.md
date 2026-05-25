# Agency Content Asset Performance Review

> Date: 2026-05-25
> Linear: CRE-445
> Scope: CREATE SOMETHING `.agency` content assets, live D1 analytics, footer
> structure, and content-asset attribution readiness.

## Data Source

Live D1 was queried with:

```bash
CLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a \
  pnpm exec wrangler d1 execute create-something-db \
  --remote \
  --config packages/agency/wrangler.jsonc \
  --command "<sql>"
```

Database: `create-something-db`

The review used `unified_events`, `leads`, and the existing content-pipeline
tables.

## 30-Day Content Performance

| Path                   | Events | Sessions | Page views | 75% scroll events | Button clicks | Conversions | Last seen  |
| ---------------------- | -----: | -------: | ---------: | ----------------: | ------------: | ----------: | ---------- |
| `/services`            |    146 |       33 |         41 |                 7 |             0 |           0 | 2026-05-25 |
| `/book`                |     20 |        7 |          8 |                 0 |             0 |           0 | 2026-05-24 |
| `/partners`            |     37 |        7 |          8 |                 2 |             0 |           0 | 2026-05-24 |
| `/dify`                |      7 |        3 |          3 |                 0 |             0 |           0 | 2026-05-24 |
| `/cloudflare`          |      6 |        2 |          2 |                 0 |             0 |           0 | 2026-05-24 |
| `/dify/content-engine` |      4 |        2 |          2 |                 0 |             0 |           0 | 2026-05-24 |
| `/dify/n8n-vs-dify`    |      3 |        2 |          2 |                 0 |             0 |           0 | 2026-05-24 |
| `/notion`              |      3 |        1 |          1 |                 0 |             0 |           0 | 2026-05-24 |

## 90-Day Baseline

| Path                   | Events | Sessions | Page views | Last seen  |
| ---------------------- | -----: | -------: | ---------: | ---------- |
| `/services`            |    440 |       88 |        114 | 2026-05-25 |
| `/book`                |     88 |       22 |         23 | 2026-05-24 |
| `/partners`            |     37 |        7 |          8 | 2026-05-24 |
| `/dify`                |      7 |        3 |          3 | 2026-05-24 |
| `/cloudflare`          |      6 |        2 |          2 | 2026-05-24 |
| `/dify/content-engine` |      4 |        2 |          2 | 2026-05-24 |
| `/dify/n8n-vs-dify`    |      3 |        2 |          2 | 2026-05-24 |
| `/notion`              |      3 |        1 |          1 | 2026-05-24 |

## Findings

1. `/services` is the current acquisition content workhorse. It has the most
   sessions, page views, and deep-scroll evidence.
2. `/book` receives decision-stage traffic but does not yet have enough booking
   event evidence in `unified_events` to calculate conversion rate.
3. The Dify article cluster is live and indexed in the sitemap, but traffic is
   early: two page views each for `/dify/content-engine` and `/dify/n8n-vs-dify`
   in the last 30 days.
4. `/dify/mcp-control-plane` is in the sitemap and content-asset metadata, but
   had no matching recent D1 events in the 30/90-day query window.
5. No live analytics events currently contain `metadata.contentAssetId`; the
   content-asset analytics hook was added locally in CRE-444/CRE-445 and needs
   deployment before new events can join by asset ID.
6. The `leads` query returned no recent rows, so content-to-revenue influence is
   not measurable from the current D1 lead table.
7. The content-pipeline tables exist, but `content_ideas`, `content_campaigns`,
   and `content_coverage` are empty. Only the default `content_rhythm` seed rows
   exist.
8. Recent interaction/conversion events mostly came from `/delivery/abundance`,
   not the agency acquisition pages.

## Footer Review

The footer previously used a three-column layout:

- brand/about/social
- flat `Quick Links`
- cross-property `Modes of Being`

That structure was usable at the prior link count, but it mixed navigation types
in one flat list: services, stack, partner lanes, proof pages, trust pages, and
conversion. That would not scale cleanly as the buyer-intent article engine adds
more canonical article routes.

Footer structure implemented:

- `Commercial`: top buyer paths such as services, stack, proof, and about.
- `Partner Lanes`: Dify, Cloudflare, Notion, and partner overview.
- `Guides`: canonical buyer-intent and comparison assets, including
  `/dify/mcp-control-plane`.
- `Trust`: security and bearer-token policy.
- Primary booking CTA outside the grouped link list.

## Changes Made

- Expanded content-asset metadata coverage to include `/services`, `/book`,
  `/partners`, `/cloudflare`, and `/dify`.
- Preserved article metadata for `/dify/content-engine`,
  `/dify/mcp-control-plane`, `/dify/n8n-vs-dify`, and `/notion`.
- Added grouped footer support to the shared canon footer while preserving the
  existing flat `quickLinks` API.
- Reorganized the agency footer into commercial paths, partner lanes, guides,
  trust links, and a distinct booking CTA.

## Next Measurement Step

After deployment, query `unified_events.metadata.contentAssetId` weekly and join
with lead records by `source_detail`, `campaign`, or a manual session note. Until
that deployment happens, path-level analytics are the only reliable content
performance source.
