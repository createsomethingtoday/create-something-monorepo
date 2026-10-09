# Standalone Identity account page

The shared Identity host adds `/login`, `/recover`, and `/verify`. Recovery forms use the existing verified recovery endpoints. Generic account entry has no credential form or login request. The health response at `/` and existing PCN recovery/verification routes remain unchanged. Beta account creation remains invitation-only; no signup UI, schema, flags, credentials, app entitlements, tenant grants or connector consent change is included.

Recovery requests from the standalone form explicitly set `experience: identity`. Only recovery supports that choice; its email proof URL uses the fixed `https://id.createsomething.space/verify` destination. Legacy requests still produce PCN links with the existing bounded next path. Email proof remains in the fragment, is immediately removed from browser history, stays in memory, and is submitted only to the existing completion endpoint. No token, email or caller-supplied URL is interpolated into document HTML.

`app=gigi` survives recovery, verification and sign-in links and exposes a fixed link to the GiGi beta page. The reviewed desktop source has no verified Identity browser callback. This return step does not sign into the desktop app. Arbitrary `next`, `return_url`, custom schemes and other app names are ignored. Registered OAuth requests to `/login` with `client_id` use the existing validated OAuth authorization page and registered callback/PKCE flow; `/oauth/authorize` remains available.

Generic `/login` is an account entry page with fixed GiGi and Private app links plus password recovery. It contains no password form, login API call, or token issuance. Sign-in happens in the chosen app. Registered OAuth clients retain the existing validated authorization/code/PKCE flow. No new Identity browser cookie/SSO session or desktop callback is introduced.

Documents use request-specific CSP nonces, same-origin connections, no framing, no referrer, no indexing, no cache, no tracking or external scripts/fonts. Password values clear after requests. Forms include native validation, accessible labels/status/error text, password confirmation and bounded request timeouts.

## Preview and validation

The review Worker `identity-account-review-20261005` has no bindings or secrets. Its POST handler always rejects before reading the body; it cannot call Identity, Resend or a database. A visible banner labels it a synthetic-only preview. Preview source and browser receipts are outside this production package.

Focused page/recovery tests and typecheck pass. Desktop1440px/mobile390px browser checks mock every auth response: recovery success, password confirmation, completion, missing proof, recovery400/429/503 and network failure, generic entry with no credential fields or auth calls, no overflow or token storage, fixed GiGi return. No real reset email or credential is used.

## Minimal publication plan

1. Review the source and synthetic preview, including the explicit app-entry/desktop-return boundary.
2. Run the normal scoped secret scan and commit/PR checks; do not bypass the global hook.
3. Merge through normal review. Build the reviewed worker using existing dependencies only after disk reserve is sufficient, or use controlled CI.
4. Promote only the reviewed code to `identity-worker`, preserving all current bindings and settings server-side. Current production recovery/invitation flags are true even though repository defaults are false; do not blindly replace settings from wrangler.toml. Public signup and PCN enrollment must stay false.
5. Verify GET-only pages, health/discovery, document headers and unchanged flags; use synthetic browser interception for error/return states. No real email smoke test is included.

Rollback: restore the prior reviewed worker code while preserving current settings/bindings. No migration or data rollback is needed. Preserve PCN links and existing invitation/recovery data. Grant's owner-credential invitation handoff is independent and remains pending.
