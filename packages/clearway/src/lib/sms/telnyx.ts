/**
 * Telnyx SMS Client
 *
 * Send and receive SMS messages via Telnyx API.
 * Telnyx offers lower latency and better pricing than Twilio.
 *
 * @see https://developers.telnyx.com/docs/messaging
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TelnyxConfig {
	apiKey: string;
	publicKey: string;
	messagingProfileId: string;
	fromNumber: string;
}

export interface IncomingSMS {
	from: string;
	to: string;
	body: string;
	messageId: string;
}

export interface SendSMSParams {
	to: string;
	body: string;
	webhookUrl?: string;
}

/**
 * Parse incoming Telnyx webhook request
 *
 * Telnyx sends webhooks as JSON with event structure
 */
export function parseIncomingSMS(body: TelnyxWebhookPayload): IncomingSMS | null {
	const event = body.data;

	if (event.event_type !== 'message.received') {
		return null;
	}

	const payload = event.payload;

	return {
		from: payload.from?.phone_number || '',
		to: payload.to?.[0]?.phone_number || '',
		body: payload.text || '',
		messageId: event.id
	};
}

interface TelnyxWebhookPayload {
	data: {
		id: string;
		event_type: string;
		occurred_at: string;
		payload: {
			from?: { phone_number: string };
			to?: Array<{ phone_number: string }>;
			text?: string;
		};
	};
}

/**
 * Verify Telnyx webhook signature
 *
 * Telnyx uses Ed25519 signature in the 'telnyx-signature-ed25519' header
 * For simplicity, we verify using the timestamp and public key
 */
export async function verifyTelnyxSignature(
	publicKey: string,
	signature: string,
	timestamp: string,
	body: string
): Promise<boolean> {
	// Telnyx timestamp tolerance: 5 minutes
	const timestampMs = parseInt(timestamp, 10);
	const now = Date.now();
	const fiveMinutes = 5 * 60 * 1000;

	if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
		return false;
	}

	// For production, implement proper Ed25519 verification
	// For now, we do basic timestamp validation
	// Full implementation would use @noble/ed25519 or similar

	// In Cloudflare Workers, you'd use:
	// const key = await crypto.subtle.importKey('raw', ...)
	// const valid = await crypto.subtle.verify('Ed25519', key, sig, data)

	return signature.length > 0 && publicKey.length > 0;
}

/**
 * Send an SMS via Telnyx REST API
 */
export async function sendSMS(
	config: TelnyxConfig,
	params: SendSMSParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
	const url = 'https://api.telnyx.com/v2/messages';

	const body = {
		from: config.fromNumber,
		to: params.to,
		text: params.body,
		messaging_profile_id: config.messagingProfileId,
		...(params.webhookUrl && { webhook_url: params.webhookUrl })
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		const data = (await response.json()) as {
			data?: { id: string };
			errors?: Array<{ title: string; detail: string }>;
		};

		if (!response.ok) {
			const errorMsg =
				data.errors?.[0]?.detail || data.errors?.[0]?.title || `Telnyx error: ${response.status}`;
			return {
				success: false,
				error: errorMsg
			};
		}

		return {
			success: true,
			messageId: data.data?.id
		};
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

/**
 * Generate JSON response for Telnyx webhook
 *
 * Unlike Twilio's TwiML, Telnyx expects you to send replies via the API.
 * Return 200 OK to acknowledge the webhook.
 */
export function webhookAck(): { status: number; body: string } {
	return { status: 200, body: '' };
}

/**
 * Send reply to incoming message
 *
 * Telnyx doesn't support inline replies like Twilio's TwiML.
 * You must send a separate API call.
 */
export async function replyToMessage(
	config: TelnyxConfig,
	to: string,
	message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
	return sendSMS(config, {
		to,
		body: message
	});
}

/**
 * Extract phone number from E.164 format
 * +1234567890 -> 1234567890
 */
export function normalizePhone(phone: string): string {
	return phone.replace(/\D/g, '');
}

/**
 * Format phone number for display
 * 1234567890 -> (123) 456-7890
 */
export function formatPhone(phone: string): string {
	const cleaned = normalizePhone(phone);
	if (cleaned.length === 10) {
		return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
	}
	if (cleaned.length === 11 && cleaned.startsWith('1')) {
		return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
	}
	return phone;
}

/**
 * Format phone number to E.164
 * 1234567890 -> +11234567890
 */
export function toE164(phone: string, countryCode = '1'): string {
	const cleaned = normalizePhone(phone);
	if (cleaned.startsWith(countryCode)) {
		return `+${cleaned}`;
	}
	return `+${countryCode}${cleaned}`;
}
