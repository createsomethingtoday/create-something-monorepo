import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LINKEDIN_API = 'https://api.linkedin.com/v2';

interface StoredToken {
	access_token: string;
	expires_at: number;
	scope: string;
}

interface PostRequest {
	text: string;
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

	// Get user's LinkedIn ID using userinfo endpoint
	let userId: string;
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
		userId = userInfo.sub;
	} catch (err) {
		console.error('User info error:', err);
		return json({ error: 'Failed to fetch LinkedIn user info' }, { status: 500 });
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
				author: `urn:li:person:${userId}`,
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

		return json({
			success: true,
			postId: result.id,
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
		...(isExpired && { authUrl: '/api/linkedin/auth' })
	});
};
