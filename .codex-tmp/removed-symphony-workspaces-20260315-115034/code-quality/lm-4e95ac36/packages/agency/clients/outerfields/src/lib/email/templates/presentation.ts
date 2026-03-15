/**
 * Presentation Share Email Template (OUTERFIELDS)
 *
 * For sharing investor/partner presentations.
 * Voice: Nicely Said - plain language, specific, no jargon.
 */

import { sendEmail, type EmailResult } from '../service';
import { ctaButton, divider, escapeHtml, renderEmailLayout } from '../layout';

export interface PresentationEmailData {
	recipientName: string;
	presentationUrl: string;
	senderName?: string;
	isDraft?: boolean;
}

function generatePresentationHtml(data: PresentationEmailData): string {
	const { recipientName, presentationUrl, senderName = 'Micah', isDraft = false } = data;

	const draftNotice = isDraft
		? `
<div class="draft-notice">
  <p style="margin: 0;">
    <strong style="color: #ffffff;">Draft for approval</strong><br />
    Reply with edits or “approved”.
  </p>
</div>`
		: '';

	const bodyHtml = `
${draftNotice}
<p>Hi ${escapeHtml(recipientName)},</p>
<p>Here’s the <strong style="color:#ffffff;">mock presentation</strong> we’re sharing with our client first.</p>
${divider()}
<div class="section">
  <h2>What it covers</h2>
  <!-- Use plain list styles for maximum email-client compatibility (no pseudo-elements) -->
  <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8); list-style-type: disc;">
    <li style="margin: 0 0 10px 0;">Market opportunity</li>
    <li style="margin: 0 0 10px 0;">Product and demo</li>
    <li style="margin: 0 0 10px 0;">Business model</li>
    <li style="margin: 0 0 10px 0;">Technology stack</li>
    <li style="margin: 0;">Roadmap</li>
  </ul>
</div>
<div class="cta">
  ${ctaButton(presentationUrl, 'Open the mock presentation')}
  <p class="hint">Press <strong style="color:#ffffff;">F</strong> for fullscreen. Use arrow keys (or click) to navigate.</p>
</div>
${divider()}
<p>If you want changes before you share it, tell me what to tweak.</p>
<p style="margin-bottom: 0;">— ${escapeHtml(senderName)}</p>
`;

	return renderEmailLayout({
		title: 'Mock presentation',
		bodyHtml,
		options: {
			preheader: 'OUTERFIELDS mock presentation link',
			headerSubtitle: 'Presentation link',
			footerHtml: `<p class="muted" style="margin-top: 8px;">Sent by CREATE SOMETHING</p>`
		}
	});
}

function generatePresentationText(data: PresentationEmailData): string {
	const { recipientName, presentationUrl, senderName = 'Micah', isDraft = false } = data;

	const draftNotice = isDraft ? 'DRAFT FOR APPROVAL\nReply with edits or “approved”.\n\n---\n\n' : '';

	return `${draftNotice}OUTERFIELDS — Mock presentation

Hi ${recipientName},

Here’s the mock presentation we’re sharing with our client first:
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

export async function sendPresentationEmail(
	apiKey: string,
	to: string,
	data: PresentationEmailData
): Promise<EmailResult> {
	const subject = data.isDraft
		? '[DRAFT FOR APPROVAL] OUTERFIELDS Mock Presentation'
		: 'OUTERFIELDS Mock Presentation';

	const html = generatePresentationHtml(data);
	const text = generatePresentationText(data);

	return sendEmail(apiKey, to, subject, html, text);
}

