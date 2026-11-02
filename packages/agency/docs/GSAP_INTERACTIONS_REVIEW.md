# Agency GSAP interactions — CRE-2318

Scope: Automation. Current Agency homepage and Canon's opt-in scroll action.
No content, pricing, navigation, hosting or Source/Astro migration changes.

Acceptance:

- GSAP drives the 12 authored one-time scroll entrances (16px, Canon complex timing/easing). Initial viewport and restored scroll remain immediate; native scrolling stays native.
- CTA arrows move 3px on fine-pointer hover, reverse on leave, and settle for keyboard focus, reduced motion and teardown. Controls retain their hit areas.
- Learn/Build/Run selection updates state and accessible caption immediately; the current image reveals after native load, with repeated selections remaining consistent.
- SSR/no-JS content, reduced-motion mount/change, focus/hash, existing transforms, nested targets, lifecycle cleanup, disclosures and walkthrough remain usable.
- Rendered behavior checked at 320, 390, 768, 1024, 1025 and 1440px; no horizontal overflow.

Context: `ctx search 'agency scroll animations GSAP Webflow Source Astro' --refresh off --verbose` and narrower Agency/scroll searches returned bounded history with candidate-limit warnings. This was historical orientation, not live authority. Current origin/main source was inspected. Canon already uses GSAP 3.15.0; Agency declares that same pinned dependency. DOM-only micro-interaction code can be evaluated for later Astro reuse; Source compatibility has not been established.

TASTE: inspected two frames of the sole image-bearing reference in the three-result motion packet, [Are.na 42611632](https://www.are.na/block/42611632) (Interface Motion). It illustrates moving objects around a stable text field; retain the stable reading surface, reject the animated collage/decorative treatment. Google Gemini and Apple Liquid Glass resources returned in the packet were not visual evidence for this task. Canon and the existing Agency composition remain authoritative. GSAP lifecycle behavior was checked against [official matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).

Verification commands:

- `pnpm --filter @create-something/canon exec vitest run src/lib/motion/scroll-entrance.test.ts`
- `pnpm --filter @create-something/agency check`
- `pnpm --filter @create-something/agency build`
- `pnpm --filter @create-something/agency exec node scripts/verify-scroll-entrances.mjs`
- `pnpm --filter @create-something/agency exec node scripts/verify-home-interactions.mjs`

Browser checks use real rendered GSAP opacity/transform states rather than WAAPI instrumentation. A demonstrated interaction between GSAP style restoration and the global 0.01ms reduced-motion CSS reset created transient CSS transitions. The scoped GSAP targets disable CSS transition ownership; the browser regression checks exercise this restoration.

Release: CSS query revision and internal HTML-cache revision advance together. Production remains blocked by the current Ground v0.5.4 immutable release gate: five consumer smoke receipts and CONSUMER-SHA256SUMS are absent from release assets. No gate bypass, production deployment or Webflow Cloud migration is part of this candidate. Rollback is revert this scoped commit and redeploy through the same qualified gate. The original dirty checkout is preserved.

Worktree disposition: retained at /tmp/agency-gsap-interactions, branch codex/agency-gsap-interactions, until review/release checkpoint.

Validation results: focused Canon tests passed 11/11; full Agency check passed with zero Svelte errors/warnings; production build passed. Both six-width browser suites passed against the development runtime. Existing walkthrough theater suite passed six viewport configurations and denied-play fallback. Parent directly inspected rendered desktop/mobile composition; independent review recorded separately. These are local browser/runtime checks, not production deployment evidence.

Final artifact verification: repeated both browser suites against Vite's compiled production preview at http://127.0.0.1:4199. All six widths passed in both suites; receipts: /tmp/agency-gsap-built-scroll/results.json and /tmp/agency-gsap-built-interactions/interactions.json. This verifies the locally compiled output, with no claim of live Cloudflare deployment. Independent Sol 6.1 final review passed functional and perceptual gates; release readiness failed at the existing Ground gate. See GSAP_INTERACTIONS_INDEPENDENT_REVIEW.md for sampling and fixture limits.
