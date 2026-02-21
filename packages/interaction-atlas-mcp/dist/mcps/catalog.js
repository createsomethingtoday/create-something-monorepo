import { MCP_CATALOG, getCatalogByCategory, getCatalogEntry } from '@create-something/playbook-mcp/catalog';
export function listMcpCatalog(category) {
    return getCatalogByCategory(category === 'all' ? undefined : category);
}
export function findMcpCatalogEntry(slug) {
    return getCatalogEntry(slug);
}
export function resolveMcpHttpEndpointUrlFromUrl(rawUrl) {
    // Catalog URLs are generally base domains; our servers expose Streamable HTTP at /mcp.
    // If the URL already points to an endpoint path, don't mutate it.
    const url = rawUrl.replace(/\/+$/g, '');
    if (url.endsWith('/mcp'))
        return url;
    if (url.endsWith('/sse'))
        return url;
    return `${url}/mcp`;
}
export function resolveMcpHttpEndpointUrl(entry) {
    return resolveMcpHttpEndpointUrlFromUrl(entry.url);
}
export { MCP_CATALOG };
//# sourceMappingURL=catalog.js.map