# Agency isometric release

CRE-2255 adds eight original Canon conceptual illustrations to existing Agency placements. The shared model supplies 30-degree geometry; the reusable SVG component inherits Canon colors, uses non-scaling strokes and is decorative by default. Named standalone usage exposes a title and description. The family adds no animation loop, dependency or network request.

The accepted Button study and its deterministic HyperFrames-compatible motion source remain separate deliverables; this release preserves their exact artifacts. Anatomy was reviewed at `dbf697a527bbf7d358668e1557cb1e35ff725d46`. No upstream executable was run or reused. Its MIT notice is retained alongside this document.

## Bounded repairs

- Products Control cards stack below 48rem. A strict native Tab test first failed on Decision at 320px, then passed at 320/390/768/1440px after repair. It asserts active focus, full horizontal visibility, focus outline and exit. The former mandatory scroll snap returned partially scrolled focus to the previous card; there was no lost focus or oversized card. No scripted focus correction is required.
- Twenty-four legacy token uses now consume the exact canonical alias targets, preserving computed values.
- Canon overlay assertions include the four existing additional manifests (35 total). Coverage and compatibility validators remain strict.
- Rollout contracts now test the current homepage roles, ordered sections and public destinations instead of retired compositions. The section counter no longer consumes newlines as indentation.
- Contact tests retain escaping and notification/response separation. The Agency response expectation matches its current copy; the test command generates the IO and Agency SvelteKit configs needed by its cross-package imports.

## Reproduce

Use the repository's installed, trusted dependencies and pinned runtime; follow `AGENTS.md` for worktree bootstrap. Run serially:

```sh
pnpm --dir packages/canon check
pnpm --dir packages/canon test
pnpm --dir packages/agency check
pnpm --dir packages/agency build
```

For keyboard regression, start the Agency development server on `127.0.0.1:4183`, then run `node packages/agency/scripts/check-product-keyboard.mjs`. Set `AGENCY_PREVIEW_URL` for another local origin; `CHROME_PATH` can select an already installed Chrome executable. It makes no external page requests. The optional `isometric-preview.config.ts` accommodates linked local dependency fonts without changing production configuration.

Verified locally: Canon 81 files / 679 tests pass; keyboard regression passes at four widths. Earlier independent design review accepted the illustration integration. Browser AX-tree, reduced-motion and native keyboard checks are evidence of those specific checks, not actual VoiceOver acceptance. VoiceOver spoken-output testing remains unverified. No measured performance gain is claimed.

The original standalone specimen, motion study, screenshots and exact Library receipts are retained locally; generated review logs and machine-specific capture scripts are not production source. See `ACCEPTANCE.md` for the exact accepted motion artifact.
