import type { ScanConfig } from '../types';

/**
 * Default scanner configuration
 * 
 * This configuration defines file handling, safety limits,
 * and vendor detection heuristics for the bundle scanner.
 */
export const defaultConfig: ScanConfig = {
  schemaVersion: 'wf-marketplace-scanner-config@1.0.0',
  configVersion: '1.0.0',
  
  globalScanConfig: {
    // Files to always exclude from scanning
    hardExcludeGlobs: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.svn/**',
      '**/dist/**',
      '**/build/**',
      '**/*.min.js',
      '**/*.min.css',
      '**/vendor/**',
      '**/third_party/**',
      '**/__MACOSX/**',
      '**/.DS_Store'
    ],
    
    // Extensions to scan as text
    textExtensions: [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.html', '.htm', '.xhtml',
      '.css', '.scss', '.sass', '.less',
      '.json', '.jsonc', '.json5',
      '.md', '.mdx', '.markdown',
      '.txt', '.text',
      '.yml', '.yaml',
      '.toml',
      '.xml', '.svg',
      '.sh', '.bash', '.zsh',
      '.py', '.rb', '.php',
      '.env', '.env.example', '.env.local'
    ],
    
    // Extensions to inventory but not scan
    inventoryOnlyExtensions: [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.mp3', '.mp4', '.webm', '.ogg', '.wav',
      '.pdf', '.doc', '.docx',
      '.zip', '.tar', '.gz', '.rar',
      '.map'
    ],
    
    // ZIP extraction safety limits
    zipSafety: {
      preventZipSlip: true,
      maxTotalUnzippedBytes: 200 * 1024 * 1024, // 200MB
      maxFiles: 5000
    }
  },
  
  // Matching limits
  limits: {
    maxMatchesPerFile: 100,
    maxMatchesPerRule: 500
  },
  
  // Vendor/generated code detection
  vendorHeuristics: {
    vendorDirGlobs: [
      '**/vendor/**',
      '**/third_party/**',
      '**/node_modules/**',
      '**/bower_components/**',
      '**/lib/**/*.min.js'
    ],
    generatedFileNameHints: [
      '.bundle.',
      '.chunk.',
      'bundle.js',
      'vendor.js',
      'runtime.js',
      'polyfills.js',
      'main.js'
    ]
  }
};

export default defaultConfig;
