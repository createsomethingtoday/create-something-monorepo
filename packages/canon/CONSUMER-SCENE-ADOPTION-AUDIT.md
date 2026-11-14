# Consumer scene adoption audit

Read-only source audit, 2026-11-13. Local redesign worktree, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`, dirty shared source. No application source, copy, assets, data, or external state changed. No package/check/build/sync commands ran. This document is the only audit write.

## Adoption map

| Consumer | Current behavior | Remaining decision |
| --- | --- | --- |
| Agency campaign routes | Eleven direct `media` calls automatically enter CSS scene rendering; existing alt becomes meaningful scene description. | Existing media is compatibility adoption, not approval of its new framing or a new Canon scene. |
| Agency campaigns without media | Seven direct route calls and HighIntentSearchLanding retain no-scene layouts. | Consumer-owned scene selection required; do not invent an asset to pass an adoption count. |
| Agency handoffs | 27 direct route calls plus GovernanceProductPage and HighIntentSearchLanding have no background. | All remain functional compatibility support, with no scene adoption. |
| Agency home | AgencySalesHome renders owned HTML; story-home.css already paints `/images/agency-sales/hero.webp` as a hero background and preloads it. | Independent custom composition, not shared SceneLead adoption. Preserve its lower editorial images. Audit its CTA separately. |
| IO home | ResearchScene is an inline img in the opening, using `ground-compare-before-claim`; PropertyFunnel follows below. | No automatic scene adoption. Keep research data/actions and owned artwork; a local background fixture must demonstrate its actual composition before proposing migration. |
| LTD home | LibraryScene remains an inline img inside the operator hero. | No automatic scene adoption. Preserve paired scene semantics and operating-library copy. |
| LTD `/taste` | PerformanceConversionHandoff retains steps, authority and real outbound actions, without background. | Useful no-scene contract fixture; scene choice still pending. |
| Space home | WorkshopScene is inline in the opening and uses its scene registry and caption. | No automatic scene adoption. Preserve GET search boundary and truthful concept-illustration caption. |
| ClearPlatformHero / ClearCtaBand / MeridianOfferPanel | No direct imports in these four property source trees. | Canon fixtures establish family coverage; do not report deployed consumer coverage. |

Source totals above count rendered direct invocations rather than import matches; wrappers expand to more URLs. The phase-6 inventory is at `evidence/compositions/background-consumers.md` under this package, not repository-root evidence.

Automatic media routes: `/delivery`, `/proof/marketplace-workflow`, `/products/loom`, `/workflow-compiler-integration`, `/field-reports/template-review`, `/workflows`, `/field-reports/upstream-contributions`, `/agent-foundation`, `/agent-readiness`, `/dify/mcp-control-plane`, `/experiments`. No-media direct campaigns: `/services`, `/control`, `/practice`, `/stack`, `/products`, `/field-reports`, `/dispatch`. HighIntentSearchLanding explicitly sets `artifactOwnsMedia` and renders PlaybookField; adding media alone does not activate the scene branch.

## Priority integration risks

1. **Image ratios are lost in legacy media conversion.** PerformanceCampaignOpening derives `{src,mobileSrc,description,position}` from `media`; width/height do not become aspectRatio. Existing paper/playbook media modules declare 1536×1024 (3:2), while SceneLead defaults to 16:9 and separate mobile imagery to 9:16. Contain preserves pixels but may introduce substantial empty regions and place the quiet wall at the wrong height. Measure actual desktop/mobile files before supplying explicit background ratios in a local fixture. Do not infer mobile ratio from the filename.
2. **Legacy artwork was not composed for the new quiet regions.** Paper receipt, Playbook courts, pressure boundary and survey craft are existing consumer assets. The left 44% desktop copy / upper mobile copy contract cannot guarantee unobscured objects for those images. Existing source acceptance does not approve new background composition. Inspect real images and each property shell at 320/390/768/1024/1025/1440.
3. **Agency overrides still target legacy internals.** AgencyWayfindingOpening sets content/header widths, artifact positioning and mobile `display:contents`; services adds its own grid and proof placement. New scene branch does not use the same content wrapper. Some selectors become inert, while root selectors still apply. `/map` forces handoff grid columns/padding and boundary styling without excluding scene instances; adding background there is high risk. `/products` and the film shell also style campaign internals. Prefer scoping compatibility rules to no-scene instances after actual fixture evidence, rather than deleting rules globally.
4. **Palette adapter may silently stop affecting scene media.** operator-palette.css targets `__media` opacity/filter, `__content` spacing and header widths. SceneLead uses different nodes. Explicit natural/monochrome choices and black foundation must be inspected with the actual consumer stylesheet, not inferred from the generic Canon fixture.
5. **Arbitrary artifacts are semantic content.** HighIntentSearchLanding's PlaybookField and governance/handoff records must retain real state, links and analytics callbacks. Moving records below a scene is an integration change; do not substitute marketing copy or an illustration for evidence. Never submit conversion forms while checking.
6. **Loading policy differs.** Agency home already preloads its source; Campaign priority can generate a preload. Any fixture or migration must avoid duplicate competing preloads, pair desktop/mobile conditions, and keep CTA images unpreloaded by default. IO/LTD/Space inline eager/high-priority img semantics do not automatically transfer to CSS.

Current SceneLead is CSS intrinsic grid layout with a reserved lower region and no ResizeObserver. R07 prose describing JS measurement is historical and must not be used as current runtime evidence.

## Small representative fixture set

Create local-only integration fixtures using actual consumer styles and unchanged business data/copy; do not replace production assets:

- **P0 `/delivery`**: real paper receipt media + proof + native action + no-scene handoff. Captures automatic conversion and real legacy asset ratio behavior.
- **P0 `/services`**: actual AgencyWayfindingOpening and services CSS. Compare its current no-scene compatibility layout with an explicitly local background instance; include both actions and proof unchanged.
- **P0 `/map` handoff**: attach a background only in a local fixture while preserving authority and route actions. Exercises the strongest direct root-grid override.
- **P1 `/marketplace-review-automation` wrapper**: artifact-owned PlaybookField with unchanged landing object. Verify that explicit opt-out remains intact, then model any proposed scene-plus-record separation as a separate local variant.
- **P1 `/workflows` or `/agent-readiness`**: real Playbook mobile/desktop media with source dimensions; inspect object visibility rather than merely counting backgrounds.
- **P1 `/field-reports/template-review`**: long real copy, detailed handoff and custom step typography; exercises intrinsic growth without fabricated concise copy.
- **P1 IO `/`, LTD `/`, Space `/`**: preserve their owned scene, caption, data and links; side-by-side local scene variants establish migration feasibility. IO local fallback papers are offline data evidence. Space must retain its search boundary. These are outside automatic shared-family adoption.
- **P2 LTD `/taste`**: actual handoff steps and outbound labels with no media, plus a local optional scene variant. Generic Canon `/next/compositions` remains the family coverage for Clear and Offer components that have no direct property consumers.

For each fixture, check black owning foundation, Geist roles, complete copy/actions, visible subject/task, dense-record separation, no horizontal overflow, focus, missing-image, no-JS and reduced-motion behavior. Preserve lower editorial inline imagery and real destinations; do not activate purchases, inquiry submission or authentication.

## Gates

- Functional correctness: **untested at runtime in this audit**. Source contract mapping completed; no tests or browser interactions ran.
- Perceptual/product quality: **untested**. No actual image or rendered output inspection was performed; risks above are source-grounded integration hypotheses, not proven visual failures.
- Release readiness: **not applicable to this read-only audit / unapproved for publication**. Local shared-family compatibility is not completed consumer migration or approval of portrait studies. Parent owns implementation, exact-artifact checks, independent retest and release boundaries.
