# Agency interaction pilot (CRE-2259)

Local implementation for review; no merge or deployment. Base: `9de2b762b35142b3aad3eb84999685baec4eae6f`. Branch: `codex/agency-interaction-pilot`.

The homepage service journey now follows one broken form through Problem → Approval → Check → Handoff. The accepted Anatomy/isometric family and Canon performance tokens remain. Each selection preserves the workflow overview, opens a contextual record, and leads to a fixed synthetic receipt. No customer input, provider, booking, request, payment or production approval is involved.

## Reusable boundary

`InspectableJourney` is a provisional Canon controlled component, not a stable registry foundation. Its explicit experiment/classified-out export policy is covered by a registry test. It owns native selection links, selected state, the persistent overview/panel layout and a finite opacity transition. `journey-location.ts` owns exact scoped fragment serialization. See `packages/canon/src/lib/patterns/InspectableJourney.md` for its contract. Agency owns routing/history/focus, content, storage and completion semantics. No universal form or router abstraction was introduced.

## Storyboard

1. Orientation: one request and its full four-stage map stay visible.
2. Exploration: select a stage by pointer, touch or native keyboard link; URL records the selected stage.
3. Context: inspect a record; Escape closes it and restores the trigger. Previous/Next places focus at the next panel heading.
4. Return: Back/Forward restores selection/record. A route visit and return retains context. Stale fragments fall back safely.
5. Action: choose a fictional inbox or queue and review the stated scope. Missing choices produce associated, focused errors.
6. Completion: a local receipt states exactly what it contains and that nothing was sent, changed or booked. Edit preserves choices; reload restores valid tab data. Unavailable storage reports that limitation without blocking completion.

The base HTML includes all records. JavaScript progressively enhances selection and the local sample; reduced motion suppresses the finite fade. There is no idle animation loop or journey network request.

## Reproduce

Use the repository pinned runtime through `bash scripts/ona-bootstrap-local.sh` where global pnpm is unavailable. Dependencies were reused locally without installation.

- `pnpm --dir packages/agency check`
- `pnpm --dir packages/canon check`
- `pnpm --dir packages/canon test`
- `pnpm --dir packages/agency build`
- Preview: `pnpm --dir packages/agency exec vite dev --config isometric-preview.config.ts --host 127.0.0.1 --port 4186 --strictPort`
- Browser: `CHROME_PATH=/path/to/existing/chrome PILOT_EVIDENCE_DIR=/path/to/evidence pnpm --dir packages/agency exec node scripts/check-interaction-pilot.mjs`

The browser script blocks every non-preview origin. It checks 1440/390/320 widths, native keyboard activation, focus, records, validation, completion/edit/reload, reduced motion, deep links/history/route return, emulated touch/orientation, no-JavaScript readability, blocked storage and finite idle motion. Rapid programmatic activation tests state interruption; it is not a claim of native assistive-technology testing.

## Verification receipt

2026-10-12: Agency check passed (181 tests; Svelte 0 errors/0 warnings). Canon check passed. Canon tests passed (81 files, 680 tests, `--maxWorkers=2`; default parallel run hit one existing 5s depth-report timeout). Agency production build passed. Browser receipt: all seven groups passed, no page errors. Independent review accepted the bounded local pilot. Browser evidence was captured against the same final functional source; subsequent edits were documentation only. Build emitted the existing stale Browserslist-data advisory; no dependency update was attempted.

## Review and next decision

An independent source/visual reviewer accepted the bounded local pilot with no remaining blocking finding after checking screenshots and the implementation. Findings drove fixes for sample-anchor selection, history focus, mobile progression focus and the exported component documentation. The existing route-transition owner now skips fragment transitions, cancels superseded transitions and handles their expected rejected promises. Same-document pilot fragments own their scrolling, preventing the delayed global hash scroller from moving focused controls offscreen.

Known boundary: the route-return regression waits for the services heading to render before Back. Immediate Back between URL change and destination render exposed a SvelteKit route-commit race; this pass does not claim that case is resolved. Rapid journey selection interruption is independently covered.

Before any release: inspect the local preview, perform physical mobile and screen-reader testing, and review the existing floating search overlap with lower mobile receipt text. Retain this isolated checkout until the owner decides whether to proceed. Do not generalize to .io/.ltd/PCN/Draw until this journey is accepted and a second consumer establishes shared needs. Merge and deployment need separate authorization.
