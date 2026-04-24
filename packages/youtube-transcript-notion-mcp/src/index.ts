import { resolveRuntimeConfig, SERVER_NAME, SERVER_VERSION, type PackageEnv } from './config.js';
import { NotionTranscriptSyncService } from './notion.js';
import { createTranscriptService } from './transcript-service.js';
import type { RuntimeDependencies } from './types.js';

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
export * from './types.js';
export * from './transcript.js';
export * from './youtube.js';

export function createRuntimeDependencies(env: PackageEnv): RuntimeDependencies {
  const runtimeConfig = resolveRuntimeConfig(env);

  return {
    transcriptService: createTranscriptService({
      steelApiKey: env.STEEL_API_KEY,
      steelProfileId: env.STEEL_PROFILE_ID,
      supadataApiKey: env.SUPADATA_API_KEY,
      supadataTranscriptMode: runtimeConfig.supadataTranscriptMode,
      defaultLanguage: runtimeConfig.defaultLanguage,
      directProviderMode: runtimeConfig.directProviderMode,
    }),
    notionService: new NotionTranscriptSyncService({
      apiKey: env.NOTION_API_KEY,
      defaultDatabaseId: runtimeConfig.defaultDatabaseId,
      defaultPropertyMapping: runtimeConfig.defaultPropertyMapping,
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
