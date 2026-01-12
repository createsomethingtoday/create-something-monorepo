# Analytics Data Update Schedule

## Overview

The Marketplace Analytics page (accessed via `/marketplace`) displays performance data that is **updated weekly**, not in real-time. This document clarifies how the data works and when it updates.

## Update Schedule

| Aspect | Details |
|--------|---------|
| **Data Source** | Webflow's external data pipeline (not this dashboard) |
| **Update Frequency** | Weekly |
| **Update Day** | Every Monday |
| **Update Time** | 16:00 UTC (4:00 PM UTC) |
| **Data Window** | Rolling 30-day period |
| **Next Update** | Automatically calculated and displayed in the UI |

## How It Works

### 1. Data Flow

```
Webflow Marketplace → Webflow Data Pipeline → Airtable → Dashboard API → UI
                      (Weekly on Mondays)
```

1. **Webflow's System**: Webflow's external data pipeline aggregates marketplace sales data
2. **Airtable Update**: The pipeline writes to two Airtable tables:
   - `LEADERBOARD` (tblcXLVLYobhNmrg6): Top 50 templates by sales
   - `CATEGORY_PERFORMANCE` (tblDU1oUiobNfMQP9): Category-level aggregations
3. **Dashboard Reads**: This dashboard fetches the data on-demand from Airtable
4. **Calculations**: The API calculates totals (e.g., `totalMarketplaceSales`) from the Airtable records

### 2. Rolling 30-Day Window

The "30-day window" means:
- If updated on **Monday, January 13, 2026**
- The data includes sales from **December 14, 2025 to January 13, 2026**
- The window "rolls forward" each week, not each day

### 3. Why Numbers Don't Change Daily

**Expected Behavior**: The sales numbers (e.g., 8,831) will remain **exactly the same** for the entire week between Monday updates.

This is **NOT a bug**. The data is:
- ✅ **Correct**: It's a weekly snapshot
- ✅ **Consistent**: Same source as Webflow's internal reporting
- ✅ **By Design**: Weekly updates reduce API load and ensure data consistency

## User-Facing Messaging

### Before Fix (Confusing)
```
"Data synced weekly (Mondays at 4 PM UTC) • Rolling 30-day window"
```
❌ **Problem**: Users expect daily changes due to "rolling window" language

### After Fix (Clear)
```
"Weekly marketplace snapshot with 30-day performance data"
"Last updated: 2 days ago • Next update: in 5 days"
"📊 Data refreshes weekly on Mondays at 4 PM UTC with a rolling 30-day sales window"
```
✅ **Solution**: Clarifies weekly cadence and shows next update

## API Endpoints

### `/api/analytics/leaderboard`
- Returns top 50 templates by sales (30-day window)
- Includes `lastUpdated` and `nextUpdateDate` timestamps
- Calculates `totalMarketplaceSales` by summing all template sales

### `/api/analytics/categories`
- Returns category performance metrics
- Includes total sales, average revenue, competition levels
- Same update schedule as leaderboard

## UI Components

### Marketplace Page (`/marketplace`)
- Shows prominent "Last updated" and "Next update" timestamps
- Displays "Weekly Snapshot" badge on the sales metric
- Includes explanatory note about weekly refresh schedule

### MarketplaceInsights Component
- Updated "Total Sales (30d)" card with "Weekly Snapshot" badge
- Added clarifying subtext: "across all categories"
- Maintains existing visualizations and interactions

## Troubleshooting

### Q: The sales number hasn't changed in 3 days. Is it broken?
**A**: No, this is expected. The data only updates on Mondays at 4 PM UTC.

### Q: Why use weekly updates instead of real-time?
**A**: 
1. Reduces load on Webflow's systems
2. Ensures data consistency and accuracy
3. Matches Webflow's internal reporting cadence
4. 30-day aggregations don't need minute-by-minute updates

### Q: Can I force a manual refresh?
**A**: No, the data source is controlled by Webflow's external pipeline, not this dashboard.

### Q: When will I see new data?
**A**: Check the "Next update" timestamp displayed prominently on the page.

## Implementation Details

### Next Update Calculation
```typescript
function getNextUpdateDate(): string {
  const now = new Date();
  const nextMonday = new Date(now);
  
  // Calculate days until next Monday
  const currentDay = now.getUTCDay();
  const daysUntilMonday = currentDay === 0 ? 1 : currentDay === 1 ? 7 : (8 - currentDay);
  
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(16, 0, 0, 0); // 4 PM UTC
  
  // If today is Monday and past 4 PM UTC, get next Monday
  if (currentDay === 1 && now.getUTCHours() >= 16) {
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  }
  
  return nextMonday.toISOString();
}
```

### Date Formatting
- **Last Updated**: Shows relative time ("2 days ago", "yesterday", "today")
- **Next Update**: Shows countdown ("in 5 days", "tomorrow", "today")
- Both fall back to absolute dates for clarity when appropriate

## Related Issues

**Original Issue**: User reported sales number stuck at 8,831 for several days
- **Root Cause**: Mismatch between "rolling window" messaging and weekly update reality
- **Solution**: Clarified UI messaging, added update timestamps, improved documentation
- **Status**: ✅ Resolved

## Changelog

### 2026-01-12
- Added "Last updated" and "Next update" timestamps to marketplace page
- Added "Weekly Snapshot" badge to sales metrics
- Improved explanatory text about update schedule
- Created this documentation file
- Updated API endpoint comments with explicit data update behavior
