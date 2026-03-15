const LINKEDIN_API = "https://api.linkedin.com/v2";
class LinkedInClient {
  constructor(accessToken, apiVersion = "202412") {
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
  }
  userId = null;
  /**
   * Get the authenticated user's LinkedIn ID
   */
  async getUserId() {
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
    const userInfo = await response.json();
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
  async post(text, organizationId) {
    const author = organizationId ? `urn:li:organization:${organizationId}` : `urn:li:person:${await this.getUserId()}`;
    const response = await fetch(`${LINKEDIN_API}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text.substring(0, 3e3)
              // LinkedIn's limit
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to post to LinkedIn: ${error}`);
    }
    const result = await response.json();
    const postId = result.id;
    postId.split(":").pop();
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
  async addComment(postId, text, organizationId) {
    const actor = organizationId ? `urn:li:organization:${organizationId}` : `urn:li:person:${await this.getUserId()}`;
    const response = await fetch(`${LINKEDIN_API}/socialActions/${postId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        actor,
        message: {
          text
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
  static isTokenValid(token) {
    return Date.now() < token.expires_at;
  }
  /**
   * Get days until token expires
   */
  static daysUntilExpiry(token) {
    const msRemaining = token.expires_at - Date.now();
    return Math.floor(msRemaining / (1e3 * 60 * 60 * 24));
  }
}
async function getTokenStatus(kv) {
  const tokenData = await kv.get("linkedin_access_token");
  if (!tokenData) {
    return { connected: false };
  }
  const token = JSON.parse(tokenData);
  const isValid = LinkedInClient.isTokenValid(token);
  const daysRemaining = LinkedInClient.daysUntilExpiry(token);
  return {
    connected: isValid,
    expiresAt: new Date(token.expires_at).toISOString(),
    daysRemaining,
    scope: token.scope,
    organizations: token.organizations,
    ...daysRemaining <= 7 && { warning: `Token expires in ${daysRemaining} days` }
  };
}
export {
  getTokenStatus as g
};
