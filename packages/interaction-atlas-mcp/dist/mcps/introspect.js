import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const CACHE_TTL_MS = 30_000;
const cache = new Map();
function hasMimeType(x) {
    return typeof x === 'object' && x !== null && 'mimeType' in x;
}
export async function introspectMcpServer(url, options) {
    const ttl = options?.cacheTtlMs ?? CACHE_TTL_MS;
    const cached = cache.get(url);
    if (cached && Date.now() - cached.at < ttl)
        return cached.value;
    const result = await introspectMcpServerUncached(url, options?.headers);
    cache.set(url, { at: Date.now(), value: result });
    return result;
}
async function introspectMcpServerUncached(url, headers) {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
        requestInit: headers ? { headers } : undefined,
    });
    const client = new Client({ name: 'interaction-atlas-mapper', version: '0.1.0' }, { capabilities: {} });
    try {
        await client.connect(transport);
        const tools = await client.listTools();
        const resources = await client.listResources();
        const prompts = await client.listPrompts();
        return {
            ok: true,
            value: {
                url,
                tools: tools.tools.map((t) => ({ name: t.name, description: t.description })),
                resources: resources.resources.map((r) => ({
                    uri: r.uri,
                    name: r.name,
                    description: r.description,
                    mimeType: hasMimeType(r) ? r.mimeType : undefined,
                })),
                prompts: prompts.prompts.map((p) => ({ name: p.name, description: p.description })),
            },
        };
    }
    catch (error) {
        return {
            ok: false,
            url,
            error: error instanceof Error ? error.message : String(error),
        };
    }
    finally {
        try {
            await client.close();
        }
        catch {
            // ignore
        }
    }
}
//# sourceMappingURL=introspect.js.map