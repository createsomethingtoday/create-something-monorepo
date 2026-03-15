/**
 * Resend Email Service
 * 
 * Sends branded transactional emails for the Webflow Asset Dashboard.
 * Uses Canon design tokens for consistent branding.
 */

import { Resend } from 'resend';

// Initialize Resend client
let resendClient: Resend | null = null;

function getResendClient(apiKey?: string): Resend {
	if (!resendClient && apiKey) {
		resendClient = new Resend(apiKey);
	}
	if (!resendClient) {
		throw new Error('Resend API key not configured');
	}
	return resendClient;
}

// Canon design tokens for email
const colors = {
	bgPure: '#000000',
	bgElevated: '#0a0a0a',
	bgSurface: '#111111',
	bgSubtle: '#1a1a1a',
	fgPrimary: '#ffffff',
	fgSecondary: 'rgba(255, 255, 255, 0.8)',
	fgMuted: 'rgba(255, 255, 255, 0.46)',
	borderDefault: 'rgba(255, 255, 255, 0.1)',
	borderEmphasis: 'rgba(255, 255, 255, 0.2)',
	success: '#44aa44',
	error: '#d44d4d'
};

// Logo SVG as data URI
const logoSvg = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
	<rect width="40" height="40" rx="8" fill="${colors.fgPrimary}" />
	<path d="M28 14L20 26L12 14H28Z" fill="${colors.bgPure}" />
</svg>`;
const logoDataUri = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;

/**
 * Generate the base email template with Canon branding
 */
function baseTemplate(content: string, preheader: string = ''): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="color-scheme" content="dark">
	<meta name="supported-color-schemes" content="dark">
	<title>Webflow Asset Dashboard</title>
	<!--[if mso]>
	<noscript>
		<xml>
			<o:OfficeDocumentSettings>
				<o:PixelsPerInch>96</o:PixelsPerInch>
			</o:OfficeDocumentSettings>
		</xml>
	</noscript>
	<![endif]-->
	<style>
		/* Reset */
		body, table, td, p, a, li, blockquote {
			-webkit-text-size-adjust: 100%;
			-ms-text-size-adjust: 100%;
		}
		table, td {
			mso-table-lspace: 0pt;
			mso-table-rspace: 0pt;
		}
		img {
			-ms-interpolation-mode: bicubic;
			border: 0;
			height: auto;
			line-height: 100%;
			outline: none;
			text-decoration: none;
		}
		
		/* Base styles */
		body {
			margin: 0 !important;
			padding: 0 !important;
			background-color: ${colors.bgPure};
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		}
		
		/* Dark mode support */
		@media (prefers-color-scheme: dark) {
			body {
				background-color: ${colors.bgPure} !important;
			}
		}
	</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.bgPure};">
	<!-- Preheader text (hidden) -->
	<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: ${colors.bgPure};">
		${preheader}
	</div>
	
	<!-- Main container -->
	<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${colors.bgPure};">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<!-- Content wrapper -->
				<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px;">
					<!-- Logo -->
					<tr>
						<td align="center" style="padding-bottom: 24px;">
							<img src="${logoDataUri}" alt="Webflow Asset Dashboard" width="40" height="40" style="display: block; border-radius: 8px;">
						</td>
					</tr>
					
					<!-- Card -->
					<tr>
						<td style="background-color: ${colors.bgSurface}; border: 1px solid ${colors.borderDefault}; border-radius: 16px; padding: 32px;">
							${content}
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td align="center" style="padding-top: 24px;">
							<p style="margin: 0; font-size: 12px; line-height: 1.5; color: ${colors.fgMuted};">
								© ${new Date().getFullYear()} Webflow Asset Dashboard<br>
								<span style="color: ${colors.fgMuted};">You received this email because you requested to sign in.</span>
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
`;
}

/**
 * Verification email template
 */
function verificationEmailTemplate(token: string, expiresIn: string = '60 minutes'): string {
	const content = `
		<!-- Title -->
		<h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: ${colors.fgPrimary}; text-align: center;">
			Verify Your Email
		</h1>
		<p style="margin: 0 0 24px; font-size: 14px; color: ${colors.fgSecondary}; text-align: center;">
			Enter this code in the dashboard to sign in
		</p>
		
		<!-- Token box -->
		<div style="background-color: ${colors.bgSubtle}; border: 1px solid ${colors.borderEmphasis}; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
			<p style="margin: 0; font-size: 28px; font-weight: 600; font-family: 'SF Mono', Monaco, 'Courier New', monospace; letter-spacing: 2px; color: ${colors.fgPrimary};">
				${token}
			</p>
		</div>
		
		<!-- Instructions -->
		<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${colors.fgSecondary}; text-align: center;">
			Copy and paste this verification code into the dashboard. This code expires in <strong style="color: ${colors.fgPrimary};">${expiresIn}</strong>.
		</p>
		
		<!-- Security note -->
		<div style="background-color: ${colors.bgSubtle}; border-radius: 8px; padding: 16px; margin-top: 24px;">
			<p style="margin: 0; font-size: 12px; line-height: 1.5; color: ${colors.fgMuted}; text-align: center;">
				🔒 If you didn't request this email, you can safely ignore it.
			</p>
		</div>
	`;
	
	return baseTemplate(content, `Your verification code is ${token}`);
}

/**
 * GSAP Validation complete email template
 */
function validationCompleteTemplate(data: {
	siteName: string;
	passed: boolean;
	passRate: number;
	totalPages: number;
	issues: number;
	dashboardUrl: string;
}): string {
	const statusColor = data.passed ? colors.success : colors.error;
	const statusText = data.passed ? 'Passed' : 'Needs Attention';
	const statusEmoji = data.passed ? '✅' : '⚠️';
	
	const content = `
		<!-- Title -->
		<h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: ${colors.fgPrimary}; text-align: center;">
			GSAP Validation Complete
		</h1>
		<p style="margin: 0 0 24px; font-size: 14px; color: ${colors.fgSecondary}; text-align: center;">
			Results for <strong style="color: ${colors.fgPrimary};">${data.siteName}</strong>
		</p>
		
		<!-- Status badge -->
		<div style="text-align: center; margin-bottom: 24px;">
			<span style="display: inline-block; background-color: ${statusColor}20; color: ${statusColor}; font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 9999px; border: 1px solid ${statusColor}40;">
				${statusEmoji} ${statusText}
			</span>
		</div>
		
		<!-- Stats grid -->
		<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
			<tr>
				<td style="padding: 12px; background-color: ${colors.bgSubtle}; border-radius: 8px 0 0 8px; text-align: center; border-right: 1px solid ${colors.borderDefault};">
					<p style="margin: 0 0 4px; font-size: 24px; font-weight: 600; color: ${colors.fgPrimary};">${data.passRate}%</p>
					<p style="margin: 0; font-size: 12px; color: ${colors.fgMuted};">Pass Rate</p>
				</td>
				<td style="padding: 12px; background-color: ${colors.bgSubtle}; text-align: center; border-right: 1px solid ${colors.borderDefault};">
					<p style="margin: 0 0 4px; font-size: 24px; font-weight: 600; color: ${colors.fgPrimary};">${data.totalPages}</p>
					<p style="margin: 0; font-size: 12px; color: ${colors.fgMuted};">Pages</p>
				</td>
				<td style="padding: 12px; background-color: ${colors.bgSubtle}; border-radius: 0 8px 8px 0; text-align: center;">
					<p style="margin: 0 0 4px; font-size: 24px; font-weight: 600; color: ${data.issues > 0 ? colors.error : colors.fgPrimary};">${data.issues}</p>
					<p style="margin: 0; font-size: 12px; color: ${colors.fgMuted};">Issues</p>
				</td>
			</tr>
		</table>
		
		<!-- CTA button -->
		<div style="text-align: center;">
			<a href="${data.dashboardUrl}" target="_blank" style="display: inline-block; background-color: ${colors.fgPrimary}; color: ${colors.bgPure}; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
				View Full Report →
			</a>
		</div>
	`;
	
	return baseTemplate(content, `GSAP Validation ${statusText}: ${data.passRate}% pass rate`);
}

// Export types
export interface SendVerificationEmailOptions {
	to: string;
	token: string;
	expiresIn?: string;
}

export interface SendValidationEmailOptions {
	to: string;
	siteName: string;
	passed: boolean;
	passRate: number;
	totalPages: number;
	issues: number;
	dashboardUrl: string;
}

export interface EmailResult {
	success: boolean;
	id?: string;
	error?: string;
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
	apiKey: string,
	options: SendVerificationEmailOptions
): Promise<EmailResult> {
	try {
		const resend = getResendClient(apiKey);
		
		const { data, error } = await resend.emails.send({
			from: 'Webflow Dashboard <micah@createsomething.io>',
			to: options.to,
			subject: `Your verification code: ${options.token}`,
			html: verificationEmailTemplate(options.token, options.expiresIn)
		});
		
		if (error) {
			console.error('Resend error:', error);
			return { success: false, error: error.message };
		}
		
		return { success: true, id: data?.id };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * Send validation complete email
 */
export async function sendValidationEmail(
	apiKey: string,
	options: SendValidationEmailOptions
): Promise<EmailResult> {
	try {
		const resend = getResendClient(apiKey);
		
		const statusText = options.passed ? 'Passed' : 'Needs Attention';
		
		const { data, error } = await resend.emails.send({
			from: 'Webflow Dashboard <micah@createsomething.io>',
			to: options.to,
			subject: `GSAP Validation ${statusText}: ${options.siteName}`,
			html: validationCompleteTemplate(options)
		});
		
		if (error) {
			console.error('Resend error:', error);
			return { success: false, error: error.message };
		}
		
		return { success: true, id: data?.id };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}
