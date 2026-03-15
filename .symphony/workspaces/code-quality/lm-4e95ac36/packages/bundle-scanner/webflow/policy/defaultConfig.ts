import type { ScanConfig } from '../types';

const defaultConfig: ScanConfig = {
  schemaVersion: 'wf-marketplace-scanner-config@1.0.0',
  configVersion: '1.0.0-default',
  globalScanConfig: {
    hardExcludeGlobs: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/__MACOSX/**',
      '**/*.map'
    ],
    textExtensions: [
      '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
      '.css', '.scss', '.html', '.htm',
      '.json', '.md', '.txt', '.yaml', '.yml', '.xml', '.svg'
    ],
    inventoryOnlyExtensions: [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.zip',
      '.eot', '.ttf', '.woff', '.woff2'
    ],
    zipSafety: {
      preventZipSlip: true,
      maxTotalUnzippedBytes: 200000000, // 200MB
      maxFiles: 20000
    }
  },
  limits: {
    maxMatchesPerFile: 100,
    maxMatchesPerRule: 1000
  },
  vendorHeuristics: {
    vendorDirGlobs: [
      '**/vendor/**',
      '**/third_party/**',
      '**/libs/**'
    ],
    generatedFileNameHints: [
      '*.min.js',
      '*.min.css',
      'bundle.js',
      'main.*.js'
    ]
  }
};

export default defaultConfig;
