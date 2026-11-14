# Verification and rollout boundary

## Passed locally

- Portal clean npm install, TypeScript, 24 backend tests and production build.
- Independent reviewer reran 24 tests and TypeScript, examined session isolation, ambiguous write recovery, live-grant checks, public readiness endpoint, and modal focus handling.
- MCP owning source: 186 tests in `src/` and TypeScript passed on the current-upstream release checkout, including the two new verified-session tests.
- Immutable GitHub Actions pins; retired identity-provider check is included in release validation.
- Browser fixture: search and navigation, disabled unconfirmed approval/analysis, keyboard Escape and focus isolation, confirmed simulated developer message with a simulated receipt, desktop and mobile rendering. Mobile queue/detail document width equals the 390px viewport.

## Live preview evidence

Webflow Cloud accepted deployment and provisioned D1/R2. Browser requests to `/api/status` return `signInReady:false`; `/api/session` and `/api/queue` return 401. The page explains that reviewer sign-in is being configured. No bypass identity or shared token is installed.

The real OpenAI probe created a network-disabled container but inference failed with `insufficient_quota` / `credit_balance_exhausted`. The container was explicitly deleted. No runtime test success is claimed.

## Remaining acceptance

1. Webflow Access administrator allows `https://app-review-portal.webflow.io/api/auth/callback`; register the public OAuth client and provision its client ID.
2. Promote the read-only MCP session identity tool through the normal release gate, then complete real reviewer OAuth and verify the provider audience/resource contract.
3. Provision a funded OpenAI project credential. Run a harmless bundle through upload, provider execution, report persistence and container cleanup.
4. Verify two separate reviewer identities and denied cross-user bundle access before team rollout. Invitations remain a separate authorized step.

The broad MCP `vitest run` also discovers five Claude mod suites whose ignored generated `.claude-plugin/types/tsconfig.json` files are absent in a clean clone. Those suites require the owning `claude plugin test` workflow described in `mods/README.md`. They were not counted as passing. The portal and changed MCP source tests pass independently.

No production approvals, rejections or developer messages were used as test data. The preview is staged, not an accepted end-to-end release. Deployment IDs and exact source SHA belong in the owning Linear receipt.
