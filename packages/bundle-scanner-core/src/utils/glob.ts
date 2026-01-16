import { minimatch } from 'minimatch';

/**
 * Check if a file path matches any of the provided glob patterns
 * 
 * @param filePath - The file path to check
 * @param patterns - Array of glob patterns to match against
 * @returns true if the path matches any pattern
 */
export function matchesAnyGlob(filePath: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  return patterns.some(pattern => {
    try {
      return minimatch(normalizedPath, pattern, { 
        dot: true,
        matchBase: true,
        nocase: process.platform === 'win32'
      });
    } catch {
      return false;
    }
  });
}

/**
 * Check if a file should be excluded based on exclusion patterns
 * 
 * @param filePath - The file path to check
 * @param excludePatterns - Array of glob patterns for exclusion
 * @returns true if the file should be excluded
 */
export function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  return matchesAnyGlob(filePath, excludePatterns);
}

/**
 * Get the file extension from a path
 * 
 * @param filePath - The file path
 * @returns The extension including the dot, or empty string if none
 */
export function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  
  if (lastDot > lastSlash && lastDot !== -1) {
    return filePath.slice(lastDot).toLowerCase();
  }
  
  return '';
}
