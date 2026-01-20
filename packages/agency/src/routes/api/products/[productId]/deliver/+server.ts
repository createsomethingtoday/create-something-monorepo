/**
 * Free Product Delivery API
 *
 * Sends free products via email using Resend.
 * Captures email for list building.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOfferingBySlug } from '$lib/data/services';

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <noreply@workway.co>';

// Product delivery configuration
const PRODUCT_DELIVERY: Record<
	string,
	{
		githubUrl?: string;
		downloadUrl?: string;
		caseStudyUrl?: string;
		quickStart: string[];
		includes: { name: string; description: string }[];
	}
> = {
	'triad-audit-template': {
		githubUrl: 'https://github.com/createsomethingtoday/triad-audit-skill',
		caseStudyUrl: 'https://createsomething.io/papers/kickstand-triad-audit',
		quickStart: [
			'Clone or download the skill files',
			'Copy to <code>.claude/skills/triad-audit/</code> in your project',
			'Ask Claude: "Run a Subtractive Triad audit on src/"'
		],
		includes: [
			{
				name: 'SKILL.md',
				description:
					'Instructions for Claude Code to run systematic audits using the DRY → Rams → Heidegger framework.'
			},
			{
				name: 'TEMPLATE.md',
				description: 'A blank audit report template you can fill in manually or let Claude generate.'
			}
		]
	}
};

export const POST: RequestHandler = async ({ params, request, platform }) => {
	const { productId } = params;

	// Validate product exists
	const product = getOfferingBySlug(productId);
	if (!product) {
		throw error(404, 'Product not found');
	}

	// Only free products use this endpoint
	if (product.pricing !== 'Free') {
		throw error(400, 'This endpoint is for free products only');
	}

	// Get delivery config
	const delivery = PRODUCT_DELIVERY[productId];
	if (!delivery) {
		throw error(400, 'Product delivery not configured');
	}

	// Parse request body
	let body: { email: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { email } = body;

	// Validate email
	if (!email || typeof email !== 'string' || !email.includes('@')) {
		throw error(400, 'Valid email required');
	}

	// Get Resend API key
	const resendKey = platform?.env?.RESEND_API_KEY;
	if (!resendKey) {
		console.error('RESEND_API_KEY not configured');
		throw error(500, 'Email service unavailable');
	}

	// Build email HTML
	const buttonsHtml = `
    ${delivery.githubUrl ? `<a href="${delivery.githubUrl}" class="button primary">View on GitHub</a>` : ''}
    ${delivery.downloadUrl ? `<a href="${delivery.downloadUrl}" class="button ${delivery.githubUrl ? 'secondary' : 'primary'}">Download Files</a>` : ''}
  `;

	const quickStartHtml = delivery.quickStart
		.map((step, i) => `<li>${step}</li>`)
		.join('\n              ');

	const includesHtml = delivery.includes
		.map(
			(item) =>
				`<p><strong>${item.name}</strong> — ${item.description}</p>`
		)
		.join('\n    ');

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
    .buttons { margin: 32px 0; }
    .button { display: inline-block; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; margin-right: 12px; margin-bottom: 8px; }
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
    <h1>Your ${product.title}</h1>
    <p>${product.description}</p>
    
    <div class="buttons">
      ${buttonsHtml}
    </div>
    
    <div class="instructions">
      <h3>Quick Start</h3>
      <ol>
        ${quickStartHtml}
      </ol>
    </div>
    
    <h2>What's Included</h2>
    ${includesHtml}
    
    ${
			delivery.caseStudyUrl
				? `
    <div class="case-study">
      <p>See the framework in action: <a href="${delivery.caseStudyUrl}">Kickstand Triad Audit</a> — how we reduced 155 scripts to 13.</p>
    </div>
    `
				: ''
		}
    
    <div class="footer">
      <p>Questions? Just reply to this email.</p>
      <p>— The CREATE SOMETHING Team</p>
    </div>
  </div>
</body>
</html>`;

	// Send email via Resend
	try {
		const response = await fetch(RESEND_API, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${resendKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: FROM_ADDRESS,
				to: email,
				subject: `Your ${product.title} is ready`,
				html
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Resend API error:', errorData);
			throw error(500, 'Failed to send email');
		}

		const result = (await response.json()) as { id: string };

		// Log delivery for analytics (fire and forget)
		if (platform?.env?.DB) {
			platform.context.waitUntil(
				platform.env.DB.prepare(
					`INSERT INTO product_deliveries (product_id, email, resend_id, delivered_at) 
					 VALUES (?, ?, ?, datetime('now'))`
				)
					.bind(productId, email, result.id)
					.run()
					.catch((err: unknown) => console.warn('Failed to log delivery:', err))
			);
		}

		return json({
			success: true,
			message: 'Check your email for the download link!'
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Email send error:', err);
		throw error(500, 'Failed to send email');
	}
};
