/**
 * Video Landing Page Update Email Template (OUTERFIELDS)
 *
 * For sharing the video landing page feature update with the client.
 * Voice: Nicely Said - plain language, specific, user-centered.
 *
 * "Good writing serves the reader, not the writer.
 *  It meets people where they are and helps them get where they want to go."
 *  — Fenton & Lee, Nicely Said
 */

import { sendEmail, type EmailResult } from '../service';
import { ctaButton, divider, escapeHtml, renderEmailLayout } from '../layout';

export interface VideoLandingUpdateData {
	recipientName: string;
	videoLandingUrl: string;
	senderName?: string;
	isDraft?: boolean;
}

function generateVideoLandingUpdateHtml(data: VideoLandingUpdateData): string {
	const { recipientName, videoLandingUrl, senderName = 'Micah', isDraft = false } = data;

	const draftNotice = isDraft
		? `
<div class="draft-notice">
  <p style="margin: 0;">
    <strong style="color: #ffffff;">Draft for approval</strong><br />
    Reply with edits or "approved".
  </p>
</div>`
		: '';

	const bodyHtml = `
${draftNotice}
<p>Hi ${escapeHtml(recipientName)},</p>
<p>Your platform now has <strong style="color:#ffffff;">dedicated video landing pages</strong>. Every video gets its own shareable URL.</p>

${divider()}

<div class="section">
  <h2>What this means for your content</h2>
  <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8); list-style-type: disc;">
    <li style="margin: 0 0 10px 0;"><strong style="color:#ffffff;">Each video = a destination.</strong> Share links directly to any piece of content.</li>
    <li style="margin: 0 0 10px 0;"><strong style="color:#ffffff;">See who's watching.</strong> View counts, engagement scores, and "most replayed" moments.</li>
    <li style="margin: 0 0 10px 0;"><strong style="color:#ffffff;">Keep them watching.</strong> "Up Next" sidebar surfaces related content automatically.</li>
    <li style="margin: 0 0 10px 0;"><strong style="color:#ffffff;">Searchable transcripts.</strong> Full text with time-synced playback (coming for members).</li>
    <li style="margin: 0;">Control access. Free trailers stay open; premium content requires membership.</li>
  </ul>
</div>

${divider()}

<div class="section">
  <h2>For a PCN business, this enables:</h2>
  <ul style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8); list-style-type: disc;">
    <li style="margin: 0 0 10px 0;"><strong style="color:#ffffff;">Social sharing.</strong> Link directly to trailer clips to drive membership.</li>
    <li style="margin: 0 0 10px 0;"><strong style="color:#ffffff;">Series organization.</strong> Episode navigation keeps viewers in your content.</li>
    <li style="margin: 0 0 10px 0;"><strong style="color:#ffffff;">Conversion gates.</strong> Show the content, then prompt for membership at the right moment.</li>
    <li style="margin: 0;"><strong style="color:#ffffff;">SEO discoverability.</strong> Each page is optimized for search with video schema.</li>
  </ul>
</div>

<div class="cta">
  ${ctaButton(videoLandingUrl, 'View the landing page')}
  <p class="hint">Try the controls: <strong style="color:#ffffff;">Space</strong> to play, arrows to seek, <strong style="color:#ffffff;">F</strong> for fullscreen.</p>
</div>

${divider()}

<p>The screenshot below shows a trailer page. Notice the "Up Next" sidebar, the view count, and the membership tier badges.</p>
<p style="margin-bottom: 0;">— ${escapeHtml(senderName)}</p>
`;

	return renderEmailLayout({
		title: 'Video Landing Pages — Live',
		bodyHtml,
		options: {
			preheader: 'Your videos now have dedicated shareable landing pages',
			headerSubtitle: 'Platform Update',
			footerHtml: `<p class="muted" style="margin-top: 8px;">Sent by CREATE SOMETHING</p>`
		}
	});
}

function generateVideoLandingUpdateText(data: VideoLandingUpdateData): string {
	const { recipientName, videoLandingUrl, senderName = 'Micah', isDraft = false } = data;

	const draftNotice = isDraft ? 'DRAFT FOR APPROVAL\nReply with edits or "approved".\n\n---\n\n' : '';

	return `${draftNotice}OUTERFIELDS — Video Landing Pages Live

Hi ${recipientName},

Your platform now has dedicated video landing pages. Every video gets its own shareable URL.

WHAT THIS MEANS FOR YOUR CONTENT:

• Each video = a destination. Share links directly to any piece of content.
• See who's watching. View counts, engagement scores, and "most replayed" moments.
• Keep them watching. "Up Next" sidebar surfaces related content automatically.
• Searchable transcripts. Full text with time-synced playback (coming for members).
• Control access. Free trailers stay open; premium content requires membership.

FOR A PCN BUSINESS, THIS ENABLES:

• Social sharing. Link directly to trailer clips to drive membership.
• Series organization. Episode navigation keeps viewers in your content.
• Conversion gates. Show the content, then prompt for membership at the right moment.
• SEO discoverability. Each page is optimized for search with video schema.

VIEW THE LANDING PAGE:
${videoLandingUrl}

Tip: Press Space to play, arrows to seek, F for fullscreen.

The screenshot attached shows a trailer page. Notice the "Up Next" sidebar, the view count, and the membership tier badges.

—
${senderName}
CREATE SOMETHING`;
}

export async function sendVideoLandingUpdateEmail(
	apiKey: string,
	to: string,
	data: VideoLandingUpdateData
): Promise<EmailResult> {
	const subject = data.isDraft
		? '[DRAFT FOR APPROVAL] Video Landing Pages — Live'
		: 'Video Landing Pages — Live';

	const html = generateVideoLandingUpdateHtml(data);
	const text = generateVideoLandingUpdateText(data);

	return sendEmail(apiKey, to, subject, html, text);
}
