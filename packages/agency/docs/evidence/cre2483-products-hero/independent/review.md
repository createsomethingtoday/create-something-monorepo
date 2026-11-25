# CRE-2483 independent final re-test

Acceptance: approved PNG unchanged; q90/m6 faithful WebP; /products-only hero integration with live copy and recordings preserved; neutral surround; Canon and all three workflow modules visible at 320,390,768,1024,1025,1440; readable copy, no horizontal overflow; keyboard CTA, native disclosure, no-JS and reduced-motion review.

Functional correctness: PASSED for scoped local runtime. Six fresh Ego captures have innerWidth 320,390,768,1024,1025,1440 and matching PNG widths, each height1300. responsive.json records layout rectangles and scroll widths (all below innerWidth). After hydration the keyboard-activated hero CTA reaches #capabilities at scrollY2462.5, target top89.64. Native first disclosure opens with Enter. With script execution disabled, hero and copy remain visible and CTA hash/disclosure work. Video element remains the actual cato-client-study.mp4 with its recording poster. No full check/build rerun: parent owns successful check/build evidence. An immediate post-navigation CTA before hydration settled changed hash without scrolling; hydrated retry passed. This is a timing limitation of the test and unchanged anchor interaction, not a new route change.

Perceptual/product quality: PASSED. Independently viewed actual PNG, actual WebP and all six fresh rendered captures. Neutral pale oak, ivory, textured charcoal Canon and black surround remain faithful; conversion has no visible composition/color degradation. All three module groups and Canon survive every required viewport. Live heading, lede and CTA are clear and unobscured. 1024 stacks art under copy;1025 switches to side-by-side cleanly. The 1440 capture is truly1440x1300. No-JS capture directly viewed: expanded native navigation is taller but content remains readable and complete. Reduced motion emulation verified true in its own invocation and captured; existing component still reports two running animation objects, so this review does not establish that every inherited global animation is suppressed. New hero art is static and introduces no animation.

Release readiness: PASSED for promotion preparation; production acceptance UNTESTED. Diff contains route-only hero setup/styles and public HTML revision products-approved-hero-20261116; no shared component/static stylesheet edits, no copy/recording changes. Approved master retained. Independent cwebp -q90 -m6 output matches deployed-candidate WebP exactly. No app edits or release operations performed; parent owns source staging boundaries, promotion and live verification. Existing untracked cre2480-review artifacts are outside this scoped release.

SHA256:
- PNG c7fead8f2f4336cfd3fdae70a16b3e5d1248917a933eb9afa1913351d7d05037
- WebP cf45791bce31b1a2a1ad11094e9acd760e393cf7dcdc8b32e8f6f65902d05868 (1670x941,55256 bytes)
- src/routes/products/+page.svelte 38a016e6243827a4c9afc444af75161258401585463c618d9e509deb47e0c72c
- src/lib/server/public-html-cache.ts e765bb66c12ab97d3c9d2624c4830f7e9a88886fdf26adb6c555e1965782d057

Ego taskspaces closed; dev server left running. No app source changed.
