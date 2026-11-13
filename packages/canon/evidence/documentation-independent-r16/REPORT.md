# Independent documentation retest R16

Reviewed the nine assigned documents on branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f`, including intentional local changes. Read root and Canon AGENTS and Canon UNDERSTANDING. No application changes, build, sync, browser, deployment or external action. Only this report was written.

## Remaining findings, ranked

1. **P2 — stale campaign action material contract.** `src/lib/components/performance/README.md:46` still instructs a “translucent, light-bordered secondary action,” conflicting with its new solid-material preface. Actual `PerformanceCampaignOpening.svelte:565–570` uses `background: var(--color-performance-panel)`, an owning semantic border and `backdrop-filter: none`; editorial secondary rules at 866–870 likewise use the solid panel. Replace that paragraph with semantic owning-palette primary/secondary roles rather than retaining the historical translucent prescription. This is a documentation repair, not a request to change controls.
2. **P3 — reusable image prompt retains older default values without a scope label.** `docs/IMAGE_LANGUAGE_FOUNDATION.md:214–228` still tells prompt users to prefer porcelain/white, fixed legacy hex accents, 4–8px radii and layered white panels. The revised visual grammar at 91–94 instead makes the website black and names current semantic roles. Because this passage authors raster proof illustrations, a light illustration is permissible; this is ambiguity rather than an established rendering defect. Label this as an explicit light proof-image recipe and distinguish those image-only values from owning interface tokens, or align the general recipe with the new grammar.

No broken relative inline Markdown targets were found in any of the nine documents, including all newly added targets. Checked filesystem existence after resolving each destination relative to its document; external URLs, fragment existence, reference-style links and code imports were outside that automated check.

## Independent corroboration

- `tokens.css:30` defaults the foundation to black; explicit light and dark scopes exist later in that file. The operator palette remains explicitly opt-in in the package README, preserving the specialist contract.
- `canon.css` imports `performance.css`, which imports locally packaged Geist and IBM Plex Mono. `tokens.css` supplies token definitions; no font-face/import ownership was found there. The showroom theme separately imports Geist and owning tokens, consistent with its README.
- Performance typography documentation consumes semantic display tokens; `tokens.css:450–452` defines weight, tracking and leading (currently 1.08). The assigned current typography sections contain no stale 0.94 prescription. Human interface/sentence-case and record/code/measurement distinctions are coherent, including specialist topology annotations.
- Paper is described as an existing five-study family, with current workshop imagery allowed. Hero/CTA background guidance, inline editorial placement and separate authority/proof regions are explicit. The opening accepts optional background/media and maps media into a background scene. The example's legacy media prop therefore remains valid; no broken new example was established.
- `CanonCompanion.svelte` actually selects static r34 at 96px and plain Canon text for smaller sizes. Character route source labels r26 preferred, r09 historical, and captions six r35 stills with a CSS 200px maximum. Source-master acceptance, user artwork approval and release remain open in the documents.
- LOCAL-REVIEW clearly distinguishes R15 818 tests/full check from earlier R12 consumer check/build evidence. The R15 report and retained suite log independently confirm 98 files / 818 passed. This review did not rerun them or establish fresh application-runtime correctness.
- CANON-WORLD-GUIDE's new preface clearly makes the later inline/light/r09 passages chronological history; preserving those records is appropriate.

## Gates

- **Functional documentation/link contract: failed narrowly.** All checked relative Markdown targets exist; the stale secondary-action prescription needs repair. No app tests were rerun for this documentation-only review.
- **Perceptual/product quality: failed narrowly for prose clarity.** Current status, approval limits and most contracts read coherently; findings above remain. This gate covers prose review only. No imagery or rendered UI was viewed, and this review grants no visual acceptance.
- **Release readiness: unapproved.** No production promotion was requested or performed. User art acceptance, material master, requested Cook floor and final parent release decision remain open.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`. Parent owns integration and final verification.
