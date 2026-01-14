/**
 * Twitter/X API Client
 *
 * Handles posting to Twitter/X via the v2 API.
 * Supports single tweets and threaded posts.
 *
 * Philosophy: The tool recedes into use. This client should be invisible.
 */

const TWITTER_API = 'https://api.twitter.com/2';

export interface TweetResult {
	id: string;
	text: string;
	url: string;
}

export interface ThreadResult {
	tweets: TweetResult[];
	threadUrl: string;
}

export interface TwitterUserInfo {
	id: string;
	username: string;
	name: string;
}

export interface StoredTwitterToken {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	scope: string;
}

export class TwitterClient {
	private userId: string | null = null;
	private username: string | null = null;

	constructor(private accessToken: string) {}

	/**
	 * Get the authenticated user's Twitter info
	 */
	async getUserInfo(): Promise<TwitterUserInfo> {
		const response = await fetch(`${TWITTER_API}/users/me`, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get Twitter user info: ${error}`);
		}

		const data = (await response.json()) as { data: TwitterUserInfo };
		this.userId = data.data.id;
		this.username = data.data.username;
		return data.data;
	}

	/**
	 * Get user ID (cached)
	 */
	async getUserId(): Promise<string> {
		if (this.userId) return this.userId;
		const info = await this.getUserInfo();
		return info.id;
	}

	/**
	 * Post a single tweet
	 *
	 * @param text - The tweet content (max 280 chars)
	 * @param replyTo - Optional tweet ID to reply to
	 * @returns Tweet ID and URL
	 */
	async tweet(text: string, replyTo?: string): Promise<TweetResult> {
		const body: Record<string, unknown> = {
			text: text.substring(0, 280) // Twitter's limit
		};

		if (replyTo) {
			body.reply = { in_reply_to_tweet_id: replyTo };
		}

		const response = await fetch(`${TWITTER_API}/tweets`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to post tweet: ${error}`);
		}

		const result = (await response.json()) as { data: { id: string; text: string } };
		const tweetId = result.data.id;

		// Get username for URL
		if (!this.username) {
			await this.getUserInfo();
		}

		return {
			id: tweetId,
			text: result.data.text,
			url: `https://twitter.com/${this.username}/status/${tweetId}`
		};
	}

	/**
	 * Post a thread (multiple connected tweets)
	 *
	 * @param tweets - Array of tweet texts (each max 280 chars)
	 * @returns Thread results with all tweet IDs
	 */
	async thread(tweets: string[]): Promise<ThreadResult> {
		if (tweets.length === 0) {
			throw new Error('Thread must have at least one tweet');
		}

		const results: TweetResult[] = [];
		let previousId: string | undefined;

		for (const text of tweets) {
			const result = await this.tweet(text, previousId);
			results.push(result);
			previousId = result.id;

			// Small delay to avoid rate limits
			if (tweets.length > 1) {
				await this.delay(100);
			}
		}

		return {
			tweets: results,
			threadUrl: results[0].url // First tweet is the thread entry point
		};
	}

	/**
	 * Delete a tweet
	 */
	async deleteTweet(tweetId: string): Promise<void> {
		const response = await fetch(`${TWITTER_API}/tweets/${tweetId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${this.accessToken}`
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to delete tweet: ${error}`);
		}
	}

	/**
	 * Like a tweet
	 */
	async like(tweetId: string): Promise<void> {
		const userId = await this.getUserId();

		const response = await fetch(`${TWITTER_API}/users/${userId}/likes`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ tweet_id: tweetId })
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to like tweet: ${error}`);
		}
	}

	/**
	 * Retweet a tweet
	 */
	async retweet(tweetId: string): Promise<void> {
		const userId = await this.getUserId();

		const response = await fetch(`${TWITTER_API}/users/${userId}/retweets`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ tweet_id: tweetId })
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to retweet: ${error}`);
		}
	}

	/**
	 * Get recent mentions
	 */
	async getMentions(sinceId?: string): Promise<MentionResult[]> {
		const userId = await this.getUserId();

		let url = `${TWITTER_API}/users/${userId}/mentions?tweet.fields=created_at,author_id,conversation_id`;
		if (sinceId) {
			url += `&since_id=${sinceId}`;
		}

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${this.accessToken}`
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get mentions: ${error}`);
		}

		const data = (await response.json()) as MentionsResponse;

		if (!data.data) {
			return [];
		}

		return data.data.map((tweet) => ({
			id: tweet.id,
			text: tweet.text,
			authorId: tweet.author_id,
			conversationId: tweet.conversation_id,
			createdAt: tweet.created_at
		}));
	}

	/**
	 * Reply to a tweet
	 */
	async reply(tweetId: string, text: string): Promise<TweetResult> {
		return this.tweet(text, tweetId);
	}

	/**
	 * Check if the token is valid (not expired)
	 */
	static isTokenValid(token: StoredTwitterToken): boolean {
		return Date.now() < token.expires_at;
	}

	/**
	 * Refresh an expired token
	 */
	static async refreshToken(
		refreshToken: string,
		clientId: string,
		clientSecret?: string
	): Promise<StoredTwitterToken> {
		const params = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId
		});

		const headers: Record<string, string> = {
			'Content-Type': 'application/x-www-form-urlencoded'
		};

		// Basic auth if client secret provided
		if (clientSecret) {
			const credentials = btoa(`${clientId}:${clientSecret}`);
			headers.Authorization = `Basic ${credentials}`;
		}

		const response = await fetch('https://api.twitter.com/2/oauth2/token', {
			method: 'POST',
			headers,
			body: params.toString()
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to refresh Twitter token: ${error}`);
		}

		const data = (await response.json()) as {
			access_token: string;
			refresh_token: string;
			expires_in: number;
			scope: string;
		};

		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_at: Date.now() + data.expires_in * 1000,
			scope: data.scope
		};
	}

	/**
	 * Helper delay function
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * Create a Twitter client from KV-stored token
 */
export async function createTwitterClient(
	kv: KVNamespace,
	clientId?: string,
	clientSecret?: string
): Promise<{ client: TwitterClient; token: StoredTwitterToken } | null> {
	const tokenData = await kv.get('twitter_access_token');

	if (!tokenData) {
		return null;
	}

	let token: StoredTwitterToken = JSON.parse(tokenData);

	// Check if token needs refresh
	if (!TwitterClient.isTokenValid(token) && clientId) {
		try {
			token = await TwitterClient.refreshToken(token.refresh_token, clientId, clientSecret);
			// Store refreshed token
			await kv.put('twitter_access_token', JSON.stringify(token));
		} catch (error) {
			// Refresh failed, clean up
			await kv.delete('twitter_access_token');
			return null;
		}
	}

	return {
		client: new TwitterClient(token.access_token),
		token
	};
}

/**
 * Get token status from KV
 */
export async function getTwitterTokenStatus(
	kv: KVNamespace
): Promise<{
	connected: boolean;
	expiresAt?: string;
	daysRemaining?: number;
	scope?: string;
	warning?: string;
}> {
	const tokenData = await kv.get('twitter_access_token');

	if (!tokenData) {
		return { connected: false };
	}

	const token: StoredTwitterToken = JSON.parse(tokenData);
	const isValid = TwitterClient.isTokenValid(token);
	const msRemaining = token.expires_at - Date.now();
	const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

	return {
		connected: isValid,
		expiresAt: new Date(token.expires_at).toISOString(),
		daysRemaining,
		scope: token.scope,
		...(daysRemaining <= 7 && { warning: `Token expires in ${daysRemaining} days` })
	};
}

// =============================================================================
// Types
// =============================================================================

interface MentionResult {
	id: string;
	text: string;
	authorId: string;
	conversationId: string;
	createdAt: string;
}

interface MentionsResponse {
	data?: Array<{
		id: string;
		text: string;
		author_id: string;
		conversation_id: string;
		created_at: string;
	}>;
}
