# Independent source-contract review R28

Reviewed 2026-11-13. Read-only source and asset-byte review on branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`, intentional dirty implementation. Only this evidence directory written. No app edits, tests/build/check, browser, server, image viewing, promotion or external writes.

## Pending index synchronization

**Known parent-owned checkpoint: current review index still identifies superseded body and material gate.** `packages/canon/LOCAL-REVIEW.md:67-71` labels its table “Current evidence and limits”; line70 says “bodyr38 remains provisional” and full-resolution material refinement is pending. Current `src/lib/character/README.md:11-27` identifies r41/r42/r45 and distinguishes opaque r41 material acceptance from the r42 large-cutout limitation. Root `cook/CHARACTER-SYSTEM.md:9-14` likewise describes accepted r41 black-body material. The index is linked as current gate status by character README:77-79. Parent confirmed this known R19 index awaits the fresh R29 combined integration report and will update its current table then, keeping integrated retest, human approval and release gates open. The R19 section heading does not sufficiently qualify an explicitly current gate table.

## Independently checked contracts

- `CanonCompanion.svelte:3-6`: exactly 96px renders static r42; 24/32/48/64 render Canon text. No state prop or image switching.
- `TactileStudy.svelte:8-16`: 1254-square source, extent912, top131 and center622.5 frame the documented 888×912 alpha>8 region into 96px: visible width approximately93.47px. Earlier heads remain diagnostics.
- `/next/character/+page.svelte:14-20,32-44,57`: six named captions; readiness disables local controls before hydration; r41 is recommended, r38 explicitly earlier; r45 source1536×1024 framed as six512px cells, maximum200px width each. State text explicitly says static image, local simulation and no live operation. CSS, not runtime expressions, selects editorial cells.
- Independent PNG header and SHA256/exact-byte comparisons agree with every row of root `cook/review/assets.json`: seven originals match recorded hashes; all five declared copies match originals. r41=1199×1312 RGB, r42=1254×1254 RGBA, r45=1536×1024 RGB; RGB body/poses have no alpha cutout. This verifies identity/format, not black color, alpha-region measurement, material or aesthetic acceptance. No pixel perceptual review performed.
- Root `cook/verify-adoption.mjs` checks PNG signature, dimensions, source SHA256 and byte-identical copies; it writes the manifest. Its scope claims no visual/approval proof, consistent with its checks. Did not execute it or overwrite root evidence.
- LTD `/canon/+page.svelte:2,17-27` imports canonical `PerformanceCampaignOpening`, supplying `background.src/mobileSrc` and actual1672/941,1122/1402 image ratios. Export chain: lib/index.ts:5 → components/index.ts:116 → performance/index.ts:17. Component source:39-86 accepts that background API; :114-118 preloads matching responsive sources; :135-186 routes the scene through SceneLead with HTML copy. BackgroundScene.svelte:5-12 uses CSS background-image and matching47.99rem mobile boundary; no inline hero image. Local mobile override LTD:166-172 preserves complete art below copy within the background opening. Actual composition remains browser-review work.
- APPROACHABLE-SYSTEM, character README and vnext README identify black website foundation, explicit light scopes, Geist, current family and local approval limits. Historical r34/r35/r38 references in those guides are explicitly historical. No additional actionable stale active-family claim found within this bounded read.

## Gates

- **Functional source-contract: passed bounded static implementation review, with known current-index synchronization pending R29.** Asset integrity passed. No executable behavior or browser runtime tested; this does not replace integrated checks.
- **Perceptual/product: untested.** No image/browser requested or used. No independent claim about oval-eye containment, material, gesture quality, contrast, responsiveness or rendered layout.
- **Release readiness: unapproved/local only.** No human final artwork acceptance or publication authorization established. No commit, push, deploy or external writes.

No different confirmed source-contract mismatch found. One known documentation synchronization remains parent-owned; no source repairs performed. Worktree preserved for parent integration and separate Sol actual-output retest.
