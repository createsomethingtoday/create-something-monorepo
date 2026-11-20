# Agency image-led release — CRE-2302

## Authorized outcome

The operator approved the full landing-page mock, a polish pass and sitemap-wide review,
then explicitly authorized completing the recommendations through production deployment.
The opening remains: **Put AI to work. Bring your team with it.**

The work serves all three tiers: asset and page contracts are Database artifacts;
responsive composition and interactive inspection are Automation; evidence, authority,
ownership and promotion boundaries remain Judgment.

## Production reconciliation

- Target: Cloudflare Pages `create-something-agency`, account
  `9645bd52e640b8a4f40a3a55ff1dd75a`, canonical domain `createsomething.agency`.
- Starting production deployment: `0f49f1db-e1eb-4c6c-99d5-12777c9b469b`.
- Immutable starting URL: https://0f49f1db.create-something-agency.pages.dev
- Starting source: `de710c4e0128032bae6b7c5275b941634d22d13d`, matching fetched `origin/main`.
- The old shared-root checkout was behind that source. Implementation uses an isolated,
  Linear-claimed release checkout; unrelated root edits were not copied into the release.
- Current Scopefield release/download boundaries, study variants, query intents, runtime
  bindings, identity routes and canonical/noindex policies are preserved.

The baseline project/runtime snapshot is stored in the local release evidence. Secret
values are never recorded; environment values are represented by fingerprints. Compare
the post-deployment snapshot before declaring release readiness.

## Implementation

- Homepage: four communication chapters containing the image-led opening, interactive
  Learn/Build/Run, an actual MaverickX recording, team handoff, boundary disclosures,
  explicit membership capacity, FAQ and direct booking handoff.
- Work library: native disclosure retains `?film=…` and `#work` deep links and source-backed
  engineering/film/client references without repeating the full catalog by default.
- Services and Products: actual Cato/Maverick recorded-work selection moves immediately
  after the opening. Repeated service orientations become labeled disclosures.
- Campaign composition: route family and source framing determine wide, inspection,
  collaboration, study, proof and task/operator layouts. Mobile images precede commercial
  actions; booking/contact and operating product records avoid campaign distraction.
- Signal, Decision and Proof: explicitly synthetic, read-only examples expose meaningful
  source, approval, stop, result and recovery selections. No tool is connected.
- All twelve workflow guides: a task-specific worked contract, matrix, review packet,
  case, comparison, map or trace with an expected path and a pause path.
- Privacy and Terms: reading gutters, bounded measure and section navigation; substantive
  policy text is retained.
- Map: primary full-canvas entry; embedded Draw initializes only after explicit selection.
- Practice: short synthetic local exercise before the ten-stage internal preview.
- Arcs: search, kind filtering, visible counts, reset and empty feedback; read-only and
  noindex boundaries remain.
- Footer: compact two-column phone navigation preserves destination inventory.

## Artwork and research

Two original conceptual scenes complete the story: reviewed operation and team handoff.
The original PNGs, exact built-in generation prompts, hashes, dimensions, source references,
derivative settings and intended crops are recorded in
`content/assets/brand/agency-image-led-20261030/`. Public WebP derivatives are under
`static/images/agency-sales/`.

The TASTE references informed composition and inspection, not copied source assets:

- https://www.are.na/block/32688970 — subject-led space and subordinate captions;
  avoid retail treatment and copied arrangements.
- https://www.are.na/block/39660465 — compact wayfinding around a dominant visual;
  avoid report density.
- https://www.are.na/block/35345375 — tangible inspection; avoid obscuring the actual work.

The generated images are conceptual process illustrations, not delivered hardware,
screenshots, live runs or evidence of client outcomes. Actual recording and source links
remain the proof for delivery claims. No palette, font dependency or identity provider
was introduced.

## Validation and regression evidence

- Pinned bootstrap: Node 22.23.4 and pnpm 9.15.0.
- `pnpm --filter @create-something/agency check`: passed, with zero Svelte errors/warnings.
- `pnpm --filter @create-something/agency build`: passed, Cloudflare Pages artifact generated.
- Local public sweep: all 48 sitemap routes plus seven intentionally noindex public routes
  returned 200 at 1440/390/320, without page overflow, broken opening images or application
  JavaScript errors.
- Homepage behavior: scene round trip, exclusive selection, native video dialog, Escape,
  focus restoration and legacy film deep links at 1440/728/390/320.
- Legal regression: real baseline gutter assertion failed, then passed after the wrapper
  and reading geometry fix. Section navigation preserves existing headings and text.
- Utility tests: explicit Map iframe initialization, Practice feedback, Arcs filters and
  empty state; no forms or external writes.
- Independent final Sol review: passed on the actual application. All twelve guide paths,
  product selections, recorded-work contrast, legal gutters at four widths, keyboard
  focus, no-JS meaning and task-first interactions were checked; no defects remained.
- Product/guide examples: explicitly synthetic cases and pause paths preserve approval,
  source uncertainty, ownership and no-connected-tools boundaries.
- Some older source assertions referenced already-retired experimental reading layouts,
  obsolete Ground claims, an incomplete public-detail inventory, or exact pre-existing
  formatting. The About portfolio now matches its existing plain-language letter and CTA;
  marketing audits read the actual raw homepage and worked-example sources. They now assert the current canonical route/evidence boundaries without
  restoring unsupported claims.

Reproducible browser scripts:

```sh
AGENCY_BASE_URL=http://127.0.0.1:4186 node packages/agency/scripts/verify-image-led-home.mjs
AGENCY_BASE_URL=http://127.0.0.1:4186 node packages/agency/scripts/verify-public-page-system.mjs
AGENCY_BASE_URL=http://127.0.0.1:4186 node packages/agency/test/agency-utility-polish.browser.mjs
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when the local browser cache requires an explicit
executable. Build/package generation and dev-server review should run sequentially: a
production build regenerates shared dependency outputs and can invalidate an active Vite
dev session. Restart the dev server after the build; do not count that tool-runtime failure
as production behavior.

## Promotion and rollback

Promote the reviewed source through the release PR to `main`, then deploy the corresponding
Cloudflare artifact through the existing Agency Pages path. Record the deployed SHA and
deployment ID in CRE-2302. Verify the public domain, all sitemap routes, changed page families,
key interactions, new image URLs and production configuration before closing the issue.

Rollback target: the recorded starting deployment above. Pages rollback is a dashboard/API
operation; the installed Wrangler does not expose a Pages rollback subcommand. Connected
resource data is not rolled back by restoring an application deployment. This release does
not migrate or deliberately write client, identity, booking or billing data.

## Quality gates

- Functional: local package/build and enumerated browser checks pass; final independent
  Sol review and live verification are recorded in the release closeout.
- Perceptual: direct desktop/phone inspection is required for the integrated application,
  including new image crops, actual evidence, reading geometry and state contrast.
- Release: source/configuration reconciliation and explicit user shipping authorization
  are established. A build alone is not production verification.

Worktree disposition: retained at
`/Users/createsomething/Code/agent-worktrees/cre-2302-agency-image-led` until production
verification and CRE-2302 closeout. The parent owns integration and release verification.
