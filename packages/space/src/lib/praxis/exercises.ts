/**
 * Integration Praxis: Exercise Definitions
 *
 * Each exercise presents code with a specific flaw.
 * The flaw manifests when you run it. You fix it.
 * Understanding emerges.
 *
 * "Weniger, aber besser" — Less, but better.
 */

export interface Exercise {
	id: string;
	number: number;
	title: string;
	pattern: string;
	estimatedMinutes: number;
	context: {
		situation: string;
		task: string;
		notice: string;
	};
	starterCode: string;
	solution: string;
	validation: {
		mustContain: string[];
		mustNotContain?: string[];
	};
	patternReveal: {
		discovery: string;
		canonicalSolution: string;
		whyItMatters: string;
		reference: string;
		ramsConnection: string;
	};
}

export const exercises: Exercise[] = [
	{
		id: 'error-structure',
		number: 1,
		title: 'The Error Structure',
		pattern: 'Structured Errors',
		estimatedMinutes: 3,
		context: {
			situation:
				'You\'re building an email integration. When Gmail returns an error, users see "[object Object]" instead of useful information.',
			task: 'Fix the error handler to display the actual error message.',
			notice:
				'The ActionResult type has an `error` field. Run the code and observe what `console.log(result.error)` outputs.'
		},
		starterCode: `// Gmail Integration - Error Handler
import { gmail } from '@workwayco/integrations/gmail';

async function sendEmail(to: string, subject: string, body: string) {
  const result = await gmail.send({ to, subject, body });

  if (!result.success) {
    // This returns "[object Object]" to users
    return { error: result.error };
  }

  return { success: true, messageId: result.data.id };
}

// Test: This will fail (invalid email)
const response = await sendEmail('invalid', 'Test', 'Hello');
console.log('Response:', response);`,
		solution: `// Gmail Integration - Error Handler
import { gmail } from '@workwayco/integrations/gmail';
import { getErrorMessage } from '@workwayco/sdk';

async function sendEmail(to: string, subject: string, body: string) {
  const result = await gmail.send({ to, subject, body });

  if (!result.success) {
    // Extract the message from the error object
    return { error: getErrorMessage(result) };
  }

  return { success: true, messageId: result.data.id };
}

// Test: This will fail (invalid email)
const response = await sendEmail('invalid', 'Test', 'Hello');
console.log('Response:', response);`,
		validation: {
			mustContain: ['getErrorMessage', 'result.error.message'],
			mustNotContain: ['return { error: result.error }']
		},
		patternReveal: {
			discovery: 'result.error is { message: string, code: string }, not a string.',
			canonicalSolution: `import { getErrorMessage } from '@workwayco/sdk';

if (!result.success) {
  console.error(getErrorMessage(result));
}`,
			whyItMatters:
				'Structured errors enable programmatic handling. hasErrorCode(result, "RATE_LIMITED") works because the code is accessible, not buried in a string.',
			reference: 'DEVELOPERS.md §2.1',
			ramsConnection: 'Principle 4: Good design makes a product understandable.'
		}
	},
	{
		id: 'timeout',
		number: 2,
		title: 'The Timeout',
		pattern: 'Request Timeout',
		estimatedMinutes: 5,
		context: {
			situation:
				'Your Slack integration is hanging indefinitely when the API is slow. Users report the UI freezes.',
			task: 'Implement a timeout so requests fail gracefully after 10 seconds.',
			notice:
				'The fetch API does not have built-in timeout. Run the code against a slow endpoint and observe what happens.'
		},
		starterCode: `// Slack Integration - No Timeout
async function postMessage(channel: string, text: string) {
  // This request has no timeout - it could hang forever
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.SLACK_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ channel, text })
  });

  return response.json();
}

// Test: Simulating a slow API
console.log('Sending message...');
const result = await postMessage('#general', 'Hello');
console.log('Result:', result);`,
		solution: `// Slack Integration - With Timeout
async function postMessage(channel: string, text: string) {
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.SLACK_TOKEN}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, text }),
      signal: controller.signal
    });

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      return { error: 'Request timed out after 10 seconds' };
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Test: Simulating a slow API
console.log('Sending message...');
const result = await postMessage('#general', 'Hello');
console.log('Result:', result);`,
		validation: {
			mustContain: ['AbortController', 'setTimeout', 'signal', 'clearTimeout'],
			mustNotContain: []
		},
		patternReveal: {
			discovery: 'fetch() has no built-in timeout. AbortController is required.',
			canonicalSolution: `const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, { signal: controller.signal });
  return response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    return { error: 'Request timed out' };
  }
  throw error;
} finally {
  clearTimeout(timeoutId);
}`,
			whyItMatters:
				'Without timeouts, a slow or unresponsive API can hang your entire application. Users experience frozen UIs. Resources are never released.',
			reference: 'DEVELOPERS.md §3.2',
			ramsConnection: 'Principle 7: Good design is long-lasting. Robust patterns endure.'
		}
	},
	{
		id: 'retry',
		number: 3,
		title: 'The Retry Storm',
		pattern: 'Exponential Backoff',
		estimatedMinutes: 7,
		context: {
			situation:
				'Your Stripe integration is hitting rate limits. Immediate retries are making it worse—each retry triggers another 429.',
			task: 'Implement exponential backoff with jitter to handle rate limits gracefully.',
			notice:
				'Run the code and observe the cascade of 429 errors. Naive retry amplifies the problem.'
		},
		starterCode: `// Stripe Integration - Naive Retry
async function createCustomer(email: string) {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.STRIPE_KEY}\`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: \`email=\${email}\`
    });

    if (response.ok) {
      return response.json();
    }

    // Naive: retry immediately
    console.log(\`Attempt \${attempt + 1} failed, retrying...\`);
  }

  return { error: 'Max retries exceeded' };
}

// Test: This will trigger rate limiting
const result = await createCustomer('test@example.com');
console.log('Result:', result);`,
		solution: `// Stripe Integration - Exponential Backoff
async function createCustomer(email: string) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.STRIPE_KEY}\`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: \`email=\${email}\`
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 429) {
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = delay * 0.2 * Math.random();
      const waitTime = delay + jitter;

      console.log(\`Rate limited. Waiting \${Math.round(waitTime)}ms...\`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    // Non-retryable error
    return { error: \`Failed with status \${response.status}\` };
  }

  return { error: 'Max retries exceeded' };
}

// Test: This will trigger rate limiting
const result = await createCustomer('test@example.com');
console.log('Result:', result);`,
		validation: {
			mustContain: ['Math.pow(2', 'jitter', 'setTimeout', '429'],
			mustNotContain: []
		},
		patternReveal: {
			discovery:
				'Immediate retry amplifies rate limiting. Exponential backoff with jitter distributes load.',
			canonicalSolution: `const delay = baseDelay * Math.pow(2, attempt);
const jitter = delay * 0.2 * Math.random();
await new Promise(r => setTimeout(r, delay + jitter));`,
			whyItMatters:
				'Without backoff, N clients retrying immediately create a "thundering herd" that overwhelms the API. Jitter prevents synchronized retries.',
			reference: 'DEVELOPERS.md §3.3',
			ramsConnection:
				'Principle 9: Good design is environmentally friendly. Backoff respects shared resources.'
		}
	},
	{
		id: 'webhook-security',
		number: 4,
		title: 'The Webhook Breach',
		pattern: 'Signature Verification',
		estimatedMinutes: 5,
		context: {
			situation:
				'Your Stripe webhook endpoint accepts any payload. An attacker could forge payment success events.',
			task: 'Verify the webhook signature before processing the event.',
			notice:
				'The signature is in the Stripe-Signature header. Run the code with a forged payload and observe it being accepted.'
		},
		starterCode: `// Stripe Webhook - No Verification
async function handleWebhook(request: Request) {
  const payload = await request.text();
  const event = JSON.parse(payload);

  // DANGER: No signature verification!
  // Anyone can forge a payment.succeeded event

  if (event.type === 'payment_intent.succeeded') {
    console.log('Payment received:', event.data.object.amount);
    await fulfillOrder(event.data.object.id);
  }

  return new Response('OK');
}

async function fulfillOrder(paymentId: string) {
  console.log('Fulfilling order for payment:', paymentId);
}

// Test: Simulating a forged webhook
const forgedRequest = new Request('https://example.com/webhook', {
  method: 'POST',
  body: JSON.stringify({
    type: 'payment_intent.succeeded',
    data: { object: { id: 'fake_123', amount: 99999 } }
  })
});

await handleWebhook(forgedRequest);`,
		solution: `// Stripe Webhook - With Signature Verification
import { stripe } from '@workwayco/integrations/stripe';

async function handleWebhook(request: Request, webhookSecret: string) {
  const payload = await request.text();
  const signature = request.headers.get('Stripe-Signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  // Verify signature before processing
  const result = await stripe.parseWebhookEvent(
    payload,
    signature,
    webhookSecret
  );

  if (!result.success) {
    console.error('Invalid signature:', result.error.message);
    return new Response('Invalid signature', { status: 401 });
  }

  const event = result.data;

  if (event.type === 'payment_intent.succeeded') {
    console.log('Payment received:', event.data.object.amount);
    await fulfillOrder(event.data.object.id);
  }

  return new Response('OK');
}

async function fulfillOrder(paymentId: string) {
  console.log('Fulfilling order for payment:', paymentId);
}

// Test: Forged webhook will now be rejected
const forgedRequest = new Request('https://example.com/webhook', {
  method: 'POST',
  body: JSON.stringify({
    type: 'payment_intent.succeeded',
    data: { object: { id: 'fake_123', amount: 99999 } }
  })
});

await handleWebhook(forgedRequest, 'whsec_test');`,
		validation: {
			mustContain: ['parseWebhookEvent', 'Stripe-Signature', 'webhookSecret'],
			mustNotContain: []
		},
		patternReveal: {
			discovery:
				'Webhooks without signature verification are security vulnerabilities. Always verify before processing.',
			canonicalSolution: `const result = await stripe.parseWebhookEvent(
  payload,
  signature,
  webhookSecret
);

if (!result.success) {
  return new Response('Invalid signature', { status: 401 });
}`,
			whyItMatters:
				'Without verification, attackers can forge events—triggering order fulfillment, granting access, or corrupting data.',
			reference: 'DEVELOPERS.md §4.1',
			ramsConnection: 'Principle 6: Good design is honest. Security cannot be faked.'
		}
	},
	{
		id: 'build-integration',
		number: 5,
		title: 'Build Your Own',
		pattern: 'All Patterns Combined',
		estimatedMinutes: 15,
		context: {
			situation:
				'You need to build a new integration from scratch. Apply all the patterns you\'ve learned.',
			task: 'Complete the integration template with proper error handling, timeout, and retry logic.',
			notice:
				'The template has TODO comments marking where each pattern should be applied. This is how real integrations are built.'
		},
		starterCode: `// Custom Integration Template
// Apply all patterns: error structure, timeout, retry, capabilities

import { ActionResult, createActionResult, getErrorMessage } from '@workwayco/sdk';

interface Config {
  apiKey: string;
  timeout?: number;
}

class CustomIntegration {
  private apiKey: string;
  private timeout: number;

  constructor(config: Config) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
  }

  async getResource(id: string): Promise<ActionResult<{ id: string; name: string }>> {
    // TODO: Implement with timeout (AbortController)
    // TODO: Implement retry with exponential backoff
    // TODO: Return proper ActionResult with error structure

    const response = await fetch(\`https://api.example.com/resources/\${id}\`, {
      headers: { 'Authorization': \`Bearer \${this.apiKey}\` }
    });

    if (!response.ok) {
      // TODO: Handle error properly
      throw new Error('Request failed');
    }

    return response.json();
  }

  getCapabilities() {
    // TODO: Be honest about capabilities
    return {
      canHandleText: true,
      canHandleAttachments: true, // Is this honest?
    };
  }
}

// Test your implementation
const client = new CustomIntegration({ apiKey: 'test_key' });
const result = await client.getResource('123');
console.log('Result:', result);`,
		solution: `// Custom Integration Template - Complete
import {
  ActionResult,
  createActionResult,
  getErrorMessage,
  ErrorCode
} from '@workwayco/sdk';

interface Config {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
}

class CustomIntegration {
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: Config) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  async getResource(id: string): Promise<ActionResult<{ id: string; name: string }>> {
    const baseDelay = 1000;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      // Timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(\`https://api.example.com/resources/\${id}\`, {
          headers: { 'Authorization': \`Bearer \${this.apiKey}\` },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return createActionResult({
            data,
            integration: 'custom',
            action: 'get-resource',
            schema: 'custom.resource.v1',
            capabilities: this.getCapabilities()
          });
        }

        // Handle rate limiting with backoff
        if (response.status === 429) {
          const delay = baseDelay * Math.pow(2, attempt);
          const jitter = delay * 0.2 * Math.random();
          await new Promise(r => setTimeout(r, delay + jitter));
          continue;
        }

        // Non-retryable error
        return ActionResult.error(
          \`API error: \${response.status}\`,
          ErrorCode.API_ERROR,
          { integration: 'custom', action: 'get-resource' }
        );

      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          return ActionResult.error(
            'Request timed out',
            ErrorCode.TIMEOUT,
            { integration: 'custom', action: 'get-resource' }
          );
        }
        throw error;
      }
    }

    return ActionResult.error(
      'Max retries exceeded',
      ErrorCode.RATE_LIMITED,
      { integration: 'custom', action: 'get-resource' }
    );
  }

  getCapabilities() {
    // Honest capabilities declaration
    return {
      canHandleText: true,
      canHandleAttachments: false, // Only claim what we implement
      supportsPagination: false,
      supportsMetadata: true
    };
  }
}

// Test your implementation
const client = new CustomIntegration({ apiKey: 'test_key' });
const result = await client.getResource('123');
console.log('Result:', result);`,
		validation: {
			mustContain: [
				'AbortController',
				'Math.pow(2',
				'createActionResult',
				'canHandleAttachments: false'
			],
			mustNotContain: ['canHandleAttachments: true', 'throw new Error']
		},
		patternReveal: {
			discovery: 'Production integrations combine all patterns: structured errors, timeout, retry, honest capabilities.',
			canonicalSolution: `// The complete pattern:
// 1. AbortController for timeout
// 2. Retry loop with exponential backoff
// 3. ActionResult for structured output
// 4. Honest capabilities declaration`,
			whyItMatters:
				'Each pattern addresses a specific failure mode. Combined, they create robust integrations that handle the realities of distributed systems.',
			reference: 'DEVELOPERS.md (all sections)',
			ramsConnection:
				'Principle 8: Good design is thorough. Every detail matters, down to the last detail.'
		}
	}
];

export function getExercise(id: string): Exercise | undefined {
	return exercises.find((e) => e.id === id);
}

export function getExerciseByNumber(num: number): Exercise | undefined {
	return exercises.find((e) => e.number === num);
}
