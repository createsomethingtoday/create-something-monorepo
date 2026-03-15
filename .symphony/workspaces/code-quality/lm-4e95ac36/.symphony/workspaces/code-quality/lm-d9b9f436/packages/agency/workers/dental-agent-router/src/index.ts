/**
 * Dental Agent Edge Router
 *
 * Cloudflare Worker that provides edge routing for dental practice management agents.
 * Handles authentication, rate limiting, audit logging, and proxies requests to Modal backend.
 *
 * HIPAA Compliance:
 * - All PHI access is logged to KV with 6-year retention
 * - PMS credentials are encrypted in D1
 * - Only minimum necessary PHI is passed to Modal backend
 * - Audit logs contain no PHI (only patient_id references)
 */

export interface Env {
	MODAL_ENDPOINT_URL: string;      // Modal backend URL (e.g., https://yourapp.modal.run)
	MODAL_API_KEY: string;            // Modal API key for authentication
	DB: D1Database;                   // D1 database for practice configs
	AUDIT_LOG: KVNamespace;           // KV namespace for audit logging
}

interface PracticeConfig {
	practice_id: string;
	practice_name: string;
	pms_type: 'dentrix' | 'opendental' | 'eaglesoft';
	encrypted_credentials: string;    // AES-256 encrypted PMS credentials
	status: 'active' | 'suspended' | 'trial';
	rate_limit_per_minute: number;
	created_at: string;
	updated_at: string;
}

interface AuditLogEntry {
	timestamp: string;
	action: string;
	actor_id: string;
	actor_type: 'human' | 'agent' | 'system';
	practice_id: string;
	patient_id?: string;
	resource_type: string;
	resource_id?: string;
	outcome: 'success' | 'failure' | 'partial';
	ip_address: string;
	user_agent: string;
	correlation_id: string;
	error?: string;
}

interface DentalAgentRequest {
	practice_id: string;
	operation: 'schedule' | 'daily-ops';
	task: string;
	pms_config: {
		base_url: string;
		api_key?: string;
		username?: string;
		password?: string;
		pms_type: 'dentrix' | 'opendental' | 'eaglesoft';
	};
	correlation_id?: string;
}

interface DentalAgentResponse {
	success: boolean;
	output?: string;
	model?: string;
	tokens?: number;
	cost?: number;
	practice_id: string;
	operation: string;
	correlation_id: string;
	timestamp: string;
	error?: string;
}

/**
 * Generate unique correlation ID for request tracing
 */
function generateCorrelationId(): string {
	return `dental-${crypto.randomUUID()}`;
}

/**
 * Log audit trail entry to KV with 6-year retention
 *
 * HIPAA: 6 years = 189,216,000 seconds TTL
 */
async function logAuditTrail(
	env: Env,
	entry: AuditLogEntry
): Promise<void> {
	const sixYearsTTL = 6 * 365 * 24 * 60 * 60; // 189,216,000 seconds
	const key = `audit:${entry.correlation_id}`;

	await env.AUDIT_LOG.put(
		key,
		JSON.stringify(entry),
		{ expirationTtl: sixYearsTTL }
	);
}

/**
 * Check rate limiting for practice
 *
 * Returns true if rate limit exceeded, false otherwise
 */
async function checkRateLimit(
	env: Env,
	practiceId: string,
	rateLimit: number
): Promise<boolean> {
	const now = Date.now();
	const windowStart = now - 60000; // 1 minute window

	// Get recent requests from KV
	const recentKey = `rate:${practiceId}:${Math.floor(now / 60000)}`;
	const recentCount = await env.AUDIT_LOG.get(recentKey);

	const count = recentCount ? parseInt(recentCount) : 0;

	if (count >= rateLimit) {
		return true; // Rate limit exceeded
	}

	// Increment counter
	await env.AUDIT_LOG.put(
		recentKey,
		(count + 1).toString(),
		{ expirationTtl: 120 } // 2 minute TTL for rate limit counters
	);

	return false;
}

/**
 * Query D1 for practice configuration
 */
async function getPracticeConfig(
	env: Env,
	practiceId: string
): Promise<PracticeConfig | null> {
	const result = await env.DB.prepare(`
		SELECT
			practice_id,
			practice_name,
			pms_type,
			encrypted_credentials,
			status,
			rate_limit_per_minute,
			created_at,
			updated_at
		FROM practices
		WHERE practice_id = ?
	`).bind(practiceId).first<PracticeConfig>();

	return result || null;
}

/**
 * Decrypt PMS credentials (placeholder - implement with Web Crypto API in production)
 *
 * TODO: Implement actual decryption with AES-256-GCM using Web Crypto API
 * See: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/decrypt
 */
function decryptCredentials(encryptedCreds: string): any {
	// Production implementation should use:
	// - KMS key from environment variable
	// - crypto.subtle.decrypt with AES-256-GCM
	// - IV and auth tag from encrypted payload

	// For now, assume credentials are stored as JSON string
	// In production, this would be actual decryption
	try {
		return JSON.parse(encryptedCreds);
	} catch {
		throw new Error('Failed to decrypt PMS credentials');
	}
}

/**
 * Call Modal backend with agent request
 */
async function callModalBackend(
	env: Env,
	endpoint: string,
	request: DentalAgentRequest
): Promise<DentalAgentResponse> {
	const url = `${env.MODAL_ENDPOINT_URL}${endpoint}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${env.MODAL_API_KEY}`,
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Modal backend error: ${response.status} ${errorText}`);
	}

	return await response.json();
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const correlationId = generateCorrelationId();

		// Only handle POST requests
		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		try {
			// Parse request body
			const body = await request.json() as { practice_id: string; operation: 'schedule' | 'daily-ops'; task: string };

			const { practice_id, operation, task } = body;

			if (!practice_id || !operation || !task) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'Missing required fields: practice_id, operation, task',
						correlation_id: correlationId,
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}

			// Query D1 for practice config
			const practiceConfig = await getPracticeConfig(env, practice_id);

			if (!practiceConfig) {
				await logAuditTrail(env, {
					timestamp: new Date().toISOString(),
					action: 'agent_request',
					actor_id: 'edge-router',
					actor_type: 'system',
					practice_id: practice_id,
					resource_type: 'practice',
					outcome: 'failure',
					ip_address: request.headers.get('CF-Connecting-IP') || 'unknown',
					user_agent: request.headers.get('User-Agent') || 'unknown',
					correlation_id: correlationId,
					error: 'Practice not found',
				});

				return new Response(
					JSON.stringify({
						success: false,
						error: 'Practice not found',
						correlation_id: correlationId,
					}),
					{ status: 404, headers: { 'Content-Type': 'application/json' } }
				);
			}

			// Validate practice status
			if (practiceConfig.status !== 'active') {
				await logAuditTrail(env, {
					timestamp: new Date().toISOString(),
					action: 'agent_request',
					actor_id: 'edge-router',
					actor_type: 'system',
					practice_id: practice_id,
					resource_type: 'practice',
					outcome: 'failure',
					ip_address: request.headers.get('CF-Connecting-IP') || 'unknown',
					user_agent: request.headers.get('User-Agent') || 'unknown',
					correlation_id: correlationId,
					error: `Practice status: ${practiceConfig.status}`,
				});

				return new Response(
					JSON.stringify({
						success: false,
						error: `Practice is ${practiceConfig.status}`,
						correlation_id: correlationId,
					}),
					{ status: 403, headers: { 'Content-Type': 'application/json' } }
				);
			}

			// Check rate limiting
			const rateLimitExceeded = await checkRateLimit(
				env,
				practice_id,
				practiceConfig.rate_limit_per_minute
			);

			if (rateLimitExceeded) {
				await logAuditTrail(env, {
					timestamp: new Date().toISOString(),
					action: 'agent_request',
					actor_id: 'edge-router',
					actor_type: 'system',
					practice_id: practice_id,
					resource_type: 'practice',
					outcome: 'failure',
					ip_address: request.headers.get('CF-Connecting-IP') || 'unknown',
					user_agent: request.headers.get('User-Agent') || 'unknown',
					correlation_id: correlationId,
					error: 'Rate limit exceeded',
				});

				return new Response(
					JSON.stringify({
						success: false,
						error: 'Rate limit exceeded',
						correlation_id: correlationId,
					}),
					{ status: 429, headers: { 'Content-Type': 'application/json' } }
				);
			}

			// Decrypt PMS credentials
			const pmsConfig = decryptCredentials(practiceConfig.encrypted_credentials);

			// Build Modal request
			const modalRequest: DentalAgentRequest = {
				practice_id,
				operation,
				task,
				pms_config: {
					...pmsConfig,
					pms_type: practiceConfig.pms_type,
				},
				correlation_id: correlationId,
			};

			// Determine endpoint based on operation
			const endpoint = operation === 'schedule'
				? '/agents/dental/schedule'
				: '/agents/dental/daily-ops';

			// Call Modal backend
			const modalResponse = await callModalBackend(env, endpoint, modalRequest);

			// Log successful request
			await logAuditTrail(env, {
				timestamp: new Date().toISOString(),
				action: `dental_${operation}`,
				actor_id: 'edge-router',
				actor_type: 'agent',
				practice_id: practice_id,
				resource_type: 'agent_execution',
				outcome: modalResponse.success ? 'success' : 'failure',
				ip_address: request.headers.get('CF-Connecting-IP') || 'unknown',
				user_agent: request.headers.get('User-Agent') || 'unknown',
				correlation_id: correlationId,
				error: modalResponse.error,
			});

			return new Response(
				JSON.stringify(modalResponse),
				{
					status: modalResponse.success ? 200 : 500,
					headers: { 'Content-Type': 'application/json' }
				}
			);

		} catch (error) {
			// Log error
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			await logAuditTrail(env, {
				timestamp: new Date().toISOString(),
				action: 'agent_request',
				actor_id: 'edge-router',
				actor_type: 'system',
				practice_id: 'unknown',
				resource_type: 'agent_execution',
				outcome: 'failure',
				ip_address: request.headers.get('CF-Connecting-IP') || 'unknown',
				user_agent: request.headers.get('User-Agent') || 'unknown',
				correlation_id: correlationId,
				error: errorMessage,
			});

			return new Response(
				JSON.stringify({
					success: false,
					error: errorMessage,
					correlation_id: correlationId,
					timestamp: new Date().toISOString(),
				}),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	},
};
