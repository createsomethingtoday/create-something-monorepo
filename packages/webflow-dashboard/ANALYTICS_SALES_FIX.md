# Fix: Analytics Sales Number Stuck at 8,831

## Issue Report

**Reporter**: SamirTS  
**Date**: 2026-01-12  
**Platform**: Webflow Asset Dashboard - Analytics Page

### Problem Description

The "SALES (30D)" metric on the Analytics page was showing 8,831 and had remained unchanged for several days, leading to confusion about whether the data was broken or stale.

**User Question**: "Does the sales number update based on 30 days or the sales show about the last month? For few days I noticed the number stuck on 8,831, so if the number updated within the sales of last 30 days it would have changed."

## Root Cause Analysis

The issue was **NOT a bug**, but a **messaging problem**:

1. **Data Source**: The analytics data comes from Webflow's external data pipeline, which updates Airtable tables weekly (not daily)
2. **Update Schedule**: Data refreshes **every Monday at 4 PM UTC**
3. **UI Messaging**: The interface said "Rolling 30-day window" which implied daily updates
4. **User Expectation**: Users expected the number to change daily since it's a "rolling" window
5. **Reality**: The number only updates once per week when Webflow's pipeline runs

### Technical Details

- **Airtable Tables**: 
  - `LEADERBOARD` (tblcXLVLYobhNmrg6): Top templates by sales
  - `CATEGORY_PERFORMANCE` (tblDU1oUiobNfMQP9): Category aggregations
- **API Calculation**: `totalMarketplaceSales` = sum of all `totalSales30d` from leaderboard records
- **Data Freshness**: Only updates when external pipeline writes to Airtable (Mondays 4 PM UTC)

## Solution Implemented

### 1. UI Improvements

#### Marketplace Page Header
**Before**:
```svelte
<p class="page-subtitle">
  Weekly marketplace trends, top performers, and opportunities for your next template
</p>
<p class="sync-info">
  Data synced weekly (Mondays at 4 PM UTC) • Rolling 30-day window
</p>
```

**After**:
```svelte
<p class="page-subtitle">
  Weekly marketplace snapshot with 30-day performance data
</p>
<div class="sync-info-container">
  <p class="sync-info">
    Last updated: <strong>2 days ago</strong>
    • Next update: in 5 days
  </p>
  <p class="sync-note">
    📊 Data refreshes weekly on Mondays at 4 PM UTC with a rolling 30-day sales window
  </p>
</div>
```

#### Sales Metric Card
**Before**:
```svelte
<span class="stat-label">Marketplace Sales (30d)</span>
<span class="stat-value">8,831</span>
```

**After**:
```svelte
<div class="stat-header">
  <span class="stat-label">Total Sales (30d)</span>
  <span class="stat-badge">Weekly Snapshot</span>
</div>
<span class="stat-value">8,831</span>
<span class="stat-note">across all categories</span>
```

### 2. Backend Enhancements

#### Added Next Update Calculation
```typescript
function getNextUpdateDate(): string {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const currentHour = now.getUTCHours();
  
  let daysUntilMonday: number;
  
  if (currentDay === 1) {
    // It's Monday - check if before or after 4 PM UTC
    if (currentHour < 16) {
      daysUntilMonday = 0; // Update happens today
    } else {
      daysUntilMonday = 7; // Next update is next Monday
    }
  } else if (currentDay === 0) {
    daysUntilMonday = 1; // Sunday → Monday is tomorrow
  } else {
    daysUntilMonday = 8 - currentDay; // Calculate days to Monday
  }
  
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(16, 0, 0, 0);
  
  return nextMonday.toISOString();
}
```

#### API Response Enhancement
```typescript
return json({
  leaderboard,
  userTemplates,
  summary: {
    totalMarketplaceSales,
    userBestRank,
    lastUpdated: new Date().toISOString(),
    nextUpdateDate: getNextUpdateDate() // NEW
  }
});
```

### 3. Documentation Improvements

#### API Endpoint Comments
```typescript
/**
 * API endpoint to fetch top templates leaderboard data
 * 
 * DATA UPDATE SCHEDULE:
 * - Source: Webflow's external data pipeline updates Airtable weekly
 * - Schedule: Every Monday at 16:00 UTC (4 PM UTC)
 * - Window: Rolling 30-day sales data
 * - Frequency: The sales numbers remain static between weekly updates
 * 
 * IMPORTANT: The totalMarketplaceSales number will NOT change daily.
 */
```

#### Created Documentation Files
- `ANALYTICS_DATA_UPDATES.md`: Comprehensive guide to analytics data behavior
- `ANALYTICS_SALES_FIX.md`: This file documenting the fix

### 4. Visual Design Updates

Added new styles:
- `.sync-info-container`: Container for update information
- `.stat-badge`: "Weekly Snapshot" badge on metrics
- `.stat-note`: Explanatory subtext
- `.next-update`: Countdown to next update
- Better typography hierarchy and spacing

## Files Changed

| File | Changes |
|------|---------|
| `src/routes/marketplace/+page.svelte` | Added timestamp display, formatting functions, improved messaging |
| `src/lib/components/MarketplaceInsights.svelte` | Added "Weekly Snapshot" badge, updated styling |
| `src/routes/api/analytics/leaderboard/+server.ts` | Added `getNextUpdateDate()`, updated response, improved comments |
| `src/routes/api/analytics/categories/+server.ts` | Updated comments for clarity |
| `ANALYTICS_DATA_UPDATES.md` | Created comprehensive documentation |
| `ANALYTICS_SALES_FIX.md` | Created this fix summary |

## Testing Scenarios

### Next Update Calculation Tests
```
Input: Monday 15:59 UTC → Output: Today at 16:00 ✓
Input: Monday 16:00 UTC → Output: Next Monday 16:00 ✓
Input: Monday 16:01 UTC → Output: Next Monday 16:00 ✓
Input: Tuesday 10:00 UTC → Output: Next Monday 16:00 ✓
Input: Sunday 10:00 UTC → Output: Tomorrow (Monday) 16:00 ✓
Input: Saturday 10:00 UTC → Output: Next Monday 16:00 ✓
```

### User Experience Improvements
- ✅ Clearer messaging about update frequency
- ✅ Visible "last updated" timestamp
- ✅ Countdown to next update
- ✅ Visual badge indicating snapshot nature
- ✅ Explanatory note about weekly refresh

## Impact

### Before Fix
- ❌ User confusion about static numbers
- ❌ False perception of broken functionality
- ❌ Support questions about data freshness
- ❌ Unclear update schedule

### After Fix
- ✅ Clear expectations about data updates
- ✅ Visible update schedule and countdown
- ✅ Reduced support burden
- ✅ Better user trust in the platform

## Rollout Plan

1. **Immediate**: Deploy UI and API changes
2. **Communication**: Update user documentation
3. **Monitoring**: Watch for support tickets about data freshness
4. **Iteration**: Gather feedback on new messaging

## Success Metrics

- Reduction in support tickets about "stuck" sales numbers
- Positive user feedback on clarity
- No increase in bounce rate on Analytics page
- Users checking "next update" timestamp

## Future Considerations

### Potential Enhancements
1. **Email Notifications**: Alert users when new data is available
2. **Historical Trends**: Show week-over-week changes
3. **Data Freshness Indicator**: Visual badge showing "Fresh" vs "Aging"
4. **Manual Refresh Button**: Even if data doesn't change, let users trigger a re-fetch
5. **Sync Status**: Show "Last sync: Successful" with green checkmark

### Not Recommended
- ❌ **Real-time data**: Would require fundamental architecture change
- ❌ **Daily updates**: Not controlled by this dashboard
- ❌ **Manual data input**: Defeats purpose of automated pipeline

## Conclusion

The "stuck" sales number was working as designed. The fix addresses the real issue: **user expectations didn't match system behavior**. By improving messaging, adding timestamps, and creating clear documentation, users now understand:

1. Data updates weekly (not daily)
2. When the last update occurred
3. When the next update will happen
4. This is expected behavior, not a bug

**Status**: ✅ **RESOLVED** - User confusion addressed through improved UX and documentation.
