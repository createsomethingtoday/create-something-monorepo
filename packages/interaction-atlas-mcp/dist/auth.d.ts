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
    DB?: D1Database;
};
export declare class InteractionAtlasAuthProvider implements AuthProvider<InteractionAtlasEnv> {
    resolve(request: Request | null, env?: InteractionAtlasEnv): Promise<AccountContext>;
}
//# sourceMappingURL=auth.d.ts.map