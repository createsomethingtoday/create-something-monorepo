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
      <div class="draft-notice">
        <p style="margin: 0;">
          <strong>Draft for approval</strong><br />
          This is the email that will be sent. Reply with edits or “approved”.
        </p>
      </div>`
		: '';

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Aligned to OUTERFIELDS welcome email styling (dark background + dark card + white CTA) */
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #ffffff; background-color: #000000; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
    .subhead { color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; }
    .content { background-color: #1a1a1a; border-radius: 12px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.1); }
    h1 { color: #ffffff; font-size: 26px; margin-top: 0; margin-bottom: 16px; }
    p { color: rgba(255, 255, 255, 0.8); margin: 0 0 12px 0; }
    .section { margin-bottom: 24px; }
    .section h2 { color: #ffffff; font-size: 18px; margin: 0 0 12px 0; }
    .bullets { list-style: none; padding: 0; margin: 0; }
    .bullets li { padding: 10px 0; padding-left: 28px; position: relative; color: rgba(255, 255, 255, 0.8); }
    .bullets li:before { content: "✓"; position: absolute; left: 0; color: #44aa44; font-weight: bold; font-size: 18px; }
    .cta { text-align: center; margin-top: 18px; }
    .cta-button { display: inline-block; padding: 16px 32px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px 0; }
    .cta-button:hover { background-color: rgba(255, 255, 255, 0.9); }
    .hint { font-size: 14px; color: rgba(255, 255, 255, 0.6); text-align: center; margin: 8px 0 0 0; }
    .divider { height: 1px; background-color: rgba(255, 255, 255, 0.1); margin: 24px 0; }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.6); font-size: 14px; }
    .draft-notice { background: rgba(170, 136, 68, 0.15); border: 1px solid rgba(170, 136, 68, 0.3); border-radius: 10px; padding: 14px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">OUTERFIELDS</div>
      <p class="subhead">Presentation link</p>
    </div>

    ${draftNotice}

    <div class="content">
      <h1>Investor presentation</h1>

      <p>Hi ${recipientName},</p>
      <p>Here’s the OUTERFIELDS investor presentation link.</p>

      <div class="divider"></div>

      <div class="section">
        <h2>What it covers</h2>
        <ul class="bullets">
          <li>Market opportunity</li>
          <li>Product and demo</li>
          <li>Business model</li>
          <li>Technology stack</li>
          <li>Roadmap</li>
        </ul>
      </div>

      <div class="cta">
        <a href="${presentationUrl}" class="cta-button">Open the presentation</a>
        <p class="hint">Press <strong>F</strong> for fullscreen. Use arrow keys (or click) to navigate.</p>
      </div>

      <div class="divider"></div>

      <p>If you want changes before you share it, tell me what to tweak.</p>
      <p style="margin-bottom: 0;">— ${senderName}</p>
    </div>

    <div class="footer">
      <p><strong>OUTERFIELDS</strong></p>
      <p style="margin-top: 8px;">Sent by CREATE SOMETHING</p>
    </div>
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
		? 'DRAFT FOR APPROVAL\nReply with edits or “approved”.\n\n---\n\n'
		: '';

	return `${draftNotice}OUTERFIELDS — Investor presentation

Hi ${recipientName},

Here’s the OUTERFIELDS investor presentation link:
${presentationUrl}

What it covers:
- Market opportunity
- Product and demo
- Business model
- Technology stack
- Roadmap

Tip: Press F for fullscreen. Use arrow keys (or click) to navigate.

If you want changes before you share it, tell me what to tweak.

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
