# WORKWAY Integration Test Plan

This document outlines how to test the WORKWAY integration in CLEARWAY.

## Prerequisites

1. WORKWAY account with API key
2. CLEARWAY deployed to Cloudflare
3. Notification worker deployed

## Test Scenarios

### Test 1: Booking Confirmation Trigger

**Goal:** Verify that booking confirmation triggers WORKWAY workflow

**Steps:**
1. Set WORKWAY_API_KEY in worker secrets:
   ```bash
   wrangler secret put WORKWAY_API_KEY --name court-reserve-notifier
   ```

2. Create a test booking in CLEARWAY
3. Complete Stripe checkout
4. Check worker logs:
   ```bash
   wrangler tail court-reserve-notifier
   ```

**Expected Result:**
```
WORKWAY workflow triggered: booking.confirmed → exec_abc123
```

**Fallback (if WORKWAY not configured):**
```
WORKWAY trigger skipped (not configured): booking.confirmed
```

### Test 2: Booking Reminder Trigger

**Goal:** Verify that reminder cron triggers WORKWAY workflow

**Steps:**
1. Create a booking 24 hours in the future
2. Wait for cron to run (or trigger manually)
3. Check logs for workflow trigger

**Expected Result:**
```
WORKWAY workflow triggered: booking.reminder → exec_def456
```

### Test 3: Cancellation Trigger

**Goal:** Verify that cancellations trigger WORKWAY workflow

**Steps:**
1. Create and confirm a booking
2. Cancel the booking
3. Check logs for workflow trigger

**Expected Result:**
```
WORKWAY workflow triggered: booking.cancelled → exec_ghi789
```

### Test 4: Graceful Degradation

**Goal:** Verify that notifications work WITHOUT WORKWAY

**Steps:**
1. Remove WORKWAY_API_KEY from worker secrets
2. Create and confirm a booking
3. Verify email/SMS still sent
4. Check logs show WORKWAY skipped

**Expected Result:**
```
Email sent to user@example.com
WORKWAY trigger skipped (not configured): booking.confirmed
```

## Integration Checklist

- [ ] WORKWAY client imports successfully
- [ ] Notification worker deploys without errors
- [ ] Booking confirmation triggers workflow
- [ ] Reminder cron triggers workflow
- [ ] Cancellation triggers workflow
- [ ] Graceful degradation works (notifications send without WORKWAY)
- [ ] Idempotency keys prevent duplicate triggers
- [ ] Worker logs show workflow execution IDs
- [ ] WORKWAY dashboard shows executions

## Debugging

### Worker Logs

View real-time logs:
```bash
wrangler tail court-reserve-notifier
```

Filter for WORKWAY events:
```bash
wrangler tail court-reserve-notifier | grep WORKWAY
```

### WORKWAY Dashboard

View workflow executions:
- https://workway.co/executions
- Filter by workflow ID: `clearway-booking-confirmed`
- Check execution status and logs

### Common Issues

| Issue | Solution |
|-------|----------|
| `WORKWAY_API_KEY not configured` | Set secret via `wrangler secret put WORKWAY_API_KEY` |
| `WORKWAY workflow trigger failed: Network error` | Check WORKWAY API is accessible from worker |
| `WORKWAY workflow trigger failed: 401 Unauthorized` | Verify API key is correct |
| Duplicate workflow executions | Check idempotency keys are unique per event |

## Performance Testing

### Load Test

1. Create 100 bookings simultaneously
2. Verify all 100 trigger workflows
3. Check for duplicate executions
4. Verify notification worker doesn't timeout

**Expected:**
- All workflows trigger successfully
- No duplicates (idempotency works)
- Worker completes within timeout

### Cron Test

1. Create 50 bookings for tomorrow
2. Wait for 24h reminder cron
3. Verify all 50 reminders trigger workflows

**Expected:**
- Cron completes within 15 minutes
- All 50 workflows triggered
- No missed reminders

## Security Testing

### API Key Rotation

1. Generate new WORKWAY API key
2. Update worker secret
3. Verify workflows still trigger

### Invalid API Key

1. Set invalid WORKWAY_API_KEY
2. Create booking
3. Verify graceful degradation (notifications still send)

## Monitoring

### Metrics to Track

- Workflow trigger success rate
- Workflow trigger latency
- Graceful degradation incidents
- Worker error rate

### Alerts

Set up alerts for:
- WORKWAY trigger failures > 5% in 1 hour
- Worker errors > 10 in 15 minutes
- Missing workflow executions for confirmed bookings
