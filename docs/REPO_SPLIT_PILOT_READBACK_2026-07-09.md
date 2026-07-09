# Repo Split Pilot Readback - 2026-07-09

This note records the first live readback after generating the repo ownership registry and pilot plan. It is evidence, not permission to mutate repositories, deploy ownership, package publication, or cleanup.

## Result

No repository creation was needed for the recommended first pilot.

The first pilot candidate is `apps/marketplace-template-submission-cloud`, and its referenced standalone/redundancy repository already exists:

- Repository: `createsomethingtoday/webflow-library-submission-form`
- URL: `https://github.com/createsomethingtoday/webflow-library-submission-form`
- Visibility: private
- Default branch: `main`

The second pilot candidate also already has its referenced repository:

- Repository: `createsomethingtoday/outerfields-presentations`
- URL: `https://github.com/createsomethingtoday/outerfields-presentations`
- Visibility: public
- Default branch: `main`

Additional referenced repositories checked:

- `createsomethingtoday/claude-plugins`: exists, public, default branch `main`
- `createsomethingtoday/ground`: exists as `createsomethingtoday/GROUND`, public, default branch `main`

## First Pilot Comparison

Command shape:

```bash
gh repo clone createsomethingtoday/webflow-library-submission-form /tmp/cs-repo-split-pilot-webflow-library -- --depth 1
diff -qr -x .git -x node_modules -x .next -x .open-next -x tsconfig.tsbuildinfo /tmp/cs-repo-split-pilot-webflow-library apps/marketplace-template-submission-cloud
```

Observed shape:

- The standalone repo contains the same app-shaped file set as `apps/marketplace-template-submission-cloud`.
- The standalone repo additionally has `.github`, `.gitignore`, `package-lock.json`, `public`, and `vendor/core/long-description.ts`.
- The monorepo app additionally has local/generated `tsconfig.tsbuildinfo` and tests not present in the standalone repo.
- Many shared files differ, including `README.md`, intake routes, styling, app pages, components, intake libs, migrations, `package.json`, scripts, `tsconfig.json`, `webflow.json`, and `wrangler.json`.

## Recommendation

Treat `apps/marketplace-template-submission-cloud` as a reconciliation pilot, not a repo-creation pilot.

Next safe step:

1. Decide authority direction: monorepo authoritative, standalone authoritative, or mirror-only redundancy.
2. If the standalone repo should become authoritative, create a scoped migration branch and compare file-by-file before pushing anything.
3. If the monorepo should remain authoritative, add a sync/readback workflow or mark the standalone repo as redundancy-only in the registry/docs.
4. Do not change Webflow Cloud, Airtable, marketplace routes, or deployment ownership without separate deploy evidence and rollback notes.
