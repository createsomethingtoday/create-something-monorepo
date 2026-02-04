/**
 * Core Scanning Engine
 * Aligned with Cortex v4.0 P2-Hunter phase
 */

import type { FileEntry, Finding, ScanConfig, Ruleset, LocationType, CodeSnippet, Tier, SignalType } from '../types';
import { matchesAnyGlob } from '../utils/glob';

// ============================================================================
// DEOBFUSCATION PATTERNS
// Normalizes common obfuscation techniques before pattern matching
// ============================================================================

/**
 * Deobfuscation rules that normalize code before scanning
 */
const DEOBFUSCATION_RULES: Array<{ pattern: RegExp; replacement: string | ((_match: string, capture: string) => string); description: string }> = [
  // String concatenation: window['ev'+'al'] -> window['eval']
  { 
    pattern: /\[(['"`])(\w+)\1\s*\+\s*(['"`])(\w+)\3\]/g, 
    replacement: '["$2$4"]',
    description: 'Concatenated bracket notation'
  },
  // Hex encoding: \x65\x76\x61\x6c -> eval
  {
    pattern: /\\x([0-9a-fA-F]{2})/g,
    replacement: (_match: string, hex: string) => String.fromCharCode(parseInt(hex, 16)),
    description: 'Hex escape sequences'
  },
  // Unicode encoding: \u0065\u0076\u0061\u006c -> eval
  {
    pattern: /\\u([0-9a-fA-F]{4})/g,
    replacement: (_match: string, hex: string) => String.fromCharCode(parseInt(hex, 16)),
    description: 'Unicode escape sequences'
  },
  // Octal encoding: \145\166\141\154 -> eval
  {
    pattern: /\\([0-7]{1,3})/g,
    replacement: (_match: string, oct: string) => String.fromCharCode(parseInt(oct, 8)),
    description: 'Octal escape sequences'
  },
];

/**
 * Apply deobfuscation transformations to code
 */
function deobfuscate(code: string): string {
  let result = code;
  for (const rule of DEOBFUSCATION_RULES) {
    if (typeof rule.replacement === 'function') {
      result = result.replace(rule.pattern, rule.replacement as (substring: string, ...args: string[]) => string);
    } else {
      result = result.replace(rule.pattern, rule.replacement);
    }
  }
  return result;
}

/**
 * Generate a fingerprint for deduplication
 */
function generateFingerprint(ruleId: string, filePath: string, line: number, snippet: string): string {
  const content = `${ruleId}:${filePath}:${line}:${snippet.substring(0, 100)}`;
  // Simple hash for client-side (not cryptographic, just for dedup)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Map severity to tier (Cortex v4.0 alignment)
 */
function severityToTier(severity: string, reviewBucket: string): Tier {
  if (reviewBucket === 'AUTO_REJECT' || severity === 'BLOCKER' || severity === 'CRITICAL') {
    return 'BLOCKER';
  }
  if (reviewBucket === 'ACTION_REQUIRED' || severity === 'HIGH') {
    return 'ACTION_REQUIRED';
  }
  if (severity === 'MEDIUM') {
    return 'INVESTIGATE';
  }
  return 'LOGS';
}

/**
 * Determine signal type from rule category
 */
function categoryToSignalType(category: string): SignalType {
  if (category === 'UX' || category === 'PRODUCTION_READINESS') {
    return 'INTEGRITY';
  }
  return 'SECURITY';
}

/**
 * Run the scan against all files in the inventory
 * Aligned with Cortex v4.0 P2-Hunter phase
 */
export function runScan(
  inventory: FileEntry[],
  ruleset: Ruleset,
  config: ScanConfig
): Finding[] {
  const findings: Finding[] = [];
  const { limits } = config;
  
  // Track matches per rule to enforce limits
  const matchesPerRule: Record<string, number> = {};
  
  for (const file of inventory) {
    // Skip ignored files
    if (file.isIgnored) continue;
    
    // Skip non-text files
    if (!file.isTextCandidate || !file.content) continue;
    
    // Apply deobfuscation for better pattern detection
    const originalContent = file.content;
    const deobfuscatedContent = deobfuscate(file.content);
    
    // Track matches per file
    let matchesInFile = 0;
    
    for (const rule of ruleset.rules) {
      // Initialize rule counter
      if (matchesPerRule[rule.ruleId] === undefined) {
        matchesPerRule[rule.ruleId] = 0;
      }
      
      // Check if we've hit the limit for this rule
      if ((matchesPerRule[rule.ruleId] ?? 0) >= limits.maxMatchesPerRule) {
        continue;
      }
      
      for (const matcher of rule.matchers) {
        // Check if file matches the glob patterns
        if (!matchesAnyGlob(file.path, matcher.fileGlobs)) {
          continue;
        }
        
        // Check trigger tokens for quick filtering (on both original and deobfuscated)
        if (matcher.triggerTokens && matcher.triggerTokens.length > 0) {
          const hasTrigger = matcher.triggerTokens.some(token => 
            originalContent.includes(token) || deobfuscatedContent.includes(token)
          );
          if (!hasTrigger) continue;
        }
        
        // Run regex matching on both original and deobfuscated content
        if (matcher.type === 'regex' && matcher.pattern) {
          // Match against both versions to catch obfuscated patterns
          const contentVersions = [
            { content: originalContent, isDeobfuscated: false },
            { content: deobfuscatedContent, isDeobfuscated: true }
          ];
          
          const foundIndices = new Set<number>(); // Avoid duplicate findings
          
          for (const { content, isDeobfuscated } of contentVersions) {
            const regex = new RegExp(matcher.pattern, matcher.flags || 'g');
            let match: RegExpExecArray | null;
            
            while ((match = regex.exec(content)) !== null) {
              // Check file limit
              if (matchesInFile >= limits.maxMatchesPerFile) break;
              
              // Check rule limit
              if ((matchesPerRule[rule.ruleId] ?? 0) >= limits.maxMatchesPerRule) break;
              
              // Skip if we already found this at this index (from original content)
              if (foundIndices.has(match.index)) {
                if (match[0].length === 0) regex.lastIndex++;
                continue;
              }
              foundIndices.add(match.index);
              
              // Calculate line and column (always from original content)
              const { line, col } = getLineAndCol(originalContent, match.index);
              
              // Extract snippet with context
              const snippet = extractSnippet(originalContent, match.index, match[0].length);
              
              // Extract full context lines (for P4-judge)
              const context = extractContextLines(originalContent, line, 10);
              
              // Check allowlist patterns
              if (matcher.allowlistPatterns && matcher.allowlistPatterns.length > 0) {
                const isAllowed = matcher.allowlistPatterns.some(pattern => 
                  snippet.includes(pattern)
                );
                if (isAllowed) continue;
              }
              
              // Detect location type
              const locationType = detectLocationType(originalContent, match.index, file.path);
              
              // Determine confidence
              let confidence = matcher.confidence || 'MEDIUM';
              let confidenceReason: string | undefined;
              let confidenceScore = confidence === 'HIGH' ? 85 : confidence === 'MEDIUM' ? 65 : 45;
              
              // Adjust confidence based on location
              if (locationType === 'COMMENT' || locationType === 'STRING') {
                if (confidence === 'HIGH') {
                  confidence = 'MEDIUM';
                  confidenceScore = 55;
                  confidenceReason = `Downgraded from HIGH: found in ${locationType}`;
                }
              }
              if (locationType === 'TEST') {
                confidence = 'LOW';
                confidenceScore = 35;
                confidenceReason = 'Found in test file';
              }
              
              // Boost confidence if found via deobfuscation
              if (isDeobfuscated && !originalContent.includes(match[0])) {
                confidenceScore = Math.min(100, confidenceScore + 15);
                confidenceReason = (confidenceReason ? confidenceReason + '; ' : '') + 'Detected via deobfuscation';
              }
              
              // Apply conditional overrides
              let finalSeverity = rule.severity;
              let finalReviewBucket = rule.reviewBucket;
              let finalDisposition = rule.disposition;
              
              if (matcher.conditionalOverrides) {
                for (const override of matcher.conditionalOverrides) {
                  const overrideRegex = new RegExp(override.pattern, override.flags || 'i');
                  if (overrideRegex.test(snippet)) {
                    if (override.newSeverity) finalSeverity = override.newSeverity;
                    if (override.newReviewBucket) finalReviewBucket = override.newReviewBucket;
                    if (override.newDisposition) finalDisposition = override.newDisposition;
                    if (override.note) confidenceReason = override.note;
                    break;
                  }
                }
              }
              
              // Generate fingerprint for deduplication
              const fingerprint = generateFingerprint(rule.ruleId, file.path, line, snippet);
              
              // Determine tier and signal type (Cortex v4.0 alignment)
              const tier = severityToTier(finalSeverity, finalReviewBucket);
              const signalType = categoryToSignalType(rule.category);
              
              const finding: Finding = {
                id: fingerprint,
                ruleId: rule.ruleId,
                matcherId: matcher.id,
                patternId: matcher.id,
                filePath: file.path,
                line,
                col,
                snippet,
                triggerToken: match[0],
                locationType,
                confidence,
                confidenceReason,
                confidenceScore,
                tags: file.tags,
                severity: finalSeverity,
                reviewBucket: finalReviewBucket,
                disposition: finalDisposition,
                // Cortex v4.0 fields
                tier,
                signalType,
                context,
                verdict: tier === 'BLOCKER' ? 'FAIL' : tier === 'ACTION_REQUIRED' ? 'INVESTIGATE' : 'PASS',
                phase: 'P2-hunter',
                fingerprint,
              };
              
              findings.push(finding);
              matchesInFile++;
              matchesPerRule[rule.ruleId] = (matchesPerRule[rule.ruleId] ?? 0) + 1;
              
              // Prevent infinite loops for zero-width matches
              if (match[0].length === 0) {
                regex.lastIndex++;
              }
            }
          }
        }
      }
    }
  }
  
  return findings;
}

function getLineAndCol(content: string, index: number): { line: number; col: number } {
  const lines = content.substring(0, index).split('\n');
  return {
    line: lines.length,
    col: (lines[lines.length - 1]?.length || 0) + 1
  };
}

function extractSnippet(content: string, index: number, matchLength: number): string {
  const contextBefore = 40;
  const contextAfter = 40;
  
  const start = Math.max(0, index - contextBefore);
  const end = Math.min(content.length, index + matchLength + contextAfter);
  
  let snippet = content.substring(start, end);
  
  // Clean up snippet
  snippet = snippet.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Extract context lines around a specific line (for P4-judge AI analysis)
 * Returns structured CodeSnippet with before/after arrays
 */
function extractContextLines(content: string, targetLine: number, contextLines: number = 10): CodeSnippet {
  const lines = content.split('\n');
  const lineIndex = targetLine - 1; // Convert 1-indexed to 0-indexed
  
  const startLine = Math.max(0, lineIndex - contextLines);
  const endLine = Math.min(lines.length - 1, lineIndex + contextLines);
  
  const before = lines.slice(startLine, lineIndex);
  const code = lines[lineIndex] || '';
  const after = lines.slice(lineIndex + 1, endLine + 1);
  
  return {
    code,
    before,
    after,
    highlightStart: 0,
    highlightEnd: code.length,
  };
}

function detectLocationType(content: string, index: number, filePath: string): LocationType {
  // Check if in test file
  if (/\.(test|spec)\./i.test(filePath) || /__tests__/i.test(filePath)) {
    return 'TEST';
  }
  
  // Check if in documentation
  if (/\.(md|txt|rst)$/i.test(filePath) || /README/i.test(filePath)) {
    return 'DOC';
  }
  
  // Check if in source map
  if (/\.map$/i.test(filePath)) {
    return 'SOURCE_MAP';
  }
  
  // Look backwards for comment indicators
  const lineStart = content.lastIndexOf('\n', index) + 1;
  const lineContent = content.substring(lineStart, index);
  
  // Single-line comment
  if (/\/\//.test(lineContent)) {
    return 'COMMENT';
  }
  
  // Check if inside block comment
  const beforeMatch = content.substring(Math.max(0, index - 200), index);
  
  if (beforeMatch.lastIndexOf('/*') > beforeMatch.lastIndexOf('*/')) {
    return 'COMMENT';
  }
  
  // Check if inside string literal (rough heuristic)
  const quotesBefore = (lineContent.match(/['"]/g) || []).length;
  if (quotesBefore % 2 === 1) {
    return 'STRING';
  }
  
  return 'CODE';
}
