# GiGi connector independent review

Reviewed 2026-09-30 against `packages/gigi-integrations/worker/index.ts`, `src/broker.ts`, `src/auth.ts`, `src/runner.ts`, and Worker migration `0001_connections.sql`. This is a source and contract review, not a production account acceptance test.

## Uncertain link outcome: guarded recovery and operator gate

`beginLink` journals `dispatched` before the Composio link POST; D1's unique outstanding index blocks duplicate attempts. The revised status path performs a bounded Composio list filtered by derived owner and exact auth config, requires a complete list and one matching alias/time/toolkit/PRIVATE account, then performs an exact-account readback before binding it. It binds an active account, releases a verified terminal account for fresh consent, and marks a pending account with a lost consent URL for operator review. Zero or ambiguous matches remain guarded; after ten minutes the UI displays operator review. The deployment runbook now gives an explicit conservative D1/operator procedure that requires two complete zero-match reads at least 24 hours after the attempt, a conditional one-row update, and retained receipts. That procedure has not been exercised against a real account. See `worker/index.ts` lines 53–84 and 237–274, migration lines 23–27, and `worker/DEPLOYMENT.md`.

## Import integrity: malformed provider items fail the page

The first reviewed version silently skipped malformed Gmail and Calendar items while advancing the cursor. The revised Worker throws on malformed page shape, invalid item IDs, and Gmail detail-ID mismatches. Its source route returns an error, not a cursor, and the desktop cannot mark that page complete. See `worker/index.ts` lines 127–177 and Worker tests.

## Verified boundaries

- The Worker checks the exact resource origin, authenticates through Identity userinfo, requires verified email and a server-side subject allowlist, and derives the Composio owner from the subject. Caller-supplied owner headers have no effect (`worker/index.ts` lines 35–52, 312–329).
- Status, reconciliation, and source reads bind D1 rows to subject, provider, and connected account ID. A connected or imported account must pass live Composio readback for the derived owner, exact auth config and toolkit, PRIVATE account type, exact approved scopes, active status, and enabled state (`worker/index.ts` lines 53–105, 189–223).
- Scope configuration is restricted to Gmail/Calendar read-only sets and identity scopes. The source proxy uses fixed Google endpoints, `GET` only, and bounded page sizes and responses (`worker/index.ts` lines 110–186, 296–309, 340–361).
- The desktop broker validates provider, account ID, source page shape, and resource-scoped session. Authentication uses loopback OAuth PKCE, verifies exact Identity metadata/resource/client identity, and stores the session in a private local file (`src/broker.ts`, `src/auth.ts`).
- Revoked or expired accounts release the D1 outstanding guard only after exact owned Composio readback. The broker accepts `reconnectable:true` only for attention status; the desktop exposes fresh consent only for that receipt. `recovery:operator_review` never enables a fresh consent attempt (`worker/index.ts`, `src/broker.ts`, desktop UI tests).

## Remaining limits

This source review supports binding and deploying the narrowly scoped Worker for live readback, provided the configured subject allowlist, server-only API secret, dedicated auth configs, and deployed `/health` response are checked. It does not support declaring end-to-end production acceptance. The guarded operator recovery procedure is unexercised with a real consent attempt. A pending connection whose app session loses its consent URL has no in-app resume path after restart; account ownership remains protected, but the user may need operator help or wait for a terminal status. Live Composio list response shape and owner/scope readback remain to be verified during the first consent test.

## Remaining acceptance evidence

The independent checks above establish source-level controls. Production deployment readback, real consent, live source import, and the physical phone-on-cellular acceptance test remain separate gates.
