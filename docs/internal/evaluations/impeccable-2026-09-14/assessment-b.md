# Assessment B — detector and rendered evidence

Independent agent: `/root/detector_assessment`. Assessment A and `canon-baseline-review.md` were not read. Review only: no factual copy, identity, source implementation, or production state changed.

## Versions and actual capability

Installed skill metadata says **4.3.1**; its launcher `scripts/VERSION` is **0.1.5**, confirmed by `engine-probe` → `impeccable-engine 0.1.5`. The same launcher reports **4.0.0** for `--version`. Those are separate observed identifiers, not evidence that all executable components are 4.3.1. Parent's saved scans were invoked with `npx impeccable@4.1.0`; their underlying engine version was not captured here. No claim of rule parity or an upgrade comparison is justified.

Current help supports static HTML/CSS analysis, regex matching for non-HTML source, rendered URL scans through Puppeteer, viewport selection, scoped rules, ignores, advisories, and JSON. Exit 0 means no primary findings; 2 means primary findings; 1 means a target could not be scanned. Critique's prescribed source scan was run through the bundled launcher. Context ran once and reported missing PRODUCT.md/DESIGN.md, incumbent implementation as refinement authority, and no automatic hook. No context files were invented.

## Deterministic outcomes

`impeccable detect --json packages/agency/src/routes/+page.svelte packages/io/src/routes/papers/+page.svelte` returned **0 findings, exit 0, empty stderr**. Machine output: `assessment-b-source.json`. Parent's prior `source-baseline.json` also contains `[]`. This is a narrow regex scan of two Svelte entrypoints, not a clean bill for imported Canon components, computed CSS, or the deployed pages.

Saved parent mobile URL output at 390×844 contains **22 findings: 19 primary warnings and 3 advisories**. Agency: **15**; IO papers: **7**. Existing JSON lacks unique selectors and uses URL `line: 0`; source locations below are grounded owning candidates, not fabricated detector line mappings. Prior process exit was not independently captured by B.

| Rule | Agency | IO | Rendered validation and disposition |
|---|---:|---:|---|
| `body-text-viewport-edge` | 6 | 2 | Narrow 12–14px inset is credible and visible in agency hero/FAQ and footer copy. Canon `tokens.css:190` defines a 0.75rem minimum page gutter; campaign component uses it. Valid low-priority density concern, not clipping: saved geometry reports scrollWidth equal to viewport width for both sizes and sites. Eight snippets cannot be uniquely mapped from character counts alone. IO primary list has a more comfortable inset than the shell/footer candidates. |
| `all-caps-body` | 2 | 1 | All-caps small metadata exists, but the 58/47-character candidates include footer identity/tagline treatment rather than prose paragraphs. `Footer.svelte:1254` explicitly defines tracked uppercase identity text. Treat these as label/identity scope false positives when proposing body-copy changes; the unexplained agency 86-character candidate remains unmapped, not confirmed body copy. |
| `side-tab` | 2 | 0 | Four-pixel edges exist in Canon control/state vocabulary (`performance.css:118`, conversion handoff `dl` at component line 130). In the rendered page the green handoff boundary communicates state. A generic claim that this is an AI-generated tell is not a product defect. Preserve semantic state edges; exact left-border instance lacks selector and remains only a probable mapping. |
| `kicker-above-heading` | 1 | 1 | Confirmed: agency “Common questions” → “What to expect.” (route line 176); IO footer “Next possession” → conversion heading. These are deliberate Canon editorial labels. Detector's absolute ban conflicts with incumbent brand authority. FAQ label actually clarifies its vague heading; do not delete automatically. IO metaphor may merit copy judgment separately, not an automatic pattern-ban fix. |
| `bounce-easing` | 1 | 1 | Same cubic-bezier string reported on both URLs. No animation event was exercised; could be shared or third-party CSS. Not validated as a visible issue. |
| `repeating-stripes-gradient` | 1 advisory | 1 advisory | Shared performance stylesheet contains deliberate repeating texture (`performance.css:100,193`). Style presence does not prove a visible objectionable texture; neither screenshot justifies declaring a defect. Scope false positive/unvalidated rendered use. |
| `low-contrast` | 2 | 0 | **False-positive ratio**: the reported 1.0:1 heading and paragraph at “Start with the task you want help with.” visibly contrast against dark background. Screenshot crop `b-agency-cta-crop.png` shows white heading and gray paragraph; component CSS sets white/70%-white text over ink with transparent grid gradients. Detector labels its method `analytic-gradient+alpha`, consistent with an incorrect background composite. Do not report this as a confirmed WCAG failure; exact pixel-based AA compliance was not measured. |
| `gpt-thin-border-wide-shadow` | 0 | 1 advisory | No locator identifies the 1px + 48px blur element. Main research results are plain editorial rows, not shadowed cards; `tokens.css:184` sets performance panel shadow to none. Could be shell/consent UI. Unmapped, not a validated research-card defect. |

## Browser and overlay evidence

Created **own p3**, in existing **TaskSpace 1**; never navigated p1 or another assessment's tab. Agency navigation succeeded. Mutable preflight succeeded: changed title to `[Human] AI Help for Your Business | CREATE SOMETHING .agency`, appended a script, and observed its `window.__impeccablePreflight` flag. Set 390×844 viewport. Started the prescribed background server at port **8400**, PID **28146**, and appended `http://localhost:8400/detect.js`.

The following browser call was denied: **“The user has taken control of this task space, so browser commands are paused.”** This was honored as a hard stop. No takeover/retry, no alternative browser workaround. Thus script insertion is confirmed but load, detector execution, console findings, and visual overlays are **unconfirmed**. No reliable user-visible overlay can be claimed. Desktop and IO overlay runs were not completed. The multi-view ideal of 3–5 injected representative views was not met.

Fallback: visually inspected the existing agency and IO desktop top screenshots (1440×1000), mobile top screenshots (390×844 viewport, screenshot content 380px plus scrollbar), full-page mobile captures, and corresponding DOM summaries. Cropped the saved agency full-page screenshot solely to inspect the falsely flagged CTA. These are inherited rendered evidence, not a fresh successful B browser capture. Top captures confirm agency text remains legible and IO filters/search/results fit; full-page captures ground FAQ and conversion findings. No search, filtering, keyboard, focus, or performance claims are made.

## Contracts and limits

Reviewed owning agency/IO AGENTS, package README/UNDERSTANDING context, Canon README/UNDERSTANDING/AGENTS, local overlay surface policies, relevant route/component sources and Canon tokens/performance styles. Canon owns shared primitives and identity; property overlays own local content and policy. State edges, metadata, and editorial labeling must be evaluated against those purposes before adopting Impeccable's categorical aesthetic bans. The strongest actionable mechanical signal is tight mobile gutters; the most serious nominal warning (1:1 contrast) is contradicted by visible evidence.

No new deterministic desktop URL scan: critique directs URL browser visualization, and browser was stopped for user control. Do not infer desktop rule absence from missing scan coverage. No layout-overflow was present in saved geometry at either requested viewport, but that is not an accessibility audit. No source-to-production revision identity was independently established.

## Cleanup and evidence

Stop method recorded and executed: `kill 28146`. Subsequent `ps` returned no process; `lsof -nP -iTCP:8400 -sTCP:LISTEN` returned no listener. Server is stopped. p3 remains because user control prohibits further browser actions; parent must decide cleanup after explicit resume. Its temporary title/script may remain; no claim they were removed.

Machine evidence: `assessment-b-evidence.json`, `assessment-b-source.json`, empty `assessment-b-source.stderr`; downloaded exact served bundle `assessment-b-detect.js` retained as provenance, and CTA crop retained. No temp files outside the review output were created. No critique ignore file existed. Parent owns slug/storage/trend and final synthesis; B does not modify those artifacts.
