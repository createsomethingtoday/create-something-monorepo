# Cato Supply - Additional Page Experience Updates SOP + Proposal

**Prepared for:** Cato Supply Inc.
**Prepared by:** CREATE SOMETHING
**Date:** May 27, 2026
**Related engagement:** Cato Supply - Webflow Insights CMS build
**Related proposal:** Cato Supply Website Insights Proposal
**Status:** Drafted for Notion and client review

## Executive Summary

The original Cato Webflow Insights proposal covered the Insights navigation, CMS structure, hub/archive pages, templates, QA, and handoff. During the Insights implementation, the review surface and Code Component approach also created a stronger delivery pattern for improving adjacent Cato pages without rebuilding every section natively in Webflow.

This additional SOP/proposal extends that same pattern to the About and Case Studies experiences. The recommended path is to use self-contained Webflow Code Components for the major page bodies, preserve existing shared Nav/Footer and native forms where needed, bind CMS fields only after the visual/content model is stable, and publish only after client approval.

## Why This Is Additional Scope

The current contracted engagement is focused on the Webflow Insights CMS build and collection-page handoff. The About and Case Studies updates are connected to that work because they should match the new Insights polish, but they are distinct page-experience improvements.

The work should be treated as an incremental enhancement package rather than a full rebrand or a replacement of the Cato site architecture.

## Source Context Reviewed

- Existing Notion proposal: `Cato Supply Website Insights Proposal`
- Existing Notion engagement: `Cato Supply - Webflow Insights CMS build`
- Existing Notion client record: `Cato Supply Inc.`
- Existing Notion task: `Share Cato page redesign SOP for About Contact and Case Studies`
- Existing Notion task: `Finalize Cato Webflow Collection pages and CMS bindings`
- Export baseline: `/Users/micahjohnson/Downloads/cato-supply.webflow`
- Repo package: `packages/agency/clients/cato-supply-insights-review`
- Code Component package: `packages/webflow-components`
- Review URL: `https://cato-supply-insights-review.pages.dev/insights`

## Recommended Scope

### 1. About Page Experience

Replace the current long-form About page body with an improved `Cato About Page` Code Component between the existing shared Nav and Footer.

The improved page should:

- Lead with a clearer first viewport that connects Cato's company story to healthcare procurement intelligence.
- Surface proof metrics and operational credibility earlier.
- Preserve the existing values, mission, leadership, and board content, but organize it with tighter section rhythm.
- Include self-contained component styles because Webflow Code Components render in Shadow DOM.
- Use subtle motion polish, with `prefers-reduced-motion` support.

Baseline grade: `B-`
Target grade: `A-`

### 2. Case Studies Landing Page

Replace the current listing-style Case Studies page body with `Cato Case Studies Landing`.

The improved page should:

- Lead with a featured customer story rather than a generic listing.
- Surface outcomes/results above the fold or immediately after the hero.
- Present the story grid as proof, not just CMS inventory.
- Add a clearer path from evidence to contact.
- Keep the layout visually aligned with the Insights hub and archive pages.

Baseline grade: `C+`
Target grade: `A-`

### 3. Case Study Detail Template

Use `Cato Case Study Detail` on the Case Studies CMS template if native template binding remains slow or fragile.

The improved template should:

- Support customer profile, challenge, solution, results, related stories, and image fields.
- Bind to CMS fields where convenient.
- Provide safe defaults so the template is usable before every field is populated.
- Avoid unnecessary carousel dependencies for the first improved delivery.

Baseline grade: `C+`
Target grade: `B+` to `A-`, depending on CMS field completeness.

### 4. Contact Page Boundary

The existing Notion SOP task references About, Contact, and Case Studies. For this delivery pass, Contact should remain a lighter polish lane unless Cato requests a full redesign.

Recommended handling:

- Keep the native Webflow contact form in place so form capture remains reliable.
- Align CTA spacing, button style, section rhythm, and footer adjacency with the new Insights/About/Case Studies polish.
- Only create a Contact Code Component if the client approves a separate Contact redesign pass.

## SOP

1. Confirm the page's job before changing layout.
   - About: credibility and company trust.
   - Case Studies landing: proof and story discovery.
   - Case Study detail: persuasive customer narrative.
   - Contact: conversion clarity and reliable form capture.

2. Start from the exported Webflow baseline.
   - Use `/Users/micahjohnson/Downloads/cato-supply.webflow` for typography, spacing, cards, backgrounds, image assets, and Cato's existing visual language.
   - Compare against the repo static copy in `packages/agency/clients/cato-supply-insights-review/site`.

3. Build the improved experience as a Code Component first.
   - Embed component styles directly in the `*.webflow.tsx` declaration or imported component CSS.
   - Use `applyTagSelectors: true` where appropriate.
   - Use component-specific classes instead of relying on site classes that cannot cross the Shadow DOM boundary.

4. Preserve native Webflow shell elements.
   - Keep the shared Nav.
   - Keep Footer / V2.
   - Keep native forms unless a form replacement is explicitly approved.

5. Bind CMS fields only where the content model is stable.
   - Bind known fields on Case Studies detail pages.
   - Use JSON props for arrays where Designer binding is faster than native Collection nesting.
   - Use component defaults when binding delays delivery.

6. Rebuild Collection pages with stable component insertion.
   - Prefer installed site/library component instances over transient MCP-discovered component IDs.
   - Verify the direct element ID after switching pages because Designer can cache or lose component metadata.
   - Reinsert the component if old props remain cached after a library update.

7. QA before publishing.
   - Desktop, tablet, and mobile.
   - Nav/dropdown behavior.
   - Button styles.
   - Text wrapping and section spacing.
   - Form behavior where applicable.
   - Reduced-motion behavior.
   - No implementation-only language on client-facing pages.

8. Publish only after approval.
   - Use Cloudflare/static review or Webflow Designer preview for review.
   - Do not publish production domains until Cato approves copy, layout, CMS binding, and page behavior.

## Recommended Webflow Build Sequence

1. Refresh or reimport the shared `CREATE SOMETHING Canon Components` library.
2. Confirm the current page from Designer before inserting components.
3. Rebuild the Insights Collection templates first if the backup reset removed them:
   - `Cato Insights Hub` on `/insights`
   - `Cato Insights Archive` on focused archive pages
   - `Cato Insight Category Archive` on Insight Categories collection template
   - `Cato Insight Detail` on Insight detail template when needed
4. Replace `/about-us` body with `Cato About Page`.
5. Replace `/case-studies` body with `Cato Case Studies Landing`.
6. Replace the Case Studies collection template body with `Cato Case Study Detail` when a Code Component fallback is faster than native rebuilding.
7. Polish Contact only at the native section level unless a separate Contact component is approved.
8. QA all updated pages and collect approval before publish.

## Acceptance Criteria

- About page clearly explains Cato's credibility and procurement-intelligence relevance in the first viewport.
- Case Studies landing highlights a featured proof story and visible outcomes before the full grid.
- Case Study detail pages render complete customer narratives even when optional CMS fields are missing.
- Collection templates survive page switching and Designer refresh without losing the component instance.
- Buttons align visually with the updated Cato system.
- Pages are responsive across desktop, tablet, and mobile.
- Motion improves polish without blocking readability or accessibility.
- Native forms remain reliable.
- No production publish occurs without explicit approval.

## Validation Commands

Run from repo root:

```bash
pnpm --filter @create-something/webflow-components verify
pnpm --filter @create-something/cato-supply-insights-review check
WEBFLOW_SKIP_UPDATE_CHECKS=true npx webflow library share --no-input
```

Recommended Designer validation:

- Confirm component metadata appears under the `Cato Supply` group.
- Confirm page instances expose the latest props.
- Confirm Collection templates resolve the correct current item or slug.
- Confirm button hover/focus states and mobile wrapping.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Webflow Code Component Shadow DOM blocks site classes | Embed component styles and reference site variables with fallbacks. |
| Designer caches old library metadata | Refresh the Designer/library import or reinsert affected components. |
| MCP-discovered component IDs drift after backup restore | Prefer installed site/library component instances and verify direct element IDs. |
| CMS binding slows delivery | Use safe component defaults first, then bind final fields after approval. |
| Contact form capture breaks if replaced | Keep Contact form native unless a separate form replacement is approved. |
| Visual polish drifts from Cato export | Continue using the exported Webflow CSS and assets as the baseline. |

## Client-Facing Proposal Language

We recommend a focused additional page-polish package for Cato's About and Case Studies experiences. This extends the same system we used for the Insights work: review locally or in Designer first, preserve the existing Webflow shell, use Code Components for speed and consistency, bind CMS fields where they are stable, and publish only after approval.

The goal is not to redesign the whole site. The goal is to bring the company-story and proof pages up to the same quality bar as the new Insights experience, so visitors move from thought leadership to credibility, proof, and contact with a consistent visual rhythm.

## Open Decisions

- Should this be included as an addendum to the existing Insights proposal or quoted as a separate change order?
- Should Contact remain native polish only, or should Cato approve a full Contact page redesign?
- Should the Case Study detail template be delivered as a Code Component fallback first, or rebuilt natively after final CMS field mapping?
- Should production publish wait until both Insights and the additional page polish are approved together?
