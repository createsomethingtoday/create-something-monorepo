/**
 * @create-something/orchestration
 *
 * Extracts learnings from analyzed convoy/session data.
 *
 * Philosophy: Transform raw analysis into actionable learnings that can
 * be applied to .claude/rules/ files. Each learning should prevent
 * future occurrences of the pattern that triggered it.
 */

import type { StoredCheckpoint } from '../types.js';
import type {
  Learning,
  LearningType,
  LearningSource,
  ReflectionTarget,
  ReflectionStats,
  IssueMetrics,
  ReflectionConfig,
} from './types.js';
import { identifyCorrections, identifyFailurePatterns } from './analyzer.js';
import { nanoid } from 'nanoid';

/**
 * Extract learnings from analysis results.
 *
 * Combines multiple extraction strategies:
 * 1. Corrections (user corrected agent)
 * 2. Failure patterns (repeated failures)
 * 3. Inefficiency patterns (too many iterations)
 * 4. Missing context patterns (agent lacked info)
 */
export async function extractLearnings(
  target: ReflectionTarget,
  checkpoints: StoredCheckpoint[],
  issueMetrics: IssueMetrics[],
  stats: ReflectionStats,
  config: ReflectionConfig
): Promise<Learning[]> {
  const learnings: Learning[] = [];

  // 1. Extract learnings from corrections
  const correctionLearnings = extractCorrectionLearnings(checkpoints, target);
  learnings.push(...correctionLearnings);

  // 2. Extract learnings from failure patterns
  const failurePatterns = identifyFailurePatterns(issueMetrics);
  const failureLearnings = extractFailureLearnings(failurePatterns, target);
  learnings.push(...failureLearnings);

  // 3. Extract learnings from inefficiency patterns
  const inefficiencyLearnings = extractInefficiencyLearnings(issueMetrics, stats, target);
  learnings.push(...inefficiencyLearnings);

  // 4. Extract learnings from blockers
  const blockerLearnings = extractBlockerLearnings(checkpoints, target);
  learnings.push(...blockerLearnings);

  // Filter by confidence threshold
  return learnings.filter((l) => l.confidence >= config.minConfidence);
}

/**
 * Extract learnings from correction checkpoints.
 */
function extractCorrectionLearnings(
  checkpoints: StoredCheckpoint[],
  target: ReflectionTarget
): Learning[] {
  const corrections = identifyCorrections(checkpoints);
  const learnings: Learning[] = [];

  for (const cp of corrections) {
    const ctx = cp.context;

    // Check for blockers with notes
    for (const blocker of ctx.blockers) {
      const learning = createLearning({
        type: 'correction',
        title: `Correction: ${truncate(blocker, 50)}`,
        description: blocker,
        pattern: `Agent encountered blocker: ${blocker}`,
        suggestion: `Add guidance to prevent: ${blocker}`,
        sources: [
          {
            type: 'checkpoint',
            id: cp.id,
            evidence: blocker,
            timestamp: cp.timestamp,
          },
        ],
        confidence: 0.8,
        targetRuleFile: inferRuleFile(blocker),
      });
      learnings.push(learning);
    }

    // Check agent notes for correction patterns
    if (ctx.agentNotes && isCorrection(ctx.agentNotes)) {
      const learning = createLearning({
        type: 'correction',
        title: `Correction: ${truncate(ctx.agentNotes, 50)}`,
        description: ctx.agentNotes,
        pattern: `Agent note indicates correction: ${ctx.agentNotes}`,
        suggestion: extractSuggestion(ctx.agentNotes),
        sources: [
          {
            type: 'checkpoint',
            id: cp.id,
            evidence: ctx.agentNotes,
            timestamp: cp.timestamp,
          },
        ],
        confidence: 0.7,
        targetRuleFile: inferRuleFile(ctx.agentNotes),
      });
      learnings.push(learning);
    }
  }

  return learnings;
}

/**
 * Extract learnings from failure patterns.
 */
function extractFailureLearnings(
  patterns: { pattern: string; count: number; issues: string[] }[],
  target: ReflectionTarget
): Learning[] {
  return patterns.map((p) => {
    // Higher confidence for more occurrences
    const confidence = Math.min(0.5 + p.count * 0.15, 0.95);

    return createLearning({
      type: 'failure',
      title: `Repeated failure: ${truncate(p.pattern, 50)}`,
      description: `This failure pattern occurred ${p.count} times across issues: ${p.issues.join(', ')}`,
      pattern: p.pattern,
      suggestion: `Add error prevention for: ${p.pattern}`,
      sources: p.issues.map((id) => ({
        type: 'issue' as const,
        id,
        evidence: p.pattern,
        timestamp: new Date().toISOString(),
      })),
      confidence,
      targetRuleFile: inferRuleFile(p.pattern),
    });
  });
}

/**
 * Extract learnings from inefficiency patterns.
 */
function extractInefficiencyLearnings(
  issueMetrics: IssueMetrics[],
  stats: ReflectionStats,
  target: ReflectionTarget
): Learning[] {
  const learnings: Learning[] = [];

  // Find issues with significantly more iterations than average
  const threshold = stats.avgIterations * 2;

  for (const metrics of issueMetrics) {
    if (metrics.iterations > threshold && metrics.iterations >= 3) {
      const learning = createLearning({
        type: 'inefficiency',
        title: `High iteration count on ${metrics.issueId}`,
        description: `Issue ${metrics.issueId} required ${metrics.iterations} iterations (avg: ${stats.avgIterations.toFixed(1)}). This suggests the agent may have lacked context or guidance.`,
        pattern: `Multiple iterations on issue: ${metrics.iterations} vs avg ${stats.avgIterations.toFixed(1)}`,
        suggestion: `Review what caused ${metrics.iterations} iterations and add guidance to prevent in similar issues`,
        sources: [
          {
            type: 'issue',
            id: metrics.issueId,
            evidence: `${metrics.iterations} iterations, ${metrics.corrections} corrections`,
            timestamp: new Date().toISOString(),
          },
        ],
        confidence: 0.6,
        targetRuleFile: null, // Need human review to determine
      });
      learnings.push(learning);
    }
  }

  // Flag if overall correction rate is high
  const correctionRate = stats.corrections / Math.max(stats.issuesCompleted + stats.issuesFailed, 1);
  if (correctionRate > 0.3) {
    const learning = createLearning({
      type: 'inefficiency',
      title: `High correction rate: ${(correctionRate * 100).toFixed(0)}%`,
      description: `The correction rate of ${(correctionRate * 100).toFixed(0)}% suggests systematic issues with agent guidance or context.`,
      pattern: `${stats.corrections} corrections across ${stats.issuesCompleted + stats.issuesFailed} issues`,
      suggestion: 'Review common correction patterns and add preventive guidance to rule files',
      sources: [
        {
          type: target.type === 'epic' ? 'convoy' : target.type,
          id: target.id,
          evidence: `${stats.corrections} corrections, ${correctionRate.toFixed(2)} rate`,
          timestamp: new Date().toISOString(),
        },
      ],
      confidence: 0.75,
      targetRuleFile: null,
    });
    learnings.push(learning);
  }

  return learnings;
}

/**
 * Extract learnings from blocker patterns.
 */
function extractBlockerLearnings(
  checkpoints: StoredCheckpoint[],
  target: ReflectionTarget
): Learning[] {
  const learnings: Learning[] = [];

  // Group blockers by category
  const blockerCategories = new Map<string, { count: number; descriptions: string[] }>();

  for (const cp of checkpoints) {
    for (const blocker of cp.context.blockers) {
      const category = categorizeBlocker(blocker);

      if (!blockerCategories.has(category)) {
        blockerCategories.set(category, { count: 0, descriptions: [] });
      }

      const entry = blockerCategories.get(category)!;
      entry.count++;
      entry.descriptions.push(blocker);
    }
  }

  // Create learnings for repeated blocker categories
  for (const [category, data] of blockerCategories) {
    if (data.count >= 2) {
      const learning = createLearning({
        type: 'missing_context',
        title: `Repeated ${category} blockers`,
        description: `${category} blockers occurred ${data.count} times, suggesting missing guidance or context.`,
        pattern: `${category}: ${data.descriptions[0]}`,
        suggestion: `Add ${category} guidance to prevent these blockers`,
        sources: [
          {
            type: target.type === 'epic' ? 'convoy' : target.type,
            id: target.id,
            evidence: data.descriptions.join('; '),
            timestamp: new Date().toISOString(),
          },
        ],
        confidence: 0.7,
        targetRuleFile: inferRuleFileFromCategory(category),
      });
      learnings.push(learning);
    }
  }

  return learnings;
}

/**
 * Create a Learning object with defaults.
 */
function createLearning(
  params: Omit<Learning, 'id' | 'createdAt' | 'applied'>
): Learning {
  return {
    ...params,
    id: `learn-${nanoid(10)}`,
    createdAt: new Date().toISOString(),
    applied: false,
  };
}

/**
 * Check if a note indicates a correction.
 */
function isCorrection(note: string): boolean {
  const correctionKeywords = [
    'wrong',
    'incorrect',
    'fix',
    'actually',
    'instead',
    'should have',
    'mistake',
    'error',
    'correction',
    "didn't work",
    'failed',
  ];

  const lower = note.toLowerCase();
  return correctionKeywords.some((keyword) => lower.includes(keyword));
}

/**
 * Extract suggestion from a correction note.
 */
function extractSuggestion(note: string): string {
  // Look for patterns like "should X instead" or "use Y"
  const patterns = [
    /should (?:have )?(.+?)(?:\.|$)/i,
    /instead,? (.+?)(?:\.|$)/i,
    /use (.+?)(?:\.|$)/i,
    /try (.+?)(?:\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = note.match(pattern);
    if (match) {
      return `Consider: ${match[1]}`;
    }
  }

  return `Prevent: ${truncate(note, 100)}`;
}

/**
 * Infer which rule file should contain this learning.
 */
function inferRuleFile(text: string): string | null {
  const lower = text.toLowerCase();

  // Map keywords to rule files
  const mappings: [string[], string][] = [
    [['cloudflare', 'd1', 'kv', 'r2', 'worker', 'pages', 'wrangler'], 'cloudflare-patterns.md'],
    [['svelte', 'sveltekit', 'route', '+page', '+server', '+layout'], 'sveltekit-conventions.md'],
    [['css', 'tailwind', 'style', 'class', 'color', 'font'], 'css-canon.md'],
    [['voice', 'copy', 'writing', 'text', 'documentation'], 'voice-canon.md'],
    [['error', 'exception', 'catch', 'throw', 'handle'], 'error-handling-patterns.md'],
    [['beads', 'issue', 'bd ', 'ticket'], 'beads-patterns.md'],
    [['gastown', 'convoy', 'worker', 'gt ', 'parallel'], 'gastown-patterns.md'],
    [['harness', 'session', 'checkpoint', 'review'], 'harness-patterns.md'],
    [['orchestration', 'orch ', 'epic', 'cost'], 'orchestration-patterns.md'],
  ];

  for (const [keywords, file] of mappings) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return file;
    }
  }

  return null;
}

/**
 * Infer rule file from blocker category.
 */
function inferRuleFileFromCategory(category: string): string | null {
  const mappings: Record<string, string> = {
    authentication: 'error-handling-patterns.md',
    authorization: 'error-handling-patterns.md',
    database: 'cloudflare-patterns.md',
    api: 'cloudflare-patterns.md',
    deployment: 'cloudflare-patterns.md',
    testing: 'harness-patterns.md',
    types: 'sveltekit-conventions.md',
    routing: 'sveltekit-conventions.md',
  };

  return mappings[category.toLowerCase()] || null;
}

/**
 * Categorize a blocker description.
 */
function categorizeBlocker(description: string): string {
  const lower = description.toLowerCase();

  if (lower.includes('auth') || lower.includes('permission') || lower.includes('credential')) {
    return 'authentication';
  }
  if (lower.includes('database') || lower.includes('d1') || lower.includes('query')) {
    return 'database';
  }
  if (lower.includes('api') || lower.includes('endpoint') || lower.includes('request')) {
    return 'api';
  }
  if (lower.includes('deploy') || lower.includes('build') || lower.includes('wrangler')) {
    return 'deployment';
  }
  if (lower.includes('test') || lower.includes('spec') || lower.includes('assert')) {
    return 'testing';
  }
  if (lower.includes('type') || lower.includes('typescript') || lower.includes('interface')) {
    return 'types';
  }
  if (lower.includes('route') || lower.includes('page') || lower.includes('layout')) {
    return 'routing';
  }

  return 'other';
}

/**
 * Truncate string to max length.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
