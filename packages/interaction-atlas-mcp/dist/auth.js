/**
 * Interaction Atlas — Auth Provider
 *
 * V1 is intentionally simple: we support public read-only access (no key) and
 * optional API-key based account scoping for client-specific workflows.
 *
 * For production, you likely want OAuth or a proper token store. This provider
 * keeps the primitive relative while we prove out the Atlas workflow layer.
 */
import { AuthError, defaultPolicy } from '@create-something/mcp-core';
function parseApiKeys(value) {
    const map = new Map();
    if (!value)
        return map;
    for (const rawPair of value.split(',')) {
        const pair = rawPair.trim();
        if (!pair)
            continue;
        const idx = pair.indexOf(':');
        if (idx === -1)
            continue;
        const key = pair.slice(0, idx).trim();
        const accountId = pair.slice(idx + 1).trim();
        if (!key || !accountId)
            continue;
        map.set(key, accountId);
    }
    return map;
}
function extractApiKey(request) {
    if (!request)
        return process.env.API_KEY ?? null;
    const headerKey = request.headers.get('x-api-key');
    if (headerKey)
        return headerKey;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer '))
        return authHeader.slice(7);
    return null;
}
export class InteractionAtlasAuthProvider {
    async resolve(request, env) {
        const apiKey = extractApiKey(request);
        // Public, read-only access (used for the workflow viewer).
        if (!apiKey) {
            return {
                accountId: 'public',
                tokenProvider: { getAccessToken: async () => '' },
                metadata: { auth: 'none' },
                policy: defaultPolicy({
                    readOnly: true,
                    scopes: ['atlas:read', 'workflow:read'],
                }),
            };
        }
        const configuredKeys = parseApiKeys(env?.API_KEYS ?? process.env.API_KEYS);
        const accountId = configuredKeys.size > 0 ? configuredKeys.get(apiKey) : 'default';
        if (configuredKeys.size > 0 && !accountId) {
            throw new AuthError('Invalid API key.');
        }
        return {
            accountId: accountId ?? 'default',
            tokenProvider: { getAccessToken: async () => apiKey },
            metadata: { auth: 'api_key' },
            policy: defaultPolicy({
                readOnly: true, // v1: view-only; v2 can enable writes per account
                scopes: ['atlas:read', 'workflow:read'],
            }),
        };
    }
}
//# sourceMappingURL=auth.js.map