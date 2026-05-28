# Agency Article Image Workflow

> Parent plan: `docs/AGENCY_BUYER_INTENT_ARTICLE_ENGINE.md`
> Brief template: `packages/agency/content/templates/marketing/buyer-intent-article-brief.md`
> Tracker template: `docs/examples/agency-buyer-intent-article-tracker.template.csv`

## Decision

Create most article visuals. Collect screenshots only when they prove a tool
claim, comparison, or workflow observation.

Original visuals are the CREATE SOMETHING signature. Screenshots are evidence.
Stock AI imagery is neither.

## Visual Asset Mix

Every flagship article should plan for:

1. One original hero visual.
2. One comparison matrix or decision visual.
3. Two to four tool screenshots when the article evaluates specific products.
4. One CREATE SOMETHING framework diagram.
5. One CTA visual or checklist graphic when useful.

Supporting articles can use one original diagram plus screenshots only when the
claim needs product evidence.

## Create

Create original visuals for the operating-design point of view:

- workflow maps
- approval-path diagrams
- `allowed / ask / blocked` policy charts
- AI operating-system stack diagrams
- before/after process visuals
- risk-zone diagrams
- tool architecture maps
- checklist or operating-manual graphics

These should be owned assets with editable source files. They can be reused,
updated, and adapted across articles, demos, sales decks, and social posts.

## Collect

Collect real screenshots when discussing a specific tool, UI, or workflow:

- workflow builder screens
- approval settings
- observability dashboards
- agent orchestration screens
- integration setup screens
- audit logs
- human-in-the-loop controls

Do not use random homepage screenshots, marketing banners, or generic dashboard
shots that do not support a specific point in the article.

## Screenshot Rules

- Use screenshots as evidence, not decoration.
- Capture from a real review workspace or documented demo account.
- Avoid showing secrets, client data, private workspace names, email addresses,
  tokens, invoices, customer records, or private prompts.
- Crop to the relevant interface area.
- Annotate with numbered callouts, restrained highlights, and short notes.
- Do not imply vendor endorsement.
- Do not alter screenshots in a way that misrepresents the product.
- Add a checked date and refresh due date for every screenshot.

Screenshots are usually acceptable for commentary, review, comparison, and
education, but rights risk is still an editorial responsibility. When in doubt,
link to vendor docs and use an original diagram instead.

## Avoid

Do not use:

- glowing robots
- circuit faces
- blue AI gradients
- generic brain imagery
- abstract stock dashboards
- decorative screenshots that do not support a claim

If an image does not make the article clearer, more credible, or more
memorable, skip it.

## Asset Kit

Maintain a reusable visual kit with:

- article hero template
- comparison table style
- workflow diagram blocks
- app icon cards
- allowed / ask / blocked chips
- checklist graphic
- CTA banner
- architecture diagram template
- screenshot annotation style

The goal is consistent recognition: a reader should know a diagram came from
CREATE SOMETHING before they read the byline.

## File Convention

Use one folder per article:

```text
packages/agency/content/assets/articles/<content-asset-id>/
```

Suggested structure:

```text
source/
raw-screenshots/
annotated/
exports/
metadata.md
```

Use stable, descriptive filenames:

```text
<content-asset-slug>--hero--workflow-map--v20260601.fig
<content-asset-slug>--diagram--allowed-ask-blocked--v20260601.svg
<content-asset-slug>--screenshot--dify-approval-flow--raw-20260601.png
<content-asset-slug>--screenshot--dify-approval-flow--annotated-20260601.webp
<content-asset-slug>--cta--mapping-session--v20260601.webp
```

## Metadata

Each article image folder should include `metadata.md`:

```markdown
# Image Metadata

## Original Visuals

| File | Source file | Owner | Notes |
| ---- | ----------- | ----- | ----- |
|      |             |       |       |

## Screenshots

| File | Tool | URL or source | Captured | Checked by | Refresh due | Rights note |
| ---- | ---- | ------------- | -------- | ---------- | ----------- | ----------- |
|      |      |               |          |            |             |             |
```

## Refresh Cadence

- Tool comparison screenshots: refresh every 60 days or after a major vendor
  release.
- How-to screenshots: refresh every 90 days or when the workflow UI changes.
- Original framework diagrams: review every 180 days.
- CTA graphics: review when offer language changes.

If a screenshot is stale and cannot be refreshed quickly, replace it with an
original diagram and link to the current vendor docs.

## Article Review Step

Before publishing:

- [ ] Visual plan is complete in the article brief.
- [ ] Original hero or framework visual exists.
- [ ] Screenshot targets support concrete claims.
- [ ] Screenshots are redacted and annotated.
- [ ] Alt text and captions are written.
- [ ] Metadata file includes capture date and refresh due date.
- [ ] Tracker row has image status and rights status.

## Editorial Standard

Every tool section should use the same pattern:

1. Best for.
2. Weaknesses.
3. Governance capability.
4. Human approval support.
5. Auditability.
6. Portability.
7. Pricing reality.
8. Screenshot evidence when useful.
9. CREATE SOMETHING take.

The screenshot proves the review was grounded. The CREATE SOMETHING take is the
reason the article is worth reading.
