# Webflow App Review portal

Private reviewer application on Webflow Cloud. The existing App Review MCP remains the authority for Airtable and Zendesk access. The portal stores encrypted OAuth sessions, private uploaded bundles, provider analysis receipts, and reviewer action receipts.

## Identity and access

The portal is an OAuth public client of Webflow's existing Cloudflare Access Managed OAuth service, using authorization code + PKCE and a one-use browser-bound state. This reuses the existing Webflow-owned identity boundary; it does not add an identity provider. `app_review_session` returns only the current MCP session's verified Access identity. Shared bearer sessions cannot sign in. Access tokens are encrypted with AES-GCM in D1 and never reach browser JavaScript. The session cookie is Secure, HttpOnly, SameSite=Lax, host-only, and expires within one hour. A user signs in again after expiry; refresh tokens are not retained.

`PORTAL_ALLOWED_EMAILS` is an additional explicit portal admission policy, evaluated on every request. The initial deployment admits only its owner. Team access is a separate rollout step; this package does not schedule or send invitations. Each protected request revalidates the user's MCP tool catalog. UI permissions and server-side action checks derive from that catalog. The current MCP grants all admitted reviewers the same workflow and does not enforce assignment-based visibility. This portal does not invent separate reviewer roles.

## Data and execution

- ZIP uploads are bounded to 20 MB, validated without execution, hashed, and stored under the authenticated account ID. DB queries enforce the same owner.
- GPT-6 Astra runs through the separately billed OpenAI Responses API. A fresh hosted container has disabled network access, 1 GB memory, and a 20-minute inactivity expiry. The original ZIP is uploaded to that container; no production secrets or MCP tools are provided to the model.
- The model is instructed to verify the archive hash, inspect before extraction/execution, use bounded commands, and explicitly distinguish static findings, actual runtime observations, and untested behavior. Offline restrictions can prevent dependency installation, OAuth, real Webflow Designer interaction, and network integrations from being tested.
- Background response IDs, exact bundle hashes, provider-reported model, usage, report, and shell outputs are retained as evidence. A report never performs a decision or sends a message. The container is deleted after its final receipt is saved, with inactivity expiry as fallback.
- Ten analysis starts per reviewer per day and one active or uncertain run per bundle are enforced by D1. Provider writes have no automatic retry. `X-Client-Request-Id` and response metadata identify the portal run; this is correlation, not a claim of provider idempotency.
- Decisions and messages require a human confirmation of exact content. The portal compares freshly read status and linked ticket, checks the live tool grant, and records an idempotency receipt before the MCP write. Airtable does not offer an atomic cross-service compare-and-swap; another writer can still change the record after the read. Unknown outcomes block further actions for that target until explicit reconciliation.
- Zendesk writes retain the upstream support integration attribution; the portal separately records the initiating reviewer. These are not native per-user Zendesk API writes.

## Configuration

Webflow Cloud provisions D1 `DB` and R2 `BUCKET` from `wrangler.json` and applies additive SQL migrations from `drizzle/`. The database UUID in the config is the local binding identity required by the installed CLI; Webflow replaces it with its provisioned resource ID during deployment. Never substitute an existing production database ID from another application.

Runtime variables, provisioned through Webflow's secret/environment tooling:

| Name | Contract |
| --- | --- |
| `PORTAL_ORIGIN` | Exact HTTPS origin; also used for CSRF checks and the OAuth callback |
| `OAUTH_CLIENT_ID` | Registered public client for `/api/auth/callback` on that origin |
| `SESSION_ENCRYPTION_KEY` | Secret: 32 random bytes, base64url encoded |
| `PORTAL_ALLOWED_EMAILS` | Exact comma-separated admitted reviewer emails |
| `OPENAI_API_KEY` | Secret: funded project credential for bundle analysis |

Missing configuration fails closed with a named error. No secret values or quiet deployment placeholders are included in the source. Set secrets through stdin, never command-line arguments or committed files. The current work-session API probe failed with `credit_balance_exhausted`; model discovery alone does not prove inference works.

## Verification

```sh
npm ci
npm run check
npm test
npm run build
```

For local interaction verification, run `npm start` on port 3174 and `node scripts/ui-fixture.mjs` in another terminal, then visit `http://127.0.0.1:3175`. This loopback-only harness uses visibly labeled fictional records and simulates review writes. It contains no provider credentials and is not proof of live OAuth or provider behavior. Cook reference/history and migration-round evidence are in `cook/`.

## Recovery and rollback

For an uncertain action, open Activity, inspect its current Airtable/Zendesk context, and record the observed outcome and evidence through Reconcile. A two-minute settling period prevents releasing an in-flight request. Reconciliation records an observation without replaying a write.

For an uncertain analysis, locate the response in the owning OpenAI project using the run ID / `X-Client-Request-Id`. In the bundle view, recover the response by ID. The server verifies both `portal_job_id` and `bundle_sha256` before attaching it. Never clear an active/unknown run merely to retry paid inference. If no response was created, an operator must confirm that through the provider before a targeted database correction; no automatic unsafe release exists.

Preserve the previous Webflow deployment for rollback; additive database migrations remain in place. Rotating the session encryption key invalidates all existing sessions. The original owner-private ChatGPT Site is preserved separately. No production approval/rejection or developer message is used as a smoke test.

## Initial release status

The Webflow Cloud preview is deployed with D1 and R2. Anonymous session and queue requests return 401. Sign-in is intentionally unavailable until Webflow Access allows the exact portal callback and a public OAuth client is registered. Bundle analysis also needs a funded project credential; the live inference probe returned `credit_balance_exhausted`.

The new read-only `app_review_session` MCP tool must be promoted with the portal release before reviewer sign-in acceptance. No production decision, developer message, or successful model execution is claimed. See `VERIFICATION.md` for the tested boundaries and remaining rollout checks.

Dependency audit: zero high/critical findings after upgrading Next, Zod, Wrangler and OpenNext; three moderate findings remain in OpenNext's glob/minimatch dependency chain with no reported direct fix. The adapter traverses the trusted build checkout. Uploaded review archives do not enter that build pipeline.
