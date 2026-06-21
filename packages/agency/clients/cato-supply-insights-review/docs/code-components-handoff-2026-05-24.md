# Cato Code Components Handoff

Baseline reviewed: `/Users/micahjohnson/Downloads/cato-supply.webflow`.

## Remaining Delivery Surface

The current export is already close visually, but the parts that still depend on slow native Webflow/MCP work or custom-code embeds are:

- Home Product Search form redirect and Risk Radar table.
- Insights mega menu content.
- Insights hub, focused archive pages, Resiliency Report Alerts subscribe block, and future CMS detail-page shell.
- About page and Case Studies pages, now added as a follow-up client SOP request so they can match the improved Insights experience without rebuilding every section natively.

## Baseline Experience Grade

Reviewed against `/Users/micahjohnson/Downloads/cato-supply.webflow` and the local static copy in `packages/agency/clients/cato-supply-insights-review/site`.

| Surface | Baseline Grade | Why | Improvement Path |
|---|---:|---|---|
| About page | B- | The export has strong raw content, useful proof metrics, values, mission, and team sections. The experience is long, section rhythm is uneven, the hero relies on animation that is harder to preserve in Code Components, and the page does not quickly connect the company story to the updated Insights-style procurement intelligence narrative. | Use `Cato About Page` to create a clearer first viewport, platform-focus panel, tighter proof stack, values, mission, and self-contained styling. Move people profiles to dedicated About dropdown pages. |
| Leadership page | New | Cato requested a separate `Leadership` tab under About Us. | Create a new page and place `Cato Leadership Page`, which defaults to Ryan Zackon placeholder, Lainy Jahnke, and Ethan Weinberg. |
| Board of Directors page | New | Cato requested a separate `Board of Directors` tab under About Us. | Create a new page and place `Cato Board of Directors Page`, which defaults to five board profiles. |
| Case Studies landing | C+ | The export has the right collection structure but reads like a CMS listing scaffold. It does not strongly feature the best customer story, results are not surfaced early, and the page needs a more decisive path from proof to contact. | Use `Cato Case Studies Landing` to lead with a featured story, result proof, customer-story grid, and CTA rhythm aligned with Insights. |
| Case Study detail template | C+ | The native template has useful sections for customer profile, challenge, solution, results, and related stories, but several fields render empty in the export baseline and the carousel dependency creates more moving parts than needed for first delivery. | Use `Cato Case Study Detail` as a CMS-bindable fallback with rich-text props, result cards, related-story cards, and no external carousel dependency. |

## Code Components Added

Package: `packages/webflow-components`

Group in Webflow Designer: `Cato Supply`

- `Cato Supply Search Hero` - replaces the homepage hero dynamic layer with search redirect plus Risk Radar.
- `Cato Product Search Form` - standalone search redirect component.
- `Cato Risk Radar Catalog` - replaces the `risk-radar-table` custom-code embed with a live fetch plus Designer-safe fallback rows.
- `Cato Insights Mega Menu` - reusable Insights mega menu content from the export.
- `Cato Insights Hub` - Insights landing surface with category cards and latest content.
- `Cato Insights Archive` - focused archive surface for Resiliency, Research, Resources, or Newsroom.
- `Cato Insight Category Archive` - CMS category template surface that resolves the active archive from the Insight Categories page slug.
- `Cato Insight Detail` - CMS-bindable detail article shell for future live CMS item templates.
- `Cato About Page` - improved About page with self-contained style, proof metrics, values, and mission sections.
- `Cato Leadership Page` - dedicated About dropdown page for 3 leadership profiles.
- `Cato Board of Directors Page` - dedicated About dropdown page for 5 board profiles.
- `Cato Case Studies Landing` - improved Case Studies landing surface with featured story, result proof, and customer story grid.
- `Cato Case Study Detail` - CMS-bindable case study detail template with customer profile, challenge, solution, results, and related stories.

## Suggested Webflow Sequence

1. Share the updated `CREATE SOMETHING Canon Components` library.
2. Drop `Cato Risk Radar Catalog` into the existing homepage table slot, or replace the full first viewport with `Cato Supply Search Hero`.
3. Use `Cato Insights Mega Menu` inside the current Insights dropdown content if native edits remain slow.
4. Use `Cato Insights Hub` on `/insights`.
5. Use `Cato Insights Archive` on the four focused pages, with `categoryId` set per page.
6. Use `Cato Insight Category Archive` on the `Insight Categories` CMS template. Bind `Archive Slug` to the CMS slug field when Designer exposes the new prop, or leave it blank so the component infers `resiliency-reports`, `resource-library`, `cato-research`, or `newsroom` from the published URL.
7. Use `Cato Insight Detail` only if the team wants a Code Component detail template before final native Collection List binding.
8. Use `Cato About Page` as the body of `/about-us`, between the existing shared Nav and Footer/CTA. Keep `Show Legacy Team Sections` off unless Cato explicitly asks for the people sections to remain on About.
9. Create a `/leadership` page, place `Cato Leadership Page`, and add `Leadership` as an item under the native About Us dropdown.
10. Create a `/board-of-directors` page, place `Cato Board of Directors Page`, and add `Board of Directors` as an item under the native About Us dropdown.
11. Use `Cato Case Studies Landing` on `/case-studies`. Keep `Show Featured Case` on so the strongest proof story appears before the full grid.
12. Use `Cato Case Study Detail` on the Case Studies CMS template. Bind slug, title, client name, short summary, customer profile, challenge rich text, solution rich text, result JSON, and images where possible. The newest declaration includes native `Challenge Image` and `Solution Image` props in addition to URL fallbacks so CMS image fields can bind cleanly in Designer.

## Style Notes

- Cato component styles are embedded in the Code Components because Webflow renders them inside Shadow DOM.
- The latest style pass uses `/Users/micahjohnson/Downloads/cato-supply.webflow/css/cato-supply.webflow.css` as the source of truth for typography, spacing, cards, panels, and form states.
- Cato declarations enable `applyTagSelectors: true`, while component-specific classes and CSS variables keep the components self-contained.
- About and Case Studies components now include self-contained motion polish: load fades, panel entrance motion, line sweeps, hover lift on cards, export-aligned cream/sky-blue/green panels, gradient buttons, and `prefers-reduced-motion` handling.
- `Cato Insights Hub` defaults to the exported `/insights` style: Resource hub panel, category cards inside the hero section, Featured insights section, no filter rail, and no CMS notes. The filter rail and CMS notes remain available as optional props for the richer review layout.
- Existing instances in Designer may retain old prop values after a library update. Reinsert the component or reset Panel Label/Title/Summary, Show Filter Rail, and Show CMS Model Notes to match the export.
- Webflow Designer can cache shared Code Component metadata. The generated bundle includes `Archive Slug` and `Cato Insight Category Archive`; refresh the Designer/library import if those props are not immediately visible after sharing.

## Validation

Run from repo root:

```bash
pnpm --filter @create-something/webflow-components typecheck
pnpm --filter @create-something/webflow-components bundle
pnpm --filter @create-something/cato-supply-insights-review check
```
