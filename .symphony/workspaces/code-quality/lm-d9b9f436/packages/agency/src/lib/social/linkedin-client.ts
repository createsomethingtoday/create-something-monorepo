/**
 * LinkedIn API Client
 *
 * Handles posting to LinkedIn via the UGC Posts API.
 * Follows the pattern from packages/io LinkedIn integration.
 *
 * Philosophy: The tool recedes into use. This client should be invisible.
 */

const LINKEDIN_API = 'https://api.linkedin.com/v2';

export interface PostResult {
	id: string;
	url: string;
}

export interface LinkedInUserInfo {
	sub: string;
	name?: string;
	email?: string;
}

export interface OrganizationInfo {
	id: string;
	name: string;
	vanityName?: string;
}

export interface StoredToken {
	access_token: string;
	expires_at: number;
	scope: string;
	organizations?: OrganizationInfo[];
}

export class LinkedInClient {
	private userId: string | null = null;

	constructor(
		private accessToken: string,
		private apiVersion = '202412'
	) {}

	/**
	 * Get the authenticated user's LinkedIn ID
	 */
	async getUserId(): Promise<string> {
		if (this.userId) return this.userId;

		const response = await fetch(`${LINKEDIN_API}/userinfo`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get LinkedIn user info: ${error}`);
		}

		const userInfo = (await response.json()) as LinkedInUserInfo;
		this.userId = userInfo.sub;
		return this.userId;
	}

	/**
	 * Post text content to LinkedIn
	 *
	 * @param text - The post content (max 3000 chars)
	 * @param organizationId - Optional org ID to post as organization instead of personal
	 * @returns Post ID and URL
	 */
	async post(text: string, organizationId?: string): Promise<PostResult> {
		// Determine author: organization or personal
		const author = organizationId
			? `urn:li:organization:${organizationId}`
			: `urn:li:person:${await this.getUserId()}`;

		const response = await fetch(`${LINKEDIN_API}/ugcPosts`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				'X-Restli-Protocol-Version': '2.0.0'
			},
			body: JSON.stringify({
				author,
				lifecycleState: 'PUBLISHED',
				specificContent: {
					'com.linkedin.ugc.ShareContent': {
						shareCommentary: {
							text: text.substring(0, 3000) // LinkedIn's limit
						},
						shareMediaCategory: 'NONE'
					}
				},
				visibility: {
					'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
				}
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to post to LinkedIn: ${error}`);
		}

		const result = (await response.json()) as { id: string };
		const postId = result.id;

		// LinkedIn post URLs follow this format
		const numericId = postId.split(':').pop();
		const url = `https://www.linkedin.com/feed/update/${postId}`;

		return { id: postId, url };
	}

	/**
	 * Add a comment to a post (for links, per best practices)
	 *
	 * @param postId - The URN of the post (urn:li:share:xxx or urn:li:ugcPost:xxx)
	 * @param text - Comment text containing the link
	 * @param organizationId - Optional org ID to comment as organization
	 */
	async addComment(postId: string, text: string, organizationId?: string): Promise<void> {
		// Determine actor: organization or personal
		const actor = organizationId
			? `urn:li:organization:${organizationId}`
			: `urn:li:person:${await this.getUserId()}`;

		const response = await fetch(`${LINKEDIN_API}/socialActions/${postId}/comments`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json',
				'X-Restli-Protocol-Version': '2.0.0'
			},
			body: JSON.stringify({
				actor,
				message: {
					text: text
				}
			})
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to add comment: ${error}`);
		}
	}

	/**
	 * Check if the token is valid (not expired)
	 */
	static isTokenValid(token: StoredToken): boolean {
		return Date.now() < token.expires_at;
	}

	/**
	 * Get days until token expires
	 */
	static daysUntilExpiry(token: StoredToken): number {
		const msRemaining = token.expires_at - Date.now();
		return Math.floor(msRemaining / (1000 * 60 * 60 * 24));
	}
}

/**
 * Create a LinkedIn client from KV-stored token
 *
 * @param kv - The SESSIONS KV namespace
 * @returns LinkedInClient or null if no valid token
 */
export async function createLinkedInClient(
	kv: KVNamespace
): Promise<{ client: LinkedInClient; token: StoredToken } | null> {
	const tokenData = await kv.get('linkedin_access_token');

	if (!tokenData) {
		return null;
	}

	const token: StoredToken = JSON.parse(tokenData);

	if (!LinkedInClient.isTokenValid(token)) {
		// Token expired, clean it up
		await kv.delete('linkedin_access_token');
		return null;
	}

	return {
		client: new LinkedInClient(token.access_token),
		token
	};
}

/**
 * Get token status from KV
 */
export async function getTokenStatus(
	kv: KVNamespace
): Promise<{
	connected: boolean;
	expiresAt?: string;
	daysRemaining?: number;
	scope?: string;
	warning?: string;
	organizations?: OrganizationInfo[];
}> {
	const tokenData = await kv.get('linkedin_access_token');

	if (!tokenData) {
		return { connected: false };
	}

	const token: StoredToken = JSON.parse(tokenData);
	const isValid = LinkedInClient.isTokenValid(token);
	const daysRemaining = LinkedInClient.daysUntilExpiry(token);

	return {
		connected: isValid,
		expiresAt: new Date(token.expires_at).toISOString(),
		daysRemaining,
		scope: token.scope,
		organizations: token.organizations,
		...(daysRemaining <= 7 && { warning: `Token expires in ${daysRemaining} days` })
	};
}
