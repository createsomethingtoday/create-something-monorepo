# Canon workshop tour

Original Agency campaign illustrations generated with the built-in `image_gen` tool on November 4, 2026. Exact prompts are in `prompts.json`; PNG masters are retained here. Optimized 1536 × 1024 WebP siblings live in `static/images/agency-sales/` (about 177 / 229 / 172 kB). Reference identity: the existing `team-handoff-v1.webp` campaign asset.

Canon (graphite cube head and antenna) and the porcelain and spherical agents assemble, measure, and review the same workshop mechanism. These are labeled concept illustrations, not evidence of client delivery or actual software test results. The guide deliberately has empty inspection boxes.

## Interaction direction

- [Scroll Hotspot Tour](https://gsapvault.com/effects/scroll-hotspot-tour): adapt scroll-led scene focus and explicit stage identity to native page scrolling.
- [Image Hotspot Explorer](https://gsapvault.com/effects/image-hotspot-explorer): adapt artifact-anchored selection and connected detail text. Keep the complete scene visible; no drag requirement or touch scroll capture.
- [Split Text Stagger Reveal](https://gsapvault.com/effects/split-text-reveal): adapt its masked word variant, restrained rotation/blur, and sharp staggered settle. Replace the old handoff heading alignment and image aperture timelines. No colored fringes.
- [MotionPath Waypoints](https://demos.gsap.com/demo/motionpath-waypoints/): use Canon as a guide between the three named story stops. The embedded CodePen refused to connect; the official ten-second demonstration video was inspected at multiple positions. Use original paths and character art, with no autoplay loop or character rotation.

All three public demos were inspected in ego-browser. The implementation is original; no paid source or third-party imagery is included. The TASTE motion packet was consulted; [Are.na 42611632](https://www.are.na/block/42611632) was visually inspected for text sequencing but its neon decoration was rejected. Other packet entries (Gemini/Liquid Glass) did not directly address this workshop interaction and were not adopted.

`canon-guide-cutout-v1.png` is an original transparent character master; `cutout-prompt.json` records its generation. The 307 × 384 WebP preserves alpha and weighs approximately 28 kB. It carries a paper guide and points toward the next stage; its movement represents story position, not autonomous execution.

CTX searches supplied historical character and interaction context, corroborated against the current source and live Agency page. Retrieval reported 1,015 skipped history records; coverage is not complete. The current graphite-workshop contract remains `docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md`.

## Acceptance and release

Tracked in CRE-2351. Validate original reveal removal, all three scenes, reversible scrolling, keyboard/touch disclosures, focus retention, full settled text, 320–1440 px layouts, reduced motion, and no-JS content. Preserve CTA, navigation, pricing, team credits, and ownership qualifications. A local browser pass and build are separate from production deployment verification.

Regression commands:

```sh
pnpm --filter @create-something/agency test:workshop-tour
# With Agency dev server running on port 4186 and ego-browser available:
ego-browser nodejs < packages/agency/scripts/verify-workshop-tour.ego.mjs
```

The browser regression exercises actual waypoint positions at six widths, link selection, keyboard disclosure, focus retention, and immediate reduced-motion selection after resize. It caught a CSS-translation leak into the first path position, a race between waypoint links and global hash navigation, and the global reduced-motion rule creating a 0.01ms transition on position. The final guide uses responsive percentage coordinates, local native scrolling, and a scoped `transition: none !important` override. The controller tests cover stale animation callbacks, reversal, teardown, and immediate motion-block settling. Screenshots and the no-JS review remain necessary to assess composition and readability.

Rollback: revert the scoped CRE-2351 commit and deploy the previously verified Agency artifact. The prior image remains available as `team-handoff-v1.webp`.
