/**
 * Praxis Code Execution API
 *
 * Simulates WORKWAY SDK behavior for each exercise.
 * Validates code against expected patterns.
 *
 * This is not a full sandbox—it's a teaching tool.
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { getExercise } from '$lib/praxis/exercises';

interface RunRequest {
	exerciseId: string;
	code: string;
}

export async function POST({ request }: RequestEvent) {
	try {
		const { exerciseId, code } = (await request.json()) as RunRequest;

		const exercise = getExercise(exerciseId);
		if (!exercise) {
			return json({ success: false, error: 'Exercise not found' });
		}

		// Simulate execution based on exercise
		const result = simulateExecution(exerciseId, code);

		// Validate against expected patterns
		const valid = validateCode(code, exercise.validation);

		return json({
			success: true,
			output: result.output,
			valid,
			hint: result.hint
		});
	} catch (err) {
		return json({
			success: false,
			error: err instanceof Error ? err.message : 'Execution failed'
		});
	}
};

function simulateExecution(
	exerciseId: string,
	code: string
): { output: string[]; hint?: string } {
	switch (exerciseId) {
		case 'error-structure':
			return simulateErrorStructure(code);
		case 'timeout':
			return simulateTimeout(code);
		case 'retry':
			return simulateRetry(code);
		case 'webhook-security':
			return simulateWebhookSecurity(code);
		case 'build-integration':
			return simulateBuildIntegration(code);
		default:
			return { output: ['Unknown exercise'] };
	}
}

function simulateErrorStructure(code: string): { output: string[]; hint?: string } {
	// Check if they're returning raw error object
	if (code.includes('return { error: result.error }') && !code.includes('result.error.message')) {
		return {
			output: [
				'Sending email to: invalid',
				'Gmail API returned error...',
				'',
				'Response: { error: [object Object] }',
				'',
				'⚠ The error is not readable. result.error is an object, not a string.'
			],
			hint: 'Try accessing result.error.message or use getErrorMessage(result)'
		};
	}

	// Check if they fixed it
	if (code.includes('getErrorMessage') || code.includes('result.error.message')) {
		return {
			output: [
				'Sending email to: invalid',
				'Gmail API returned error...',
				'',
				'Response: { error: "Invalid email address format" }',
				'',
				'✓ Error message is now readable!'
			]
		};
	}

	return {
		output: [
			'Sending email to: invalid',
			'Gmail API returned error...',
			'',
			'Response: { error: [object Object] }',
			'',
			'⚠ The error is still not readable.'
		]
	};
}

function simulateTimeout(code: string): { output: string[]; hint?: string } {
	// Check if they have no timeout
	if (!code.includes('AbortController') && !code.includes('signal')) {
		return {
			output: [
				'Sending message to #general...',
				'',
				'⏳ Waiting for response...',
				'⏳ Still waiting...',
				'⏳ API is not responding...',
				'',
				'⚠ Request has no timeout. In production, this would hang indefinitely.',
				'',
				'Users would see a frozen UI.'
			],
			hint: 'Use AbortController to add a timeout to the fetch request'
		};
	}

	// Check if they implemented timeout correctly
	if (code.includes('AbortController') && code.includes('setTimeout') && code.includes('signal')) {
		return {
			output: [
				'Sending message to #general...',
				'',
				'Request timed out after 10 seconds',
				'',
				'✓ Timeout handled gracefully!',
				'Users see an error message instead of a frozen UI.'
			]
		};
	}

	return {
		output: [
			'Sending message to #general...',
			'',
			'⚠ Timeout implementation incomplete.',
			'',
			'Check: AbortController, setTimeout, signal, clearTimeout'
		]
	};
}

function simulateRetry(code: string): { output: string[]; hint?: string } {
	// Check for naive immediate retry
	if (!code.includes('Math.pow') && !code.includes('backoff')) {
		return {
			output: [
				'Creating customer: test@example.com',
				'',
				'Attempt 1 failed: 429 Too Many Requests',
				'Retrying immediately...',
				'Attempt 2 failed: 429 Too Many Requests',
				'Retrying immediately...',
				'Attempt 3 failed: 429 Too Many Requests',
				'',
				'⚠ Max retries exceeded.',
				'',
				'Immediate retries amplify rate limiting.',
				'Each retry hit the rate limit again.'
			],
			hint: 'Implement exponential backoff: delay = baseDelay * Math.pow(2, attempt)'
		};
	}

	// Check for exponential backoff without jitter
	if (code.includes('Math.pow') && !code.includes('jitter') && !code.includes('random')) {
		return {
			output: [
				'Creating customer: test@example.com',
				'',
				'Attempt 1 failed: 429 Too Many Requests',
				'Waiting 1000ms...',
				'Attempt 2 failed: 429 Too Many Requests',
				'Waiting 2000ms...',
				'Attempt 3 succeeded!',
				'',
				'✓ Backoff works, but consider adding jitter.',
				'',
				'Without jitter, synchronized clients still create thundering herd.'
			]
		};
	}

	// Full implementation with jitter
	if (code.includes('Math.pow') && (code.includes('jitter') || code.includes('random'))) {
		return {
			output: [
				'Creating customer: test@example.com',
				'',
				'Attempt 1 failed: 429 Too Many Requests',
				'Rate limited. Waiting 1247ms...',
				'Attempt 2 succeeded!',
				'',
				'Customer created: cus_abc123',
				'',
				'✓ Exponential backoff with jitter implemented correctly!'
			]
		};
	}

	return {
		output: ['Check your retry implementation']
	};
}

function simulateWebhookSecurity(code: string): { output: string[]; hint?: string } {
	// Check for no verification
	if (!code.includes('parseWebhookEvent') && !code.includes('Stripe-Signature')) {
		return {
			output: [
				'Received webhook...',
				'Event type: payment_intent.succeeded',
				'Amount: $999.99',
				'',
				'Fulfilling order for payment: fake_123',
				'Order fulfilled!',
				'',
				'⚠ SECURITY VULNERABILITY',
				'',
				'This webhook was forged. No signature verification.',
				'An attacker could trigger order fulfillment without payment.'
			],
			hint: 'Verify the Stripe-Signature header before processing'
		};
	}

	// Check for proper verification
	if (code.includes('parseWebhookEvent') && code.includes('Stripe-Signature')) {
		return {
			output: [
				'Received webhook...',
				'Verifying signature...',
				'',
				'❌ Invalid webhook signature',
				'',
				'Forged request rejected.',
				'',
				'✓ Webhook verification working correctly!',
				'Only signed requests from Stripe will be processed.'
			]
		};
	}

	return {
		output: ['Check your webhook verification implementation']
	};
}

function simulateBuildIntegration(code: string): { output: string[]; hint?: string } {
	const issues: string[] = [];

	if (!code.includes('AbortController')) {
		issues.push('❌ Missing timeout (AbortController)');
	}
	if (!code.includes('Math.pow(2')) {
		issues.push('❌ Missing exponential backoff');
	}
	if (!code.includes('createActionResult')) {
		issues.push('❌ Not using createActionResult');
	}
	if (code.includes('canHandleAttachments: true')) {
		issues.push('❌ Capabilities overstatement (canHandleAttachments should be false)');
	}
	if (code.includes('throw new Error')) {
		issues.push('❌ Throwing errors instead of returning ActionResult');
	}

	if (issues.length === 0) {
		return {
			output: [
				'Building integration...',
				'',
				'✓ AbortController timeout: implemented',
				'✓ Exponential backoff: implemented',
				'✓ ActionResult: properly structured',
				'✓ Capabilities: honest declaration',
				'',
				'Testing against simulated API...',
				'',
				'GET /resources/123',
				'Response: { success: true, data: { id: "123", name: "Test Resource" } }',
				'',
				'✓ Integration complete!',
				'',
				'All patterns implemented correctly.',
				'This integration is production-ready.'
			]
		};
	}

	return {
		output: [
			'Building integration...',
			'',
			'Issues found:',
			'',
			...issues,
			'',
			`${5 - issues.length}/5 patterns implemented`
		],
		hint: issues[0].replace('❌ ', '')
	};
}

function validateCode(
	code: string,
	validation: { mustContain: string[]; mustNotContain?: string[] }
): boolean {
	// Check mustContain - at least one must be present
	const hasRequired = validation.mustContain.some((pattern) => code.includes(pattern));

	// Check mustNotContain
	const hasProhibited = validation.mustNotContain?.some((pattern) => code.includes(pattern));

	return hasRequired && !hasProhibited;
}
