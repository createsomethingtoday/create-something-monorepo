# Administrator support sessions

CRE-2030: explicit read/write support impersonation requested by Micah. This is application-scoped delegation, not target authentication or a replacement for signup/login acceptance.

## Policy

- An active, verified CREATE SOMETHING Identity `agency` session and the exact Private administrator allowlist are mandatory. Identity separately authorizes its read-only target deputy with `PCN_SUPPORT_ADMIN_EMAILS`.
- The target must be an active, verified Identity user already present in this deployment's applications or membership records. Administrator targets and nested sessions are rejected.
- The actor's Identity credentials remain unchanged. Private stores a hashed opaque, host-only support cookie and a server-side session with actor, target, support reason, expiry and revocation. It never issues target Identity credentials.
- Sessions last at most 15 minutes; starting another revokes older sessions for the actor. Live actor and target state, current network ownership/membership and creator admission are rechecked per request.
- Ordinary creator writes include network drafts/settings, free-trial activation when enabled and eligible, teaching applications, creator invitations, field notes, memberships, asset editing/releases and video publishing. All existing target permissions, limits, gates and approval requirements apply.
- Payment/checkout/seller access, company-support mutations, creator/partner review, credentials, irreversible video deletion and unknown write endpoints are blocked. New mutation routes need explicit review before addition to the allowlist.
- Requests are audited before execution with the real actor, target, method, pathname and eventual response status. No bodies, credentials, invitation tokens or query strings are recorded. A missing status indicates an interrupted request or failed outcome recording, not successful completion. Existing domain receipts retain the effective target; support receipts preserve the real actor.
- Mutation requests must match the support session displayed in that tab. Starting/stopping a session makes stale tabs' writes fail instead of silently changing who acts. The support banner remains visible and offers Return to administrator.
- Support traffic skips client impact tracking. Existing server domain events may still reflect support activity; use support receipts when assessing acceptance traffic.
- Previously issued short-lived playback/upload/download capabilities retain their existing provider expiry; stopping impersonation prevents new grants, not bytes already delivered.

## Promotion and rollback

1. Run Identity tests/typecheck, Private tests/check/build and retired-provider check.
2. Review and merge the source. Deploy Identity's narrow read-only deputy without changing enrollment gates.
3. Apply migration `0012_impersonation.sql` to preview and deploy preview with `PCN_IMPERSONATION_ENABLED=true`. Preserve test-only Stripe settings, isolated D1/R2 and trial gates.
4. In Browser verify administrator start, correct target banner, actual draft write, target approval/ownership denial, blocked sensitive action, stop, real administrator restoration and persisted receipts. An actual support start broadens account access and requires the operator's action-time approval in Browser.
5. Only after that proof, enable production `PCN_IMPERSONATION_ENABLED` through a reviewed promotion, migrate production, deploy and repeat a bounded designated-account check. Production payments and creator-trial flags remain independent.

Rollback: set `PCN_IMPERSONATION_ENABLED=false` and redeploy the prior Worker. Set Identity `PCN_SUPPORT_ADMIN_EMAILS` empty to disable the deputy. Preserve the additive tables and audit history. The cookie cannot grant access without a current administrator Identity session. Do not remove audit tables to roll back.

## Server fetch boundary

The target deputy must use server-native `fetch`, not SvelteKit `event.fetch`. SvelteKit adds the incoming page Origin to cross-origin requests, which Identity correctly rejects on this server-only endpoint. Preview acceptance caught this before production activation; the regression test emulates the rejected inherited-Origin request. Never relax the Identity Origin rejection to make support sessions work.


## Preview acceptance — 2026-09-20

On preview `f4d03600-ef24-49b4-b971-4dddd64228a5`, the operator approved a bounded session for the designated second account. Browser proved the target banner, actual `POST /api/networks` 201, draft settings, seller-page 403, reviewer-page 403 and return to administrator without sign-in. D1 readback confirmed the target owner, real actor and target audit, and session revocation. An old tab's refresh request was rejected409 by the context guard. The network `support-acceptance-20260920` remains a private unpublished preview draft, without billing or trial activation.

Production `PCN_IMPERSONATION_ENABLED=true` is promoted with the server-native fetch fix after this acceptance. Payment, creator-trial and enrollment flags remain unchanged. Production session start still requires explicit operator action; preview proof is not a claim of completed production write acceptance.
