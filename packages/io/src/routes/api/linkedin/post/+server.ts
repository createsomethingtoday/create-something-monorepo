import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LINKEDIN_API = 'https://api.linkedin.com/v2';
const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <noreply@createsomething.io>';
const NOTIFY_EMAIL = 'micah@createsomething.io';

/**
 * Send cross-post reminder email for personal posts
 */
async function sendCrossPostReminder(
	apiKey: string,
	postContent: string,
	postUrl: string
): Promise<void> {
	const preview = postContent.length > 300
		? postContent.substring(0, 300) + '...'
		: postContent;

	const escapedPreview = preview
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .logo { font-size: 14px; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.6); margin-bottom: 32px; }
    h1 { font-size: 24px; font-weight: 600; margin: 0 0 24px 0; }
    p { font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.8); margin: 0 0 16px 0; }
    .button { display: inline-block; background: #ffffff; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 8px 8px 8px 0; }
    .preview { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px; color: rgba(255, 255, 255, 0.7); white-space: pre-wrap; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px; color: rgba(255, 255, 255, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Cross-Post Reminder</h1>
    <p>A post just went live on your personal LinkedIn. Consider cross-posting to company pages:</p>
    <div style="margin: 24px 0;">
      <a href="https://www.linkedin.com/company/110433670/admin/feed/" class="button">Post to CREATE SOMETHING</a>
      <a href="https://www.linkedin.com/company/35463531/admin/feed/" class="button">Post to WORKWAY</a>
    </div>
    <p><strong>Your post:</strong></p>
    <div class="preview">${escapedPreview}</div>
    <a href="${postUrl}" class="button" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff;">View Original Post</a>
    <div class="footer">
      <p>This reminder is temporary until LinkedIn approves organization posting scopes.</p>
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
			console.warn('Failed to send cross-post reminder:', await response.text());
		} else {
			console.log('Cross-post reminder sent');
		}
	} catch (err) {
		console.warn('Error sending reminder:', err);
	}
}

interface OrganizationInfo {
	id: string;
	name: string;
	vanityName?: string;
}

interface StoredToken {
	access_token: string;
	expires_at: number;
	scope: string;
	organizations?: OrganizationInfo[];
}

interface PostRequest {
	text: string;
	organizationId?: string;
}

interface UserInfoResponse {
	sub: string;
}

interface UGCPostResponse {
	id: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const sessions = platform?.env?.SESSIONS;

	if (!sessions) {
		return json({ error: 'KV not available' }, { status: 500 });
	}

	// Get stored access token
	const tokenData = await sessions.get('linkedin_access_token');
	if (!tokenData) {
		return json(
			{
				error: 'No LinkedIn access token. Visit /api/linkedin/auth to connect.'
			},
			{ status: 401 }
		);
	}

	const token: StoredToken = JSON.parse(tokenData);

	// Check if token is expired
	if (Date.now() > token.expires_at) {
		await sessions.delete('linkedin_access_token');
		return json(
			{
				error: 'LinkedIn token expired. Visit /api/linkedin/auth to reconnect.'
			},
			{ status: 401 }
		);
	}

	// Parse request body
	let body: PostRequest;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!body.text || typeof body.text !== 'string') {
		return json({ error: 'Missing or invalid text field' }, { status: 400 });
	}

	// Determine author: organization or personal
	let author: string;

	if (body.organizationId) {
		// Validate organization ID is in the list of authorized organizations
		const authorizedOrgs = token.organizations || [];
		const org = authorizedOrgs.find((o) => o.id === body.organizationId);

		if (!org) {
			return json(
				{
					error: `Not authorized to post as organization ${body.organizationId}. ` +
						`Authorized organizations: ${authorizedOrgs.map((o) => `${o.name} (${o.id})`).join(', ') || 'none'}`
				},
				{ status: 403 }
			);
		}

		author = `urn:li:organization:${body.organizationId}`;
	} else {
		// Get user's LinkedIn ID using userinfo endpoint
		try {
			const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
				headers: {
					Authorization: `Bearer ${token.access_token}`
				}
			});

			if (!userResponse.ok) {
				const errorText = await userResponse.text();
				console.error('Failed to get user info:', errorText);
				return json({ error: 'Failed to get LinkedIn user info' }, { status: 400 });
			}

			const userInfo = (await userResponse.json()) as UserInfoResponse;
			author = `urn:li:person:${userInfo.sub}`;
		} catch (err) {
			console.error('User info error:', err);
			return json({ error: 'Failed to fetch LinkedIn user info' }, { status: 500 });
		}
	}

	// Create post using UGC Posts API
	try {
		const postResponse = await fetch(`${LINKEDIN_API}/ugcPosts`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token.access_token}`,
				'Content-Type': 'application/json',
				'X-Restli-Protocol-Version': '2.0.0'
			},
			body: JSON.stringify({
				author,
				lifecycleState: 'PUBLISHED',
				specificContent: {
					'com.linkedin.ugc.ShareContent': {
						shareCommentary: {
							text: body.text
						},
						shareMediaCategory: 'NONE'
					}
				},
				visibility: {
					'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
				}
			})
		});

		if (!postResponse.ok) {
			const errorText = await postResponse.text();
			console.error('Post failed:', errorText);
			return json({ error: `Failed to create post: ${errorText}` }, { status: 400 });
		}

		const result = (await postResponse.json()) as UGCPostResponse;
		const postUrl = `https://www.linkedin.com/feed/update/${result.id}`;

		// Send cross-post reminder for personal posts (not organization posts)
		const resendApiKey = platform?.env?.RESEND_API_KEY;
		if (!body.organizationId && resendApiKey) {
			await sendCrossPostReminder(resendApiKey, body.text, postUrl);
		}

		return json({
			success: true,
			postId: result.id,
			postUrl,
			message: 'Post published to LinkedIn'
		});
	} catch (err) {
		console.error('Post error:', err);
		return json({ error: `Post failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, {
			status: 500
		});
	}
};

// GET endpoint to check status
export const GET: RequestHandler = async ({ platform }) => {
	const sessions = platform?.env?.SESSIONS;

	if (!sessions) {
		return json({ connected: false, error: 'KV not available' });
	}

	const tokenData = await sessions.get('linkedin_access_token');
	if (!tokenData) {
		return json({ connected: false, authUrl: '/api/linkedin/auth' });
	}

	const token: StoredToken = JSON.parse(tokenData);
	const isExpired = Date.now() > token.expires_at;

	return json({
		connected: !isExpired,
		expiresAt: new Date(token.expires_at).toISOString(),
		scope: token.scope,
		organizations: token.organizations || [],
		...(isExpired && { authUrl: '/api/linkedin/auth' })
	});
};
