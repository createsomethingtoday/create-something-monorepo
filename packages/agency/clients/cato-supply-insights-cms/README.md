# Cato Supply Insights CMS

Public, read-only adapter between the Cato Supply Webflow CMS and the Cato code-component library.

## Contract

`GET /api/cato/insights` returns one payload with:

- `categories`: published `Insight Categories` records normalized for global navigation labels, link summaries, and archive routes.
- `subscription`: the first published `Subscription CTA` record normalized as global heading, supporting copy, and button text.
- `items`: published Insight articles whose `Visible in Production` switch (`production-visible`) is enabled, normalized for mega-menu features, hubs, archives, and detail pages.

The Cato Navigation and Cato Insights Mega Menu components use this endpoint by default. CMS category values take precedence over component-instance fallback copy, so a published category edit is global across instances.

The Cato Insights archive components use the singleton `subscription` object before their local fallback copy. Edit the `Global Subscription CTA` item in Webflow CMS to update every subscription panel.

Supported category fields include the standard Webflow `name` and `slug` fields plus optional `mega-menu-label`, `mega-menu-summary`, and `sort-order` fields. `card-summary`, `short-summary`, or `summary` can supply the menu description when `mega-menu-summary` is absent.

`GET /api/cato/team` returns each published Team Member once. The top-level `group` is `leadership`, `board`, or `both`; a `both` member is included when either `?group=leadership` or `?group=board` is requested without duplicating the member in the unfiltered response.

## Insight visibility

Editors can publish every Insight in Webflow and use the `Visible in Production` switch to control the Cato production surfaces independently:

- Production requests to `GET /api/cato/insights` read Webflow's live collection and include only records whose `production-visible` value is exactly `true`. Missing or disabled values fail closed.
- `GET /api/cato/preview/insights` reads Webflow's staged collection for the Cato Designer and `cato-supply.webflow.io` staging site. The Worker rejects requests without one of those exact browser origins.
- Requests from `https://comments.webflow.com` to the normal `GET /api/cato/insights` URL also receive the staged collection. This keeps the existing code component usable in Webflow Comments without a library reshare.

Preview and Comments responses use origin-scoped CORS headers. The Comments origin identifies Webflow's review application, not an individual Webflow project; review-only Insights should therefore be treated as pre-release editorial content rather than confidential data.

`GET /api/cato/team` continues to read Webflow's live endpoint and is not affected by the Insight visibility switch.

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
