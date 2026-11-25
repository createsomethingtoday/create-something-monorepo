# Independent integrated R29 retest

Changes required: two confirmed Combobox findings. No application edits or repairs were made. This review stops at the instructed two-finding bound; remaining unexecuted cases are listed below.

Exact intentionally dirty worktree `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. Source fingerprint before/after all commands: 1,990 files, SHA256 `fc324614f709c7e4920777a0ef564d65326692618e21c66d9822de3506bb08e4`. Snapshot includes Canon tests and LTD canon-next assets; evidence/caches/secrets excluded. After-browser fingerprint and closure recorded separately below.

## Confirmed findings

1. **Combobox keyboard option is not exposed as the input's active descendant.** Actual hydrated `/next/utility`, focus remains on the combobox input after ArrowDown twice. Canada is `.highlighted` and `aria-selected=false`; United Kingdom remains committed (`aria-selected=true`, checkmark). Input has no `aria-activedescendant`, and all option IDs are empty. `combo-relationship.json` preserves actual DOM. `aria-controls` correctly resolves to the open listbox `combobox-1f4e561a`; no hydration ID mismatch was found. Provide stable option IDs and a valid active-descendant relationship while the popup is open, clearing it on close, without confusing highlighted with committed selection.

2. **Normal light/dark keyboard highlight has no visible distinction.** Actual Canada target is white in light and #111 in dark, matching the dropdown surface; outline style is none. The UK check identifies committed selection only. Directly viewed `independent-combo-normal-dark-320.png` and `independent-combo-normal-light-1440.png` show no visible Canada target cue. All four normal cases in `combo-corrected.json` record the same mechanism. Preserve a distinct keyboard target in ordinary owning palettes as well as forced colors. This is a pre-existing normal-style issue exposed by the required regression review, not a claim that R27 altered normal CSS.

## Fresh passing evidence

All 11 requested commands passed sequentially with pinned `npx --yes pnpm@9.15.4`: Canon test/check/build; Agency, IO, LTD and Space check/build pairs. Canon 821 tests passed. `results.json` records start/end, exit and log per command. Full package/check gates ran; no checks were weakened. These are local offline tests and deployable local builds, not live production or real external workflows.

Actual Ego space61 six-width character and LTD matrices: 320/390/768/1024/1025/1440, with no root horizontal overflow. Character visible controls meet44px, six captioned pose frames are <=200px. Directly viewed current r41 recommended body, r42 head at96px on black/paper, and all six r45 captioned poses at1440, plus narrow body/head/pose captures. The squat silhouette, oval eyes, woven material, full antenna/hands/feet and restrained black foundation remain legible at intended local display sizes. This is not final master artwork approval.

Real character state selection, preparation and reset retain the identical `/canon-next/cuboid-head-prototype.png` while truthful words change; prepared receipt explicitly says no live tool executed. `character-states.json`. Scripting disabled actual readback confirms all3 select/buttons disabled and native disclosure opens (`nojs.log`). Overview320/1440 directly viewed: compact head, black background hero and CTA composition remain intact.

LTD all6 widths retain CSS background hero sources, zero header img elements and four destinations: colors/components/patterns/philosophy. Desktop and portrait captures directly viewed; full face/task and HTML copy remain clear on black with Geist hierarchy. Actual keyboard index→Colors→Typography, then back and forward, updates H1/title/exactly1 description/OG title-description-URL/canonical/WebPage name-URL together. `navigation.json` retains schemas including breadcrumbs. 320px inline-code readbacks for colors/typography/theming/get-started have no root overflow. This is local dev runtime after current Canon packaging, not published behavior.

Forced-color Combobox light/dark390/1440: distinct2px Highlight outline on Canada independent of UK check, all4 pass/no overflow. Real Enter commits actual Canada. `combo-corrected.json`, directly viewed forced-light390/dark1440 captures. Forced-color Tabs default/pills captures directly viewed at390: History underline/default and outlined pill remain distinct after blur. Final tabs-only matrix results are appended below.

## Limits and harness corrections

No screen reader, native browser zoom, Windows OS high-contrast or full WCAG qualification. The two-finding stop leaves browser-only underline Tabs diagnostic and independent LTD no-JS/missing-image reruns untested; their prepared scripts were not executed. No unexecuted harness is acceptance evidence. Human approval, final master export, eight-hour floor23:05:32Z and release remain parent-owned.

The first state harness used nonexistent option `review`; available actual option is `needs-review`, corrected only in reviewer harness. No-JS reload produced Ego's pending-navigation diagnostic; continuing the stopped document showed disabled native controls and usable disclosure. First selection loop clicked ordinary appearance outside Combobox and closed it, then final Enter timed out; those closed-popup captures do not establish option acceptance. The corrected affected loop refocuses input/rehighlights Canada after appearance changes and explicitly positions the settled popup. Final corrected normal/forced files and JSON supersede that failed harness. Earlier same-name1440 selection screenshots could be overwritten by forced media; corrected filenames separate normal/forced.

## Quality gates

- Functional correctness: **failed** overall: active-option accessibility relationship absent; ordinary target cue absent. All11 fresh commands and bounded character/SEO/containment/forced-combobox behavior checks pass.
- Perceptual/product quality: **failed** overall: ordinary keyboard target indistinguishable. Directly viewed character, overview, LTD and forced selection outputs pass the bounded composition/clarity review described above. Human art acceptance remains open.
- Release readiness: **failed/unapproved**: local builds pass, but two findings remain and no publication is authorized. No commit/push/deploy/Linear/external mutation.

Worktree disposition: preserved at the exact path/branch above. Parent-owned servers5191/5194 were reused without stop/restart. Ego advertised an update; no upgrade performed. Protected parent space12 and user spaces untouched.

Final tabs-only corrected matrix: all8 cases contained; forced light/dark390/1440 selected markers pass after blur. Normal owning light/dark320/1440 directly viewed and coherent. Native ArrowRight twice (disabled Archived skipped) and End retain History in both default/pills. `tabs-corrected.json`. Underline variant remains untested.

Final after-browser fingerprint matches all1,990 files: `fc324614f709c7e4920777a0ef564d65326692618e21c66d9822de3506bb08e4`. Own Ego space61 finished with keep=[]; no reviewer commands or servers remain running. SOURCE/BROWSER RELEASED.
