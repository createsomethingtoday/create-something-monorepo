# Agency conversion draft — October 19, 2026

Approved implementation on `codex/agency-conversion-rea` on Micah-W4FJPH. The reviewed draft began at local `main` `a45054436f97496c3958995829b005d4af3623de`; only the redesign commit was transplanted onto current upstream `82cc2eea63c1fdfb0a8351f4bef671e00a814f07` for release. User approved merge and Agency production deployment. Other properties and shared tokens are unchanged.

## Direction and preserved contract

The core brand phrase is **AI-native Technical support**. The offer remains diagnosis, agreed engineering improvements and help using the result. The same booking URL, query attribution, published pricing, commercial limits and ownership terms remain in use.

The visible page has five chapters: offer → selected evidence → process → conversation/membership → questions. The hero is static and readable without interaction. Its form-failure example is explicitly illustrative, not a client result. A high-contrast primary CTA and starting price appear before the example on mobile. Canon is optional guidance beside the conversation handoff. The full source/workthrough library is disclosed on demand; existing film query links and the legacy `#work` anchor still open it. Navigation now leads to the selected proof first. No new fonts, external assets or copied template media were added.

## REA evidence

Official sources: <https://github.com/morluto/rea> and its installation/runtime-observation documentation. Used official npm `rea-agents` **6.7.0**, via the CLI. No MCP registration, persistent client setup, credentials, security changes or optional native analysis engines.

Reference: <https://armory.framer.ai/>. REA `list-browser-targets`, `inspect-web-page`, `capture-web-screenshot`, and `capture-browser-scenario` were actually executed. Inspection used Google Chrome **155.0.8059.85**, in separate temporary profiles, not the user's personal browser.

The bounded desktop scenario captured initial load, two timed waits, two PageDown actions and settled states (12.5 seconds total, including navigation). A fresh launch captured 390×844 reduced-motion layout. A separate scenario followed the observed “Build A Workflow” link to `/contact`, without form entry/submission. Evidence is a timestamped screenshot sequence, **not video**. Hover behavior and the unlabeled menu control were not fully characterized. No exact animation duration is inferred from sampled frames.

Observed patterns and decisions:

- **Adapt:** stable oversized headline and a single high-contrast CTA while background imagery/logo strips move. Agency keeps its offer stable; the illustrative service record explains the work without autoplay.
- **Adapt:** on mobile, offer and action precede the service list. Agency puts the CTA and commercial starting point before the example.
- **Adapt:** supporting proof has clear sectional separation. Agency uses owned website/dashboard screenshots, linked implementation records and field-report limits.
- **Reject:** scroll-dependent text visibility for essential claims. Agency content stays readable at rest and disables smooth anchor scrolling for reduced motion.
- **Reject:** third-party client logos, numerical claims, testimonials, images, fonts and template code. None was imported.
- **Preserve:** a dedicated conversion destination; the existing first-party booking flow keeps its query context.

An initial connected-browser mobile capture only cropped the desktop layout; it was discarded as responsive evidence and superseded by a fresh REA launch at the mobile viewport.

## Validation and measurement

Run from the worktree using the pinned runtime:

```sh
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency check
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency build
```

The existing package check includes Svelte diagnostics, copy and brand contracts, API/ownership tests and local workerd/contact tests. Sandbox-only attempts hit loopback EPERM; the authorized loopback-capable run passed. No tests were weakened to bypass infrastructure failures. Updated two existing hero-contract assertions for exact positioning, static essential content and Canon's new location.

REA browser checks cover desktop and mobile rendering, the hero-to-booking URL and attribution, proof anchor, work-library open/close, Canon open and Escape close. No real form or booking was submitted. The external scheduler's slot availability was not verified. This is not a complete accessibility audit or measured performance benchmark.

No conversion baseline or uplift is claimed. A local commercial-funnel reporting script already separates preview/internal/automated traffic; production data was not fetched. Hypothesis: clearer offer, earlier evidence and fewer competing initial interactions will help qualified visitors reach the conversation step. After approval/deployment, compare external sessions → booking CTA → booking started → booking completed using the existing funnel events, with comparable periods and traffic mix. Also inspect lead fit; do not infer uplift from a small or changed sample.

## Review artifacts

Local preview: <http://127.0.0.1:4176/> (host-local dev server).

Artifacts are outside the Git worktree at `/Users/createsomething/Documents/Codex/2026-10-19/task-6/evidence/`:

- `armory-walkthrough.html`: timestamped reference frames with their REA step labels.
- `armory-walkthrough.json`, `armory-mobile-launch.json`, `armory-cta.json`: canonical REA records.
- `agency-desktop-final.png`, `agency-mobile-final.png`, `agency-narrow-final.png`: final hero captures.
- `agency-cta.json`, `agency-proof.json`, `agency-interactions.json`: behavior evidence.
- `check-final.log`, `build-final.log`: final validation output.

Worktree disposition: preserved at `/Users/createsomething/Documents/Codex/2026-10-19/task-6/agency-redesign`, branch `codex/agency-conversion-rea`, for release verification and rollback context.

PR review compatibility checks: retired `#sample-handoff` and named
`#handoff-example-*` fragments resolve to the current journey heading. The retained
`scripts/check-interaction-pilot.mjs` command now checks the static journey at
1440/390/320px, keyboard navigation, legacy bookmarks/history, reduced motion and
complete no-JavaScript content. All five browser scenarios passed locally.
