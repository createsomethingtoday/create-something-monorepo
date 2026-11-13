# Canon production scope audit

Read-only source audit on 2026-11-13 for the user's new “deploy” instruction. Worktree: `t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`, base `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. Fetched `origin/main` observed at `70767b8d2`. No source edits, staging, package commands, tests, browser activity or external writes were performed. This report is the only audit write.

## Recommended artifact

All 154 tracked changed files inspected by path/stat and representative diffs fit the approved Canon foundation, shared families, consumer styling, documentation, registry and generated-token scope. No unrelated new business feature was identified in the local tracked diff. Preserve later upstream business features while integrating.

Include new Canon library sources/tests, `scripts/generate-foundation-artifacts.mjs`, the Agency consumer foundation check and current package guides. Preserve the private `/next` source examples when retaining their tests and reviewed framing. Exclude generated `+page.svelte.d.ts` and `seo-navigation-harness.svelte.d.ts`: the base repository tracks no `*.svelte.d.ts` sources.

### Canon static subset

Keep these 14 files, totaling **15,260,778 bytes**, so the current `/next` examples and all `TactileStudy` revision choices remain usable:

- `static/canon-next/approved-v1/body-r41.webp`
- `static/canon-next/approved-v1/head-r42.webp`
- `static/canon-next/approved-v1/gestures-r45.webp`
- `static/canon-next/approved-v1/welcome-bench.webp`
- `static/canon-next/approved-v1/connection-loom.webp`
- `static/canon-next/approved-v1/review-nook.webp`
- `static/canon-next/approved-v1/welcome-clean-plate.webp`
- `static/canon-next/portrait/welcome-bench-portrait.png`
- `static/canon-next/portrait/welcome-cta-portrait.png`
- `static/canon-next/portrait/welcome-cta-portrait-framed.png`
- `static/canon-next/tactile-head-optical-prototype.png`
- `static/canon-next/tactile-head-quiet-oval-prototype.png`
- `static/canon-next/tactile-head-filled-oval-prototype.png`
- `static/canon-next/filled-oval-body-framed-prototype.png`

The r11/r12 files are retained because the private component still declares those revision choices; current route diagnostics directly select r34. The r38 body remains visible in the comparison below the approved r41 body.

Omit `static/canon-foundation-review.html`, all four `static/canon-next/world/*.png`, the original r41/r42/r45 PNG copies, and the remaining unused historical character files from the production commit. The original PNGs remain in the approved root pack and research workspace. The two world PNG filenames found elsewhere belong to Agency's separate `/images/canon-study/` fixture, not the Canon `/canon-next/world/` path.

### LTD static subset

The live documentation source references only these two new files, totaling **947,122 bytes**:

- `packages/ltd/static/canon-next/approved-v1/welcome-bench.webp`
- `packages/ltd/static/canon-next/approved-v1/review-nook.webp`

The two `docs-landing-r25/*.png` files are unreferenced by current runtime and can remain local.

### Agency comparison fixture

The five `src/lib/components/canon-preview/` and `src/routes/canon-preview/` files are development-only. `+page.server.ts` returns 404 when `!dev`. Their five static `images/canon-study/` files total **9,249,119 bytes** and would still publish if committed.

For a minimal production artifact, leave this whole fixture and its assets local. Remove only its two-line `/canon-preview` addition from the staged `publicSurfacePolicy.ts` and the new seven-line fixture test from the staged `public-surface-policy.test.ts`. If preserving the fixture in Git instead, include all five sources and all five assets as a complete development fixture; do not leave a partial fixture that works only in the dirty checkout.

## Evidence and size

At the audit boundary there were 2,008 untracked files totaling **540,697,298 bytes**. Evidence accounted for 1,892 files and **480,900,040 bytes**. Do not blanket-stage `packages/`.

All evidence Markdown is modest: **57 files / 198,117 bytes**. Including those textual reports preserves report-to-report links without committing screenshot history. Original screenshot/JSON/log links in historical reports will still point to local evidence unless explicitly included; those reports must remain labeled checkpoint evidence rather than a portable complete evidence archive. The final source/export pack already supplies the approved images and independent acceptance.

## Upstream preservation hazards

The branch is **129 commits behind** the fetched main. Ten locally changed tracked paths also changed upstream:

1. `packages/agency/src/lib/data/publicSurfacePolicy.ts`
2. `packages/agency/src/routes/+layout.svelte`
3. `packages/agency/src/routes/login/+page.svelte`
4. `packages/agency/src/routes/map/+page.svelte`
5. `packages/agency/src/routes/scopefield/+page.svelte`
6. `packages/agency/static/styles/agency/story-home.css`
7. `packages/agency/test/paper-brand-cohesion.test.ts`
8. `packages/agency/test/public-surface-policy.test.ts`
9. `packages/canon/README.md`
10. `packages/canon/src/lib/components/Navigation.svelte`

The one upstream-added/local-untracked collision is `packages/canon/src/lib/components/navigation-dropdown.test.ts`. Its 5,591 bytes are **identical** to `origin/main`; either copy is safe.

Preserve upstream Agency measured public/account styling, chapter wayfinding, account/public classifiers, Atlas shell exclusions, Meta account opt-out binding and current authentication/business flow code. The old local layout's simple wrapper/footer changes should be integrated into that newer structure, not replace it. Preserve upstream navigation behavior while applying the approved Canon palette/geometry changes.

## Gates

- Functional correctness: **untested by this audit**. This is source and scope analysis; earlier R40 local acceptance is separate. Rebased source needs its own affected checks.
- Perceptual/product quality: **untested by this audit**. No pixels were viewed in this task.
- Release readiness: **pending**. A scoped source set and conflict map are identified. Parent owns integration, final independent retest, promotion and live acceptance.
