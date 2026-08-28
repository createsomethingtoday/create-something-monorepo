# webflow-marketplace-sync

Cloudflare Worker that owns the **Webflow Templates → Airtable 🕸️🚰WF CMS Records** sync leg
(currently Whalesync's "WF Templates → Marketplace Assets (Sync Log)") and runs a
**drift reconciler** over the sync-log table.

Production: `https://webflow-marketplace-sync.webflow-inc.workers.dev`

The former CREATE SOMETHING URL remains a temporary compatibility proxy during
the migration rollback window.

## Why this exists

The publish pipeline creates a Webflow CMS item, Whalesync mirrors it into Airtable
(~10s when healthy), and an Airtable automation ("CMS Record Creation Trigger") links the
asset and flips it to Published. When Whalesync lags or stalls, approved templates get
stuck and creators file tickets. This worker makes that leg webhook-driven (seconds, not
"hopefully soon") and adds a formal drift report where before there were ad-hoc checks.

## Architecture

| Piece | Trigger | What it does |
|---|---|---|
| Webhook receiver | `collection_item_created/changed/published` on the Templates collection | Re-fetches the item from the Webflow API (zero-trust: payload data is never written), upserts the sync-log row keyed on `Webflow Record ID` |
| Sweep | cron `*/10 * * * *` | Backstop for missed webhooks: pages items by `lastUpdated desc` inside `SWEEP_WINDOW_HOURS`, upserts each |
| Full drift scan | cron `41 5 * * *` (daily) | Enumerates all items + all rows; classifies drift; optional Slack summary |

### Finding kinds (full scan)

| Kind | Meaning | Healed in live mode? |
|---|---|---|
| `missing_row` | Webflow item has no sync-log row | Yes (create) |
| `field_drift` | Row disagrees with the item (Name/Status/Slug/MRP ID/Sync Source/Sync Record ID/dates) | Yes (minimal patch) |
| `malformed_unique_id` | Item `unique-id` isn't 24-hex → the checkout/use-for-free CTA 404s | Never (needs the correct UID from 🔄MRPs; see the MRP runbook) |
| `never_synced` | Published item with `sync-last-updated` null → the Whalesync **Airtable→Webflow** row has never landed (blocked record) | Never (Whalesync-health signal) |
| `orphan_row` | Duplicate rows for one item, or row pointing at a deleted item | Never (report-only) |

Airtable→Webflow **content** drift (descriptions, thumbnails, prices) is deliberately out
of scope for auto-heal: drift there is bidirectional — some truth lives in Airtable, some
live fixes exist only in Webflow — so bulk-pushing either side loses real data.

## Write modes

- `WRITE_MODE=shadow` (default): every intended Airtable write is logged to D1
  (`sync_events.action = shadow-create/shadow-update`) but not performed. Whalesync stays
  authoritative.
- `WRITE_MODE=live`: the worker performs the writes. Only flip this as part of cutover.

## Endpoints

```
GET  /health
GET  /api/report[?kind=sweep|full]      # latest run + findings (Bearer ADMIN_TOKEN)
POST /api/reconcile?kind=sweep|full[&async=true]   (Bearer ADMIN_TOKEN)
POST /webhooks/webflow                  # Webflow deliveries
```

`ADMIN_TOKEN` lives in Infisical prod root as `MARKETPLACE_SYNC_ADMIN_TOKEN`.

## Cutover checklist (Whalesync sync-log leg → this worker)

1. **Soak in shadow** for ≥3 days. Check `sync_events`: shadow-create/shadow-update
   entries should match what Whalesync then does ~10s later (compare against row LMT).
   `GET /api/report` after each daily full scan; expect findings ≈ Whalesync's real lag.
2. **Verify the Airtable automation fires on worker-created rows**: in a low-traffic
   window, flip `WRITE_MODE=live` (wrangler.toml + deploy), let ONE webhook create a row
   before Whalesync does, confirm "CMS Record Creation Trigger" links the asset and the
   status flips. (The automation triggers on record creation regardless of creator.)
3. **Pause the Whalesync table mapping** `Templates → WF CMS Records` (Whalesync console
   → WF Templates → Marketplace Assets (Sync Log)). Do NOT pause the Airtable→Webflow
   connection — that one stays.
4. Watch the next daily full scan: `missing_row`/`field_drift` should trend to ~0
   (healed automatically in live mode).
5. Retire/keep the 17:30 UTC "Marketplace publish sweep" routine decision: it papers over
   the *publish job* being down, which is upstream of this worker — keep it until the
   publish job itself is trustworthy.

Rollback at any step: set `WRITE_MODE=shadow`, redeploy, unpause the Whalesync mapping.

## Known gaps / notes

- **Webhook signatures**: webhooks were created via the Data API with a site token, which
  returns no signing secret, so `WEBFLOW_WEBHOOK_SECRET` is unset and signature checks are
  skipped. Safe because the handler is zero-trust (re-fetches the item before writing);
  a spoofed payload can only cause a wasted API fetch. If secrets become available
  (UI-created webhooks expose them), set the secret and validation turns on automatically.
- **Staged vs live `unique-id`**: per-item `/live` PATCHes (the MRP-fix runbook) don't
  update the staged view this worker reads, so a fixed item may report `field_drift`
  on MRP ID against a corrected Airtable row. That divergence is real (staged ≠ live)
  but low-priority noise; heal in live mode aligns the row to the staged value.
- The Templates webhooks for `webflow-template-search` exist twice (May 20 + Aug 4
  duplicate registrations) — unrelated to this worker, but worth deleting one set.

## Secrets

| Secret | Source |
|---|---|
| `AIRTABLE_API_KEY` | Infisical prod root `AIRTABLE_API_KEY` (write access verified) |
| `WEBFLOW_API_TOKEN` | Infisical dev `/webflow/template-marketplace` `TEMPLATE_MARKETPLACE` |
| `CMS_READ_ONLY` | Infisical dev `/webflow/template-marketplace` `CMS_READ_ONLY` |
| `ADMIN_TOKEN` | Infisical prod root `MARKETPLACE_SYNC_ADMIN_TOKEN` |
| `SLACK_WEBHOOK_URL` | optional — unset; set to get daily drift summaries |
