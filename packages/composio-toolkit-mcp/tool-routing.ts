import type { ComposioToolDef } from '@create-something/composio-bridge';

export type ToolRoute = {
  toolName: string;
  composioToolSlug: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolDispatchResult<T> =
  | {
      matched: true;
      route: ToolRoute;
      result: T;
    }
  | {
      matched: false;
      message: string;
    };

export function buildToolRoutes(
  toolDefs: ComposioToolDef[],
  reservedNames: Set<string>
): ToolRoute[] {
  const routes: ToolRoute[] = [];
  const usedNames = new Set<string>(reservedNames);

  for (const tool of toolDefs) {
    const baseName = normalizeToolName(tool.slug);
    const toolName = reserveToolName(baseName, usedNames);

    routes.push({
      toolName,
      composioToolSlug: tool.slug,
      description: tool.description || `${tool.name} via Composio`,
      inputSchema: {
        type: 'object',
        properties: {
          ...(tool.parameters.properties ?? {}),
          connectedAccountId: {
            type: 'string',
            description:
              'Optional Composio connected account ID. Use this when multiple active connections exist for the same toolkit/entity.'
          }
        },
        required: tool.parameters.required ?? [],
        additionalProperties: true
      }
    });
  }

  return routes;
}

export async function dispatchToolRoute<T>(
  routes: ToolRoute[],
  toolName: string,
  execute: (route: ToolRoute) => Promise<T>
): Promise<ToolDispatchResult<T>> {
  const route = routes.find((candidate) => candidate.toolName === toolName);
  if (!route) {
    return {
      matched: false,
      message: `Unknown tool "${toolName}".`
    };
  }

  return {
    matched: true,
    route,
    result: await execute(route)
  };
}

function normalizeToolName(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function reserveToolName(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName}_${suffix}`;
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}_${suffix}`;
  }

  usedNames.add(candidate);
  return candidate;
}
