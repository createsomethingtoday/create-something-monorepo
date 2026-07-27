# CRE-1366 source and rendered baseline

Date: 2026-07-20

Base: `origin/main` at `45075e60e6367dea025660866368970b214654ae`

Worktree: `/Users/micahjohnson/Code/create-something-worktrees/cre-1366-agent-worktree`

Scope: the complete registered `io-papers` implementation family: the dynamic `papers/[slug]` implementation plus 40 checked-in static paper implementations. The separate `/papers` index remains owned by CRE-1331 / PR #1017 and is not part of this cohort.

No production source changed while collecting this baseline.

## Verdict

`revise`

The family is structurally available, but it does not yet meet the target-reader contract. Most pages preserve their research and load without browser failures, yet the family has no shared reader path, nearly every mobile paper is extremely long, many first encounters assume internal vocabulary, dynamic records place an artifact before the title, and interactive papers leave dead or unnamed controls in constrained states. `threshold-dwelling` is an architectural tool misclassified as an editorial paper and emits invalid SVG geometry on mobile.

The machine prose audit does not represent this verdict. It blocks only two literal `AI-powered` phrases and reports 22 review warnings, while missing the family-level orientation, information-flow, length, progressive-enhancement, and local-comprehension failures below. This is the same false-pass class that allowed `The page now holds one argument`: token and source checks cannot prove that a junior practitioner can understand and use the rendered page.

## Ownership and preservation boundary

- The registry currently has one pending `io-papers` editorial group containing all 41 implementations.
- The dynamic implementation resolves 12 file-backed paper records and returns HTTP 404 for an invented slug.
- Forty static pages remain explicit research implementations; 34 import IO's `SEO` wrapper and use independent handcrafted layouts.
- Three implementations use shared paper primitives: the dynamic route plus `analyzer-mcp-review-architecture` and `webflow-template-review-webmcp`.
- PR #1044 owns changes to Canon's `ArticleHeader.svelte` and `ResearchArtifactPage.svelte`. CRE-1366 must remain independent and must not silently overlap that lane.
- Preserve every substantive claim, citation, quotation, source link, example, experiment, code sample, diagram, interactive capability, metadata field, and continuation destination. Consolidation and progressive disclosure may change reading order; they may not delete the record.
- Preserve exact 404 behavior for invalid dynamic records.
- Do not stage the three build-generated Canon declaration files.

## Source inventory

- 41 in-scope route implementations: one dynamic route and 40 static routes.
- 42 `+page.svelte` files exist under `/papers` when the excluded index is included.
- The static family is highly fragmented: 34 routes import `SEO` and maintain their own page structure.
- Longest route sources include `threshold-dwelling` at 1,582 lines, `teaching-modalities-experiment` at 1,327 lines, and `three-tier-framework` at 1,245 lines.
- `check:research-artifacts` identifies the shared dynamic route plus 40 legacy paper-route exceptions.
- `check:papers` identifies 40 static routes, 38 static metadata records, and 12 file-backed dynamic records.
- The 12 dynamic records are `loop-operable-codebase`, `proof-surface`, `eval-evidence-layer`, `workflow-trust-layer`, `endpoint-construction-product`, `policy-os-contract-bundle`, `analyzer-mcp-review-architecture`, `webflow-analyzer-productization`, `andon-protocol`, `ground-case-study`, `composio-three-tier-delivery`, and `policy-os-development-infrastructure`.

## Local source gates

- `pnpm --dir packages/io check`: pass, 0 errors and 0 warnings.
- `pnpm --dir packages/io build`: pass.
- Scoped prose audit across all 41 implementations: block, but only for two `AI-powered` occurrences (`teaching-modalities-experiment` line 262 and `webflow-dashboard-refactor` line 57); 22 additional review warnings.
- Those results prove compilation and literal-policy coverage only. They do not overturn the rendered `revise` verdict.

## Exhaustive rendered baseline

Local production preview: `http://127.0.0.1:4179`.

### Mobile, 390 x 844, JavaScript enabled

- 41/41 return HTTP 200.
- 41/41 expose one `main` and one H1.
- 41/41 fit the 390px viewport.
- 40/41 have zero console errors.
- Maximum document height: 25,182px.
- Maximum H2 count: 17.
- 40/41 have more than five H2s; 22/41 have more than ten.
- 38/41 exceed 10,000px; 25/41 exceed 15,000px.
- 41/41 expose zero native `details` disclosures.
- Seven routes contain controls inside the main reading path.
- Text volume ranges from 1,645 to 21,573 rendered characters.

Tallest routes:

1. `proof-surface`: 25,182px, 17 H2s.
2. `three-tier-framework`: 23,424px, 12 H2s.
3. `code-mode-hermeneutic-analysis`: 22,400px, 13 H2s.
4. `intellectual-genealogy`: 22,114px, 12 H2s.
5. `wrap-pattern`: 21,662px, 13 H2s.

`threshold-dwelling` is the only console-error route. Its responsive SVG output repeatedly sets `line` y-coordinates and `text` y-coordinates to `NaN`.

### Desktop, 1440 x 900, JavaScript enabled

- 41/41 return HTTP 200.
- 41/41 expose one `main` and one H1.
- 41/41 fit the viewport.
- 41/41 have zero console errors.
- Maximum document height: 19,015px.

The lack of desktop errors does not rescue `threshold-dwelling`; its observed geometry failure is mobile-specific.

### Dynamic record states

- 12/12 file-backed slugs return HTTP 200.
- 12/12 expose one main, a non-empty H1, exact-width containment, and zero console errors.
- 11/12 place the ASCII artifact before the H1 in actual document order. `ground-case-study` is the sole exception.
- An invented dynamic slug returns exact HTTP 404.
- Eleven dynamic records render two canonical links; `ground-case-study` renders one.

### Metadata

- Thirty-nine routes render two canonical links.
- `ground-case-study` renders one canonical link.
- `threshold-dwelling` renders four canonical links.

The duplicate root metadata is broader than this route family. It remains a recorded defect unless the cohort can repair it without overlapping another owner.

## Constrained-state and interaction baseline

### No JavaScript

Representative routes still return HTTP 200 with one main and one H1, but interactive meaning is inconsistent:

- `proof-surface`: two dead buttons.
- `animation-spec-architecture`: seven dead buttons.
- `teaching-modalities-experiment`: thirteen dead buttons.
- `threshold-dwelling`: fifteen dead buttons.
- Shared Webflow paper route: two dead buttons.
- `beads-integration-patterns`: horizontal overflow to 411px in a 390px viewport.

### Keyboard and accessible names

- The teaching consent dialog can be dismissed from the keyboard, but focus falls to `body` rather than a meaningful continuation.
- Five visible teaching-experiment buttons have no accessible name.
- `threshold-dwelling` enters its expanded floor-plan state with Enter, exits with Escape, and restores focus to the trigger. That working behavior must be preserved.

### Reduced motion

Representative paper, animation, teaching, tool, and Tufte routes expose zero running animations after settling under `prefers-reduced-motion: reduce`. `threshold-dwelling` still emits its SVG `NaN` errors in that state.

## Target-reader review

The strongest existing paper shape is title, subtitle, metadata, and Abstract. That is a useful base, but it is not a complete family contract.

Material first-encounter friction includes unexplained terms such as `Code Mode`, `Zuhandenheit`, `Vorhandenheit`, `Hermeneutic`, `Beads`, `RLM`, `MCP`, `Agent SDK`, and `Subtractive Triad`. Later abstracts sometimes define the terms, but later explanation does not repair a difficult first encounter.

Representative findings:

- `proof-surface` leads with a small ASCII artifact before the title and then presents a 25,182px mobile record with 17 H2s.
- `beads-integration-patterns` is comparatively legible: title, subtitle, then Abstract. Its unexplained product vocabulary still raises the entry cost.
- `teaching-modalities-experiment` places a large sticky consent panel over the reading path, contains 16 main-path controls, and includes five unnamed buttons.
- `threshold-dwelling` is not an editorial paper in practice. It is a dense architectural visualization and control surface with 18 top-level controls plus interactive diagram elements, no reader thesis or orientation, unusably small mobile diagrams, and invalid mobile geometry.

A junior practitioner cannot consistently answer these questions at first encounter:

1. What practical question is this page answering?
2. What is the paper's conclusion in familiar language?
3. What evidence should I inspect first?
4. Which section is the default path, and which material is optional depth?
5. What should I do or read next?

## Required fail-first contract

Before production edits, the cohort contract must at minimum require:

1. Exact preservation and registration of all 41 implementation sources.
2. Truthful archetype ownership: 40 editorial implementations and a separate `threshold-dwelling` tool contract.
3. One route-specific reader question and plain thesis immediately after the H1, before an abstract, artifact, or unexplained vocabulary.
4. A bounded default reading path for long papers, while retaining the complete research record through semantic progressive disclosure and deep links.
5. Progressive controls: no false main-path buttons without JavaScript, accessible names for every control, keyboard continuity, and reduced-motion equivalence.
6. Finite responsive SVG geometry and usable mobile orientation for `threshold-dwelling`, while preserving its tool capability and working Enter/Escape focus behavior.
7. Exact dynamic HTTP states and a continuation for every implementation.
8. Rendered target-reader evidence; machine prose or exact-string checks cannot produce the final comprehension verdict.

## Baseline conclusion

The current family passes compiler and basic availability checks because those checks ask whether routes exist, render, and avoid a small set of literal prose failures. It does not pass the actual reader contract. The repair must establish a shared, plain, bounded reading path without flattening 41 distinct research records, and it must move `threshold-dwelling` into a truthful tool archetype rather than forcing it through an editorial template.
