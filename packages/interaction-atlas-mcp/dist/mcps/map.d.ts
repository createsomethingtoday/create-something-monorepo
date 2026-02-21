import type { McpCatalogEntry } from './catalog.js';
import type { McpIntrospection } from './introspect.js';
import type { AtlasWorkflowDefinition } from '../workflows/types.js';
export type McpWorkflowMapping = {
    definition: AtlasWorkflowDefinition;
    warnings: string[];
};
export declare function mapMcpToWorkflowDefinition(entry: McpCatalogEntry, introspection?: McpIntrospection): McpWorkflowMapping;
//# sourceMappingURL=map.d.ts.map