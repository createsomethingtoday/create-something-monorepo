-- v2 (2026-09-29): enterprise + EU-residency usage of live public Marketplace apps.
-- Base: Aaron Resnick / Hex simplification using the governed PROD.CORE.DIM_WORKSPACE (current-state, IS_ENTERPRISE +
-- WORKSPACE_TIER) instead of the legacy ANALYTICS.WEBFLOW.DIM_WORKSPACE daily snapshot + hand-rolled enterprise flags.
-- Adds EU Data Residency columns from the same table (IS_EU_RESIDENCY_IN_SCOPE, EU_RESIDENCY_COUNTRY_CODE).
-- Definition delta vs v1: governed IS_ENTERPRISE = 1,576 workspaces (v1 broad 1,850 / strict 1,561). The ~284 dropped are
-- agency/growth workspaces that carry the legacy enterprise-billing bit (enterprise partners, not enterprise customers).
-- Live-app proxy unchanged: profile APPROVED+PUBLIC and >=1 Listing View in the last 30 days.
with ent_ws as (
  select workspace_id, workspace_tier, is_eu_residency_in_scope as eu_scope, eu_residency_country_code as cc
  from PROD.CORE.DIM_WORKSPACE
  where is_enterprise and not coalesce(is_deleted, false)
),
sites as (
  select site_id, workspace_id
  from ANALYTICS.WEBFLOW.DIM_SITE
  where record_date = (select max(record_date) from ANALYTICS.WEBFLOW.DIM_SITE)
    and not coalesce(was_deleted, false)
),
live_apps as (
  select a.app_id, a.client_id, a.name,
         case when contains(a.resources::string,'DESIGNER_EXTENSION')
                and contains(a.resources::string,'OAUTH_APPLICATION') then 'hybrid'
              when contains(a.resources::string,'DESIGNER_EXTENSION') then 'designer extension'
              when contains(a.resources::string,'OAUTH_APPLICATION') then 'data client'
              else 'unknown' end as app_type
  from ANALYTICS.WEBFLOW.APPS a
  where not coalesce(a._fivetran_deleted, false)
    and a.app_id in (select resource_id from ANALYTICS.WEBFLOW.MARKETPLACE_RESOURCE_PROFILES
                     where resource_type = 'INTEGRATION' and status = 'APPROVED' and visibility = 'PUBLIC')
    and a.app_id in (select resource_id from ANALYTICS.WEBFLOW.MARKETPLACE_RESOURCE_EVENTS
                     where event_type = 'Listing View' and created_on >= dateadd(day, -30, current_date))
),
installs as (
  select i.resource_id as app_id,
         coalesce(s.workspace_id, iff(i.target_type = 'Workspace', i.target_id, null)) as workspace_id
  from ANALYTICS.WEBFLOW.INSTALLATIONS i
  left join sites s on i.target_type = 'Site' and s.site_id = i.target_id
  where i.resource_type = 'App'
    and i.target_type in ('Site', 'Workspace')
    and not coalesce(i._fivetran_deleted, false)
)
select a.app_id, a.client_id, a.name, a.app_type,
       count(distinct e.workspace_id)                                              as ent_ws,
       count(distinct iff(e.eu_scope, e.workspace_id, null))                        as ent_ws_eu,
       count(distinct iff(e.eu_scope and e.cc = 'GB', e.workspace_id, null))        as eu_gb,
       count(distinct iff(e.eu_scope and e.cc = 'DE', e.workspace_id, null))        as eu_de,
       count(distinct iff(e.eu_scope and e.cc = 'FR', e.workspace_id, null))        as eu_fr,
       count(distinct iff(e.eu_scope and e.cc not in ('GB','DE','FR'), e.workspace_id, null)) as eu_other,
       count(distinct i.workspace_id)                                              as all_ws,
       round(100 * ent_ws / nullif(all_ws, 0), 1)                                  as ent_share_pct
from live_apps a
left join installs i on i.app_id = a.app_id
left join ent_ws e on e.workspace_id = i.workspace_id
group by 1, 2, 3, 4
order by ent_ws desc;
