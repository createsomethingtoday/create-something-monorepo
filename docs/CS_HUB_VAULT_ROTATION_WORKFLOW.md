# CS Hub Vault + Rotation Workflow

Use this workflow to keep Hub and Notion bridge runtime credentials in Infisical and rotate them without storing plaintext tokens in docs.

Client-facing bearer delivery is no longer the default for Half Dozen hub lanes. Issue identity-backed personal tokens through the partner auth APIs and keep Infisical as the source of truth for worker/runtime secrets only. After managed-token migration, Infisical may still store the same plaintext bearer value for runtime compatibility, but token governance moves to `identity-db.mcp_long_lived_tokens`.

## 1) Install Vault CLI

Local macOS install:

```bash
brew install gnupg
brew install infisical
infisical --version
```

If `infisical` is already installed via npm/nvm rather than Homebrew, update that install instead of Homebrew:

```bash
npm install -g @infisical/cli@latest
infisical --version
```

To confirm which install owns the active binary:

```bash
command -v infisical
ls -l "$(command -v infisical)"
```

## 2) Authenticate and scope the project

```bash
cd "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo"
infisical login --interactive
# Optional: bind the repo to an Infisical project context
infisical init
```

## 3) Required vault secrets

Global hub secrets:

- `HUB_SESSION_RESOLVE_TOKEN`
- `BRAINTRUST_API_KEY`
- `BRAINTRUST_PROJECT_ID`
- `HUB_API_TOKEN` (fallback / shared)
- `CS_MCP_HUB_REMOTE_API_TOKEN`
- `HALFDOZEN_OPERATOR_NOTION_MCP_API_KEY`
- `WEBFLOW_TEMPLATE_REVIEW_MCP_API_KEY`

Per-team hub worker tokens (runtime / compat fallback only, or migrated plaintext values mirrored from the managed-token registry):

- `CS_HUB_LAINY_API_TOKEN`
- `CS_HUB_DANNY_API_TOKEN`
- `CS_HUB_AUGUST_API_TOKEN`
- `CS_HUB_C3DENVER_API_TOKEN`
- `CS_HUB_AARON_OUTERFIELDS_API_TOKEN`
- `CS_HUB_ANDRE_OUTERFIELDS_API_TOKEN`
- `CS_HUB_FILLIP_API_TOKEN`
- `CS_HUB_LEAH_API_TOKEN`
- `CS_HUB_MJ_API_TOKEN`

Named-lane hub worker tokens:

- `CS_HUB_VIV_BLONDISH_API_TOKEN`
- `CS_HUB_MORGAN_YOUNG_C3_MANAGEMENT_API_TOKEN`

Webflow reviewer Hub worker tokens:

- `CS_HUB_WF_TEMPLATE_REVIEW_NATALIA_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_ERIC_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_VICKI_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_MARIANA_API_TOKEN`
- `CS_HUB_WF_TEMPLATE_REVIEW_MICAH_API_TOKEN`
- `CS_HUB_WF_APP_REVIEW_PABLO_API_TOKEN`
- `CS_HUB_WF_APP_REVIEW_SHEA_API_TOKEN`

Webflow app-review MCP upstream token:

- `WEBFLOW_APP_REVIEW_MCP_API_KEY`

Per-team Notion bridge basic auth passwords:

- `CS_HUB_LAINY_NOTION_BRIDGE_BASIC_PASSWORD`
- `CS_HUB_DANNY_NOTION_BRIDGE_BASIC_PASSWORD`
- `CS_HUB_AUGUST_NOTION_BRIDGE_BASIC_PASSWORD`
- `CS_HUB_FILLIP_NOTION_BRIDGE_BASIC_PASSWORD`
- `CS_HUB_LEAH_NOTION_BRIDGE_BASIC_PASSWORD`
- `CS_HUB_MJ_NOTION_BRIDGE_BASIC_PASSWORD`

Optional per-team bridge API keys:

- `CS_HUB_<TEAM>_NOTION_BRIDGE_API_KEY`

## 4) Sync vault -> Cloudflare Worker secrets

Run from repo root:

```bash
pnpm mcp:hub:vault:sync
```

Default maintenance path:

- `pnpm mcp:hub:vault:sync` is the steady-state sync path. It should preserve the currently deployed runtime secrets.
- Do not rotate runtime or compat bearer material during ordinary sync, deploy, or verify work.
- Replace an existing runtime secret only when you are intentionally executing an explicit rotation action or responding to suspected or confirmed compromise, misuse, or remediation work.

Useful options:

```bash
DRY_RUN=true pnpm mcp:hub:vault:sync
INCLUDE_BRIDGES=false pnpm mcp:hub:vault:sync
LOAD_FROM_VAULT=false pnpm mcp:hub:vault:sync
VAULT_PROVIDER=env pnpm mcp:hub:vault:sync
```

Reviewer-hub specific sync helpers:

```bash
pnpm mcp:hub:webflow-app-reviewers:vault:sync
DRY_RUN=true pnpm mcp:hub:webflow-app-reviewers:vault:sync
```

Infisical machine identity:

```bash
VAULT_PROVIDER=infisical \
INFISICAL_PROJECT_ID="<project-id>" \
INFISICAL_ENV=prod \
INFISICAL_CLIENT_ID="<machine-identity-client-id>" \
INFISICAL_CLIENT_SECRET="<machine-identity-client-secret>" \
pnpm mcp:hub:vault:sync
```

Notes:

- `INFISICAL_PROJECT_ID` is optional if your local Infisical session/config already scopes a project.
- For self-hosted or regional domains, set `INFISICAL_API_URL`.
- The Infisical path requires the `infisical` CLI installed locally/in CI.

## 5) Rotate runtime credentials and roll out

This rotates per-team Hub worker tokens, named-lane Hub worker tokens, the core hub token, and per-team Notion bridge basic passwords in Infisical, then syncs Worker secrets and runs deploy/verify.

```bash
pnpm mcp:hub:rotate:production
```

Default identity mode for this workflow is `compat` (vault token-bound account mode, no minted session token required).

Flags:

```bash
pnpm mcp:hub:rotate:production --dry-run
pnpm mcp:hub:rotate:production --skip-deploy
pnpm mcp:hub:rotate:production --skip-verify
pnpm mcp:hub:rotate:production --no-bridges
pnpm mcp:hub:rotate:production --exclude-team AARON_OUTERFIELDS --exclude-team ANDRE_OUTERFIELDS
HUB_DEPLOY_IDENTITY_MODE=session_required pnpm mcp:hub:rotate:production
VAULT_PROVIDER=infisical INFISICAL_ENV=prod INFISICAL_PATH=/ pnpm mcp:hub:rotate:production --dry-run
VAULT_PROVIDER=infisical INFISICAL_PROJECT_ID="<project-id>" INFISICAL_ENV=prod pnpm mcp:hub:rotate:production
EXCLUDE_TEAM_KEYS=<TEAM_KEY_1>,<TEAM_KEY_2> VAULT_PROVIDER=infisical INFISICAL_ENV=prod pnpm mcp:hub:rotate:production
```

Notes:

- `pnpm mcp:hub:fleet:deploy` strict normalization requires `MCP_SESSION_TOKEN` or `IDENTITY_ACCESS_TOKEN`.
- Keep resolver token rotation (`HUB_SESSION_RESOLVE_TOKEN`) coordinated with identity-worker.
- This command is an explicit rotation workflow, not the default redeploy or sync path.
- Use `--exclude-team` or `EXCLUDE_TEAM_KEYS` only when you intentionally need to defer a worker-token rotation for a specific team.
- Named-lane worker tokens such as `CS_HUB_VIV_BLONDISH_API_TOKEN` and `CS_HUB_MORGAN_YOUNG_C3_MANAGEMENT_API_TOKEN` are runtime/operator secrets bound to the dedicated client Hub workers, not customer-facing bearer artifacts.

## 5a) Adopt existing compat bearer tokens into managed governance

Use this path when a user already has a working vault-backed bearer token and you want `.agency` and `identity-worker` to govern that same credential without forcing a rotation.

Prerequisites:

- one canonical Auth0 subject for the user
- one canonical `.agency` account and tenant mapping
- one active `.agency` entitlement row for that subject

Migration rules:

- Import the existing plaintext bearer value into `identity-db.mcp_long_lived_tokens`.
- Preserve the same plaintext value in Infisical only when runtime compatibility still depends on it.
- Clean up stale legacy entitlement rows and stale legacy token rows for the same email after verification.
- Treat `identity-db.mcp_long_lived_tokens` as the source of truth after migration.

This path is appropriate for current compat users such as existing MCP operators and seeded client accounts that already have bearer material in Infisical.

## 6) Production automation guidance

For CI/CD or production automation, use Infisical Machine Identity Universal Auth (`INFISICAL_CLIENT_ID` + `INFISICAL_CLIENT_SECRET`) instead of interactive login.

## 7) Delivery policy alignment

- Never place plaintext bearer/basic credentials in docs, tickets, commit history, or chat logs.
- Deliver credentials through controlled channels only (partner portal, managed vault, audited secure handoff).
- Infisical remains the source of truth for worker/runtime secrets, including dedicated named-lane `HUB_API_TOKEN` values.
- Customer-facing white-glove onboarding may reference a managed bearer or approved legacy credential, but it must not reuse or expose these runtime Hub worker tokens.

## 8) Default client delivery path

For Half Dozen hub clients, prefer `.agency` managed bearer tokens for customer-facing access. Use identity-issued legacy personal tokens only for temporary migration or exception cases:

```bash
pnpm partner:access:rotate -- \
  --mode legacy \
  --slug <client-slug> \
  --reason "background_agent_personal_token" \
  --exception-approved-by <approver> \
  --sunset-at <iso-timestamp> \
  --delivery-channel portal
```

Notes:

- This returns a `legacy_key_bundle` backed by identity-worker issuance and audit tables.
- The hub can now resolve those personal bearer tokens directly in `compat` mode when `HUB_SESSION_RESOLVE_URL` + `HUB_SESSION_RESOLVE_TOKEN` are configured.
- Existing shared team bearers remain valid in `compat` mode until you either rotate them out or adopt them into the managed-token registry, but they are no longer the target delivery model.

## 9) Migrate Doppler secrets to Infisical

Use the migration script to copy one Doppler config into one Infisical env/path:

```bash
INFISICAL_PROJECT_ID="mcp-m1k5" \
INFISICAL_CLIENT_ID="<machine-identity-client-id>" \
INFISICAL_CLIENT_SECRET="<machine-identity-client-secret>" \
pnpm mcp:hub:vault:migrate:doppler-to-infisical -- \
  --doppler-project <doppler-project> \
  --doppler-config <doppler-config> \
  --infisical-env prod \
  --infisical-path / \
  --verify
```

Dry run:

```bash
pnpm mcp:hub:vault:migrate:doppler-to-infisical -- --dry-run
```

Notes:

- By default, runtime metadata vars (`DOPPLER_PROJECT`, `DOPPLER_CONFIG`, `DOPPLER_ENVIRONMENT`) are excluded.
- Add `--include-doppler-runtime-vars` if you explicitly want those copied.
- Repeat once per Doppler config (`dev`, `staging`, `production`) and map to matching Infisical envs.
