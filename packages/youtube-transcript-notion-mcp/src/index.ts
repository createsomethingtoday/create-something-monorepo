import { resolveRuntimeConfig, SERVER_NAME, SERVER_VERSION, type PackageEnv } from './config.js';
import { NotionTranscriptSyncService } from './notion.js';
import { YouTubePlaylistSyncService, PlaylistSyncServiceError } from './playlist-service.js';
import { InMemoryPlaylistStateStore } from './playlist-state.js';
import { createTranscriptService } from './transcript-service.js';
import type { PlaylistStateStore, RuntimeDependencies } from './types.js';

export { registerResources } from './resources.js';
export { registerTools } from './tools.js';
export { registerPrompts } from './prompts.js';
export { resolveRuntimeConfig, SERVER_NAME, SERVER_VERSION } from './config.js';
export {
  BrowserTranscriptProvider,
  createTranscriptService,
  DirectTranscriptProvider,
  TranscriptExtractionError,
} from './transcript-service.js';
export { SupadataTranscriptProvider } from './supadata.js';
export {
  NotionTranscriptSyncService,
  NotionSyncServiceError,
  resolvePropertyMapping,
  findExistingPageMatch,
  pageHasTranscriptSection,
} from './notion.js';
export {
  YouTubePlaylistSyncService,
  PlaylistSyncServiceError,
} from './playlist-service.js';
export {
  InMemoryPlaylistStateStore,
  buildPlaylistItemSyncKey,
  mergeRecentPlaylistState,
} from './playlist-state.js';
export * from './types.js';
export * from './transcript.js';
export * from './youtube.js';

export function createRuntimeDependencies(
  env: PackageEnv,
  options: {
    playlistStateStore?: PlaylistStateStore;
    playlistStateStoreKind?: string;
  } = {},
): RuntimeDependencies {
  const runtimeConfig = resolveRuntimeConfig(env);
  const transcriptService = createTranscriptService({
    steelApiKey: env.STEEL_API_KEY,
    steelProfileId: env.STEEL_PROFILE_ID,
    supadataApiKey: env.SUPADATA_API_KEY,
    supadataTranscriptMode: runtimeConfig.supadataTranscriptMode,
    defaultLanguage: runtimeConfig.defaultLanguage,
    directProviderMode: runtimeConfig.directProviderMode,
  });
  const notionService = new NotionTranscriptSyncService({
    apiKey: env.NOTION_API_KEY,
    defaultDatabaseId: runtimeConfig.defaultDatabaseId,
    defaultPropertyMapping: runtimeConfig.defaultPropertyMapping,
  });
  const playlistStateStore = options.playlistStateStore ?? new InMemoryPlaylistStateStore();

  return {
    transcriptService,
    notionService,
    playlistService: new YouTubePlaylistSyncService({
      apiKey: env.YOUTUBE_DATA_API_KEY,
      defaultPlaylistId: runtimeConfig.playlist.defaultPlaylistId,
      defaultDatabaseId:
        runtimeConfig.playlist.defaultPlaylistDatabaseId ?? runtimeConfig.defaultDatabaseId,
      maxScanItems: runtimeConfig.playlist.maxScanItems,
      maxSyncItems: runtimeConfig.playlist.maxSyncItems,
      stateStore: playlistStateStore,
      stateStoreKind: options.playlistStateStoreKind ?? 'memory',
      transcriptService,
      notionService,
    }),
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      displayName: runtimeConfig.displayName,
      description: runtimeConfig.description,
      defaultLanguage: runtimeConfig.defaultLanguage,
      directProviderMode: runtimeConfig.directProviderMode,
      security: runtimeConfig.security,
      configWarnings: runtimeConfig.configWarnings,
    },
  };
}
