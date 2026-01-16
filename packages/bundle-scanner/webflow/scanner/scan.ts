/**
 * Core Scanning Engine
 * Matches original IC implementation
 */

import type { FileEntry, Finding, ScanConfig, Ruleset, LocationType, Confidence, ScanRule } from '../types';
import { matchesAnyGlob } from '../utils/glob';

/**
 * Run the scan against all files in the inventory
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
    
    // Track matches per file
    let matchesInFile = 0;
    
    for (const rule of ruleset.rules) {
      // Initialize rule counter
      if (!matchesPerRule[rule.ruleId]) {
        matchesPerRule[rule.ruleId] = 0;
      }
      
      // Check if we've hit the limit for this rule
      if (matchesPerRule[rule.ruleId] >= limits.maxMatchesPerRule) {
        continue;
      }
      
      for (const matcher of rule.matchers) {
        // Check if file matches the glob patterns
        if (!matchesAnyGlob(file.path, matcher.fileGlobs)) {
          continue;
        }
        
        // Check trigger tokens for quick filtering
        if (matcher.triggerTokens && matcher.triggerTokens.length > 0) {
          const hasTrigger = matcher.triggerTokens.some(token => 
            file.content!.includes(token)
          );
          if (!hasTrigger) continue;
        }
        
        // Run regex matching
        if (matcher.type === 'regex' && matcher.pattern) {
          const regex = new RegExp(matcher.pattern, matcher.flags || 'g');
          let match: RegExpExecArray | null;
          
          while ((match = regex.exec(file.content)) !== null) {
            // Check file limit
            if (matchesInFile >= limits.maxMatchesPerFile) break;
            
            // Check rule limit
            if (matchesPerRule[rule.ruleId] >= limits.maxMatchesPerRule) break;
            
            // Calculate line and column
            const { line, col } = getLineAndCol(file.content, match.index);
            
            // Extract snippet with context
            const snippet = extractSnippet(file.content, match.index, match[0].length);
            
            // Check allowlist patterns
            if (matcher.allowlistPatterns && matcher.allowlistPatterns.length > 0) {
              const isAllowed = matcher.allowlistPatterns.some(pattern => 
                snippet.includes(pattern)
              );
              if (isAllowed) continue;
            }
            
            // Detect location type
            const locationType = detectLocationType(file.content, match.index, file.path);
            
            // Determine confidence
            let confidence = matcher.confidence || 'MEDIUM';
            let confidenceReason: string | undefined;
            
            // Adjust confidence based on location
            if (locationType === 'COMMENT' || locationType === 'STRING') {
              if (confidence === 'HIGH') {
                confidence = 'MEDIUM';
                confidenceReason = `Downgraded from HIGH: found in ${locationType}`;
              }
            }
            if (locationType === 'TEST') {
              confidence = 'LOW';
              confidenceReason = 'Found in test file';
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
            
            const finding: Finding = {
              ruleId: rule.ruleId,
              matcherId: matcher.id,
              filePath: file.path,
              line,
              col,
              snippet,
              triggerToken: match[0],
              locationType,
              confidence,
              confidenceReason,
              tags: file.tags,
              severity: finalSeverity,
              reviewBucket: finalReviewBucket,
              disposition: finalDisposition
            };
            
            findings.push(finding);
            matchesInFile++;
            matchesPerRule[rule.ruleId]++;
            
            // Prevent infinite loops for zero-width matches
            if (match[0].length === 0) {
              regex.lastIndex++;
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
  const afterMatch = content.substring(index, Math.min(content.length, index + 100));
  
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
