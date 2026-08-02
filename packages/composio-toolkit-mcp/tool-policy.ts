import type { ComposioToolDef } from '@create-something/composio-bridge';

export const GSC_READONLY_POLICY_ID = 'policy.composio-gsc-readonly.v1';

export const GSC_READONLY_TOOL_SLUGS = [
  'GOOGLE_SEARCH_CONSOLE_LIST_SITES',
  'GOOGLE_SEARCH_CONSOLE_GET_SITE',
  'GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY',
  'GOOGLE_SEARCH_CONSOLE_INSPECT_URL',
  'GOOGLE_SEARCH_CONSOLE_LIST_SITEMAPS',
  'GOOGLE_SEARCH_CONSOLE_GET_SITEMAP'
] as const;

export type ToolkitToolPolicy = {
  policyId: string;
  mode: 'dynamic' | 'exact_allowlist';
  sourceToolCount: number;
  exposedToolCount: number;
  deniedToolCount: number;
  allowedToolSlugs: string[];
  deniedToolSlugs: string[];
};

export type ToolkitToolProjection = {
  toolDefs: ComposioToolDef[];
  policy: ToolkitToolPolicy;
};

export function projectToolkitTools(
  toolkitSlug: string,
  discoveredTools: ComposioToolDef[]
): ToolkitToolProjection {
  if (toolkitSlug.trim().toLowerCase() !== 'google_search_console') {
    return {
      toolDefs: discoveredTools,
      policy: {
        policyId: 'policy.composio-toolkit-dynamic.v1',
        mode: 'dynamic',
        sourceToolCount: discoveredTools.length,
        exposedToolCount: discoveredTools.length,
        deniedToolCount: 0,
        allowedToolSlugs: discoveredTools.map((tool) => tool.slug),
        deniedToolSlugs: []
      }
    };
  }

  const discoveredBySlug = new Map(discoveredTools.map((tool) => [tool.slug, tool]));
  const toolDefs = GSC_READONLY_TOOL_SLUGS.flatMap((slug) => {
    const definition = discoveredBySlug.get(slug);
    return definition ? [definition] : [];
  });
  const allowlist = new Set<string>(GSC_READONLY_TOOL_SLUGS);
  const deniedToolSlugs = discoveredTools
    .map((tool) => tool.slug)
    .filter((slug) => !allowlist.has(slug))
    .sort((left, right) => left.localeCompare(right));

  return {
    toolDefs,
    policy: {
      policyId: GSC_READONLY_POLICY_ID,
      mode: 'exact_allowlist',
      sourceToolCount: discoveredTools.length,
      exposedToolCount: toolDefs.length,
      deniedToolCount: deniedToolSlugs.length,
      allowedToolSlugs: [...GSC_READONLY_TOOL_SLUGS],
      deniedToolSlugs
    }
  };
}
