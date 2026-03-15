import type { 
  Ruleset, 
  ScanConfig, 
  FileEntry, 
  Finding, 
  RuleMatcher,
  ProgressCallback,
  LocationType,
  Confidence
} from '../types';
import { matchesAnyGlob } from '../utils/glob';

/**
 * Calculate line and column from a string index
 */
function getLineCol(text: string, index: number): { line: number; col: number } {
  if (!text) return { line: 1, col: 1 };
  
  const upToMatch = text.substring(0, index);
  const matches = upToMatch.match(/\n/g);
  const line = (matches ? matches.length : 0) + 1;
  const lastNewline = upToMatch.lastIndexOf('\n');
  const col = index - lastNewline;
  
  return { line, col };
}

/**
 * Extract contextual lines around a match
 */
function getContextualSnippet(
  content: string, 
  matchIndex: number, 
  matchLength: number, 
  contextLines = 3
): string {
  if (!content) return '';
  
  let start = matchIndex;
  let end = matchIndex + matchLength;
  let linesBefore = 0;
  let linesAfter = 0;

  // Find start (go back contextLines newlines)
  while (start > 0 && linesBefore <= contextLines) {
    start--;
    if (content[start] === '\n') linesBefore++;
  }
  
  // Adjust start to be after the newline
  if (content[start] === '\n') start++;

  // Find end (go forward contextLines newlines)
  while (end < content.length && linesAfter <= contextLines) {
    if (content[end] === '\n') linesAfter++;
    end++;
  }

  return content.substring(start, end);
}

/**
 * Pre-compiled matcher for performance
 */
interface CompiledMatcher {
  regex: RegExp;
  matcher: RuleMatcher;
  ruleId: string;
  ruleCategory: string;
}

/**
 * Run the scanning engine against an inventory of files
 * 
 * @param inventory - File inventory to scan
 * @param ruleset - Rules to apply
 * @param config - Scanner configuration
 * @param onProgress - Progress callback
 * @returns Array of findings
 */
export function runScan(
  inventory: FileEntry[],
  ruleset: Ruleset,
  config: ScanConfig,
  onProgress: ProgressCallback
): Finding[] {
  const startTime = performance.now();
  const findings: Finding[] = [];
  
  // Filter to text files only
  const textFiles = inventory.filter(f => f.isTextCandidate && !f.isIgnored && f.content);
  
  const rules = ruleset.rules ?? [];
  
  // Pre-compile all regex matchers
  const compiledMatchers: CompiledMatcher[] = [];
  
  for (const rule of rules) {
    if (!rule.matchers) continue;
    
    for (const matcher of rule.matchers) {
      if (matcher.type === 'regex' && matcher.pattern) {
        try {
          // Add 'd' flag for indices support
          const flags = (matcher.flags ?? 'g') + (matcher.flags?.includes('d') ? '' : 'd');
          compiledMatchers.push({
            regex: new RegExp(matcher.pattern, flags),
            matcher,
            ruleId: rule.ruleId,
            ruleCategory: rule.category
          });
        } catch (e) {
          console.error(`Failed to compile regex for ${rule.ruleId}:`, e);
        }
      }
    }
  }

  let processedCount = 0;
  const ruleMatchCounts = new Map<string, number>();
  
  // Scan loop
  for (const file of textFiles) {
    processedCount++;
    
    // Batch progress updates
    if (processedCount % 100 === 0) {
      onProgress(`Scanning ${processedCount}/${textFiles.length} files...`);
    }
    
    const content = file.content!;
    let fileMatchCount = 0;

    for (const cm of compiledMatchers) {
      // Early exit: check rule-level limits
      const currentRuleCount = ruleMatchCounts.get(cm.ruleId) ?? 0;
      if (currentRuleCount >= config.limits.maxMatchesPerRule) continue;
      
      // Early exit: check file globs BEFORE regex execution
      if (!matchesAnyGlob(file.path, cm.matcher.fileGlobs)) continue;

      // Reset regex state for 'g' flag
      cm.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      let loopCount = 0;
      
      while ((match = cm.regex.exec(content)) !== null) {
        loopCount++;
        
        // Safety: prevent infinite loops
        if (loopCount > 5000) break;
        
        // Config limits
        if (fileMatchCount >= config.limits.maxMatchesPerFile) break;

        const index = match.index;
        const matchText = match[0];
        
        // Guard against empty matches
        if (!matchText || matchText.length === 0) {
          cm.regex.lastIndex++;
          continue;
        }

        // Extract contextual snippet
        let snippet = getContextualSnippet(content, index, matchText.length, 3);

        // Allowlist check
        if (cm.matcher.allowlistPatterns && cm.matcher.allowlistPatterns.length > 0) {
          const isAllowed = cm.matcher.allowlistPatterns.some(pattern => {
            try {
              if (matchText === pattern) return true;
              return new RegExp(pattern, 'i').test(snippet);
            } catch { 
              return false; 
            }
          });
          if (isAllowed) continue;
        }

        // Determine location type
        let locationType: LocationType = 'CODE';
        const lowerPath = file.path.toLowerCase();
        
        if (file.tags.includes('SOURCE_MAP') || lowerPath.endsWith('.map')) {
          locationType = 'SOURCE_MAP';
        } else if (lowerPath.includes('test') || lowerPath.includes('spec')) {
          locationType = 'TEST';
        } else if (lowerPath.endsWith('.md') || lowerPath.includes('readme')) {
          locationType = 'DOC';
        } else if (file.ext === '.json') {
          locationType = 'STRING';
        }
        
        // Check if match is in a comment
        const { line, col } = getLineCol(content, index);
        const lineStart = content.lastIndexOf('\n', index) + 1;
        const lineEnd = content.indexOf('\n', index);
        const lineContent = content.substring(lineStart, lineEnd !== -1 ? lineEnd : content.length);
        const trimmedLine = lineContent.trim();
        
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
          locationType = 'COMMENT';
        }

        // Determine confidence
        let confidence: Confidence = cm.matcher.confidence ?? 'MEDIUM';
        let confidenceReason: string | undefined;
        
        if (file.tags.includes('MINIFIED_FILE') || file.tags.includes('GENERATED_BUNDLE')) {
          confidence = 'LOW';
          confidenceReason = 'Generated/Minified Code';
        }
        
        if (locationType === 'COMMENT' || locationType === 'DOC') {
          confidence = 'LOW';
          confidenceReason = 'Comment/Doc Match';
        }

        // Apply conditional overrides
        let severity = undefined;
        let reviewBucket = undefined;
        let disposition = undefined;

        if (cm.matcher.conditionalOverrides) {
          for (const override of cm.matcher.conditionalOverrides) {
            try {
              if (new RegExp(override.pattern, override.flags ?? 'i').test(snippet)) {
                if (override.newSeverity) severity = override.newSeverity;
                if (override.newReviewBucket) reviewBucket = override.newReviewBucket;
                if (override.newDisposition) disposition = override.newDisposition;
                if (override.note) confidenceReason = override.note;
                break;
              }
            } catch (e) {
              console.error('Override regex error:', e);
            }
          }
        }

        // Redact sensitive data in SECURITY findings
        if (cm.ruleCategory === 'SECURITY' && matchText.length > 8) {
          const maskedMatch = matchText.substring(0, 4) + '***' + matchText.substring(matchText.length - 4);
          snippet = snippet.replace(matchText, maskedMatch);
        }

        findings.push({
          ruleId: cm.ruleId,
          matcherId: cm.matcher.id,
          filePath: file.path,
          line,
          col,
          snippet,
          triggerToken: matchText.substring(0, 50),
          locationType,
          confidence,
          confidenceReason,
          tags: file.tags,
          severity,
          reviewBucket,
          disposition
        });

        fileMatchCount++;
        ruleMatchCounts.set(cm.ruleId, currentRuleCount + 1);
      }
    }
  }

  const duration = performance.now() - startTime;
  console.log(`Scan completed in ${duration.toFixed(0)}ms - ${findings.length} findings`);
  
  return findings;
}
