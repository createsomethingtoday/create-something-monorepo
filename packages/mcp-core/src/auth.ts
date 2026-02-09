/**
 * AuthProvider — resolves incoming requests to AccountContext
 *
 * Three-Tier Framework alignment:
 *   - Database tier:  loads tokens from TokenStore
 *   - Judgment tier:  resolves policy per account
 *   - Automation tier: consumed by ScopedMcpServer before tool execution
 *
 * The AuthProvider is the bridge between "who is calling?" and "what are they
 * allowed to do?" — it produces the AccountContext Artifact that flows through
 * every MCP primitive.
 *
 * Implementations:
 *   - OAuthProvider:    OAuth 2.0 authorization code / client credentials
 *   - APIKeyProvider:   API key per account (header or query param)
 *   - StdioSingleUser:  Local stdio, single user (reads from env/file)
 */

import type { AccountContext, AccountPolicy, TokenSet } from './context.js';

// =============================================================================
// Auth Provider Interface
// =============================================================================

/**
 * Flexible auth interface — each MCP implements based on the service it connects to.
 *
 * The `TEnv` generic accommodates Cloudflare Workers `Env` bindings, Node.js
 * `process.env`, or any other runtime environment.
 */
export interface AuthProvider<TEnv = unknown> {
  /**
   * Resolve an incoming request to an AccountContext.
   *
   * For stdio transport, `request` is null — the provider resolves from
   * environment variables, config files, or a single-user default.
   *
   * For HTTP/SSE/Worker transports, `request` contains auth headers,
   * session cookies, or bearer tokens that identify the caller.
   */
  resolve(request: Request | null, env?: TEnv): Promise<AccountContext>;

  /**
   * Persist tokens after refresh.
   *
   * Called by the ScopedMcpServer when a TokenProvider reports new tokens
   * (e.g., after an OAuth refresh). This keeps the Database tier in sync.
   */
  persistTokens?(ctx: AccountContext, tokens: TokenSet): Promise<void>;

  /**
   * Load account policy.
   *
   * Optional — if not implemented, the AuthProvider must include policy
   * directly in the AccountContext returned by resolve().
   *
   * Separate method allows policy to be loaded/refreshed independently
   * of auth resolution (e.g., from a policy database or config service).
   */
  resolvePolicy?(accountId: string, env?: TEnv): Promise<AccountPolicy>;
}
