import { MCP_CATALOG } from '@create-something/playbook-mcp/catalog';
import type { McpCatalogEntry } from '@create-something/playbook-mcp/catalog';
export type { McpCatalogEntry };
export declare function listMcpCatalog(category?: McpCatalogEntry['category'] | 'all'): McpCatalogEntry[];
export declare function findMcpCatalogEntry(slug: string): McpCatalogEntry | undefined;
export declare function resolveMcpHttpEndpointUrlFromUrl(rawUrl: string): string;
export declare function resolveMcpHttpEndpointUrl(entry: McpCatalogEntry): string;
export { MCP_CATALOG };
//# sourceMappingURL=catalog.d.ts.map