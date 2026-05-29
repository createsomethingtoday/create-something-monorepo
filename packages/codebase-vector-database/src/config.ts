import { defaultConfig, type ScanConfig } from '@create-something/bundle-scanner-core';

const EXTRA_CODE_EXTENSIONS = [
  '.astro',
  '.c',
  '.cc',
  '.clj',
  '.cpp',
  '.cs',
  '.dart',
  '.ex',
  '.exs',
  '.go',
  '.graphql',
  '.h',
  '.hpp',
  '.java',
  '.kt',
  '.kts',
  '.lua',
  '.prisma',
  '.rs',
  '.scala',
  '.sql',
  '.svelte',
  '.swift',
  '.vue',
];

const EXTRA_EXCLUDE_GLOBS = [
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/coverage/**',
  '**/tmp/**',
  '**/vendor/**',
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/yarn.lock',
];

export const codeBundleScanConfig: ScanConfig = {
  ...defaultConfig,
  configVersion: 'codebase-vector-database@1.0.0',
  globalScanConfig: {
    ...defaultConfig.globalScanConfig,
    hardExcludeGlobs: Array.from(new Set([...defaultConfig.globalScanConfig.hardExcludeGlobs, ...EXTRA_EXCLUDE_GLOBS])),
    textExtensions: Array.from(new Set([...defaultConfig.globalScanConfig.textExtensions, ...EXTRA_CODE_EXTENSIONS])),
  },
};

export const DEFAULT_EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
export const DEFAULT_EMBEDDING_MAX_CHARS = 4000;
export const DEFAULT_EMBEDDING_CONTEXT_RESERVE_CHARS = 800;
export const DEFAULT_CHUNK_MAX_CHARS = 3200;
export const DEFAULT_CHUNK_OVERLAP_LINES = 8;
export const MAX_QUERY_LIMIT = 50;
