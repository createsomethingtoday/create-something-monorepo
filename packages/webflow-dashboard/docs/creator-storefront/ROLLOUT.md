# CRE-2282 rollout result (2026-10-30)

**Backend: DEPLOYED and verified live. Asset Dashboard: NOT deployed. Waiting for root.**
Worktree `/private/tmp/cre-2282-rollout`, branch `codex/cre-2282-rollout`, base = PR #2106 head `de8286819464370cec8fa459e9e5e578814f8f87` = current `origin/main` + PR. Nothing committed, pushed or merged. No secret values in this file.

## Service (live)
| Item | Value |
|---|---|
| Account | `ac24bc906aca8307bdba8c2a85ff08c9` (Webflow Hosting), token from Infisical `CLOUDFLARE_WEBFLOW_HOSTING_API_TOKEN` |
| Worker | `creator-storefront`, URL https://creator-storefront.webflow-inc.workers.dev |
| Deployment version | `6535a790-41dc-4155-b8f8-6b7672353739` (first deploy, no prior version; rollback = delete Worker, nothing points at it) |
| D1 | `creator-storefront` `96d4e76f-b1c0-437c-a2c1-8b0a3404c5ac` (WNAM), migration `0001_storefront_public.sql` applied |
| Durable Object | `CreatorStorefrontWriter` (SQLite class, migration tag v1) |
| Secrets on Worker | `AIRTABLE_API_KEY`, `OWNER_API_KEY`, `STAFF_API_KEY` (names only) |
| Secret manager | Infisical prod `/`: new `CREATOR_STOREFRONT_OWNER_API_KEY`, `CREATOR_STOREFRONT_STAFF_API_KEY` (64 hex, distinct). Nothing existing overwritten or rotated. Temp files deleted. |
| Vars | `TEMPLATE_SEARCH_URL` (existing hosting worker), `ALLOWED_COVER_ORIGINS` = `https://webflow-dashboard.pages.dev,https://webflowassets.createsomething.io` |

## Live readback
- `/health` `{"ok":true}`. `/health/ready` HTTP 200 `{"ready":true,"public":[],"authoring":[]}`.
- Public unknown slug: 404 `{"error":"not_found"}`, `cache-control: no-store`; 5 samples 0.45–0.56 s total (from this machine).
- Auth: no credential 401; staff key on owner route 403; owner key on staff route 403; owner key + unknown email 404 `creator_not_found` (live Airtable lookup, formula valid).
- Owner resolution, read-only, existing Creators: (a) `rec00G4LMRhx372LS` (`osolvrstudio`) → 200, `exists:false`, 0 candidates (creator has 0 linked assets, confirmed); (b) `recPdjMC26ti4BGb3` (`template-supply`, owns published templates) → 200, `exists:false`, **26 candidates** with keys `assetId,name,templateSlug`. Response keys: `candidates, draft, lastReceipt, pending`. Draft keys: `draftVersion, exists, fields, publishedAt, publishedDraftVersion, selections, status`.
- Side effects: D1 `storefront_public` = 0 rows; no Airtable writes made. No customer copy touched.
- Schema: all 28 field IDs in `fields.ts` across the 4 tables exist and are readable in base `appMoIgXMTTTNIc3p`. No mismatch.

## Tests and runtime proof
- `creator-storefront`: typecheck clean, 50/50 tests. Dashboard: 221/221 tests. Dashboard `svelte-check --fail-on-warnings`: 0 errors, 0 warnings (after `pnpm build` in `packages/canon`; before that, 2 `Cannot find module '@create-something/canon/auth'` errors came from the unbuilt, gitignored canon `dist/`).
- Wrangler dry run clean (90.97 KiB / 22.5 KiB gzip) before deploy.
- Real workerd proof (`wrangler dev --local`, persisted DO + D1, loopback fake Airtable with synthetic Creator/Asset, real read-only template-search call; harness in `/private/tmp/cs-runtime-fixture`, outside the repo): **21/21 PASS**. Covers: unknown-outcome commit write then hard kill + restart resolves with no duplicate storefront; idempotent retry does not double-apply; publish with Airtable 503 returns 202 `propagating`, public stays 404; hard kill while pending, then the persisted alarm completes publish 4 s after restart with no client request; public DTO has no internal IDs; role isolation 403/401/404; staff suspend writes tombstone, public 404, owner publish gets 423.
- Writer audit (`writer.ts`, `durable-object.ts`, `app.ts`, `dispatch.ts`): no defect found.

## Changed paths (uncommitted, on top of PR head)
- `packages/creator-storefront/wrangler.toml`: enable `READ_MODEL` D1 block with real ID; set `ALLOWED_COVER_ORIGINS`; header no longer says "NOT DEPLOYED".
- `packages/creator-storefront/README.md`, `packages/webflow-dashboard/docs/creator-storefront/CONTRACT.md`: status lines updated from "not deployed".
- `packages/webflow-dashboard/src/lib/components/StorefrontEditor.svelte`: receipt copy. Published: "Storefront customization published (version N). The Marketplace is testing storefronts in a limited preview, so it may not appear on your public profile yet." (was "…will appear when storefronts launch"). Propagating hint: "…is still updating the published storefront data." Root reviewed receipt copy before release.

## Dashboard readiness (nothing changed on the Dashboard)
- **Target (needs root confirmation):** Pages project `webflow-dashboard` in account `9645bd52e640b8a4f40a3a55ff1dd75a`. Evidence: GitHub-integrated (`createsomethingtoday/webflow-dashboard-svelte`, branch main), domains `webflow-dashboard.pages.dev` + `webflowassets.createsomething.io`, last prod deploy 2026-10-13. A second, stale direct-upload project of the same name exists in the Hosting account (`webflow-dashboard-2v4.pages.dev`, last deploy 2026-08-28, different D1/KV); I did not touch it.
- **Prior production deployment (rollback target):** `5d4f35f7-65a4-491e-94ed-cabb76ce0995` (2026-10-13, commit `f1cbb2a85a`). Previous: `4a382066-ee86-4660-8df7-a750bff71462`. That commit is an ancestor of the branch; the only newer Dashboard commit on main (`d819d6d58`, #1975) is already in the branch, so deploying it rolls back no newer feature.
- **Release path caveat:** that project is git-integrated; `CLOUDFLARE_PAGES_API_TOKEN` fails auth there, `CLOUDFLARE_API_TOKEN` works. Merging to the connected repo/branch vs wrangler direct upload is root's call. Existing bindings to preserve: D1 `DB` `da2ac945-5340-42ce-91eb-451aeaad5742`, KV `SESSIONS` `552d6f66fdf84e8aad55306e6971068e`, R2 `UPLOADS` `webflow-dashboard-uploads`. Existing env var names (do not overwrite): `AIRTABLE_API_KEY, AIRTABLE_BASE_ID, CRON_SECRET, ENVIRONMENT, KNOCK_API_KEY, KNOCK_LOGIN_ENABLED, MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID, RESEND_API_KEY, TEMPLATE_LIFECYCLE_CRON_SECRET, TEMPLATE_OFFER_DIAGNOSTIC_TOKEN, TEMPLATE_VIEWS_STATS_API_KEY, TEMPLATE_VIEWS_STATS_URL`.
- **Prospective config (add only; not applied, because the target account is unconfirmed):**
  - `CREATOR_STOREFRONT_SERVICE_URL` = `https://creator-storefront.webflow-inc.workers.dev`
  - `CREATOR_STOREFRONT_OWNER_KEY` (secret) = Infisical `CREATOR_STOREFRONT_OWNER_API_KEY`
  - `CREATOR_STOREFRONT_ALLOWED_EMAILS` = small beta list (needs names from the owner; empty means everyone)
  - `CREATOR_STOREFRONT_ENABLED=true` last, after the release. Code stays gated until all four are valid.
- **Rollback:** unset `CREATOR_STOREFRONT_ENABLED` (tab hides, proxy refuses mutations), or redeploy `5d4f35f7-…`.

## Open items / blockers
1. Root confirms the Dashboard account (above). I stopped short of any Dashboard mutation for that reason.
2. Airtable write scope on the two storefront tables is unproven (`whoami` returns no scopes; I did not create rows in production tables). The first allowlisted-owner save is the proof. Watch for `upstream_rejected` 403/422.
3. Beta allowlist names needed.
4. Review the receipt copy before release.
5. Pending Marketplace preview integration is root's; public API is live but unconsumed.
6. CRE-2282 left open; evidence comment posted (id `95f433f9-bbbb-4889-a12f-b9cd7ddafd04`). No Slack or email sent.
