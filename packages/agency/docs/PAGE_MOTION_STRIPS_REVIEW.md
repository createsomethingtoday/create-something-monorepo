# Taller workflow strip review

Branch `codex/agency-page-motion-strips` starts from production source `d2440e195a2a8696881dfd13a871b6906b7cac9b`. CRE-2217 records the initial five-page prototype; CRE-2218 tracks the approved taller six-route publication.

Micah approved the five strips beneath their heroes, requested greater vertical height, and then explicitly included the homepage strip. Historical source `d864d7573` confirms the previous canvas dimensions: 145px desktop and 108px at widths up to 640px. Commit `c9ee29c72` introduced the later quiet 56px treatment. This revision restores the historical heights through an opt-in `tall` prop while preserving the quiet appearance and behavior. Width remains unchanged.

Each page has exactly one `WorkflowSignalBand motionOnly quiet tall` directly beneath its hero. The homepage hero scene, Canon character and guide, full-column centering, bounded sticky layout and ordering remain unchanged. Other strip callers retain their existing defaults. No animation, controls, copy, pricing, contractual terms, permissions or services are added.

| Route | Transition beneath the hero |
| --- | --- |
| / | Hero and Canon guide → service journey |
| /services | Introduction and scope → built-work evidence |
| /products | Introduction → Map, Build and Control path choices |
| /field-reports | Evidence introduction → report index |
| /practice | Practice introduction → practice steps |
| /stack | Ownership introduction → detailed ownership story |

Final source passed 171 Agency tests, zero Svelte errors/warnings, SEO/AEO and 13 marketing tests, the Cloudflare production build, whitespace checks and scoped workspace lint (Agency has no direct lint script, explicitly allowed by the workspace checker). The local build initially exhausted disk space; only recreatable ignored build output in task worktrees was cleared, and the final build passed.

The compiled preview at http://127.0.0.1:4188 passed all 65 browser assertions with no page errors. Each route was checked at 1440×1100 and 390×1000 for single-strip count, direct hero adjacency, historical145px/108px heights, unchanged full width, no horizontal overflow, painted trace, quiet/reduced-motion stability, absence of keyboard stops, keyboard continuation and retained heading/metadata/canonical URL. Homepage checks additionally confirmed full-column centering, loaded Canon character, user-started workflow playback and expanded-guide sticky behavior. Independent six-route source review found no blockers.

Local ignored evidence: `output/playwright/tall-page-strips/checks.json` and desktop/mobile screenshots for home, services, products, field-reports, practice and stack. Final package log: `/tmp/agency-tall-strips-final-check.log`; SEO: `/tmp/agency-tall-strips-seo.log`; production build: `/tmp/agency-tall-strips-build.log`.

Publication is explicitly approved and proceeds through a draft PR, independent release review, required CI, normal merge and the existing Pages workflow. Live acceptance and final native Library evidence are recorded in CRE-2218. Rollback target retained before release: deployment `22521b78-ab5b-473f-babc-84f40bed8c80`, source `d2440e195a2a8696881dfd13a871b6906b7cac9b`, https://22521b78.create-something-agency.pages.dev.
