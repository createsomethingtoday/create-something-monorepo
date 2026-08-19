# Webflow App Install Count Runbook

How to answer "how many projects (sites) is app X installed on?" from a Marketplace Client ID.

Created 2026-08-18 from the ChatSale investigation. Source of truth: Snowflake `ANALYTICS.WEBFLOW`
(Fivetran sync of the Mongo collections), cross-checked against the monolith's own counting logic in
`webflow/entrypoints/server/dataAccess/installations/getInstallationCountsByApp.ts`.

---

## 1. There is no single "install count" — pick a definition first

An app can be installed **per site** or **per workspace**. A workspace-level install makes the app
available on *every* site in that workspace, including sites created later. So four defensible
numbers exist for the same app:

| # | Definition | Where it comes from | Use it when |
|---|------------|--------------------|-------------|
| A | **Direct site installs** — sites explicitly installed on | `INSTALLATIONS`, `target_type='Site'`, not deleted | You want deliberate, per-project adoption |
| B | **Workspace installs** — workspaces installed at | `INSTALLATIONS`, `target_type='Workspace'`, not deleted | Account-level reach |
| C | **Product total (`totalSitesCount`)** — A + every site currently in the B workspaces | Monolith `getInstallationCountsByApp`; reproduce with `DIM_SITE` | You need the number Webflow itself reports to the developer (app analytics email) |
| D | **Warehouse report** — A + workspace sites *as they existed on install day* | `REPORT__APP_SITE_PAIRS` | You want the curated dbt model / dashboards to agree with you |

C > D almost always, because D freezes the workspace expansion at install time and never adds sites
created afterwards. Verified on ChatSale: workspaces with 3 sites today contribute 1 row to D.

Both C and D **drop uninstalls** (rows disappear from `INSTALLATIONS` and from the report), so neither
is a lifetime count. For lifetime, count all `INSTALLATIONS` rows including `_FIVETRAN_DELETED = true`,
or use `MARKETPLACE_RESOURCE_EVENTS` (`Install` / `Uninstall`).

---

## 2. Identity chain (Client ID → App ID)

The Client ID in the admin Edit App screen is the **OAuth** hex. Installs are keyed on the **Mongo App ID**.

```
CLIENT_ID (64-hex)
  ├─ ANALYTICS.WEBFLOW.APPS.CLIENT_ID              → APP_ID           (installs key: INSTALLATIONS.RESOURCE_ID)
  └─ ANALYTICS.WEBFLOW.OAUTH_APPLICATIONS.CLIENT_ID → APPLICATION_ID   (oauth key: OAUTH_SITE_MAP.APPLICATION_ID)
```

`APP_ID` and `APPLICATION_ID` are different ObjectIds created seconds apart. Never substitute one for
the other. See `.claude/rules` / memory `reference_webflow_app_id_vs_client_id`.

---

## 3. Tables

| Table | Grain | Notes |
|-------|-------|-------|
| `APPS` | one row per app | `APP_ID`, `CLIENT_ID`, `OWNER_WORKSPACE_ID` |
| `OAUTH_APPLICATIONS` | one row per OAuth app | `APPLICATION_ID`, `CLIENT_ID` |
| `INSTALLATIONS` | one row per install doc | `RESOURCE_ID`=app id, `RESOURCE_TYPE='App'`, `TARGET_TYPE` ∈ Site/Workspace/Branch, `_FIVETRAN_DELETED=true` ⇒ uninstalled |
| `REPORT__APP_SITE_PAIRS` | one row per (app, site) | `INSTALLATION_TYPE` ∈ `site level` / `workspace level`; `DATE_DAY` = day the pair appeared; rows removed on uninstall |
| `MARKETPLACE_RESOURCE_EVENTS` | one row per event | `EVENT_TYPE` ∈ Install / Uninstall / Listing View / Launch / Like. `SITE_ID` is null on Install rows |
| `OAUTH_SITE_MAP` / `OAUTH_WORKSPACE_MAP` | authorization → site/workspace | The OAuth grant, not the install. Legacy data-client apps only |
| `DIM_SITE` | daily snapshot per site | Filter `RECORD_DATE = max(RECORD_DATE)`. `WAS_DELETED`, `IS_ARCHIVED`, `IS_PUBLISHED` |

`INSTALLATIONS.STATUS` is inconsistent (`null` on older rows, `'installed'` on newer). **Do not filter on
STATUS** — filter on `_FIVETRAN_DELETED`.

---

## 4. The query

Run with the snow CLI (opens an Okta browser window per run — warn the operator):

```bash
uvx --from snowflake-cli snow sql -f app_installs.sql --temporary-connection \
  --account wn71398.us-east-1 --user <you>@webflow.com --authenticator externalbrowser \
  --database ANALYTICS --schema WEBFLOW --warehouse SNOWFLAKE_REPORTING --format json
```

```sql
set client_id = '<64-hex client id from the admin Edit App screen>';

-- 0. identity
select 'APPS' src, app_id id, name, owner_workspace_id ws, created_on::string created
from ANALYTICS.WEBFLOW.APPS where client_id = $client_id
union all
select 'OAUTH_APPLICATIONS', application_id, name, owner_workspace_id, created_on::string
from ANALYTICS.WEBFLOW.OAUTH_APPLICATIONS where client_id = $client_id;

-- then paste the APP_ID below
set app_id = '<24-char app id>';

-- A/B/C: direct installs, workspace installs, product-equivalent total
with latest as (select max(record_date) d from ANALYTICS.WEBFLOW.DIM_SITE),
     sites as (select s.* from ANALYTICS.WEBFLOW.DIM_SITE s, latest l where s.record_date = l.d),
     inst as (select target_type, target_id
              from ANALYTICS.WEBFLOW.INSTALLATIONS
              where resource_id = $app_id and resource_type = 'App'
                and not coalesce(_fivetran_deleted, false)),
     sl as (select distinct target_id site_id from inst where target_type = 'Site'),
     wl as (select distinct target_id workspace_id from inst where target_type = 'Workspace'),
     ws_sites as (select distinct s.site_id from sites s join wl w on s.workspace_id = w.workspace_id)
select (select count(*) from sl)                                              as a_direct_site_installs,
       (select count(*) from wl)                                              as b_workspace_installs,
       (select count(*) from ws_sites)                                        as sites_covered_by_workspace_installs,
       (select count(*) from (select site_id from sl union select site_id from ws_sites)) as c_product_total_sites,
       (select count(distinct target_id) from ANALYTICS.WEBFLOW.INSTALLATIONS
         where resource_id = $app_id and target_type = 'Site')                as ever_site_installs;

-- D: warehouse report model
select installation_type, count(distinct site_id) sites, count(distinct workspace_id) workspaces,
       min(date_day)::string first_day, max(date_day)::string last_day
from ANALYTICS.WEBFLOW.REPORT__APP_SITE_PAIRS where app_id = $app_id group by 1;

-- Lifetime events
select event_type, count(*) rows_, min(created_on)::string first_, max(created_on)::string last_
from ANALYTICS.WEBFLOW.MARKETPLACE_RESOURCE_EVENTS where resource_id = $app_id group by 1 order by 2 desc;

-- Churn by month (installs created vs since removed)
select to_char(date_trunc('month', created_on), 'YYYY-MM') month,
       count(*) installs_created,
       sum(iff(coalesce(_fivetran_deleted, false), 1, 0)) since_removed
from ANALYTICS.WEBFLOW.INSTALLATIONS
where resource_id = $app_id and target_type = 'Site' group by 1 order by 1;
```

---

## 5. Worked example — ChatSale (2026-08-18)

Client ID `6234195347344d6ebd0459777f614948406dd6f8749fd79a198c8137df5602b6`
→ App ID `67efa5a78271cdc433a929ec`, OAuth application `67efa5a78271cdc433a929de`,
owner workspace `67eb8440e1334d183eded0e0`, created 2025-04-04, MRP `APPROVED` / `PUBLIC`, type `data client`.

| Measure | Value |
|---------|-------|
| A — projects with a direct site install (active) | **76** |
| Sites ever site-installed (incl. removed) | 136 (60 since uninstalled) |
| B — workspaces with a workspace-level install (active) | **26** (30 ever) |
| Sites those workspaces contain today | 214 |
| C — product-equivalent `totalSitesCount` | **285** (164 if deleted + archived sites are excluded) |
| D — `REPORT__APP_SITE_PAIRS` | **148** sites / 95 workspaces (73 site-level + 75 workspace-level) |
| Lifetime `Install` events | 118 (`Uninstall` 28, `Listing View` 7,222, `Like` 1) |
| Legacy OAuth site grants | 33 sites / 19 workspaces, last 2025-11-26 |

Recommended phrasing: *"ChatSale is directly installed on 76 sites and installed workspace-wide at 26
workspaces; counting every site those workspaces contain, it reaches 285 projects. The warehouse's
app-site-pair model reports 148 because it freezes workspace expansion at install time."*

---

## 6. Gotchas

- **Don't equate Client ID and App ID.** Datadog only surfaces the Client ID; installs are keyed on App ID.
- **Don't filter `INSTALLATIONS.STATUS`.** Mixed `null` / `'installed'`; `_FIVETRAN_DELETED` is the real uninstall signal.
- **`REPORT__APP_SITE_PAIRS` is not cumulative and not live.** Uninstalled pairs vanish; new sites in an
  already-installed workspace never appear. It will always read lower than the product number.
- **`Install` events carry no `SITE_ID`** — you cannot derive per-site adoption from `MARKETPLACE_RESOURCE_EVENTS`.
- **`OAUTH_SITE_MAP` is the authorization, not the install.** For ChatSale it stops in Nov 2025 while
  installs continue — the table is globally fresh (max auth 2026-08-18), so a stale tail means the app
  changed install path, not that the pipeline broke.
- **`DIM_SITE` is a daily snapshot** — always pin `RECORD_DATE = max(RECORD_DATE)` or you multiply rows.
- Deleted/archived sites are still counted by the product's own total. State which treatment you used.
