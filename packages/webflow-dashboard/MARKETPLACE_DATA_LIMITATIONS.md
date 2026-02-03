# Marketplace Insights Data Limitations

## Overview

The Marketplace Insights page displays analytics data sourced from Webflow's internal data pipeline. This document clarifies what the data represents and known limitations that may cause apparent discrepancies.

## Key Understanding: Active Sellers vs Total Inventory

**The data shows templates with recent sales activity, not the total marketplace inventory.**

| What Users May Expect | What Data Actually Shows |
|-----------------------|-------------------------|
| Total templates in marketplace (~7,000+) | Templates with sales in the 30-day window (~2,000-3,000) |
| All templates in a category | Templates in that category with recent sales |
| Template count = marketplace listing count | Template count = active seller count |

## Why the Numbers Differ

### 1. Rolling 30-Day Sales Window

The data pipeline filters to templates that had **at least one sale** in the rolling 30-day period. This means:

- A template listed for 2 years with no recent sales won't appear
- A new template with sales will appear immediately
- Seasonal templates may appear/disappear based on sales activity

**Example:**
- Webflow marketplace shows "20 templates" in Early Education category
- Dashboard shows "1 template" in Early Education category
- **Explanation:** Only 1 template in that category had sales in the last 30 days

### 2. Primary Category Attribution

Templates tagged with multiple categories are typically counted once (in their primary category), not multiple times across all tagged categories.

**Example:**
- A template tagged: "Business", "Agency", "Portfolio"
- On marketplace: Appears in all 3 category pages
- In analytics: Counted once, likely under "Business"

### 3. Data Source Hierarchy

```
Webflow Marketplace
       ↓
Webflow Internal Analytics Pipeline
       ↓
Airtable (LEADERBOARD + CATEGORY_PERFORMANCE tables)
       ↓
This Dashboard
```

We receive pre-aggregated data from Webflow's pipeline. We cannot:
- Change the filtering logic
- Access templates without sales
- Modify category attribution

## Specific Metrics Explained

### "Total Sales (30d)"

**What it shows:** Sum of sales across the top 50 templates in the leaderboard
**What it's NOT:** Total marketplace-wide sales (we don't have access to that)

### "Categories Tracked"

**What it shows:** Number of category/subcategory combinations with sales activity
**What it's NOT:** Total number of marketplace categories

### "Templates" Column (in Category Table)

**What it shows:** Templates in that subcategory with at least one sale in 30 days
**What it's NOT:** Total templates listed in that subcategory on the marketplace

### Competition Level

Based on active seller count, not total listing count:
- **Low**: < 10 active templates
- **Medium**: 10-29 active templates  
- **High**: 30-69 active templates
- **Very High**: 70+ active templates

Note: "Low competition" based on active sellers may still have many inactive listings.

## Frequently Asked Questions

### Q: Why does the marketplace show more templates than the dashboard?

**A:** The marketplace shows all listed templates. The dashboard shows only templates with recent sales activity. Many templates are listed but don't generate sales in any given 30-day period.

### Q: Is the dashboard data wrong?

**A:** No, the data is accurate for what it measures (sales performance). It's designed as a sales analytics tool, not an inventory counter.

### Q: Can you add total template counts?

**A:** Not without Webflow providing that data. The current pipeline only includes templates with sales activity.

### Q: Why use sales-filtered data?

**A:** For marketplace sellers, performance data is more actionable than inventory counts. Knowing "3 templates made sales" is more useful than knowing "500 templates are listed."

### Q: How do I find total templates in a category?

**A:** Visit the Webflow marketplace directly and check the category page. The template count shown there reflects total listings.

## Data Accuracy Assurances

Despite the filtering, the data that IS shown is accurate:

- ✅ Sales numbers are real 30-day sales
- ✅ Revenue calculations are accurate
- ✅ Rankings reflect actual performance
- ✅ Trends show real changes over time
- ✅ Your template data is complete (if it had sales)

## Requesting Changes

The data source is controlled by Webflow's internal systems. To request changes to what data is provided:

1. Contact Webflow Creator Support
2. Reference the "Creator Dashboard Analytics" data pipeline
3. Specify what additional data would be valuable

## Related Documentation

- [ANALYTICS_DATA_UPDATES.md](./ANALYTICS_DATA_UPDATES.md) - Update schedule and data freshness
- [ANALYTICS_FIX_SUMMARY.md](./ANALYTICS_FIX_SUMMARY.md) - Previous UX improvements

## Changelog

### 2026-01-29
- Created this documentation to address user confusion about data discrepancies
- Added "About this data" info banner to Marketplace Insights page
- Added tooltips clarifying "Active Templates" terminology
- Updated column headers to say "Active Templates" instead of "Templates"

---

**Bottom Line:** This dashboard shows *sales performance analytics* for the subset of templates generating revenue. It's a seller performance tool, not a marketplace inventory tool. The numbers are accurate for what they measure.
