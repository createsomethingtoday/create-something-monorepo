export type InvocationPath = 'legacy_proxy' | 'broker' | 'management';

export type InvocationMetadataInput = {
  path: InvocationPath;
  accountId: string;
  toolName: string;
  downstreamServer?: string;
  downstreamTool?: string;
  toolRef?: string;
  deprecatedLegacyProxy?: boolean;
  extra?: Record<string, unknown>;
};

export function buildInvocationMetadata(input: InvocationMetadataInput): Record<string, unknown> {
  return {
    path: input.path,
    accountId: input.accountId,
    toolName: input.toolName,
    downstreamServer: input.downstreamServer ?? null,
    downstreamTool: input.downstreamTool ?? null,
    toolRef: input.toolRef ?? null,
    deprecatedLegacyProxy: input.deprecatedLegacyProxy ?? false,
    ...(input.extra ?? {}),
  };
}

export function buildLegacyDeprecationMetadata(
  downstreamServer: string,
  downstreamTool: string,
): Record<string, unknown> {
  return {
    deprecated: true,
    sunsetPolicy: 'legacy_proxy_tools_migration',
    replacement: {
      searchTool: 'hub_tools_search',
      describeTool: 'hub_tools_describe',
      invokeTool: 'hub_tools_invoke',
      toolRef: `${downstreamServer}::${downstreamTool}`,
    },
  };
}
