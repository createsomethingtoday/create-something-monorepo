# Agency Marketing Page Portfolio Rdoc

This reusable doc defines how public `.agency` marketing pages are added,
scored, routed, repaired, or archived.

## Purpose

Marketing pages should work as a portfolio, not a pile of pages. Each page must
have one clear job in the funnel:

1. Explain the workflow in natural language.
2. Show the boundary before the tool choice dominates.
3. Route the reader to the next useful page or action.
4. Stay indexable only while it is clear, current, connected, and useful.

Use this Rdoc before adding a new SEO/AEO page or changing an existing one.

## Public Language Contract

Lead with words a visitor can repeat:

- workflow
- handoff
- map
- pilot
- owner
- approval
- stop point
- audit trail
- evidence
- runbook

Keep private strategy words out of public copy:

- buyer
- wedge
- GTM vector
- lead magnet
- productized wedge
- paid conversion target
- affiliate economics

Internal planning docs can still use private strategy terms when useful. Public
pages should explain the business proposition plainly.

## Registry Contract

Every public sitemap route must live in
`packages/agency/src/lib/data/marketingPages.ts`.

Required fields:

- `path`: the public route.
- `cluster`: the page family.
- `role`: `pillar`, `support`, `comparison`, `implementation`, or `operations`.
- `decision`: `index`, `route`, or `archive`.
- `audience`: who the page is for.
- `funnelStage`: `discover`, `understand`, `evaluate`, `implement`, or `book`.
- `intent`: the one job this page performs.
- `primaryAction`: the visible next action.
- `requiredTerms`: terms that prove the page still says what it is meant to say.
- `requiredLinks`: internal routes that keep the page connected.
- `schema`: the structured metadata expectation.
- `search`: sitemap metadata for indexable pages.
- `selfHealing`: deterministic repair levers.

If a page is in `searchRoutes.json`, it must be present in the portfolio with
`decision: 'index'`. If a page stays live only for historical reference or
handoff, keep it in the portfolio with `decision: 'route'` or
`decision: 'archive'`, remove it from `searchRoutes.json`, and pass
`noindex={true}` to its SEO component.

Each cluster should have exactly one pillar page. Support pages in a multi-page
cluster should route back to the pillar.

## Strength Score

`marketing:check` scores each registered page on:

- funnel job
- SEO title and description
- expected schema
- direct next action
- internal routing
- required intent terms
- public copy language
- route-decision metadata

Default thresholds:

- `index`: 82 or higher
- `route`: 60 or higher
- `archive`: no minimum, but it must be noindexed and have a target

## Route Decisions

Use `index` when:

- the page has a clear job
- the page is not redundant
- it has current proof, schema, internal links, and a next action
- it matches the public language contract

Use `route` when:

- the page is useful only as a handoff
- a stronger canonical page exists
- search should not index the old page directly

Use `archive` when:

- the page is stale, thin, redundant, or off-language
- the content should be retained for traceability but not treated as an active
  funnel surface

For `route` or `archive`, add `routeTarget`, set `noindex={true}` in the page,
and run the heal command.

## Self-Healing Levers

Supported deterministic levers:

- `copy:heal`: applies approved public-language replacements.
- `search-route:sync`: syncs `searchRoutes.json` from the registry.
- `canonical-route:review`: flags the page for route/canonical review.
- `archive-route:review`: flags the page for archive review.

Do not use self-healing to invent strategy. It should only repair deterministic
drift that the registry already defines.

## Commands

Run before shipping public copy:

```bash
pnpm --filter @create-something/agency copy:check
pnpm --filter @create-something/agency marketing:check
pnpm --filter @create-something/agency seo:check
```

Run when deterministic route or language drift should be repaired:

```bash
pnpm --filter @create-something/agency marketing:heal
```

## Add A Page

1. Write the page in plain workflow language.
2. Add SEO metadata and FAQ or article schema.
3. Add internal links to the pillar page and next useful pages.
4. Add the route to `marketingPages.ts`.
5. Add or sync sitemap metadata.
6. Run `marketing:check`.
7. Fix every failed check before treating the page as indexable.

## Review A Page

Ask:

1. Can a visitor explain the offer after the first screen?
2. Does the page name the workflow, owner, approval, stop point, and evidence?
3. Does the page route to a next action instead of repeating nearby pages?
4. Is the page stronger than a redirect to an existing canonical page?
5. Would the page still make sense if tool names changed?

If the answer is no, rewrite, route, or archive it.
