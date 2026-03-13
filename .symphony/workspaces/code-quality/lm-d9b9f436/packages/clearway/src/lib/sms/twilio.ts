/**
 * Twilio SMS Client
 *
 * Send and receive SMS messages via Twilio API.
 * Handles signature verification for webhooks.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { normalizePhone, formatPhone } from './phone.js';

// Re-export phone utilities for backwards compatibility
export { normalizePhone, formatPhone };

export interface TwilioConfig {
	accountSid: string;
	authToken: string;
	fromNumber: string;
}

export interface IncomingSMS {
	from: string;
	to: string;
	body: string;
	messageSid: string;
	numMedia: number;
}

export interface SendSMSParams {
	to: string;
	body: string;
	statusCallback?: string;
}

/**
 * Parse incoming Twilio webhook request
 */
export function parseIncomingSMS(formData: FormData): IncomingSMS {
	return {
		from: formData.get('From')?.toString() || '',
		to: formData.get('To')?.toString() || '',
		body: formData.get('Body')?.toString() || '',
		messageSid: formData.get('MessageSid')?.toString() || '',
		numMedia: parseInt(formData.get('NumMedia')?.toString() || '0', 10)
	};
}

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
	authToken: string,
	signature: string,
	url: string,
	params: Record<string, string>
): boolean {
	// Sort parameters alphabetically
	const sortedKeys = Object.keys(params).sort();
	const data = url + sortedKeys.map(key => key + params[key]).join('');

	// Calculate expected signature
	const expectedSignature = createHmac('sha1', authToken)
		.update(data)
		.digest('base64');

	// Timing-safe comparison
	try {
		const sigBuffer = Buffer.from(signature);
		const expectedBuffer = Buffer.from(expectedSignature);
		return sigBuffer.length === expectedBuffer.length &&
			timingSafeEqual(sigBuffer, expectedBuffer);
	} catch {
		return false;
	}
}

/**
 * Send an SMS via Twilio REST API
 */
export async function sendSMS(
	config: TwilioConfig,
	params: SendSMSParams
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
	const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

	const body = new URLSearchParams({
		To: params.to,
		From: config.fromNumber,
		Body: params.body
	});

	if (params.statusCallback) {
		body.set('StatusCallback', params.statusCallback);
	}

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': 'Basic ' + btoa(`${config.accountSid}:${config.authToken}`),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: body.toString()
		});

		const data = await response.json() as { sid?: string; message?: string; code?: number };

		if (!response.ok) {
			return {
				success: false,
				error: data.message || `Twilio error: ${response.status}`
			};
		}

		return {
			success: true,
			messageSid: data.sid
		};
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

/**
 * Generate TwiML response for immediate reply
 *
 * Use this to respond directly in the webhook response,
 * which is faster and more reliable than sending a separate message.
 */
export function twimlResponse(message: string): string {
	// Escape XML special characters
	const escaped = message
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

	return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escaped}</Message>
</Response>`;
}

/**
 * Generate empty TwiML response (no reply)
 */
export function twimlEmpty(): string {
	return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}

