/**
 * Email Service
 *
 * Transactional email via Resend API.
 * Canon: Communication without ceremony.
 */

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <noreply@createsomething.io>';

/**
 * Resolved Canon Performance tokens for email clients without CSS variable support.
 * Source: packages/canon/src/lib/styles/tokens.css. No remote fonts or assets.
 */
const EMAIL_STYLES = `
    body { margin: 0; padding: 0; font-family: 'Geist Variable', Arial, 'Helvetica Neue', Helvetica, system-ui, sans-serif; background-color: #f3f3f0; color: #090909; -webkit-text-size-adjust: 100%; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px 48px; }
    .logo { margin-bottom: 32px; padding: 20px; background: #090909; color: #ffffff; font-size: 13px; font-weight: 700; line-height: 1.4; letter-spacing: 0; }
    .identity { display: block; margin-top: 6px; color: #ffffff; font-family: 'IBM Plex Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 400; }
    h1 { margin: 0 0 24px; font-size: 32px; font-weight: 500; line-height: 1.15; letter-spacing: -0.03em; overflow-wrap: anywhere; }
    h2 { margin: 32px 0 16px; font-size: 20px; font-weight: 600; line-height: 1.3; }
    p { margin: 0 0 16px; color: #262626; font-size: 16px; line-height: 1.6; }
    a { color: #0057b8; text-underline-offset: 3px; }
    a:focus { outline: 2px solid #0057b8; outline-offset: 4px; }
    .button { display: inline-block; box-sizing: border-box; max-width: 100%; margin: 16px 0 24px; border: 1px solid #090909; border-radius: 0; padding: 12px 20px; background: #090909; color: #ffffff; font-size: 16px; font-weight: 600; line-height: 1.4; text-align: center; text-decoration: none; }
    .button.secondary { background: #ffffff; color: #090909; }
    .button.danger { border-color: #c62026; background: #c62026; color: #ffffff; }
    .buttons { margin: 24px 0; }
    .buttons .button { margin: 0 8px 12px 0; }
    .warning { margin: 24px 0; border: 1px solid #d7d7d2; border-left: 4px solid #c62026; padding: 16px; background: #ffffff; }
    .warning p { margin: 0; }
    .instructions { margin: 24px 0; border: 1px solid #d7d7d2; padding: 20px; background: #ffffff; }
    .instructions h3 { margin: 0 0 12px; color: #5e6268; font-family: 'IBM Plex Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace; font-size: 12px; font-weight: 600; line-height: 1.4; text-transform: uppercase; }
    .instructions ol { margin: 0; padding-left: 20px; }
    .instructions li { margin-bottom: 8px; color: #262626; font-size: 16px; line-height: 1.6; }
    code { padding: 2px 4px; background: #e6e6e0; color: #090909; font-family: 'IBM Plex Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace; font-size: 14px; overflow-wrap: anywhere; }
    .link { color: #0057b8; word-break: break-all; overflow-wrap: anywhere; }
    .case-study { margin-top: 32px; border-top: 1px solid #d7d7d2; padding-top: 24px; }
    .footer { margin-top: 40px; border-top: 1px solid #d7d7d2; padding-top: 24px; }
    .footer p { color: #5e6268; font-size: 14px; }
    @media (max-width: 400px) { .container { padding: 20px 16px 32px; } h1 { font-size: 28px; } }
`;

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING<span class="identity">IDENTITY</span></div>
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING<span class="identity">IDENTITY</span></div>
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING<span class="identity">IDENTITY</span></div>
    <h1>Confirm account deletion</h1>
    <p>Hi ${displayName},</p>
    <p>We received a request to delete your account. This action is permanent and cannot be undone.</p>
    <div class="warning">
      <p><strong>Warning:</strong> All your data will be permanently deleted.</p>
    </div>
    <a href="${confirmUrl}" class="button danger">Delete My Account</a>
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING<span class="identity">IDENTITY</span></div>
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING<span class="identity">IDENTITY</span></div>
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
