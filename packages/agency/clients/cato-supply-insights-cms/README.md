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
