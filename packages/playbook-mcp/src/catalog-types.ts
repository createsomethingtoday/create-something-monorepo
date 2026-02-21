export interface McpCatalogEntry {
  name: string;
  slug: string;
  url: string;
  description: string;
  category: 'create-something' | 'workway' | 'third-party';
  transports: ('http' | 'sse')[];
  requiresAuth: boolean;
  /** Auth type hint for config generation. Default: 'bearer' if requiresAuth. */
  authType?: 'bearer' | 'oauth';
  /** Setup notes shown when listing or installing. Markdown-formatted. */
  setupNotes?: string;
}
