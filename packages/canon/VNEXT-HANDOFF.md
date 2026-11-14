> Historical checkpoint. The parent has retired public `./vnext` exports and duplicate primitives. Current controls use canonical exports; the guided pilot remains internal at `/next`. Follow README.md and PATTERNS-MIGRATION.md for the current system. Earlier validation counts below describe that checkpoint, not the final implementation.

> Historical checkpoint: the original isolated pilot described below has since been integrated with Canon's shared primitives. The duplicate vNext Button/Field/Notice/Surface and compatibility stylesheet and public vNext exports have been removed. See `src/lib/vnext/README.md` for current architecture. Earlier test and screenshot results remain evidence of their recorded revisions, not automatic acceptance of later changes.

# CRE-2434 implementation handoff

Worktree preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`; branch `t3/canon-design-system-redesign`; unchanged HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. No commits/push/deploy. Actual checkout recorded in Linear comment 78f54c69-d09f-483a-982b-e7cec833a155. Parent owns independent retest, final art/quality approval and eight-hour floor.

## Delivered

- `src/lib/vnext`: scoped semantic light/dark theme; reusable native Button, Field, Notice, Surface; typed pure workflow reducer; multi-instance-safe Workbench with focus handoffs, scope guard, task-specific drafts, review/edit/cancel, exact retry preservation and simulated receipt.
- `/next`: real consuming showroom, input/selection/loading/disabled/error/empty/review specimens, both appearances, actual legacy Button/Card/TextField bridge specimens.
- `vnext/compatibility.css`: inner-boundary mapping of existing Performance token contracts. The documented placement handles property-level variable shadowing without globally changing defaults.
- Three package subpaths and three narrow registry path classifications added. Registry file change is required export-policy bookkeeping; no existing classification changed.
- Provisional original character copied from parent round 03 to `static/canon-next/prototype-welcome.png`; hidden after welcome, unapproved art.
- Adoption/API/provenance documented in `src/lib/vnext/README.md`.

## Validation

Commands use `npx --yes pnpm@9.15.4` (no global installation).

- Root `bootstrap:worktree`: passed.
- Canon `check`: passed, including packaging/publint, Svelte 0 errors/0 warnings, overlay/consumer/codification/health/depth gates.
- Canon `build`: passed, publint All good.
- Focused `exec vitest run src/lib/vnext src/lib/components/button-semantics.test.ts`: 3 files, 10 tests passed. Covers early/empty approval prevention, scope, distinct drafts, reset, retry, per-instance IDs/editor focus, heading handoff, existing button link/disabled semantics.
- Whole `exec vitest run`: 731 passed, 8 failed across 4 files. Unrelated failures remain: newsletter attribution missing classification; stale InspectableJourney classification; Agency Meridian/support composition assertions; Agency OpenAI destination assertion; legacy token references in Agency/LTD. No affected source changed here. Logs preserved. This is not an all-green repository.
- Initial workflow test invocation failed because the new workflow module did not exist. This is test-first interface evidence, **not** a reproduced old-UI behavioral regression. The original request for failing checks against each old bug was not fully met; post-fix behavior is exercised by meaningful tests and actual browser interaction. No fabricated before/after claim.

## Actual browser evidence

Ego Lite task space 4, local Vite `http://127.0.0.1:5191/next`. Exercised task selection → scope → plan → working → failure → retry → review → empty draft blocked → edit focus → edited approval receipt → reset. Heading focus read back as Ready for your review. Keyboard Tab reached radio input with solid focus outline. Reduced-motion state transitions identical. JavaScript disabled: visible explanatory noscript content plus full static specimens.

Six widths 320/390/768/1024/1025/1440 captured; each document scrollWidth equals viewport width. Direct image inspection found cramped side content at 1024/1025; changed single-column breakpoint to 1150 and recaptured. Theme transitions initially contaminated rapid screenshots; final welcome captures use reduced motion for deterministic settled states. Light/dark legacy bridge computed values verified: light action rgb(23,92,132), panel white; dark action rgb(156,216,252), panel rgb(34,43,50), text rgb(242,246,248).

`evidence/vnext`: actual welcome six-width PNGs, dark, failure, review, legacy bridge and no-JS captures; test/build/check logs and contrast ratios. Eight core foreground/action/error pairs measured 6.37–15.13:1. This is bounded contrast evidence, not a complete accessibility certification. Screenshots are viewport captures, not full-page coverage. Functional journey browser exercise was at desktop; six-width check covered layout/overflow rather than repeating every action at every width.

## Gates and limits

Functional correctness: **passed for scoped pilot**, with focused tests and actual local runtime; repository-wide gate **failed** on the listed unrelated contracts. No live connector execution claimed.

Perceptual/product quality: **passed for initial builder inspection only**, with visible mobile/desktop output and responsive correction. Parent independent critique and final character/whole-system acceptance remain pending. No claim of final aesthetic quality or eight-hour completion.

Release readiness: **failed/pending**. Local artifact packages successfully; repository failures, independent retest, final art, full consumer audit and promotion approval remain. No publishing authorized.

Worktree disposition: preserved at the path/branch above. Dev server session 30728 may remain active on 5191 for parent review. No production state changed.
