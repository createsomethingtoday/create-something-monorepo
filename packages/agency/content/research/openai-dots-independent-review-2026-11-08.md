# Independent rendered review — OpenAI dots

Reviewer: independent Sol 6.1, local runtime `http://127.0.0.1:4198/openai-dots`, 2026-11-08. No source edits, agents, merge, deploy, or form submission. Shared Ego space 14 / p1 only.

## Findings

- Medium, repaired and independently rechecked: the 768px ruler label “The possibilities” exceeded its 118px cell (scrollWidth 130), overlapping the next control. The parent switched to existing short visible labels below 1200px. The fixed 768px screenshot was directly viewed; every cell fits (118/118, final 117/117). Final independent 1024px and 1025px readbacks also pass, all six cells at each width have clientWidth equal to scrollWidth (158px, final 157px). Their final screenshots were directly viewed.
- Medium, repaired and independently rechecked: the visible Unified search dialog originally left dots motion enabled. The parent added a dedicated presentation-only search-open store without changing the existing film-overlay owner. In the focused final actual UI retest, dialog open produces `data-dots-motion=paused` and hidden replay; Escape closes the dialog and returns motion to on with replay visible. The paused-search screenshot was directly viewed.

## Independent evidence

- Four focused `test/openai-dots.test.ts` tests pass. These are offline/source checks.
- `scripts/verify-openai-dots-ssr.mjs` passes against the local HTTP server: one canonical, indexability, direct answer, FAQ/schema parity, breadcrumbs, native radio markup, inbound links, sitemap, and accepted booking context. This is local SSR evidence.
- Actual full-page screenshots were saved and directly viewed at 320, 390, 768, 1024, 1025, 1440. Primary text/control bounds are clean apart from the repaired ruler cell. At 320, “more room.” stays on one line: text box y521.58, period glyph y531.58, within the same 78px line box.
- Ruler pointer preview changes the indicated chapter while aria-current stays at the current location; pointer leave restores the current indication. Keyboard focus previews the target. Native Enter to `#your-call` focuses `section#your-call`, target top89.69 / nav bottom65.80 (24px clearance).
- Native radio ArrowRight selects Make and Hand back, changes active radio focus, and displays only the matching panel.
- Replay produces real intermediate paper, character, and panel transforms at ~4, 75, 228ms and settles at ~630ms. The centered paper's final transform legitimately includes translate(-105,-130).
- Global Motion off settles transforms and hides replay. Mobile navigation open pauses and hides replay. Fresh OS reduced-motion with no session override pauses and hides replay.
- Route departure through the real Workflow Guides link disconnects the old dots root, deletes its motion dataset, and reverts retained inline transforms. A fresh return initializes normally.
- With script execution disabled, actual CDP pointer clicks select Make, display the Make panel, and open a FAQ with visible answer. A settled native `#begin` click updates the URL and lands at top112.69px with nav bottom65.80px, preserving CSS scroll clearance.
- Blocking `*node_modules/.vite/deps/gsap.js*` (the actual dynamic dependency URL from the served module) leaves native Make selection/panel and visible definition usable, replay hidden. This validates the native fallback under dependency failure, not a real Canon execution.

## Product judgment

The guide meets the approved measured-whimsy direction: black field, decisive white type, readable task labels, useful rule/tick structure, and an owned graphite Canon character beside a concrete task. The short movement explains selection without making the reading wait. Illustration disclosures remain visible; no fictional provider run or business conversion is implied.

The personal-dot story preserves a collaborator relationship and human review, consistent with the current OpenAI campaign's context, responsibility, feedback, and control emphasis (https://chatgpt.com/features/dots/ and https://openai.com/index/introducing-dots/ independently read). The native evergreen `/openai-dots` support guide is a suitable understand-stage placement: discoverable from workflows and partner context, a local example first, then an internal mapping session with self-map and service context. It does not imply OpenAI endorsement.

## Final gates

- Functional correctness: passed for the scoped local implementation. Both confirmed defects were repaired and independently rechecked. Rapid native-radio reversal returns to Gather, shows only its panel, and settles paper/character transforms by the 821ms final RAF sample. Evidence is local browser/SSR plus offline tests; it is not a real Canon run or business conversion.
- Perceptual/product quality: passed for the directly viewed six layouts and approved baseline, after the ruler and search-pause fixes. No unresolved visual finding remains in the checked states.
- Release readiness: untested for production. Parent owns build integration, permission, immutable shipping artifact, release, and live acceptance. No publication, booking completion, human acceptance, or provider outcome is established.

Artifacts: `independent-responsive.json`, six `independent-{width}.png`, `independent-768-top.png` (defect), `independent-768-fixed.png`, `independent-interactions.json`, `independent-interruption.json`, `independent-nojs.{json,png}`, `independent-import-failed.{json,png}`, `independent-final-retest.json`, `independent-{768,1024,1025}-final.png`, and `independent-search-paused.png`.

Browser handback: p1 returned to the parent on the normal local guide with JavaScript enabled, network blocks cleared, normal OS media, and original null session motion override. The reviewer did not finish the TaskSpace. Worktree remains retained and source-unmodified by the reviewer.
