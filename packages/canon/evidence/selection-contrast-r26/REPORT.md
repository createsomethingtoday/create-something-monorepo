# R26 bounded selection contrast audit

Readonly source review; evidence-only writes. Exact worktree t3-a01044d6-2f560e0ec9e58190; existing local Canon localhost:5191. Ego space58. No build/check/package/source/server/release operations.

Acceptance: selected/current/focused state remains readable and distinguishable in forced-colors OS palette. Preserve original palette/text. Existing fixtures only: DatePicker and Combobox on /next/utility; default/pills Tabs and Pagination on /next/components.

## Confirmed findings (stop at two)

1. **Tabs selected indicator disappears in forced colors.** Select History in default and pills fixtures, then focus elsewhere. Both Draft and History render the same foreground, font-weight500 and no border. Default active underline is background-only and becomes Canvas (white in light, black in dark). Pills active fill also becomes Canvas, and shadow disappears. Directly viewed captures show no selected distinction. ARIA and visible History panel update correctly; that does not restore tab selection paint.
   - Source: src/lib/components/navigation/Tabs.svelte:189-193 (default background underline), :216-218 (pills background/shadow). Underline variant shares mechanism at :241-242 but was not present/exercised in fixture.
   - Evidence: tabs-runtime.json; tabs-light-1440.png, tabs-light-390.png, tabs-dark-1440.png, tabs-dark-390.png. Exact innerWidth and media verified in JSON. Dark390 capture clips first tablist due resize scroll anchoring; pills remains visible; dark1440 covers both.
2. **Combobox keyboard-highlighted option loses its visual position.** Open Destination, select United States, reopen, ArrowDown twice from initial United Kingdom highlight to Canada. Canada is `.highlighted` but has identical foreground/font and no outline/border to unhighlighted United Kingdom; only background differs computationally, becoming Canvas and visually disappearing. Direct screenshots show no keyboard-highlight distinction. Enter selects Canada, proving that invisible highlight controls actual selection (combo-enter-snapshot.txt).
   - Source: src/lib/forms/Combobox.svelte:400-402 background-only highlighted style; keyboard highlightedIndex path :103-132.
   - Evidence: combo-runtime.json; combo-{light,dark}-{390,1440}.png.

## Controls that retained meaningful distinction

- Combobox committed selection: check symbol remains on United States. Do not conflate the passing committed selection marker with failing keyboard highlight.
- DatePicker: selected November18 retained font-weight600 vs400 for adjacent17/19, visibly bold in OS light/dark. Trigger reads Nov18,2026 after real selection. No selected-state failure recorded; date-{light,dark}-{390,1440}.png and date-runtime.json.
- Pagination: current Page5 has OS-colored border and explicit nearby 'Page5 of5' text. Actual current aria state updated. No failure recorded. tabs-runtime.json and tab screenshots.

## Gates and limits

- Functional correctness: **passed for bounded offline fixture interactions**: real date, option, tabs and page selections updated local state; Enter committed Canada. Not a complete component suite or live backend test. No callbacks beyond fixture binding claimed.
- Perceptual/product quality: **failed** for Tabs selected state and Combobox keyboard highlight, demonstrated with direct screenshots and computed paint. Date selection and committed combo/page state retain cues. Chromium forced-colors emulation only; Windows high-contrast OS not tested.
- Release readiness: **not-applicable** to this readonly audit; no deployable change created or promoted. Findings remain unresolved.

Tool limits: Ego metrics/media overrides reset between invocations; reapplied each capture invocation. First exploratory 1253px captures were replaced with verified1440px captures. Some high-level actions and Svelte state reads were temporally separated; eventual selected state was independently read in capture invocations. Ego update notice observed; no upgrade performed. Own space58 closed after evidence collection.
