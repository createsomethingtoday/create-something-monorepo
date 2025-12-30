# Phase 5: Demand Optimization Implementation

## Overview

Phase 5 adds autonomous demand optimization to Court Reserve through analytics, dynamic pricing suggestions, and proactive gap filling.

**Philosophy**: The infrastructure disappears; demand becomes visible, pricing adapts, courts get filled.

## Components Implemented

### 1. Database Schema (Migration 0004_analytics.sql)

Four new tables:

#### analytics_hourly
- Tracks utilization by day of week and hour (0-23)
- Aggregates last 30 days of booking data
- Identifies peak (>80% utilization) and off-peak (<30%) periods
- Unique constraint prevents duplicate calculations

#### analytics_court_popularity
- Weekly and monthly court-specific metrics
- Total bookings, revenue, avg duration per court
- Enables popularity-based recommendations

#### analytics_gaps
- Detects three gap types:
  - `prime_time_empty`: Peak hour with no bookings
  - `long_gap`: 3+ consecutive hours available
  - `isolated_available`: Available slot surrounded by booked slots
- Tracks notification status (0 = not notified, 1 = notified)

#### pricing_suggestions
- Dynamic pricing recommendations (require human approval)
- Peak hours: +50% suggested increase
- Off-peak hours: -25% suggested discount
- Confidence score based on data quality (more bookings = higher confidence)
- Status lifecycle: pending → approved/rejected/expired

#### gap_notifications
- Tracks proactive notifications sent to members
- Match score (0.0-1.0) based on booking history
- Conversion tracking: links notification to resulting booking

### 2. Analytics Library (`src/lib/analytics/index.ts`)

**Core Functions**:

- `aggregateHourlyUtilization(db, facilityId)`: Calculate 30-day utilization patterns
- `aggregateCourtPopularity(db, facilityId)`: Track weekly/monthly court stats
- `detectGaps(db, facilityId)`: Find empty slots in next 7 days
- `runAnalytics(db, facilityId)`: Full pipeline with peak/off-peak identification

**Key Calculations**:
- Total slots per hour = courts × (60 / slot_duration_minutes)
- Utilization rate = booked_slots / total_slots
- Peak threshold: 0.8 (80%), Off-peak: 0.3 (30%)

### 3. Dynamic Pricing (`src/lib/pricing/dynamic.ts`)

**Core Functions**:

- `generatePricingSuggestions(db, facilityId, config?)`: Create recommendations
- `approveSuggestion(db, suggestionId, reviewedBy)`: Approve pending suggestion
- `rejectSuggestion(db, suggestionId, reviewedBy)`: Reject suggestion
- `getPendingSuggestions(db, facilityId)`: List pending recommendations
- `expireOldSuggestions(db)`: Auto-expire suggestions older than 7 days

**Configuration Options**:
```typescript
{
  peakThreshold: 0.8,        // Utilization > 80% = peak
  offPeakThreshold: 0.3,     // Utilization < 30% = off-peak
  peakAdjustment: 50,        // +50% for peak hours
  offPeakAdjustment: -25,    // -25% for off-peak hours
  minDataPoints: 10          // Min bookings for confidence
}
```

**Confidence Scoring**:
- Based on total bookings in time period
- More data = higher confidence (capped at 1.0)
- `confidence = min(total_bookings / (minDataPoints × 5), 1.0)`

### 4. Gap Fill Notifications (`src/lib/notifications/gap-filler.ts`)

**Core Functions**:

- `findMatchingMembers(db, gapId, limit=5)`: Score members by booking history
- `sendGapFillNotifications(db, queue, gapId)`: Send up to 5 notifications per gap
- `trackGapConversion(db, memberId, reservationId)`: Track booking attribution
- `getGapFillStats(db, facilityId)`: Conversion rate analytics

**Match Scoring Algorithm** (weighted 0.0-1.0):
1. **Same hour bookings** (40%): Has member booked this hour before?
2. **Same court bookings** (30%): Prefers this specific court?
3. **Recent activity** (20%): Active in last 30 days?
4. **Same day of week** (10%): Often plays on this weekday?

**Spam Prevention**:
- Max 5 notifications per gap (hard limit)
- Minimum match score: 0.3
- Notification type: SMS if phone available and score > 0.7, else email

### 5. API Routes

#### GET /api/analytics/utilization?facility=:id
Returns hourly utilization with peak/off-peak identification:
```json
{
  "facility": { "id": "...", "name": "..." },
  "utilization": [...],
  "peak_hours": [...],
  "off_peak_hours": [...],
  "summary": {
    "avg_utilization": 0.65,
    "peak_count": 15,
    "off_peak_count": 8
  }
}
```

#### GET /api/analytics/gaps?facility=:id
Returns detected gaps grouped by type:
```json
{
  "facility": { "id": "...", "name": "...", "timezone": "..." },
  "gaps": [...],
  "summary": {
    "total_gaps": 23,
    "prime_time_empty": 8,
    "long_gap": 10,
    "isolated_available": 5,
    "notified": 12,
    "pending_notification": 11
  },
  "by_type": { ... }
}
```

#### GET /api/pricing/suggestions?facility=:id&status=pending
List pricing suggestions (optionally filtered by status):
```json
{
  "facility": { "id": "...", "name": "..." },
  "suggestions": [...],
  "summary": {
    "total": 15,
    "pending": 8,
    "approved": 5,
    "rejected": 2
  }
}
```

#### POST /api/pricing/suggestions
Generate new suggestions:
```json
{
  "facility_id": "fac_xxx",
  "config": {
    "peakThreshold": 0.8,
    "offPeakThreshold": 0.3,
    "peakAdjustment": 50,
    "offPeakAdjustment": -25
  }
}
```

#### POST /api/pricing/suggestions/:id/approve
Approve a suggestion:
```json
{
  "reviewed_by": "admin@facility.com"
}
```

#### POST /api/pricing/suggestions/:id/reject
Reject a suggestion:
```json
{
  "reviewed_by": "admin@facility.com"
}
```

### 6. Scheduled Worker (Daily Cron at 6am)

Updated `workers/notifier/src/index.ts` to handle two cron schedules:

**Every 15 minutes** (existing):
- Queue reservation reminders (24h and 2h before)
- Check for no-shows
- Clean up expired waitlist offers

**Daily at 6am UTC** (new):
1. Aggregate hourly utilization (last 30 days)
2. Calculate court popularity (weekly + monthly)
3. Detect gaps in next 7 days
4. Generate pricing suggestions
5. Send gap-fill notifications (up to 10 gaps per facility)
6. Expire old pricing suggestions (>7 days)

**Implementation Note**: Analytics functions are duplicated inline in the worker to avoid import issues with Cloudflare Workers. This follows the DRY violation pattern seen in other workers.

## Usage Examples

### Run Analytics Manually

```bash
# Via API (triggers on-demand analytics)
curl -X POST https://courtreserve.createsomething.space/api/pricing/suggestions \
  -H "Content-Type: application/json" \
  -d '{"facility_id":"fac_xxx"}'
```

### View Analytics

```bash
# Get utilization data
curl "https://courtreserve.createsomething.space/api/analytics/utilization?facility=fac_xxx"

# Get detected gaps
curl "https://courtreserve.createsomething.space/api/analytics/gaps?facility=fac_xxx"

# Get pricing suggestions
curl "https://courtreserve.createsomething.space/api/pricing/suggestions?facility=fac_xxx&status=pending"
```

### Approve/Reject Suggestions

```bash
# Approve
curl -X POST https://courtreserve.createsomething.space/api/pricing/suggestions/psg_xxx/approve \
  -H "Content-Type: application/json" \
  -d '{"reviewed_by":"admin@facility.com"}'

# Reject
curl -X POST https://courtreserve.createsomething.space/api/pricing/suggestions/psg_xxx/reject \
  -H "Content-Type: application/json" \
  -d '{"reviewed_by":"admin@facility.com"}'
```

## Testing Strategy

### 1. Database Migration
```bash
wrangler d1 execute court-reserve-db --local --file=migrations/0004_analytics.sql
```

### 2. Seed Test Data
Create test reservations spanning 30+ days with varied patterns to ensure utilization data aggregates correctly.

### 3. Manual Analytics Trigger
Use POST /api/pricing/suggestions to trigger analytics on-demand for testing.

### 4. Verify Cron Behavior
Test that 6am cron runs analytics by checking logs after scheduled time.

### 5. Gap Detection
1. Create reservations leaving strategic gaps
2. Run analytics
3. Verify gaps detected with correct types
4. Check gap notifications sent to matching members

### 6. Pricing Suggestions
1. Create high-utilization period (>80% bookings)
2. Create low-utilization period (<30% bookings)
3. Run analytics
4. Verify +50% and -25% suggestions generated
5. Approve/reject and verify status changes

## Metrics to Monitor

1. **Analytics Coverage**: % of facilities with utilization data
2. **Gap Fill Conversion**: gap_notifications.converted / total_notifications
3. **Suggestion Approval Rate**: approved / (approved + rejected)
4. **Revenue Impact**: Track pricing changes from approved suggestions
5. **Notification Effectiveness**: Conversions within 24h of notification

## Future Enhancements

1. **Machine Learning**: Train on historical data to predict optimal pricing
2. **A/B Testing**: Test pricing suggestions before full rollout
3. **Personalized Notifications**: Customize gap-fill messages per member
4. **Multi-facility Analytics**: Cross-facility benchmarking
5. **Real-time Suggestions**: Update pricing during low-demand periods
6. **Automated Pricing**: Auto-apply high-confidence suggestions (opt-in)

## Philosophy Alignment

**Subtractive Triad**:
- **DRY**: Analytics logic centralized, reused across API and cron
- **Rams**: Only essential metrics tracked; no vanity analytics
- **Heidegger**: Infrastructure recedes; facility owners see demand, not queries

**Zuhandenheit**: When analytics work perfectly, facility owners forget they exist—courts are simply filled, pricing adapts, members are engaged. The tool disappears into transparent use.

---

**Status**: Phase 5 implementation complete. Ready for testing and deployment.
