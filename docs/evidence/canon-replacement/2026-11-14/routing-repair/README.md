# Preserve Canon image redirects through the static server

PR #2294 merged as `f41ed1c1e0685b63f6f6a183502aa84a09953686` and all five
Pages workflows succeeded. The first live release check nevertheless found
404 responses for an old LTD illustration URL and `/workshop/canon.png` on LMS.
The new artwork and public pages loaded correctly. Release acceptance stayed open.

The adapter's generated `_routes.json` excluded existing static files but still
sent all 55 retired image URLs to the application worker. Pages' static
`_redirects` rules therefore never handled those requests. Moving `_redirects`
to package roots had repaired packaging, but had not verified this routing
boundary. [The red receipt](./redirect-worker-red.json) separates the two observed
live responses from the full built-artifact diagnosis.

The repair adds the retired image prefixes to the IO, LTD and Space adapter
exclusions, and the single exact image path to LMS. These exclusions precede
`<all>` so the adapter's 100-rule truncation cannot drop them. Normal page routes,
artwork, rendered components and approval scope remain unchanged.

`scripts/check-canon-image-redirects.mjs` now checks the actual deployable
`_redirects` and `_routes.json` together. It requires every source rule in the
artifact and every alias to bypass the worker. Property Pages runs this gate
after each affected build, alongside the existing legacy-byte retirement gate.
Five public-CLI tests distinguish exact/prefix exclusions from similarly named,
trailing-slash and worker-intercepted paths.

Validation:

- The new artifact gate failed for all 55 aliases before the configuration fix;
  [the full red output](./redirect-guard-red.json) is retained.
- IO, LTD, Space and LMS checks and production builds passed after the fix;
  [command outcomes](./redirect-check-results.json) record each run.
- The four rebuilt artifacts pass all 55 exclusions and redirect-membership
  checks, with zero retired-byte findings. Per-property green receipts are in
  this directory.
- The parent separately exercised the first live release in 96 public layout
  states, 18 narrow IO fragment/control checks, and both LMS WebGL rooms at all
  six widths, including keyboard focus, list modes, reduced motion and pause.
  The two scoped LMS practice-storage keys were restored byte-for-byte.
  Screenshots of actual phone/desktop homepages and workshop output were viewed.
  These checks establish the visual release at f41ed1c; they do not establish
  the repaired redirects before promotion.

Initial browser-harness failures were reviewed separately from the actual routing
defect: the harness compared outer body charcoal with a black hero, and measured
an animated guide's transformed screen rectangle instead of its 96px CSS frame.
Current captures and computed styles confirmed the existing intended output;
corrected checks passed. No product change was made for those assumptions.

Functional correctness of the repair passes locally. Perceptual change is
not applicable to this routing-only patch; the underlying visual output has
separate actual-browser evidence. Release readiness remains pending protected
merge, four repair deployments and independent exact-URL 301/200 checks.

[The first five deployment identities](./first-deployments.json) preserve the
pre-repair release. Earlier pre-redesign rollback deployments remain in
`../production-before.json`. Any Pages rollback changes code/assets only; it does
not undo stored data. The existing idempotent LMS quota-storage preflight was
performed by the normal production workflow; no learner migrations were replayed.

CRE-2455 remains open. Worktree disposition: preserved at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`
on `t3/canon-image-redirect-fix` until repair promotion and independent live acceptance.
