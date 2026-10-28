# Cross-property independent retest

Reviewer: independent Sol 6.1 retest agent. Date: 2026-10-23. Scope: review only; no implementation changes.

## Outcome

**Pass for sampled visual and interaction gates.** One observed `.io` CTA contrast defect was corrected during review and independently retested. Complete route, screen-reader, external-link and production deployment certification remains untested.

## Actual browser evidence

Used installed Google Chrome through Playwright 1.58.2, pinned Node 22.23.4. Bundled Playwright browser was absent; Chrome required sandbox escalation and then executed successfully. Preview targets: `.io` http://127.0.0.1:4311, `.ltd` http://127.0.0.1:5174, `.space` http://127.0.0.1:5175. Actual live https://createsomething.agency was captured as the visual reference.

Screenshots are in `docs/reviews/screenshots/`: agency-reference-desktop; each property's home at desktop 1440×1000, tablet 768×900 and mobile 390×900; desktop `.io` papers/plugins/methodology, `.ltd` canon/principles/readiness, `.space` projects/workbench/about. IO home captures were refreshed after its final CTA and type adjustment. Captured screenshots are actual rendered UI, not generated evidence.

Visually inspected the agency reference, IO desktop and mobile, LTD mobile, and SPACE mobile. Material surfaces, grain, restrained light, black/slate page surfaces and small agent characters clearly continue agency's image family. The three sites retain distinct research, operating-library and open-workshop language and navigation. Images remain explicitly labeled concept illustrations. Home pages at all three widths had no document-level horizontal overflow; desktop sampled routes returned HTTP 200 without page errors, and all inspected scene images loaded.

## Gate results

| Gate | Result | Evidence / limit |
| --- | --- | --- |
| Agency visual continuity | Pass | Actual agency reference compared with rendered property screenshots. |
| Purpose and primary navigation | Pass, sampled | Research papers/evidence, library playbooks/readiness, workshop projects/tools remain legible. Primary hrefs inspected; external destinations not exhaustively followed. |
| Responsive layout | Pass, sampled | Home screenshots and scroll-width checks at 390, 768 and 1440 pixels; desktop inner-page captures. Inner-page mobile/tablet coverage not exhaustive. |
| Responsive image structure | Pass, source inspection | Native img components include srcset/sizes, explicit dimensions, eager hero/lazy secondary support, WebP assets and descriptive alt text. SSR network markup not independently tested. |
| Keyboard focus | Pass, sampled | First Tab reaches visible skip link on IO/LTD; IO 3px and LTD 2px outline. IO home summary focused and Enter opened details with visible 3px outline. |
| Research filter | Pass | Papers search `zzzz-no-match` returns 0 of 51, correct empty state and Clear filters action. |
| Motion pause | Pass | Fresh no-preference context: keyboard Enter on IO Pause motion changes label to Resume motion and animation state paused. SPACE changes label to Play motion and animation state paused. |
| Reduced motion | Pass, IO/SPACE | Emulated reduce leaves document.getAnimations() empty. LTD has no newly introduced scene motion; exhaustive legacy motion audit not performed. |
| Pricing and data preservation | Untested exhaustively | No price edits observed in reviewed changes; full catalog equality and authenticated behavior not independently certified. |
| Builds/checks | Not independently rerun | Parent/builders own applicable package check/build logs. This reviewer does not claim those results as independent evidence. |

## Findings

1. **Resolved during review — IO funnel primary CTA contrast.** Initial rendered home showed near-white text on near-white primary CTA. Final computed style for `a.property-funnel__button--primary` (Try the workbench) is foreground `oklch(0.205 0 0)` on background `oklch(0.985 0 0)`. Refreshed screenshots preserve corrected result.
2. **Existing semantic concern, nonblocking for image scope — IO papers nested main landmarks.** Playwright `locator('main')` resolves outer `#main-content` and inner `.papers-page`. This can create duplicate main landmarks for assistive navigation. No implementation change made; broader accessibility review should consolidate landmarks.

No unresolved blocking defect found in sampled visual/image interactions. All screenshots remain local preview evidence; no production deployment was performed by this reviewer.

## Draft deployment safeguard review

Independently inspected the final diff to `.github/workflows/io-paper-cycle-preview.yml`: only Deploy IO preview and Upsert preview comment gain `github.event.pull_request.draft == false` conjuncts. This prevents these two actions on draft pull-request events while preserving checks/builds. No workflow was dispatched by this reviewer. **Pass for the draft-only safeguard.** Marking the PR ready still permits automatic preview deployment, and the publish-approved enforcement occurs later in the job; retain draft state until deployment is authorized.
