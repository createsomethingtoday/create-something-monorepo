/**
 * Email Service
 *
 * Transactional email via Resend API.
 * Canon: Communication without ceremony.
 */

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <noreply@createsomething.io>';

interface EmailResult {
	success: boolean;
	id?: string;
	error?: string;
}

/**
 * Send an email via Resend
 */
async function send(
	apiKey: string,
	to: string,
	subject: string,
	html: string
): Promise<EmailResult> {
	try {
		const response = await fetch(RESEND_API, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: FROM_ADDRESS,
				to,
				subject,
				html,
			}),
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
 * Email verification template
 */
export async function sendVerificationEmail(
	apiKey: string,
	to: string,
	name: string | null,
	verificationUrl: string
): Promise<EmailResult> {
	const displayName = name || 'there';

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
    .link { color: rgba(255, 255, 255, 0.6); word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Verify your email</h1>
    <p>Hi ${displayName},</p>
    <p>Please verify your email address to complete your account setup.</p>
    <a href="${verificationUrl}" class="button">Verify Email</a>
    <p>Or copy and paste this link:</p>
    <p class="link">${verificationUrl}</p>
    <p>This link expires in 24 hours.</p>
    <div class="footer">
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

	return send(apiKey, to, 'Verify your email address', html);
}

/**
 * Password reset template
 */
export async function sendPasswordResetEmail(
	apiKey: string,
	to: string,
	name: string | null,
	resetUrl: string
): Promise<EmailResult> {
	const displayName = name || 'there';

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
    .link { color: rgba(255, 255, 255, 0.6); word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Reset your password</h1>
    <p>Hi ${displayName},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one.</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>Or copy and paste this link:</p>
    <p class="link">${resetUrl}</p>
    <p>This link expires in 1 hour.</p>
    <div class="footer">
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
  </div>
</body>
</html>`;

	return send(apiKey, to, 'Reset your password', html);
}

/**
 * Account deletion confirmation template
 */
export async function sendDeletionConfirmationEmail(
	apiKey: string,
	to: string,
	name: string | null,
	confirmUrl: string
): Promise<EmailResult> {
	const displayName = name || 'there';

	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .logo { font-size: 14px; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.6); margin-bottom: 32px; }
    h1 { font-size: 24px; font-weight: 600; margin: 0 0 24px 0; color: #cc4444; }
    p { font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.8); margin: 0 0 16px 0; }
    .button { display: inline-block; background: #cc4444; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 24px 0; }
    .warning { background: rgba(204, 68, 68, 0.1); border: 1px solid rgba(204, 68, 68, 0.3); border-radius: 6px; padding: 16px; margin: 24px 0; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px; color: rgba(255, 255, 255, 0.4); }
    .link { color: rgba(255, 255, 255, 0.6); word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Confirm account deletion</h1>
    <p>Hi ${displayName},</p>
    <p>We received a request to delete your account. This action is permanent and cannot be undone.</p>
    <div class="warning">
      <p style="margin: 0; color: #cc4444;"><strong>Warning:</strong> All your data will be permanently deleted.</p>
    </div>
    <a href="${confirmUrl}" class="button">Delete My Account</a>
    <p>Or copy and paste this link:</p>
    <p class="link">${confirmUrl}</p>
    <p>This link expires in 1 hour.</p>
    <div class="footer">
      <p>If you didn't request account deletion, please secure your account by changing your password immediately.</p>
    </div>
  </div>
</body>
</html>`;

	return send(apiKey, to, 'Confirm account deletion', html);
}

/**
 * Welcome email after signup
 */
export async function sendWelcomeEmail(
	apiKey: string,
	to: string,
	name: string | null,
	source: string
): Promise<EmailResult> {
	const displayName = name || 'there';

	const sourceNames: Record<string, string> = {
		workway: 'WORKWAY',
		templates: 'Templates Platform',
		io: 'CREATE SOMETHING IO',
		space: 'CREATE SOMETHING Space',
		lms: 'CREATE SOMETHING LMS',
	};

	const sourceName = sourceNames[source] || 'CREATE SOMETHING';

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
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px; color: rgba(255, 255, 255, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Welcome to ${sourceName}</h1>
    <p>Hi ${displayName},</p>
    <p>Thanks for signing up. Your account is ready.</p>
    <p>We believe in creating with restraint—less, but better. Every feature earns its existence.</p>
    <p>If you have questions, just reply to this email.</p>
    <p>— The CREATE SOMETHING Team</p>
    <div class="footer">
      <p>You're receiving this because you signed up at ${sourceName}.</p>
    </div>
  </div>
</body>
</html>`;

	return send(apiKey, to, `Welcome to ${sourceName}`, html);
}

/**
 * Free product delivery email
 */
export async function sendProductDeliveryEmail(
	apiKey: string,
	to: string,
	product: {
		name: string;
		description: string;
		githubUrl?: string;
		downloadUrl?: string;
		caseStudyUrl?: string;
	}
): Promise<EmailResult> {
	const hasGithub = !!product.githubUrl;
	const hasDownload = !!product.downloadUrl;
	const hasCaseStudy = !!product.caseStudyUrl;

	const buttonsHtml = `
    ${hasGithub ? `<a href="${product.githubUrl}" class="button primary">View on GitHub</a>` : ''}
    ${hasDownload ? `<a href="${product.downloadUrl}" class="button ${hasGithub ? 'secondary' : 'primary'}">Download Files</a>` : ''}
  `;

	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .logo { font-size: 14px; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.6); margin-bottom: 32px; }
    h1 { font-size: 24px; font-weight: 600; margin: 0 0 16px 0; }
    h2 { font-size: 18px; font-weight: 600; margin: 32px 0 16px 0; color: rgba(255, 255, 255, 0.9); }
    p { font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.8); margin: 0 0 16px 0; }
    .buttons { margin: 32px 0; display: flex; gap: 12px; flex-wrap: wrap; }
    .button { display: inline-block; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; }
    .button.primary { background: #ffffff; color: #000000; }
    .button.secondary { background: transparent; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3); }
    .instructions { background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 20px; margin: 24px 0; }
    .instructions h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; letter-spacing: 0.05em; }
    .instructions ol { margin: 0; padding-left: 20px; }
    .instructions li { margin-bottom: 8px; color: rgba(255, 255, 255, 0.8); }
    code { background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; }
    .case-study { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
    .case-study a { color: rgba(255, 255, 255, 0.6); text-decoration: underline; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px; color: rgba(255, 255, 255, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Your ${product.name}</h1>
    <p>${product.description}</p>
    
    <div class="buttons">
      ${buttonsHtml}
    </div>
    
    <div class="instructions">
      <h3>Quick Start</h3>
      <ol>
        <li>Clone or download the skill files</li>
        <li>Copy to <code>.claude/skills/triad-audit/</code> in your project</li>
        <li>Ask Claude: "Run a Subtractive Triad audit on src/"</li>
      </ol>
    </div>
    
    <h2>What's Included</h2>
    <p><strong>SKILL.md</strong> — Instructions for Claude Code to run systematic audits using the DRY → Rams → Heidegger framework.</p>
    <p><strong>TEMPLATE.md</strong> — A blank audit report template you can fill in manually or let Claude generate.</p>
    
    ${hasCaseStudy ? `
    <div class="case-study">
      <p>See the framework in action: <a href="${product.caseStudyUrl}">Kickstand Triad Audit</a> — how we reduced 155 scripts to 13.</p>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Questions? Just reply to this email.</p>
      <p>— The CREATE SOMETHING Team</p>
    </div>
  </div>
</body>
</html>`;

	return send(apiKey, to, `Your ${product.name} is ready`, html);
}
