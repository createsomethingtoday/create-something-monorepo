-- Enterprise-workspace popularity of public Marketplace apps (live install state), run 2026-09-29
-- Enterprise (broad) = is_enterprise OR is_enterprise_pro OR is_enterprise_billing OR has_enterprise_billing_enabled
--                      OR plan_object_tier LIKE 'workspace-enterprise%' OR plan_object_tier IN ('workspace_plan_scale','team_account_plan')
-- Enterprise (strict) = is_enterprise_billing OR plan_object_tier LIKE 'workspace-enterprise%'
-- A workspace "uses" an app if it has a workspace-level install OR any non-deleted site in it has a site-level install.
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
pub as (
  select resource_id app_id, name from ANALYTICS.WEBFLOW.MARKETPLACE_RESOURCE_PROFILES
  where resource_type='INTEGRATION' and status='APPROVED' and visibility='PUBLIC'
  qualify row_number() over (partition by resource_id order by name) = 1
),
atype as (select app_id, app_type from ANALYTICS.WEBFLOW.REPORT__APP_SITE_PAIRS qualify row_number() over (partition by app_id order by date_day desc) = 1),
inst as (
  select i.resource_id app_id, i.target_type,
         case when i.target_type='Workspace' then i.target_id else s.workspace_id end workspace_id,
         case when i.target_type='Site' then i.target_id end site_id
  from ANALYTICS.WEBFLOW.INSTALLATIONS i
  left join sites s on i.target_type='Site' and s.site_id = i.target_id
  where i.resource_type='App' and not coalesce(i._fivetran_deleted,false) and i.target_type in ('Site','Workspace')
),
j as (select inst.*, w.ent_broad, w.ent_strict from inst join ws w on w.workspace_id = inst.workspace_id)
select p.app_id, p.name, a.app_type,
       count(distinct iff(ent_broad, workspace_id, null)) ent_ws,
       count(distinct iff(ent_strict, workspace_id, null)) ent_ws_strict,
       count(distinct iff(ent_broad and target_type='Workspace', workspace_id, null)) ent_ws_level_installs,
       count(distinct iff(ent_broad and target_type='Site', site_id, null)) ent_direct_site_installs,
       count(distinct workspace_id) all_ws,
       round(100.0*count(distinct iff(ent_broad, workspace_id, null))/nullif(count(distinct workspace_id),0),1) ent_share_pct
from j join pub p on p.app_id = j.app_id left join atype a on a.app_id = j.app_id
group by 1,2,3 order by ent_ws desc;
