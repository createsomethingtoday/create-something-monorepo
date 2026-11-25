# Independent final Sol 6.1 CSS-contract review — CRE-2409 / PR 2252

Reviewed owning worktree `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-7fb0f744-b3a59e76dfb75144`, base HEAD `c3fb7517f2e9e07d005cc07614850bef5fc434f3`, with the parent's uncommitted CSS-contract and pending-review focus correction. Read-only review: no repository/source/build mutation, vendor/model/MCP/paid call, deployment, PR write or approval.

Final exact client read from the generated production asset manifest:

- `/npg-chat/assets/main-qaMUh4q_.js`, 847960 bytes, SHA256 `e8cc10f082fed30fe64db24bff5d23bc5b8a67af21fab13548cbfc3b1c58062c`.
- `/npg-chat/assets/main-Cn_sAb1H.css`, 296293 bytes, SHA256 `ca14eb7b580354f63383d50eadbb4660818819f4cd51b4b4f8185ba79355d263`.

## Scoped styling contract

The P1 finding is substantively corrected. `workspace.css` and its import are removed. Actual pinned Core components own the styling: Section divider props and Divider supply borders, Text `type="code"` supplies code typography, stack height/minHeight props and documented `flex-1` utility supply the frame. No handwritten div/span JSX or inline style, arbitrary utility value, author selector CSS, root palette override, or manual font-size/color CSS remains in the Astryx workspace.

The dedicated NPG PostCSS configuration runs existing Tailwind 3 against only the React subtree, with preflight disabled. Parsed final CSS contains only finite framework geometry/whitespace utility selectors outside Astryx layers, no `.npg-*`, `.history-item`, `.source-link`, `#npg-app`, or Agency styling selectors. `scroll-mt-4` resolves to Astryx `var(--spacing-4)`. `w-80` and `max-w-screen-sm` are framework sizing/breakpoint tokens (20rem and 640px), not arbitrary per-selector CSS. Actual utility declarations and hashes are in `/tmp/npg-astryx-css-commit-artifact.json`.

The sole local stylesheet is `fonts.css`, containing one `@font-face` for self-hosted Figtree variable weights 300–900 with swap. Pinned official Astryx `typography/font-setup` explicitly makes font loading the application's responsibility and documents local `@font-face`. This is required font setup, not an exception preserving component styling. The built CSS has one same-origin local WOFF2 declaration, no external imports, and no custom hook selectors. The real local font loaded in the browser.

The strengthened PostCSS-AST document regression permits only the font-face setup and the exact framework utility import. Parent's pre-fix red log is `/tmp/npg-astryx-css-contract-red.log`; the independently rerun final 61-test suite passes.

Astryx doctor passes without failures: source 11 pass / 2 warnings / 0 failures; built 11 pass / 1 warning / 0 failures. Root-agent-marker warning reflects intentionally scoped generated instructions. The source warning still mechanically reports every className and both font/framework imports; each was inspected against actual component APIs and emitted CSS. It is not a waiver for the deleted custom stylesheet.

## Functional and rendered evidence

- Focused functional regressions: **61/61 passed**, including real local workerd/D1-backed ownership/approval tests, display boundaries, private document serialization/headers, and the CSS contract. `/tmp/npg-astryx-css-commit-final-focused61.log`.
- Explicit TSX check: **passed**. `--listFilesOnly` verifies inclusion of Workspace.tsx, main.tsx and types.ts. `/tmp/npg-astryx-css-commit-final-types.log`, `/tmp/npg-astryx-css-final-tsx-files.log`.
- Exact production client/document/CSP in isolated localhost fixture 4231: **27/27 passed**, including CPU-throttled large saved evidence and commit-aware review focus. `/tmp/npg-astryx-css-commit-final/browser-report.json` and browser log.
- Supplemental corrupt drafts, actual newline/IME guard, state glyph/typography, native drawer keyboard containment, dismissal and return: **15/15 passed**. `/tmp/npg-astryx-css-commit-extra/report.json`.
- Routed synthetic 5000-character JSON, long source URL and preserved newlines at 320/390/1440, plus no-JS capture: **4/4 final passed**. `/tmp/npg-astryx-css-commit-wrap/report.json`.
- Actual pointer rejection at 1440×900, 390×667 and 320×568: **3/3 passed**; only rejection emitted. `/tmp/npg-astryx-css-commit-pointer/report.json`.
- `git diff --check` passed. No fixture sentinels or named server credential identifiers were found in the production client in the bounded scan. Full Agency check/build are parent-owned receipts, not independently rerun by this reviewer.

Directly viewed actual final captures at 320,390,768,1024,1025,1440; 320×568,390×667,390×844; empty/working/completed/error and interrupted/ambiguous/running; exact enrichment review; canonical registry/PDL and guarded Skip Trace disclosures; long raw JSON; no-JS. The narrower 20rem evidence region remains readable and has no horizontal overflow. Expanded metadata does not overlap disclosure triggers. Product identity and compact logical H1 remain readable, supporting text has a clear hierarchy, Figtree is loaded, Lucide glyphs are decorative with action text retained, and state glyphs match their actual statuses. Composer/helper has a solid surface and placeholder/footer separation. The short-phone rejection remains reachable with pointer input.

Pending history now focuses the review H2 after native drawer close, then reveals it; idle history focuses the composer. A review heading is an appropriate safe focus target before any paid decision. Initial history restoration does not steal focus. The first replacement candidate's 320×568 scroll regression was caught in both parent and independent suites, repaired by the parent, and passes in final browser and pointer checks.

## Focus regression closed

The earlier routed long-response focus failure was diagnosed and repaired, not waived as test noise. Parent's permanent CPU-throttled (8×) 20-source-record regression demonstrated lost focus before the fix (`/tmp/npg-astryx-css-commit-focus-red.log`). Navigation now queues focus intent; the existing React layout effect consumes that intent after the DOM commit. An absent review heading retains the intent and a pending-ID dependency retries when the returned view exists. No arbitrary delay was added. Native drawer close ordering, safe review-H2 targeting, idle-composer targeting and restored-history no-focus-steal are preserved.

The independently rerun final **27/27** browser suite includes this regression and passes. All supplemental 15 + 4 + 3 checks pass against the new asset. No unresolved focus or perceptual acceptance finding remains. Previous `main-C3VLDMvC.js` evidence is historical; it does not establish acceptance for the final artifact above.

## Quality gates

| Gate | Status | Evidence and limit |
| --- | --- | --- |
| Functional correctness | Passed locally | Final 61 + 27 + 15 + 4 + 3 checks and explicit TSX pass. HTTP/provider responses are synthetic; workerd/D1 tests are local. No live Identity/model/provider or authenticated CSV behavior is established. |
| Perceptual/product quality | Passed for directly viewed final fixtures | All required widths/short phones and key states viewed. Styling contract now complies; no new perceptual acceptance finding. Native software keyboards, additional browser families, and human/client acceptance remain untested. |
| Release readiness | Untested for production | Exact deployable local artifacts and scoped source/CSS contract checked. Parent owns PR integration, merge/deploy, actual account/adjacent-route round-trip, current-origin authenticated source/CSV parity, live artifact readback and activation. No shipping action was performed. |

Worktree disposition: preserved in the owning path/branch for parent integration. Reviewer-created evidence is under /tmp. The isolated reviewer fixture on 4231 was stopped after final readback. Parent fixture/processes were not touched.
