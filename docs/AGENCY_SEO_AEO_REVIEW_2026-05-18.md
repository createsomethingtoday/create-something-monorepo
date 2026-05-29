# CREATE SOMETHING .agency SEO/AEO Review

> Date: 2026-05-18
> Linear: CRE-376
> Scope: public `.agency` pages, private portal pages, client-delivery pages,
> canonical URL behavior, sitemap/robots alignment, and answer-engine metadata.

## Business Alignment

The `.agency` search surface should index pages that explain and convert around
the current business:

- calm, transparent AI workflow systems
- MCP connectivity as an implementation primitive
- Policy OS as the governance and judgment layer
- partner implementation lanes for Dify, Cloudflare, and Notion
- custom-domain Dify affiliate content as a measurable acquisition lane

Private account surfaces, admin surfaces, live customer access reports, and
client-delivery review pages should remain accessible to intended users but
should not be treated as acquisition pages.

## Working Targets

- Keep indexable page titles specific to the route and generally under 70
  rendered characters unless the page needs a branded long-tail query.
- Keep indexable page descriptions around 120-160 rendered characters so they
  summarize the page clearly without carrying the whole pitch.
- Give every indexable page one canonical URL and include that URL in the
  sitemap.
- Use `noindex` for private, admin, auth, client-delivery, and experimental
  pages that should not serve as acquisition surfaces.
- Give answer engines clean structured data: Organization, WebSite, WebPage,
  plus page-specific Article, Service, FAQ, or Breadcrumb entities when useful.

## Findings

| Area                       | Status before review                                                                                                            | Decision                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Default canonical URLs     | Pages without explicit `canonical` SSR-rendered the root domain as canonical.                                                   | Fixed in the shared SEO component so route path drives canonical URL server-side.                        |
| Title branding             | Some pages included `CREATE SOMETHING` in the page title and were then double-branded by the SEO component.                     | Fixed in the shared SEO component by preserving already-branded titles.                                  |
| Agency organization schema | Still described the agency primarily as fixed-price custom MCP development.                                                     | Updated to workflow systems, MCP connectivity, Policy OS governance, and artifact-backed delivery.       |
| AEO schema                 | Organization, WebSite, Article, FAQ, Service, and Breadcrumb schema existed, but pages lacked a generic WebPage entity.         | Added WebPage JSON-LD for every SEO component render.                                                    |
| Sitemap                    | Missing `/stack`, `/partners`, `/book`, Dify articles, Cloudflare, Notion, and methodology pages; included noindex legal pages. | Rebuilt around the indexable acquisition, trust, partner, and proof-surface pages.                       |
| Robots                     | Blocked `/book` despite the page being a conversion route; did not explicitly block dashboard/MCP access/prospect surfaces.     | Allowed `/book`; blocked dashboard, MCP access, and prospect portal paths.                               |
| Authenticated surfaces     | Dashboard and MCP tools page had indexable metadata in their component state.                                                   | Marked as `noindex`. Crawlers already see login redirect, but component intent is now explicit.          |
| Client-delivery surface    | `/delivery/abundance` was public and indexable but not in the sitemap.                                                          | Marked as `noindex`; it remains available as a client/review artifact, not an acquisition landing page.  |
| Legacy experiments         | `/experiments` and dynamic experiment pages are not part of the current public navigation or sitemap.                           | Marked as `noindex` until the content is intentionally promoted into the current proof-surface strategy. |
| Dify content pages         | New Dify pages had solid titles/descriptions but did not declare article metadata.                                              | Added article schema fields to the Dify content-engine, MCP control-plane, and n8n comparison pages.     |
| Snippet length             | Several indexable descriptions tried to carry the full business thesis in one meta tag.                                         | Tightened core acquisition and proof-page descriptions around the route's actual job.                    |

## Indexable Page Set

The sitemap now prioritizes these pages:

- `/`
- `/services`
- `/book`
- `/contact`
- `/stack`
- `/partners`
- `/methodology`
- `/security`
- `/bearer-token-policy`
- `/dify`
- `/dify/content-engine`
- `/dify/mcp-control-plane`
- `/dify/n8n-vs-dify`
- `/cloudflare`
- `/notion`
- `/products`
- `/products/ground`
- `/products/loom`
- `/use-cases/business`
- `/use-cases/enterprise`
- `/about`

## Noindex Page Set

These route groups are intentionally excluded from search acquisition:

- `/admin/*`
- `/account`
- `/auth/*`
- `/dashboard`
- `/delivery/abundance`
- `/experiments`
- `/experiments/[slug]`
- `/login`
- `/mcp-access/*`
- `/privacy`
- `/prospects`
- `/terms`

## Follow-Up Candidates

These were not required for the narrow fix but are useful future improvements:

1. Create dedicated Open Graph images for Dify, Cloudflare, Notion, Policy OS,
   and the n8n comparison page instead of reusing the generic OG image.
2. Decide whether legal pages should remain `noindex`; if the trust strategy
   changes, remove `noindex` and re-add them to the sitemap.
3. Promote selected `/experiments` content into `/products` or future case-study
   routes only after copy and page framing match the current business.
4. Add a generated sitemap route once static sitemap maintenance becomes
   tedious.
