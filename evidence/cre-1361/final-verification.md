# CRE-1361 final local verification

Date: 2026-07-20

Issue: CRE-1361

Branch: `codex/CRE-1361-agent-worktree`

Exact base: `origin/main` at `9de7c0f6f6d8a8458fc1b54dee30c37ec1dfeb40`

Local verdict: **pass**

Promotion verdict: **hold for explicit human final prose review**

## Delivered boundary

The complete LTD presentation-detail family remains one editorial cohort:

- Eleven fixed deck routes with 176 preserved `<Slide>` instances.
- Ten checked-in narration scripts with all 3,990 lines and 12,615 words preserved byte for byte.
- One dynamic companion-script reader.
- One shared Canon `Presentation` shell.
- `workway` intentionally has no script; its script route remains HTTP 404.

The shared shell now exposes the complete ordered argument without JavaScript. JavaScript enhances that reading path with one active slide, in-flow controls, progress, fullscreen, and keyboard behavior scoped to presentation control buttons. Mobile retains both the collection return and the optional script handoff.

The script route now renders one layout-owned main, titled sections, an outline, and three editorial chapters. Copy controls report live status, raw markdown remains available in a disclosure, and the page ends with an explicit continuation.

The initial post-implementation reader pass correctly rejected unexplained first-encounter vocabulary. Nine deck openings and their companion script subtitles now state an actor and action before owned terminology. No slide, script, claim, quotation, diagram, code sample, or destination was removed.

## Red and green evidence

- Initial focused contract: 2/6 pass; the preservation assertions passed while four sharpness assertions failed.
- Final focused contract: 6/6 pass.
- The contract fixes exact slide counts at 176 and SHA-256 hashes for all ten narration scripts.
- The first consumer build exposed two accessibility warnings around a focusable non-interactive wrapper. The final implementation moved keyboard shortcuts to real control buttons; LTD and Canon now report zero Svelte warnings.
- Exhaustive rendering exposed 3-4px outer overflow on two mobile decks. A new assertion failed first, then passed after the presentation boundary clipped only outer overflow.
- The Developer Onboarding script exposed 35px outer overflow. A second assertion failed first, then passed after the script boundary repair. Its outline and raw-artifact regions retain their own intentional scrolling/wrapping behavior.
- The first target-reader pass remained `revise` until jargon-heavy opening lines were replaced with concrete actor-action statements.

## Final rendered matrix

The exact final production build was served through `vite preview` at `http://127.0.0.1:4176` and exercised with Chromium.

- Deck matrix: 22/22 checks pass across 390x844 and 1440x900.
- Script matrix: 20/20 checks pass across 390x844 and 1440x900.
- Every deck returns HTTP 200 and preserves its exact slide count. Each enhanced deck exposes one active slide, zero document overflow, the correct route-specific canonical, and the expected collection/script links.
- Every real script returns HTTP 200 with one main, semantic sections, and three top-level chapters. Each also has two enhanced copy buttons, one raw-markdown artifact, zero document overflow, and the correct route-specific canonical.
- Browser console errors across the 42 successful route/viewport checks: zero.
- `/presentations/workway/script`: HTTP 404.
- `/presentations/does-not-exist/script`: HTTP 404.

Representative no-JavaScript proof at 390x844:

- HUB exposes 12/12 slides in order.
- The false `1 / 0` counter and dead presentation controls are absent.
- `All presentations` and `Read script` remain visible.
- The HUB script exposes one main and 12 semantic sections.
- Copy buttons are absent, raw markdown is closed but reachable, and document overflow is zero.

Interaction proof:

- Focused `Next slide` plus End reaches `22 / 22` in Developer Onboarding.
- Focused fullscreen control plus Home returns to `1 / 22`.
- Enter on focused `Read script` opens `/presentations/developer-onboarding/script`; it does not advance the deck.
- `Copy Markdown` reports `Markdown copied.` through the live status region.
- Fullscreen enters the browser fullscreen element and synchronizes component state.
- Reduced-motion emulation resolves relevant transitions to zero or effectively zero duration.
- Dense slides 17 and 21 scroll normally, stay outside the toolbar, and produce no document-level horizontal overflow. The ASCII artifact retains its own bounded horizontal reading region.

## Gate evidence

- `node --import tsx --test packages/ltd/test/presentation-detail-sharpness.test.ts`: pass, 6/6.
- `pnpm --filter @create-something/ltd check`: pass, 0 errors and 0 warnings; Canon-language tests 2/2.
- `pnpm --filter @create-something/ltd build`: pass; Canon and Tufte packages pass `publint`; Cloudflare adapter completes.
- `pnpm --filter @create-something/canon check`: pass; 29/29 overlays ready, 0 compatibility issues, 0 UI files needing a Canon decision, and 854/854 stable-component depth checks covered.
- `pnpm performance:pages:check`: pass, 229/229 registered, 48 migrated, 169 pending, 12 technical exclusions.
- `pnpm performance:pages:test`: pass, 3/3.
- `pnpm check`: pass across platform, product, and services lanes.
- Scoped prose audit: 13 files, 0 blocking findings. One review-only 28-word sentence in an unchanged Canon README paragraph remains outside the added presentation contract.
- Scoped Prettier check for the rewritten component, script reader, and focused contract: pass.
- `git diff --check`: pass.
- The three build-generated Canon declaration files remain untracked and must not be committed.

## Visual evidence

- `evidence/cre-1361/final-screenshots/hub-mobile.png`
- `evidence/cre-1361/final-screenshots/hub-mobile-no-js.png`
- `evidence/cre-1361/final-screenshots/hub-script-mobile.png`
- `evidence/cre-1361/final-screenshots/hub-script-mobile-no-js.png`
- `evidence/cre-1361/final-screenshots/developer-onboarding-mobile-slide-17.png`
- `evidence/cre-1361/final-screenshots/developer-onboarding-mobile-slide-21.png`
- `evidence/cre-1361/final-screenshots/cloudflare-script-desktop.png`

## Known inherited boundary

LTD's shared layout still emits a root canonical beside the correct route-specific canonical. The correct deck and script canonicals are preserved and verified. The duplicate root canonical predates this cohort and overlaps active LTD layout ownership, so CRE-1361 records it without silently expanding scope.

No merge or deployment is authorized until a human performs the required final prose read. Production live verification and rollback capture remain after that gate.
