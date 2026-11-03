# OpenAI partner evidence integration — 2026-10-31

The work chapter now contains one aligned evidence panel: the unchanged official partner badge, a short context heading, the exact existing Codex Security commit link, and the existing evidence limits. The qualification link and approved partner designation are preserved. The evidence limits use a native disclosure, enhanced with a 300ms height/opacity reveal and synchronized indicator. No JavaScript and reduced motion retain immediate native access.

Acceptance: cohesive campaign-grid composition; preserved evidence/destinations; open/close motion without stale height after interruption; keyboard and focus; reduced motion including preference changes mid-animation; no JavaScript; no horizontal overflow at 1440, 768, 390 and 320 pixels.

Context: ctx search/status consulted. The index reports 1,318 skipped history records and bounded search results; current origin/main source and the supplied screenshot establish the implementation baseline. TASTE layout API returned reference metadata without image URLs. Those references were not visually verified or used as visual precedent. The current campaign and Canon contracts govern this isolated polish.

Validation:
- Svelte: zero errors and warnings.
- Canon and public-copy suites pass after correcting an existing badge-anchor assertion to allow accessibility attributes while preserving exact href, asset and alt checks.
- Browser regression: `node packages/agency/scripts/verify-partner-evidence.mjs` against local Vite. All acceptance interactions pass; screenshots and results at `/tmp/agency-partner-evidence`.
- Independent Sol 6.1 review inspected actual desktop/narrow renders and sampled the runtime reveal. Re-test after indicator synchronization passes all acceptance criteria; indicator rotates during collapse.
- Production build passes; final compiled client artifact contains the synchronized indicator logic.

Quality gates at review: functional correctness passed locally; perceptual/product quality passed by direct render inspection and independent runtime motion sampling; release readiness pending merge, deployment and canonical live readback. Cross-browser/device hardware testing and human acceptance were not performed.

The CSS URL and internal HTML cache revision both change so retained public HTML cannot silently mix the old section with the new stylesheet. Rollback: restore the previous merged release in Pages or revert this change and deploy with a fresh HTML cache revision.

Linear issue creation was attempted but `LINEAR_API_KEY` is absent in this session. PR and this receipt preserve the work/evidence.

Worktree disposition: preserved at `/Users/createsomething/Code/agent-worktrees/agency-partner-integration`, branch `codex/agency-partner-integration`, until production verification and handoff.
