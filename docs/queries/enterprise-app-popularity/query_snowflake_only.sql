-- Enterprise-workspace popularity of live public Marketplace apps — SELF-CONTAINED Snowflake version.
-- No Admin snapshot needed. Live-app proxy = profile APPROVED+PUBLIC AND >=1 Marketplace "Listing View" event
-- in the last 30 days. Measured 2026-09-29 against the Admin snapshot: 415 apps vs 401 admin-live, 397 overlap;
-- top 28 identical. Known misses: Semflow SEO (52 ent ws) and HubSpot v2 beta (36) are private in Admin but still
-- receive listing views via direct links, so they appear here; Adaptify SEO (6 ent ws) is live but the warehouse
-- profile row says PRIVATE, so it is dropped. ~50 profile rows froze on 2025-10-08 (Fivetran/dbt staleness).
with lw as (select max(record_date) d from ANALYTICS.WEBFLOW.DIM_WORKSPACE),
ls as (select max(record_date) d from ANALYTICS.WEBFLOW.DIM_SITE),
ws as (
  select workspace_id,
         (coalesce(is_enterprise,false) or coalesce(is_enterprise_pro,false) or coalesce(is_enterprise_billing,false)
          or coalesce(has_enterprise_billing_enabled,false) or plan_object_tier like 'workspace-enterprise%'
          or plan_object_tier in ('workspace_plan_scale','team_account_plan')) as ent_broad,
         (coalesce(is_enterprise_billing,false) or plan_object_tier like 'workspace-enterprise%') as ent_strict
  from ANALYTICS.WEBFLOW.DIM_WORKSPACE w, lw where w.record_date = lw.d and not coalesce(is_deleted,false)
),
sites as (select site_id, workspace_id from ANALYTICS.WEBFLOW.DIM_SITE s, ls where s.record_date = ls.d and not coalesce(was_deleted,false)),
mp as (
  select resource_id app_id from ANALYTICS.WEBFLOW.MARKETPLACE_RESOURCE_PROFILES
  where resource_type='INTEGRATION' and status='APPROVED' and visibility='PUBLIC'
),
lv as (
  select resource_id app_id from ANALYTICS.WEBFLOW.MARKETPLACE_RESOURCE_EVENTS
  where event_type='Listing View' and created_on >= dateadd(day,-30,current_date) group by 1
),
apps as (
  select a.app_id, a.name, a.client_id,
         case when contains(a.resources::string,'DESIGNER_EXTENSION') and contains(a.resources::string,'OAUTH_APPLICATION') then 'hybrid'
              when contains(a.resources::string,'DESIGNER_EXTENSION') then 'designer extension'
              when contains(a.resources::string,'OAUTH_APPLICATION') then 'data client' else 'unknown' end app_type
  from ANALYTICS.WEBFLOW.APPS a join mp on mp.app_id = a.app_id join lv on lv.app_id = a.app_id
  where not coalesce(a._fivetran_deleted,false)
),
inst as (
  select i.resource_id app_id, i.target_type,
         case when i.target_type='Workspace' then i.target_id else s.workspace_id end workspace_id,
         case when i.target_type='Site' then i.target_id end site_id
  from ANALYTICS.WEBFLOW.INSTALLATIONS i
  left join sites s on i.target_type='Site' and s.site_id = i.target_id
  where i.resource_type='App' and not coalesce(i._fivetran_deleted,false) and i.target_type in ('Site','Workspace')
),
j as (select inst.*, w.ent_broad, w.ent_strict from inst join ws w on w.workspace_id = inst.workspace_id)
select a.app_id, a.client_id, a.name, a.app_type,
       count(distinct iff(ent_broad, workspace_id, null)) ent_ws,
       count(distinct iff(ent_strict, workspace_id, null)) ent_ws_strict,
       count(distinct iff(ent_broad and target_type='Workspace', workspace_id, null)) ent_ws_level_installs,
       count(distinct iff(ent_broad and target_type='Site', site_id, null)) ent_direct_site_installs,
       count(distinct workspace_id) all_ws,
       round(100.0*count(distinct iff(ent_broad, workspace_id, null))/nullif(count(distinct workspace_id),0),1) ent_share_pct
from apps a left join j on j.app_id = a.app_id
group by 1,2,3,4 order by ent_ws desc;
