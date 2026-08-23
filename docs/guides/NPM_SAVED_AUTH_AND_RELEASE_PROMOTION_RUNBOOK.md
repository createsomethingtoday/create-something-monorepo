# npm Saved Auth and Release Promotion Runbook

- **Status:** v1 internal runbook
- **Owner:** package release owner
**Scope:** npm CLI session reuse, trusted publishing, and release evidence

## Purpose

Avoid repeated `npm login` confirmations for routine CLI work without weakening
the protections npm applies to publishing, account identity, or trusted-publisher
governance.

This runbook distinguishes three different states:

| State | Credential path | Completion proof |
| --- | --- | --- |
| Routine CLI read or package work | saved, least-privilege granular token in user config | `npm whoami` succeeds through `pnpm npm:auth:status -- --verify --json` |
| Package release | trusted publisher OIDC and the repository's staged release workflow | CI, package stage/publish receipt, registry/provenance, and clean-consumer proof |
| Account or trust governance | interactive npm 2FA | final command readback, not a browser success page |

## Policy

- Save credentials only in a user-level npm config, never a repository `.npmrc`, a
  receipt, environment file, issue, or chat transcript.
- Use a granular token restricted to required packages/scopes and with **Bypass
  2FA disabled**. The helper writes the user config with mode `0600`.
- Do not create or use a bypass-2FA token merely to suppress prompts.
- Keep trusted publishing as the publish path. A saved token supports routine
  local CLI authentication; it does not replace release provenance.
- `npm trust` and other account-governance actions may require interactive 2FA.
  Recheck trust after configuration changes and on the release-review cadence,
  not mechanically before every publish.

## Diagnose the saved session

```bash
pnpm npm:auth:status -- --verify --json
```

The command detects only the presence of a registry credential, calls `npm
whoami` when `--verify` is supplied, and prints a redacted
`create-something.npm-auth-session.v1` receipt. It never prints token values or
replays npm's raw authentication error.

`saved` plus `verified` means routine CLI commands can reuse the session until
the token expires or is revoked. `saved` plus `invalid` means replace the token;
do not repeatedly retry `npm login`.

## One-time saved-token setup

Create a granular npm token in npm's Access Tokens UI with the narrowest package
or scope permissions required, a defined expiration, and Bypass 2FA left off.
Then save it without putting the value in shell history:

```bash
read -r -s NPM_TOKEN
export NPM_TOKEN
pnpm npm:auth:save -- --token-env NPM_TOKEN --json
unset NPM_TOKEN
pnpm npm:auth:status -- --verify --json
```

The `save` command refuses a config path inside the repository. It does not
create an npm token, alter package permissions, publish, or configure a trusted
publisher.

## Release promotion path

1. Verify the exact source revision and package artifact.
2. Use the configured trusted-publisher workflow to stage or publish according
   to the package's release policy.
3. Keep any required human approval as an explicit `waiting_for_human` state.
4. Verify registry metadata, provenance, and a clean consumer separately.
5. Re-run `npm trust list` only when trust configuration changed or the release
   review cadence calls for it. Its final JSON/readback is the receipt.
6. Record remaining gates rather than collapsing them into a generic “published”
   status.

## Stop and recovery

| Signal | Action |
| --- | --- |
| `npm whoami` is unauthorized | replace the saved scoped token once, then verify it; do not loop through login links |
| npm passkey page appears | wait for the operator; browser success alone is not completion |
| `npm trust` readback is expired or fails | restart the narrow read-only auth flow and capture final output |
| package or org permission change is needed | stop and obtain explicit owner approval |
| token appears in a repo file, log, or receipt | revoke/replace it through the owner account and remove the exposure through the approved incident path |

For npm's current token and trusted-publishing rules, see the official npm docs:
[access tokens](https://docs.npmjs.com/about-access-tokens/),
[npm login](https://docs.npmjs.com/cli/v11/commands/npm-login/), and
[trusted publishers](https://docs.npmjs.com/trusted-publishers/).
