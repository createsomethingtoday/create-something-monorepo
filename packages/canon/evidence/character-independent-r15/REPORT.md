# Independent final integration retest r15

Evidence directory: `packages/canon/evidence/character-independent-r15/`. Originally generated at worktree-root `evidence/character-independent-r15/`, then moved here for package-local organization. The exact historical commands below retain their original output paths. No standalone browser scripts or stale absolute capture paths are stored in this directory.

Reviewed local authorized dirty source on branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`, at the assigned worktree. No app source edits, commits, release, or external writes. Existing server `http://localhost:5191` remained running. Ego space 43 was created for this review and closed afterward; parent/user spaces untouched.

## Acceptance and results

- **Functional correctness: passed (local runtime).** Focused mounted character tests: 3/3. Full Canon check: exit 0. Full Canon suite: 98 files, 818 tests passed. Actual Ego runtime: prepare, focused, needs-review, recovery, handback and reset produce truthful local words. Identical image markup persists across state selection and reset. Reset returns welcome and “Nothing has been prepared. No live tool is running.” No external execution was claimed or tested.
- **Perceptual/product quality: passed for bounded integration.** Directly viewed actual full-page captures at 320, 390, 768, 1024, 1025 and 1440 CSS px. Original r34 loaded complete at natural width 1448; head/antenna are contained at 96px on black and paper, with small sizes remaining plaintext. All six captioned poses are contained, anatomically coherent and no more than 200px (about 184.85px at 768); no cropped antenna, hands, feet or neighboring cells. Pause relies on its caption for precise meaning. r26/r09 remain clearly labeled editorial studies. `/next` empty state directly viewed at 390/1440 in dark/light, with complete head and readable settled palette text. Hero title and two #try CTA destinations unchanged on runtime readback.
- **Release readiness: passed for local prototype handoff only.** Scope is private character modules, local study route and three new static sources; no production destination or publishing approval was exercised. Full-resolution material master, final artwork acceptance, optimization, animation rig, public exports and production release remain open / not established by this review.

## Accessibility / behavior evidence

`matrix.json`: no horizontal overflow at all six requested widths; every measured button/select/summary/nav/footer target >=44px in both dimensions. `states.json`: state copy, identical image markup, keyboard-focused SUMMARY and 2px visible focus outline. Native Enter toggled disclosure. `nojs.json` and `nojs.png`: both buttons and select disabled, explicit JavaScript explanation visible, native disclosure opens with keyboard. This independently confirms the corrected no-JS outcome; the parent owns the before-fix failing regression evidence.

`empty.json` records actual shared empty-state source, 1448 natural width, theme, overflow, hero and CTA readback. `empty-{390,1440}-{dark,light}.png` were recaptured after computed card background reached its settled palette. Earlier transient screenshots during theme transition were superseded; settled contrast is clear. No app defect found.

## Exact validation commands

Run sequentially from repository root with no consumer builds:

```sh
npx --yes pnpm@9.15.4 --filter @create-something/canon exec vitest run src/lib/character/character.test.ts > evidence/character-independent-r15/focused.log 2>&1
# exit 0; 3 tests
npx --yes pnpm@9.15.4 --filter @create-something/canon check > evidence/character-independent-r15/check.log 2>&1
# exit 0
npx --yes pnpm@9.15.4 --filter @create-something/canon test > evidence/character-independent-r15/suite.log 2>&1
# exit 0; 818 tests
```

Browser operations used documented `ego-browser nodejs`, Page methods and CDP viewport/script controls. One initial no-JS `reload()` attempt hit Ego's bounded pending-navigation timeout (exit 1); recovered in the same space with documented navigation, then used raw `Page.navigate` under script-disabled CDP and verified the no-JS result. No rerouting or extra space. CLI reports an Ego Lite update available (installed 0.6.3.12); no upgrade attempted.

## Limits

Screenshots establish intended display-size integration, not a close-up material-master score or final art approval. No screen-reader session, production runtime, animation, external execution or user acceptance was tested. Source and browser were frozen by the parent through this review. Worktree disposition: preserved at the assigned path/branch under parent ownership.
