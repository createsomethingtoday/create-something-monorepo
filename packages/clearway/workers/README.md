# Court Reserve Workers

Phase 3: Real-time & Notifications implementation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Booking Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POST /api/realtime/attempt                                  │
│     ↓ Forward to Durable Object                                │
│  CourtStateManager                                              │
│     ↓ Single-threaded: check + hold (15 sec)                   │
│  Response: { success: true, holdExpiry }                        │
│                                                                 │
│  2. Create Stripe Checkout Session                             │
│     ↓ User pays                                                │
│  3. POST /api/realtime/confirm                                  │
│     ↓ Forward to Durable Object                                │
│  CourtStateManager                                              │
│     ↓ Confirm reservation                                       │
│     ↓ Send to NOTIFICATION_QUEUE                               │
│  Notifier Worker                                                │
│     ↓ Send confirmation email/SMS                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Workers

### 1. `realtime/` - CourtStateManager Durable Object

**Purpose**: Single-threaded booking coordination and WebSocket hub.

**Key Features**:
- One Durable Object instance per facility
- 15-second holds on pending bookings
- WebSocket connections for real-time availability updates
- In-memory state for current day
- No race conditions: all booking attempts serialized

**Endpoints**:
- `POST /attempt` - Attempt to reserve a slot (15-sec hold)
- `POST /confirm` - Confirm reservation (after payment)
- `POST /release` - Release a pending hold
- `POST /cancel` - Cancel reservation (free the slot)
- `GET /websocket` - Upgrade to WebSocket for real-time updates
- `GET /availability` - Get current in-memory availability
- `POST /sync` - Sync state from D1

**Deployment**:
```bash
cd packages/court-reserve/workers/realtime
pnpm install
wrangler deploy
```

### 2. `notifier/` - Notification Queue Worker

**Purpose**: Scheduled reminders and notification delivery.

**Key Features**:
- Cron handler runs every 15 minutes
- Queue consumer for notification messages
- Supports SMS (Twilio) and Email (SendGrid)
- Automatic retries on transient errors
- No-show detection and cleanup

**Notification Types**:
- `reminder` - 24h and 2h before reservation
- `waitlist_offer` - Court available (30-min expiry)
- `waitlist_auto_booked` - Auto-confirmed from waitlist
- `cancellation` - Reservation cancelled
- `confirmation` - Reservation confirmed

**Cron Schedule**:
- Every 15 minutes: Queue reminders, check no-shows, expire offers

**Deployment**:
```bash
cd packages/court-reserve/workers/notifier
pnpm install

# Configure secrets
wrangler secret put SENDGRID_API_KEY
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_FROM_NUMBER

wrangler deploy
```

## API Integration

### Real-time Booking Flow

```typescript
// 1. Attempt reservation (hold for 15 seconds)
const attemptResponse = await fetch('/api/realtime/attempt', {
  method: 'POST',
  body: JSON.stringify({
    courtId: 'crt_abc123',
    startTime: '2024-12-30T18:00:00Z',
    endTime: '2024-12-30T19:00:00Z',
    memberId: 'mbr_xyz789',
    facilityId: 'fac_def456',
    durationMinutes: 60
  })
});

const { success, holdExpiry } = await attemptResponse.json();

if (!success) {
  // Slot already taken
  return;
}

// 2. Create Stripe Checkout Session (within 15 seconds)
const checkoutResponse = await fetch('/api/stripe/checkout', {
  method: 'POST',
  body: JSON.stringify({ /* ... */ })
});

// 3. After payment success, confirm the reservation
const confirmResponse = await fetch('/api/realtime/confirm', {
  method: 'POST',
  body: JSON.stringify({
    courtId: 'crt_abc123',
    startTime: '2024-12-30T18:00:00Z',
    reservationId: 'rsv_new123',
    facilityId: 'fac_def456'
  })
});
```

### WebSocket for Real-time Updates

```typescript
const ws = new WebSocket('wss://.../api/realtime/websocket?facilityId=fac_def456');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'initial_state':
      // Full availability snapshot
      console.log(message.availability);
      break;

    case 'slot_pending':
      // Slot held (show as "pending" in UI)
      updateSlot(message.courtId, message.startTime, 'pending');
      break;

    case 'slot_reserved':
      // Slot confirmed (show as "reserved")
      updateSlot(message.courtId, message.startTime, 'reserved');
      break;

    case 'slot_released':
      // Slot freed (show as "available")
      updateSlot(message.courtId, message.startTime, 'available');
      break;
  }
};
```

### Waitlist Integration

When a reservation is cancelled:

1. **API layer** calls `processSlotOpening()` with promotion context
2. **Waitlist module** finds best match (priority + time preference)
3. **Auto-book path**: Create confirmed reservation + send notification
4. **Offer path**: Create pending reservation + send 30-min offer
5. **Member accepts**: `POST /api/waitlist/accept` → confirm reservation

```typescript
// Cancel reservation
const cancelResponse = await fetch('/api/reservations/rsv_abc123', {
  method: 'DELETE',
  body: JSON.stringify({ reason: 'Schedule conflict' })
});

const result = await cancelResponse.json();

if (result.waitlistPromotion) {
  console.log(`Promoted waitlist: ${result.waitlistPromotion.action}`);
}
```

## Configuration

### Environment Variables

**Main app** (`wrangler.toml`):
```toml
[[d1_databases]]
binding = "DB"
database_name = "court-reserve-db"

[[kv_namespaces]]
binding = "SESSIONS"

[[queues.producers]]
binding = "NOTIFICATION_QUEUE"
queue = "court-reserve-notifications"

[[durable_objects.bindings]]
name = "COURT_STATE"
class_name = "CourtStateManager"
```

**Secrets** (via `wrangler secret put`):
- `SENDGRID_API_KEY` - SendGrid API key for email
- `TWILIO_ACCOUNT_SID` - Twilio account SID for SMS
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_FROM_NUMBER` - Twilio phone number (E.164 format)

## Monitoring

### Tail Logs

```bash
# Real-time worker
wrangler tail --name court-reserve-realtime

# Notifier worker
wrangler tail --name court-reserve-notifier
```

### Metrics to Watch

- **Hold expiry rate**: How many holds expire without confirmation?
- **Waitlist conversion rate**: Auto-book vs offer vs no-match
- **Notification delivery**: Success vs transient errors vs permanent failures
- **No-show rate**: Track per facility/member

## Database Schema

### Notification Log

```sql
CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  notification_type TEXT,  -- 'reminder', 'waitlist_offer', etc.
  reservation_id TEXT,
  waitlist_id TEXT,
  member_id TEXT,
  facility_id TEXT,
  sent_at TEXT,
  minutes_before INTEGER,  -- For reminders
  channel TEXT,            -- 'email', 'sms', 'both'
  data TEXT                -- JSON snapshot
);
```

## Testing

### Local Development

```bash
# Start Durable Object worker
cd packages/court-reserve/workers/realtime
pnpm dev

# Start Notifier worker (separate terminal)
cd packages/court-reserve/workers/notifier
pnpm dev
```

### Manual Testing

```bash
# 1. Attempt a booking
curl -X POST http://localhost:8787/attempt \
  -H "Content-Type: application/json" \
  -d '{"courtId":"crt_1","startTime":"2024-12-30T18:00:00Z",...}'

# 2. Confirm booking
curl -X POST http://localhost:8787/confirm \
  -H "Content-Type: application/json" \
  -d '{"courtId":"crt_1","startTime":"2024-12-30T18:00:00Z","reservationId":"rsv_1"}'

# 3. Connect WebSocket (use wscat)
wscat -c ws://localhost:8787/websocket?facilityId=fac_1
```

## Troubleshooting

### Holds Not Expiring

Check `holdCleanupTimer` in CourtStateManager. Cleanup runs every 5 seconds.

### Notifications Not Sending

1. Verify secrets are configured: `wrangler secret list`
2. Check queue binding: `wrangler queues list`
3. Tail logs: `wrangler tail --name court-reserve-notifier`

### WebSocket Disconnects

Cloudflare WebSockets have a 5-minute idle timeout. Implement ping/pong:

```typescript
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

## Philosophy

**Zuhandenheit**: The infrastructure disappears; only the experience remains.

- Members see availability in real-time (WebSocket)
- Bookings are instant and conflict-free (Durable Object)
- Reminders arrive automatically (Notification Worker)
- Waitlist promotions happen autonomously (Queue + State Machine)

When it works, no one thinks about the coordination. The court is simply reserved.
