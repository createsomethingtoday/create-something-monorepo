# Webflow Library Repo Authority Recommendation - 2026-07-09

This note continues the repo split pilot for `apps/marketplace-template-submission-cloud` and `createsomethingtoday/webflow-library-submission-form`.

It records observed evidence and a recommended authority direction. It does not create, push, deploy, delete, or transfer any repository.

## Recommendation

Use a two-authority model:

1. Keep `apps/marketplace-template-submission-cloud` in the monorepo as the authority for the Marketplace template submission iframe and shared Webflow Marketplace intake contracts.
2. Promote `createsomethingtoday/webflow-library-submission-form` as the authority for the standalone Library submission app after a reconciliation branch lands.
3. Keep the monorepo Library route as compatibility/reference until the standalone app has production Webflow Cloud deploy evidence, Airtable dry-run evidence, D1 binding proof, and rollback notes.

Do not overwrite either side wholesale. The two paths have diverged in useful ways.

## Evidence

### Existing Repos

`gh repo view` confirmed:

- `createsomethingtoday/webflow-library-submission-form`: exists, private, default branch `main`
- `createsomethingtoday/outerfields-presentations`: exists, public, default branch `main`
- `createsomethingtoday/claude-plugins`: exists, public, default branch `main`
- `createsomethingtoday/ground` resolves as `createsomethingtoday/GROUND`, public, default branch `main`

No new GitHub repo was needed for this pilot.

### Local Readback

The standalone repo was cloned read-only to:

```text
/tmp/cs-repo-split-pilot-webflow-library
```

The standalone repository and monorepo app both have the same broad app shape:

- Next.js app routes
- intake API routes
- Library submission route
- upload and validation helpers
- Webflow Cloud/OpenNext config
- D1 migration
- smoke/check scripts

### Divergence

Standalone-only or standalone-ahead evidence:

- `app/api/intake/check-library-email/*`
- `app/api/intake/check-library-name/*`
- `app/api/intake/check-library-user/*`
- `app/api/intake/library-intent/*`
- richer Library creator application / enablement UI in `components/library-intake.tsx`
- committed `package-lock.json` for Webflow Cloud npm builds
- `public/fonts/*`
- `vendor/core/long-description.ts`
- README written as a standalone deployable Library app with `/` and `/libraries/submit`

Monorepo-only or monorepo-ahead evidence:

- `app/api/intake/validate-published-url/route.test.ts`
- async/pending published URL validation flow using `runPublishedUrlValidationStep`
- `@create-something/webflow-dashboard-core/long-description` dependency instead of a vendored long-description helper
- concrete `wrangler.json` binding for `marketplace-template-submission-cloud` with a real D1 database id
- README written as the template submission Cloud app plus a Library migration slice

Operational divergence:

- Standalone `wrangler.json` uses `webflow-library-submission-form` and placeholder `REPLACE_WITH_LIBRARY_FORM_D1_DATABASE_ID`.
- Monorepo `wrangler.json` uses `marketplace-template-submission-cloud` and a concrete D1 database id.
- Standalone README says Webflow Cloud currently builds this repository with npm and requires `package-lock.json`.
- Monorepo README uses pnpm workspace commands and a local file dependency on `@create-something/webflow-dashboard-core`.

## Verification

Both codebases passed TypeScript checks:

```bash
corepack pnpm --dir apps/marketplace-template-submission-cloud check
```

Result: passed.

```bash
cd /tmp/cs-repo-split-pilot-webflow-library
npm ci --ignore-scripts
npm run check
```

Result: passed.

The standalone `npm ci` reported `19` audit findings: `6 low`, `11 moderate`, `1 high`, `1 critical`. Treat this as a pre-promotion dependency review item before making the standalone repo production authority.

## Recommended Reconciliation Branch

Create a branch in `createsomethingtoday/webflow-library-submission-form` only after deciding to promote it as the Library authority.

Branch objective:

- Keep standalone Library UX, Library precheck routes, Library intent route, `package-lock.json`, and npm deploy posture.
- Port monorepo-ahead validation behavior where relevant, especially async/pending published URL validation if the standalone app continues to expose template validation routes.
- Replace or deliberately keep the vendored long-description helper after deciding whether standalone should depend on `@create-something/webflow-dashboard-core`.
- Replace placeholder D1 config only through the Webflow Cloud/Cloudflare production workflow with rollback notes.
- Add a README section naming the monorepo path as compatibility/reference, not primary Library authority.

Do not push this branch until the diff is reviewed against the existing Webflow Cloud deployment path.

## Open Decisions

- Should the standalone Library repo keep template submission routes as shared infrastructure, or should those routes eventually be removed after Library-specific dependencies are isolated?
- Should `@create-something/webflow-dashboard-core` be published/packaged for standalone use, vendored into the Library repo, or kept out of the standalone app?
- Which D1 database should be authoritative for Library capture: a new `webflow-library-submission-form` D1 database or the existing `marketplace-template-submission-cloud` database?
- Should `webflow.com/libraries/submit` link, redirect, or iframe to the standalone app after dry-run evidence?

## Next Step

Track this as a production-relevant reconciliation issue before any branch push or deploy:

- Package/surface: `apps/marketplace-template-submission-cloud` and `createsomethingtoday/webflow-library-submission-form`
- Target: standalone Library app authority
- Required evidence: repo diff review, TypeScript check, npm audit posture, Webflow Cloud deploy proof, Airtable dry run, D1 capture proof, rollback note
