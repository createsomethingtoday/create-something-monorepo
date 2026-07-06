/**
 * Interaction Atlas — Auth Provider
 *
 * V1 is intentionally simple: we support public read-only access (no key) and
 * optional API-key based account scoping for client-specific workflows.
 *
 * For production, you likely want OAuth or a proper token store. This provider
 * keeps the primitive relative while we prove out the Atlas workflow layer.
 */
import type { AuthProvider, AccountContext } from '@create-something/mcp-core';
import type { D1Database } from '@create-something/mcp-core';
export type InteractionAtlasEnv = {
    /**
     * Optional API key map for multi-account access.
     *
     * Format:
     *   "key1:account-a,key2:account-b"
     *   "key1:account-a:admin,key2:account-b:operator"
     *
     * If unset, any presented API key maps to the `default` account.
     */
    API_KEYS?: string;
    GIT_SHA?: string;
    RUNTIME_REF?: string;
    POLICY_VERSION_ID?: string;
    OSO_URL?: string;
    OSO_API_KEY?: string;
    OSO_BOOTSTRAP_POLICY?: string;
    ENGINE_FALLBACK_ENABLED?: string;
    OSO_FETCH_TIMEOUT_MS?: string;
    MCP_TOOL_ACCESS_MODE?: string;
    ABUSE_GUARD_ENABLED?: string;
    ABUSE_WINDOW_SECONDS?: string;
    ABUSE_BLOCK_THRESHOLD?: string;
    ABUSE_DISTINCT_TOOLS_THRESHOLD?: string;
    ABUSE_RESPONSE_MODE?: string;
    LANGFUSE_PROJECT_NAME?: string;
    LANGFUSE_ENABLED?: string;
    LANGFUSE_PUBLIC_KEY?: string;
    LANGFUSE_SECRET_KEY?: string;
    LANGFUSE_HOST?: string;
    LANGFUSE_BASE_URL?: string;
    DB?: D1Database;
};
export declare class InteractionAtlasAuthProvider implements AuthProvider<InteractionAtlasEnv> {
    resolve(request: Request | null, env?: InteractionAtlasEnv): Promise<AccountContext>;
}
//# sourceMappingURL=auth.d.ts.map