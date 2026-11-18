# Independent IO/LTD final retest — CRE-2455

**Result: local functional correctness passed; perceptual/product quality passed; release readiness untested by this reviewer. No unresolved findings remain within the assigned review scope.**

Independent Sol 6.1 review of the actual local browser output, not the builder's conclusions. Source/runtime were read-only. Evidence writes are confined to this directory. No package commands, builds, syncs, servers, commits, external form submissions, or production promotion were performed by this reviewer.

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | **Passed — local runtime** | 114 route/width states, actual filters/search/sort and navigation, keyboard activation/focus, no-JS copy, reduced motion, blocked-image copy fallback, and focused red-to-green repair checks. Local development data and browser behavior; no production/backend/provider acceptance claim. |
| Perceptual/product quality | **Passed — independently viewed** | All 18 owner hero matrices at six widths, preserved Canon at six widths, fallback/focus views, all 18 repaired states, and final r21 artwork on both owners at 390/1440 directly viewed. Felt identity checked against actual approved r41 body/r42 head assets. No new subjective median score is asserted. |
| Release readiness | **Untested** | Candidate scope and origin verified. Parent relayed user approval of all 12 new scenes and the cutout for production. Final deployable artifacts, builds, promotion, production behavior, and approval-metadata updates remain parent-owned and were not independently tested here. |

## Coverage

Widths: **320, 390, 768, 1024, 1025, 1440** CSS pixels. Actual local Svelte runtimes: IO `5191`, LTD `5194`. Listener/process cwd readback confirms both servers belong to the exact candidate worktree (`runtime-origin.json`).

- IO: `/`, `/about`, `/newsletters`, `/docs`, `/docs/ground`, `/plugins`, `/experiments`, `/methodology`, `/papers`.
- LTD: `/`, `/playbooks`, `/playbooks/inbound-triage` (discovered and opened through the actual UI), `/voice`, `/standards`, `/readiness`, `/ethos`, `/principles`, `/patterns`.
- Preserved approved surface: LTD `/canon`.

The final compositions retain the black foundation, local Geist, measured hierarchy, square framing, separate real HTML headings/actions and CSS backgrounds. Artwork stays at its authored aspect without text crossing the task. New owner captions explicitly say **Concept illustration** and remain accessible text. The soft cuboid felt heads, woven oval eyes, notebook and gentle hands fit the approved character; each physical task remains legible. Approved `/canon` artwork is contained, and its portrait flows beneath HTML on phones.

Independent source and static-byte audit found **zero retired consumer URL references and zero retired asset hash matches** in IO/LTD. All **36** final responsive asset dimensions match the declared aspect (`legacy-independent-final.json`, `source-aspects.json`). This is source/static coverage, not a deployable-artifact audit.

## Actual behavior

- Papers: Methodology changes the local 51-paper set to 11; `Fresh Index` returns one expected title; a nonsense search returns zero; clear restores 51; Quick Reads changes the order.
- Experiments: Minimalism returns 20/26; `Governed Codex` returns one; a nonsense query returns zero; clear restores 26; Oldest produces oldest-first cards. Both groups are named; all nine filter/sort buttons expose pressed state and measure at least 44px high.
- Playbook library/back/detail navigation succeeds. Native Tab shows actual 3px IO and 2px LTD focus outlines on hero links; Enter reaches Experiments and Readiness respectively.
- All 18 owner openings retain visible HTML copy/actions with JavaScript disabled at 390px. Both homepages retain copy/actions when background images fail (`naturalWidth=0`). Reduced-motion mode produces zero running animations on both homepages. Browser emulation/network settings were restored.
- IO metrics remain outside the hero with number tops aligned by row at 390 and across four columns at 1440; text and values are preserved.

## Findings repaired and independently retested

| Finding | Failing actual output | Final retest |
| --- | --- | --- |
| Plugins first copy control clipped at 320 | Button x330–354 with client width310 | **Passed**: 44×44 button x217–261; actual click returns `✓`. |
| Ground hero command exceeded its narrow frame | Command right321, copy right267 | **Passed**: code, text fragments and controls stay inside both copy and viewport. |
| Documentation split into `Documenta` / `tion` | Narrow nested gutters broke the word | **Passed**: one text fragment, inside copy bounds at all six widths. |
| Sequence illustration had an ambiguous dangling arrow | Earlier r19 artwork | **Passed**: final r21 loaded at native aspect on detail and Standards; all four 390/1440 outputs directly viewed, with clean sequence ink and clear task/caption. |

The three IO routes passed **18/18** focused repair states. This check tests actual text fragments/control bounds, not only document scroll width: global clipping had hidden the original overflow. Preserve `narrow-red.json` and `*-320-red.png`; final evidence is `narrow-green.json`, `*-fixed.png`, `*-fixed-matrix.jpg`, `plugins-copy-control.json`, `sequence-final.json`, and `*-r21.png`. R21 was freshly checked at 390/1440; the remaining four widths retain the previously reviewed identical square geometry.

## Provenance and limits

Worktree: `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`; branch `t3/canon-complete-replacement`; HEAD/base `868081269796cf945ea1d2520069ab37e88f2660`. Start, art-freeze and final-pass pins are saved. **602 relevant files had zero changed or removed hashes during the final pass** (`hash-final-pass-start.json`, `hash-final-pass-end.json`). Parent-notified geometry, accessibility, narrow-width and r21 asset changes are explicitly represented in earlier pin comparisons. Subsequent approval metadata updates are outside this pin.

Local cold development hydration once discarded an immediate filter click; the warmed actual UI passed. An initial local navigation stall recovered in the same tab and did not recur. No production hydration/performance or physical-device claim is made. Earlier offscreen-clip/full-page capture failures were tool artifacts; final acceptance uses complete, directly viewed hero captures after font loading. Final r21 captures use normal 1000px-high viewports.

Ego TaskSpace20 was preserved. Reviewer-owned **p3 was closed**; only protected **p1 remains**. No TaskSpace finish was called. Worktree disposition: **preserved at the path/branch above for parent integration and release**.
