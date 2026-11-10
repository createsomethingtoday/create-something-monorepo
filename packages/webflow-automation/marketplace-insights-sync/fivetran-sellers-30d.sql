-- Marketplace Insights sellers (30d): SQL of Fivetran dataset 149094.
-- Activation 3666218 upserts every row into Airtable tblkyKZ5nGOcEqb5r on
-- TEMPLATE_ID; sync.mjs --source airtable reads it. Keep this file and the
-- dataset identical, and keep the query in step with querySnowflake() in sync.mjs.
--
-- Window: the 30 days ending at the latest Monday 16:00 UTC. The activation runs
-- Tuesday 07:05 UTC, after the daily MARKETPLACE_ORDERS load. The final WHERE
-- emits no rows until that load covers the whole window, so a run before it
-- leaves the window unwritten and sync.mjs fails loudly instead of publishing a
-- short week (a Monday 16:05 UTC run missed the window's final hours of orders).
--
-- SALES_30D includes orders through creator fulfillment links (the buyer paid
-- the creator off-platform), valued at list price in REVENUE_30D.
-- FULFILLMENT_SALES_30D is that part of SALES_30D.

with now_utc as (
    select convert_timezone('UTC', current_timestamp())::timestamp_ntz as ts
),

bounds as (
    -- Latest Monday 16:00 UTC at or before now (ISO weekday: Monday = 1).
    select dateadd(
        hour, 16,
        dateadd(day, 1 - dayofweekiso(dateadd(hour, -16, ts)::date), dateadd(hour, -16, ts)::date)::timestamp_ntz
    ) as window_end
    from now_utc
),

loaded as (
    select convert_timezone('UTC', max(created_on))::timestamp_ntz as loaded_through
    from analytics.webflow.marketplace_orders
),

sellers as (
    select
        t.template_id as TEMPLATE_ID,
        p.document_id as MRP_ID,
        t.template_name as TEMPLATE_NAME,
        count(*) as SALES_30D,
        count_if(o.template_fulfillment_code_id is not null) as FULFILLMENT_SALES_30D,
        round(sum(o.price_value), 2) as REVENUE_30D
    from analytics.webflow.marketplace_orders o
    join analytics.webflow.marketplace_products p
        on o.marketplace_product_id = p.document_id
    join analytics.webflow.templates t
        on p.resource_id = t.template_id
    cross join bounds b
    where p.resource_type = 'Template'
      and o.status = 'delivered'
      and convert_timezone('UTC', o.created_on)::timestamp_ntz >= dateadd(day, -30, b.window_end)
      and convert_timezone('UTC', o.created_on)::timestamp_ntz < b.window_end
    group by 1, 2, 3
)

select
    s.TEMPLATE_ID,
    s.MRP_ID,
    s.TEMPLATE_NAME,
    s.SALES_30D,
    s.FULFILLMENT_SALES_30D,
    s.REVENUE_30D,
    to_varchar(b.window_end, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') as SNAPSHOT_AT,
    count(*) over () as WINDOW_SELLERS,
    sum(s.SALES_30D) over () as WINDOW_SALES,
    round(sum(s.REVENUE_30D) over (), 2) as WINDOW_REVENUE
from sellers s
cross join bounds b
cross join loaded l
where l.loaded_through >= b.window_end
