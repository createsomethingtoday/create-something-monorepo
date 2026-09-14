# Impeccable replacement evaluation

Linear: CRE-2000. Decision: retain `canon-design-review`; do not adopt a permanent Impeccable skill or mandatory detector gate from this pilot. Conditional retirement was evaluated, not assumed.

## Fixed comparison

Baseline source: `7560b517c62b22d2b59515d8458b1aa0cf1a16cc`. Public targets: https://createsomething.agency/ and https://createsomething.io/papers. Viewports: 1440×1000 and 390×844. The current Canon review was recorded before detector execution. Impeccable assessment A (`/root/design_assessment`) and B (`/root/detector_assessment`) used separate contexts and tabs; neither read the other report. Parent had seen preliminary detector output before delegation, so this is not a blinded parent experiment. No fabricated timing or conversion benchmark.

Replacement criterion: preserve house contracts, miss no consequential baseline finding, and demonstrate additional consequential verified findings or clearly lower review effort. Two pages cannot establish universal quality across all properties; this is a bounded adoption decision.

## Results

| Workflow | Evidence | Increment over baseline |
| --- | --- | --- |
| Canon review | Missing selected-state semantics, missing result announcement, compounded list spacing | Baseline |
| Impeccable design assessment | Reproduced all three; added editorial suggestions about image semantics, fit decisions and topic density | Useful critique, but no demonstrated consequential mechanical improvement or lower effort |
| Source detector | Zero findings on both Svelte entrypoints, before and after fixes | Did not detect the confirmed accessibility issues |
| Mobile URL detector | 22 findings: 19 warnings, 3 advisories | Tight gutters were credible low-priority concerns; several aesthetic warnings conflicted with intentional Canon patterns; nominal 1:1 contrast warning contradicted rendered evidence |

The detector is not a complete accessibility or design verifier. Shared-component imports are outside a two-file regex scan. A clean scan cannot justify retiring a review workflow. The critique instructions remain capable of useful review; this pilot does not show exceptional superiority.

Keep Canon tokens, Performance/Meridian identity, and the existing skill. No global palette/font changes, new review wrapper, permanent third-party install, or new automatic CI gate are warranted by this evidence. Reconsider if a later pinned version demonstrates useful precision and coverage on a broader fixed corpus.

## Changes selected for production

On the IO papers index, expose the four category and three sort buttons with `aria-pressed`, label the two groups, make the result count a polite atomic status, and remove inherited section padding from the list because the index hero already owns that separation. Preserve content, keyword metadata, sorting/filtering behavior, identity and all global tokens. These changes benefit the actual research task and were independently reproduced.

Broad editorial suggestions were not promoted as facts or automatic fixes. An incomplete browser-overlay attempt is not treated as a tool success.

## Reproducibility and limits

Commands used:

```sh
npx --yes impeccable@4.1.0 detect --json packages/io/src/routes/papers/+page.svelte packages/agency/src/routes/+page.svelte
npx --yes impeccable@4.1.0 detect --json --viewport 390x844 https://createsomething.agency/ https://createsomething.io/papers
.agents/skills/impeccable/scripts/impeccable detect --json packages/agency/src/routes/+page.svelte packages/io/src/routes/papers/+page.svelte
```

The temporary project installation is evaluation equipment, not a repo dependency. npm CLI 4.1.0 resolved engine dependency 0.1.5, while its installer downloaded skill 4.3.1. The bundled engine probe reported `impeccable-engine 0.1.5`; its CLI version string was 4.0.0. These distinct identifiers must not be conflated. Skill release commit: `cd12f8660e2dde57b9615c8a6b8ea674101f9cfc`; universal.zip SHA256: `1deea4cdfb1608df6d9e08ef359629e7cc866a22ab7c2195a835627b887f190b`. Pinning the installer alone does not pin downloaded skill content. Raw results and assessment provenance are retained here; screenshot originals and manifest are in the evaluation worktree's `output/impeccable` directory.

Assessment A completed live inspection and interactions before browser control passed to the user. B confirmed mutable injection preflight and appended the overlay script, but execution was unconfirmed after an explicit user-control stop. B stopped its server and used saved screenshots; no full overlay or desktop detector success is claimed. Exact assistive-technology speech was not tested; DOM/live-region verification supports semantics, not a screen-reader certification.

Questions skipped: user authorized completing the comparison and verified improvements to production; no further taste decision is needed for the selected fixes.

Validation and production receipts are recorded in CRE-2000 and the goal result artifact; do not infer deployment from this source document alone.
