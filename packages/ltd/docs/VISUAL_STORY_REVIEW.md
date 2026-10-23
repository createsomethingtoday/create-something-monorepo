# .ltd visual story review

Reference: deployed Agency PR2045 (`cc86a62e4fa36ecfd9106e57434877725b803f63`), `agencyPreviewOriginalImages.ts` and `VISUAL_STORY_RELEASE.md`. Existing `.ltd` README and UNDERSTANDING establish an operating library, with Canon/philosophy as its deeper standard. This pass changes presentation only; practical artifacts, assessments, masters, standards semantics, navigation and authentication remain source-owned.

## Asset to story map

All six original Agency WebPs were visually inspected before reuse. These are concept illustrations, not photographs of delivery evidence or endorsements. A 768px / 1536px WebP pair is encoded at quality 82 for each source; full frame and intrinsic dimensions are retained. Total derivatives are approximately 996 KiB.

| Route | Agency source image | Educational relationship |
| --- | --- | --- |
| `/` | editorial-workflow-library-tool-drawers-continuity-v2 | Retrieve a useful rule from the operating library. |
| `/playbooks`, `/voice` | about-careful-working-notes | Shared operating instructions and clear language. |
| `/readiness` | permission-two-separate-gates | Access and authority must each be checked. |
| `/principles`, `/ethos` | subtract-the-extra-route | Remove what no longer serves the whole. |
| `/patterns`, `/canon` | tool-fit-without-forcing | A reusable standard fits a concrete constraint. |
| `/standards`, `/playbooks/[slug]` | proof-preserve-the-sequence | Keep the rule, operating sequence and evidence inspectable. |

Native Svelte markup renders image and caption on the server. No injected DOM, study query, JavaScript requirement or new motion is introduced. Existing reduced-motion navigation handling remains in the layout. Homepage and playbook index use a paired text/image opening and a four-step proof rail; small screens stack the scene without cropping it. Keyboard focus continues using the existing Canon accessible ring.

## Route inventory

| Route template | Treatment |
| --- | --- |
| `/` | Native material scene; original source content retained |
| `/account` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/auth/callback` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/auth/cross-domain` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/brand` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/canon` | Native material scene; original source content retained |
| `/canon/[...path]` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/ethos` | Native material scene; original source content retained |
| `/experiments/the-circle-closes` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/login` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/masters` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/masters/[slug]` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/patterns` | Native material scene; original source content retained |
| `/patterns/[slug]` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/playbooks` | Native material scene; original source content retained |
| `/playbooks/[slug]` | Native material scene; original source content retained |
| `/presentations` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/[slug]/script` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/abundance-system` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/beads-continuity` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/canon-design` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/claude-code-partner` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/cloudflare-edge` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/deployment-dwelling` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/developer-onboarding` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/heidegger-canon` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/hub` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/user-onboarding` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/presentations/workway` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/principles` | Native material scene; original source content retained |
| `/privacy` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/readiness` | Native material scene; original source content retained |
| `/standards` | Native material scene; original source content retained |
| `/taste` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/taste/insights` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/terms` | Existing source retained; no illustration added to functional, legal, reference, or specialist surface |
| `/voice` | Native material scene; original source content retained |

## Validation

`pnpm --filter @create-something/ltd check` passes: Svelte check and canon-language/operator-library/identity/search tests. Build and actual-browser responsive review are recorded in the cross-property review evidence. No production deployment or content/database write is included.

Browser evidence: `responsive-evidence.json` records 27 route/viewport checks (1440, 768, 390), all HTTP 200, one h1, loaded scenes and no horizontal overflow; one additional no-JavaScript check confirms the home scene and primary playbook link. Actual Chrome screenshots were visually inspected for desktop and mobile. Keyboard Tab focuses the visible skip link with a solid outline. The five-question readiness UI reaches 5 / 5 with five selected answers under reduced motion. Build passes with Cloudflare adapter.

## Bounded polish pass

Actual visual review covered `/`, `/playbooks`, `/readiness`, `/principles`, `/standards`, and `/canon` at 390, 768 and 1440 px, inspecting image frames, focal subjects, opening hierarchy, spacing and chapter continuity. Full frames retain the agents, gates, archive drawers and material details at each width. No new images or motion were needed. The existing reduced-motion navigation guard and focus styles remain.

The four-playbook grid previously formed an uneven three-plus-one arrangement. Homepage and playbook index now use two columns on larger screens and the existing single-column mobile behavior. Readiness and standards now pair the complete scene with the introduction on desktop; the assessment or standards chapter enters view sooner. Mobile keeps text, complete scene and then working content in document order. Concept captions increased from 11.2 to 12 px. Readiness introductory copy now uses the same muted Canon token as the adjacent image caption, with comfortable line length.

Coverage limits: the route inventory lists all checked-in page templates; it does **not** mean every route was visually tested. Ten templates receive scenes (`/`, `/playbooks`, `/playbooks/[slug]`, `/readiness`, `/principles`, `/ethos`, `/patterns`, `/voice`, `/standards`, `/canon`). The first pass checked nine static route instances at all three widths. The polish pass additionally exercises all four checked-in playbook slugs (`inbound-triage`, `decision-brief`, `exception-handoff`, `solo-control-tower`) and the four changed entry routes at all three widths in `polish-responsive-evidence.json`. Reference, auth, legal, taste, master profiles and presentation templates are inventory-only in this task.

Local `/principles` currently displays its source empty state because the preview has no populated D1 binding. The image opening and empty-state presentation were visually reviewed; populated principles/master data was not verified and no research, philosophy or database content was created to fill it. Canon documentation keeps its existing sidebar and specialist reference layout.

Final polish validation: full `.ltd check` passes (zero Svelte errors or warnings; nine tests). Cloudflare-adapter build passes. New `polish-*.webp` samples show current desktop/tablet/mobile compositions. Existing keyboard skip-link and five-answer readiness interaction evidence remains applicable because controls and handlers are unchanged. Independent final retest belongs to the parent review gate.
