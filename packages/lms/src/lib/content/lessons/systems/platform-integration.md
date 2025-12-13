# Platform Integration

## The Principle

**Connecting systems that complement, not complicate.**

Integration should make systems more capable together than apart. Every connection is a commitment—choose wisely.

## The Integration Decision

Before connecting systems, ask:

```markdown
1. What capability does this integration provide?
2. What dependency does this integration create?
3. What happens when this integration fails?
4. Is the value worth the coupling?
```

**Most integrations should be rejected.** The ones that remain must justify themselves.

## Integration Patterns

### Pattern 1: Data In (Import)

External systems send data to your system:

```typescript
// Webhook receiver
export async function POST({ request, platform }) {
  const payload = await request.json();
  const signature = request.headers.get('X-Signature');

  // Verify authenticity
  if (!verifySignature(payload, signature, env.WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Process asynchronously
  await platform.env.QUEUE.send({
    type: payload.event,
    data: payload.data,
    receivedAt: Date.now()
  });

  // Respond immediately (don't block sender)
  return new Response('OK', { status: 200 });
}
```

**Always acknowledge immediately, process asynchronously.**

### Pattern 2: Data Out (Export)

Your system sends data to external systems:

```typescript
// Event publisher
async function publishEvent(event: Event, destinations: Destination[]) {
  const results = await Promise.allSettled(
    destinations.map(dest => sendToDestination(event, dest))
  );

  // Log failures but don't fail the operation
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    await logIntegrationFailures(event, failures);
  }

  return { sent: results.length, failed: failures.length };
}
```

**External failures shouldn't break internal operations.**

### Pattern 3: Query (Read)

Fetch data from external systems:

```typescript
// Cached external query
async function getExternalData(key: string, env: Env): Promise<Data | null> {
  // Check cache first
  const cached = await env.KV.get(`external:${key}`, 'json');
  if (cached) return cached;

  // Fetch with timeout
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000);  // 5s timeout

  try {
    const response = await fetch(`${EXTERNAL_API}/${key}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.API_KEY}` }
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Cache for 1 hour
    await env.KV.put(`external:${key}`, JSON.stringify(data), {
      expirationTtl: 3600
    });

    return data;
  } catch {
    return null;  // Graceful failure
  }
}
```

**Always cache, always timeout, always have a fallback.**

### Pattern 4: Command (Write)

Trigger actions in external systems:

```typescript
// External command with retry
async function executeExternalCommand(
  command: Command,
  options: { retries?: number; backoff?: number } = {}
) {
  const { retries = 3, backoff = 1000 } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(EXTERNAL_COMMAND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Idempotency-Key': command.id  // Prevent duplicates
        },
        body: JSON.stringify(command)
      });

      if (response.ok) {
        return await response.json();
      }

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await sleep(backoff * Math.pow(2, attempt));
    }
  }
}
```

**Use idempotency keys. External systems may receive duplicates.**

## Integration Architecture

### The Gateway Pattern

Centralize external access:

```
┌──────────────────────────────────────────────────────────────┐
│                      Your System                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Service A  │  │  Service B  │  │  Service C  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                   ┌──────┴──────┐                            │
│                   │   Gateway   │  ← Single exit point       │
│                   │   Worker    │                            │
│                   └──────┬──────┘                            │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    External Systems     │
              └─────────────────────────┘
```

Benefits:
- Centralized authentication
- Unified rate limiting
- Consistent error handling
- Single place to audit

### The Adapter Pattern

Abstract external complexity:

```typescript
// Abstract interface
interface PaymentProvider {
  charge(amount: number, currency: string): Promise<ChargeResult>;
  refund(chargeId: string, amount?: number): Promise<RefundResult>;
}

// Stripe adapter
class StripeAdapter implements PaymentProvider {
  async charge(amount: number, currency: string): Promise<ChargeResult> {
    const stripeResult = await stripe.charges.create({
      amount: amount * 100,  // Stripe uses cents
      currency: currency.toLowerCase()
    });
    return normalizeChargeResult(stripeResult);
  }
}

// Your code uses the abstraction
async function processPayment(provider: PaymentProvider, amount: number) {
  return provider.charge(amount, 'USD');
}
```

**Adapters isolate your code from external API changes.**

## Common Integrations

### Analytics (Outbound)

```typescript
// Analytics adapter
class AnalyticsService {
  private providers: AnalyticsProvider[];

  async track(event: AnalyticsEvent) {
    // Fire and forget to all providers
    await Promise.allSettled(
      this.providers.map(p => p.track(event))
    );

    // Always succeed for caller
  }
}

// Usage (never fails the operation)
await analytics.track({
  event: 'page_viewed',
  properties: { path: '/pricing', duration: 30 }
});
```

### Email (Outbound)

```typescript
// Email queue (decouple send from request)
async function queueEmail(email: Email) {
  await queue.send({
    type: 'email',
    payload: email,
    priority: email.priority ?? 'normal',
    scheduledFor: email.sendAt ?? null
  });
}

// Worker processes queue
async function processEmailQueue(message: Message<Email>) {
  const result = await emailProvider.send(message.payload);

  if (!result.success) {
    // Retry transient failures
    if (result.error.retryable && message.attempts < 3) {
      throw new Error('Retry');  // Queue will re-deliver
    }

    // Log permanent failures
    await logEmailFailure(message.payload, result.error);
  }
}
```

### Authentication (Inbound)

```typescript
// OAuth callback handler
export async function GET({ url, platform }) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Verify state to prevent CSRF
  const expectedState = await platform.env.KV.get(`oauth:state:${state}`);
  if (!expectedState) {
    return redirect(302, '/login?error=invalid_state');
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);

  // Create or update user
  const user = await upsertUser(tokens.userInfo);

  // Create session
  const session = await createSession(user);

  // Clean up state
  await platform.env.KV.delete(`oauth:state:${state}`);

  return redirect(302, '/dashboard', {
    headers: { 'Set-Cookie': `session=${session.id}; HttpOnly; Secure` }
  });
}
```

## Integration Anti-Patterns

### The Synchronous Chain

```typescript
// ❌ Fragile chain
async function createOrder(order: Order) {
  await validateInventory();     // External
  await processPayment();        // External
  await updateCRM();             // External
  await sendConfirmation();      // External
  await notifyWarehouse();       // External
  // Any failure breaks the whole flow
}

// ✓ Async processing
async function createOrder(order: Order) {
  // Only essential sync operations
  await validateInventory();
  await processPayment();

  // Queue the rest
  await queue.send({ type: 'order.created', order });
}
```

### The Leaky Abstraction

```typescript
// ❌ External details leak into code
const stripeCustomerId = user.stripe_customer_id;
const price = await stripe.prices.retrieve(STRIPE_PRICE_ID);

// ✓ Abstracted
const subscription = await billingService.getSubscription(user.id);
```

### The Hidden Dependency

```typescript
// ❌ Implicit external call
function formatAddress(address: Address): string {
  // Surprise! This makes an API call
  const normalized = await geocodingService.normalize(address);
  return normalized.formatted;
}

// ✓ Explicit
async function formatAddressWithGeocoding(address: Address): Promise<string> {
  const normalized = await geocodingService.normalize(address);
  return normalized.formatted;
}
```

## Integration Hygiene

### Health Checks

```typescript
// Check all integrations periodically
async function checkIntegrationHealth(): Promise<HealthReport> {
  const checks = {
    stripe: checkStripe(),
    sendgrid: checkSendGrid(),
    analytics: checkAnalytics()
  };

  const results = await Promise.allSettled(Object.values(checks));

  return Object.keys(checks).reduce((report, key, i) => {
    report[key] = results[i].status === 'fulfilled'
      ? { status: 'healthy' }
      : { status: 'unhealthy', error: results[i].reason };
    return report;
  }, {} as HealthReport);
}
```

### Credential Rotation

```typescript
// Support multiple active credentials
const credentials = [
  env.API_KEY_NEW,    // Try new first
  env.API_KEY_OLD     // Fall back to old
];

async function callExternalAPI(endpoint: string) {
  for (const cred of credentials) {
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${cred}` }
      });
      if (response.status !== 401) return response;
    } catch {
      continue;
    }
  }
  throw new Error('All credentials failed');
}
```

---

## Reflection

Before moving on:

1. What integrations in your current systems are most fragile?
2. Which integrations could be removed without significant loss?
3. How would you handle a 24-hour outage of your most critical integration?

**The best integration is often no integration at all.**
