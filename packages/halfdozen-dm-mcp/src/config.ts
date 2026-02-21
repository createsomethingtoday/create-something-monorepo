/**
 * DM server display + capability config from env.
 * v2 adds Drive sync while preserving Notion defaults.
 */

export interface DmDriveToolSlugConfig {
  listFiles?: string;
  getMetadata?: string;
  parseFile?: string;
}

export interface DmDriveConfig {
  entityId: string;
  targetDataSourceId?: string;
  enableCron: boolean;
  cronBatchSize: number;
  cronInitialLookbackDays: number;
  toolSlugs: DmDriveToolSlugConfig;
}

export interface DmConfig {
  clientLabel: string;
  clientDescription: string;
  displayName: string;
  description: string;
  enabledToolsets: string[];
  drive: DmDriveConfig;
}

interface ConfigEnv {
  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  ENABLED_TOOLSETS?: string;
  COMPOSIO_ENTITY_ID?: string;
  DRIVE_SYNC_DATA_SOURCE_ID?: string;
  ENABLE_DRIVE_CRON?: string;
  DRIVE_CRON_BATCH_SIZE?: string;
  DRIVE_CRON_INITIAL_LOOKBACK_DAYS?: string;
  COMPOSIO_DRIVE_LIST_FILES_TOOL_SLUG?: string;
  COMPOSIO_DRIVE_GET_METADATA_TOOL_SLUG?: string;
  COMPOSIO_DRIVE_PARSE_FILE_TOOL_SLUG?: string;
}

const DEFAULTS = {
  clientLabel: 'DM',
  clientDescription: 'DM client Notion workspace',
  displayName: 'Half Dozen DM MCP',
  description:
    'Half Dozen DM MCP. Notion tools plus DM-scoped Google Drive sync for workflow automation.',
  enabledToolsets: ['notion', 'drive'],
  driveEntityId: 'dm',
  enableDriveCron: false,
  driveCronBatchSize: 25,
  driveCronInitialLookbackDays: 7,
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

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw || !raw.trim()) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on')
    return true;
  if (
    normalized === '0' ||
    normalized === 'false' ||
    normalized === 'no' ||
    normalized === 'off'
  ) {
    return false;
  }
  return fallback;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getDmConfig(env: ConfigEnv): DmConfig {
  const entityId = env.COMPOSIO_ENTITY_ID?.trim() || DEFAULTS.driveEntityId;

  return {
    clientLabel: env.WORKSPACE_CLIENT_LABEL ?? DEFAULTS.clientLabel,
    clientDescription: env.WORKSPACE_CLIENT_DESCRIPTION ?? DEFAULTS.clientDescription,
    displayName: env.MCP_DISPLAY_NAME ?? DEFAULTS.displayName,
    description: env.MCP_DESCRIPTION ?? DEFAULTS.description,
    enabledToolsets: parseToolsets(env.ENABLED_TOOLSETS),
    drive: {
      entityId,
      targetDataSourceId: env.DRIVE_SYNC_DATA_SOURCE_ID?.trim() || undefined,
      enableCron: parseBoolean(env.ENABLE_DRIVE_CRON, DEFAULTS.enableDriveCron),
      cronBatchSize: parsePositiveInt(env.DRIVE_CRON_BATCH_SIZE, DEFAULTS.driveCronBatchSize),
      cronInitialLookbackDays: parsePositiveInt(
        env.DRIVE_CRON_INITIAL_LOOKBACK_DAYS,
        DEFAULTS.driveCronInitialLookbackDays
      ),
      toolSlugs: {
        listFiles: env.COMPOSIO_DRIVE_LIST_FILES_TOOL_SLUG?.trim() || undefined,
        getMetadata: env.COMPOSIO_DRIVE_GET_METADATA_TOOL_SLUG?.trim() || undefined,
        parseFile: env.COMPOSIO_DRIVE_PARSE_FILE_TOOL_SLUG?.trim() || undefined,
      },
    },
  };
}
