# Agency interaction pilot (CRE-2259)

Production promotion authorized on 2026-10-13; acceptance gates remain pending. No merge or production deployment yet. Base: `9de2b762b35142b3aad3eb84999685baec4eae6f`. Branch: `codex/agency-interaction-pilot`.

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

2026-10-12: Agency check passed (181 tests; Svelte 0 errors/0 warnings). Canon check passed. Canon tests passed (81 files, 680 tests, `--maxWorkers=2`; default parallel run hit one existing 5s depth-report timeout). Agency production build passed. Browser receipt: all seven groups passed, no page errors. Independent review accepted the bounded local pilot. Follow-up: Agency check (181 tests), site-search (18 tests), Agency production build and all seven browser groups passed. Browser evidence includes repeated early Back and mobile inline-search focus return. Build emitted the existing stale Browserslist-data advisory; no dependency update was attempted.

## Review and next decision

An independent source/visual reviewer accepted the bounded local pilot with no remaining blocking finding after checking screenshots and the implementation. Findings drove fixes for sample-anchor selection, history focus, mobile progression focus and the exported component documentation. The existing route-transition owner now skips fragment transitions, cancels superseded transitions and handles their expected rejected promises. Same-document pilot fragments own their scrolling, preventing the delayed global hash scroller from moving focused controls offscreen.

Follow-up fixes: entering/leaving the homepage no longer waits for an asynchronous view-transition snapshot after history changes. Three early-Back repetitions restore Handoff before waiting for destination rendering and remain stable after 500ms; no route snapshot delays those commits. Homepage search is now inline at the journey entrance and end, reusing the existing palette. Other routes retain their mobile floating search. The browser tests verify no floating search control over the pilot and touch open/close/focus return.

Before any release: inspect the local preview, perform physical mobile and screen-reader testing. Retain this isolated checkout until the owner decides whether to proceed. Do not generalize to .io/.ltd/PCN/Draw until this journey is accepted and a second consumer establishes shared needs. Production promotion is authorized, but physical-mobile and screen-reader acceptance remain required before merge/deployment.

## Static review delivery

`export-interaction-review.mjs` creates a self-contained reading copy from actual rendered markup/styles and an actual completed synthetic receipt. All four records are expanded. No scripts, remote assets or external links are included. It uses fallback fonts because font assets are stripped; this is not a pixel-parity or interactive substitute for the live local preview. The exporter validates all records and horizontal geometry at 1440/390/320.


## Release review — 2026-10-13

Integrated upstream main `bd46604e4` without Agency/Canon conflicts. Canon check and 680 tests passed; Agency build and check passed on integration head before the final continuity fixes. Final checks are recorded in the release acceptance receipt.

Independent review exposed two linked search/history defects. Submitting search removed the selected journey fragment. Preserving the actual URL then exposed Back moving focus behind the open dialog. Both were reproduced as failing browser assertions before correction. Search now preserves the full URL and existing history state; journey history callbacks defer focus while an ARIA modal is present. The eight-group browser receipt passes with no page errors, including search Back/Forward, transient focus ownership and close/reload selection.

Ground advisory review reports the two documented standalone browser/export scripts as orphan modules; unsupported document formats and incomplete duplicate analysis remain exclusions, not clean results.

Worktree disposition: retained at the explicit isolated checkout on `codex/agency-interaction-pilot` until release acceptance and production verification. No shared checkout edits.
