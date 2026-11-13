# Renewable authentication — CRE-2428 implementation checkpoint

Repository consent, protected-resource discovery and the initial 401 challenge
request `offline_access` alongside `a2a:read a2a:write`. Lifecycle consent does
not become a tool permission: existing access-only grants can still call tools
allowed by their actual read/write scopes. Owner browser login also requests
renewable consent. No installed plugin or backing App is changed by this source.

The MCP [scope selection strategy](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization#scope-selection-strategy)
uses initial challenge scope before metadata scopes. RFC 9728
[scopes_supported](https://www.rfc-editor.org/rfc/rfc9728.html#section-2)
describes authorization-request scopes. Both therefore include renewable consent.

## Recovery contract

Only Identity refresh grants for the exact A2A application resource can opt in
with `refresh_request_id`, a 43–128 character base64url nonce. A2A derives a
stable, secret 256-bit HMAC request id from its SESSION_KEY, session id and exact
predecessor refresh token. Retrying a generation reuses that id; each successor
gets another id. This needs no plaintext nonce or credential in storage/logs and
no new deployment secret. SESSION_KEY rotation invalidates existing sessions.

Identity validates the signed grant, exact client/resource/scope, active family
and active verified user. It prepares signed replacements before consuming the
grant. A transactional D1 batch inserts the consumption tombstone and encrypted
successful response together. SQLite `changes()` makes only the winning insert
attach a response. Concurrent matching callers read the identical committed
replacement. Signing or failed transactions do not burn the predecessor; an
uncertain successful commit can be recovered by the same request.

Responses are encrypted with AES-GCM and HKDF-SHA256 using predecessor credential
and request id, with domain separation and authenticated exact grant/client/
subject/family/resource/scope bindings. The database retains only the nonce hash
and ciphertext. Recovery is eligible for at most five minutes and never beyond
predecessor expiry. Cleanup is opportunistic on subsequent opted-in exchanges;
cold expired ciphertext can remain stored until that cleanup or consumption
expiry cleanup cascades to it. There is no five-minute deletion guarantee.

Different request ids, used grants without eligible recovery, and ordinary
non-opt-in/host refresh grants retain single-use family-revocation protection.
An already rotated successor cannot be resurrected through cached predecessor
recovery. Family/user revocation is checked again before returning a committed
or cached response. Existing OAuth lifetimes, audiences and scope grants stay
unchanged; request fields cannot widen or silently narrow signed claims.

A2A verifies each replacement's signature, exact resource, same owner subject,
verified invited owner and absence of scope expansion before persistence or use.
It bounds local access expiry by the verified JWT expiry, including a recovered
response whose original expires_in has aged. A random lease ownership fence plus
predecessor-ciphertext CAS prevents stale readers from overwriting/deleting a
successor or releasing another owner's lock. The exchange deadline is ten seconds;
the lease lasts fifteen seconds and an expired owner cannot save a replacement.
Timeouts, 429/5xx, malformed responses and uncertain local writes return 503 with
no access and preserve a recoverable credential. Only explicit invalid_grant is
terminal during refresh and deletes the still-owned predecessor with CAS.
Userinfo 429/5xx and malformed JSON are availability failures, not invalid tokens.
A prolonged outage beyond recovery eligibility can still require fresh sign-in.

## Validation and limits

Regression checks demonstrated RED then GREEN for lost-response identical
successor recovery, A2A availability preservation, and renewable discovery.
Behavioral fixtures cover successive/concurrent rotation, different-nonce replay,
expiry, revocation, signing/DB failures, uncertain committed writes, scope/resource/
subject/admission checks, stale leases and legacy single-use behavior. Node SQLite
runs with foreign keys enabled. A separate esbuild bundle of the actual default Identity handler is exercised
through Miniflare dispatchFetch in workerd with native D1, real form parsing and
cryptography. It verifies transactional concurrency and rollback in a local Worker
HTTP runtime; it is not deployed production or host-session acceptance evidence.

No visual product surface changed. Functional evidence is local; live host
acceptance and release readiness belong to the parent review/promotion pass.

## Migration, deployment and rollback

Apply additive Identity migration `0019_oauth_refresh_recovery.sql` before
shipping the Identity handler. Deploy compatible Identity recovery support before
activating A2A's opt-in client. Apply A2A migration `0006_refresh_fencing.sql` before
shipping A2A; existing sessions acquire fences lazily. Preserve all current live
Identity variables/feature flags and App identity, audience and approvals.

Refresh the existing backing App through its supported
[metadata refresh workflow](https://developers.openai.com/plugins/deploy/connect-chatgpt#refresh-metadata),
read back saved scopes, then reconsent once where the actual host requires it.
Do not assume Refresh grants consent, stores the intended scopes, or implements
the private `refresh_request_id` extension. Ordinary host clients keep legacy
single-use rotation; A2A cookie sessions opt in explicitly.

For rollback, retain the additive tables/column. Prefer keeping backward-compatible
Identity recovery support while reverting A2A. If Identity must be downgraded,
stop A2A refresh work and invalidate affected cookie sessions/reconsent rather
than retrying an uncertain predecessor against a legacy endpoint; drain in-flight
recovery work before removing support. Reverting source does not revert App
configuration or revoke issued credentials. The parent owns those actions.

## Parent live acceptance

Verify the actual private App's saved renewable scopes without replacing its id
or widening its audience. Read tools from that actual host after access-token
expiry and after idle with no fresh messages; verify repeated rotation, concurrent
reads, temporary failure recovery and denial after revocation. Verify the deployed
A2A cookie session path separately, including fault recovery and successor state.
Provider receipts or local fixtures do not establish these live outcomes.

No deployment, merge, installed-App changes or issue closeout occurred in this
implementation pass. Worktree disposition: preserved on
`fix/cre-2428-renewable-auth` for parent review and authorized promotion.
