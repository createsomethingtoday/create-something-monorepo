# CRE-1366 final verification

Date: 2026-07-20

Verdict: **ready for explicit human prose review; not approved for merge or deployment**.

## What changed

The paper-detail family now starts with the reader's question and a direct answer. Every public destination then names the evidence to inspect, the limit of that evidence, and one continuation. The complete research record remains available through native disclosure; it was not deleted or clipped.

The complete boundary remains intact:

- 1 dynamic implementation plus 40 static implementations.
- 12 configured file-backed records.
- 50 unique public destinations.
- 49 editorial destinations and 1 architectural tool (`threshold-dwelling`).

The shared implementation is route-owned rather than coupled to the artifact-first Canon shell. Interactive controls enhance only after mount. Without JavaScript, editorial records remain open and meaningful while false controls disappear.

## Baseline to final

| Measure | Baseline | Final |
| --- | ---: | ---: |
| Mobile destinations with a question, thesis, evidence cue, limit, and continuation before the record | 0/50 | 50/50 |
| Dynamic record states with the artifact before the H1 | 11/12 | 0/12 |
| Mobile implementations above 10,000px | 38/41 | 0/50 public destinations |
| Mobile implementations above 15,000px | 25/41 | 0/50 public destinations |
| Maximum default mobile height | 25,182px baseline; 40,342px during the first unbounded repair | 5,536px |
| Visible unnamed teaching controls | 5 | 0 |
| Invalid threshold SVG geometry | present | 0 |

## Exact production-build browser matrix

The final `packages/io` production build was served locally and tested at 390x844 and 1440x900.

Mobile, 50 destinations:

- 50/50 HTTP 200.
- 50/50 exactly one `main`, one H1, and one reading guide.
- 50/50 H1 then reading guide in actual DOM order.
- 50/50 horizontally contained.
- 50/50 zero console errors.
- 49/49 editorial records collapsed after enhancement; the tool has no editorial disclosure.
- 50/50 zero unnamed buttons and zero invalid SVG attributes.
- Maximum default document height: 5,536px.

Desktop, 50 destinations:

- 50/50 HTTP 200.
- 50/50 semantic and title-first reading-guide order.
- 50/50 horizontally contained and console-clean.
- 49/49 editorial records collapsed after enhancement.
- Maximum default document height: 4,272px.

No JavaScript, 50 destinations:

- 50/50 HTTP 200, semantic title-first orientation, and horizontal containment.
- 49/49 editorial records remain open with their complete content.
- `threshold-dwelling` remains a truthful tool and does not manufacture an editorial record.
- 50/50 routes contain no dead main buttons.

Dynamic states:

- 12/12 configured slugs return HTTP 200 with one H1 and one reading guide.
- An invented dynamic slug returns HTTP 404.

## Interaction and accessibility proof

- `Read the full paper` opens `#full-paper`, leaves the native details open after reload, and moves keyboard focus to the `summary`.
- The summary toggles with Enter and preserves a meaningful focus target.
- The teaching consent prompt returns focus to the H1 after either decision; its five unnamed controls were repaired.
- The threshold floor-plan control expands with Enter; Escape closes it and restores focus to the trigger.
- The threshold interaction emits no `NaN`, `undefined`, or `null` SVG geometry.
- Five representative reduced-motion routes report zero running animations after settling and zero console errors: Proof Surface, Animation Spec, Teaching Modalities, Threshold Dwelling, and Tufte Mobile Optimization.

## Source and workspace gates

- Focused fail-first contract: 7/7 pass. The unchanged source originally passed 1/6 and failed five product contracts; the bounded-record requirement was added red before implementation and is now included.
- `pnpm --dir packages/io check`: 0 errors, 0 warnings.
- `pnpm --dir packages/io build`: pass.
- `pnpm --dir packages/canon check`: pass, including 854/854 stable-component depth checks.
- `pnpm performance:pages:check`: 229/229 registered; 77 migrated, 140 pending, 12 technical exclusions.
- `pnpm performance:pages:test`: 3/3 pass after updating the migration-count fixture for this 41-implementation cohort.
- Scoped paper-family prose audit: 88 files, 0 blocking findings, 30 review findings.
- `pnpm check`: full platform, product, and services workspace lanes pass.
- `git diff --check`: pass.

## Known overlapping issue

Forty-nine destinations render a route-specific canonical plus an inherited root canonical; `ground-case-study` renders one canonical. This duplicate-canonical behavior predates and sits outside the paper-detail composition repair. It is recorded rather than hidden and should be resolved in the owning layout lane.

## Evidence

- Baseline: `evidence/cre-1366/source-and-rendered-baseline.md`
- Fail-first contract: `evidence/cre-1366/fail-first-contract.md`
- Target-reader packet: `evidence/cre-1366-target-reader-review.yaml`
- Screenshots: `evidence/cre-1366/final-screenshots/`

Consequential public prose still requires the explicit human final read required by the durable goal. Machine checks and this author review do not manufacture that approval.
