/**
 * Social Post Notifications
 *
 * Sends reminders to cross-post to company pages when personal posts go out.
 * Temporary solution until LinkedIn organization scopes are approved.
 */

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <noreply@createsomething.io>';
const NOTIFY_EMAIL = 'micah@createsomething.io';

interface NotificationResult {
	success: boolean;
	id?: string;
	error?: string;
}

/**
 * Send cross-post reminder email
 */
export async function sendCrossPostReminder(
	apiKey: string,
	postContent: string,
	postUrl: string
): Promise<NotificationResult> {
	// Truncate content for preview
	const preview = postContent.length > 200
		? postContent.substring(0, 200) + '...'
		: postContent;

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
    .button { display: inline-block; background: #ffffff; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 8px 8px 8px 0; }
    .preview { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px; color: rgba(255, 255, 255, 0.7); white-space: pre-wrap; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px; color: rgba(255, 255, 255, 0.4); }
    .pages { margin: 24px 0; }
    .page-link { display: block; color: rgba(255, 255, 255, 0.6); margin: 8px 0; text-decoration: none; }
    .page-link:hover { color: #ffffff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Cross-Post Reminder</h1>
    <p>A post just went live on your personal LinkedIn. Consider cross-posting to company pages:</p>

    <div class="pages">
      <a href="https://www.linkedin.com/company/110433670/admin/feed/" class="button">Post to CREATE SOMETHING</a>
      <a href="https://www.linkedin.com/company/35463531/admin/feed/" class="button">Post to WORKWAY</a>
    </div>

    <p><strong>Your post:</strong></p>
    <div class="preview">${escapeHtml(preview)}</div>

    <a href="${postUrl}" class="button" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff;">View Original Post</a>

    <div class="footer">
      <p>This reminder is temporary until LinkedIn approves organization posting scopes.</p>
      <p>Once approved, posts will automatically go to company pages.</p>
    </div>
  </div>
</body>
</html>`;

	try {
		const response = await fetch(RESEND_API, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: FROM_ADDRESS,
				to: NOTIFY_EMAIL,
				subject: 'Cross-Post Reminder: New LinkedIn post published',
				html,
			}),
		});

		if (!response.ok) {
			const data = (await response.json()) as { message?: string };
			console.error('Resend API error:', data);
			return { success: false, error: data.message || 'Failed to send notification' };
		}

		const data = (await response.json()) as { id: string };
		return { success: true, id: data.id };
	} catch (err) {
		console.error('Notification send error:', err);
		return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
	}
}

/**
 * Escape HTML entities for safe display
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
