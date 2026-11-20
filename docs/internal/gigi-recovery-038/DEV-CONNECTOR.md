# GiGi DEV connector isolation

DEV uses `https://gigi-connector-dev.createsomething.workers.dev`. Production retains `https://gigi-connector.createsomething.workers.dev`. Both use CREATE SOMETHING Identity, but the application policies and access-token audiences are distinct. DEV does not add a public account-creation route or public admission.

## Build contract

Compile the DEV integrations companion with Bun's literal define:

```sh
bun build src/runner-main.ts --compile --define '__GIGI_BUILD_LANE__="dev"' --outfile dist/gigi-integrations
```

Run this command from `packages/gigi-integrations`. The application's `prepare-companions.mjs` compiles directly; its DEV invocation must include the same define. Production omits the define or sets the literal `"production"`. Other values fail closed. A runtime environment variable cannot choose another credential destination. The runner and OAuth flow share the same compiled resource. A saved session with the other lane's resource is rejected before network access; sign in again in the DEV profile. Never copy the production session or database into DEV.

## Worker and access contract

Use `worker/wrangler.dev.toml` for DEV. Its D1 database is `gigi-connector-dev-consent` (`c6c5c1ac-6516-46e4-af59-e7376894133e`). Its R2 bucket is `gigi-instagram-dev-publish-media`. Provision a one-day deletion lifecycle before enabling media. Apply the existing migrations to the new D1 only. Do not bind production storage to DEV.

Provision server-only `COMPOSIO_API_KEY` and a minimal `GIGI_ALLOWED_SUBJECTS` allowlist through the existing secret manager. The latter contains verified Identity subject IDs, not emails or GitHub names. DEV refuses public admission even if `GIGI_PUBLIC_ACCESS_ENABLED` is accidentally true. No source consent is created by this deployment.

The same managed Composio auth configurations can be used, but DEV owners use `gigi_dev_` plus a digest of the DEV resource and subject. Production retains its original `gigi_` plus subject digest. Every account verification and recovery listing uses the lane-specific owner. A production connected account cannot be used by DEV, even if its account ID is copied into DEV storage. Each DEV user must explicitly connect the source again. The callback returns to the matching connector host.

Deploy the exact Identity application policy and DEV worker together, then verify host and audience rejection, admitted DEV sign-in and explicit source consent with test data. Deployment alone is not provider acceptance. The production connector's currently deployed public-access setting must be retained during production promotion; do not infer live policy from a stale config default.

## Rollback

Retain previous Worker deployment versions. Revert each lane independently. Do not restore production data into DEV, delete consent journals, or reuse production account identifiers to repair a failed DEV test. Local source tests and dry runs do not establish live qualification.

## Local validation

- Exact DEV host/audience regression first failed two cases on the old production-only worker; both passed after isolation.
- Full integrations: 355 passed, one optional CTX test skipped. Includes six new deployment-isolation checks, existing production auth/worker coverage, and prior Calendar range regressions.
- Identity OAuth/application checks: 54 passed. DEV policy returns its distinct application ID; unrelated hosts and paths remain rejected.
- Integration TypeScript check passed. DEV Worker and Identity Worker dry runs passed.
- A real Bun-compiled DEV runner rejected a synthetic production session with `unsafe_session_file`. Separate process tests exercise both lane values, reject cross-lane files before any network access, and show that a runtime broker-origin environment variable cannot override the selected resource.
- No remote deployment, real sign-in, source consent, provider fetch, or user record mutation was performed in these checks.
