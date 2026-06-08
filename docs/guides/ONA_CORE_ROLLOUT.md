# Ona Core Rollout

This guide wires the CREATE SOMETHING monorepo into Ona Core without splitting the repository or replacing Infisical.

## What Lives In Repo

- `.devcontainer/` defines the shared monorepo environment.
- `.ona/automations.yaml` defines the startup task plus the lane services and manual tasks.
- `.ona/skills/` defines repo-local Ona workflows that agents discover on demand.
- `.nvmrc` pins the local and remote Node runtime to `22.21.1`.
- `AGENTS.md` remains the primary agent instruction file for Ona agents.
- Any app or package that Ona must build or deploy has to be Git-tracked.
  If a target lives under `apps/`, make sure `.gitignore` explicitly allows it.

## Scope For Phase 1

- Keep one monorepo Dev Container.
- Create four Ona projects against the same repository and default branch: `agency`, `product`, `services`, and `platform`.
- Keep `clients` and `labs` inside the shared monorepo environment until they need their own tooling or access policy.
- Keep Infisical as the source of truth for secrets.
- Keep client-facing bearer-token delivery in Infisical. Ona does not replace that flow in this phase.

## Create The Ona Projects

Create four Ona projects that all point to this repository and use the repo defaults:

1. `agency`
2. `product`
3. `services`
4. `platform`

Use these repo-tracked paths in each project:

- Dev Container: `.devcontainer/devcontainer.json`
- Automations: `.ona/automations.yaml`
- Agent instructions: `AGENTS.md`
- Repo skills: `.ona/skills/`

Project defaults to set in the Ona UI:

- Recommended editor: local VS Code
- Browser fallback: VS Code Web
- Idle timeout: 60 minutes

## Local Alternative With OrbStack

The repo-owned Dev Container also works as the local fallback for OrbStack-backed Dev Containers.

Use OrbStack only if you can give the repo fast SSD-backed storage. Do not expect OrbStack to cancel out a spinning external disk bottleneck.

Preferred local layouts:

1. Clone the repo onto the Mac internal SSD and open the Dev Container through OrbStack.
2. Clone the repo into an OrbStack Linux machine filesystem and edit it through remote VS Code or SSH.

Avoid keeping the working tree on a spinning external drive and bind-mounting it into OrbStack. That keeps the slow host filesystem on the critical path.

## Local Runtime Alignment

Local bootstrap is expected to match the same runtime the repo dev container uses:

- Node `22.21.1` from `.nvmrc`
- pnpm `9.15.0` via Corepack

If `.ona/scripts/bootstrap.sh` fails with `Expected Node v22.21.1`, the intended fix is:

1. Open the repo through `.devcontainer/devcontainer.json`, or
2. Run `./scripts/ona-bootstrap-local.sh` to bootstrap with a repo-cached Node `22.21.1` and pnpm `9.15.0`, or
3. Install Node `22.21.1` locally, then run `corepack prepare "pnpm@9.15.0" --activate`

The runtime pin is deliberate. Do not treat a newer local Node version as equivalent just because `package.json` allows a broader engine range.

## Secrets

Use Ona project secrets only for internal engineering and runtime delivery. Do not use Ona as the client bearer-token distribution system in this phase.

### Agency Project Secrets

Mirror these values from Infisical or the existing operational source into the `agency` project:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_JWKS_URL`
- `AUTH0_AUDIENCE` when used
- `AUTH0_SCOPE` when used
- `AUTH0_CLAIMS_NAMESPACE` when used
- `AUTH0_REDIRECT_URI` when used
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_VERTICAL_SOLO`
- `STRIPE_PRICE_VERTICAL_TEAM`

Use Ona user secrets for personal credentials such as developer-specific tokens.

### Product Project Secrets

If `apps/webflow-dashboard-cloud` will build or deploy from Ona, mirror the app runtime secrets into the
`product` project as well.

Use the current source of truth in `apps/webflow-dashboard-cloud/README.md`, including:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `RESEND_API_KEY`
- `CRON_SECRET`
- `CSRF_TRUSTED_ORIGINS`
- `ADMIN_EMAILS` when used
- `ENVIRONMENT` when used
- `DEBUG_LOGS` when used
- `DEBUG_AIRTABLE` when used
- `BASE_URL`
- `ASSETS_PREFIX`
- `NEXT_PUBLIC_BASE_PATH`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` when Turnstile is enabled
- `TURNSTILE_SECRET_KEY` when Turnstile is enabled
- `TURNSTILE_EXPECTED_HOSTNAME` when hostname pinning is enabled
- `CLOUDFLARE_ACCOUNT_ID` for preview/deploy tasks
- `CLOUDFLARE_API_TOKEN` for preview/deploy tasks

### Secrets That Stay In Infisical

Keep these outside Ona in phase 1:

- Client-facing bearer-token delivery
- Any secret currently delivered directly to clients through Infisical
- The archived `/agency/auth` Auth0 source-of-truth path, retained only for historical export or rollback

### Rotation Order

When a shared runtime secret changes:

1. Rotate it in Infisical first.
2. Update the mirrored Ona project secret.
3. Re-run the affected Ona task or service.
4. For deploy secrets, run the affected preview task and verify the preview still boots.
   For this rollout that means `agency-deploy-preview` and, when enabled, `webflow-dashboard-cloud-preview`.

## Guardrails

Configure these in Ona organization or project settings because they are not repo-tracked:

- Command deny list entries:
  - `git reset --hard`
  - `git clean -fdx`
  - broad recursive delete commands at repo root
  - destructive Cloudflare delete commands
- Restrict deploy-capable Cloudflare credentials to the project that owns the deploy task.
  For this rollout that means `agency` and, only when needed for `apps/webflow-dashboard-cloud`, `product`.
- Keep `services` and `platform` as dev-only projects unless they receive a narrower credential set later.

## Validation

Run this checklist after the projects are created:

1. Start an environment from each Ona project and confirm the bootstrap task succeeds.
   The repo bootstrap only hard-requires the pinned Node and pnpm toolchain plus a healthy workspace install. Missing `gh`, `infisical`, `jq`, or `wrangler` should surface as warnings unless you explicitly opt into strict mode with `ONA_BOOTSTRAP_REQUIRE_OPTIONAL_TOOLS=1`.
2. Confirm `node -v` returns `v22.21.1`.
3. Confirm `pnpm -v` returns `9.15.0`.
4. Start `agency-dev` and confirm the forwarded preview is reachable.
5. Start `product-dev`, `services-dev`, and `platform-dev` and confirm each service launches from the shared monorepo environment.
6. Run `agency-check`, `repo-lint`, and `repo-check`.
7. In the `product` project, run `webflow-dashboard-cloud-check` and `webflow-dashboard-cloud-build`.
8. In the `product` project, start `webflow-dashboard-cloud-dev` and confirm the forwarded preview is reachable.
9. If deploy credentials are present, run `webflow-dashboard-cloud-preview` and `webflow-dashboard-cloud-deploy`.
10. In the `agency` project only, run `agency-build` and `agency-deploy-preview`.

If the remote loop is still materially slow after this rollout, optimize the repo startup path next. Do not split the monorepo only to compensate for a storage bottleneck.

## Bootstrap Behavior

- The repo bootstrap script lives at `.ona/scripts/bootstrap.sh`.
- `./scripts/ona-bootstrap-local.sh` is the host-shell fallback when you need the pinned runtime without changing your global Node installation.
- It validates the pinned Node and pnpm versions before doing any workspace work.
- It treats `gh`, `infisical`, `jq`, and `wrangler` as optional by default because not every Ona project needs deploy or operator tooling during startup.
- It writes a `node_modules/.pnpm-lock.sha256` stamp after a successful `pnpm install --frozen-lockfile` and reinstalls when that stamp no longer matches `pnpm-lock.yaml`.
- Set `ONA_BOOTSTRAP_REQUIRE_OPTIONAL_TOOLS=1` if you want startup to fail fast when the optional operator/deploy commands are missing.
