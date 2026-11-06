# Agency hero warmth

CRE-2360 implements the approved comparison of the existing homepage hero, a lighter overlay, and a new image composition. Built-in `image_gen` created two homepage masters and edited the illumination of the existing Services and Agent Foundation scenes. Exact prompts are in `prompts.json`; tool model/quality identifiers were not exposed. PNG masters and the optimized versioned WebPs are retained without overwriting prior assets.

The approved first-party Build scene in `canon-workshop-tour-20261104/canon-build-v1.png` supplies character, material and lighting direction. Soft window light, graphite midtones, cream porcelain/paper and credible tool contact carry warmth. Existing Canon backgrounds and typography remain authoritative. No third-party imagery was used. The TASTE layout packet was consulted during the preceding review; its returned interface/motion references did not establish a relevant workshop-lighting precedent and were not adopted.

These are conceptual illustrations, not product screenshots, execution traces or client-delivery evidence. Existing commercial copy, CTA destinations, story boundaries and service captions remain unchanged. The homepage image alt text states its conceptual status.

## Composition

- Desktop: the headline and label row have a separate left lane. The right-aligned image retains all three characters and their shared mechanism. A shallow edge fade joins it to the existing charcoal background.
- Mobile/tablet through 900px: a dedicated square scene follows the headline and CTA. The complete frame is contained rather than cropped behind text.
- Services: preserve the paper jam, opened machine and diagnosis action. Edit illumination only.
- Agent Foundation: preserve one agent, one bounded machine and the blank handoff notebook. Edit illumination only.
- Responsive source selection and media-qualified image preloads avoid downloading the desktop master for mobile. Optimized images are 116–164 KiB each. Dimensions and hashes are in `asset-manifest.json`.

## Acceptance and validation

Check 320,390,768,1024,1025,1440px; normal/reduced motion; keyboard focus; homepage without JavaScript; loaded route-specific images; no horizontal overflow; and copy/subject separation. Review actual rendered images against the Build reference. Functional geometry does not establish perceptual quality.

The before-change mobile regression failed: the baseline had no complete scene below the copy and cropped collaborators behind the headline. A lighter desktop overlay exposed more detail but retained the overlap. The selected composition resolves both causes.

Run `ego-browser nodejs < packages/agency/scripts/verify-hero-warmth.ego.mjs` after setting its explicit task-space/base/evidence constants to the active operator-owned test space. Parent owns space lifecycle. Run `pnpm --filter @create-something/agency check` and `pnpm --filter @create-something/agency build` in the isolated worktree. Production verification is separate from local acceptance.

## Rollback

Revert the scoped CRE-2360 PR and redeploy the prior verified Agency release. Prior `hero.webp`, `services-diagnosis.webp` and `foundation-single-job.webp` remain intact. Reverting restores their references, the previous homepage presentation and the prior cache revision. Never reset or clean the unrelated root checkout to perform rollback.

## Validation evidence

The Agency package check passed with zero Svelte errors/warnings. The browser suite initially caught a 1024px cover-crop overlap, then passed all 21 cases after full-frame containment and the bounded control/CTA repairs below. The suite also waits for homepage hydration and the intro overlay to settle before capturing visual evidence. Final production-build review and deployment receipts are recorded in Linear CRE-2360.

## Findings repaired during independent review

- Keep the desktop image inside the hero: its height is capped at the 650px hero minimum so it cannot paint over the preceding motion control. The browser suite preserves that geometry check.
- The live Foundation baseline also dimmed mobile copy: a retired editorial-background scrim remained above unboxed text after the separate figure was introduced. A Foundation-only rule removes that obsolete scrim; screenshot review verifies the actual copy.
- A cold long homepage jump to `#next` could stop midway as the lazy workshop images loaded and the existing scroll runtime refreshed. A captured failure stopped near scrollY1263 with the destination still5089px away; a warmed-cache retry succeeded. This target now explicitly requests an immediate jump through the existing hash handler. Other anchors retain their behavior. Cold-cache normal/reduced tests reached the destination at89/112px below the top.

The expanded Agency check passed again with zero Svelte errors/warnings. The 21-case dev browser suite passed. Independent final production-build re-test and promotion evidence remain in CRE-2360.
