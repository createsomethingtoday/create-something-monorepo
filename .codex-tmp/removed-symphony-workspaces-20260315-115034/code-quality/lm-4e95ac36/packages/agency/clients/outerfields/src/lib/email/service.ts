/**
 * Email Service - OUTERFIELDS
 *
 * Transactional email via Resend API.
 * Canon: Communication without ceremony.
 */

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <hello@createsomething.io>';

export interface EmailResult {
	success: boolean;
	id?: string;
	error?: string;
}

export interface SendEmailOptions {
	from?: string;
	replyTo?: string;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(
	apiKey: string,
	to: string,
	subject: string,
	html: string,
	text?: string,
	options?: SendEmailOptions
): Promise<EmailResult> {
	try {
		const from = options?.from ?? FROM_ADDRESS;
		const replyTo = options?.replyTo;

		const response = await fetch(RESEND_API, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from,
				to,
				...(replyTo && { replyTo }),
				subject,
				html,
				...(text && { text })
			})
		});

		if (!response.ok) {
			const data = (await response.json()) as { message?: string };
			console.error('Resend API error:', data);
			return { success: false, error: data.message || 'Failed to send email' };
		}

		const data = (await response.json()) as { id: string };
		return { success: true, id: data.id };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}
