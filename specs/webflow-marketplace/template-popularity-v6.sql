-- Template Popularity V6
-- This version changes conversion quality from an immediate all-time ratio
-- to a matured-cohort ratio so new templates are not penalized before their
-- sites have had time to convert.
--
-- Model change:
-- 1. A site only enters the conversion denominator after N days.
-- 2. If a site converts before it matures, that conversion is credited on the
--    maturity day so numerator and denominator move together.
-- 3. Engagement and time decay are left intact so this remains a drop-in V6
--    replacement with a fairer conversion signal for new templates.

with params as (
    select
        to_date('2024-02-20') as reporting_start_date,
        60 as conversion_maturity_days,
        20::float as conversion_prior_weight,
        0.319949964963::float as conversion_prior_mean,
        0.1::float as conversion_quality_exponent,
        0.001925408835::float as daily_decay_rate
),

template_ids as (
    select
        t.template_id,
        t.template_name,
        t.cost_dollars,
        u.email as creator_email,
        date_trunc(day, t.ts_created_on) as template_created_date,
        datediff(day, date_trunc(day, t.ts_created_on), current_date) as days_since_created_current
    from analytics.webflow.templates t
    left join analytics.webflow.dim_workspace w
        on t.designer_workspace_id = w.workspace_id
    left join analytics.webflow.dim_user u
        on w.owner_user_id = u.user_id
    where t.is_marketplace = true
      and t.cost_dollars > 0
),

dates as (
    select
        d.date_day
    from analytics.webflow.util_dates d
    cross join params p
    where d.date_day >= p.reporting_start_date
),

template_days as (
    select
        d.date_day,
        datediff(day, t.template_created_date, d.date_day) as days_since_created,
        t.*
    from template_ids t
    cross join dates d
    where d.date_day >= t.template_created_date
),

view_events as (
    select
        t.template_id,
        date_trunc('day', e.tstamp) as event_day,
        count(distinct e.anonymous_id) as unique_viewers
    from analytics.webflow.event_template_viewed_selected_purchased e
    join template_ids t
        on e.template_name = t.template_name
    where e.event_name = 'template_marketplace_viewed'
      and e.page_source like '/templates/html/%'
    group by 1, 2
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

site_cohort_metrics as (
    select
        sc.site_id,
        sc.template_id,
        sc.site_created_day,
        fsp.first_conversion_date,
        dateadd(day, p.conversion_maturity_days, sc.site_created_day) as cohort_mature_day,
        case
            when fsp.first_conversion_date is null then null
            when fsp.first_conversion_date < dateadd(day, p.conversion_maturity_days, sc.site_created_day)
                then dateadd(day, p.conversion_maturity_days, sc.site_created_day)
            else fsp.first_conversion_date
        end as conversion_credit_day
    from site_cohorts sc
    cross join params p
    left join first_site_plans fsp
        on sc.site_id = fsp.site_id
),

daily_site_creations as (
    select
        template_id,
        site_created_day,
        count(distinct site_id) as sites_created_that_day
    from site_cohort_metrics
    group by 1, 2
),

daily_site_conversions as (
    select
        template_id,
        first_conversion_date,
        count(*) as sites_converted_that_day
    from site_cohort_metrics
    where first_conversion_date is not null
    group by 1, 2
),

daily_matured_site_cohorts as (
    select
        template_id,
        cohort_mature_day,
        count(*) as matured_sites_created_that_day
    from site_cohort_metrics
    group by 1, 2
),

daily_matured_conversions as (
    select
        template_id,
        conversion_credit_day,
        count(*) as matured_sites_converted_that_day
    from site_cohort_metrics
    where conversion_credit_day is not null
    group by 1, 2
),

purchase_events as (
    select
        s.template_id,
        s.date_day as purchase_date,
        sum(s.revenue) as revenue,
        count(s.revenue_id) as purchases_that_day
    from analytics.webflow.report__template_sales s
    where s.revenue > 0
    group by 1, 2
),

template_daily_stats as (
    select
        td.*,
        coalesce(ve.unique_viewers, 0) as views_that_day,
        coalesce(sc.sites_created_that_day, 0) as sites_created_that_day,
        coalesce(dc.sites_converted_that_day, 0) as sites_converted_that_day,
        coalesce(msc.matured_sites_created_that_day, 0) as matured_sites_created_that_day,
        coalesce(mdc.matured_sites_converted_that_day, 0) as matured_sites_converted_that_day,
        coalesce(p.purchases_that_day, 0) as purchases_that_day
    from template_days td
    left join view_events ve
        on td.template_id = ve.template_id
       and td.date_day = ve.event_day
    left join daily_site_creations sc
        on td.template_id = sc.template_id
       and td.date_day = sc.site_created_day
    left join daily_site_conversions dc
        on td.template_id = dc.template_id
       and td.date_day = dc.first_conversion_date
    left join daily_matured_site_cohorts msc
        on td.template_id = msc.template_id
       and td.date_day = msc.cohort_mature_day
    left join daily_matured_conversions mdc
        on td.template_id = mdc.template_id
       and td.date_day = mdc.conversion_credit_day
    left join purchase_events p
        on td.template_id = p.template_id
       and td.date_day = p.purchase_date
),

template_daily_cumulative as (
    select
        tds.*,
        sum(tds.views_that_day) over (partition by tds.template_id order by tds.date_day) as cumulative_views,
        sum(tds.purchases_that_day) over (partition by tds.template_id order by tds.date_day) as cumulative_purchases,
        sum(tds.sites_created_that_day) over (partition by tds.template_id order by tds.date_day) as cumulative_sites_created,
        sum(tds.sites_converted_that_day) over (partition by tds.template_id order by tds.date_day) as cumulative_sites_converted,
        sum(tds.matured_sites_created_that_day) over (partition by tds.template_id order by tds.date_day) as cumulative_matured_sites_created,
        sum(tds.matured_sites_converted_that_day) over (partition by tds.template_id order by tds.date_day) as cumulative_matured_sites_converted
    from template_daily_stats tds
),

template_daily_scores as (
    select
        tdc.*,
        case
            when tdc.cumulative_matured_sites_created = 0 then 0
            when tdc.cumulative_matured_sites_converted > tdc.cumulative_matured_sites_created then 0
            else tdc.cumulative_matured_sites_converted * 1.0 / tdc.cumulative_matured_sites_created
        end as matured_conversion_rate_that_day,
        ln(1 + (tdc.cumulative_sites_converted * 10) + (tdc.cumulative_purchases * 5) + tdc.cumulative_views) as engagement_score,
        ((tdc.cumulative_matured_sites_converted + (p.conversion_prior_weight * p.conversion_prior_mean)) * 1.0)
            / (tdc.cumulative_matured_sites_created + p.conversion_prior_weight) as conversion_quality_v6,
        exp(-1 * p.daily_decay_rate * tdc.days_since_created) as time_decay
    from template_daily_cumulative tdc
    cross join params p
),

template_daily_popularity as (
    select
        tds.*,
        power(tds.conversion_quality_v6, p.conversion_quality_exponent) as conversion_quality_v6_adjusted,
        round(
            tds.engagement_score
            * power(tds.conversion_quality_v6, p.conversion_quality_exponent)
            * tds.time_decay,
            2
        ) as popularity_score_v6_that_day
    from template_daily_scores tds
    cross join params p
)

select *
from template_daily_popularity
where date_day = dateadd(day, -1, current_date)
order by popularity_score_v6_that_day desc;
