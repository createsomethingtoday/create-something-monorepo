/**
 * DM server display + capability config from env.
 * v3 replaces direct Drive integration with DM-namespaced Composio proxy tools.
 */

export type DmComposioProxyMode = 'allowlist' | 'all';

export interface DmComposioConfig {
  defaultEntityId: string;
  proxyMode: DmComposioProxyMode;
  allowedToolkits: string[];
  allowedToolkitsByEntity: Record<string, string[]>;
  toolNamePrefix: string;
  toolCacheSeconds: number;
}

export interface DmConfig {
  clientLabel: string;
  clientDescription: string;
  displayName: string;
  description: string;
  enabledToolsets: string[];
  composio: DmComposioConfig;
}

interface ConfigEnv {
  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  ENABLED_TOOLSETS?: string;
  COMPOSIO_ENTITY_ID?: string;
  COMPOSIO_PROXY_MODE?: string;
  COMPOSIO_ALLOWED_TOOLKITS?: string;
  COMPOSIO_ALLOWED_TOOLKITS_BY_ENTITY?: string;
  COMPOSIO_TOOL_NAME_PREFIX?: string;
  COMPOSIO_TOOL_CACHE_SECONDS?: string;
}

const DEFAULTS = {
  clientLabel: 'DM',
  clientDescription: 'DM client Notion workspace',
  displayName: 'Half Dozen DM MCP',
  description:
    'Half Dozen DM MCP. Notion tools plus DM-namespaced Composio proxy tools with allow-list controls.',
  enabledToolsets: ['notion', 'composio'],
  composioEntityId: 'dm',
  composioProxyMode: 'allowlist' as DmComposioProxyMode,
  composioAllowedToolkits: [] as string[],
  composioToolNamePrefix: 'dm_composio',
  composioToolCacheSeconds: 300,
} as const;

function normalizeToolkitSlug(value: string): string {
  return value.trim().toLowerCase();
}

function parseToolkitList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw || !raw.trim()) return [...fallback];
  const parsed = raw
    .split(',')
    .map(normalizeToolkitSlug)
    .filter(Boolean);
  if (parsed.length === 0) return [...fallback];
  return Array.from(new Set(parsed));
}

function parseToolsets(raw?: string): string[] {
  if (!raw || !raw.trim()) return [...DEFAULTS.enabledToolsets];
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parsed.length === 0) return [...DEFAULTS.enabledToolsets];
  return Array.from(new Set(parsed));
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseProxyMode(raw: string | undefined): DmComposioProxyMode {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === 'all') return 'all';
  return 'allowlist';
}

function parseAllowedToolkitsByEntity(raw: string | undefined): Record<string, string[]> {
  if (!raw || !raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const map: Record<string, string[]> = {};
    for (const [entity, value] of Object.entries(parsed as Record<string, unknown>)) {
      const normalizedEntity = entity.trim().toLowerCase();
      if (!normalizedEntity) continue;

      let toolkits: string[] = [];
      if (Array.isArray(value)) {
        toolkits = value
          .filter((entry): entry is string => typeof entry === 'string')
          .map(normalizeToolkitSlug)
          .filter(Boolean);
      } else if (typeof value === 'string') {
        toolkits = value
          .split(',')
          .map(normalizeToolkitSlug)
          .filter(Boolean);
      }

      if (toolkits.length > 0) {
        map[normalizedEntity] = Array.from(new Set(toolkits));
      }
    }

    return map;
  } catch {
    return {};
  }
}

export function getDmConfig(env: ConfigEnv): DmConfig {
  return {
    clientLabel: env.WORKSPACE_CLIENT_LABEL ?? DEFAULTS.clientLabel,
    clientDescription: env.WORKSPACE_CLIENT_DESCRIPTION ?? DEFAULTS.clientDescription,
    displayName: env.MCP_DISPLAY_NAME ?? DEFAULTS.displayName,
    description: env.MCP_DESCRIPTION ?? DEFAULTS.description,
    enabledToolsets: parseToolsets(env.ENABLED_TOOLSETS),
    composio: {
      defaultEntityId: env.COMPOSIO_ENTITY_ID?.trim() || DEFAULTS.composioEntityId,
      proxyMode: parseProxyMode(env.COMPOSIO_PROXY_MODE ?? DEFAULTS.composioProxyMode),
      allowedToolkits: parseToolkitList(
        env.COMPOSIO_ALLOWED_TOOLKITS,
        DEFAULTS.composioAllowedToolkits
      ),
      allowedToolkitsByEntity: parseAllowedToolkitsByEntity(env.COMPOSIO_ALLOWED_TOOLKITS_BY_ENTITY),
      toolNamePrefix: env.COMPOSIO_TOOL_NAME_PREFIX?.trim() || DEFAULTS.composioToolNamePrefix,
      toolCacheSeconds: parsePositiveInt(
        env.COMPOSIO_TOOL_CACHE_SECONDS,
        DEFAULTS.composioToolCacheSeconds
      ),
    },
  };
}
