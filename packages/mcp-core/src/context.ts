/**
 * AccountContext — The Artifact that flows through all three tiers
 *
 * Three-Tier Framework alignment:
 *   - Database tier:  accountId, userId, teamId, tokenProvider, metadata (what exists)
 *   - Judgment tier:  policy (what should happen — constraints, scopes, trust level)
 *
 * The Automation tier is where this Artifact is *consumed* — by Tools, the
 * ScopedMcpServer, and API clients. AccountContext doesn't contain Automation;
 * it flows through it.
 *
 * "The primitive is always relative" — every MCP primitive (Resource, Tool, Prompt)
 * operates within the boundary of an AccountContext. Nothing runs globally.
 */

// =============================================================================
// Token Provider (Database Tier — application-controlled state)
// =============================================================================

/**
 * Provides access tokens for API calls.
 *
 * Decouples the API client from auth concerns entirely. Whether the provider
 * wraps a vendor SDK, a shared BaseAPIClient, or reads from a file — the
 * consumer doesn't know or care.
 *
 * See: sdk-auth-patterns.md § Token Provider Interface
 */
export interface TokenProvider {
  getAccessToken(): Promise<string>;
}

// =============================================================================
// Token Set (Database Tier — persisted state)
// =============================================================================

/**
 * The token artifact — what gets persisted and refreshed.
 *
 * Tokens are state, not configuration. They should NOT live in environment
 * variables. Environment variables hold credentials (client ID, client secret) —
 * things that don't rotate.
 */
export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scopes?: string[];
}

// =============================================================================
// Token Store (Database Tier — persistence interface)
// =============================================================================

/**
 * Persistence for token artifacts.
 *
 * Decoupled from auth logic — the store doesn't know about OAuth flows,
 * refresh logic, or scopes. It stores and retrieves TokenSets keyed by
 * accountId.
 *
 * | Context           | Implementation    |
 * |-------------------|-------------------|
 * | Local stdio       | FileTokenStore    |
 * | Cloudflare KV     | KVTokenStore      |
 * | Cloudflare D1     | D1TokenStore      |
 */
export interface TokenStore {
  get(accountId: string): Promise<TokenSet | null>;
  set(accountId: string, tokens: TokenSet): Promise<void>;
  delete(accountId: string): Promise<void>;
}

// =============================================================================
// Account Policy (Judgment Tier — user-controlled constraints)
// =============================================================================

/**
 * Policy as Artifact — stored in Database, applied by Automation, defined by Judgment.
 *
 * Different accounts can have different policies. This enables:
 *   - Graduated trust: read-only for some accounts, full access for others
 *   - Tool-level access control: restrict which tools an account can invoke
 *   - Sampling depth limits: prevent recursive feedback loops from going too deep
 *   - Service-specific constraints: anything the vendor API needs
 *
 * Policy is not fixed scaffolding — it's data that flows through the tiers
 * like any other artifact.
 */
export interface AccountPolicy {
  /** OAuth scopes / permission strings this context is authorized for */
  scopes: string[];

  /** Write constraint — immutable policy tier. When true, tools must not modify state. */
  readOnly?: boolean;

  /** Tool-level access control — if set, only these tools can be invoked */
  allowedTools?: string[];

  /** Limit recursive sampling depth (Automation requesting Judgment) */
  maxSamplingDepth?: number;

  /** Service-specific policy constraints */
  constraints: Record<string, unknown>;
}

// =============================================================================
// Account Context (The Artifact)
// =============================================================================

/**
 * The boundary contract that scopes every MCP primitive.
 *
 * Every tool handler, resource handler, and prompt handler receives this.
 * Nothing runs without it. The primitive is always relative.
 */
export interface AccountContext {
  // --- Database Tier (what exists) ---

  /** The scoping key — all primitives are relative to this */
  accountId: string;

  /** Individual user within the account (optional) */
  userId?: string;

  /** Team/org within the account (optional) */
  teamId?: string;

  /** Gets access tokens for API calls */
  tokenProvider: TokenProvider;

  /** Service-specific extras (realmId, webhook URL, etc.) */
  metadata: Record<string, unknown>;

  // --- Judgment Tier (what should happen) ---

  /** Constraints governing this account's behavior */
  policy: AccountPolicy;
}

// =============================================================================
// Factory — create a default policy
// =============================================================================

/**
 * Creates a permissive default policy.
 *
 * Use as a starting point, then layer restrictions:
 *   const policy = { ...defaultPolicy(), readOnly: true };
 */
export function defaultPolicy(overrides?: Partial<AccountPolicy>): AccountPolicy {
  return {
    scopes: [],
    readOnly: false,
    constraints: {},
    ...overrides,
  };
}
