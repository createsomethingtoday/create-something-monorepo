/**
 * Gmail OAuth Client for PM Agent
 *
 * Handles:
 * - Access token refresh using stored refresh token
 * - Gmail API calls (read, send, modify)
 * - Error handling and token management
 *
 * Required Wrangler Secrets:
 * - GMAIL_CLIENT_ID
 * - GMAIL_CLIENT_SECRET
 * - GMAIL_REFRESH_TOKEN
 */

export interface GmailEnv {
	GMAIL_CLIENT_ID: string;
	GMAIL_CLIENT_SECRET: string;
	GMAIL_REFRESH_TOKEN: string;
	CACHE: KVNamespace; // For caching access tokens
}

export interface GmailMessage {
	id: string;
	threadId: string;
	snippet: string;
	labelIds: string[];
	payload?: {
		headers: Array<{ name: string; value: string }>;
		body?: { data?: string };
		parts?: Array<{
			mimeType: string;
			body?: { data?: string };
		}>;
	};
	internalDate?: string;
}

export interface GmailThread {
	id: string;
	snippet: string;
	messages: GmailMessage[];
}

/**
 * Get a valid access token, refreshing if needed
 * Caches access token in KV for 50 minutes (tokens expire in 60)
 */
export async function getAccessToken(env: GmailEnv): Promise<string> {
	// Check cache first
	const cachedToken = await env.CACHE.get('gmail_access_token');
	if (cachedToken) {
		return cachedToken;
	}

	// Refresh the token
	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: env.GMAIL_CLIENT_ID,
			client_secret: env.GMAIL_CLIENT_SECRET,
			refresh_token: env.GMAIL_REFRESH_TOKEN,
			grant_type: 'refresh_token'
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to refresh Gmail token: ${error}`);
	}

	const data = (await response.json()) as { access_token: string; expires_in: number };

	// Cache for 50 minutes (tokens typically expire in 60)
	await env.CACHE.put('gmail_access_token', data.access_token, {
		expirationTtl: 3000 // 50 minutes
	});

	return data.access_token;
}

/**
 * Make authenticated Gmail API request
 */
async function gmailFetch<T>(
	env: GmailEnv,
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	const accessToken = await getAccessToken(env);

	const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`, {
		...options,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			...options.headers
		}
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Gmail API error (${response.status}): ${error}`);
	}

	return response.json() as Promise<T>;
}

/**
 * List messages matching a query
 */
export async function listMessages(
	env: GmailEnv,
	query: string = 'is:unread',
	maxResults: number = 10
): Promise<{ messages: Array<{ id: string; threadId: string }>; resultSizeEstimate: number }> {
	const params = new URLSearchParams({
		q: query,
		maxResults: maxResults.toString()
	});

	return gmailFetch(env, `/messages?${params}`);
}

/**
 * Get full message details
 */
export async function getMessage(env: GmailEnv, messageId: string): Promise<GmailMessage> {
	return gmailFetch(env, `/messages/${messageId}?format=full`);
}

/**
 * Get thread with all messages
 */
export async function getThread(env: GmailEnv, threadId: string): Promise<GmailThread> {
	return gmailFetch(env, `/threads/${threadId}?format=full`);
}

/**
 * Extract header value from message
 */
export function getHeader(message: GmailMessage, headerName: string): string | undefined {
	return message.payload?.headers?.find(
		(h) => h.name.toLowerCase() === headerName.toLowerCase()
	)?.value;
}

/**
 * Decode base64url encoded content
 */
export function decodeBody(encoded: string): string {
	// Gmail uses base64url encoding
	const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
	return atob(base64);
}

/**
 * Extract plain text body from message
 */
export function getMessageBody(message: GmailMessage): string {
	// Try direct body first
	if (message.payload?.body?.data) {
		return decodeBody(message.payload.body.data);
	}

	// Look in parts for text/plain
	const parts = message.payload?.parts || [];
	for (const part of parts) {
		if (part.mimeType === 'text/plain' && part.body?.data) {
			return decodeBody(part.body.data);
		}
	}

	// Fall back to snippet
	return message.snippet || '';
}

/**
 * Parse email address from header (handles "Name <email>" format)
 */
export function parseEmailAddress(header: string): { name: string; email: string } {
	const match = header.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
	if (match) {
		return {
			name: match[1]?.trim() || '',
			email: match[2]?.trim() || header
		};
	}
	return { name: '', email: header };
}

/**
 * Send an email
 */
export async function sendEmail(
	env: GmailEnv,
	to: string,
	subject: string,
	body: string,
	options: {
		replyToMessageId?: string;
		threadId?: string;
		cc?: string;
		bcc?: string;
	} = {}
): Promise<{ id: string; threadId: string; labelIds: string[] }> {
	// Build RFC 2822 message
	const headers = [
		`To: ${to}`,
		`Subject: ${subject}`,
		'Content-Type: text/plain; charset=utf-8',
		'MIME-Version: 1.0'
	];

	if (options.cc) {
		headers.push(`Cc: ${options.cc}`);
	}

	if (options.bcc) {
		headers.push(`Bcc: ${options.bcc}`);
	}

	if (options.replyToMessageId) {
		headers.push(`In-Reply-To: ${options.replyToMessageId}`);
		headers.push(`References: ${options.replyToMessageId}`);
	}

	const rawMessage = [...headers, '', body].join('\r\n');

	// Encode as base64url
	const encoded = btoa(rawMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	const requestBody: { raw: string; threadId?: string } = { raw: encoded };
	if (options.threadId) {
		requestBody.threadId = options.threadId;
	}

	return gmailFetch(env, '/messages/send', {
		method: 'POST',
		body: JSON.stringify(requestBody)
	});
}

/**
 * Create a draft (doesn't send)
 */
export async function createDraft(
	env: GmailEnv,
	to: string,
	subject: string,
	body: string,
	options: {
		replyToMessageId?: string;
		threadId?: string;
	} = {}
): Promise<{ id: string; message: { id: string; threadId: string } }> {
	// Build RFC 2822 message
	const headers = [
		`To: ${to}`,
		`Subject: ${subject}`,
		'Content-Type: text/plain; charset=utf-8',
		'MIME-Version: 1.0'
	];

	if (options.replyToMessageId) {
		headers.push(`In-Reply-To: ${options.replyToMessageId}`);
		headers.push(`References: ${options.replyToMessageId}`);
	}

	const rawMessage = [...headers, '', body].join('\r\n');

	// Encode as base64url
	const encoded = btoa(rawMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	const requestBody: { message: { raw: string; threadId?: string } } = {
		message: { raw: encoded }
	};
	if (options.threadId) {
		requestBody.message.threadId = options.threadId;
	}

	return gmailFetch(env, '/drafts', {
		method: 'POST',
		body: JSON.stringify(requestBody)
	});
}

/**
 * Modify message labels (mark as read, archive, etc.)
 */
export async function modifyMessage(
	env: GmailEnv,
	messageId: string,
	addLabels: string[] = [],
	removeLabels: string[] = []
): Promise<GmailMessage> {
	return gmailFetch(env, `/messages/${messageId}/modify`, {
		method: 'POST',
		body: JSON.stringify({
			addLabelIds: addLabels,
			removeLabelIds: removeLabels
		})
	});
}

/**
 * Mark message as read
 */
export async function markAsRead(env: GmailEnv, messageId: string): Promise<GmailMessage> {
	return modifyMessage(env, messageId, [], ['UNREAD']);
}

/**
 * Archive message (remove from inbox)
 */
export async function archiveMessage(env: GmailEnv, messageId: string): Promise<GmailMessage> {
	return modifyMessage(env, messageId, [], ['INBOX']);
}

/**
 * Add label to message
 */
export async function addLabel(
	env: GmailEnv,
	messageId: string,
	labelId: string
): Promise<GmailMessage> {
	return modifyMessage(env, messageId, [labelId], []);
}

/**
 * Get labels (for finding label IDs)
 */
export async function listLabels(
	env: GmailEnv
): Promise<{ labels: Array<{ id: string; name: string; type: string }> }> {
	return gmailFetch(env, '/labels');
}

/**
 * Format email for display/logging
 */
export function formatEmailSummary(message: GmailMessage): {
	id: string;
	threadId: string;
	from: { name: string; email: string };
	to: string;
	subject: string;
	date: string;
	snippet: string;
	body: string;
	isUnread: boolean;
} {
	const from = parseEmailAddress(getHeader(message, 'From') || '');
	const to = getHeader(message, 'To') || '';
	const subject = getHeader(message, 'Subject') || '(no subject)';
	const date = getHeader(message, 'Date') || '';
	const body = getMessageBody(message);
	const isUnread = message.labelIds?.includes('UNREAD') || false;

	return {
		id: message.id,
		threadId: message.threadId,
		from,
		to,
		subject,
		date,
		snippet: message.snippet,
		body,
		isUnread
	};
}
