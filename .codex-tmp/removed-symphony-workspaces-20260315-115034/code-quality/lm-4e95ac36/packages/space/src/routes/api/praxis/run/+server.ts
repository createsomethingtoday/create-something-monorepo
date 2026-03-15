/**
 * Praxis Code Execution API
 *
 * Validates code against expected patterns and simulates execution.
 * Now with graded validation applying the Subtractive Triad.
 *
 * "Weniger, aber besser"
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { getExercise, type GradedValidation, type ValidationGrade } from '$lib/praxis/exercises';

interface RunRequest {
	exerciseId: string;
	code: string;
}

interface TriadFeedback {
	level: 'dry' | 'rams' | 'heidegger';
	feedback: string;
}

interface GradedResult {
	valid: boolean;
	grade: ValidationGrade;
	missing: string[];
	prohibited: string[];
	triadFeedback?: TriadFeedback;
}

export async function POST({ request }: RequestEvent) {
	try {
		const { exerciseId, code } = (await request.json()) as RunRequest;

		const exercise = getExercise(exerciseId);
		if (!exercise) {
			return json({ success: false, error: 'Exercise not found' });
		}

		// Check for empty or minimal code
		const trimmedCode = code.trim();
		if (trimmedCode.length < 50) {
			return json({
				success: true,
				output: ['⚠ No code to run.', '', 'Write your solution and click Run.'],
				valid: false,
				grade: 'bug' as ValidationGrade
			});
		}

		// Graded validation with Subtractive Triad audit
		const graded = validateCodeGraded(code, exercise.validation);

		// Simulate execution based on validation state
		const result = simulateExecution(exerciseId, code, graded);

		return json({
			success: true,
			output: result.output,
			valid: graded.valid,
			grade: graded.grade,
			triadFeedback: graded.triadFeedback,
			hint: graded.valid ? undefined : result.hint
		});
	} catch (err) {
		return json({
			success: false,
			error: err instanceof Error ? err.message : 'Execution failed'
		});
	}
}

/**
 * Graded Validation with Subtractive Triad Audit
 *
 * Returns not just valid/invalid, but a grade and triad feedback:
 * - bug: Code has the original problem
 * - valid: Works but may have triad violations
 * - canonical: Uses the preferred pattern
 * - over_engineered: Works but has unnecessary complexity
 */
function validateCodeGraded(code: string, validation: GradedValidation): GradedResult {
	const missing: string[] = [];
	const prohibited: string[] = [];
	let hasAnyRequired = true;

	// ALL mustContain patterns must be present
	for (const pattern of validation.mustContain) {
		if (!code.includes(pattern)) {
			missing.push(pattern);
		}
	}

	// At least ONE of mustContainAny patterns must be present
	if (validation.mustContainAny && validation.mustContainAny.length > 0) {
		hasAnyRequired = validation.mustContainAny.some((pattern) => code.includes(pattern));
		if (!hasAnyRequired) {
			missing.push(`one of: ${validation.mustContainAny.join(' or ')}`);
		}
	}

	// No mustNotContain patterns should be present
	if (validation.mustNotContain) {
		for (const pattern of validation.mustNotContain) {
			if (code.includes(pattern)) {
				prohibited.push(pattern);
			}
		}
	}

	const baseValid = missing.length === 0 && prohibited.length === 0 && hasAnyRequired;

	// If not valid, it's a bug
	if (!baseValid) {
		return { valid: false, grade: 'bug', missing, prohibited };
	}

	// Now apply Subtractive Triad audit
	let triadFeedback: TriadFeedback | undefined;
	let grade: ValidationGrade = 'valid';

	// Check for canonical pattern (Heidegger: connection to system)
	const isCanonical = validation.canonical ? code.includes(validation.canonical) : true;

	if (validation.triad) {
		// Check Rams: Over-engineering (highest priority feedback)
		if (validation.triad.overEngineering) {
			const hasOverEngineering = validation.triad.overEngineering.patterns.some((p) =>
				code.includes(p)
			);
			if (hasOverEngineering) {
				grade = 'over_engineered';
				triadFeedback = {
					level: 'rams',
					feedback: validation.triad.overEngineering.feedback
				};
			}
		}

		// Check DRY: Duplication (if no over-engineering found)
		if (!triadFeedback && validation.triad.duplication) {
			const hasDuplication = validation.triad.duplication.patterns.some((p) => code.includes(p));
			if (hasDuplication) {
				triadFeedback = {
					level: 'dry',
					feedback: validation.triad.duplication.feedback
				};
			}
		}

		// Check Heidegger: Disconnection (if valid but not canonical)
		if (!triadFeedback && validation.triad.disconnection && !isCanonical) {
			const usesDisconnectedPattern = validation.triad.disconnection.patterns.some((p) =>
				code.includes(p)
			);
			if (usesDisconnectedPattern) {
				triadFeedback = {
					level: 'heidegger',
					feedback: validation.triad.disconnection.feedback
				};
			}
		}
	}

	// Determine final grade
	if (grade !== 'over_engineered') {
		grade = isCanonical ? 'canonical' : 'valid';
	}

	return {
		valid: true,
		grade,
		missing,
		prohibited,
		triadFeedback
	};
}

function simulateExecution(
	exerciseId: string,
	code: string,
	graded: GradedResult
): { output: string[]; hint?: string } {
	switch (exerciseId) {
		case 'error-structure':
			return simulateErrorStructure(code, graded);
		case 'timeout':
			return simulateTimeout(code, graded);
		case 'retry':
			return simulateRetry(code, graded);
		case 'webhook-security':
			return simulateWebhookSecurity(code, graded);
		case 'build-integration':
			return simulateBuildIntegration(code, graded);
		default:
			return { output: ['Unknown exercise'] };
	}
}

function simulateErrorStructure(code: string, graded: GradedResult): { output: string[]; hint?: string } {
	const baseOutput = ['Sending email to: invalid', 'Gmail API returned error...', ''];

	if (graded.valid) {
		const successOutput = [
			...baseOutput,
			'Response: { error: "Invalid email address format" }',
			''
		];

		// Grade-specific messages
		switch (graded.grade) {
			case 'canonical':
				return {
					output: [...successOutput, '✓ Canonical pattern! getErrorMessage() unifies error extraction.']
				};
			case 'over_engineered':
				return {
					output: [
						...successOutput,
						'✓ Error is readable.',
						'',
						`⚡ Subtractive Triad: ${graded.triadFeedback?.feedback || 'Consider simplifying.'}`
					]
				};
			case 'valid':
				if (graded.triadFeedback) {
					return {
						output: [
							...successOutput,
							'✓ Error is readable.',
							'',
							`💡 ${graded.triadFeedback.feedback}`
						]
					};
				}
				return {
					output: [...successOutput, '✓ Error message is now readable!']
				};
			default:
				return {
					output: [...successOutput, '✓ Error message is now readable!']
				};
		}
	}

	// Bug cases
	if (code.includes('return { error: result.error }')) {
		return {
			output: [
				...baseOutput,
				'Response: { error: [object Object] }',
				'',
				'⚠ The error is not readable.',
				'result.error is an object { message, code }, not a string.'
			],
			hint: 'Try result.error.message or getErrorMessage(result)'
		};
	}

	return {
		output: [
			...baseOutput,
			'Response: { error: [object Object] }',
			'',
			'⚠ Error handling incomplete.',
			'',
			'Required: getErrorMessage() or result.error.message'
		],
		hint: 'Import getErrorMessage from @workwayco/sdk'
	};
}

function simulateTimeout(code: string, graded: GradedResult): { output: string[]; hint?: string } {
	if (graded.valid) {
		const successOutput = [
			'Sending message to #general...',
			'',
			'Request timed out after 10 seconds',
			''
		];

		if (graded.grade === 'canonical') {
			return {
				output: [...successOutput, '✓ Timeout handled gracefully!', 'Users see an error message instead of a frozen UI.']
			};
		}
		if (graded.triadFeedback) {
			return {
				output: [...successOutput, '✓ Timeout works.', '', `💡 ${graded.triadFeedback.feedback}`]
			};
		}
		return {
			output: [...successOutput, '✓ Timeout handled gracefully!', 'Users see an error message instead of a frozen UI.']
		};
	}

	const hasAbort = code.includes('AbortController');
	const hasSignal = code.includes('signal');
	const hasTimeout = code.includes('setTimeout');

	if (!hasAbort) {
		return {
			output: [
				'Sending message to #general...',
				'',
				'⏳ Waiting for response...',
				'⏳ Still waiting...',
				'⏳ API is not responding...',
				'',
				'⚠ Request has no timeout.',
				'In production, this would hang indefinitely.'
			],
			hint: 'Create an AbortController and pass its signal to fetch'
		};
	}

	if (!hasSignal || !hasTimeout) {
		return {
			output: [
				'Sending message to #general...',
				'',
				'⚠ Timeout implementation incomplete.',
				'',
				`${hasAbort ? '✓' : '❌'} AbortController created`,
				`${hasSignal ? '✓' : '❌'} signal passed to fetch`,
				`${hasTimeout ? '✓' : '❌'} setTimeout to trigger abort`
			],
			hint: hasSignal ? 'Add setTimeout to abort after delay' : 'Pass signal to fetch options'
		};
	}

	return {
		output: ['⚠ Check your implementation'],
		hint: 'Review AbortController, signal, and setTimeout usage'
	};
}

function simulateRetry(code: string, graded: GradedResult): { output: string[]; hint?: string } {
	if (graded.valid) {
		const successOutput = [
			'Creating customer: test@example.com',
			'',
			'Attempt 1 failed: 429 Too Many Requests',
			'Rate limited. Waiting 1247ms...',
			'Attempt 2 succeeded!',
			'',
			'Customer created: cus_abc123',
			''
		];

		if (graded.grade === 'canonical') {
			return {
				output: [...successOutput, '✓ Exponential backoff with jitter implemented!']
			};
		}
		if (graded.triadFeedback) {
			return {
				output: [...successOutput, '✓ Retry logic works.', '', `💡 ${graded.triadFeedback.feedback}`]
			};
		}
		return {
			output: [...successOutput, '✓ Exponential backoff with jitter implemented!']
		};
	}

	const hasPow = code.includes('Math.pow');
	const hasRandom = code.includes('random') || code.includes('jitter');

	if (!hasPow) {
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
				'Immediate retries amplify rate limiting.'
			],
			hint: 'Use exponential backoff: delay = baseDelay * Math.pow(2, attempt)'
		};
	}

	if (!hasRandom) {
		return {
			output: [
				'Creating customer: test@example.com',
				'',
				'Attempt 1 failed: 429 Too Many Requests',
				'Waiting 1000ms...',
				'Attempt 2 succeeded!',
				'',
				'✓ Backoff works, but needs jitter.',
				'',
				'Without jitter, synchronized clients create thundering herd.'
			],
			hint: 'Add jitter: delay + (delay * 0.2 * Math.random())'
		};
	}

	return {
		output: ['⚠ Check your retry implementation'],
		hint: 'Ensure Math.pow(2, attempt) and jitter are both used'
	};
}

function simulateWebhookSecurity(code: string, graded: GradedResult): { output: string[]; hint?: string } {
	if (graded.valid) {
		const successOutput = [
			'Received webhook...',
			'Verifying signature...',
			'',
			'❌ Invalid webhook signature',
			'',
			'Forged request rejected.',
			''
		];

		if (graded.grade === 'canonical') {
			return {
				output: [...successOutput, '✓ Webhook verification working correctly!']
			};
		}
		if (graded.triadFeedback) {
			return {
				output: [...successOutput, '✓ Webhook secure.', '', `💡 ${graded.triadFeedback.feedback}`]
			};
		}
		return {
			output: [...successOutput, '✓ Webhook verification working correctly!']
		};
	}

	const hasSignatureCheck = code.includes('Stripe-Signature');
	const hasParseWebhook = code.includes('parseWebhookEvent');

	if (!hasSignatureCheck && !hasParseWebhook) {
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
				'This webhook was forged. No signature verification.'
			],
			hint: 'Get the Stripe-Signature header and verify it'
		};
	}

	return {
		output: [
			'Received webhook...',
			'',
			'⚠ Verification incomplete.',
			'',
			`${hasSignatureCheck ? '✓' : '❌'} Stripe-Signature header checked`,
			`${hasParseWebhook ? '✓' : '❌'} parseWebhookEvent used`
		],
		hint: hasParseWebhook ? 'Pass signature header to parseWebhookEvent' : 'Use stripe.parseWebhookEvent()'
	};
}

function simulateBuildIntegration(code: string, graded: GradedResult): { output: string[]; hint?: string } {
	const checks = [
		{ name: 'AbortController timeout', present: code.includes('AbortController') },
		{ name: 'Exponential backoff', present: code.includes('Math.pow(2') },
		{ name: 'createActionResult', present: code.includes('createActionResult') },
		{ name: 'Honest capabilities', present: !code.includes('canHandleAttachments: true') },
		{ name: 'No throw errors', present: !code.includes('throw new Error') }
	];

	const passed = checks.filter((c) => c.present).length;

	if (graded.valid) {
		const successOutput = [
			'Building integration...',
			'',
			...checks.map((c) => `✓ ${c.name}`),
			'',
			'Testing against simulated API...',
			'',
			'GET /resources/123',
			'Response: { success: true, data: { id: "123", name: "Test Resource" } }',
			''
		];

		if (graded.grade === 'canonical') {
			return {
				output: [...successOutput, '✓ Integration complete! All patterns implemented correctly.']
			};
		}
		if (graded.triadFeedback) {
			return {
				output: [...successOutput, '✓ Integration works.', '', `💡 ${graded.triadFeedback.feedback}`]
			};
		}
		return {
			output: [...successOutput, '✓ Integration complete!']
		};
	}

	const failed = checks.filter((c) => !c.present);

	return {
		output: [
			'Building integration...',
			'',
			...checks.map((c) => `${c.present ? '✓' : '❌'} ${c.name}`),
			'',
			`${passed}/5 patterns implemented`
		],
		hint: failed[0]?.name
	};
}
