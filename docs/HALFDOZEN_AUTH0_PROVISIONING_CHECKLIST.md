# Half Dozen Auth0 Provisioning Checklist

> Archived: Auth0 was the previous `.agency` portal identity provider. Current Half Dozen provisioning should use Clerk identity flows; keep this checklist only for historical audit, export, or rollback context.

## Goal

Provision Half Dozen users into `.agency` using the existing seed-first policy, then let Auth0 become the durable identity anchor on first login.

## Users

- `dm@halfdozen.co` -> `acct_danny`
- `leah@halfdozen.co` -> `acct_leah`
- `fillip@halfdozen.co` -> `acct_fillip`
- `august@halfdozen.co` -> `acct_august`
- `lainy@halfdozen.co` -> `acct_lainy`

Shared tenant:

- `tenant_halfdozen_co`

## Workflow

1. Seed identity rows into `.agency`.
2. Create or invite the corresponding Auth0 users.
3. Either:
   - have each user complete first login through `.agency`, or
   - bind the known archived Auth0 subject directly if white-glove onboarding is being audited and the canonical subject is already available.
4. Confirm the seed row is bound to the canonical Auth0 `sub`.
5. If white-glove onboarding is being used, the operator MAY issue the managed bearer token once entitlement and subject-binding prerequisites are satisfied, even before the user has personally logged into `.agency`.
6. Confirm the dashboard shows the expected account, tenant, and hub lane once the user enters `.agency`.
7. Set or rotate the ChatGPT connection password if needed.
8. Use `.agency` as the follow-on surface for revoke, regenerate, password rotation, and ongoing access visibility.

## Seed command

Generate SQL from the seed manifest:

```bash
pnpm exec tsx packages/agency/scripts/prepare-agency-identity-seed.ts docs/examples/agency-user-seed.csv > /tmp/agency_identity_seeds.sql
```

Then apply the SQL to the `.agency` D1 database using the normal Wrangler workflow.

## Policy notes

- Keep `policy_accepted=0` at seed time unless the user already accepted under a valid commercial or operational process.
- `dm@halfdozen.co` is intentionally mapped to `acct_danny`.
- Do not store live bearer tokens, Basic Auth passwords, or Auth0 temporary passwords in repo-tracked files.
- Auth0 was the archived portal identity boundary for this checklist. `.agency` remains the entitlement and MCP credential broker.
- White-glove initial bearer handoff was allowed when the credential was already governed and the Auth0 subject was canonical, but runtime worker guardrail tokens were never customer delivery artifacts.

## Verification

After subject binding and, if applicable, first portal login, verify:

- `/dashboard` shows the expected `account_id` and `tenant_id`
- `/mcp-access` shows the correct lane assignment and bridge username
- policy acceptance is either completed or clearly blocked pending acceptance
- bearer token issuance is available only when entitlement checks pass
