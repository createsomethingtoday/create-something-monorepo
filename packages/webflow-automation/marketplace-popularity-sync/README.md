# Template Popularity Sync

Daily Snowflake (+ beacon D1) → Airtable sync for the marketplace **Popular
sort**. Replaces the Fivetran activation "Template Marketplace Popularity Score"
(dataset "Template popularity", daily ~03:03 UTC build, Airtable write
~05:40 UTC).

Chain: `v7.sql` (Snowflake inputs) → `model.mjs` (score) → 👛Assets fields →
search-worker D1 `popularity_score` (incremental Airtable sync every 5 min) →
public Popular sort. The 📋 fields also feed the asset dashboard's per-asset
analytics and its D1 `analytics_snapshots`.

## Files

| File | Role |
|---|---|
| `v7.sql` | V7 model verbatim — produces every per-template input (demand ranks, sites, conversion, freshness, dead-inventory) plus one added column, `external_marketplace_url` (the beacon join key) |
| `model.mjs` | Scoring. V7 formula + weights with pluggable **demand** and **views** sources; shared by the sync and the impact report. Must reproduce `v7.sql`'s score exactly before any variant is trusted (`verifyV7Reproduction`, enforced in `sync.mjs`) |
| `sync.mjs` | The daily write. `--model <variant>`, `--execute` (dry run by default) |
| `v8-impact.mjs` | Review artifact: rank movement V7 → each variant, `runs/v8-impact.json`. Read-only. `--cached` reuses the last orders pull |
| `run.sh` + `.plist` | launchd wrapper, 07:15 + 12:15 CT (second slot = retry; skipped when today's receipt exists) |

## Model variants (`model.mjs` → `VARIANTS`)

| Variant | Demand (recent purchases) | Views (0.10 weight) | Status |
|---|---|---|---|
| `v7` | `report__template_sales` (Stripe checkout only) | Segment `template_marketplace_viewed` — **dead since 2026-07-21** | Fivetran parity. Templates created after ~7/21 get ~zero viewer rank |
| `v8-beacon` | same as V7 | owned beacon (`webflow-template-views` D1), trailing 28-day sessions | **Recommended cutover.** Fixes the dead signal, changes nothing else |
| `v8-orders` | delivered `MARKETPLACE_ORDERS` (includes fulfillment-link installs) | same as V7 | Policy decision pending — see below |
| `v8` | orders | beacon | both |

Only 🖌️Popularity Score changes with the variant. 📋 Unique Viewers,
📋 Cumulative Purchases and 📋 Cumulative Revenue keep their V7 basis (lifetime
Segment viewers; Stripe purchases/revenue) so the creator-facing dashboard
numbers do not change meaning underneath the creators.

### Why `v8-orders` is a separate decision

Fulfillment-link orders are real installs (creator was paid off-platform) but
are also free for the creator to generate, so counting them as *demand* opens a
ranking-gaming vector the Stripe-only source does not have. 2026-10-02 impact
(`runs/v8-impact.json`): orders-only moves the median template 207 positions
and 13 templates into the top 100; beacon-only moves the median 143 and 5 into
the top 100. Ship beacon first; decide orders with whoever owns Marketplace
ranking policy.

## Running

```bash
# from the monorepo root — infisical returns EMPTY from any other cwd
export AIRTABLE_API_KEY=$(infisical secrets get AIRTABLE_API_KEY --env=prod --path=/webflow/app-reviewer-airtable-mcp --plain)
export CLOUDFLARE_API_TOKEN=$(infisical secrets get CLOUDFLARE_WEBFLOW_HOSTING_API_TOKEN --env=prod --raw-value | tr -d '[:space:]')
export CLOUDFLARE_ACCOUNT_ID=ac24bc906aca8307bdba8c2a85ff08c9   # Webflow Hosting — where the beacon D1 lives

cd packages/webflow-automation/marketplace-popularity-sync
node sync.mjs --model v8-beacon              # dry run + parity diff vs current Airtable values
node sync.mjs --model v8-beacon --execute    # write changed records
node v8-impact.mjs [--cached]                # rank-movement report (needs runs/v7-rows.json from a sync run)

DRY=1 bash run.sh                            # exercise the launchd path end to end without writing
```

Dry runs print a parity diff against the values currently in Airtable — while
Fivetran still runs, that is a parity check against its latest write; after
cutover, against our own previous write.

## Cutover to V8 (beacon)

The search worker re-reads Airtable every 5 minutes, so with both syncs live
the Popular sort flips to V7 at ~05:40 UTC and back to V8 at 07:15 CT every
day. **Fivetran must be paused before `MODEL=v8-beacon` goes live in `run.sh`.**

1. Pause the Fivetran activation sync (fivetran.com → activations → workspace
   4864 → sync 3156352). Originally a Census sync by John Kadavy; no current
   owner identified (#team-data-analytics-engineering, 2026-08-20).
2. Set `MODEL="${MODEL:-v8-beacon}"` in `run.sh` (or run once by hand with
   `--model v8-beacon --execute`).
3. Confirm the next day's receipt in `runs/` and that SYNCED_AT in Airtable
   stops showing the ~03:00 UTC Fivetran stamp.

## Fivetran-inputs mode (default since 2026-10-13, no Snowflake auth)

The daily job reads inputs that Fivetran writes with its own Snowflake
connection:

- Fivetran dataset **"Template popularity inputs (V8)"** = `v8-inputs.sql`
  (V7 minus the dead viewer term), activation to 👛Assets, key
  `TEMPLATE_ID` → 👀ℹ️MRP ID (Override), update-only, daily 05:00 UTC. Maps
  `SCORE_EX_VIEWS` → 🖌️Score ex-views, `DEAD_INVENTORY_MULTIPLIER` →
  🖌️Dead Inventory Multiplier, plus 📋 Unique Viewers / Cumulative Purchases /
  Cumulative Revenue / SYNCED_AT as before. **Never** map anything to
  🖌️Popularity Score.
- `SOURCE=airtable` (the `run.sh` default) → `sync.mjs --source airtable` reads those
  fields, adds `100 × dead × 0.10 × percent_rank(beacon 28d sessions)`, and
  writes 🖌️Popularity Score only. Refuses to write if fewer than 5,000 assets
  carry inputs or the newest SYNCED_AT is older than 30h.
- The old "Template Marketplace Popularity Score" activation stays **off**;
  turning it back on is the V7 rollback.

## Scheduling

launchd runs `run.sh` from a locked worktree detached at `origin/main`, so the
job never runs uncommitted code:

```bash
git worktree add --detach ~/Code/create-something-monorepo-wt-popularity-sync origin/main
git worktree lock ~/Code/create-something-monorepo-wt-popularity-sync --reason "launchd popularity sync"
cp <wt>/packages/webflow-automation/marketplace-popularity-sync/com.webflow.marketplace-popularity-sync.plist ~/Library/LaunchAgents/
launchctl bootout gui/$(id -u)/com.webflow.marketplace-popularity-sync 2>/dev/null
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.webflow.marketplace-popularity-sync.plist

# pick up a merged change
git -C <wt> fetch && git -C <wt> checkout --detach origin/main
```

Rollback to Snowflake inputs: set `SOURCE=snowflake` in the plist env and reload.

## Snowflake auth (only needed for `SOURCE=snowflake`)

Runs use Okta `externalbrowser` and succeed only when the SSO session is
cached (Aug 27–Sep 27: 11 of 32 days). Both non-interactive options are blocked
at the privilege level for `MICAH@WEBFLOW.COM` (role `SNOWFLAKE_REPORTER`):

- **PAT** `POPULARITY_SYNC` exists (created 2026-10-02, expires 2026-12-31,
  role-restricted to `SNOWFLAKE_REPORTER`, secret in macOS keychain
  `snowflake-pat-popularity-sync`) but is rejected — PATs require a network
  policy on the user or account, and neither has one.
- **Key pair**: `~/.config/webflow-automation/snowflake-popularity-sync-rsa.p8`
  is generated; `ALTER USER … SET RSA_PUBLIC_KEY` needs
  `MODIFY PROGRAMMATIC AUTHENTICATION METHODS` on the user.

Ask a Snowflake admin for either (network policy for the user, or the grant /
setting the public key). Then `USE_SNOWFLAKE_PAT=1` in the plist env, or add
`--authenticator SNOWFLAKE_JWT --private-key-file` to `querySnowflake`.

With `SOURCE=snowflake`, a failed day leaves yesterday's scores in place — once Fivetran is
off that is stale-V8, not a regression to V7. The 12:15 retry slot covers the
common case.
