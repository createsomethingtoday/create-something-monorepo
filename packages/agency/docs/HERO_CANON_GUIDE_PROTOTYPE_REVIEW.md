# Agency hero and Canon guide prototype

Review only. Branch `codex/agency-hero-guide-prototype`, based on published main `9868098f297c110095f6f0d669d135f7a4fda70f`. Tracking: CRE-2210. No push, merge, or deployment is authorized for this prototype.

## Buyer experience

Follow-up: the existing canvas motion strip is restored directly below the hero in a compact visual-only mode. The service journey follows it; the strip does not repeat the journey copy. Other uses of the component keep their original heading, stages, and continuation. Existing reduced-motion and visibility pause behavior remain intact.

The opening now leads with “Keep your tools working.”, one explanatory sentence, and the existing workflow booking flow. A restrained, illustrative Diagnose → Engineer → Learn journey replaces the homepage signal band. It includes an explicit customer agreement gate and a checked handoff with instructions. The journey is real text, stacks vertically on mobile, and requires no motion or hover.

Existing proof and membership details remain lower on the page. Prices, contractual terms, ownership boundaries, separate Control scope, and incident exclusions are preserved at the existing purchase surfaces. No pricing, contracts, credentials, runtime endpoints, or external accounts were changed.

## Canon guide boundary

Ask canon is optional. It explicitly identifies itself as a local prototype with scripted answers from published service pages. Three fixed questions cover tool fit, service fit, and membership contents. Sources link to the relevant public pages. An inquiry preparation checklist leads to the existing booking flow.

The guide uses browser-local component state only. It sends no messages, calls no provider or backend, stores no visitor data, and grants no access. It supports keyboard operation, focus return, Escape, reduced motion, and a disabled trigger before hydration. The primary CTA remains usable without JavaScript.

Existing `/api/canon/agent` is a delivery workflow with internal context and approval/activity overlays. Existing `/api/atlas/public-agent` can call OpenAI and persist visitor interactions. Neither is an approved public marketing guide runtime, so neither is reused.

Before a live AI guide, approve a public-only provider/runtime and visitor message transmission, its public corpus and citations, privacy and retention, rate limits, and policies for unsupported commitments and prompt injection. Existing provider configuration alone does not settle those decisions.

## Validation and evidence

- Agency check passed: 171 tests; zero Svelte errors or warnings.
- SEO/AEO check passed: 84 pages / 47 routes; marketing checks passed: 13 tests.
- Cloudflare build passed. Workspace lint passed its supported check; Agency has no direct lint script.
- 27 browser assertions passed on the built local preview: keyboard/focus flows, question and scope navigation, cited service boundaries, booking navigation, repeated open/close, desktop and mobile overflow, reduced motion, no-JavaScript CTA, and no guide network submission. No page errors were observed.
- Independent copy/runtime review found no remaining prototype blocker.

Screenshots and browser receipts are retained in `output/playwright/hero-guide/` (ignored evidence): `Agency-hero-and-service-journey-desktop.png`, `Agency-lighter-hero-mobile.png`, `Agency-service-journey-mobile.png`, `Canon-local-service-guide-desktop.png`, `Canon-local-service-guide-mobile.png`, and `flow-checks.json`. Screenshot copies are also saved to ChatGPT Library.

Worktree disposition: retained at `agency-hero-guide` until user review. The published release and unrelated dirty source work remain untouched. Local preview: `http://127.0.0.1:4175/?review=motion-final` while the review server is running.

Motion follow-up validation: Svelte check reports zero errors/warnings; existing check suites passed after rerunning the 33 contact tests with local-server permission; Cloudflare build passed. Browser verification confirms animated canvas changes, a static canvas with reduced motion, no repeated strip copy, no mobile overflow, and no page errors. Updated screenshots: `Agency-restored-motion-desktop.png` and `Agency-restored-motion-mobile.png`, also saved to Library.
