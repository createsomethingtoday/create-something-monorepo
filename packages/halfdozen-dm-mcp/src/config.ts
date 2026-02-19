/**
 * DM server display + capability config from env.
 * v1 is Notion-only, but naming is generalized for future toolsets.
 */

export interface DmConfig {
  clientLabel: string;
  clientDescription: string;
  displayName: string;
  description: string;
  enabledToolsets: string[];
}

interface ConfigEnv {
  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  ENABLED_TOOLSETS?: string;
}

const DEFAULTS = {
  clientLabel: 'DM',
  clientDescription: 'DM client Notion workspace',
  displayName: 'Half Dozen DM MCP',
  description: 'Half Dozen DM MCP. Notion tools enabled in v1; additional toolsets can be added over time.',
  enabledToolsets: ['notion'],
} as const;

function parseToolsets(raw?: string): string[] {
  if (!raw || !raw.trim()) return [...DEFAULTS.enabledToolsets];
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parsed.length === 0) return [...DEFAULTS.enabledToolsets];
  return Array.from(new Set(parsed));
}

export function getDmConfig(env: ConfigEnv): DmConfig {
  return {
    clientLabel: env.WORKSPACE_CLIENT_LABEL ?? DEFAULTS.clientLabel,
    clientDescription: env.WORKSPACE_CLIENT_DESCRIPTION ?? DEFAULTS.clientDescription,
    displayName: env.MCP_DISPLAY_NAME ?? DEFAULTS.displayName,
    description: env.MCP_DESCRIPTION ?? DEFAULTS.description,
    enabledToolsets: parseToolsets(env.ENABLED_TOOLSETS),
  };
}
