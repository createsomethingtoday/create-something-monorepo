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
- Treat Linear as the tracked-work source of truth. Loom IDs are historical migration context only.

## Current Ona Docs Anchors

Use the live Ona docs index before widening the rollout:

- `https://ona.com/docs/llms.txt` - complete documentation index.
- `https://ona.com/docs/ona/agents/codex` - Codex Agent in Ona Cloud.
- `https://ona.com/docs/ona/integrations/configure-codex` - optional ChatGPT account connection for Codex model requests.
- `https://ona.com/docs/ona/agents-md` - `AGENTS.md` guidance.
- `https://ona.com/docs/ona/agents/skills` - repository skill discovery under `.ona/skills/`.
- `https://ona.com/docs/ona/configuration/tasks-and-services/overview` - `.ona/automations.yaml` tasks and services.
- `https://ona.com/docs/ona/mcp` - repo-local and organization MCP configuration.
- `https://ona.com/docs/ona/integrations/configure-linear` - Linear integration.
- `https://ona.com/docs/ona/integrations/cli` - CLI install, auth, environment, project, and automation commands.
- `https://ona.com/docs/ona/configuration/secrets/overview` - organization, project, and user secrets.
- `https://ona.com/docs/ona/command-deny-list` - agent command deny-list guardrail.

## Codex Agent Adoption Boundary

Ona Agent and Codex Agent should share the same repo context and environment configuration, but they are not the same agent surface:

- `AGENTS.md` is the root instruction file for both surfaces.
- `.ona/skills/` contains Ona repository skills. Keep these aligned with the same repo workflow that Codex follows from `AGENTS.md`.
- Codex Agent is currently an Ona Cloud/Core-plan feature that must be enabled for the organization.
- Connecting a ChatGPT account changes Codex model billing and limits only. The Ona environment still consumes OCUs while it is running.
- Use Codex Agent for implementation work that benefits from Codex's coding workflow. Use Ona Agent and Automations for environment operation, scheduled/background workflows, and integration-driven tasks.
- Do not rely on the acquisition path as a control boundary. Until Ona publishes a replacement path, keep this repo's Ona configuration portable, explicit, and Git-tracked.

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

Organization and user integrations to enable before assigning real work:

- GitHub App for repository and pull request operations.
- Linear for tracked work, comments, and status changes.
- Codex integration if the organization wants Codex Agent sessions in Ona.
- Optional ChatGPT account connection for each user who wants Codex model requests to use their ChatGPT plan.

After connecting Linear in Ona, still expose `LINEAR_API_KEY` in the environment when using this repo's `pnpm linear:*` wrappers. Prefer an Ona user secret for personal tokens. Use a service account or project secret only for approved automation lanes.

## Ona CLI Operator Path

The Ona CLI is not required for local repo validation, but it is the cleanest terminal surface for authenticated live setup and evidence capture.

Install the CLI from the official Ona docs:

```bash
brew install gitpod-io/tap/ona
```

The docs also publish direct macOS, Linux, and Windows downloads. Use the SLSA verification path for first installs when possible:

```bash
curl -fsSL https://app.gitpod.io/releases/cli/install.sh | VERIFY_SLSA=true bash
```

Before changing live projects, authenticate without putting tokens in the repo:

```bash
ona login
```

For noninteractive setup, use a personal access token from the operator or an approved service account:

```bash
ona login --token "<token>"
```

or set `ONA_TOKEN` in the shell or Ona secret scope and then run `ona login`.

Use these read-only commands to confirm the live surface before creating or changing projects:

```bash
ona whoami
ona project list
ona environment list
```

Inside an Ona environment, the CLI is preinstalled and automatically authenticated with limited access. Run `ona login` inside that environment only when full access is needed for the setup task, then record the project, environment, and command summaries in Linear. Do not paste token values, CLI config files, or secret payloads into Linear.

## Core Tier Gate

Ona project records can exist before the organization is allowed to start environments. Treat project presence as a setup milestone, not as proof that Codex Agent can run.

If environment creation fails with:

```text
failed_precondition: feature is only available for core tier and above, upgrade your organization to use this feature
```

stop the live rollout and record the blocker in Linear. Do not keep retrying environment creation or widen the scope to deploy/secrets work. The next action is to get Ona Core enabled for the organization, then resume from the first smoke environment:

```bash
ona environment create <agency-project-id> --name agency-rollout-smoke-YYYYMMDD --inactivity-timeout 1h --logs
```

After that environment starts, continue with bootstrap, `ona-rollout-check`, `linear-ready`, and Codex Agent read-only validation.

## MCP Configuration Policy

Phase 1 does not commit an active `.ona/mcp-config.json`.

Use Ona native integrations first for GitHub and Linear because they carry their own auth and policy model. Add repo-local MCP config only when a specific server is selected, reviewed, and tested in the Dev Container.

When adding `.ona/mcp-config.json` later:

- Prefer HTTP MCP organization integrations for shared remote services.
- Use repo-local stdio MCP only for project-specific local processes.
- Inject credentials with Ona secrets or an external secrets CLI. Do not commit tokens.
- Confirm the Dev Container image includes every required runtime, such as `node`, `npx`, `docker`, or service-specific CLIs.
- Start a new agent execution after changing MCP config. Ona reads MCP configuration at the start of each execution.

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
- The canonical `/agency/auth` Auth0 source-of-truth path

### Coordination Secrets

If Ona agents need to use this repo's Linear wrappers, provide:

- `LINEAR_API_KEY`
- `LINEAR_TEAM_KEY` when the default `CRE` team is not correct
- `LINEAR_API_URL` only for a nonstandard Linear GraphQL endpoint

Prefer user secrets for individual developer sessions. Prefer service-account-scoped project secrets only for approved Automations, and document the automation that owns the token.

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

Before creating or changing live Ona projects, run:

```bash
pnpm ona:rollout:check
```

This verifies the repo-tracked Ona contract: runtime pins, bootstrap scripts, `.ona/automations.yaml`, the repo-local Ona skill, this rollout guide, the docs map, and the phase-1 rule that no active `.ona/mcp-config.json` is committed.

The root `pnpm check` command runs `pnpm ona:rollout:check` before lane checks so rollout drift blocks the normal quality gate.

Run this checklist after the projects are created:

1. Start an environment from each Ona project and confirm the bootstrap task succeeds.
   The repo bootstrap only hard-requires the pinned Node and pnpm toolchain plus a healthy workspace install. Missing `gh`, `infisical`, `jq`, or `wrangler` should surface as warnings unless you explicitly opt into strict mode with `ONA_BOOTSTRAP_REQUIRE_OPTIONAL_TOOLS=1`.
2. Confirm `node -v` returns `v22.21.1`.
3. Confirm `pnpm -v` returns `9.15.0`.
4. Run `ona-rollout-check` and confirm the repo-tracked Ona contract passes in the environment.
5. Run `linear-ready` and confirm the environment can read current Linear work through this repo's wrapper.
6. Start `agency-dev` and confirm the forwarded preview is reachable.
7. Start `product-dev`, `services-dev`, and `platform-dev` and confirm each service launches from the shared monorepo environment.
8. Run `agency-check`, `repo-lint`, and `repo-check`.
9. In the `product` project, run `webflow-dashboard-cloud-check` and `webflow-dashboard-cloud-build`.
10. In the `product` project, start `webflow-dashboard-cloud-dev` and confirm the forwarded preview is reachable.
11. If deploy credentials are present, run `webflow-dashboard-cloud-preview` and `webflow-dashboard-cloud-deploy`.
12. In the `agency` project only, run `agency-build` and `agency-deploy-preview`.

For a Codex Agent validation pass:

1. Start an Ona Cloud environment in the target project.
2. Confirm the Codex option appears in the conversation menu.
3. Ask Codex Agent to read `AGENTS.md`, `docs/guides/ONA_CORE_ROLLOUT.md`, and `.ona/skills/create-something-monorepo-workflow/SKILL.md`.
4. Ask it to run `pnpm linear:ready` and report the result without modifying files.
5. If the ChatGPT account integration is connected, confirm Codex model requests use that account while the environment remains metered by Ona.
6. Record the project, environment, commands, and result in the relevant Linear issue.

If the remote loop is still materially slow after this rollout, optimize the repo startup path next. Do not split the monorepo only to compensate for a storage bottleneck.

## Live Setup Evidence Record

Do not mark live Ona setup complete from local repo checks alone. Live completion requires evidence from an authenticated Ona admin or an Ona environment for each project.

Copy this block into the Linear issue that owns the setup pass, then fill it with exact IDs, URLs, commands, and timestamps. Do not paste secret values.

```markdown
## Ona Live Setup Evidence

Linear issue: CRE-\_\_\_
Operator:
Date:
Repository:
Default branch:
Commit or source ref:

### Organization Preconditions

- [ ] Core plan confirmed:
- [ ] Ona Cloud confirmed:
- [ ] GitHub App enabled:
- [ ] Linear integration enabled:
- [ ] Codex integration enabled:
- [ ] Command deny list includes `git reset --hard`:
- [ ] Command deny list includes `git clean -fdx`:
- [ ] Command deny list includes broad repo-root recursive delete protection:
- [ ] Command deny list includes destructive Cloudflare delete protection:

### User Preconditions

- [ ] Ona user connected Linear:
- [ ] Ona user can see repository project:
- [ ] Codex appears in the conversation menu:
- [ ] ChatGPT account connected for Codex model requests, if used:

### CLI/Admin Access

- [ ] `ona` CLI installed or available inside Ona environment:
- [ ] CLI version or install source:
- [ ] Auth method used (`ona login`, `ona login --token`, or `ONA_TOKEN`):
- [ ] `ona whoami` confirms expected operator/org:
- [ ] `ona project list` can see target projects or confirms they need creation:
- [ ] `ona environment list` can see expected environments after project creation, or confirms none exist yet:
- [ ] First `ona environment create` result:
- [ ] Core-tier blocker observed, if any:

### Project Evidence

| Project  | Ona project ID/URL | Default branch | Bootstrap | `node -v` | `pnpm -v` | `ona-rollout-check` | `linear-ready` | Codex read-only validation | Notes |
| -------- | ------------------ | -------------- | --------- | --------- | --------- | ------------------- | -------------- | -------------------------- | ----- |
| agency   |                    |                |           |           |           |                     |                |                            |       |
| product  |                    |                |           |           |           |                     |                |                            |       |
| services |                    |                |           |           |           |                     |                |                            |       |
| platform |                    |                |           |           |           |                     |                |                            |       |

### Secret Presence

Record only presence, scope, and source path. Do not paste values.

| Project | Secret key            | Scope        | Source of truth                 | Present in Ona | Notes |
| ------- | --------------------- | ------------ | ------------------------------- | -------------- | ----- |
| agency  | LINEAR_API_KEY        | user/project | Infisical or Linear token owner |                |       |
| agency  | CLOUDFLARE_ACCOUNT_ID | project      | Infisical                       |                |       |
| agency  | CLOUDFLARE_API_TOKEN  | project      | Infisical                       |                |       |
| product | LINEAR_API_KEY        | user/project | Infisical or Linear token owner |                |       |
| product | AIRTABLE_API_KEY      | project      | app source of truth             |                |       |
| product | CLOUDFLARE_ACCOUNT_ID | project      | Infisical                       |                |       |
| product | CLOUDFLARE_API_TOKEN  | project      | Infisical                       |                |       |

### Dev Services And Checks

- [ ] `agency-dev` started and forwarded preview was reachable:
- [ ] `agency-check` passed:
- [ ] `agency-build` passed:
- [ ] `repo-lint` passed:
- [ ] `repo-check` passed:
- [ ] `webflow-dashboard-cloud-check` passed in product:
- [ ] `webflow-dashboard-cloud-build` passed in product:
- [ ] `webflow-dashboard-cloud-dev` started and forwarded preview was reachable:

### Deploy-Credential Boundary

- [ ] Deploy-capable Cloudflare credentials are only present in approved projects:
- [ ] `services` has no deploy credentials unless separately approved:
- [ ] `platform` has no deploy credentials unless separately approved:
- [ ] Client-facing bearer-token delivery remains outside Ona:

### Final Status

Observed complete:
Remaining blockers:
Follow-up Linear issues:
```

## Bootstrap Behavior

- The repo bootstrap script lives at `.ona/scripts/bootstrap.sh`.
- `./scripts/ona-bootstrap-local.sh` is the host-shell fallback when you need the pinned runtime without changing your global Node installation.
- It validates the pinned Node and pnpm versions before doing any workspace work.
- It treats `gh`, `infisical`, `jq`, and `wrangler` as optional by default because not every Ona project needs deploy or operator tooling during startup.
- It writes a `node_modules/.pnpm-lock.sha256` stamp after a successful `pnpm install --frozen-lockfile` and reinstalls when that stamp no longer matches `pnpm-lock.yaml`.
- Set `ONA_BOOTSTRAP_REQUIRE_OPTIONAL_TOOLS=1` if you want startup to fail fast when the optional operator/deploy commands are missing.
