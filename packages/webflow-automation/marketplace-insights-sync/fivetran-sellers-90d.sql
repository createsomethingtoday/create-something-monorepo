-- Marketplace Insights sellers (90d): SQL of the Fivetran dataset of that name.
-- The activation "Marketplace Insights sellers (90d) -> Airtable" upserts every
-- row into Airtable tblAlUQbYfyQZ81hK on TEMPLATE_ID; the weekly publish step
-- reads it (readSellers90FromAirtable). Keep this file and the dataset
-- identical. The dataset and activation IDs are in README.md.
--
-- It gives each snapshot a 90-day view of each subcategory. A window that is
-- missing or incomplete is left out of the snapshot and named in the receipt;
-- the 30-day snapshot is still published and the dashboard hides its 90-day switch.
--
-- Same rules as fivetran-sellers-30d.sql, with a 90-day window:
--  - Window: the 90 days ending at the latest Monday 16:00 UTC.
--  - One row per template with at least one delivered order in the window, so
--    it contains every 30-day seller. The snapshot build rejects a 90-day
--    source that does not.
--  - SALES_90D includes orders through creator fulfillment links, valued at
--    list price in REVENUE_90D. FULFILLMENT_SALES_90D is that part.
--  - The final WHERE emits no rows until the daily orders load covers the
--    whole window.

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
        count(*) as SALES_90D,
        coalesce(count_if(o.template_fulfillment_code_id is not null), 0) as FULFILLMENT_SALES_90D,
        round(sum(o.price_value), 2) as REVENUE_90D
    from analytics.webflow.marketplace_orders o
    join analytics.webflow.marketplace_products p
        on o.marketplace_product_id = p.document_id
    join analytics.webflow.templates t
        on p.resource_id = t.template_id
    cross join bounds b
    where p.resource_type = 'Template'
      and o.status = 'delivered'
      and convert_timezone('UTC', o.created_on)::timestamp_ntz >= dateadd(day, -90, b.window_end)
      and convert_timezone('UTC', o.created_on)::timestamp_ntz < b.window_end
    group by 1
)

select
    s.TEMPLATE_ID,
    s.SALES_90D,
    s.FULFILLMENT_SALES_90D,
    s.REVENUE_90D,
    to_varchar(b.window_end, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"') as SNAPSHOT_AT,
    count(*) over () as WINDOW_SELLERS_90D,
    sum(s.SALES_90D) over () as WINDOW_SALES_90D,
    round(sum(s.REVENUE_90D) over (), 2) as WINDOW_REVENUE_90D
from sellers s
cross join bounds b
cross join loaded l
where l.loaded_through >= b.window_end
