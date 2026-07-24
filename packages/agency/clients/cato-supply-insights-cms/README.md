# Cato Supply Insights CMS

Public, read-only adapter between the Cato Supply Webflow CMS and the Cato code-component library.

## Contract

`GET /api/cato/insights` returns one payload with:

- `categories`: published `Insight Categories` records normalized for global navigation labels, link summaries, and archive routes.
- `subscription`: the first published `Subscription CTA` record normalized as global heading, supporting copy, and button text.
- `items`: published Insight articles normalized for mega-menu features, hubs, archives, and detail pages.

The Cato Navigation and Cato Insights Mega Menu components use this endpoint by default. CMS category values take precedence over component-instance fallback copy, so a published category edit is global across instances.

The Cato Insights archive components use the singleton `subscription` object before their local fallback copy. Edit the `Global Subscription CTA` item in Webflow CMS to update every subscription panel.

Supported category fields include the standard Webflow `name` and `slug` fields plus optional `mega-menu-label`, `mega-menu-summary`, and `sort-order` fields. `card-summary`, `short-summary`, or `summary` can supply the menu description when `mega-menu-summary` is absent.

`GET /api/cato/team` returns each published Team Member once. The top-level `group` is `leadership`, `board`, or `both`; a `both` member is included when either `?group=leadership` or `?group=board` is requested without duplicating the member in the unfiltered response.

`GET /api/cato/preview/insights` reads Webflow's staged collection so draft Insights can render in the Cato Designer and `cato-supply.webflow.io` staging site. The Worker rejects requests without one of those exact browser origins and returns origin-scoped CORS headers. The public `/api/cato/insights` and `/api/cato/team` routes read Webflow's live endpoints and remain published-only.

## Validation

```bash
pnpm --filter @create-something/cato-supply-insights-cms check
```

## Deployment

Production deployment remains a separate promotion step:

```bash
pnpm --filter @create-something/cato-supply-insights-cms deploy
```

The Worker requires `WEBFLOW_AGENT_ACCESS` or `WEBFLOW_API_TOKEN` as a Cloudflare secret. Collection IDs remain non-secret Wrangler variables.
