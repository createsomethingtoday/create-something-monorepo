# Automation Patterns

## The Principle

**Automating without creating fragility.**

Automation should remove friction, not add complexity. The best automation is invisible—when it works, you don't think about it.

## The Automation Paradox

More automation often means more fragility:

```
Manual Process          Naive Automation           Smart Automation
┌─────────────────┐    ┌─────────────────┐        ┌─────────────────┐
│ Human handles   │    │ Script handles  │        │ Automation with │
│ each case       │    │ happy path only │        │ human fallback  │
│                 │    │                 │        │                 │
│ ✓ Adaptable     │    │ ✗ Brittle      │        │ ✓ Robust        │
│ ✗ Slow          │    │ ✓ Fast         │        │ ✓ Fast          │
│ ✗ Inconsistent  │    │ ✗ Fails silently│       │ ✓ Consistent    │
└─────────────────┘    └─────────────────┘        └─────────────────┘
```

**The goal is Smart Automation—fast AND robust.**

## The Automation Triad

Apply the Subtractive Triad to automation decisions:

### DRY: What Repeats?

Only automate what actually repeats:

```markdown
Question: How often does this happen?

Daily+ → Automate immediately
Weekly → Automate if takes >15 min
Monthly → Consider automation
Quarterly → Manual is fine
Once → Definitely manual
```

### Rams: Does This Automation Earn Its Existence?

Every automation has costs:

```markdown
Costs:
- Initial development time
- Ongoing maintenance
- Debugging when it fails
- Complexity added to system
- Knowledge required to understand

Benefits:
- Time saved per occurrence
- Consistency improved
- Error rate reduced
- Scalability enabled
```

**Only automate when benefits clearly exceed costs.**

### Heidegger: Does This Serve the Whole?

Automation must fit the system:

```markdown
Questions:
- Does this automation create dependencies?
- Will others understand what it does?
- Does it integrate with existing workflows?
- What breaks if this automation fails?
```

## Automation Levels

### Level 1: Triggered Tasks

Human initiates, automation executes:

```typescript
// Manual trigger, automated execution
export async function deployTemplate(templateId: string) {
  // Build
  await exec(`pnpm --filter=${templateId} build`);

  // Upload to R2
  await uploadToR2(`templates/${templateId}/latest`);

  // Invalidate cache
  await invalidateCache(`template:${templateId}`);

  // Notify
  await notify(`Template ${templateId} deployed`);
}
```

**Human judgment triggers action. Automation handles the mechanics.**

### Level 2: Scheduled Tasks

Time-based automation:

```typescript
// CRON trigger (every hour)
export default {
  async scheduled(controller: ScheduledController, env: Env) {
    switch (controller.cron) {
      case '0 * * * *':  // Every hour
        await syncAnalytics(env);
        break;
      case '0 0 * * *':  // Daily
        await generateReports(env);
        break;
      case '0 0 * * 0':  // Weekly
        await cleanupOldData(env);
        break;
    }
  }
};
```

**Scheduled tasks should be idempotent—running twice should be safe.**

### Level 3: Event-Driven

Automation responds to events:

```typescript
// Webhook handler
export async function handleWebhook(event: WebhookEvent) {
  switch (event.type) {
    case 'tenant.created':
      await provisionTenant(event.data);
      break;
    case 'config.updated':
      await invalidateCache(event.data.tenantId);
      break;
    case 'subscription.cancelled':
      await handleChurn(event.data);
      break;
  }
}
```

**Events create loose coupling—producers and consumers are independent.**

### Level 4: Autonomous Systems

Self-managing automation:

```typescript
// Health check and self-healing
export async function healthCheck(env: Env) {
  const checks = [
    checkDatabase(env.DB),
    checkCache(env.KV),
    checkStorage(env.R2),
  ];

  const results = await Promise.allSettled(checks);

  for (const result of results) {
    if (result.status === 'rejected') {
      await attemptRecovery(result.reason);
      await alertHuman(result.reason);
    }
  }
}
```

**Autonomous systems still need human oversight. Alert on anomalies.**

## Safe Automation Patterns

### Idempotency

Operations should be safe to repeat:

```typescript
// ❌ Not idempotent
async function addToQueue(item: Item) {
  await queue.push(item);  // Duplicates if called twice
}

// ✓ Idempotent
async function ensureInQueue(item: Item) {
  const exists = await queue.has(item.id);
  if (!exists) {
    await queue.push(item);
  }
}
```

### Circuit Breakers

Prevent cascading failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private readonly threshold = 5;
  private readonly resetMs = 60000;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    const timeSinceLastFailure = Date.now() - (this.lastFailure?.getTime() ?? 0);
    return timeSinceLastFailure < this.resetMs;
  }
}
```

### Graceful Degradation

When automation fails, fall back gracefully:

```typescript
async function getConfig(tenantId: string): Promise<Config> {
  // Try cache first
  try {
    const cached = await KV.get(`config:${tenantId}`, 'json');
    if (cached) return cached;
  } catch {
    // Cache failure is not critical
  }

  // Try database
  try {
    const config = await DB.getTenantConfig(tenantId);
    // Attempt to cache (fire and forget)
    KV.put(`config:${tenantId}`, JSON.stringify(config)).catch(() => {});
    return config;
  } catch {
    // Database failure is serious, but we can still serve
    return getDefaultConfig();
  }
}
```

### Dead Letter Queues

Capture failed operations for later:

```typescript
async function processQueue(queue: Queue<Message>) {
  const messages = await queue.pull();

  for (const message of messages) {
    try {
      await process(message);
      await queue.ack(message);
    } catch (error) {
      if (message.retries < 3) {
        await queue.retry(message);
      } else {
        await deadLetterQueue.push({
          message,
          error: error.message,
          timestamp: new Date()
        });
        await queue.ack(message);  // Remove from main queue
      }
    }
  }
}
```

## Automation Anti-Patterns

### The Silent Failure

```typescript
// ❌ Fails silently
async function sync() {
  try {
    await doSync();
  } catch {
    // Swallowed error
  }
}

// ✓ Fails visibly
async function sync() {
  try {
    await doSync();
  } catch (error) {
    await alertChannel.send(`Sync failed: ${error.message}`);
    throw error;  // Re-throw for metrics
  }
}
```

### The Retry Storm

```typescript
// ❌ Hammers failing service
async function fetchWithRetry(url: string) {
  while (true) {
    try {
      return await fetch(url);
    } catch {
      // Immediate retry, no backoff
    }
  }
}

// ✓ Exponential backoff
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);  // 1s, 2s, 4s
    }
  }
}
```

### The Automation Spaghetti

```typescript
// ❌ Tightly coupled automations
A triggers B triggers C triggers D
  └─── E triggers F triggers A  // Cycle!

// ✓ Clear boundaries
Events → Queue → Handler → Outcome
                    │
                    └→ Alerts on failure
```

## Observability

Every automation needs visibility:

### Logging

```typescript
async function processItem(item: Item, logger: Logger) {
  logger.info('Processing started', { itemId: item.id });

  const result = await doProcessing(item);

  logger.info('Processing complete', {
    itemId: item.id,
    duration: result.duration,
    status: result.status
  });

  return result;
}
```

### Metrics

```typescript
// Track automation health
await analytics.track({
  event: 'automation.executed',
  properties: {
    name: 'tenant-sync',
    duration: elapsed,
    success: true,
    itemsProcessed: count
  }
});
```

### Alerting

```typescript
// Alert on anomalies
if (failureRate > 0.1) {  // 10% failure rate
  await alert({
    severity: 'warning',
    message: 'Tenant sync failure rate elevated',
    data: { failureRate, window: '1h' }
  });
}
```

## When NOT to Automate

Some things should stay manual:

- **One-time migrations**: Script once, run once, delete
- **Judgment-heavy decisions**: Automation can't replace wisdom
- **Edge cases**: 80% automation is often better than 100%
- **New processes**: Manual first, automate after patterns emerge
- **Security-critical operations**: Human approval for destructive actions

**The best automation is the automation you decide not to build.**

---

## Reflection

Before moving on:

1. What manual processes repeat most often in your work?
2. Which of your current automations are fragile?
3. What would graceful degradation look like for your systems?

**Automate for reliability, not just convenience.**

---

## Cross-Property References

> **Canon Reference**: Graceful degradation embodies [Functional Transparency](https://createsomething.ltd/patterns/functional-transparency)—automation that fails gracefully maintains transparent use.
>
> **Canon Reference**: The Gestell warning applies—automation that fills every gap is invasion, not efficiency. See [The Ethos](https://createsomething.ltd/ethos).
>
> **Practice**: Study the Claude Code hooks (`.claude/hooks/`) for real automation that degrades gracefully.
