import type { NotionPropertyMapping } from './types.js';

export const SERVER_NAME = 'youtube-transcript-notion-mcp';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_DISPLAY_NAME = 'YouTube Transcript + Notion MCP';
export const DEFAULT_DESCRIPTION =
  'Extract YouTube transcripts with a direct path, fall back to Steel when needed, and sync a single video into Notion.';
export const DEFAULT_TRANSCRIPT_LANGUAGE = 'en';
export const DEFAULT_SUPADATA_TRANSCRIPT_MODE = 'native';
export const TRANSCRIPT_CHUNK_SIZE = 1900;
export const NOTION_BLOCK_BATCH_LIMIT = 100;
export const YOUTUBE_ANDROID_CLIENT_VERSION = '19.29.37';
export const YOUTUBE_ANDROID_USER_AGENT = `com.google.android.youtube/${YOUTUBE_ANDROID_CLIENT_VERSION} (Linux; U; Android 11) gzip`;
export const YOUTUBE_MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
export const YOUTUBE_WEB_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const YOUTUBE_ORIGIN = 'https://www.youtube.com';
export const STEEL_BROWSER_TIMEOUT_MS = 180_000;
export const YOUTUBE_NAVIGATION_TIMEOUT_MS = 25_000;
export const TRANSCRIPT_PANEL_TIMEOUT_MS = 8_000;
export const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';

export interface PackageEnv {
  NOTION_API_KEY?: string;
  NOTION_DATABASE_ID?: string;
  NOTION_PROPERTY_MAPPING_JSON?: string;
  STEEL_API_KEY?: string;
  STEEL_PROFILE_ID?: string;
  SUPADATA_API_KEY?: string;
  SUPADATA_TRANSCRIPT_MODE?: string;
  YOUTUBE_TRANSCRIPT_LANGUAGE?: string;
  YOUTUBE_DIRECT_PROVIDER_MODE?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_ID?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  MCP_BEARER_TOKEN?: string;
}

export interface RuntimeConfig {
  displayName: string;
  description: string;
  defaultLanguage: string;
  supadataTranscriptMode: 'native' | 'auto' | 'generate';
  directProviderMode: 'auto' | 'browser-first';
  defaultDatabaseId?: string;
  defaultPropertyMapping: Partial<NotionPropertyMapping>;
  security: {
    bearerProtectionEnabled: boolean;
    unauthenticatedBillableTranscriptAccess: boolean;
    unauthenticatedNotionAccess: boolean;
    recommendations: string[];
  };
  configWarnings: string[];
}

function trimToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function safeParsePropertyMapping(
  raw: string | undefined,
  warnings: string[],
): Partial<NotionPropertyMapping> {
  const trimmed = trimToUndefined(raw);
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<NotionPropertyMapping>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      warnings.push('NOTION_PROPERTY_MAPPING_JSON is not an object and was ignored.');
      return {};
    }
    return parsed;
  } catch (error) {
    warnings.push(
      `Failed to parse NOTION_PROPERTY_MAPPING_JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return {};
  }
}

function resolveDirectProviderMode(
  raw: string | undefined,
  warnings: string[],
): 'auto' | 'browser-first' {
  const trimmed = trimToUndefined(raw);
  if (!trimmed) {
    return 'auto';
  }

  if (trimmed === 'auto' || trimmed === 'browser-first') {
    return trimmed;
  }

  warnings.push(
    `Unsupported YOUTUBE_DIRECT_PROVIDER_MODE "${trimmed}" was ignored. Falling back to "auto".`,
  );
  return 'auto';
}

function resolveSupadataTranscriptMode(
  raw: string | undefined,
  warnings: string[],
): 'native' | 'auto' | 'generate' {
  const trimmed = trimToUndefined(raw);
  if (!trimmed) {
    return DEFAULT_SUPADATA_TRANSCRIPT_MODE;
  }

  if (trimmed === 'native' || trimmed === 'auto' || trimmed === 'generate') {
    return trimmed;
  }

  warnings.push(
    `Unsupported SUPADATA_TRANSCRIPT_MODE "${trimmed}" was ignored. Falling back to "${DEFAULT_SUPADATA_TRANSCRIPT_MODE}".`,
  );
  return DEFAULT_SUPADATA_TRANSCRIPT_MODE;
}

export function resolveRuntimeConfig(env: PackageEnv): RuntimeConfig {
  const configWarnings: string[] = [];
  const steelApiKey = trimToUndefined(env.STEEL_API_KEY);
  const steelProfileId = trimToUndefined(env.STEEL_PROFILE_ID);
  const supadataApiKey = trimToUndefined(env.SUPADATA_API_KEY);
  const notionApiKey = trimToUndefined(env.NOTION_API_KEY);
  const bearerToken = trimToUndefined(env.MCP_BEARER_TOKEN);
  const bearerProtectionEnabled = Boolean(bearerToken);
  const unauthenticatedBillableTranscriptAccess = !bearerProtectionEnabled && Boolean(supadataApiKey || steelApiKey);
  const unauthenticatedNotionAccess = !bearerProtectionEnabled && Boolean(notionApiKey);
  const securityRecommendations: string[] = [];

  if (steelApiKey && !steelProfileId) {
    configWarnings.push(
      'STEEL_PROFILE_ID is not configured. Anonymous Steel sessions are more likely to hit YouTube sign-in or anti-bot challenges.',
    );
  }

  if (!supadataApiKey && trimToUndefined(env.SUPADATA_TRANSCRIPT_MODE)) {
    configWarnings.push(
      'SUPADATA_TRANSCRIPT_MODE is configured but SUPADATA_API_KEY is not set, so Supadata transcript extraction is disabled.',
    );
  }

  if (unauthenticatedBillableTranscriptAccess) {
    configWarnings.push(
      'MCP_BEARER_TOKEN is not configured. Public callers can consume billable transcript provider capacity (Supadata and/or Steel) without authentication.',
    );
  }

  if (unauthenticatedNotionAccess) {
    configWarnings.push(
      'MCP_BEARER_TOKEN is not configured. Public callers can invoke Notion-backed tools without authentication.',
    );
  }

  if (unauthenticatedBillableTranscriptAccess || unauthenticatedNotionAccess) {
    securityRecommendations.push(
      'Set MCP_BEARER_TOKEN before exposing the remote MCP publicly.',
    );
  }

  return {
    displayName: trimToUndefined(env.MCP_DISPLAY_NAME) ?? DEFAULT_DISPLAY_NAME,
    description: trimToUndefined(env.MCP_DESCRIPTION) ?? DEFAULT_DESCRIPTION,
    defaultLanguage:
      trimToUndefined(env.YOUTUBE_TRANSCRIPT_LANGUAGE) ?? DEFAULT_TRANSCRIPT_LANGUAGE,
    supadataTranscriptMode: resolveSupadataTranscriptMode(
      env.SUPADATA_TRANSCRIPT_MODE,
      configWarnings,
    ),
    directProviderMode: resolveDirectProviderMode(
      env.YOUTUBE_DIRECT_PROVIDER_MODE,
      configWarnings,
    ),
    defaultDatabaseId: trimToUndefined(env.NOTION_DATABASE_ID),
    defaultPropertyMapping: safeParsePropertyMapping(
      env.NOTION_PROPERTY_MAPPING_JSON,
      configWarnings,
    ),
    security: {
      bearerProtectionEnabled,
      unauthenticatedBillableTranscriptAccess,
      unauthenticatedNotionAccess,
      recommendations: securityRecommendations,
    },
    configWarnings,
  };
}

export function resolveBraintrustProjectName(env: Pick<PackageEnv, 'BRAINTRUST_PROJECT_NAME'>): string {
  return trimToUndefined(env.BRAINTRUST_PROJECT_NAME) ?? DEFAULT_BRAINTRUST_PROJECT_NAME;
}
