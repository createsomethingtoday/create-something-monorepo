import { MCP_CATALOG, getCatalogByCategory, getCatalogEntry } from '@create-something/playbook-mcp/catalog';
import type { McpCatalogEntry } from '@create-something/playbook-mcp/catalog';

export type { McpCatalogEntry };

export function listMcpCatalog(category?: McpCatalogEntry['category'] | 'all'): McpCatalogEntry[] {
  return getCatalogByCategory(category === 'all' ? undefined : category);
}

export function findMcpCatalogEntry(slug: string): McpCatalogEntry | undefined {
  return getCatalogEntry(slug);
}

export function resolveMcpHttpEndpointUrlFromUrl(rawUrl: string): string {
  // Catalog URLs are generally base domains; our servers expose Streamable HTTP at /mcp.
  // If the URL already points to an endpoint path, don't mutate it.
  const url = rawUrl.replace(/\/+$/g, '');
  if (url.endsWith('/mcp')) return url;
  if (url.endsWith('/sse')) return url;
  return `${url}/mcp`;
}

export function resolveMcpHttpEndpointUrl(entry: McpCatalogEntry): string {
  return resolveMcpHttpEndpointUrlFromUrl(entry.url);
}

export { MCP_CATALOG };

