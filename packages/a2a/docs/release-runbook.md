# A2A pilot release runbook

Destination: `cs-a2a`, account `9645bd52e640b8a4f40a3a55ff1dd75a`,
custom domain `a2a.createsomething.agency`. Implementation and receipts: CRE-2380.
Use the pinned repository toolchain. Never print runtime secrets or provider tokens.

## Acceptance and evidence

- Functional: owner isolation, exact resource/scopes, reciprocal grants, idempotency,
  durable commit-before-enqueue, duplicate/out-of-order delivery, expiry/resume,
  replay bounds, key rotation, cancellation/revocation, claims, replies, and terminal states.
- Product: directly inspect landing and console, including signed-out, empty,
  populated, receipt/error, mobile/keyboard, reduced-motion, and no-JS states.
  Required widths: 320, 390, 768, 1024, 1025, and 1440 pixels.
- Release: independently retest the final artifact with Sol 6.1; scope the PR;
  merge through the repository review gate; record schema, Worker version,
  source SHA, image digest, domain readback, rollback, and remaining limits.
- Live pilot: two actual owners separately authenticate their dots, explicitly
  monitor their own inboxes, receive a signed event while idle, read/claim/reply,
  and record completion. Repeat duplicate delivery and revoke/expiry behavior.
  Danny (`dm@halfdozen.co`) is the selected second owner; the dot is chosen by
  Danny during his authenticated connection. Never invent his runtime identity.

## Promotion

1. Record the current Identity deployment/version and sanitized settings. Its
   checked-in enrollment defaults differ from production. Do not run its default
   deploy script. Build the narrow Identity change, upload code while preserving
   every live binding/variable, compare settings before promotion, then promote
   that exact version and independently read back discovery/resource policy.
2. Register one public PKCE owner client with exact callbacks
   `https://a2a.createsomething.agency/auth/callback` and
   `http://127.0.0.1:42678/callback`. Put its public client ID in Wrangler vars.
   Host plugin clients register their own exact advertised callback URIs.
3. Apply `0001`–`0003` to product D1 using `--remote`; read back migration records.
   Existing provisioned resources are in `wrangler.jsonc`. Do not create replacements.
4. Generate independent high-entropy `SESSION_KEY` and `CALLBACK_SENDER_TOKEN`.
   Supply them through Wrangler's protected secret input/file mechanism. Keys
   are never build arguments or committed `.dev.vars` files. Keep the session key
   available through the approved secret manager; losing it invalidates sessions
   and prevents decrypting existing subscription secrets.
5. Build web/Worker and the Linux container. Deploy the merged exact artifact,
   recording source revision and immutable container digest. Verify the custom
   domain, security headers, landing, `/app` without loops, `/health`, public OAuth
   metadata/config, unauthorized MCP 401, and unsupported routes. Compare the
   deployed Identity settings to the saved sanitized baseline.
6. Exercise a real controlled public callback through the deployed private sender
   and normal authenticated subscription path. Check signature, original hostname
   TLS, challenge, payload hash, and a durable accepted receipt. Record separately
   any transport fixture evidence and the actual OpenAI activation result.

## Observe and repair

Normal delivery starts from the committed outbox and Queue. The one-minute cron
repairs unpublished events, due retries, expired leases, and retention. It does
not poll the recipient runtime. Inspect owner receipts in the console; use D1
read-only aggregates for operations: oldest unpublished outbox timestamp, oldest
unaccepted delivery, failed/retrying delivery counts, soon-expiring subscriptions,
and message created-to-completed latency. Compare Queue/DLQ backlog and age in
Cloudflare. Logs contain opaque IDs and fixed outcome codes, never content/keys.
The pilot makes no latency or availability promise and has no staffed alert SLA.

Do not mass-replay the DLQ. Determine current grant/subscription/message eligibility,
then replay a specific failed delivery through its owner-authorized operation.
HTTP 410 revokes the subscription; HTTP 413 is terminal. Callback retries preserve
the event ID; consumers must deduplicate writes. A 2xx followed by a lost receipt
can produce a duplicate callback. Keep processing claims and external idempotency
separate from transport deduplication.

## Rollback and key recovery

Rollback the application to its prior verified Worker/container version. This is
the initial product deployment, so the first rollback is removing the new domain
route and disabling the `cs-a2a` consumer/cron while preserving D1 for diagnosis.
Do not drop D1 or reverse additive migrations after writes. Identity rollback is
the saved prior deployed version `66f78b1f-c19b-45ad-81ee-f064beb663c7` if it is still
the immediate predecessor; read current deployment before acting.

For a compromised callback secret, unsubscribe, confirm no pending lease can
retrieve content, and reconnect under a new key. For planned subscription-key
rotation, test dual signatures during the bounded overlap and acceptance under
the new key before the old key expires. Replacing SESSION_KEY invalidates encrypted
rows: stop dispatch, revoke sessions/subscriptions, preserve only non-secret audit
metadata, replace the key through protected input, and require fresh owner login
and subscriptions. Never silently replace the key while old encrypted rows remain active.

Record all gate statuses and remaining human acceptance in Linear. Keep work
open until the required live two-owner dot exchange is proven. Every closeout
includes `Worktree disposition:` with its actual retained or removed path.


## Owner participation upgrade (CRE-2389)

This upgrade reuses the existing Identity client, D1, Queue, sender container,
owner grants, and secrets. Do not repeat initial provisioning or rotate keys.
After the populated local D1 migration and independent UI/security gates pass,
merge the scoped PR and apply pending `0004_owner_conversations.sql` to the
existing product D1 before deploying the new Worker. The migration stages and
restores dependent idempotency, outbox, and delivery rows within the transaction;
it preserves message IDs, claim leases, and the arrival cursor high-water mark.
Existing message authorship becomes legacy because actual origin was not recorded.

Deploy the exact merged source with project-local Wrangler, `--keep-vars`,
`--containers-rollout none`, and `--var BUILD_REVISION:<merged SHA>`. The private
sender/container source is unchanged. Compare sanitized bindings and deployment
metadata with the saved pre-release receipt. Verify current discovery, the
owner-session console, legacy attribution, composer modes, and read-only MCP
thread context. Local two-owner cookie fixtures exercise actual Workerd, D1 and
Queue; they do not prove Danny's host connection or idle wake.

Keep the immediately previous Worker version in the receipt for application
rollback. Preserve schema 0004 and all new messages; never reverse the populated
migration as a code rollback. The previous UI lacks owner attribution and the
owner-post endpoint, and its inbox reads may include non-actionable posted rows.
The receiving policy still requires an actionable claim before work; posted
conversation cannot be claimed. Prefer a forward repair when retaining the new
conversation UI is necessary. Do not send additional production correspondence
merely to qualify a deployment without the owners' applicable authorization.


## Shared-context upgrade (CRE-2392)

Reuses the current Worker, Identity client, D1 and other bindings. Apply only
pending 0005_shared_context.sql before deploying the exact merged Worker; it adds
metadata/chunk tables and indexes without rewriting existing messages or grants.
Validate actual Workerd 1 MiB Unicode/BOM/CRLF integrity, bounded reads, permission
changes, owner-only revocation, retention, and no share-created message/event.
Use the same keep-vars / containers-rollout none promotion path as above.

Verify production schema, unchanged known messages/grants/container/settings,
empty or already-authorized context listing, MCP resources/tool discovery, and
the signed-in owner controls without uploading a new document to Danny merely
for verification. Check local two-owner write evidence separately from production
read-only evidence. Host clients may need MCP tool refresh/reconnection.

Preserve 0005 and owner data during application rollback. A pre-document Worker
does not serve the new context endpoints or run document retention. Prefer a
forward repair; if code is rolled back, retain the validated context-pruning path
until restoration so the 30/90-day deletion contract continues. Never restore a
revoked document or credential as part of rollback.

Protocol sources: [MCP 2025-03-26 resources](https://modelcontextprotocol.io/specification/2025-03-26/server/resources)
and [pagination](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/pagination).

## Inbox and motion refinement (CRE-2430 / CRE-2432)

The owner-approved Cook pass changes only web UI, its GSAP dependency, and local
review tooling. It requires no schema, Identity, secret, binding or container
change. Use the same exact-merged-source, keep-vars and containers-rollout none
path above. Record the prior Worker version and compare settings after promotion.

Validate loaded-conversation counts/search, thread/back navigation, in-memory
draft close/resume, and immediate keyboard focus. Motion must remain optional:
check missing/delayed GSAP, reduced preference changes, native scrolling and
visible content at all six widths. The local synthetic host is
`node packages/a2a/scripts/ui-review-server.mjs` after a web build; its scripts
are not build inputs or deploy assets. `docs/cook-release-audit.md` records the
independent source/artifact gate. Cook clips and detailed browser evidence are
retained in the operator worktree and referenced by the Linear release receipt.
Require a clean `pnpm install --frozen-lockfile --ignore-scripts
--side-effects-cache=false` CI gate before promotion: checks against already
installed dependencies cannot establish lockfile validity or reproducibility.
The advisory Ground orphan findings for these two manual fixture entrypoints
are expected; unsupported HTML/CSS/media exclusions are not checked-clean claims.

For live acceptance, read the exact build revision and exercise actual landing
and owner-console controls without posting correspondence or changing grants.
Application rollback preserves current data and schema. Broader live dot wake
or provider-delivery qualification is separate from this UI-only release.
