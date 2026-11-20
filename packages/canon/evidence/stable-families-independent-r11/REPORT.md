# Independent stable-family R11 review

Read-only source review of current dirty t3/canon-design-system-redesign, HEAD 5f9bfab3f. Only this evidence directory written. Own Ego space 35; parent 12 untouched. No subagents, package/sync/check/build, commit, push or deploy.

## Material finding

**Functional correctness: failed compatibility acceptance.** IntegrationFlow's solid branch ignores explicit `showConnectors` and `animateFlow`. The actual `/next/filters` stable specimen supplies both but renders zero SVG connectors or particle animations, while the glass opt-in specimen has two connectors. HEAD previously rendered requested connectors and particles even with default `glassMode='solid'`. A solid owning palette does not require silently disabling explicitly requested behavior. Preserve the opt-in behavior with semantic solid styling and reduced-motion handling, or obtain an explicit compatibility decision. The unused else branch and duplicate service-name in the solid-only content snippet are cleanup observations, not an additional visible defect.

## Independent checks that passed

Direct `node node_modules/vitest/vitest.mjs run src/lib/filtering/filter-flow-r10.test.ts src/lib/interactive/TimelineEditor.test.ts` passed 5/5 (2 files). These include source contracts and simulated DOM observer teardown/batching/callback checks, not live runtime proof.

Actual local Chromium: all 12 filter checkbox AX names match visible labels; Wood, Seating and In Stock plus both price keyboard adjustments emitted exactly Wood/Oak/Walnut/Birch/Teak, seating, in_stock, priceMin60000, priceMax240000 after five callbacks. Collapse removes inputs and exposes false aria-expanded; re-expand and Clear All Filters restores `{}`. All measured checkbox targets44x44; ranges200x44. Keyboard focus exposed a 2px visible ring. Stable integration names/order remain visible with missing custom icons; solid owning surfaces and text switch with palette.

Timeline actual editor ArrowRight produced frame13, ruler scrub frame30, zoom125% then100%; visible editor focus ring directly viewed. Actual background pixels match owning light247/248/246 and dark0/0/0 including nested inverse ownership and live reversal. Live inherited CSS alias produced exact track-label pixels12/84/123. Buttons measured44x44. Observer release is covered by focused simulated test, not an independently instrumented browser teardown.

Both routes captured at320,390,768,1024,1025,1440 in both owning palettes; no horizontal overflow. JSON records dimensions and pixel/target evidence. All four contact sheets directly viewed, plus full desktop-focus, reduced-motion and no-JS screenshots. At320 timeline plotting area is compact because of140px labels; this is an inherited bounded usability limit. Contact timeline headings reflect fixture's original reactive labels when DOM themes were independently reversed; theme attributes and canvas pixels establish actual ownership. No-JS keeps named filters, service names and timeline explanation/track-summary control. Reduced motion hides optional glass particle circles. No final character/art acceptance.

**Perceptual/product quality: passed for bounded stable-family specimens**, subject to the connector compatibility failure above. Solid dark/light surfaces, labels, ordering, responsive containment and actual nested canvas colors are readable and consistent with the migrated contract. Explicit glass retains legacy pale icon treatment in light mode; it is outside solid-default acceptance.

**Release readiness: untested for shipping.** Local review only; functional blocker above must be resolved. Parent owns full integration checks, release authorization and final art. No production runtime evidence or publication performed.

Two adapted builder browser-script attempts stopped on an emulation convergence wait after successfully executing desktop interactions/alias; subsequent bounded direct canvas readback and screenshots completed all widths. They are not claimed as passing whole-script runs. `timeline-retest.mjs` preserves that attempted procedure; `timeline.json` and `alias.json` hold final direct evidence.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190 / t3/canon-design-system-redesign for parent integration. Ego update available; no upgrade performed.
