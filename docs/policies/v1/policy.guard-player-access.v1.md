# policy.guard-player-access.v1

- Status: `draft`
- Owner: `CREATE SOMETHING identity + Guard Performance Lab + privacy`
- Effective date: `TBD`

## Purpose

Allow a young player to enter a private Guard workspace without an email while keeping credential custody, recovery, scope, consent, and revocation explicit.

## Policy Statements

1. Player credentials MUST be stored and verified by Identity Worker, never by Guard Performance Lab.
2. Player Access MUST use a random, non-identifying player code and a passphrase of 15-128 characters.
3. Birthdays, jersey numbers, player names, and team-wide shared passwords MUST NOT be used as credentials.
4. Player tokens MUST omit email, target only the `guard-performance-lab` audience, and resolve through one exact application-owned subject-to-player binding.
5. Player Access MUST NOT grant operator, reset, create-player, another-player, OAuth, cross-domain, or MCP-management authority.
6. Create, reset, inspect, and revoke operations MUST require an authenticated Guard operator plus an Identity service key restricted to `player_access_manage`.
7. The service key MUST remain server-only and MUST NOT appear in browser payloads, logs, or source control.
8. Login attempts MUST be throttled by player code and network address with generic credential errors.
9. Reset and revoke MUST invalidate every refresh session for the player subject. Access JWT lifetime MUST remain short enough to bound residual access after revocation.
10. The old passphrase MUST never be displayed or recovered. An authorized adult may only replace it.
11. Issue, reset, successful login, failed login, refresh, and revoke events MUST be auditable without recording plaintext credentials.
12. Player Access MUST collect no email, phone, analytics identifier, school, guardian contact, medical data, ranking, or recruiting prediction.
13. Production activation for a player known to be under 13 MUST remain blocked until the owning privacy review records the applicable notice, consent, guardian-control, deletion, and retention decisions.
14. A parent password or Player Access credential alone MUST NOT be treated as proof of verifiable parental consent.

## Enforcement Surfaces

- `packages/identity-worker/migrations/0012_player_access.sql`
- `packages/identity-worker/src/index.ts`
- `packages/identity-worker/src/services/tokens.ts`
- `apps/guard-performance-lab/src/lib/server/player-access-http.ts`
- `apps/guard-performance-lab/src/lib/server/access.ts`
- `apps/guard-performance-lab/src/routes/sign-in/+page.svelte`

## Production Gates

- privacy owner approves the under-13 notice and consent workflow
- one least-privilege `player_access_manage` service key is provisioned and stored as a Worker secret
- exact player subject binding is read back from production configuration
- local migration backup and production D1 rollback plan are recorded
- invalid credential, reset, revoke, player scoping, keyboard, shared-device, and mobile browser proofs pass

## Evidence

- Identity endpoint and migration tests
- Canon cookie lifetime test
- Guard operator-only forwarding and player-form SSR tests
- D1 audit rows without plaintext credentials
- browser proof for player login, reset, revoke, and denied cross-player access
- written privacy approval and retention decision
