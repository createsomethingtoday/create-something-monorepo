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


## Finished-pass polish and exact coverage

Finished implementation source: `3fe3945329935488e782a27c88fec441eb69efca`. Follow-up evidence-only commits do not change this tested source. Final local Svelte checks and production builds pass for all three properties; full package suites passed in the polish pass (IO82/LTD9/SPACE28 tests). A literal-href comparison against base695b15f01 found no removed source destinations. Independent Sol6.1 final report: `cross-property-polish-independent-review.md`.

| Property | New scene/treatment coverage | Preserved or inventory-only coverage |
| --- | --- | --- |
| IO | Nine explicit templates: `/`, `/papers`, `/experiments`, `/methodology`, `/about`, `/plugins`, `/docs`, `/docs/ground`, `/newsletters`. Compact paired desktop hero/archive/reference openings, complete mobile frames, native concept labels. | Deep paper/experiment bodies retain specific diagrams and evidence. Plugin details, agent/MCP trust cards, categories, graph, other newsletter/reference pages retain the existing dark reading shell without new scene imagery. Auth/admin/transactions/tools are preserved, not redesigned. |
| LTD | Ten explicit templates: `/`, `/playbooks`, `/playbooks/[slug]`, `/readiness`, `/principles`, `/ethos`, `/patterns`, `/voice`, `/standards`, `/canon`. Four actual playbook detail instances; balanced grids and paired assessment/standards openings. | Other Canon reference subpaths, master/taste detail, presentations, specialist and legal/auth surfaces keep their established content/interface. The complete37-template inventory is not a claim that37 templates received new imagery. Populated D1 principles/master data remains unverified locally. |
| SPACE | Four static public pages `/`, `/projects`, `/about`, `/workbench` plus `/projects/[slug]` for all22 current catalog projects (26 actual public pages). Consistent title/scene interiors, card-only3:2 crops, retained fullframe openings, native usage/limits and source/install destinations. | Playground, Praxis, Motion, Data/NBA, Discover and Workway runtime routes retain existing implementations. They are inventoried/preserved, not redesigned or remotely execution-tested. |

Polish tightened hierarchy, spacing, section rhythm and minimum12px scene captions. Full frames preserve working subjects; only project cards use a consistent modest crop. IO paper/docs/newsletter nested-main landmarks are fixed on the edited routes. All three public mobile search triggers now occupy reserved44px header targets, clear of menu and reading content; actual normal clicks, query focus, Escape, and menu opening pass at390/768. Search overlay/panel60/61 sit above trigger51/nav50. Existing Canon special-header and tool routes are preserved.

Independent final coverage:42 render cases (14 representative route families ×390/768/1440), no page errors, overflow or broken images, exactly one main in sampled routes. Six additional search/menu interaction cases pass. Builder evidence adds24 LTD route/breakpoint cases including all four playbook details and78 SPACE cases including all22 project details. This does not certify every route, external destination, populated D1 state, authenticated flow, screen-reader journey or legacy remote runtime.

Finished preview URLs: IO http://127.0.0.1:4311, LTD http://127.0.0.1:5176, SPACE http://127.0.0.1:5177. Review screenshots are actual Chrome captures, retained as compact WebP encodings; original final PNGs preserved locally at /tmp/property-polish-originals. Six desktop/mobile home screenshots have confirmed native Library versions. Keep draft/no merge/no deploy until finished-pass approval.
