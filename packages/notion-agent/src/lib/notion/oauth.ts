/**
 * Notion OAuth Utilities
 * 
 * Handles OAuth 2.0 flow for Notion integration.
 */

export interface NotionOAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}

export interface NotionTokenResponse {
	access_token: string;
	token_type: string;
	bot_id: string;
	workspace_id: string;
	workspace_name: string;
	workspace_icon: string | null;
	owner: {
		type: string;
		user?: {
			id: string;
			name: string;
			avatar_url: string | null;
		};
	};
	duplicated_template_id: string | null;
}

/**
 * Generate the Notion OAuth authorization URL.
 */
export function getAuthorizationUrl(config: NotionOAuthConfig, state: string): string {
	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		response_type: 'code',
		owner: 'user',
		state
	});

	return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token.
 */
export async function exchangeCodeForToken(
	config: NotionOAuthConfig,
	code: string
): Promise<NotionTokenResponse> {
	const credentials = btoa(`${config.clientId}:${config.clientSecret}`);

	const response = await fetch('https://api.notion.com/v1/oauth/token', {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${credentials}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			grant_type: 'authorization_code',
			code,
			redirect_uri: config.redirectUri
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Notion OAuth error: ${response.status} ${error}`);
	}

	return response.json();
}

/**
 * Generate a secure random state token.
 */
export function generateState(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store OAuth state in KV with expiration.
 */
export async function storeOAuthState(kv: KVNamespace, state: string, data: Record<string, unknown>): Promise<void> {
	await kv.put(`oauth:${state}`, JSON.stringify(data), {
		expirationTtl: 600 // 10 minutes
	});
}

/**
 * Retrieve and validate OAuth state from KV.
 */
export async function validateOAuthState(kv: KVNamespace, state: string): Promise<Record<string, unknown> | null> {
	const data = await kv.get(`oauth:${state}`);
	if (!data) return null;

	// Delete the state to prevent reuse
	await kv.delete(`oauth:${state}`);

	return JSON.parse(data);
}

/**
 * Simple encryption for storing tokens (use a proper KMS in production).
 */
export function encryptToken(token: string, key: string): string {
	// For demo purposes, we use a simple XOR cipher
	// In production, use Web Crypto API with AES-GCM
	const keyBytes = new TextEncoder().encode(key);
	const tokenBytes = new TextEncoder().encode(token);
	const encrypted = new Uint8Array(tokenBytes.length);

	for (let i = 0; i < tokenBytes.length; i++) {
		encrypted[i] = tokenBytes[i] ^ keyBytes[i % keyBytes.length];
	}

	return btoa(String.fromCharCode(...encrypted));
}

/**
 * Decrypt stored token.
 */
export function decryptToken(encrypted: string, key: string): string {
	const keyBytes = new TextEncoder().encode(key);
	const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
	const decrypted = new Uint8Array(encryptedBytes.length);

	for (let i = 0; i < encryptedBytes.length; i++) {
		decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
	}

	return new TextDecoder().decode(decrypted);
}
