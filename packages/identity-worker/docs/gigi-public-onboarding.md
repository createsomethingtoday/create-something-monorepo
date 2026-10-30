# GiGi public account onboarding

GiGi local records require no account. Public source onboarding uses CREATE SOMETHING Identity mailbox proof followed by the existing exact-resource OAuth/PKCE sign-in. Google consent and source import remain separate actions.

## Activation

- Apply additive migration `0018_gigi_enrollment.sql` before uploading Identity code. Existing challenges have a null application and retain their prior policy.
- Set Identity `GIGI_ENROLLMENT_ENABLED=true` to allow signup requests with `purpose=signup, app=gigi`. Keep `PUBLIC_ENROLLMENT_ENABLED=false` and preserve existing invitation, recovery, PCN and resource bindings.
- Set connector `GIGI_PUBLIC_ACCESS_ENABLED=true` to admit active, email-verified Identity users with the exact GiGi audience. Retain `GIGI_ALLOWED_SUBJECTS` for rollback. Source access still derives the owner from Identity and reconciles the account/config/scopes before use.
- Preserve current provider configuration IDs, scope pins, secrets, consent journals and grants. A public account does not supply Google consent, Private membership or Agency entitlement.

Identity discovery exposes `applications.gigi.enrollment_enabled` separately from global enrollment mode. The signup URL is `https://id.createsomething.space/signup?app=gigi`.

## User journey

From GiGi source sign-in, choose **Create account**. The signup tab emails a single-use 15-minute verification link. Verify email and choose a password of at least 12 characters. Return to the original GiGi sign-in tab. If its request expired, return to GiGi on the Mac and start source sign-in again. This preserves the existing PKCE callback; verification itself creates no session. Then choose a Google source, complete consent, verify the selected account, preview and explicitly import local records.

The signup and verification pages do not accept arbitrary return URLs or store credentials/proof in browser storage. Existing accounts can recover their password. Rate limits remain 15 starts/IP/hour, three emails/address/hour and 30 completions/IP/hour. Recovery remains separately controlled.

## Verification and limits

Run Identity tests (including native D1 migration/one-use proof), GiGi integration tests and both typechecks. Review signup, sent-email, expired proof, recovery and completion at desktop/mobile sizes. Use an isolated new account for live signup, exact-resource sign-in and admission. Cross-user account denial must continue to pass.

Google public eligibility is a separate provider acceptance gate. Selected Composio managed configs are enabled but their API does not expose Google publishing/verification state. Current Gmail grant includes full-mail access; current Calendar grants allow writes. The application import boundary uses fixed reads. Do not describe those provider grants as read-only or claim public Google eligibility from configuration health alone. Preserve existing grants until a separately qualified scope migration is available.

## Rollback

Restore the previously recorded Identity and connector Worker versions, or disable the two GiGi flags while preserving all other settings. Keep the additive column and migration record. Do not delete created accounts, roll back the shared database, revoke existing Google grants, or reactivate consumed proofs. Publicly created identities remain subject to each application's own access policy. Retain the reviewed deployment bundle hashes and version IDs with CRE-2293.
