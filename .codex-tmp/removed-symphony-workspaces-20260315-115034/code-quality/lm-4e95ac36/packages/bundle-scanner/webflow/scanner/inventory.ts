/**
 * File Inventory Module
 * Matches original IC implementation
 */

import type { FileEntry, ScanConfig } from '../types';
import type { ZipEntry } from './zip';
import { matchesAnyGlob } from '../utils/glob';

/**
 * Build an inventory of files from ZIP entries
 * Applies ignore rules and tags files appropriately
 */
export function buildInventory(
  entries: ZipEntry[],
  config: ScanConfig
): FileEntry[] {
  const inventory: FileEntry[] = [];
  const { globalScanConfig, vendorHeuristics } = config;
  
  for (const entry of entries) {
    const path = entry.path;
    const ext = getExtension(path);
    
    // Check if file should be ignored
    const isIgnored = matchesAnyGlob(path, globalScanConfig.hardExcludeGlobs);
    
    // Determine if it's a text file
    const isTextCandidate = globalScanConfig.textExtensions.includes(ext);
    
    // Decode content for text files
    let content: string | undefined;
    if (isTextCandidate && !isIgnored) {
      try {
        content = new TextDecoder('utf-8').decode(entry.data);
      } catch {
        content = undefined;
      }
    }
    
    // Apply tags
    const tags: string[] = [];
    
    // Minified file detection
    if (isMinifiedFile(path, content)) {
      tags.push('MINIFIED_FILE');
    }
    
    // Generated bundle detection
    if (matchesAnyGlob(path, vendorHeuristics.generatedFileNameHints)) {
      tags.push('GENERATED_BUNDLE');
    }
    
    // Vendor directory detection
    if (matchesAnyGlob(path, vendorHeuristics.vendorDirGlobs)) {
      tags.push('VENDOR_DIR');
    }
    
    // Test file detection
    if (isTestFile(path)) {
      tags.push('TEST_FILE');
    }
    
    // Source map detection
    if (ext === '.map' || path.endsWith('.map')) {
      tags.push('SOURCE_MAP');
    }
    
    inventory.push({
      path,
      sizeBytes: entry.data.length,
      ext,
      isTextCandidate,
      content,
      tags,
      isIgnored
    });
  }
  
  return inventory;
}

function getExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.substring(lastDot).toLowerCase();
}

function isMinifiedFile(path: string, content?: string): boolean {
  // Check filename hints
  if (path.includes('.min.') || path.includes('-min.') || path.includes('_min.')) {
    return true;
  }
  
  // Check content for minification signatures
  if (content) {
    // Very long lines indicate minification
    const lines = content.split('\n');
    const avgLineLength = content.length / Math.max(lines.length, 1);
    if (avgLineLength > 500) {
      return true;
    }
    
    // High density of semicolons and short variable names
    const semicolonDensity = (content.match(/;/g)?.length || 0) / content.length;
    if (semicolonDensity > 0.05) {
      return true;
    }
  }
  
  return false;
}

function isTestFile(path: string): boolean {
  const testPatterns = [
    /\.test\./i,
    /\.spec\./i,
    /__tests__/i,
    /\/test\//i,
    /\/tests\//i,
    /\.stories\./i
  ];
  
  return testPatterns.some(pattern => pattern.test(path));
}
