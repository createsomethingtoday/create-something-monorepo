# Astryx foundation implementation

Tracked work: [CRE-2373](https://linear.app/createsomething/issue/CRE-2373/gigi-adopt-astryx-design-foundations).
Reviewed and implemented on 2026-11-08 from base
`9dfd3069018c07cae80123469fcb86c632d0961a` (`origin/main`).

GiGi now shares an Astryx-based foundation for color roles, typography, spacing,
shape, controls, feedback and elevation. Studio/Paper adapt the neutral themes;
Midnight keeps GiGi's deeper slate palette with the same roles. The design review,
official source links, deliberate adaptations and maintenance contract are in
[`DESIGN_FOUNDATION.md`](../../DESIGN_FOUNDATION.md).

The implementation keeps native HTML/ESM, stable preference IDs and all existing
application handlers. It does not install Astryx's React component library or
change records, consent, credentials, import, approval or publishing behavior.

## Gates and evidence

| Gate | Status | Evidence and limit |
| --- | --- | --- |
| Functional correctness | Passed in synthetic scope | Package tests: 344 passed, 2 skipped; foundation browser harness: 12 combinations (3 themes × 2 densities × 2 sizes), contrast, draft retention, restored chat preferences, menu focus recovery, error/approval and reduced motion. Existing daily-polish browser regression also passed. |
| Perceptual/product quality | Passed in reviewed scope | Parent and independent Sol 6.1 reviewer directly viewed actual rendered output and comparable baseline; reviewed Today, Appearance, record/editor, search, chat/approval, Music and Instagram connection/error surfaces. No blocking regression found. |
| Release readiness | Untested for production distribution | Source implementation is reviewable. No new native WebKit/installed-app acceptance or signed/notarized installer was built or distributed. Existing production installer remains unchanged. |

The two skipped package tests require an explicit installed MCP artifact via
`GIGI_INSTALLED_MCP`. They are not counted as passes. No Rust or provider behavior
was changed; this pass does not claim live provider acceptance.

The browser harness serves actual owned app HTML/CSS/ESM with synthetic records.
Native calls are denied, external connections are blocked by CSP, and no user
profile/database is opened. All measurements below are Chromium fixture evidence.

- Minimum primary action contrast: **13.69:1**.
- Minimum sampled secondary text contrast: **8.23:1**.
- Minimum unfocused input boundary contrast: **4.02:1**.
- Tested window sizes: **880×620** and **1280×840**.
- Primary normal, hover and pressed states have distinct backgrounds and retain
  text contrast; keyboard focus has a visible ring. Reduced motion removes active
  transitions/animations. This is not a claim about native motion quality.

Independent Sol 6.1 review reran the package and browser checks, viewed the actual
output, and found no blocking regression. It identified a small approval-card
shape inconsistency and a search anatomy exception. The parent corrected the
approval radius to the shared 16px container role, read back the rendered value,
and reran the affected harness. The intentional borderless search row is documented.

## Retained visual proof

- [Before: Studio at 880px](before-overview-studio-880.png)
- [After: Studio at 880px](studio-880-comfortable.png)
- [Paper Appearance](paper-appearance.png)
- [Midnight task editor](midnight-task-editor.png)
- [Midnight chat/approval state](midnight-approval.png)
- [Chat preferences](chat-preferences.png)
- [Measured contrast results](metrics.json)

The full temporary capture sets include every theme/density/size combination.
These selected images contain synthetic data only; no third-party reference
images were added to the repository.

## Reproduce and promote

From `apps/gigi-desktop`, after repository bootstrap:

```sh
node --test web/*.test.mjs scripts/*.test.mjs
node scripts/astryx-foundation-browser.mjs --check --out /tmp/gigi-astryx-evidence
GIGI_POLISH_EVIDENCE=/tmp/gigi-daily-evidence node scripts/daily-polish-browser.mjs
```

`--baseline` captures committed HEAD assets using the same fixture. Capture it
before committing a new foundation when comparing changes.

Next release owner must qualify the exact native build in WebKit, inspect the
existing workflows on that artifact, sign/notarize and verify the intended
installer before distribution. A source PR or screenshot does not complete that
promotion. Rollback is a scoped source revert; there is no data/schema migration.

Worktree disposition: preserved at `/tmp/cre-2373-gigi-astryx`, branch
`codex/cre-2373-gigi-astryx`, for source review and native release qualification.
