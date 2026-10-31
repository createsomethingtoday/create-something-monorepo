-- Template Popularity V7
--
-- This query feeds the Assets table through Fivetran/Airtable.
-- Fivetran key: template_id -> "MRP ID (Override)".
-- Front-end popular sort: Airtable "Popularity Score" -> D1 popularity_score.
--
-- Model change from V6:
-- 1. Recent paid demand is the primary signal, using 90-day and 365-day purchase ranks.
-- 2. Lifetime demand remains available as a front-end tiebreaker, not the main score.
-- 3. Matured conversion quality stays Bayesian-smoothed so new templates are not punished
--    before their site cohorts have had time to convert.
-- 4. Stale, older templates with no recent purchases are explicitly downranked.

with params as (
    select
        60 as conversion_maturity_days,
        20::float as conversion_prior_weight,
        0.319949964963::float as conversion_prior_mean,
        0.1::float as conversion_quality_weight,
        0.25::float as recent_sites_weight,
        0.10::float as recent_views_weight,
        0.05::float as freshness_weight
),

template_ids as (
    select
        t.template_id,
        t.template_name,
        t.cost_dollars,
        t.external_category,
        t.external_marketplace_url,
        u.email as creator_email,
        date_trunc(day, t.ts_created_on)::date as template_created_date,
        datediff(day, date_trunc(day, t.ts_created_on), current_date) as days_since_created_current
    from analytics.webflow.templates t
    left join analytics.webflow.dim_workspace w
        on t.designer_workspace_id = w.workspace_id
    left join analytics.webflow.dim_user u
        on w.owner_user_id = u.user_id
    where t.is_marketplace = true
      and t.cost_dollars > 0
),

normalized_events as (
    select
        anonymous_id,
        template_name,
        lower(rtrim(
            regexp_replace(
                replace(replace(page_source, '%2F', '/'), '%2f', '/'),
                '^/+',
                '/'
            ),
            '/'
        )) as normalized_path,
        date_trunc('day', tstamp)::date as event_day
    from analytics.webflow.event_template_viewed_selected_purchased
    where event_name = 'template_marketplace_viewed'
),

path_matched_viewers as (
    select
        t.template_id,
        e.anonymous_id,
        e.event_day
    from template_ids t
    inner join normalized_events e
        on t.external_marketplace_url is not null
       and (
            e.normalized_path = lower(rtrim(replace(t.external_marketplace_url, 'https://webflow.com', ''), '/'))
            or e.normalized_path = lower(rtrim(replace(replace(t.external_marketplace_url, 'https://webflow.com', ''), '/templates/html/', '/html/'), '/'))
       )
),

name_matched_viewers as (
    select
        t.template_id,
        e.anonymous_id,
        e.event_day
    from template_ids t
    inner join normalized_events e
        on (
            e.normalized_path like '/templates/html/%'
            or e.normalized_path like '/html/%'
        )
       and (
            lower(trim(e.template_name)) = lower(trim(t.template_name))
            or lower(trim(e.template_name)) = lower(trim(regexp_replace(t.template_name, '^Template of ', '', 1, 1, 'i')))
            or lower(trim(e.template_name)) = lower(trim(regexp_replace(t.template_name, ' Template$', '', 1, 1, 'i')))
       )
),

viewer_metrics as (
    select
        template_id,
        count(distinct anonymous_id) as unique_viewers,
        count(distinct case when event_day >= dateadd(day, -90, current_date) then anonymous_id end) as unique_viewers_90d,
        count(distinct case when event_day >= dateadd(day, -365, current_date) then anonymous_id end) as unique_viewers_365d
    from (
        select template_id, anonymous_id, event_day from path_matched_viewers
        union all
        select template_id, anonymous_id, event_day from name_matched_viewers
    )
    group by 1
),

purchase_metrics as (
    select
        s.template_id,
        count(s.revenue_id) as cumulative_purchases,
        sum(s.revenue) as cumulative_revenue,
        count(case when s.date_day >= dateadd(day, -90, current_date) then s.revenue_id end) as purchases_90d,
        count(case when s.date_day >= dateadd(day, -365, current_date) then s.revenue_id end) as purchases_365d,
        sum(case when s.date_day >= dateadd(day, -90, current_date) then s.revenue else 0 end) as revenue_90d,
        sum(case when s.date_day >= dateadd(day, -365, current_date) then s.revenue else 0 end) as revenue_365d,
        max(s.date_day) as last_purchase_date
    from analytics.webflow.report__template_sales s
    where s.revenue > 0
    group by 1
),

site_cohorts as (
    select
        s.site_id,
        s.template_of as template_id,
        date(s.created_at) as site_created_day
    from analytics.webflow.dim_site s
    join template_ids t
        on s.template_of = t.template_id
    where s.is_not_orphaned_site
      and not s.was_deleted
      and not s.is_preview
),

first_site_plans as (
    select
        d.site_id,
        min(d.date_day) as first_conversion_date
    from analytics.webflow.report__plan_object_daily d
    where d.plan_object_type = 'site_plan'
      and d.is_active
    group by 1
),

site_metrics as (
    select
        sc.template_id,
        count(distinct sc.site_id) as cumulative_sites_created,
        count(distinct case when sc.site_created_day >= dateadd(day, -90, current_date) then sc.site_id end) as sites_created_90d,
        count(distinct case when sc.site_created_day >= dateadd(day, -365, current_date) then sc.site_id end) as sites_created_365d,
        count(distinct case when dateadd(day, p.conversion_maturity_days, sc.site_created_day) <= current_date then sc.site_id end) as cumulative_matured_sites_created,
        count(distinct case
            when fsp.first_conversion_date is not null
             and dateadd(day, p.conversion_maturity_days, sc.site_created_day) <= current_date
                then sc.site_id
        end) as cumulative_matured_sites_converted
    from site_cohorts sc
    cross join params p
    left join first_site_plans fsp
        on sc.site_id = fsp.site_id
    group by 1
),

template_metric_snapshot as (
    select
        t.template_id,
        t.template_name,
        t.creator_email,
        t.external_category,
        t.external_marketplace_url,
        t.template_created_date,
        t.days_since_created_current,
        coalesce(v.unique_viewers, 0) as unique_viewers,
        coalesce(v.unique_viewers_90d, 0) as unique_viewers_90d,
        coalesce(v.unique_viewers_365d, 0) as unique_viewers_365d,
        coalesce(pm.cumulative_purchases, 0) as cumulative_purchases,
        coalesce(pm.cumulative_revenue, 0) as cumulative_revenue,
        coalesce(pm.purchases_90d, 0) as purchases_90d,
        coalesce(pm.purchases_365d, 0) as purchases_365d,
        coalesce(pm.revenue_90d, 0) as revenue_90d,
        coalesce(pm.revenue_365d, 0) as revenue_365d,
        pm.last_purchase_date,
        datediff(day, pm.last_purchase_date, current_date) as days_since_last_purchase,
        coalesce(sm.cumulative_sites_created, 0) as cumulative_sites_created,
        coalesce(sm.sites_created_90d, 0) as sites_created_90d,
        coalesce(sm.sites_created_365d, 0) as sites_created_365d,
        coalesce(sm.cumulative_matured_sites_created, 0) as cumulative_matured_sites_created,
        coalesce(sm.cumulative_matured_sites_converted, 0) as cumulative_matured_sites_converted
    from template_ids t
    left join viewer_metrics v
        on t.template_id = v.template_id
    left join purchase_metrics pm
        on t.template_id = pm.template_id
    left join site_metrics sm
        on t.template_id = sm.template_id
),

template_scores as (
    select
        tms.*,
        case
            when tms.cumulative_matured_sites_created = 0 then 0
            when tms.cumulative_matured_sites_converted > tms.cumulative_matured_sites_created then 0
            else tms.cumulative_matured_sites_converted * 1.0 / tms.cumulative_matured_sites_created
        end as matured_conversion_rate,
        ((tms.cumulative_matured_sites_converted + (p.conversion_prior_weight * p.conversion_prior_mean)) * 1.0)
            / (tms.cumulative_matured_sites_created + p.conversion_prior_weight) as conversion_quality_v7,
        (
            0.70 * percent_rank() over (order by tms.purchases_90d)
            + 0.30 * percent_rank() over (order by tms.purchases_365d)
        ) as recent_demand_score,
        percent_rank() over (order by tms.sites_created_90d) as recent_sites_score,
        percent_rank() over (order by tms.unique_viewers_90d) as recent_viewer_score,
        exp(-1 * least(tms.days_since_created_current, 730) / 730.0) as freshness_score,
        case
            when tms.days_since_created_current >= 365
             and coalesce(tms.days_since_last_purchase, 9999) >= 365 then 0.25
            when tms.days_since_created_current >= 180
             and coalesce(tms.days_since_last_purchase, 9999) >= 180 then 0.50
            when tms.days_since_created_current >= 90
             and coalesce(tms.days_since_last_purchase, 9999) >= 90 then 0.75
            else 1.00
        end as dead_inventory_multiplier
    from template_metric_snapshot tms
    cross join params p
),

template_popularity as (
    select
        ts.*,
        round(
            100 * ts.dead_inventory_multiplier * (
                ts.recent_demand_score
                + (p.conversion_quality_weight * ts.conversion_quality_v7)
                + (p.recent_sites_weight * ts.recent_sites_score)
                + (p.recent_views_weight * ts.recent_viewer_score)
                + (p.freshness_weight * ts.freshness_score)
            ),
            2
        ) as popularity_score_v7_that_day
    from template_scores ts
    cross join params p
)

select
    template_id,
    template_name,
    creator_email,
    external_category,
    external_marketplace_url,
    template_created_date,
    days_since_created_current,
    unique_viewers,
    unique_viewers_90d,
    unique_viewers_365d,
    cumulative_purchases,
    cumulative_revenue,
    purchases_90d,
    purchases_365d,
    revenue_90d,
    revenue_365d,
    last_purchase_date,
    days_since_last_purchase,
    cumulative_sites_created,
    sites_created_90d,
    sites_created_365d,
    cumulative_matured_sites_created,
    cumulative_matured_sites_converted,
    matured_conversion_rate,
    conversion_quality_v7,
    recent_demand_score,
    recent_sites_score,
    recent_viewer_score,
    freshness_score,
    dead_inventory_multiplier,
    popularity_score_v7_that_day,
    popularity_score_v7_that_day as popularity_score,
    case
        when purchases_90d > 0 then 'recent_90d_sales'
        when purchases_365d > 0 then 'recent_365d_sales'
        when dead_inventory_multiplier < 1 then 'stale_inventory_downranked'
        else 'fresh_or_conversion_supported'
    end as popularity_score_reason,
    to_varchar(
        convert_timezone('UTC', current_timestamp())::timestamp_ntz,
        'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ) as synced_at
from template_popularity
order by popularity_score desc, cumulative_purchases desc, unique_viewers desc, template_created_date desc;
