# Marketplace graduation verification — September 14, 2026

The original prototype verification is superseded. This checkpoint demonstrates restored behavior and the independent Impeccable review. Final review repairs are recorded below.

## Verified browser workflows

Ego task space 2, actual public catalog and listing data. Desktop 1440×1000 and mobile 390×844.

- Infinite loading: 24 → 48 → 72 cards, unique template identities, one request per page. No replacement pagination.
- Development repetitions restored 72 items at 7755 → 7755 and 7926 → 7926. A later independent production build exposed offscreen sizing drift; that failure was repaired with fixed-aspect media containment and a saved visible-card anchor. Two final clean production repetitions both restored 72 unique items, scroll 10201 → 10201, and card offset -0.234375 → -0.234375.
- Failed append preserved 24 results; unblocking and Retry appended the second batch. Initial catalog failure and Retry also verified.
- Changing sort after deep browsing reset to 24 items at scroll 0; reload retained newest. Combined Technology, Modern, free-only returned 18 matching templates with no horizontal mobile overflow.
- No-result query displays a clear-filter recovery path.
- Fleet: original heading/list hierarchy, 8 list items, 12 feature definitions, 7 FAQs and only the applicable Single Use License.
- Fostra: original and local normalized description text match exactly; all 4 headings and both original links match. Eight recent listings inspected; none contains an overview image. Image preservation and removal of executable markup have fixture coverage.
- Description-specific error/retry works without flattening or inventing a replacement description.
- Native preview dialog, Escape, close/reopen and return of focus to the opener verified. Preview uses the existing opaque-origin iframe sandbox.
- Sticky offer displays the same name and price as the main offer; creator/category/style/related links use real catalog filters.
- Route-specific title verified: Fostra — Webflow website template.
- First visual comparison screenshots are stored in the owning worktree under .codex/marketplace-graduation/evidence/.

## Supporting checks

Type check and 14 tests pass. Tests cover catalog bounds/allowlisting and failures, exact slug requests, URL safety, append deduplication, real Fleet HTML extraction, hidden license exclusion, script/attribute sanitization, and rejection of arbitrary content URLs. Production build and fresh archive validation are recorded at the final checkpoint below.

## Known boundaries

Local review only; no production deployment, purchase, submission or privileged mutation. The project is self-contained and requires Node.js 22. Source import, visual editing, agent execution and deployment have not been exercised with a Source account. Listed templates remain Webflow Designer assets and are not certified Source-compatible.

The public catalog omits original HTML, so the project reads each public listing through a fixed-origin adapter. A future markup change may make this adapter fail; the UI exposes Retry and the original listing link rather than substituting flattened content. Fetches have bounded headers, body size and timeout.

The production /templates/all client component failed to hydrate during baseline inspection. Its completed owning grid/sidebar components provide the intended behavior baseline; original listing content was compared in the browser directly. Unsupported sale timers, checkout operations and app-extension campaigns are not fabricated; current commercial details remain on the official listing.

## Independent design review

User approved two isolated Impeccable assessments. Assessment A completed before detector findings entered synthesis. Baseline score 28/40, four P2 findings, no P0/P1. Findings: conflicting free-filter state, distant fallback for embedding-denied previews, delayed mobile artwork, and cropped detail imagery.

Repairs normalize legacy free/style links and visible controls, add a mobile Filters disclosure with active count, reduce introductory spacing, preserve full hero artwork, and place Open live site in the preview header. Browser text/heading findings repaired:12px development ribbon,72ch homepage FAQ measure, Filters h2. Clipboard denial now exposes a useful recovery link.

CLI detector48 advisories (28colors,18type sizes,2radii), all inherited TemplateCard values outside the abbreviated machine-readable design contract. Original card identity remains intentionally preserved. Live detector found ribbon text, FAQ measure and heading structure; no reproducible critical issue. Injection verified on three views; temporary overlay server stopped. Full assessments and before/after screenshots are retained under the owning goal evidence directory. No rescore is claimed after repairs.

## Independent package checkpoint

Export extracted outside the monorepo, then npm ci, npm run check, all 14 tests and npm run build passed. npm audit: zero vulnerabilities. After the production-only scroll repair, the independent project passed checks/tests/build again; the corrected build passed both clean browser repetitions. Route payload is 15.1 kB, first-load JavaScript 118 kB. Current production preview: http://127.0.0.1:4317/templates.

The prior prototype directory and archive are retained with the suffix -prototype-2026-09-14. Worktree disposition: preserved at /Users/micahjohnson/Code/source-template-marketplace-review on codex/source-template-marketplace until review is complete.

Final production interaction checks: 18 collection cards, working carousel controls, 12 related/creator cards on Fleet, creator route filtering, mobile preview width390 with Close preview focused, Escape dismissal, visible keyboard skip link, no per-card duplicate style tags and reduced-motion animation none.


Post-critique standalone check,17 tests and production build pass (15.5kB route,118kB first load). Three added behavioral tests cover clearing legacy free links, switching collections and replacing style-link constraints.

Post-critique browser checks: Free title/navigation/checkbox agree; clearing removes the constraint. Collapsed mobile filters report one active constraint and preserve full controls. First complete card ends at764px on a390×844screen, no horizontal overflow. Homepage artwork starts at705px (previously774px). Full Fleet hero uses contain at560px maximum height; mobile preview Open live site appears at41px with Close focused. Clipboard denial fault injection displays an actionable listing link. The external preview path remains necessary for embedding-denied sites; no claim is made that cross-origin iframe failures can be reliably detected.

Two final post-critique production repetitions each restored72identical unique items, scroll10202.5→10202.5 and card offset-0.234375→-0.234375. Legacy style link displays Modern; desktop filters remain visible with correct h2 semantics. Evidence:post-critique-browser.json.
