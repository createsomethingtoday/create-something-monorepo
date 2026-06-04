import type { RuntimeEnv } from './env';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export async function sendPasswordResetEmail(
	env: RuntimeEnv,
	email: string,
	resetUrl: string
): Promise<void> {
	if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');

	const from = env.RESEND_FROM_EMAIL || 'J&J Home Health <noreply@createsomething.io>';
	const htmlUrl = escapeHtml(resetUrl);
	const html = `
		<p>A password reset was requested for the J&amp;J Home Health admin portal.</p>
		<p><a href="${htmlUrl}">Reset the admin password</a></p>
		<p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
	`;
	const text = `A password reset was requested for the J&J Home Health admin portal.

Reset the admin password:
${resetUrl}

This link expires in 30 minutes. If you did not request this, you can ignore this email.`;

	const response = await fetch(RESEND_EMAILS_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from,
			to: [email],
			subject: 'Reset your J&J Home Health admin password',
			html,
			text
		})
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Resend password reset failed: ${response.status} ${body}`);
	}
}
