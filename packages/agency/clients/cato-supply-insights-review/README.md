# Cato Supply Insights Review

Client review package for the Cato Supply Insights CMS, focused landing pages, and navigation dropdown work.

## Surfaces

- Review URL: https://cato-supply-insights-review.pages.dev/insights
- Detail example: https://cato-supply-insights-review.pages.dev/2026-supply-disruption-preparedness-brief
- Cloudflare Pages project: `cato-supply-insights-review`
- Production review branch: `client-review`
- Native Webflow status: draft Designer changes applied, not published to custom production domains

## Package Layout

- `site/` - static Webflow export plus the local Insights/CMS polish.
- `site/data/insights-cms.json` - mock CMS records used to render hub, archive, and detail pages.
- `site/scripts/render-insights-cms.mjs` - renderer for the local CMS mock pages.
- `verification/screenshots/` - screenshots captured while polishing and validating the review surface.
- `docs/` - client/update notes suitable for Notion and handoff.
- `experiments/` - one-off HTML prototypes retained for context.

## Commands

```bash
pnpm --filter @create-something/cato-supply-insights-review check
pnpm --filter @create-something/cato-supply-insights-review dev
pnpm --filter @create-something/cato-supply-insights-review deploy:review
```

## Current State

- The local review build includes the Insights hub, Resiliency Report Alerts, Cato Research, Resource Library, Newsroom, and CMS detail pages.
- The dropdown system has one shared controller in the local build: About stays compact, Insights remains the featured mega menu, and both support hover/focus/Escape behavior.
- The Webflow `Nav` component has been updated through MCP with an Insights native dropdown and aligned About styling, but the site has not been published.
- The package is intentionally separate from native Webflow so the Cloudflare URL can be used for client review before publishing Webflow production domains.
