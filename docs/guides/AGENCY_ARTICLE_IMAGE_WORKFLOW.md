# Agency Article Image Workflow

> Parent plan: `docs/AGENCY_WORKFLOW_INTENT_ARTICLE_ENGINE.md`
> Brief template: `packages/agency/content/templates/marketing/workflow-intent-article-brief.md`
> Tracker template: `docs/examples/agency-workflow-intent-article-tracker.template.csv`

## Decision

Create most article visuals. Collect screenshots only when they prove a tool
claim, comparison, or workflow observation.

Original visuals are the CREATE SOMETHING signature. Screenshots are evidence.
Stock AI imagery is neither.

Use the Canon image guidelines as the shared standard for generated and designed
marketing visuals: `packages/ltd/src/lib/content/canon/guidelines/images.md`.
Ona.com is the design and communication foundation, but CREATE SOMETHING owns the
system-map, policy, receipt, validation, and handoff language.

## Canvas-First Visual Language

When a visual needs to explain a workflow, service, offer, case study, tool
comparison, governance boundary, or agent behavior, default to an Atlas-style
canvas with nodes and mapped relationships before creating a decorative graphic.

The canvas is the communication artifact because it can serve both audiences:

- Humans see ownership, handoffs, waits, stops, and proof surfaces quickly.
- Agents receive a structured graph with roles, relationships, policy
  boundaries, and next-action context.

Use this hierarchy:

1. Static story canvas for marketing, articles, presentations, social crops, and
   non-interactive route sections.
2. Interactive Atlas canvas for education, intake, editing, accessibility, and
   agent-operable workflow state.
3. Sigma or Cosmograph only for large read-only network exploration where the
   graph is too large for rich workflow editing.

Do not move the source of truth into a renderer. The source of truth should be a
graph artifact that can be adapted into a story canvas, an interactive canvas,
or a large-network renderer.

Canvas visuals should show, at minimum:

- accountable owner
- durable workflow or data artifact
- automation or system route
- AI-assisted task when present
- human judgment point
- stop condition or policy boundary
- receipt, log, dashboard, or inspection surface

Animations can support story presentation, but they should only emphasize chapter
focus, handoff traces, stop boundaries, and proof reveals. The underlying visual
must remain understandable with motion disabled.

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

Prefer generating these as Atlas story-canvas variants when the visual is about
system behavior, not just brand mood. If the live route already has a matching
starter map, reuse its graph and render a static story canvas instead of
redrawing the workflow by hand.

For generated images, use `gpt-image-2` when access is available and keep the
source prompt beside the export. The prompt must state the image family, proof
requirement, target surface, and constraints before style direction.

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
- Atlas node and relationship blocks
- static story-canvas section layout
- workflow diagram blocks
- app icon cards
- allowed / ask / blocked chips
- checklist graphic
- CTA banner
- architecture diagram template
- screenshot annotation style

The goal is consistent recognition: a reader should know a diagram came from
CREATE SOMETHING before they read the byline.

Use these templates for each article image set:

- `packages/agency/content/templates/marketing/image-prompt.md`
- `packages/agency/content/templates/marketing/image-metadata.md`

Check the template and metadata contract before publishing:

```bash
node scripts/marketing-image-assets-check.mjs
```

## Route Placement

An owned article visual is not complete when it exists only as a social image,
OG image, or asset-folder export. Place the primary original diagram in the live
article body near the section where it clarifies the argument.

For Svelte agency routes, use `ArticleVisualFigure` for owned diagrams and keep
the route path, static image path, alt text, caption, and source label aligned
with the article image metadata. High-intent article routes should also be
covered by `packages/agency/scripts/check-seo-aeo.mjs` when the image is part of
the communication contract.

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
- [ ] Workflow, governance, or agent-behavior visuals were attempted as an Atlas
      canvas before a one-off graphic was created.
- [ ] Primary owned visual is placed in the article body, not only as OG/social art.
- [ ] Screenshot targets support concrete claims.
- [ ] Screenshots are redacted and annotated.
- [ ] Alt text and captions are written.
- [ ] Route-level visual guardrail is added when the visual is part of the page contract.
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
