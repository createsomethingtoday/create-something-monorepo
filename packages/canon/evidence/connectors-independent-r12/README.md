# Independent Sol retest r12

Scope: parent connector repair and r11 runtime limits. Source read-only. Ego space 37 closed; protected parent space 12 untouched. No installs, package sync/check/build, source changes, commits, or deployments.

## Functional correctness: passed, bounded local evidence

Direct `./node_modules/.bin/vitest run src/lib/interactive/integration-flow.test.ts src/lib/filtering/filter-flow-r10.test.ts` from packages/canon: 2 files, 7 tests passed. This is offline source regression evidence, not production proof. Reviewed implementation: common content preserves props, default solid, stable per-instance IDs, userSpaceOnUse gradient/filter bounds. Parent supplied pre-fix failures; this reviewer did not revert source to independently repeat red.

Actual /next/filters: 320/390/768/1024/1025/1440, explicit owning light and dark toggled through header button. All 12 states have two connectors and no horizontal overflow (flow.json). Captures were replaced after detecting the first harness had targeted HTML rather than the owning fixture theme. Final captures use confirmed owning data-theme, immediate centered scroll and two RAF. Directly viewed mobile 320 light/390 dark and all tablet/desktop light/dark screenshots: connectors visibly paint, vertical connectors have space between service names and following icons, horizontal connectors align with icon centers. Remaining 320 dark/390 light captures exist; their visual assessment is not independently claimed. Reduced-motion runtime: all four solid/glass circles display:none, paths remain inline (reduced-motion.json). Smooth glass opt-in directly viewed in glass-dark.png and still visibly renders glowing connectors.

Explicit light /next journey: actual theme button changed to Use dark appearance, then Tab/Enter/Space traversal from theme control through welcome → choose recap → scope checkbox → plan → Start simulation → Continue simulation → review → Record approval → Try another task → welcome. No pointer clicks or scripted app-state edits during traversal after initial theme setup; focus followed step headings. Snapshots observed each state including sample approval receipt. This closes the prior full keyboard completion limit for one happy path at desktop; all task variants/failure/edit paths were not repeated in this pass.

Agency /delivery: actual JavaScript-disabled reload at six widths, zero overflow (agency-nojs.json), readable CTA, action and retained artwork. No-JS screenshot loop cannot wait on RAF because script execution is disabled: synchronous layout reads and screenshot paint were used. Initial disabled-JS async RAF call timed out and was discarded/reloaded. Directly viewed no-JS 320/390/768/1440; 1024/1025 captures exist but were not separately viewed.

## Perceptual/product quality: passed for bounded repair and intrinsic composition; overlay caveat remains

Actual /delivery JS six-width screenshots directly viewed. CTA copy and art occupy separate regions at all widths, with full artwork frame able to be read by scrolling on narrow screens. At mobile, placing footer about 180px below viewport top makes heading, description and membership action entirely clear of the fixed nav and PRIVACY tab. A real wheel scroll at320 revealed later artwork. The r11 flush-to-top capture is not evidence of permanently hidden heading content: the content can be moved into the clear reading region. Existing fixed overlays remain a genuine integration constraint: top navigation/privacy occupy persistent screen areas and desktop bottom widgets can cover text/art at particular scroll offsets. This pass does not certify a literal zero-overlay-at-every-offset criterion and does not authorize chrome/privacy edits. It finds no intrinsic CTA art/copy overlap or unrecoverably hidden CTA content.

Explicit /canon-preview?surface=delivery&variant=proposed rendered and directly viewed at1440 (hero and footer captures): proposed scene hero remains, footer keeps property-owned playbook-footer-decision-gate-macro.webp rather than replacing it with a Canon scene. The fixture remains labeled awaiting portrait/composition approval. No new art approval implied. Other fixture widths not repeated.

## Release readiness: untested / publishing unapproved

No build or deployable-artifact checks in this scoped retest. Parent owns final integration, artifact gates and shipping authorization. Local preview evidence is not production acceptance.

Ego update notice appeared; no upgrade performed. Worktree disposition: preserved at parent-owned t3-a01044d6-2f560e0ec9e58190 / t3/canon-design-system-redesign.
