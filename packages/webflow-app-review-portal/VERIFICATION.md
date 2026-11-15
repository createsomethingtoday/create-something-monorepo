# Verification and rollout boundary

## Passed locally

- Portal clean npm install, TypeScript, 24 backend tests and production build.
- Independent reviewer reran 24 tests and TypeScript, examined session isolation, ambiguous write recovery, live-grant checks, public readiness endpoint, and modal focus handling.
- MCP owning source: 186 tests in `src/` and TypeScript passed on the current-upstream release checkout, including the two new verified-session tests.
- Immutable GitHub Actions pins; retired identity-provider check is included in release validation.
- Browser fixture: search and navigation, disabled unconfirmed approval/analysis, keyboard Escape and focus isolation, confirmed simulated developer message with a simulated receipt, desktop and mobile rendering. Mobile queue/detail document width equals the 390px viewport.

## Live preview evidence

Webflow Cloud accepted deployment and provisioned D1/R2. Browser requests to `/api/status` return `signInReady:false`; `/api/session` and `/api/queue` return 401. The page explains that reviewer sign-in is being configured. No bypass identity or shared token is installed.

The first probe using the default credential failed with `insufficient_quota` / `credit_balance_exhausted`. On 2026-11-15 a funded Infisical credential completed real GPT-6 Astra inference and a synthetic ZIP review using the actual `uploadBundle`, `startAnalysis`, and `pollAnalysis` implementation. Storage used local SQLite and an in-memory R2 adapter; OpenAI calls were real. The exact archive hash was verified in the isolated, network-disabled container. Two supplied Node tests and eight supplemental assertions passed. The portal saved the provider report and ten shell call/output records before deletion; DELETE returned 200 and a subsequent container GET returned 404. This proves the provider execution component, not hosted OAuth or live Webflow integration.

The fixture report exposed temporary sandbox links, so the prompt now requires complete inline evidence and forbids links to files deleted during cleanup. No secret value was logged or committed. After the owner authorized deployment on 2026-11-15, the verified key was provisioned through stdin as the encrypted Webflow runtime secret `OPENAI_API_KEY`; metadata readback confirmed it is secret.

## Remaining acceptance

1. Webflow Access administrator allows `https://app-review-portal.webflow.io/api/auth/callback`; register the public OAuth client and provision its client ID.
2. Promote the read-only MCP session identity tool through the normal release gate, then complete real reviewer OAuth and verify the provider audience/resource contract.
3. Repeat the harmless bundle flow through the signed-in hosted portal after OAuth is available. The funded key is now provisioned; the local-storage / real-provider component flow has passed.
4. Verify two separate reviewer identities and denied cross-user bundle access before team rollout. Invitations remain a separate authorized step.

The broad MCP `vitest run` also discovers five Claude mod suites whose ignored generated `.claude-plugin/types/tsconfig.json` files are absent in a clean clone. Those suites require the owning `claude plugin test` workflow described in `mods/README.md`. They were not counted as passing. The portal and changed MCP source tests pass independently.

No production approvals, rejections or developer messages were used as test data. The preview is staged, not an accepted end-to-end release. The owner subsequently authorized deployment on 2026-11-15. OAuth registration was retried and still rejected the callback under the Webflow Access account configuration. Deployment IDs and exact source SHA belong in the owning Linear receipt.
