#!/usr/bin/env tsx
/**
 * Send Canon Improvements Update Email
 * 
 * One-time script to send an update about Ground/Canon pattern improvements.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env file if it exists
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
	const envContent = readFileSync(envPath, 'utf-8');
	for (const line of envContent.split('\n')) {
		const [key, ...valueParts] = line.split('=');
		if (key && valueParts.length > 0 && !process.env[key.trim()]) {
			process.env[key.trim()] = valueParts.join('=').trim();
		}
	}
}

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'Micah Johnson <micah@createsomething.io>';

const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your website revisions are live</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Greeting -->
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.8);">
      Hi Aaron,
    </p>

    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(255,255,255,0.8);">
      The revisions you requested are now live. Here's what changed:
    </p>

    <!-- Screenshot -->
    <div style="margin-bottom: 32px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
      <img 
        src="https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/email/outerfields-changelog-jan21-1769031396909.png" 
        alt="OUTERFIELDS homepage showing Building Outerfields: The Odyssey" 
        style="width: 100%; display: block; border-radius: 8px;"
      />
    </div>

    <!-- What shipped -->
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #ffffff;">
        What shipped
      </h2>
      <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.8); line-height: 1.8;">
        <li><strong style="color:#fff;">New hero.</strong> "Building Outerfields: The Odyssey" — the two-line dramatic title you wanted.</li>
        <li><strong style="color:#fff;">Monochromatic design.</strong> Pure black and white. Glass buttons. No distracting colors.</li>
        <li><strong style="color:#fff;">Editor's Choice section.</strong> Featured films get a StreamVerse-style spotlight.</li>
        <li><strong style="color:#fff;">Faster member setup.</strong> From signup to watching in under 2 minutes.</li>
        <li><strong style="color:#fff;">iPad fixes.</strong> No more horizontal scroll on tablets.</li>
      </ul>
    </div>

    <!-- Divider -->
    <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 32px 0;"></div>

    <!-- What this means -->
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #ffffff;">
        What this means for OUTERFIELDS
      </h2>
      <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.8); line-height: 1.8;">
        <li><strong style="color:#fff;">Every video is a destination.</strong> Shareable URLs with their own landing pages.</li>
        <li><strong style="color:#fff;">Payments work.</strong> $99 lifetime access checkout is live.</li>
        <li><strong style="color:#fff;">Content discovery.</strong> Netflix-style category rows keep viewers engaged.</li>
        <li><strong style="color:#fff;">Investor-ready.</strong> Presentation deck at /presentations/investor.</li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="margin-bottom: 32px; text-align: center;">
      <a href="https://outerfields.createsomething.agency" 
         style="display: inline-block; padding: 14px 28px; background: #ffffff; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Review the site
      </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.6);">
      Full changelog: <a href="https://outerfields.createsomething.agency/changelog" style="color: #ffffff;">outerfields.createsomething.agency/changelog</a>
    </p>

    <!-- Footer -->
    <div style="padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255,255,255,0.8);">
        Reply with any questions, or let me know if something needs adjusting.
      </p>
      <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.6);">
        — Micah
      </p>
    </div>

  </div>
</body>
</html>
`;

const emailText = `
Hi Aaron,

The revisions you requested are now live. Here's what changed:

WHAT SHIPPED
------------
• New hero. "Building Outerfields: The Odyssey" — the two-line dramatic title you wanted.
• Monochromatic design. Pure black and white. Glass buttons. No distracting colors.
• Editor's Choice section. Featured films get a StreamVerse-style spotlight.
• Faster member setup. From signup to watching in under 2 minutes.
• iPad fixes. No more horizontal scroll on tablets.

WHAT THIS MEANS FOR OUTERFIELDS
-------------------------------
• Every video is a destination. Shareable URLs with their own landing pages.
• Payments work. $99 lifetime access checkout is live.
• Content discovery. Netflix-style category rows keep viewers engaged.
• Investor-ready. Presentation deck at /presentations/investor.

REVIEW THE SITE
https://outerfields.createsomething.agency

Full changelog: https://outerfields.createsomething.agency/changelog

Reply with any questions, or let me know if something needs adjusting.

— Micah
`;

async function sendEmail() {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error('Missing RESEND_API_KEY in environment');
	}

	const to = process.argv[2] || 'micah@createsomething.io';
	const isDraft = process.argv.includes('--draft');
	const subject = isDraft ? '[DRAFT] Your website revisions are live' : 'Your website revisions are live';

	console.log(`📤 Sending email to ${to}...`);

	const response = await fetch(RESEND_API, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: FROM_ADDRESS,
			to,
			subject,
			html: emailHtml,
			text: emailText
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to send email: ${error}`);
	}

	const result = await response.json() as { id: string };
	console.log(`✅ Email sent!`);
	console.log(`   Email ID: ${result.id}`);
	console.log(`   To: ${to}`);
	console.log(`   Subject: ${subject}`);
}

sendEmail().catch((err) => {
	console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
	process.exit(1);
});
