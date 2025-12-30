# Court Reserve Phase 3: Real-time & Notifications - COMPLETE

**Status**: ✅ Complete
**Date**: 2024-12-30
**Issue**: csm-jvyxl

---

## Summary

Phase 3 implements real-time availability coordination and autonomous notification delivery for the Court Reserve platform. The system now guarantees conflict-free bookings through single-threaded Durable Objects and delivers timely notifications via queue workers.

## Components Implemented

### 1. CourtStateManager Durable Object

**Location**: `packages/court-reserve/workers/realtime/src/index.ts`

**Features**:
- Single-threaded booking coordination (no race conditions)
- 15-second hold mechanism for pending bookings
- WebSocket hub for real-time availability broadcasts
- In-memory state management for current-day availability
- Automatic cleanup of expired holds (every 5 seconds)

**Endpoints**:
- `POST /attempt` - Attempt reservation (creates 15-sec hold)
- `POST /confirm` - Confirm reservation after payment
- `POST /release` - Release pending hold
- `POST /cancel` - Cancel reservation (notifies waitlist)
- `GET /websocket` - WebSocket upgrade for real-time updates
- `GET /availability` - Get current in-memory state
- `POST /sync` - Sync state from D1 database

**Key Innovation**: One Durable Object instance per facility ensures serialized booking attempts, eliminating double-booking race conditions.

### 2. Notification Queue Worker

**Location**: `packages/court-reserve/workers/notifier/src/index.ts`

**Features**:
- Cron handler (every 15 minutes): queue reminders, detect no-shows, expire offers
- Queue consumer: process notification messages
- Multi-channel delivery: Email (SendGrid) + SMS (Twilio)
- Automatic retry logic for transient errors
- Notification logging for audit trail

**Notification Types**:
- `reminder` - 24h and 2h before reservation
- `waitlist_offer` - Court available (30-min expiry)
- `waitlist_auto_booked` - Auto-confirmed from waitlist
- `cancellation` - Reservation cancelled
- `confirmation` - Reservation confirmed

**Cron Jobs**:
- Queue 24-hour reminders
- Queue 2-hour reminders
- Detect no-shows (confirmed reservations past end_time without check-in)
- Clean up expired waitlist offers

### 3. Enhanced Waitlist Module

**Location**: `packages/court-reserve/src/lib/scheduling/waitlist.ts`

**Enhancements**:
- `PromotionContext` interface for notification queue integration
- Auto-book vs offer decision based on `auto_book` flag
- Member notification on auto-booking
- 30-minute offer with expiry notification
- Accept URL generation for offers

**Integration Points**:
- Called from cancellation handler in `api/reservations/[id]/+server.ts`
- Sends notifications via NOTIFICATION_QUEUE
- Creates pending reservations for offers
- Creates confirmed reservations for auto-bookings

### 4. API Routes

**Real-time Booking**:
- `POST /api/realtime/attempt` - Proxy to Durable Object
- `POST /api/realtime/confirm` - Confirm + send notification
- `GET /api/realtime/websocket` - WebSocket connection

**Waitlist**:
- `POST /api/waitlist/accept` - Accept offer + confirm reservation

**Cancellation Enhancement**:
- Updated `DELETE /api/reservations/[id]` to:
  - Release Durable Object hold
  - Send cancellation notification
  - Trigger waitlist promotion with context

### 5. Database Migration

**Location**: `packages/court-reserve/migrations/0002_notifications.sql`

**Schema Added**:
- `notification_log` table for audit trail
- Indexes for efficient querying
- `stripe_checkout_session_id` column (if not exists)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Booking Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Member → POST /api/realtime/attempt                            │
│              ↓                                                  │
│  CourtStateManager (Durable Object)                             │
│    • Check availability (in-memory)                             │
│    • Place 15-second hold                                       │
│    • Broadcast "slot_pending" via WebSocket                     │
│              ↓                                                  │
│  Response: { success: true, holdExpiry: <timestamp> }           │
│              ↓                                                  │
│  Member → Stripe Checkout (within 15 seconds)                   │
│              ↓                                                  │
│  POST /api/realtime/confirm                                     │
│              ↓                                                  │
│  CourtStateManager                                              │
│    • Verify pending hold                                        │
│    • Mark slot as "reserved"                                    │
│    • Broadcast "slot_reserved" via WebSocket                    │
│              ↓                                                  │
│  Queue confirmation notification                                │
│              ↓                                                  │
│  Notifier Worker (queue consumer)                               │
│    • Send email (SendGrid)                                      │
│    • Send SMS (Twilio)                                          │
│    • Log to notification_log                                    │
│              ↓                                                  │
│  Member receives confirmation                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 Cancellation + Waitlist Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Member → DELETE /api/reservations/:id                          │
│              ↓                                                  │
│  Check cancellation policy                                      │
│              ↓                                                  │
│  Update reservation status = 'cancelled'                        │
│              ↓                                                  │
│  Release Durable Object hold                                    │
│    • CourtStateManager.cancel()                                 │
│    • Broadcast "slot_released"                                  │
│              ↓                                                  │
│  Queue cancellation notification                                │
│              ↓                                                  │
│  Find matching waitlist entries                                 │
│    • Score by priority, court match, time preference            │
│              ↓                                                  │
│  Best match: auto_book enabled?                                 │
│    ├─ YES: Create confirmed reservation                         │
│    │        Queue "waitlist_auto_booked" notification           │
│    └─ NO:  Create pending reservation                           │
│             Queue "waitlist_offer" notification (30-min expiry) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Reminder Cron Job                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cron (every 15 minutes)                                        │
│              ↓                                                  │
│  Query reservations starting in 24 hours                        │
│    • Filter: status = 'confirmed'                               │
│    • Filter: not already reminded in last 30 min                │
│              ↓                                                  │
│  Queue reminder notifications                                   │
│              ↓                                                  │
│  Query reservations starting in 2 hours                         │
│              ↓                                                  │
│  Queue reminder notifications                                   │
│              ↓                                                  │
│  Detect no-shows                                                │
│    • Filter: status = 'confirmed', end_time < now               │
│    • Filter: checked_in_at IS NULL                              │
│              ↓                                                  │
│  Update status = 'no_show'                                      │
│  Increment member.no_show_count                                 │
│  Log to no_show_log                                             │
│              ↓                                                  │
│  Clean up expired waitlist offers                               │
│    • Cancel pending reservations                                │
│    • Mark waitlist entries as 'expired'                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration Required

### Secrets

```bash
# SendGrid (email)
wrangler secret put SENDGRID_API_KEY

# Twilio (SMS)
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER
```

### Bindings

Already configured in `wrangler.toml`:
- `COURT_STATE` - Durable Object namespace
- `NOTIFICATION_QUEUE` - Queue producer/consumer
- `DB` - D1 database
- `SESSIONS` - KV namespace

## Deployment

```bash
# 1. Apply database migration
wrangler d1 execute court-reserve-db --file=migrations/0002_notifications.sql

# 2. Deploy Durable Object worker
cd packages/court-reserve/workers/realtime
pnpm install
wrangler deploy

# 3. Deploy Notifier worker
cd packages/court-reserve/workers/notifier
pnpm install
wrangler deploy

# 4. Configure secrets (if not already done)
wrangler secret put SENDGRID_API_KEY
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER
```

## Testing

### Manual Flow Test

```bash
# 1. Start local dev servers
cd packages/court-reserve/workers/realtime
pnpm dev  # Port 8787

# New terminal
cd packages/court-reserve/workers/notifier
pnpm dev  # Port 8788

# New terminal
cd packages/court-reserve
pnpm dev  # Main app

# 2. Attempt booking
curl -X POST http://localhost:8787/attempt \
  -H "Content-Type: application/json" \
  -d '{
    "courtId": "crt_test123",
    "startTime": "2024-12-31T18:00:00Z",
    "endTime": "2024-12-31T19:00:00Z",
    "memberId": "mbr_test456",
    "facilityId": "fac_test789",
    "durationMinutes": 60
  }'

# Expected: { "success": true, "holdExpiry": <timestamp> }

# 3. Confirm booking (within 15 seconds)
curl -X POST http://localhost:8787/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "courtId": "crt_test123",
    "startTime": "2024-12-31T18:00:00Z",
    "reservationId": "rsv_new123",
    "facilityId": "fac_test789"
  }'

# Expected: { "success": true, "reservationId": "rsv_new123" }

# 4. Connect WebSocket (use wscat)
wscat -c ws://localhost:8787/websocket?facilityId=fac_test789

# Expected: Receive initial_state message with availability snapshot
# Then: Receive slot_update messages on bookings/cancellations
```

### WebSocket Test

```javascript
const ws = new WebSocket('ws://localhost:8787/websocket?facilityId=fac_test789');

ws.onopen = () => console.log('Connected');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Received:', msg);
};

// Expected messages:
// 1. { type: 'initial_state', availability: [...] }
// 2. { type: 'slot_pending', courtId, startTime, status: 'pending' }
// 3. { type: 'slot_reserved', courtId, startTime, status: 'reserved', reservationId }
```

## Success Criteria

✅ **Real-time Coordination**
- Durable Object handles concurrent booking attempts without race conditions
- 15-second holds prevent payment failures from blocking slots
- WebSocket broadcasts keep all clients synchronized

✅ **Notification Delivery**
- Reminders sent 24h and 2h before reservations
- Waitlist offers sent within seconds of cancellation
- Auto-book confirmations sent immediately
- Cancellation notices sent with policy details

✅ **Waitlist Promotion**
- Best match selected by priority + time preference + court match
- Auto-book creates confirmed reservation instantly
- Offers create pending reservation with 30-min expiry
- Accept endpoint confirms offer and sends notification

✅ **No-Show Detection**
- Cron runs every 15 minutes
- Confirmed reservations past end_time marked as no-show
- Member no_show_count incremented
- Audit log created

✅ **Type Safety**
- All API routes have typed request/response interfaces
- Workers compile without errors
- Type checking passes (`pnpm exec tsc --noEmit`)

## File Manifest

### Workers
- `packages/court-reserve/workers/realtime/src/index.ts` - Durable Object
- `packages/court-reserve/workers/realtime/wrangler.toml` - DO config
- `packages/court-reserve/workers/realtime/package.json` - Dependencies
- `packages/court-reserve/workers/realtime/tsconfig.json` - TypeScript config
- `packages/court-reserve/workers/notifier/src/index.ts` - Queue worker
- `packages/court-reserve/workers/notifier/wrangler.toml` - Worker config
- `packages/court-reserve/workers/notifier/package.json` - Dependencies
- `packages/court-reserve/workers/notifier/tsconfig.json` - TypeScript config

### API Routes
- `packages/court-reserve/src/routes/api/realtime/attempt/+server.ts` - Booking attempt
- `packages/court-reserve/src/routes/api/realtime/confirm/+server.ts` - Confirm booking
- `packages/court-reserve/src/routes/api/realtime/websocket/+server.ts` - WebSocket upgrade
- `packages/court-reserve/src/routes/api/waitlist/accept/+server.ts` - Accept offer

### Enhanced Modules
- `packages/court-reserve/src/lib/scheduling/waitlist.ts` - Notification integration
- `packages/court-reserve/src/routes/api/reservations/[id]/+server.ts` - Cancel notifications

### Database
- `packages/court-reserve/migrations/0002_notifications.sql` - Notification log schema

### Documentation
- `packages/court-reserve/workers/README.md` - Worker architecture and usage

## Philosophy: Zuhandenheit

**The infrastructure disappears; only the experience remains.**

- Members see availability update in real-time (WebSocket broadcasts)
- Bookings are instant and conflict-free (Durable Object serialization)
- Reminders arrive automatically (Cron + Queue)
- Waitlist promotions happen autonomously (State machine + Notifications)
- Cancellations trigger cascading actions invisibly (Release + Notify + Promote)

When Phase 3 works perfectly, members don't think about coordination. They see availability, book instantly, receive timely reminders, and get offered waitlist slots automatically. The complex orchestration—Durable Objects, queues, cron jobs, WebSockets—recedes into transparent use.

**Weniger, aber besser**: The system does more while appearing to do less. Every component has a single, well-defined purpose. No magic, no frameworks—just purposeful coordination.

## Next Steps (Phase 4)

Phase 3 completes the autonomous booking engine. Phase 4 will add SMS/Chat booking via Twilio webhooks and Workers AI intent parsing, enabling members to text "book court 3 at 6pm tomorrow" and receive instant confirmation.

The notification infrastructure built in Phase 3 will handle two-way SMS conversations. The Durable Object will coordinate booking attempts from SMS just as it does from the web UI. The system becomes truly multi-channel.

---

**Built with**: Cloudflare Durable Objects, D1, Queues, Workers, WebSockets, Twilio, SendGrid
**Philosophy**: Subtractive Triad (DRY, Rams, Heidegger) applied to autonomous systems
