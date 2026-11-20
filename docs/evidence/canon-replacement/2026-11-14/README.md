# Canon character replacement — CRE-2455

The current character replaces the older stone, metal, round-eye and flat-face
implementations across shared Canon, Agency, IO, LTD, Space and the LMS workshop.
Real product recordings, customer proof, client identities, the company cube and
faceless abstract instruments remain owned by their existing surfaces.

The user approved the 12 new task scenes and transparent body for production on
2026-11-14: **“Approve the artwork for production.”**
[The approval manifest](./artwork-manifest.json) pins the exact 13 PNG masters;
[sheet one](./artwork-scenes-1.png) and [sheet two](./artwork-scenes-2.png) show the
review set. Public asset manifests retain prompts, selected master hashes and
format-only delivery provenance. Existing welcome/review scenes and r41/r42/r45
identity assets retain their earlier approval.

## Acceptance and evidence

| Gate | Local result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed | Canon's 831 tests; affected consumer checks/builds and retirement scans; actual independent browser journeys below. Local evidence does not establish production behavior. |
| Perceptual/product quality | Passed | Three independent Sol 6.1 actual-output reviews; all six widths (320, 390, 768, 1024, 1025, 1440), approved felt/oval baseline, image failure, keyboard, no-JS and reduced-motion states as applicable. New artwork explicitly accepted by the user. |
| Release readiness | Pending promotion | Normal protected PR/main path, five authorized production targets and recorded rollback deployments. This pre-release record does not claim a merge, deployment or live acceptance. |

- [Agency independent review](./agency-review.md): 72 route/width cases and actual
  contact, practice, keyboard and fallback behavior; no real inquiry submitted.
- [IO/LTD independent review](./io-ltd-review.md): 114 route/width states, actual
  filtering/search/sort; three narrow-width defects repaired and independently
  retested in 18 states.
- [Space/LMS independent review](./space-lms-review.md): 30 final Space geometry
  states, search and local Playground; both actual WebGL rooms at six widths,
  travel/carry/pause/list and simulated no-WebGL fallback. No authenticated
  course or real provider action was exercised.
- [Art assessment](./art-verdict.json): raw independent subjective scores and
  medians, with dissent retained; these are separate from the user's acceptance.
- [Redirect packaging repair](./redirect-packaging-repair.json): the adapter
  rejected `static/_redirects`; moved the exact rules to package roots and
  verified all 55 destinations. No existing root redirect files were present.
- [Production before release](./production-before.json): five current successful
  Pages deployment identities captured through the Cloudflare API for rollback.

Ground advisory review reported 63 findings and 4,123 exclusions across a worktree
with historical untracked evidence. Its 14-file duplicate coverage does not certify
the UI sources. The reported task-adapter orphans are imported by their actual
route owners; historical evidence scripts remain outside this PR. The full
[advisory receipt](./ground-review.md) preserves findings and exclusions.

The independent reports are preserved as written. Their earlier statements that
human acceptance or parent-owned release checks remained pending describe their
own checkpoints; the explicit artwork acceptance above supersedes that art gate.
Full local logs and screenshot matrices remain in the registered worktree's
`cook/evidence/replacement/`; selected actual captures are included here.

## Delivery contract

The reusable `@create-something/canon/character` API owns 96px head framing and
text fallback below 96px, while each consumer supplies its approved image URL.
The shared `CanonTaskOpening` owns responsive CSS backgrounds and native aspect
reservation. Property adapters keep their own spacing and content semantics.
Heroes and CTAs retain real HTML text/actions over a black foundation with Geist
and measured wayfinding. Dense proof remains beneath artwork.

The retirement manifest identifies 208 old public assets by path and SHA256.
Source and built-artifact checks reject those files even if renamed. Fifty-five
property image URLs redirect to current approved depictions. Historical originals
are preserved outside public static trees or in Git history. These checks prove
inventory coverage, not aesthetic quality.

Production destinations are `createsomething.agency`, `createsomething.io`,
`createsomething.ltd`, `createsomething.space` and `learn.createsomething.space`.
Agency deploys from the merged main workflow; the other four use the manual
allowlisted main-branch Property Pages workflow. A failed live verification must
hold closeout and use the captured project's previous deployment for a scoped
rollback. A source revert requires the normal PR path. Stored data is not reverted
by a Pages rollback.

Tracked work and the final merge/deploy/live receipt belong in
[CRE-2455](https://linear.app/createsomething/issue/CRE-2455/replace-remaining-legacy-canon-character-implementations-across-create).
Worktree disposition: preserved at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`
on `t3/canon-complete-replacement` until production verification and closeout.
