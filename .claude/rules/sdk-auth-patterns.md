# SDK Auth Patterns

## The Deciding Constraint: Runtime

The auth pattern depends on **where the code runs**. This is the first question — answer it before choosing a pattern.

| Runtime | Auth Pattern | Rationale |
|---------|-------------|-----------|
| **Cloudflare Workers** (V8 isolates) | Own auth via shared client | Most vendor SDKs require Node.js stdlib. Workers have bundle size limits. Shared infrastructure (BaseAPIClient) already handles OAuth. |
| **Edge-deployable MCP servers** | Own auth with raw fetch | MCP servers should be deployable anywhere. Standard OAuth 2.0 is ~200 lines of fetch. No SDK needed. |
| **Node.js only** (never deployed to edge) | Vendor SDK for auth acceptable | Full stdlib available. SDK encodes vendor-specific edge cases. But ask: will this ever move to Workers? |

**Zero Framework Cognition**: Neither pattern is universally correct. The deployment target determines which is pragmatic. Choosing "always vendor SDK" or "always own auth" without examining the constraint is framework imprisonment.

**Lesson learned**: Ask "where will this deploy?" *before* writing any auth code. The `quickbooks-notion-mcp` server was initially built with a vendor SDK (Pattern B), then had to be rewritten to own auth (Pattern A) when the deployment target turned out to be Cloudflare Workers. The `TokenProvider` interface meant only one file changed — but the SDK was unnecessary work. Standard OAuth 2.0 authorization code flow is simple enough to own from the start.

---

## Pattern A: Own Auth (Platform Integrations)

**When**: You're building integrations on a platform with shared infrastructure (e.g., WORKWAY on Cloudflare Workers with `BaseAPIClient` + `TokenRefreshHandler`).

### The Rule

```
DEFAULT: Own auth via BaseAPIClient + TokenRefreshHandler
  - Standard OAuth 2.0 (authorization code, client credentials)
  - API key / Bearer token
  - Basic auth

EXCEPTION: Vendor auth library ONLY when ALL of these are true:
  - Auth flow is non-standard (not covered by TokenRefreshHandler)
  - Vendor publishes a Workers-compatible package (ESM, no Node stdlib)
  - The auth complexity would require >100 lines of custom code
  - Document the exception with a comment: why vendor SDK, what it replaces

NEVER: Vendor SDK for data operations
  - All API calls go through BaseAPIClient
  - All responses return ActionResult<T>
```

### Why This Works

| Concern | Own Auth | Vendor SDK per Integration |
|---------|----------|---------------------------|
| Workers compatibility | Always works | Breaks often |
| Dependency count | +0 | +N (one per vendor) |
| Bundle size | Minimal | Unpredictable |
| Testing | Mock fetch uniformly | Mock each SDK differently |
| Auth consistency | One pattern | N patterns |
| Update cadence | You control | Vendor controls |

### The Zuhandenheit Test

One `BaseAPIClient` that handles everything is more ready-to-hand than choosing per-integration. The tool recedes further when there's nothing to decide.

---

## Pattern B: Vendor SDK for Auth (Standalone MCP Servers)

**When**: You're building an independent MCP server package that runs on Node.js (stdio or HTTP transport). No shared auth infrastructure exists.

### The Split

| Concern | Use Vendor SDK | Use Custom Client |
|---------|---------------|-------------------|
| Token lifecycle (obtain, refresh, revoke) | Yes | No |
| Auth flow (redirect URL, code exchange) | Yes | No |
| Token persistence (serialize, deserialize) | Yes | No |
| Raw/advanced queries SDK doesn't cover | No | Yes |
| Entity types SDK doesn't support | No | Yes |
| Domain-specific MCP output formatting | No | Yes |
| Financial reports, aggregations | No | Yes |

### Why This Works

**SDK for auth**: OAuth 2.0 is security-critical and fiddly (PKCE, token rotation, expiry windows, error recovery). Vendor SDKs encode edge cases we'd otherwise miss. Without shared infrastructure, you'd be building a `BaseAPIClient` from scratch — more work, not less.

**Custom client for data**: MCP servers need raw access patterns (arbitrary queries, unsupported entities, custom report formats) that typed SDKs intentionally restrict. Our value is in the MCP tool layer, not in reimplementing the API client.

### Architecture

```
┌─────────────────────────────────────────┐
│  MCP Tool Layer                         │
│  (tools/quickbooks.ts, tools/notion.ts) │
├─────────────────────────────────────────┤
│  Custom API Client                      │
│  (services/quickbooks.ts)               │
│  - Raw queries, all entity types        │
│  - Reports, advanced operations         │
│  - Gets access token from auth provider │
├─────────────────────────────────────────┤
│  SDK Auth Provider                      │
│  (services/auth.ts)                     │
│  - Token refresh, rotation              │
│  - Secure serialization                 │
│  - OAuth flow helpers                   │
├─────────────────────────────────────────┤
│  Vendor SDK                             │
│  (quickbooks-api, googleapis, etc.)     │
└─────────────────────────────────────────┘
```

---

## Shared Principles (Both Patterns)

### Token Provider Interface

Regardless of pattern, the API client should accept a token provider, not a static token:

```typescript
interface TokenProvider {
  getAccessToken(): Promise<string>;
}

class APIClient {
  constructor(private tokenProvider: TokenProvider) {}

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.tokenProvider.getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }
}
```

This decouples the API client from auth concerns entirely. Whether the token provider wraps a vendor SDK or a shared `BaseAPIClient`, the consumer doesn't know or care.

### Token Persistence

Tokens are **state**, not **configuration**. They should NOT live in environment variables.

| Context | Storage | Example |
|---------|---------|---------|
| Local MCP (stdio) | Encrypted file | `.qbo-tokens.json` (gitignored) |
| Cloudflare Workers | KV or D1 | `TOKENS` namespace |
| Multi-tenant | D1 per-tenant | `tokens` table keyed by tenant |

Environment variables hold **credentials** (client ID, client secret) — things that don't rotate.

### First-Time Setup Flow

Every OAuth integration needs a one-time setup:

1. User runs `pnpm auth` (or equivalent)
2. Server starts local HTTP server for callback
3. Opens browser to vendor's OAuth consent screen
4. User authorizes → redirect to callback
5. Server exchanges code for tokens, persists them
6. After setup, the server reads persisted tokens and auto-refreshes

### Vendor SDK for Data Ops: Never

Both patterns agree: **never use vendor SDK for data operations**. All data flows through your own client, returning your own types. This ensures:
- Consistent error handling and response formatting
- Coverage beyond what the SDK supports
- No vendor lock-in on the data path

---

## Decision Framework

When adding a new vendor integration, ask in order:

1. **Where does this run?** Workers → Pattern A. Node.js → Pattern B.
2. **Is there shared auth infrastructure?** Yes → Pattern A (use it). No → Pattern B.
3. **If Pattern B: is there a good vendor SDK?** Evaluate: does it handle token refresh, PKCE, serialization? Is it runtime-compatible?
4. **If Pattern B and no good SDK**: implement OAuth manually using `oauth4webapi` or raw fetch.
5. **Never**: use vendor SDK for data operations, regardless of pattern.

## Instances

| Package | Runtime | Pattern | Auth Approach | Data Client |
|---------|---------|---------|---------------|-------------|
| WORKWAY integrations | Workers | A | `BaseAPIClient` + `TokenRefreshHandler` | `BaseAPIClient` |
| `halfdozen-gmail-sync` | Node.js | B | `googleapis` OAuth2Client | Custom + Notion SDK |
| `quickbooks-notion-mcp` | Workers-ready | A | Own OAuth with raw fetch | Custom `QuickBooksClient` |

## Three-Tier Framework Alignment

The OAuth token is an **Artifact** — a typed boundary contract flowing through all three tiers.

| Tier | Role in Auth | Control Model |
|------|-------------|---------------|
| **Database** | Token persistence (file, KV, D1). Client credentials in env vars. Token state: exists, can be queried, expires. | Application-controlled — the app decides when to load/persist |
| **Automation** | Token refresh (SDK auto-refresh or BaseAPIClient). API calls consuming the token. MCP tools that trigger API calls. | Model-controlled — the agent decides which tools to invoke |
| **Judgment** | OAuth scopes (`com.intuit.quickbooks.accounting`). Read-only constraints (`SELECT`-only validation). Human grants access at consent screen. | User-controlled — the human decides what access to grant |

### Policy as Artifact

The read-only constraint in the QuickBooks MCP is policy-as-artifact: a behavioral rule stored as code (Database), enforced during execution (Automation), defined by architectural decision (Judgment). OAuth scopes are policy encoded into the token artifact itself.

### Cross-Cutting Concerns

| Concern | Auth Implementation |
|---------|-------------------|
| **Touchpoints** | OAuth callback URL, MCP server endpoints |
| **Artifacts** | The Token object (access token, refresh token, expiry, realm ID, scopes) |
| **Orchestration** | OAuth setup flow: generate URL → user authorizes → callback → exchange → persist. Procedural, deterministic, application-controlled. |
| **Insight** | Token refresh logging, expiry warnings, auth failure diagnostics |

### Debugging Heuristic

When auth fails, check tiers in order:
1. **Database** — Are tokens persisted? Can they be loaded? Is the file corrupted?
2. **Automation** — Did token refresh succeed? Did the API call return 401?
3. **Judgment** — Were the right scopes selected? Is read-only too restrictive for the operation?
