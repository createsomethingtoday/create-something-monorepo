# Agency hero and Canon guide composition review

Review only. Branch `codex/agency-hero-guide-prototype`, based on published main `9868098f297c110095f6f0d669d135f7a4fda70f`. Tracking: CRE-2214 (centering and character refinement), following CRE-2212 and CRE-2210. Publication is paused pending review of this revised composition; no push, merge, or deployment was performed.

## Buyer experience

The left copy is vertically centered against the motion scene in the main row. The guide has its own row beneath the scene; opening an answer does not move the headline. The left side leads with “Keep your tools working.”, one explanatory sentence, and the existing workflow booking flow. The right side shows a restrained four-scene SVG story: a form stops reaching the team, the customer approves the change, engineering implements and checks it, and instructions preserve the lesson. The optional Canon guide and three suggested questions sit below the scene. The established character appears beside Ask canon at 56px, using the existing local CanonCompanion assets. It performs one brief wave on guide opening on desktop, then returns to idle. Mobile, site/OS reduced motion, hidden-tab, and offscreen safeguards preserve a still character.

The scene begins as a readable still. Desktop playback is user-started, silent, lasts roughly 14 seconds, and ends after one sequence. Pause/resume, offscreen pause, and hidden-tab pause avoid unattended playback. Mobile and reduced-motion views remain static; SVG and real text preserve the meaning without JavaScript or motion. The stage caption reserves its height to prevent layout shifts.

The strip below the hero remains as a shorter, quiet static workflow trace so it does not compete with the hero. The real-text Diagnose → Engineer → Learn journey follows, with an explicit customer agreement gate and checked handoff. Existing proof and membership details remain lower on the page.

Prices, contractual terms, ownership boundaries, separate Control scope, and incident exclusions remain at the existing purchase surfaces. No pricing, contracts, credentials, external accounts, or production runtime endpoints changed.

## Canon guide boundary

Ask canon explicitly identifies itself as a local prototype with scripted answers from published service pages. Three fixed questions cover tool fit, service fit, and membership contents; cited sources link to public pages. The inquiry preparation checklist leads to the existing booking flow.

The guide uses browser-local component state only. It sends no messages, calls no provider or backend, stores no visitor data, and grants no access. Keyboard operation, focus return, Escape, repeated answers, and mobile answers are supported. Its trigger and suggestions are disabled before hydration; the primary booking CTA works without JavaScript.

Existing `/api/canon/agent` is a delivery workflow with internal context and approval/activity overlays. Existing `/api/atlas/public-agent` can call OpenAI and persist visitor interactions. Neither is an approved public marketing guide runtime, so neither is reused.

Before a live AI guide, approve a public-only provider/runtime and visitor message transmission, the public corpus and citations, privacy and retention, rate limits, and policies for unsupported commitments and prompt injection. Existing provider configuration alone does not settle those decisions.

## Tools and validation

Recommendation: retain native SVG, CSS, and the existing Svelte motion preference for this compact scene. It needs no new animation dependency, streamed video asset, external service, or Hyperframe installation. A richer cinematic treatment can be evaluated separately if this composition warrants it.

- Final Agency check passed: 171 tests; zero Svelte errors or warnings.
- SEO/AEO check passed: 84 pages / 47 routes; 13 marketing tests passed.
- Final Cloudflare build passed. Workspace lint passed its supported check; Agency has no direct lint script.
- 60 final browser assertions passed on the built local preview: desktop placement, motion phases, keyboard play, pause/resume, offscreen behavior, site/OS reduced motion, mobile static fallback, source links, repeated guide/scoping flows, focus/Escape, no overflow, finite playback, stable caption layout, and no-JavaScript fallback. No guide submission/runtime requests or page errors were observed.
- Independent source review found no remaining blocker. Additional refinement checks verify exact copy/scene centering, no headline movement when the guide opens, established character asset and scale, one hero character, brief desktop wave, idle recovery, and static mobile/site/OS reduced-motion behavior.

Browser receipts and inspected screenshots are retained in `output/playwright/hero-guide/` (ignored evidence). Current inspected screenshots: `Agency-centered-hero-desktop.png` and `Agency-centered-hero-mobile.png`, saved to ChatGPT Library. Receipts: `centered-flow-checks.json` (38 checks), `centered-extra-checks.json` (8), `centered-character-checks.json` (14), and `centered-library-receipt.json`. The preceding composition motion recording remains in `Agency-right-story-motion.mp4` and its animated GIF; it demonstrates the unchanged workflow sequence before these alignment/character refinements. The Library receipt records exact current preview IDs.

Worktree disposition: retained at `agency-hero-guide` / `codex/agency-hero-guide-prototype` until composition review. Published release and unrelated dirty source work remain untouched. Local built preview: `http://127.0.0.1:4181/?review=centered-final` while the review server is running.
