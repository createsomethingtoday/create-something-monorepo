/**
 * Praxis Exercises — Embedded from packages/space/src/lib/praxis/exercises.ts.
 * Interactive coding exercises that teach patterns through the Subtractive Triad lens.
 */

import type { PraxisExercise } from './types.js';

export const PRAXIS_EXERCISES: PraxisExercise[] = [
  {
    id: 'error-structure',
    number: 1,
    title: 'Error Structure',
    pattern: 'getErrorMessage',
    estimatedMinutes: 15,
    context: {
      situation: 'A production API endpoint catches errors but loses context. Users see "Something went wrong" while logs show raw exception objects.',
      task: 'Refactor the error handling to preserve context through a typed getErrorMessage pattern.',
      notice: 'The existing code uses instanceof checks that fail across module boundaries.'
    },
    starterCode: `function handleError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
}`,
    solution: `function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}`,
    whyItMatters: 'DRY: One function replaces scattered instanceof checks. Rams: The function does exactly one thing. Heidegger: Error handling recedes — you stop thinking about edge cases and focus on the domain.'
  },
  {
    id: 'timeout-pattern',
    number: 2,
    title: 'Timeout',
    pattern: 'AbortController',
    estimatedMinutes: 20,
    context: {
      situation: 'An API client makes fetch calls without timeouts. When the upstream service hangs, the entire worker times out after 30 seconds.',
      task: 'Add timeout support using AbortController without modifying the existing API surface.',
      notice: 'setTimeout alone does not cancel the fetch — the connection stays open.'
    },
    starterCode: `async function fetchData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
  return response.json();
}`,
    solution: `async function fetchData(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}`,
    whyItMatters: 'DRY: AbortController is the platform primitive — no wrapper libraries needed. Rams: The timeout is a single parameter, not a configuration object. Heidegger: Once added, timeout handling disappears into the fetch — it works without being noticed.'
  },
  {
    id: 'retry-storm',
    number: 3,
    title: 'Retry Storm',
    pattern: 'Exponential Backoff',
    estimatedMinutes: 25,
    context: {
      situation: 'A webhook handler retries failed deliveries immediately. When the target server goes down, hundreds of retries fire simultaneously, making recovery harder.',
      task: 'Implement exponential backoff with jitter to prevent retry storms.',
      notice: 'Linear backoff still creates synchronization — all retries align on the same schedule.'
    },
    starterCode: `async function deliverWebhook(url: string, payload: unknown, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}`,
    solution: `async function deliverWebhook(url: string, payload: unknown, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return true;
    } catch {}
    if (i < maxRetries) {
      const base = Math.min(1000 * Math.pow(2, i), 30000);
      const jitter = Math.random() * base * 0.5;
      await new Promise(r => setTimeout(r, base + jitter));
    }
  }
  return false;
}`,
    whyItMatters: 'DRY: One formula replaces ad-hoc delay logic. Rams: Jitter is the minimal addition that prevents the problem — nothing more. Heidegger: Backoff protects the whole system, not just one request.'
  },
  {
    id: 'webhook-security',
    number: 4,
    title: 'Webhook Security',
    pattern: 'Signature Verification',
    estimatedMinutes: 20,
    context: {
      situation: 'A webhook endpoint accepts any POST request with the right path. Anyone who discovers the URL can trigger actions in your system.',
      task: 'Add HMAC signature verification to ensure only the legitimate sender can trigger webhooks.',
      notice: 'Timing-safe comparison is essential — regular string comparison leaks information through timing.'
    },
    starterCode: `async function handleWebhook(request: Request) {
  const body = await request.text();
  const payload = JSON.parse(body);
  return processWebhook(payload);
}`,
    solution: `async function handleWebhook(request: Request, secret: string) {
  const body = await request.text();
  const signature = request.headers.get('x-webhook-signature');
  if (!signature) return new Response('Missing signature', { status: 401 });

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expectedHex = Array.from(new Uint8Array(expected)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (signature !== expectedHex) return new Response('Invalid signature', { status: 403 });
  return processWebhook(JSON.parse(body));
}`,
    whyItMatters: 'DRY: Web Crypto API is the platform primitive. Rams: One header, one check, one decision. Heidegger: Verification is a trust boundary — it connects your system to the external world safely.'
  },
  {
    id: 'build-your-own',
    number: 5,
    title: 'Build Your Own',
    pattern: 'All Patterns Combined',
    estimatedMinutes: 45,
    context: {
      situation: 'You have learned four patterns. Now apply them together: build a resilient webhook receiver that verifies signatures, handles errors gracefully, responds within timeout, and retries downstream calls with backoff.',
      task: 'Combine all four patterns into a production-quality webhook handler.',
      notice: 'The integration reveals which patterns complement each other and which create tension.'
    },
    starterCode: `// Combine: getErrorMessage + AbortController + Exponential Backoff + Signature Verification
// Build a production webhook handler that uses all four patterns.
export async function webhookHandler(request: Request) {
  // Your implementation here
}`,
    solution: `// Full integration of all four patterns
export async function webhookHandler(request: Request) {
  // Pattern 4: Signature Verification
  const body = await request.text();
  const sig = request.headers.get('x-webhook-signature');
  if (!sig) return new Response('Unauthorized', { status: 401 });
  // ... verify signature ...

  // Pattern 1: Error Structure
  let payload;
  try { payload = JSON.parse(body); }
  catch (e) { return new Response(getErrorMessage(e), { status: 400 }); }

  // Pattern 2 + 3: Timeout + Retry with Backoff
  const result = await deliverWithRetry(payload);
  return new Response(JSON.stringify(result), { status: result.ok ? 200 : 502 });
}`,
    whyItMatters: 'DRY: Each pattern is a reusable unit. Rams: The combination is clean because each part does one thing. Heidegger: The patterns serve the whole — they create a system greater than its parts.'
  }
];
