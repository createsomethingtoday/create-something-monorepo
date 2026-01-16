/**
 * Glob Pattern Matching Utility
 * Matches the original IC implementation with brace expansion support
 */

/**
 * Expands brace patterns like {js,ts,tsx} into multiple patterns
 */
function expandBraces(pattern: string): string[] {
  const braceMatch = pattern.match(/\{([^}]+)\}/);
  if (!braceMatch) return [pattern];
  
  const alternatives = braceMatch[1].split(',');
  const prefix = pattern.substring(0, braceMatch.index);
  const suffix = pattern.substring(braceMatch.index! + braceMatch[0].length);
  
  const expanded: string[] = [];
  for (const alt of alternatives) {
    const newPattern = prefix + alt + suffix;
    // Recursively expand in case there are nested braces
    expanded.push(...expandBraces(newPattern));
  }
  return expanded;
}

/**
 * Converts a glob pattern to a regular expression
 */
function globToRegex(glob: string): RegExp {
  let regex = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars (except * and ?)
    .replace(/\\\*/g, '___STAR___') // Temporarily replace escaped stars
    .replace(/\\\?/g, '___QUESTION___') // Temporarily replace escaped questions
    .replace(/\*\*/g, '___GLOBSTAR___') // Handle ** (globstar)
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/\?/g, '[^/]') // ? matches single char except /
    .replace(/___GLOBSTAR___/g, '.*') // ** matches everything including /
    .replace(/___STAR___/g, '\\*') // Restore escaped stars
    .replace(/___QUESTION___/g, '\\?'); // Restore escaped questions
  
  // Ensure the pattern matches the full path
  if (!regex.startsWith('.*') && !regex.startsWith('/')) {
    regex = '(^|/)' + regex;
  }
  
  return new RegExp(regex + '$', 'i');
}

/**
 * Checks if a file path matches any of the provided glob patterns
 */
export function matchesAnyGlob(filePath: string, globs: string[]): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  for (const glob of globs) {
    // Expand braces first
    const expandedPatterns = expandBraces(glob);
    
    for (const pattern of expandedPatterns) {
      try {
        const regex = globToRegex(pattern);
        if (regex.test(normalizedPath)) {
          return true;
        }
      } catch {
        // If regex creation fails, try simple includes as fallback
        if (normalizedPath.includes(pattern.replace(/\*/g, ''))) {
          return true;
        }
      }
    }
  }
  
  return false;
}
