import type { ScanConfig, FileEntry, UnzippedFile } from '../types';
import { matchesAnyGlob, getExtension } from '../utils/glob';

/**
 * Decode binary data to text, attempting UTF-8 first
 */
function decodeText(data: Uint8Array): string | null {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(data);
  } catch {
    // Not valid UTF-8, might be binary
    return null;
  }
}

/**
 * Detect if a file is minified based on heuristics
 */
function isLikelyMinified(content: string, ext: string): boolean {
  // Only check JS/CSS files
  if (!['.js', '.css', '.mjs', '.cjs'].includes(ext)) {
    return false;
  }
  
  // Check for very long lines (typical of minified code)
  const lines = content.split('\n');
  const avgLineLength = content.length / Math.max(lines.length, 1);
  
  // If average line > 500 chars, likely minified
  if (avgLineLength > 500) return true;
  
  // Check for lack of whitespace
  const whitespaceRatio = (content.match(/\s/g)?.length ?? 0) / content.length;
  if (whitespaceRatio < 0.05 && content.length > 1000) return true;
  
  return false;
}

/**
 * Detect if a file is generated/bundled
 */
function isLikelyGenerated(filePath: string, content: string, config: ScanConfig): boolean {
  const lowerPath = filePath.toLowerCase();
  
  // Check path hints
  const hints = config.vendorHeuristics.generatedFileNameHints;
  if (hints.some(hint => lowerPath.includes(hint.toLowerCase()))) {
    return true;
  }
  
  // Check for common bundler comments
  const bundlerSignatures = [
    '/*! For license information',
    '//# sourceMappingURL=',
    '/* eslint-disable */',
    '/*! regenerator-runtime',
    '/**\n * @license'
  ];
  
  return bundlerSignatures.some(sig => content.includes(sig));
}

/**
 * Build file inventory from extracted ZIP contents
 * 
 * @param files - Array of unzipped files
 * @param config - Scanner configuration
 * @returns Array of file entries with metadata
 */
export function buildInventory(
  files: UnzippedFile[],
  config: ScanConfig
): FileEntry[] {
  const inventory: FileEntry[] = [];
  
  for (const file of files) {
    const ext = getExtension(file.path);
    const tags: string[] = [];
    
    // Check if file should be excluded
    const isIgnored = matchesAnyGlob(file.path, config.globalScanConfig.hardExcludeGlobs);
    
    // Determine if this is a text file we should scan
    const isTextExtension = config.globalScanConfig.textExtensions.includes(ext);
    const isInventoryOnly = config.globalScanConfig.inventoryOnlyExtensions.includes(ext);
    
    // Try to decode content for text files
    let content: string | undefined;
    let isTextCandidate = false;
    
    if (isTextExtension && !isIgnored) {
      const decoded = decodeText(file.data);
      if (decoded !== null) {
        content = decoded;
        isTextCandidate = true;
        
        // Tag minified files
        if (isLikelyMinified(content, ext)) {
          tags.push('MINIFIED_FILE');
        }
        
        // Tag generated/bundled files
        if (isLikelyGenerated(file.path, content, config)) {
          tags.push('GENERATED_BUNDLE');
        }
      }
    }
    
    // Check for vendor directories
    if (matchesAnyGlob(file.path, config.vendorHeuristics.vendorDirGlobs)) {
      tags.push('VENDOR_CODE');
    }
    
    // Tag source maps
    if (ext === '.map' || file.path.endsWith('.js.map') || file.path.endsWith('.css.map')) {
      tags.push('SOURCE_MAP');
    }
    
    // Tag test files
    const lowerPath = file.path.toLowerCase();
    if (lowerPath.includes('test') || lowerPath.includes('spec') || lowerPath.includes('__tests__')) {
      tags.push('TEST_FILE');
    }
    
    inventory.push({
      path: file.path,
      sizeBytes: file.data.length,
      ext,
      isTextCandidate,
      content,
      tags,
      isIgnored: isIgnored || isInventoryOnly
    });
  }
  
  return inventory;
}
