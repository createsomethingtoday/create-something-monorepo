# Webflow Library Repo Split Reconciliation Branch

Date: 2026-07-09

Standalone repo: `createsomethingtoday/webflow-library-submission-form`
Local path: `/tmp/cs-repo-split-pilot-webflow-library`
Branch: `codex/reconcile-library-authority-20260709`
Base commit: `4e1aa76`
Commit: `5465266`
Draft PR: `https://github.com/createsomethingtoday/webflow-library-submission-form/pull/1`

## Scope

Prepared the first reconciliation branch for the Webflow Library standalone repo. This branch ports the monorepo's route-safe published URL validation continuation path into the standalone Library app without changing deployment metadata or deploying.

Changed files in the standalone repo:

- `app/api/intake/validate-published-url/route.ts`
- `lib/intake/published-url.ts`
- `app/api/intake/validate-published-url/route.test.ts`
- `package.json`
- `package-lock.json`

## Behavior

The standalone Library app can now:

- return `202` with `pending: true`, `validationInstanceId`, and `retryAfterSeconds` when a direct published-site crawl cannot complete inside the route budget
- resume validation when the client posts the same URL with `validationInstanceId`
- keep the existing full synchronous fallback API through `runPublishedUrlValidation`
- declare `tsx` explicitly because the repo already uses it in scripts and the focused route test depends on it

This matches the monorepo authority behavior in `apps/marketplace-template-submission-cloud` for the same route-level validation path.

## Validation

Ran in `/tmp/cs-repo-split-pilot-webflow-library`:

```bash
npm run check
npm exec -- tsx --test app/api/intake/validate-published-url/route.test.ts
npm run build
npm exec -- opennextjs-cloudflare build
```

Results:

- `npm run check`: passed
- focused route test: passed, 2 tests
- `npm run build`: passed
- `npm exec -- opennextjs-cloudflare build`: passed

OpenNext emitted one generated-bundle warning about comparing with `-0` in `.open-next/server-functions/default/.next/server/chunks/103.js`; the build completed successfully.

`npm install --save-dev tsx --ignore-scripts` still reported the existing audit state: 19 vulnerabilities, including 1 high and 1 critical.

## Promotion State

This branch has been pushed and opened as draft PR `#1`. It has not been deployed or marked as production-ready.

Recommended next gates before promotion:

- review the local branch diff
- review the explicit `tsx` dependency addition
- verify Webflow Cloud env bindings and D1 authority for Library capture
- perform Airtable dry-run or controlled submission handoff evidence
- record rollback notes on `CRE-1054`
