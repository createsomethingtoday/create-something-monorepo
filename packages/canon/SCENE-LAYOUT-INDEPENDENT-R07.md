# Independent scene-layout R07 re-test

Read-only independent Sol review of actual localhost:5191/next/compositions, branch t3/canon-design-system-redesign, HEAD 5f9bfab with intentional shared changes. Only this report and evidence/scene-independent-r07 were written. This is phase acceptance, not final art approval or Cook completion.

## Finding

**Medium — material initial desktop layout shift remains.** SceneLead.svelte initializes stacked=true (line 6), then measures and switches to the overlay layout on mount (lines 7–15). This is an actual observed output issue, not a source-only inference: three fresh navigations at the browser's actual 1253px viewport recorded individual no-input layout-shift entries of 0.2226–0.2230. The campaign image boundary moved from approximately y=543/544 to y=190/191, about 353px. See evidence/scene-independent-r07/hydration-shifts.json. Repeated observer installation duplicates entries in the second/third arrays; the quoted values are individual shift entries, not summed scores. This visibly changes initial composition and needs a stable initial desktop geometry before phase acceptance. Preserve the functional no-JavaScript stacked layout while repairing hydration geometry. Do not infer this finding from the earlier interrupted capture.

## Repaired prior findings

Directly viewed dark-768-hero.png: entire face, antenna, body, held task object and paper stairs are clear; metadata/proof follow on black. Directly viewed dark-1024-offer.png: the complete clean-plate paper staircase is clear and copy does not cut its edge. Directly viewed dark-1440-handoff.png, dark-390-handoff.png and light-768-handoff.png: authority is below the art. Directly viewed light-1024-cta.png and dark-1025-cta.png: outcome cards are below art. Directly viewed light-320-hero.png, dark-320-campaign.png, light-1025-campaign.png and light-1440-hero.png: portrait/landscape task composition and readable native actions are preserved. These samples cover every required width, both appearances and all five families. Sixty requested per-section screenshots were captured; not every PNG was individually viewed. Portrait artwork remains prototype studies; clean plates are an intentional authored fixture choice, not proof of five unique final compositions.

## Functional evidence and limits

- Ran `npx --yes pnpm@9.15.4 --dir packages/canon exec vitest run src/lib/components/background/scene-lead-layout.test.ts src/lib/components/background/background-composition.test.ts src/lib/components/performance/performance-composition-system.test.ts`: 3 files, 46 tests passed. Local DOM/SSR fixtures, not production evidence. No build/package/check/sync/full suite.
- Actual Ego space 26 captured 320,390,768,1024,1025,1440 in dark and explicit light across campaign/hero/offer/CTA/handoff. widths.json records no horizontal overflow, dense regions below lead, no inline hero/CTA images, black default and rgb(247,248,246) explicit light. The first dark320 campaign geometry was read before resize settled (1208px); re-capture dark-320-campaign.png settled at579.59px and supersedes that one height. Screenshot widths are the requested emulated widths.
- Actual desktop content mutation: enlarged hero paragraph selected stacked=true, copy bottom exactly equaled artwork top, no horizontal overflow; restoring text returned stacked=false. This exercises ResizeObserver content-change recovery, not only a fixture assertion.
- Actual keyboard Tab exposed skip link with solid2px outline; keyboard Enter on native #cta link changed URL hash. No external property destinations followed or forms submitted.
- JavaScript-disabled mobile screenshot retains meaningful HTML, art and actions (nojs-390.png, directly viewed). Desktop disabled-script geometry returned stacked=true and copy bottom=art top=293.09px (nojs-1024.png filename describes requested emulation; reload reset actual viewport so do not treat it as1024 breakpoint evidence).
- Actual missing-image check disabled cache and blocked *canon-next/world*, then reloaded: missing-1253.png directly viewed readable HTML/actions on black without broken inline image. Earlier cached attempt was overwritten and not counted.
- Explicit reduced-motion emulation returned matches=true; fixture has zero video elements. Source/media tests cover optional video behavior, but actual video decoding/playback/error recovery remain untested because fixture supplies no video.
- Read SceneLead, BackgroundScene and scene branches of five family implementations; existing snippets/native destinations/no-background branches retain test coverage. No public API/export addition was found in this scope.
- One initial screenshot call encountered a pending-navigation capture timeout; inspected existing page, recovered within same space, and re-ran full capture. This tooling interruption is not attributed to the component. Navigation resets emulation: hydration repeats report observed1253px rather than requested1024px. No claim of exact1024 hydration evidence.

## Gates

- Functional correctness: **passed within scoped local behavior**, with46 focused tests and actual fixture checks. Full-suite integration failures reported by other owners were not re-run or adjudicated here.
- Perceptual/product quality: **failed pending initial-layout repair**. Prior settled occlusion defects are repaired in directly viewed output; material hydration shift remains. Art approval and whole-Cook acceptance are outside this gate.
- Release readiness: **untested / unapproved**. No exact production artifact, consumer adoption, final asset optimization, shipping or publication evaluated. No source edits, commit/push/merge/deploy or external submission.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190, branch t3/canon-design-system-redesign. Parent owns integration and repair. Ego space26 closed after capture; protected spaces untouched; no watcher started.
