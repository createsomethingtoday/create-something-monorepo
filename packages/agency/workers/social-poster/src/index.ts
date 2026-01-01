/**
 * Social Poster Worker
 *
 * Zuhandenheit: The infrastructure disappears; the content distributes itself.
 *
 * - Cron trigger: Every 15 minutes, check for pending posts
 * - Queue consumer: Process posts from queue, call LinkedIn API
 * - Retry logic: Exponential backoff, max 3 retries
 */

interface Env {
	DB: D1Database;
	SESSIONS: KVNamespace;
	POSTING_QUEUE: Queue<PostMessage>;
	LINKEDIN_API_VERSION: string;
	RESEND_API_KEY?: string;
}

interface PostMessage {
	postId: string;
	platform: 'linkedin';
	content: string;
	metadata?: {
		commentLink?: string;
		organizationId?: string;
	};
}

interface StoredToken {
	access_token: string;
	expires_at: number;
	scope: string;
}

interface PostRow {
	id: string;
	platform: string;
	content: string;
	scheduled_for: number;
	status: string;
	metadata: string | null;
}

const LINKEDIN_API = 'https://api.linkedin.com/v2';
const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'CREATE SOMETHING <noreply@createsomething.io>';
const NOTIFY_EMAIL = 'micah@createsomething.io';

// Organization ID → Name mapping
const ORGANIZATIONS: Record<string, { name: string; adminUrl: string }> = {
	'110433670': {
		name: 'CREATE SOMETHING',
		adminUrl: 'https://www.linkedin.com/company/110433670/admin/feed/'
	},
	'35463531': {
		name: 'WORKWAY',
		adminUrl: 'https://www.linkedin.com/company/35463531/admin/feed/'
	}
};

/**
 * Send reminder email for scheduled organization posts
 * (Until LinkedIn approves org posting scopes)
 */
async function sendOrgPostReminder(
	apiKey: string,
	organizationId: string,
	postContent: string
): Promise<void> {
	const org = ORGANIZATIONS[organizationId];
	const orgName = org?.name || `Organization ${organizationId}`;
	const adminUrl = org?.adminUrl || `https://www.linkedin.com/company/${organizationId}/admin/feed/`;

	const escapedContent = postContent
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
    .content { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); white-space: pre-wrap; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 14px; color: rgba(255, 255, 255, 0.4); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CREATE SOMETHING</div>
    <h1>Time to Post: ${orgName}</h1>
    <p>A scheduled post for <strong>${orgName}</strong> is ready. Copy the content below and post it manually:</p>
    <div style="margin: 24px 0;">
      <a href="${adminUrl}" class="button">Open ${orgName} Admin</a>
    </div>
    <p><strong>Content to post:</strong></p>
    <div class="content">${escapedContent}</div>
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
				subject: `LinkedIn Reminder: Post to ${orgName}`,
				html,
			}),
		});

		if (!response.ok) {
			console.warn('[Queue] Failed to send org post reminder:', await response.text());
		} else {
			console.log(`[Queue] Org post reminder sent for ${orgName}`);
		}
	} catch (err) {
		console.warn('[Queue] Error sending reminder:', err);
	}
}

export default {
	/**
	 * Cron handler: Find pending posts and queue them
	 */
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const now = Date.now();

		console.log(`[Cron] Checking for pending posts at ${new Date(now).toISOString()}`);

		// Find posts ready to send
		const posts = await env.DB.prepare(
			`SELECT id, platform, content, metadata
			 FROM social_posts
			 WHERE status = 'pending' AND scheduled_for <= ?
			 ORDER BY scheduled_for ASC
			 LIMIT 10`
		)
			.bind(now)
			.all<PostRow>();

		if (posts.results.length === 0) {
			console.log('[Cron] No pending posts found');
			return;
		}

		console.log(`[Cron] Found ${posts.results.length} posts to queue`);

		// Queue each post
		for (const post of posts.results) {
			const metadata = post.metadata ? JSON.parse(post.metadata) : undefined;

			await env.POSTING_QUEUE.send({
				postId: post.id,
				platform: post.platform as 'linkedin',
				content: post.content,
				metadata
			});

			// Mark as queued
			await env.DB.prepare(`UPDATE social_posts SET status = 'queued' WHERE id = ?`)
				.bind(post.id)
				.run();

			console.log(`[Cron] Queued post ${post.id}`);
		}
	},

	/**
	 * Queue handler: Process posts and call LinkedIn API
	 */
	async queue(batch: MessageBatch<PostMessage>, env: Env): Promise<void> {
		for (const msg of batch.messages) {
			const { postId, platform, content, metadata } = msg.body;

			console.log(`[Queue] Processing post ${postId}`);

			try {
				// Organization posts: send reminder instead of posting (until scopes approved)
				if (metadata?.organizationId) {
					if (!env.RESEND_API_KEY) {
						throw new Error('RESEND_API_KEY not configured for org post reminders');
					}

					await sendOrgPostReminder(env.RESEND_API_KEY, metadata.organizationId, content);

					// Mark as reminded (not posted - manual action required)
					await env.DB.prepare(
						`UPDATE social_posts SET status = 'reminded', posted_at = ? WHERE id = ?`
					)
						.bind(Date.now(), postId)
						.run();

					console.log(`[Queue] Sent reminder for org post ${postId}`);
					msg.ack();
					continue;
				}

				// Personal posts: actually post to LinkedIn
				// Get LinkedIn token
				const tokenData = await env.SESSIONS.get('linkedin_access_token');

				if (!tokenData) {
					throw new Error('No LinkedIn access token. Re-authenticate at /api/linkedin/auth');
				}

				const token: StoredToken = JSON.parse(tokenData);

				if (Date.now() > token.expires_at) {
					await env.SESSIONS.delete('linkedin_access_token');
					throw new Error('LinkedIn token expired. Re-authenticate at /api/linkedin/auth');
				}

				// Get user ID for personal post
				const userResponse = await fetch(`${LINKEDIN_API}/userinfo`, {
					headers: { Authorization: `Bearer ${token.access_token}` }
				});

				if (!userResponse.ok) {
					throw new Error(`Failed to get user info: ${await userResponse.text()}`);
				}

				const userInfo = (await userResponse.json()) as { sub: string };
				const author = `urn:li:person:${userInfo.sub}`;

				// Post to LinkedIn
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
								shareCommentary: { text: content.substring(0, 3000) },
								shareMediaCategory: 'NONE'
							}
						},
						visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
					})
				});

				if (!postResponse.ok) {
					throw new Error(`LinkedIn post failed: ${await postResponse.text()}`);
				}

				const result = (await postResponse.json()) as { id: string };
				const linkedInPostId = result.id;
				const postUrl = `https://www.linkedin.com/feed/update/${linkedInPostId}`;

				console.log(`[Queue] Posted successfully: ${postUrl}`);

				// Add comment with link if needed (best practice: links in comments)
				if (metadata?.commentLink) {
					try {
						await fetch(`${LINKEDIN_API}/socialActions/${linkedInPostId}/comments`, {
							method: 'POST',
							headers: {
								Authorization: `Bearer ${token.access_token}`,
								'Content-Type': 'application/json',
								'X-Restli-Protocol-Version': '2.0.0'
							},
							body: JSON.stringify({
								actor: author, // Same author as the post (person or organization)
								message: { text: metadata.commentLink }
							})
						});
						console.log(`[Queue] Added comment with link`);
					} catch (commentError) {
						// Non-fatal: log but don't fail the post
						console.warn(`[Queue] Failed to add comment: ${commentError}`);
					}
				}

				// Update D1 with success
				await env.DB.prepare(
					`UPDATE social_posts
					 SET status = 'posted', post_id = ?, post_url = ?, posted_at = ?
					 WHERE id = ?`
				)
					.bind(linkedInPostId, postUrl, Date.now(), postId)
					.run();

				msg.ack();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				console.error(`[Queue] Error processing post ${postId}: ${errorMessage}`);

				// Update D1 with error
				await env.DB.prepare(`UPDATE social_posts SET status = 'failed', error = ? WHERE id = ?`)
					.bind(errorMessage, postId)
					.run();

				// Retry if not a permanent error
				const isPermanentError =
					errorMessage.includes('expired') ||
					errorMessage.includes('No LinkedIn access token') ||
					errorMessage.includes('401');

				if (isPermanentError) {
					console.log(`[Queue] Permanent error, not retrying: ${errorMessage}`);
					msg.ack(); // Don't retry permanent errors
				} else {
					console.log(`[Queue] Transient error, will retry`);
					msg.retry();
				}
			}
		}
	}
};
