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
import { getAccountAccess, resolveEffectiveToolAccessMode } from './storage/security.js';
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
        const rhs = pair.slice(idx + 1).trim();
        const [accountIdRaw, roleRaw] = rhs.split(':');
        const accountId = accountIdRaw?.trim();
        const role = roleRaw?.trim();
        if (!key || !accountId)
            continue;
        map.set(key, {
            accountId,
            role: role === 'admin' || role === 'operator' || role === 'auditor' || role === 'readonly' ? role : 'operator',
        });
    }
    return map;
}
function roleCanWrite(role) {
    return role === 'admin' || role === 'operator';
}
function roleCanApprove(role) {
    return role === 'admin' || role === 'operator';
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
function firstHeader(request, names) {
    if (!request)
        return null;
    for (const name of names) {
        const value = request.headers.get(name);
        if (value && value.trim().length > 0)
            return value.trim();
    }
    return null;
}
function fallbackCorrelationId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return `corr_${ts}_${rand}`;
}
function normalizeToolAccessMode(raw) {
    if (!raw)
        return 'normal';
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'off' || normalized === 'deny_all' || normalized === 'disabled')
        return 'off';
    if (normalized === 'read_only' || normalized === 'read-only' || normalized === 'readonly')
        return 'read_only';
    return 'normal';
}
function parsePositiveInt(raw, fallback) {
    if (!raw)
        return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0)
        return fallback;
    return Math.floor(value);
}
function normalizeAbuseResponseMode(raw) {
    if (!raw)
        return 'auto_off';
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'review' || normalized === 'review_then_act')
        return 'review';
    return 'auto_off';
}
function extractCorrelationId(request) {
    const direct = firstHeader(request, ['x-correlation-id', 'x-request-id', 'cf-ray']);
    if (direct)
        return direct;
    const traceparent = firstHeader(request, ['traceparent']);
    if (traceparent) {
        const parts = traceparent.split('-');
        if (parts.length >= 3 && parts[1] && parts[2]) {
            return `${parts[1]}-${parts[2]}`;
        }
    }
    return fallbackCorrelationId();
}
export class InteractionAtlasAuthProvider {
    async resolve(request, env) {
        const apiKey = extractApiKey(request);
        const requestUrl = request ? new URL(request.url) : null;
        const baseUrl = requestUrl ? `${requestUrl.protocol}//${requestUrl.host}` : null;
        const gitSha = env?.GIT_SHA ?? process.env.GIT_SHA ?? 'unknown';
        const runtimeRef = env?.RUNTIME_REF ?? process.env.RUNTIME_REF ?? 'unknown';
        const policyVersionId = env?.POLICY_VERSION_ID ?? process.env.POLICY_VERSION_ID ?? 'policy-v1';
        const osoUrl = env?.OSO_URL ?? process.env.OSO_URL;
        const osoApiKey = env?.OSO_API_KEY ?? process.env.OSO_API_KEY;
        const osoBootstrapPolicy = env?.OSO_BOOTSTRAP_POLICY ?? process.env.OSO_BOOTSTRAP_POLICY ?? 'false';
        const engineFallbackEnabled = env?.ENGINE_FALLBACK_ENABLED ?? process.env.ENGINE_FALLBACK_ENABLED ?? 'true';
        const osoFetchTimeoutRaw = env?.OSO_FETCH_TIMEOUT_MS ?? process.env.OSO_FETCH_TIMEOUT_MS;
        const osoFetchTimeout = osoFetchTimeoutRaw ? Number(osoFetchTimeoutRaw) : undefined;
        const mcpToolAccessMode = normalizeToolAccessMode(env?.MCP_TOOL_ACCESS_MODE ?? process.env.MCP_TOOL_ACCESS_MODE);
        const abuseGuardEnabled = env?.ABUSE_GUARD_ENABLED ?? process.env.ABUSE_GUARD_ENABLED ?? 'true';
        const abuseWindowSeconds = parsePositiveInt(env?.ABUSE_WINDOW_SECONDS ?? process.env.ABUSE_WINDOW_SECONDS, 300);
        const abuseBlockThreshold = parsePositiveInt(env?.ABUSE_BLOCK_THRESHOLD ?? process.env.ABUSE_BLOCK_THRESHOLD, 8);
        const abuseDistinctToolsThreshold = parsePositiveInt(env?.ABUSE_DISTINCT_TOOLS_THRESHOLD ?? process.env.ABUSE_DISTINCT_TOOLS_THRESHOLD, 2);
        const abuseResponseMode = normalizeAbuseResponseMode(env?.ABUSE_RESPONSE_MODE ?? process.env.ABUSE_RESPONSE_MODE);
        const correlationId = extractCorrelationId(request);
        const langfuseProjectName = env?.LANGFUSE_PROJECT_NAME ?? process.env.LANGFUSE_PROJECT_NAME ?? process.env.LANGFUSE_PROJECT ?? 'CREATE SOMETHING';
        const langfuseEnabled = env?.LANGFUSE_ENABLED ?? process.env.LANGFUSE_ENABLED;
        const langfusePublicKey = env?.LANGFUSE_PUBLIC_KEY ?? process.env.LANGFUSE_PUBLIC_KEY;
        const langfuseSecretKey = env?.LANGFUSE_SECRET_KEY ?? process.env.LANGFUSE_SECRET_KEY;
        const langfuseHost = env?.LANGFUSE_BASE_URL ??
            env?.LANGFUSE_HOST ??
            process.env.LANGFUSE_BASE_URL ??
            process.env.LANGFUSE_HOST;
        // Public, read-only access (used for the workflow viewer).
        if (!apiKey) {
            const accountAccess = await getAccountAccess(env?.DB, 'public');
            const effectiveToolAccessMode = resolveEffectiveToolAccessMode(mcpToolAccessMode, accountAccess.mode);
            return {
                accountId: 'public',
                tokenProvider: { getAccessToken: async () => '' },
                metadata: {
                    auth: 'none',
                    correlationId,
                    baseUrl,
                    gitSha,
                    runtimeRef,
                    policyVersionId,
                    OSO_URL: osoUrl,
                    OSO_API_KEY: osoApiKey,
                    OSO_BOOTSTRAP_POLICY: osoBootstrapPolicy,
                    ENGINE_FALLBACK_ENABLED: engineFallbackEnabled,
                    OSO_FETCH_TIMEOUT_MS: Number.isFinite(osoFetchTimeout ?? NaN) ? osoFetchTimeout : undefined,
                    MCP_TOOL_ACCESS_MODE: effectiveToolAccessMode,
                    ACCOUNT_TOOL_ACCESS_MODE: accountAccess.mode,
                    ABUSE_GUARD_ENABLED: abuseGuardEnabled,
                    ABUSE_WINDOW_SECONDS: abuseWindowSeconds,
                    ABUSE_BLOCK_THRESHOLD: abuseBlockThreshold,
                    ABUSE_DISTINCT_TOOLS_THRESHOLD: abuseDistinctToolsThreshold,
                    ABUSE_RESPONSE_MODE: abuseResponseMode,
                    LANGFUSE_PROJECT_NAME: langfuseProjectName,
                    LANGFUSE_ENABLED: langfuseEnabled,
                    __langfusePublicKey: langfusePublicKey,
                    __langfuseSecretKey: langfuseSecretKey,
                    __langfuseHost: langfuseHost,
                    db: env?.DB,
                },
                policy: defaultPolicy({
                    readOnly: true,
                    scopes: ['atlas:read', 'workflow:read'],
                    constraints: {
                        allowVersionOverride: false,
                        allowVersionSelectionWrite: false,
                        mcpToolAccessMode: effectiveToolAccessMode,
                        accountToolAccessMode: accountAccess.mode,
                    },
                }),
            };
        }
        const configuredKeys = parseApiKeys(env?.API_KEYS ?? process.env.API_KEYS);
        const binding = configuredKeys.size > 0 ? configuredKeys.get(apiKey) : { accountId: 'default', role: 'operator' };
        if (configuredKeys.size > 0 && !binding) {
            throw new AuthError('Invalid API key.');
        }
        const accountId = binding?.accountId ?? 'default';
        const role = binding?.role ?? 'operator';
        const accountAccess = await getAccountAccess(env?.DB, accountId);
        const effectiveToolAccessMode = resolveEffectiveToolAccessMode(mcpToolAccessMode, accountAccess.mode);
        const canWrite = roleCanWrite(role);
        const canApprove = roleCanApprove(role);
        return {
            accountId,
            tokenProvider: { getAccessToken: async () => apiKey },
            metadata: {
                auth: 'api_key',
                correlationId,
                role,
                baseUrl,
                gitSha,
                runtimeRef,
                policyVersionId,
                OSO_URL: osoUrl,
                OSO_API_KEY: osoApiKey,
                OSO_BOOTSTRAP_POLICY: osoBootstrapPolicy,
                ENGINE_FALLBACK_ENABLED: engineFallbackEnabled,
                OSO_FETCH_TIMEOUT_MS: Number.isFinite(osoFetchTimeout ?? NaN) ? osoFetchTimeout : undefined,
                MCP_TOOL_ACCESS_MODE: effectiveToolAccessMode,
                ACCOUNT_TOOL_ACCESS_MODE: accountAccess.mode,
                ABUSE_GUARD_ENABLED: abuseGuardEnabled,
                ABUSE_WINDOW_SECONDS: abuseWindowSeconds,
                ABUSE_BLOCK_THRESHOLD: abuseBlockThreshold,
                ABUSE_DISTINCT_TOOLS_THRESHOLD: abuseDistinctToolsThreshold,
                ABUSE_RESPONSE_MODE: abuseResponseMode,
                LANGFUSE_PROJECT_NAME: langfuseProjectName,
                LANGFUSE_ENABLED: langfuseEnabled,
                __langfusePublicKey: langfusePublicKey,
                __langfuseSecretKey: langfuseSecretKey,
                __langfuseHost: langfuseHost,
                db: env?.DB,
            },
            policy: defaultPolicy({
                readOnly: !canWrite,
                scopes: canWrite ? ['atlas:read', 'workflow:read', 'workflow:write'] : ['atlas:read', 'workflow:read'],
                constraints: {
                    allowVersionOverride: canWrite,
                    allowVersionSelectionWrite: canWrite,
                    allowControlPlaneWrite: canWrite,
                    allowApprovalDecide: canApprove,
                    mcpToolAccessMode: effectiveToolAccessMode,
                    accountToolAccessMode: accountAccess.mode,
                },
            }),
        };
    }
}
//# sourceMappingURL=auth.js.map