/**
 * Workspace and server display config from env.
 * Lets each deployment (e.g. CREATE SOMETHING vs System Studio) expose correct labels.
 */

export interface WorkspaceLabel {
  label: string;
  description: string;
}

export interface WorkspaceConfig {
  halfdozen: WorkspaceLabel;
  client: WorkspaceLabel;
  displayName: string;
  description: string;
}

interface ConfigEnv {
  WORKSPACE_HALFDOZEN_LABEL?: string;
  WORKSPACE_HALFDOZEN_DESCRIPTION?: string;
  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
}

const DEFAULTS: WorkspaceConfig = {
  halfdozen: {
    label: 'Half Dozen',
    description: 'Internal — Meeting Capture, meeting transcripts (e.g. Danny meeting)',
  },
  client: {
    label: 'CREATE SOMETHING client',
    description: "The agency client's Notion — work Half Dozen does for that client",
  },
  displayName: 'Notion Half Dozen X CREATE SOMETHING',
  description:
    "Half Dozen access to its own Notion and its CREATE SOMETHING (agency) client's Notion. Full Notion tools; no Composio.",
};

export function getWorkspaceConfig(env: ConfigEnv): WorkspaceConfig {
  return {
    halfdozen: {
      label: env.WORKSPACE_HALFDOZEN_LABEL ?? DEFAULTS.halfdozen.label,
      description: env.WORKSPACE_HALFDOZEN_DESCRIPTION ?? DEFAULTS.halfdozen.description,
    },
    client: {
      label: env.WORKSPACE_CLIENT_LABEL ?? DEFAULTS.client.label,
      description: env.WORKSPACE_CLIENT_DESCRIPTION ?? DEFAULTS.client.description,
    },
    displayName: env.MCP_DISPLAY_NAME ?? DEFAULTS.displayName,
    description: env.MCP_DESCRIPTION ?? DEFAULTS.description,
  };
}
