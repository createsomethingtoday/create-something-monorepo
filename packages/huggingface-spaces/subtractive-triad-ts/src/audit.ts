/**
 * Subtractive Triad Audit - Core Analysis Engine
 *
 * The Subtractive Triad applies one principle—subtractive revelation—at three scales:
 * 1. DRY (Implementation): "Have I built this before?" → Unify
 * 2. Rams (Artifact): "Does this earn its existence?" → Remove
 * 3. Heidegger (System): "Does this serve the whole?" → Reconnect
 *
 * Truth emerges through disciplined removal at every level of abstraction.
 */

// Types
export interface Violation {
  level: 'dry' | 'rams' | 'heidegger';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location?: string;
  suggestion?: string;
}

export interface LevelResult {
  score: number;
  violations: Violation[];
  commendations: string[];
  metrics: Record<string, number | string | boolean>;
}

export interface AuditResult {
  dry: LevelResult;
  rams: LevelResult;
  heidegger: LevelResult;
  overall: number;
  summary: string;
  totalViolations: number;
}

/**
 * Find similar blocks of code (simplified duplicate detection)
 */
function findDuplicateBlocks(
  lines: string[],
  minBlockSize: number = 5
): Array<{ start1: number; start2: number; size: number }> {
  const duplicates: Array<{ start1: number; start2: number; size: number }> = [];
  const seen = new Map<string, number>();

  for (let i = 0; i <= lines.length - minBlockSize; i++) {
    const block = lines
      .slice(i, i + minBlockSize)
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n');

    if (block.length < 50) continue; // Skip trivial blocks

    const normalized = block.replace(/\s+/g, ' ');

    if (seen.has(normalized)) {
      const originalLine = seen.get(normalized)!;
      if (Math.abs(i - originalLine) > minBlockSize) {
        duplicates.push({ start1: originalLine, start2: i, size: minBlockSize });
      }
    } else {
      seen.set(normalized, i);
    }
  }

  return duplicates;
}

/**
 * Find repeated string literals
 */
function findRepeatedStrings(code: string): Map<string, number> {
  const stringPattern = /["'`]([^"'`]{10,})["'`]/g;
  const counts = new Map<string, number>();

  let match;
  while ((match = stringPattern.exec(code)) !== null) {
    const str = match[1];
    counts.set(str, (counts.get(str) || 0) + 1);
  }

  return new Map([...counts].filter(([_, count]) => count >= 3));
}

/**
 * Find similar function patterns (by comparing function bodies)
 */
function findSimilarFunctions(code: string): Array<{ name1: string; name2: string; similarity: number }> {
  const functionPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{))/g;
  const functions: Array<{ name: string; start: number }> = [];

  let match;
  while ((match = functionPattern.exec(code)) !== null) {
    const name = match[1] || match[2];
    functions.push({ name, start: match.index });
  }

  const similar: Array<{ name1: string; name2: string; similarity: number }> = [];

  for (let i = 0; i < functions.length; i++) {
    for (let j = i + 1; j < functions.length; j++) {
      // Get function bodies (simplified: next 10 lines after function start)
      const body1 = code.slice(functions[i].start, functions[i].start + 500);
      const body2 = code.slice(functions[j].start, functions[j].start + 500);

      // Simple similarity check
      const similarity = calculateSimilarity(body1, body2);
      if (similarity > 0.8) {
        similar.push({
          name1: functions[i].name,
          name2: functions[j].name,
          similarity,
        });
      }
    }
  }

  return similar;
}

/**
 * Calculate string similarity (Dice coefficient)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length < 2 || str2.length < 2) return 0;

  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();

  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substring(i, i + 2));
  }
  for (let i = 0; i < str2.length - 1; i++) {
    bigrams2.add(str2.substring(i, i + 2));
  }

  let intersection = 0;
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) intersection++;
  }

  return (2 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * DRY Analysis: "Have I built this before?"
 */
function analyzeDry(code: string): LevelResult {
  const violations: Violation[] = [];
  const commendations: string[] = [];
  const lines = code.split('\n');

  // Find duplicate blocks
  const duplicates = findDuplicateBlocks(lines);
  const duplicateBlockCount = duplicates.length;

  for (const dup of duplicates.slice(0, 3)) {
    violations.push({
      level: 'dry',
      severity: 'high',
      message: 'Duplicate code block found',
      location: `Lines ${dup.start1 + 1}-${dup.start1 + dup.size} and ${dup.start2 + 1}-${dup.start2 + dup.size}`,
      suggestion: 'Extract to a shared function or module',
    });
  }

  // Find repeated strings
  const repeatedStrings = findRepeatedStrings(code);
  for (const [literal, count] of [...repeatedStrings].slice(0, 3)) {
    const truncated = literal.length > 40 ? literal.slice(0, 40) + '...' : literal;
    violations.push({
      level: 'dry',
      severity: 'medium',
      message: `String literal repeated ${count} times: "${truncated}"`,
      suggestion: 'Extract to a constant or configuration',
    });
  }

  // Find similar functions
  const similarFunctions = findSimilarFunctions(code);
  for (const { name1, name2, similarity } of similarFunctions.slice(0, 3)) {
    violations.push({
      level: 'dry',
      severity: 'medium',
      message: `Functions '${name1}' and '${name2}' are ${Math.round(similarity * 100)}% similar`,
      suggestion: 'Consider extracting shared logic to a helper function',
    });
  }

  // Calculate score
  const duplicationPercentage = (duplicateBlockCount * 5 / Math.max(lines.length, 1)) * 100;
  let penalty = Math.min(5, duplicationPercentage / 5);
  penalty += Math.min(2, repeatedStrings.size * 0.5);
  penalty += Math.min(2, similarFunctions.length * 0.5);

  const score = Math.max(0, Math.round((10 - penalty) * 10) / 10);

  // Commendations
  if (duplicateBlockCount === 0 && repeatedStrings.size === 0 && similarFunctions.length === 0) {
    commendations.push('No significant duplication detected - code is well-factored');
  }

  return {
    score,
    violations,
    commendations,
    metrics: {
      duplicateBlocks: duplicateBlockCount,
      repeatedLiterals: repeatedStrings.size,
      similarFunctions: similarFunctions.length,
      duplicationPercentage: Math.round(duplicationPercentage * 10) / 10,
    },
  };
}

/**
 * Rams Analysis: "Does this earn its existence?"
 */
function analyzeRams(code: string): LevelResult {
  const violations: Violation[] = [];
  const commendations: string[] = [];
  const lines = code.split('\n');

  // Find imports
  const importPattern = /import\s+(?:{[^}]+}|[\w*]+(?:\s+as\s+\w+)?)\s+from\s+['"]([^'"]+)['"]/g;
  const imports = new Set<string>();
  let match;
  while ((match = importPattern.exec(code)) !== null) {
    // Extract imported names
    const importLine = match[0];
    const namedImports = importLine.match(/{\s*([^}]+)\s*}/);
    if (namedImports) {
      namedImports[1].split(',').forEach(name => {
        const cleanName = name.trim().split(/\s+as\s+/).pop()?.trim();
        if (cleanName) imports.add(cleanName);
      });
    }
    const defaultImport = importLine.match(/import\s+(\w+)\s+from/);
    if (defaultImport) imports.add(defaultImport[1]);
  }

  // Find unused imports (simple check: name not found elsewhere in code)
  const unusedImports: string[] = [];
  for (const importName of imports) {
    // Check if the import is used anywhere (excluding the import line)
    const codeWithoutImports = code.replace(/import\s+.+from\s+['"][^'"]+['"]/g, '');
    const usagePattern = new RegExp(`\\b${importName}\\b`);
    if (!usagePattern.test(codeWithoutImports)) {
      unusedImports.push(importName);
    }
  }

  for (const name of unusedImports.slice(0, 5)) {
    violations.push({
      level: 'rams',
      severity: 'medium',
      message: `Unused import: '${name}'`,
      suggestion: 'Remove if not needed',
    });
  }

  // Find empty/stub functions
  const emptyFunctionPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{))\s*{\s*(?:\/\/[^\n]*\n\s*)*}/g;
  const emptyFunctions: string[] = [];
  while ((match = emptyFunctionPattern.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name) emptyFunctions.push(name);
  }

  for (const name of emptyFunctions.slice(0, 3)) {
    violations.push({
      level: 'rams',
      severity: 'medium',
      message: `Empty function '${name}' - does it earn its existence?`,
      suggestion: 'Implement or remove',
    });
  }

  // Check comment ratio
  const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*') || l.trim().startsWith('*')).length;
  const codeLines = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && !l.trim().startsWith('*')).length;
  const commentRatio = commentLines / Math.max(lines.length, 1);

  if (commentRatio > 0.3) {
    violations.push({
      level: 'rams',
      severity: 'low',
      message: `High comment ratio (${Math.round(commentRatio * 100)}%) - code may not be self-documenting`,
      suggestion: 'Refactor to make code intentions clear through naming and structure',
    });
  }

  // Check for large file
  if (lines.length > 500) {
    violations.push({
      level: 'rams',
      severity: lines.length > 1000 ? 'high' : 'medium',
      message: `Large file (${lines.length} lines) - may have too many responsibilities`,
      suggestion: 'Consider splitting into focused modules',
    });
  }

  // Calculate score
  let penalty = Math.min(3, unusedImports.length * 0.5);
  penalty += Math.min(2, emptyFunctions.length * 0.5);
  penalty += commentRatio > 0.3 ? 0.5 : 0;
  penalty += lines.length > 500 ? 1 : 0;

  const score = Math.max(0, Math.round((10 - penalty) * 10) / 10);

  // Commendations
  if (unusedImports.length === 0) {
    commendations.push('All imports are used - no dead weight');
  }
  if (emptyFunctions.length === 0) {
    commendations.push('No empty functions - everything earns its existence');
  }

  return {
    score,
    violations,
    commendations,
    metrics: {
      unusedImports: unusedImports.length,
      emptyFunctions: emptyFunctions.length,
      commentRatio: Math.round(commentRatio * 100),
      linesOfCode: codeLines,
    },
  };
}

/**
 * Heidegger Analysis: "Does this serve the whole?"
 */
function analyzeHeidegger(code: string): LevelResult {
  const violations: Violation[] = [];
  const commendations: string[] = [];
  const lines = code.split('\n');

  // Check for module documentation
  const hasDocstring = code.trimStart().startsWith('/**') || code.trimStart().startsWith('/*');

  if (!hasDocstring) {
    violations.push({
      level: 'heidegger',
      severity: 'low',
      message: 'Missing module documentation',
      suggestion: "Add a docstring explaining the module's purpose in the whole",
    });
  } else {
    commendations.push('Module has documentation - context for understanding');
  }

  // Find function and class names
  const functionNames: string[] = [];
  const classNames: string[] = [];

  const functionPattern = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
  const classPattern = /class\s+(\w+)/g;

  let match;
  while ((match = functionPattern.exec(code)) !== null) {
    functionNames.push(match[1] || match[2]);
  }
  while ((match = classPattern.exec(code)) !== null) {
    classNames.push(match[1]);
  }

  // Check naming conventions
  // Functions: camelCase or snake_case
  const validFunctions = functionNames.filter(
    name => /^[a-z][a-zA-Z0-9]*$/.test(name) || /^[a-z][a-z0-9_]*$/.test(name) || name.startsWith('_')
  );
  // Classes: PascalCase
  const validClasses = classNames.filter(name => /^[A-Z][a-zA-Z0-9]*$/.test(name));

  const totalNamed = functionNames.length + classNames.length;
  const validNamed = validFunctions.length + validClasses.length;
  const namingConsistency = totalNamed > 0 ? validNamed / totalNamed : 1;

  if (namingConsistency < 0.8) {
    violations.push({
      level: 'heidegger',
      severity: 'medium',
      message: `Inconsistent naming conventions (${Math.round(namingConsistency * 100)}% consistent)`,
      suggestion: 'Use camelCase for functions, PascalCase for classes',
    });
  } else if (totalNamed > 0) {
    commendations.push('Consistent naming - parts speak the same language');
  }

  // Check import count (connection to the whole)
  const importCount = (code.match(/import\s+/g) || []).length;

  if (importCount > 15) {
    violations.push({
      level: 'heidegger',
      severity: 'medium',
      message: `High import count (${importCount}) - module may have too many responsibilities`,
      suggestion: 'Consider splitting into focused modules',
    });
  } else if (importCount >= 3 && importCount <= 10) {
    commendations.push('Balanced imports - well-connected without over-coupling');
  }

  // Check export clarity
  const exports = (code.match(/export\s+(?:const|let|var|function|class|default|{)/g) || []).length;

  if (exports > 10) {
    violations.push({
      level: 'heidegger',
      severity: 'medium',
      message: `Large public API (${exports} exports) - hard to understand module's role`,
      suggestion: 'Consider which exports are truly public API vs internal helpers',
    });
  }

  // Calculate score
  let penalty = 0;
  if (!hasDocstring) penalty += 1;
  if (namingConsistency < 0.8) penalty += 1.5;
  if (importCount > 15) penalty += 1;
  if (exports > 10) penalty += 1;

  const score = Math.max(0, Math.round((10 - penalty) * 10) / 10);

  return {
    score,
    violations,
    commendations,
    metrics: {
      hasDocstring,
      namingConsistency: Math.round(namingConsistency * 100),
      importCount,
      exportCount: exports,
      functionCount: functionNames.length,
      classCount: classNames.length,
    },
  };
}

/**
 * Run complete Subtractive Triad audit on code.
 */
export async function runAudit(
  code: string,
  filename: string = 'code.ts',
  language: string = 'typescript'
): Promise<AuditResult> {
  const dry = analyzeDry(code);
  const rams = analyzeRams(code);
  const heidegger = analyzeHeidegger(code);

  // Weighted overall score (Heidegger weighted higher - system coherence matters most)
  const overall = Math.round(
    (dry.score * 0.3 + rams.score * 0.3 + heidegger.score * 0.4) * 10
  ) / 10;

  // Generate summary
  const totalViolations =
    dry.violations.length + rams.violations.length + heidegger.violations.length;

  let summary: string;
  if (overall >= 9) {
    summary = 'Excellent - code embodies subtractive discipline';
  } else if (overall >= 7) {
    summary = 'Good - minor improvements possible through removal';
  } else if (overall >= 5) {
    summary = 'Fair - several opportunities for simplification';
  } else {
    summary = 'Needs work - significant excess to remove';
  }

  return {
    dry,
    rams,
    heidegger,
    overall,
    summary,
    totalViolations,
  };
}
