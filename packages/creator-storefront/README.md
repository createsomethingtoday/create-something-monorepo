# creator-storefront

Authoring service and public read API for creator storefront customization on the Webflow template marketplace. Contract: [`packages/webflow-dashboard/docs/creator-storefront/CONTRACT.md`](../webflow-dashboard/docs/creator-storefront/CONTRACT.md). Schema evidence: [`SCHEMA_EVIDENCE.md`](../webflow-dashboard/docs/creator-storefront/SCHEMA_EVIDENCE.md). Tracking: CRE-2282.

**Status:** implemented and tested locally. **Not deployed.** No D1 database, secrets or Worker exist. No storefront records exist in Airtable. The public Marketplace page does not call this API yet.

## What it does

- Creators edit a **draft** (positioning, cover, portfolio link, support note and link, up to 3 featured templates with notes) through the Asset Dashboard.
- **Publish** freezes the draft into a snapshot and writes it to a durable D1 read model. The public GET reads only that read model, never Airtable.
- One **Durable Object per Creator** is the single writer. It serializes every operation, persists intents before any cross-store write, and recovers them after failures or restarts.

| Tier | Here |
|---|---|
| Database | Airtable storefront tables (authoring), D1 `storefront_public` (public read model), Durable Object storage (intents, revisions, idempotency) |
| Automation | `StorefrontWriter`, reconciler alarm, `/api/storefront` dashboard proxy |
| Judgment | Owner vs staff scope, suspension policy, publish eligibility (owned, published template, present in template-search) |

## Routes

| Route | Who | Notes |
|---|---|---|
| `GET /health` | anyone | liveness only |
| `GET /health/ready` | anyone | 200 `{ready:true}` or 503 listing missing/invalid setting **names** |
| `GET /v1/storefronts/:slug` | public | D1 + live template-search check of pins; `no-store`; 404 for tombstones; 503 if template-search is unavailable |
| `GET/PUT /v1/owner/storefront`, `PUT …/selections`, `GET …/preview`, `POST …/publish`, `POST …/unpublish` | owner | `Authorization: Bearer OWNER_API_KEY` + `X-Storefront-Actor-Email`; mutations need `Idempotency-Key` |
| `POST /v1/staff/creators/:creatorId/{suspend,clear-suspension,move-slug}` | staff | `Authorization: Bearer STAFF_API_KEY` + `Idempotency-Key` |

## Configuration (fails closed)

| Name | Kind | Required for |
|---|---|---|
| `READ_MODEL` | D1 binding | public + authoring |
| `TEMPLATE_SEARCH_URL` | var (HTTPS) | public + authoring |
| `CREATOR_WRITER` | Durable Object binding (declared in `wrangler.toml`) | authoring |
| `AIRTABLE_API_KEY` | secret | authoring |
| `OWNER_API_KEY`, `STAFF_API_KEY` | secrets, ≥32 chars, must differ | authoring |
| `ALLOWED_COVER_ORIGINS` | var, comma-separated HTTPS origins of the dashboard | authoring |
| `AIRTABLE_API_BASE_URL` | var, loopback only | local fixture runs only |

A missing or invalid value makes the affected routes return 503 `not_configured` with the setting names, never values. `READ_MODEL` is deliberately unprovisioned: `wrangler.toml` has no `[[d1_databases]]` block until an operator creates the database.

Dashboard side (`packages/webflow-dashboard`): `CREATOR_STOREFRONT_ENABLED=true`, `CREATOR_STOREFRONT_SERVICE_URL` (HTTPS origin), `CREATOR_STOREFRONT_OWNER_KEY` (= `OWNER_API_KEY`), optional `CREATOR_STOREFRONT_ALLOWED_EMAILS` beta allowlist. If any is missing or invalid, the Storefront tab is hidden and `/api/storefront` mutations return 404.

## Provisioning (needs operator approval; not done)

1. `wrangler d1 create creator-storefront`, then add the `[[d1_databases]]` block (binding `READ_MODEL`, `migrations_dir = "migrations"`) with the returned ID.
2. `wrangler d1 migrations apply creator-storefront --remote`.
3. `wrangler secret put AIRTABLE_API_KEY`, `wrangler secret put OWNER_API_KEY`, and `wrangler secret put STAFF_API_KEY`. The Airtable token needs read/write on the two storefront tables and read on Creators/Assets.
4. Set `ALLOWED_COVER_ORIGINS` to the dashboard's production origin.
5. Deploy. `GET /health/ready` must return `{"ready": true}`.
6. Set the four dashboard variables, starting with a small `CREATOR_STOREFRONT_ALLOWED_EMAILS` list.

## Rollback

- **Hide the editor:** unset `CREATOR_STOREFRONT_ENABLED` (or set it to anything other than `true`) on the dashboard. The tab disappears and the proxy refuses mutations. Drafts and the read model are kept.
- **Stop public reads:** remove the consumer integration (none exists yet), or suspend individual storefronts through the staff route, which writes tombstones.
- **Retire the service:** delete the Worker. D1 and Durable Object storage remain until they are deleted explicitly. The Airtable tables are additive and unaffected.

## Tests and local runs

```bash
pnpm --filter @create-something/creator-storefront typecheck
pnpm --filter @create-something/creator-storefront test      # 50 tests; read model runs real SQLite (node:sqlite)
pnpm --filter @create-something/webflow-dashboard check
pnpm --filter @create-something/webflow-dashboard test
pnpm --filter @create-something/webflow-dashboard fixture:storefront   # http://127.0.0.1:5199/?scenario=default
```

The UI fixture mounts the real Settings modal and `StorefrontEditor` against a deterministic in-browser fake API. It lives outside the SvelteKit routes and build, so there is no production test route or auth bypass. Scenarios include `default`, `empty`, `published`, `conflict`, `pending`, `propagating`, `suspended`, `ineligible`, `flaky`, `ambiguous` and `disabled`.

## Design notes

- **Effect:** `docs/guides/EFFECT_INTEGRATION_ENGINEERING.md` prefers Effect for new integration code. This package follows its rules without adopting the library in a new Worker:
  - providers sit behind ports (`src/ports.ts`);
  - typed errors keep the cause (`src/errors.ts`);
  - bounded retries apply to Airtable reads only;
  - uncertain writes are reconciled through intents instead of retried;
  - tests cover success, permanent failure, transient failure, retry exhaustion and unknown-outcome writes.
- **Email matching** reuses the dashboard's helper, moved without behavior change to `webflow-dashboard-core/src/creator-email.ts`. The service and `/api/profile` therefore resolve identity identically. Unlike `/api/profile`, the service refuses ambiguous matches instead of taking the first record.
- **Template-search freshness** relative to Airtable delisting has not been measured. Publish and every public read check presence, but nothing guarantees a bound from delisting to removal.
