# CRE-2457 independent final actual-output retest

Reviewer: independent Sol 6.1. Scope: read-only source and existing local Vite runtime at http://127.0.0.1:5192; branch t3/canon-hero-hand-repair. No source edits, build, sync, server management, Git mutations, form submission, or provider actions. Evidence writes are confined to this review directory.

## Verdict

No blocker found in the scoped local repair. The delivered wide hero passes the visual and behavioral acceptance criteria.

- Functional correctness: PASSED for local rendered behavior. Home checked at 320, 390, 768, 1024, 1025, 1440; /services and /openai-dots at 390/1440. Correct image switching; document width does not exceed viewport; heading, descriptive copy and actual HTML links remain readable. Keyboard traversal reaches the hero primary CTA with a visible white 2px focus outline and 3px offset. Enter reaches #next, at scrollY 9553 with target top 96.4px. No-JS home at 320/1440 retains text, links and appropriate artwork. Reduced motion at 1440 retains the repaired wide image and produces no running document animations. This is browser/runtime evidence, not an offline fixture result. Package checks/build/retirement guards were not independently rerun because the parent prohibited those commands; their earlier pass is outside this review's evidence.
- Perceptual/product quality: PASSED. Directly viewed both original cook/refs/hero-wide-study.png and exact delivered hero-wide-v2.webp, then the rendered captures. The anatomical-left paper-holding hand now connects naturally to the shoulder through a short, bent felt sleeve, stitched cuff and wrist. No floating joint or extra limb is visible. The short squat felt character, paired oval eyes and smile, lamp, paper stream/trays, notebook, feet, warm wood, and left-side negative space retain the approved identity and composition. The arm reads clearly at 768/1024/1025/1440 as well as the shared desktop scenes. Portrait layout remains visually consistent at 320/390. Score: anatomy 9/10; identity/composition 9/10; rendered readability 9/10. This review is scoped to the hero repair and its representative reuse, not a new whole-site design acceptance.
- Release readiness: UNTESTED for production promotion. Local candidate review passed; deployment, production cache behavior, production artifact response bytes and live production acceptance are parent-owned and were not exercised. No release blocker was discovered within the local visual/runtime scope. The parent must preserve its scope review, required build/guards and exact-artifact production verification before closeout.

## Exact artifact and behavior receipts

- Delivered wide WebP SHA-256: d54e314368191928e0a2e45cb13fcb36dc7571479474814f8469049415760346.
- Portrait WebP SHA-256: 5c757719910287ef3d2c9ecb7bdf73bd95804be2164fa1ecd52a497f913dcd88, exactly matching the protected expected value.
- Home computed background and matching preload: portrait v1 at 320/390, wide v2 at 768/1024/1025/1440. Shared /services and /openai-dots backgrounds: portrait at 390, wide v2 at 1440. All inspected image-bearing elements/pseudo-elements have computed filter: none. No image-filter repair was used.
- runtime.json records the ten route/width checks. At home 320, three off-edge decorative IMG bounds were reported by a broad element scan, while document/body scroll width remained 310 for a 320 viewport. The viewed page has no horizontal document overflow; this is not a repair regression.
- behavior.json records shared computed image selection. Its exploratory tabs/anchor section stopped at the chapter #next link and is superseded by accessibility.json plus the final home-1440-keyboard-focus.png, which verifies the actual hero CTA.
- accessibility.json records the actual hero primary CTA, native anchor outcome, reduced-motion and no-JS checks. The focus screenshot was recaptured after hydration and removal of the brief wordmark intro; the final screenshot directly shows the visible CTA focus ring.
- Full hero remains visible in home-768-complete-hero.png. The mobile /openai-dots image is fully visible in openai-dots-390-scene.png after an instant scroll to 650px. No-JS captures naturally show the static expanded navigation; the underlying hero remains readable.

## Browser disposition

Used only existing TaskSpace 29 / p1. Cleared device metric overrides, restored script execution, cleared media overrides and left p1 at about:blank. Did not finish or close the parent's TaskSpace. No network override was installed, and no browser storage/clipboard writes were performed by the reviewer.
