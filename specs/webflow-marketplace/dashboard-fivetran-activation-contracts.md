# Webflow Dashboard Fivetran Activation Contracts

This contract documents the Snowflake-to-Airtable activation sources that feed Marketplace Insights in the Webflow asset dashboard.

## Destination Tables

- Airtable base: Marketplace assets base configured by `AIRTABLE_BASE_ID`.
- Assets table: `👛Assets` (`tblRwzpWoLgE9MrUm`)
- 30-day leaderboard table: `Top Templates by Sales / 30 Days` (`tblcXLVLYobhNmrg6`)
- 30-day category table: `Template Category/Subcategory Performance / 30 days` (`tblDU1oUiobNfMQP9`)

## Required Airtable Fields

Assets table:

- Fivetran key: `👀ℹ️MRP ID (Override)`
- Metrics: `📋 Unique Viewers`, `📋 Cumulative Purchases`, `📋 Cumulative Revenue`
- Creator-visible 30-day sales field: `✅Qualified Sales 30d (🏗️ only)`
- Source freshness: `SYNCED_AT`

Leaderboard table:

- `TEMPLATE_NAME`
- `CATEGORY`
- `CREATOR_EMAIL`
- `TOTAL_SALES_30D`
- `TOTAL_REVENUE_30D`
- `AVG_REVENUE_PER_SALE`
- `SALES_RANK`
- `REVENUE_RANK`
- `SNAPSHOT_AT`

Category performance table:

- `CATEGORY`
- `SUBCATEGORY`
- `TEMPLATES_IN_SUBCATEGORY`
- `TOTAL_SALES_30D`
- `TOTAL_REVENUE_30D`
- `AVG_REVENUE_PER_TEMPLATE`
- `REVENUE_RANK`
- `SNAPSHOT_AT`

## Key Rules

`👀ℹ️MRP ID (Override)` is the Fivetran update key for Assets. It must be unique across nonempty rows before running the activation sync. If a historical, archived, rejected, delisted, or otherwise noncanonical asset shares a key with the current asset row, clear the override from the noncanonical row before running Fivetran.

The dashboard must not display an all-marketplace sales total from the leaderboard table unless it is explicitly labeled as a top-50 fallback. The all-category total is owned by the category performance table.

Every activation query should emit a source timestamp (`SNAPSHOT_AT` or `SYNCED_AT`). The dashboard parser treats these as source freshness fields and will prefer them over schedule estimates. Emit timestamps as UTC ISO-8601 text, not raw Snowflake `current_timestamp()` values, because Airtable/Fivetran rejects Snowflake's default timestamp display format.

## Cumulative Stats Per Template

This query feeds the Assets table. The key is `TEMPLATE_ID`, mapped to `👀ℹ️MRP ID (Override)`.

```sql
-- cumulative_stats_per_template
-- Pulls cumulative stats per paid marketplace template for creator dashboards.
-- Creator revenue: 95% payout for sales on or after 2025-11-01, 80% before.

with template_ids as (
    select
        template_id,
        template_name,
        cost_dollars,
        external_marketplace_url,
        u.email as creator_email,
        date_trunc(day, t.ts_created_on) as template_created_date,
        datediff(day, template_created_date, current_date) as days_since_created_current
    from analytics.webflow.templates t
    left join analytics.webflow.dim_workspace w
        on t.designer_workspace_id = w.workspace_id
    left join analytics.webflow.dim_user u
        on w.owner_user_id = u.user_id
    where is_marketplace = true
      and t.cost_dollars > 0
),

normalized_events as (
    select
        anonymous_id,
        template_name,
        page_source,
        lower(rtrim(
            regexp_replace(
                replace(replace(page_source, '%2F', '/'), '%2f', '/'),
                '^/+',
                '/'
            ),
            '/'
        )) as normalized_path
    from analytics.webflow.event_template_viewed_selected_purchased
    where event_name = 'template_marketplace_viewed'
),

path_matched_viewers as (
    select
        t.template_id,
        e.anonymous_id
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
        e.anonymous_id
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

cumulative_viewers as (
    select template_id, count(distinct anonymous_id) as unique_viewers
    from (
        select template_id, anonymous_id from path_matched_viewers
        union all
        select template_id, anonymous_id from name_matched_viewers
    )
    group by 1
),

cumulative_purchases as (
    select
        s.template_id,
        sum(
            case
                when s.date_day < '2025-11-01' then s.revenue * 0.8
                else s.revenue * 0.95
            end
        ) as cumulative_revenue,
        count(s.revenue_id) as cumulative_purchases
    from analytics.webflow.report__template_sales s
    where s.revenue > 0
    group by 1
)

select
    t.template_id as template_id,
    t.template_name as template_name,
    t.creator_email as creator_email,
    coalesce(v.unique_viewers, 0) as unique_viewers,
    coalesce(p.cumulative_revenue, 0) as cumulative_revenue,
    coalesce(p.cumulative_purchases, 0) as cumulative_purchases,
    to_varchar(
        convert_timezone('UTC', current_timestamp())::timestamp_ntz,
        'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ) as synced_at
from template_ids t
left join cumulative_viewers v
    on t.template_id = v.template_id
left join cumulative_purchases p
    on t.template_id = p.template_id;
```

## Top Templates By Sales, 30 Days

This query feeds `Top Templates by Sales / 30 Days`.

```sql
-- Top Templates by Sales / 30 Days
-- Creator revenue: 95% payout for sales on or after 2025-11-01, 80% before.

with recent_sales as (
    select
        t.template_id,
        t.template_name,
        t.external_category,
        p.owner_id as creator_workspace_id,
        o.created_on as sale_created_at,
        case
            when o.created_on < '2025-11-01' then o.price_value * 0.8
            else o.price_value * 0.95
        end as creator_revenue,
        to_varchar(
            convert_timezone('UTC', current_timestamp())::timestamp_ntz,
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
        ) as snapshot_at
    from analytics.webflow.marketplace_orders o
    join analytics.webflow.marketplace_products p
        on p.document_id = o.marketplace_product_id
    join analytics.webflow.templates t
        on p.resource_id = t.template_id
    where o.status = 'delivered'
      and o.created_on >= dateadd(day, -30, current_date)

    union all

    select
        t.template_id,
        s.template_name,
        t.external_category,
        t.designer_workspace_id as creator_workspace_id,
        s.date_day as sale_created_at,
        case
            when s.date_day < '2025-11-01' then s.revenue * 0.8
            else s.revenue * 0.95
        end as creator_revenue,
        to_varchar(
            convert_timezone('UTC', current_timestamp())::timestamp_ntz,
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
        ) as snapshot_at
    from analytics.webflow.report__template_sales s
    join analytics.webflow.templates t
        on s.template_id = t.template_id
    where s.revenue > 0
      and s.date_day >= dateadd(day, -30, current_date)
)

select
    rs.template_name as template_name,
    rs.external_category as category,
    u.email as creator_email,
    count(*) as total_sales_30d,
    sum(rs.creator_revenue) as total_revenue_30d,
    avg(rs.creator_revenue) as avg_revenue_per_sale,
    rank() over (order by count(*) desc) as sales_rank,
    rank() over (order by sum(rs.creator_revenue) desc) as revenue_rank,
    max(rs.snapshot_at) as snapshot_at
from recent_sales rs
join analytics.webflow.dim_workspace w
    on rs.creator_workspace_id = w.workspace_id
join analytics.webflow.dim_users u
    on w.owner_user_id = u.user_id
group by 1, 2, 3
order by total_sales_30d desc
limit 50;
```

## Category Performance, 30 Days

This query feeds `Template Category/Subcategory Performance / 30 days` and owns the all-marketplace total sales number displayed by Marketplace Insights.

The destination schema is verified, but the source column that produces `SUBCATEGORY` is not represented in this repository. Keep the existing production source expression for `SUBCATEGORY`; apply the same commission and timestamp rules below.

```sql
-- Template Category/Subcategory Performance / 30 days
-- Preserve the existing production source expression for SUBCATEGORY.
-- Creator revenue: 95% payout for sales on or after 2025-11-01, 80% before.

with recent_category_sales as (
    select
        t.template_id,
        t.external_category as category,
        /* existing production expression */ as subcategory,
        p.owner_id as creator_workspace_id,
        o.created_on as sale_created_at,
        case
            when o.created_on < '2025-11-01' then o.price_value * 0.8
            else o.price_value * 0.95
        end as creator_revenue,
        to_varchar(
            convert_timezone('UTC', current_timestamp())::timestamp_ntz,
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
        ) as snapshot_at
    from analytics.webflow.marketplace_orders o
    join analytics.webflow.marketplace_products p
        on p.document_id = o.marketplace_product_id
    join analytics.webflow.templates t
        on p.resource_id = t.template_id
    where o.status = 'delivered'
      and o.created_on >= dateadd(day, -30, current_date)

    union all

    select
        t.template_id,
        t.external_category as category,
        /* existing production expression */ as subcategory,
        t.designer_workspace_id as creator_workspace_id,
        s.date_day as sale_created_at,
        case
            when s.date_day < '2025-11-01' then s.revenue * 0.8
            else s.revenue * 0.95
        end as creator_revenue,
        to_varchar(
            convert_timezone('UTC', current_timestamp())::timestamp_ntz,
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
        ) as snapshot_at
    from analytics.webflow.report__template_sales s
    join analytics.webflow.templates t
        on s.template_id = t.template_id
    where s.revenue > 0
      and s.date_day >= dateadd(day, -30, current_date)
)

select
    category,
    subcategory,
    count(distinct template_id) as templates_in_subcategory,
    count(*) as total_sales_30d,
    sum(creator_revenue) as total_revenue_30d,
    sum(creator_revenue) / nullif(count(distinct template_id), 0) as avg_revenue_per_template,
    rank() over (order by sum(creator_revenue) desc) as revenue_rank,
    max(snapshot_at) as snapshot_at
from recent_category_sales
where category is not null
  and subcategory is not null
group by 1, 2
order by revenue_rank asc;
```

## Pre-Run Validation

Before running either Fivetran activation sync that updates Assets by `👀ℹ️MRP ID (Override)`, run:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm --filter @create-something/webflow-dashboard-core repair:fivetran-mrp-overrides
```

Proceed only if `repairableGroupCount` is `0`. If `ambiguousGroupCount` is nonzero, resolve the active/current duplicates manually before treating the sync keyspace as fully clean.
