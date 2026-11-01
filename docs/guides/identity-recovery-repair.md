# Identity recovery repair and managed-auth pilot (CRE-2224)

Status: local review candidate only, based on df0a8dcc78b9eba7a96ac66f3455f5aded1cb0c7. No deployment, policy activation, production invitation, service-key grant, account migration or email request is authorized by this document.

## Policy boundaries

`VERIFIED_RECOVERY_ENABLED=true` separates recovery from new-account admission: only an existing, verified, non-deleted Identity may receive recovery proof. Completion rechecks lifecycle and changes password plus revokes Identity refresh tokens, OAuth refresh families, MCP sessions, long-lived MCP tokens and legacy MCP keys in one guarded D1 batch. Deletion or loss of verification between proof and mutation fails closed. Already issued stateless access JWTs remain usable until their expiry unless resource middleware checks current lifecycle/revocation; this change does not promise immediate invalidation of those JWTs. Recovery sends no session or application entitlement.

`ENROLLMENT_INVITATIONS_ENABLED=true` adds exact-email, maximum seven-day, revocable, auditable Identity signup admission. A dedicated `enrollment_invitation_manage` service permission is required at the router. Existing API keys are not upgraded. Issuance creates metadata, not an account, email, tenant membership or application grant. Request IDs are scoped to the authenticated service actor and immutable on reuse. The proof binds one invitation; redemption inserts the user, consumes the invitation and writes its audit event in one D1 batch. An old unbound proof cannot borrow newly granted invitation eligibility.

Legacy public, allowlist and PCN eligibility remain available and unchanged when the flags are off. Legacy admission can still admit an email independently of an invitation; operators must understand these parallel admission sources. GiGi subject allowlists, MCP account IDs, resource/audience checks and tenant policies remain independent. No app access may be derived from an invitation or managed-provider email/role claim.

Mailbox proof is single-use, 15 minutes, stored only as a digest; redirects remain restricted. IP and per-email throttles remain. Generic recovery responses cover unknown, unverified, deleted and new-mode provider rejection; generic success is not a delivery receipt. Provider rejection deletes undelivered proof. Perfect timing indistinguishability is not guaranteed. Enrollment service outages may still return 503. Invitation list requires an exact email and returns at most 50 records to an authorized service; it is not a public directory.

## Rollout and rollback gates

1. Review the local diff and tests, including independent security review. Before any pre-commit GitGuardian content upload, obtain approval for the exact changed files; the earlier landing-page approval does not cover these files.
2. Separately approve production deployment and apply additive migration **0017 before deploying code**, even if both flags remain false. New code references `invitation_id` unconditionally. This is not a deployment-ready change without that ordering.
3. Deploy with both flags false; verify existing signup, legacy recovery, PCN and discovery contracts in staging first. No existing protected allowlist is overwritten or read.
4. Separately approve recovery activation. Use an owner-controlled synthetic verified account to test email delivery, expiry, replay, lifecycle races and all credential-family revocation. Existing recipients still own passwords, verification and consent. No real recipient requests until the approved live path exists.
5. Invitation activation and narrowly scoped service-key permission require their own approval. No permission has been granted locally or remotely. Test revoke/expire/redeem with synthetic admission before inviting real users.
6. Roll back flags first to remove the new policy paths, then old code if needed. Retain the additive schema and audit data: old code ignores the new column/tables. Disabling recovery does not restore revoked credentials; disabling invitations invalidates invitation-bound proofs. Never undo revoked credentials or reconstruct plaintext proof.

## Separate managed-auth experiment

The owner-approved offline provider compatibility plan and synthetic test are preserved separately in the workspace `gigi-account-review/identity-repair-evidence/`. They are not part of this production candidate: the repository retired-provider guard remains unchanged. No provider SDK, key, account or hosted integration is introduced.

Tests use disposable SQLite databases and public synthetic passwords/mailboxes only. No installs or full builds were run: the Mac has 3.7 GiB free, below the requested 5 GiB reserve. Existing dependencies are reused. Native D1 deployment acceptance remains a future gate.
