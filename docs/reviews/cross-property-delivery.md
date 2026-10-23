# Cross-property image alignment review

Draft review only. No merge, deployment or production/database mutation authorized or performed.

## Review targets

- IO: http://127.0.0.1:4311
- LTD: http://127.0.0.1:5174
- SPACE: http://127.0.0.1:5175

Local previews run on W4FJPH. These are local source previews, not remote releases. Keep the PR draft: marking ready permits the existing IO workflow to deploy a preview. The two-line draft guard preserves checks/builds but prevents draft preview deployment and its automatic comment.

Baseline: deployed Agency PR2045 (cc86a62e4fa36ecfd9106e57434877725b803f63), its original scene manifest and live reference. Implementation branch starts from origin/main 695b15f01 in a separate worktree. Original main checkout's two untracked Agency prototype paths remain untouched.

## Evidence and scope

- IO: `packages/io/docs/VISUAL_STORY_REVIEW.md` — complete page-template inventory and six scene mappings. Original catalog, research bodies and loader data retained.
- LTD: `packages/ltd/docs/VISUAL_STORY_REVIEW.md` — 37 page-template inventory, six scenes across ten templates. Operating library, principles and standards semantics retained.
- SPACE: `packages/space/docs/IMAGE_STORY_REVIEW.md` and `IMAGE_ASSETS.json` — eight scenes, public route map and all 22 catalog project mappings. Legacy runtime interfaces retained.
- Independent Sol 6.1: `cross-property-independent-review.md` and `screenshots/`. Screenshots captured from actual Chrome renders; WebP review encodings preserve the captured frames. Original PNGs retained locally at /tmp/cross-property-original-screenshots.

All imagery reuses pixel-inspected Agency originals where meaning matches; no new generation needed. Images are conceptual illustrations, never customer evidence or endorsements. Local responsive derivatives avoid cross-property network dependencies. Shared Canon components and tokens were not edited.

## Quality gates

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed within local scope | IO full check (82 tests and catalog guards; zero Svelte errors/warnings), full build/lint; LTD nine tests, zero diagnostics and build; SPACE 28 tests, zero diagnostics and build. Independent research filtering, disclosures, pause and keyboard checks pass. No live Worker execution, auth/provider writes or production D1 verification performed. |
| Perceptual/product | Passed sampled review | Actual screenshots viewed against live Agency; home desktop/tablet/mobile and representative interiors. Builders add 27 LTD and 15 SPACE route/viewport checks. IO CTA contrast found and fixed, independently retested. Complete screen-reader/exhaustive route audit remains outside evidence. |
| Release readiness | Ready for draft review only | Diff scope checked; separate worktree; no shared edits. Production workflows remain manual. IO draft auto-preview guard independently reviewed; paper-cycle test passes. Approval still required to mark ready, merge or deploy. |

Known nonblocking limits: existing IO papers nested main landmarks; existing large JS bundle warnings; SPACE adapter drops 94 existing exclude rules due to Cloudflare limits (possible excess invocations). No production data or external destination assertions inferred from local tests.

Linear checkpoint could not be recorded: LINEAR_API_KEY unavailable and no connected Linear tool found. This review and the draft PR hold the evidence instead.

Worktree disposition: preserved at /Users/createsomething/Documents/Codex/2026-10-23/task-4/property-images, branch codex/cross-property-agency-images until design review and approval.
