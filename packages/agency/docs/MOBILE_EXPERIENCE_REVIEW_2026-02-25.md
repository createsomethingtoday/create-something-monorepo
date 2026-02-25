# .Agency Mobile Experience Review (2026-02-25)

## Scope

Reviewed the `.agency` SvelteKit property at mobile viewport `390x844` (iPhone 12-ish) across the primary marketing and conversion routes:

- `/`
- `/services`
- `/about`
- `/contact`
- `/book`
- `/products`
- `/methodology`

## QA Preconditions

To run `.agency` locally without module-resolution blockers, these workspace packages must be packaged first:

```bash
pnpm --filter @create-something/canon package
pnpm --filter @create-something/tufte package
pnpm --filter @create-something/agency dev -- --host 0.0.0.0 --port 4173
```

## Executive Summary

Status: **Partially pass with one notable layout defect.**

- All audited routes render at mobile size and maintain readable typography hierarchy.
- Primary CTA/navigation flows are present and reachable.
- **Issue found:** `/about` has horizontal overflow (`scrollWidth: 408` on `innerWidth: 390`), driven by the timeline area. This introduces subtle side-scroll on mobile.

## Route-Level Findings

### `/` Home — Pass

- Hero and top nav render correctly in mobile viewport.
- No horizontal overflow detected.
- Footer and key links remain accessible.

### `/services` — Pass

- Offer cards and section rhythm remain readable.
- No horizontal overflow detected.
- CTA path to contact/book remains visible.

### `/about` — Needs fix

- Core content and timeline render, but the page width exceeds viewport (`408 > 390`).
- Root cause appears tied to the timeline/milestones region where a large SVG (`min-width`) expands the scrollable area.
- User impact: accidental horizontal panning and perceived layout instability on mobile.

### `/contact` — Pass

- Intro copy and route intent are clear.
- No horizontal overflow detected.

### `/book` — Pass

- Booking route renders on mobile with heading and high interaction affordance density.
- No horizontal overflow detected.

### `/products` — Pass

- Product list structure and section spacing hold on mobile.
- No horizontal overflow detected.

### `/methodology` — Pass

- Long-form content remains readable and scannable.
- No horizontal overflow detected.

## Priority Recommendations

1. **P1 — Fix `/about` horizontal overflow**
   - Constrain timeline visualization behavior at small breakpoints (e.g., reduce minimum SVG width, contain overflow to internal scroller, or provide mobile-specific timeline rendering).

2. **P2 — Add a lightweight mobile smoke check**
   - Include viewport route checks for horizontal overflow and status code sanity in CI or a pre-release script.

3. **P2 — Document local QA startup**
   - Keep the packaging preconditions (`canon` + `tufte`) in developer docs so manual/mobile QA is consistently reproducible.

## Follow-up Remediation (2026-02-25)

- `/about` timeline overflow fix implemented in `WorkHistoryTimeline.svelte` by constraining grid min-width behavior and locking timeline overflow to the internal scroller.
- Workspace quality gate rerun confirms `.agency` passes type checking after the change.

## Evidence

- Mobile viewport automation confirmed:
  - `/about`: `scrollWidth: 408`, `innerWidth: 390`, overflow = `true`
  - Other audited routes: overflow = `false`
- Screenshot capture for each audited route completed during this pass.
