# GiGi product landing

CRE-2292 implements the approved product-led concept at `https://createsomething.agency/gigi`.

## Page decision

Decide whether to try GiGi's Mac beta. The page leads with gigs, people, tasks and money in one local workspace, then shows a labeled illustrative Today board. The preview follows the current compact navigation rather than the earlier sidebar. One repeated download action uses the immutable release identity in `src/lib/data/gigiBeta.ts`.

`/gigi/beta` remains the detailed release, acceptance, installation and recovery reference. Its route, content, release identity and walkthroughs are unchanged. The landing retains the beta's unlisted/no-store policy, strict CSP, script-free HTML and no tracking shell. Publishing this page does not change the beta's acceptance status or enable any app connection.

## Source and maintenance

- `src/lib/server/gigi-landing-page.ts`: page copy and sample records.
- `src/lib/server/gigi-landing.scss`: CSS-compatible Sass source.
- `src/lib/server/gigi-landing-styles.ts`: checked-in stylesheet projection.
- `src/routes/gigi/+server.ts`: GET and HEAD response.

After editing Sass, run `node scripts/build-gigi-landing-styles.mjs` from this package. The source uses the CSS-compatible Sass subset, avoiding a production compiler dependency. Sass 1.93.2 compilation was also checked. `pnpm test:gigi-beta` checks that source and generated styles agree and validates both pages' release and safety contracts.

## Pre-promotion evidence

- `pnpm bootstrap:worktree` completed from current `origin/main` in an isolated CRE-2292 worktree.
- Full Agency `check` passed with zero Svelte errors/warnings on the repository's pinned Node 22.23.4 and pnpm 9.15.0.
- Agency production `build` passed on the same pinned runtime.
- All 21 GiGi release/landing tests passed.
- `node --import tsx scripts/check-gigi-landing-browser.mjs` passed at 320, 390, 768 and 1440px. JavaScript was disabled and reduced motion enabled. Checks exercised native FAQ opening/closing using Enter, skip navigation, 44px download targets, no horizontal overflow, and immutable download hrefs. Parent viewed desktop/mobile screenshots.
- Independent Sol 6.1 reviewer ran the 21 tests, invoked GET/HEAD, and viewed actual generated desktop/mobile output. Functional and product gates passed for the local artifact. The one logo scaling finding was fixed and the corrected output rechecked by the parent.
- The current 0.2.14 installer returned HTTP 200 with the expected 122,408,096-byte content length and attachment filename. This page change does not requalify the installer or prove a fresh Mac installation.
- Ground review completed as advisory evidence. JSON/SCSS were excluded as unsupported extensions and duplicate analysis was incomplete; this is not a claim of exhaustive code verification.

## Promotion and rollback

Promotion follows PR review, required repository checks, merge, then the existing Agency Pages deploy workflow. Production destination: Cloudflare account `9645bd52e640b8a4f40a3a55ff1dd75a`, project `create-something-agency`, production branch `main`.

The previous production deployment recorded before promotion is `232f6ba4-0b26-48db-a41b-a28621115521` at source `afd38d48bbeb48c682a6367aa7d321a299d743ef`. A scoped rollback is the landing PR revert followed by the normal build/deploy workflow. Cloudflare Pages also retains the previous production deployment as a rollback target; preview deployments are not rollback targets. This change includes no data migration, credential or binding change.

Post-merge deployment ID, live HTTP/browser checks and final worktree disposition are recorded in CRE-2292. Do not treat these pre-promotion checks as live deployment evidence.

## Public account setup update (CRE-2295)

The download reference and landing account FAQ now link to Identity signup/recovery and explain email verification, password setup and the return to GiGi source sign-in. No invitation is needed for GiGi accounts. The immutable 0.2.14 installer metadata and primary download action are preserved; this account feature was deployed server-side in CRE-2293. Public Google consent/import qualification remains tracked in CRE-2294. Validation and the production deployment/rollback receipt for this page update are recorded in CRE-2295.
