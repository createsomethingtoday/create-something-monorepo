import {
  DEFAULT_BLONDISH_SOURCE_DATA_SOURCE_TITLE,
  DEFAULT_BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID,
  DEFAULT_HALFDOZEN_TARGET_DATA_SOURCE_TITLE,
  DEFAULT_OWNER_EMAIL,
  DEFAULT_OWNER_LABEL,
  DEFAULT_SOURCE_LABEL,
  DEFAULT_SYNC_CLIENT_LABEL,
  HD_TO_OS_STATUS,
} from './constants.js';
import type { Env } from './types.js';

export type RuntimeConfig = {
  serverName: string;
  clientSlug: string;
  tenantSlug: string;
  clientDisplayName: string;
  toolPrefix: string;
  sourceDataSourceId?: string;
  sourceDataSourceTitle: string;
  sourceStatusProperty?: string;
  sourceStatusMap: Record<string, string>;
  targetDataSourceId?: string;
  targetDatabaseId?: string;
  targetDataSourceTitle: string;
  ownerEmail: string;
  ownerLabel: string;
  clientLabel: string;
  sourceLabel: string;
};

export function resolveRuntimeConfig(env: Env): RuntimeConfig {
  const clientSlug = env.SYNC_CLIENT_SLUG?.trim() || 'blondish';
  const clientDisplayName = env.SYNC_CLIENT_DISPLAY_NAME?.trim() || 'BLOND:ISH';
  const sourceDataSourceId =
    env.CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID?.trim() ||
    env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID?.trim() ||
    (clientSlug === 'blondish' ? DEFAULT_BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_ID : undefined);

  return {
    serverName: env.SYNC_SERVER_NAME?.trim() || `halfdozen-${clientSlug}-sync-mcp`,
    clientSlug,
    tenantSlug: env.SYNC_TENANT_SLUG?.trim() || clientSlug,
    clientDisplayName,
    toolPrefix: normalizeToolPrefix(env.SYNC_TOOL_PREFIX?.trim() || `${clientSlug}_sync`),
    sourceDataSourceId,
    sourceDataSourceTitle:
      env.CLIENT_SUPPORT_TICKETS_DATA_SOURCE_TITLE?.trim() ||
      env.BLONDISH_SUPPORT_TICKETS_DATA_SOURCE_TITLE?.trim() ||
      DEFAULT_BLONDISH_SOURCE_DATA_SOURCE_TITLE,
    sourceStatusProperty: env.CLIENT_OS_STATUS_PROPERTY?.trim() || env.BLONDISH_OS_STATUS_PROPERTY?.trim(),
    sourceStatusMap: parseStatusMap(env.CLIENT_OS_STATUS_MAP),
    targetDataSourceId: env.HALFDOZEN_TICKETS_DATA_SOURCE_ID?.trim(),
    targetDatabaseId: env.HALFDOZEN_TICKETS_DATABASE_ID?.trim(),
    targetDataSourceTitle: env.HALFDOZEN_TICKETS_DATA_SOURCE_TITLE?.trim() || DEFAULT_HALFDOZEN_TARGET_DATA_SOURCE_TITLE,
    ownerEmail: env.SYNC_OWNER_EMAIL?.trim() || DEFAULT_OWNER_EMAIL,
    ownerLabel: env.SYNC_OWNER_LABEL?.trim() || DEFAULT_OWNER_LABEL,
    clientLabel: env.SYNC_CLIENT_LABEL?.trim() || DEFAULT_SYNC_CLIENT_LABEL,
    sourceLabel: env.SYNC_SOURCE_LABEL?.trim() || DEFAULT_SOURCE_LABEL,
  };
}

export function parseStatusMap(value?: string): Record<string, string> {
  if (!value?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('CLIENT_OS_STATUS_MAP must be a JSON object of Half Dozen status names to client status names.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('CLIENT_OS_STATUS_MAP must be a JSON object of Half Dozen status names to client status names.');
  }

  const statusMap: Record<string, string> = {};
  for (const [hdStatus, sourceStatus] of Object.entries(parsed)) {
    if (typeof sourceStatus !== 'string' || !hdStatus.trim() || !sourceStatus.trim()) {
      throw new Error('CLIENT_OS_STATUS_MAP entries must use non-empty string keys and values.');
    }
    if (!HD_TO_OS_STATUS[hdStatus.trim()]) {
      throw new Error(`CLIENT_OS_STATUS_MAP cannot override unmapped Half Dozen status "${hdStatus.trim()}".`);
    }
    statusMap[hdStatus.trim()] = sourceStatus.trim();
  }
  return statusMap;
}

export function toolName(env: Env, suffix: string): string {
  return `${resolveRuntimeConfig(env).toolPrefix}_${suffix}`;
}

function normalizeToolPrefix(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'client_sync';
}
