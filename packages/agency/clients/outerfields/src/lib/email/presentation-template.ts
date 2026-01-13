/**
 * Presentation Share Email Template
 *
 * For sharing investor/partner presentations.
 * Voice: Nicely Said - plain language, specific, no jargon.
 */

import { sendEmail, type EmailResult } from './service';

export interface PresentationEmailData {
	recipientName: string;
	presentationUrl: string;
	senderName?: string;
	isDraft?: boolean;
}

/**
 * Generate presentation share email HTML
 */
function generatePresentationHtml(data: PresentationEmailData): string {
	const { recipientName, presentationUrl, senderName = 'Micah', isDraft = false } = data;

	const draftNotice = isDraft
		? `
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
      <strong>⚠️ DRAFT FOR YOUR APPROVAL</strong><br>
      This is the email that will be sent. Reply to approve or suggest changes.
    </div>`
		: '';

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      color: #1a1a1a;
      line-height: 1.6;
      background-color: #ffffff;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #1a1a1a;
    }
    .preview-box {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .preview-box h2 {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
      margin: 0 0 12px 0;
    }
    .preview-box ul {
      margin: 0;
      padding-left: 20px;
    }
    .preview-box li {
      margin: 8px 0;
      color: #333;
    }
    .cta-button {
      display: inline-block;
      background: #7c2bee;
      color: white !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .hint {
      font-size: 0.875rem;
      color: #666;
      margin-top: 8px;
    }
    .signature {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
    }
  </style>
</head>
<body>
  ${draftNotice}

  <h1>Investor Presentation Ready</h1>
  
  <p>${recipientName},</p>
  
  <p>The investor presentation for OUTERFIELDS is ready.</p>
  
  <div class="preview-box">
    <h2>What It Covers</h2>
    <ul>
      <li>Market opportunity ($15.3B hunting/shooting sports market)</li>
      <li>The product and how it works</li>
      <li>Business model ($99 founding member, creator revenue share)</li>
      <li>Technology stack (Cloudflare edge infrastructure)</li>
      <li>Roadmap and what comes next</li>
    </ul>
  </div>
  
  <p>
    <a href="${presentationUrl}" class="cta-button">
      View Presentation →
    </a>
  </p>
  
  <p class="hint">Press <strong>F</strong> for fullscreen. Use arrow keys or click to navigate.</p>
  
  <p>Let me know if you would like any changes before sharing with potential investors.</p>
  
  <div class="signature">
    —<br>
    ${senderName}<br>
    CREATE SOMETHING
  </div>
</body>
</html>`;
}

/**
 * Generate plain text version
 */
function generatePresentationText(data: PresentationEmailData): string {
	const { recipientName, presentationUrl, senderName = 'Micah', isDraft = false } = data;

	const draftNotice = isDraft
		? '⚠️ DRAFT FOR YOUR APPROVAL\nThis is the email that will be sent. Reply to approve or suggest changes.\n\n---\n\n'
		: '';

	return `${draftNotice}Investor Presentation Ready

${recipientName},

The investor presentation for OUTERFIELDS is ready.

WHAT IT COVERS:
- Market opportunity ($15.3B hunting/shooting sports market)
- The product and how it works
- Business model ($99 founding member, creator revenue share)
- Technology stack (Cloudflare edge infrastructure)
- Roadmap and what comes next

VIEW PRESENTATION:
${presentationUrl}

Press F for fullscreen. Use arrow keys or click to navigate.

Let me know if you would like any changes before sharing with potential investors.

—
${senderName}
CREATE SOMETHING`;
}

/**
 * Send presentation share email
 */
export async function sendPresentationEmail(
	apiKey: string,
	to: string,
	data: PresentationEmailData
): Promise<EmailResult> {
	const subject = data.isDraft
		? '[DRAFT FOR APPROVAL] OUTERFIELDS Investor Presentation'
		: 'OUTERFIELDS Investor Presentation';

	const html = generatePresentationHtml(data);
	const text = generatePresentationText(data);

	return sendEmail(apiKey, to, subject, html, text);
}
