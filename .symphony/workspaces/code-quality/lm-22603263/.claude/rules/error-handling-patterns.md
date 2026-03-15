# Error Handling Patterns

Consistent error handling across the monorepo. The tool recedes; errors become actionable.

## Decision Matrix

| Context | Pattern | Response | Example |
|---------|---------|----------|---------|
| **SvelteKit page load** | `throw error()` | Error page renders | `throw error(404, 'Not found')` |
| **API endpoint** | `json()` with status | JSON response | `return json({ error: '...' }, { status: 400 })` |
| **Background worker** | `log.error()` + retry | Queue reprocessing | `log.error('Failed', { error }); throw error` |
| **Database operation** | Try-catch + fallback | Graceful degradation | `catch (e) { return fallback }` |
| **Validation failure** | `json()` 400 | Validation errors | `return json({ success: false, error }, { status: 400 })` |
| **Auth failure** | `throw error()` 401/403 | Redirect or error page | `throw error(401, 'Unauthorized')` |

## Standard Response Envelope

All API responses follow this pattern:

```typescript
// Success
{
  success: true,
  data: T
}

// Error
{
  success: false,
  error: string,
  correlationId: string,  // For debugging
  message?: string        // User-friendly message
}
```

## Correlation IDs

Every error response includes a correlation ID for debugging:

```typescript
import { generateCorrelationId, createErrorResponse, log } from '@create-something/components/utils';

export const POST: RequestHandler = async ({ request }) => {
  const correlationId = generateCorrelationId();

  try {
    // ... operation
  } catch (err) {
    log.error('Operation failed', { correlationId, error: err });
    return json(createErrorResponse('Failed to process', correlationId), { status: 500 });
  }
};
```

## Structured Logging

Use the `log` object for all logging:

```typescript
import { log } from '@create-something/components/utils';

// Levels
log.debug('Cache hit', { key });           // Development only
log.info('User signed up', { userId });    // Normal operations
log.warn('Rate limit approaching', { remaining: 10 });  // Potential issues
log.error('Payment failed', { correlationId, error });  // Failures

// Child logger for request context
const reqLog = log.child({ correlationId, path: '/api/users' });
reqLog.info('Request started');
reqLog.error('Request failed', { error: err });
```

## Error Categories

### Client Errors (4xx)

| Status | When | Action |
|--------|------|--------|
| 400 | Invalid input | Return validation errors |
| 401 | Not authenticated | Redirect to login or return error |
| 403 | Not authorized | Return permission error |
| 404 | Resource not found | Return not found error |
| 409 | Conflict (duplicate) | Return conflict details |
| 422 | Unprocessable | Return semantic errors |
| 429 | Rate limited | Return retry-after header |

### Server Errors (5xx)

| Status | When | Action |
|--------|------|--------|
| 500 | Unexpected error | Log with correlation ID, generic response |
| 502 | Upstream failure | Log, retry if transient |
| 503 | Service unavailable | Return maintenance message |
| 504 | Timeout | Log, consider async processing |

## Validation Pattern

Use Zod for all API input validation:

```typescript
import { parseBody, contactSchema } from '@create-something/components/validation';

export const POST: RequestHandler = async ({ request }) => {
  const result = await parseBody(request, contactSchema);

  if (!result.success) {
    return json({ success: false, error: result.error }, { status: 400 });
  }

  const { name, email, message } = result.data;
  // ... proceed with validated data
};
```

## Database Error Handling

### With Fallback (Non-Critical)

```typescript
import { safeQuery } from '@create-something/components/utils';

const papers = await safeQuery(
  () => fetchPublishedPapers(db),
  []  // Fallback to empty array
);
```

### Critical Operations

```typescript
try {
  const result = await db.prepare('INSERT INTO ...').bind(...).run();
  if (!result.success) {
    throw new Error('Insert failed');
  }
} catch (err) {
  log.error('Database error', { correlationId, error: err, table: 'users' });
  return json(createErrorResponse('Database error', correlationId), { status: 500 });
}
```

## Worker/Queue Pattern

```typescript
export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processMessage(message.body, env);
        message.ack();
      } catch (err) {
        log.error('Queue processing failed', {
          messageId: message.id,
          error: err,
          attempt: message.attempts
        });

        if (message.attempts < 3) {
          message.retry({ delaySeconds: 60 * message.attempts });
        } else {
          // Dead letter or alert
          message.ack();
        }
      }
    }
  }
};
```

## Anti-Patterns

### Silent Failures

```typescript
// BAD: Silent failure
try {
  await db.prepare('INSERT...').run();
} catch (e) {
  console.warn('DB failed');  // Data lost!
}

// GOOD: Propagate or handle explicitly
try {
  await db.prepare('INSERT...').run();
} catch (e) {
  log.error('DB insert failed', { error: e, correlationId });
  return json(createErrorResponse('Failed to save', correlationId), { status: 500 });
}
```

### Bare Throws

```typescript
// BAD: Loses context
throw new Error('Failed');

// GOOD: Include context
log.error('Operation failed', { correlationId, userId, error });
throw error(500, 'Internal error');
```

### Console Logging

```typescript
// BAD: Unstructured
console.log('User:', user.id, 'did thing');
console.error('Error:', err);

// GOOD: Structured JSON
log.info('User action', { userId: user.id, action: 'thing' });
log.error('Operation failed', { error: err, correlationId });
```

## Testing Error Paths

```typescript
describe('error handling', () => {
  it('returns 400 for invalid input', async () => {
    const response = await POST({ request: mockInvalidRequest });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it('returns correlation ID on 500', async () => {
    const response = await POST({ request: mockFailingRequest });
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.correlationId).toMatch(/^cs-/);
  });
});
```

## Subtractive Triad

| Level | Principle | Application |
|-------|-----------|-------------|
| **DRY** | One error pattern | `createErrorResponse()` everywhere |
| **Rams** | Minimal error info | Correlation ID + message, not stack traces |
| **Heidegger** | Errors serve debugging | Structured logs enable incident response |
