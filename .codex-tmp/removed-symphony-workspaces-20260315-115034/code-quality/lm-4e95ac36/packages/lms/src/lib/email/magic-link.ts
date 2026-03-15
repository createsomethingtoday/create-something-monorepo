/**
 * Magic Link Email Service
 *
 * Sends passwordless authentication emails for MCP server integration.
 * Canon: Authentication without ceremony—click and you're in.
 */

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <noreply@createsomething.io>';

interface EmailResult {
	success: boolean;
	id?: string;
	error?: string;
}

/**
 * Send a magic link email
 */
export async function sendMagicLinkEmail(
	apiKey: string,
	to: string,
	magicLinkUrl: string
): Promise<EmailResult> {
	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .logo { font-size: 14px; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.6); margin-bottom: 32px; }
    h1 { font-size: 24px; font-weight: 600; margin: 0 0 24px 0; }
    p { font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.8); margin: 0 0 16px 0; }
    .button { display: inline-block; background: #ffffff; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 24px 0; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px; color: rgba(255, 255, 255, 0.4); }
    .link { color: rgba(255, 255, 255, 0.6); word-break: break-all; font-size: 14px; }
    .muted { color: rgba(255, 255, 255, 0.5); font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Sign in to Learn</h1>
    <p>Click the button below to sign in to CREATE SOMETHING LMS.</p>
    <a href="${magicLinkUrl}" class="button">Sign In</a>
    <p class="muted">Or copy and paste this link:</p>
    <p class="link">${magicLinkUrl}</p>
    <p class="muted">This link expires in 15 minutes.</p>
    <div class="footer">
      <p>You received this email because someone requested a sign-in link for this address. If that wasn't you, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

	try {
		const response = await fetch(RESEND_API, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: FROM_ADDRESS,
				to,
				subject: 'Sign in to CREATE SOMETHING LMS',
				html
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

/**
 * Generate a cryptographically secure token
 */
export function generateToken(): string {
	const bytes = new Uint8Array(48);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Hash a token for storage
 */
export async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
