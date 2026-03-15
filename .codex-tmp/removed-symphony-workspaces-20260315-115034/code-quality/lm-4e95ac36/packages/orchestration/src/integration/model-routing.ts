/**
 * @create-something/orchestration
 *
 * Model Routing: Intelligent model selection based on task complexity.
 *
 * Philosophy: The Pattern → Plan (Sonnet) → Execute (Haiku) → Review (Opus)
 *
 * Haiku achieves 90% of Sonnet's performance on well-defined tasks while
 * costing 10x less. The key enabler is task decomposition quality.
 *
 * Copied from harness with minimal adaptation for orchestration layer.
 */

import type { BeadsIssue } from './beads.js';

/**
 * Claude model families.
 */
export type ClaudeModelFamily = 'haiku' | 'sonnet' | 'opus' | 'unknown';

/**
 * Model routing decision with rationale.
 */
export interface RoutingDecision {
  model: ClaudeModelFamily;
  confidence: number; // 0-1, how confident we are in this choice
  rationale: string;
  strategy: 'explicit-label' | 'complexity-label' | 'pattern-match' | 'file-count' | 'default';
}

/**
 * Task complexity analysis.
 */
export interface ComplexityAnalysis {
  level: 'trivial' | 'simple' | 'standard' | 'complex';
  indicators: string[];
  fileCount?: number;
  requiresCoordination: boolean;
  isSecurityCritical: boolean;
}

/**
 * Main routing function: selects optimal model for a Beads issue.
 */
export function selectModel(issue: BeadsIssue): RoutingDecision {
  // Strategy 1: Explicit model label (highest priority)
  const explicitModel = checkExplicitModelLabel(issue);
  if (explicitModel) {
    return explicitModel;
  }

  // Strategy 2: Complexity label
  const complexityModel = checkComplexityLabel(issue);
  if (complexityModel) {
    return complexityModel;
  }

  // Strategy 3: Pattern matching on title/description
  const patternModel = checkPatternMatching(issue);
  if (patternModel) {
    return patternModel;
  }

  // Strategy 4: Default to Sonnet
  return {
    model: 'sonnet',
    confidence: 0.6,
    rationale: 'No specific routing indicators found, using safe default',
    strategy: 'default',
  };
}

/**
 * Strategy 1: Check for explicit model:* labels.
 */
function checkExplicitModelLabel(issue: BeadsIssue): RoutingDecision | null {
  const labels = issue.labels || [];
  const modelLabels = labels.filter((l: string) => l.startsWith('model:'));

  if (modelLabels.length === 0) return null;

  const modelLabel = modelLabels[0]; // Use first if multiple
  const model = modelLabel.replace('model:', '') as ClaudeModelFamily;

  if (!['haiku', 'sonnet', 'opus'].includes(model)) {
    return null;
  }

  return {
    model,
    confidence: 1.0,
    rationale: `Explicit model label: ${modelLabel}`,
    strategy: 'explicit-label',
  };
}

/**
 * Strategy 2: Map complexity labels to models.
 */
function checkComplexityLabel(issue: BeadsIssue): RoutingDecision | null {
  const labels = issue.labels || [];
  const complexityLabels = labels.filter((l: string) => l.startsWith('complexity:'));

  if (complexityLabels.length === 0) return null;

  const complexity = complexityLabels[0].replace('complexity:', '');

  const mapping: Record<string, ClaudeModelFamily> = {
    trivial: 'haiku',
    simple: 'haiku',
    standard: 'sonnet',
    complex: 'opus',
  };

  const model = mapping[complexity];
  if (!model) return null;

  return {
    model,
    confidence: 0.95,
    rationale: `Complexity label maps to ${model}: ${complexity}`,
    strategy: 'complexity-label',
  };
}

/**
 * Strategy 3: Pattern matching on title/description.
 */
function checkPatternMatching(issue: BeadsIssue): RoutingDecision | null {
  const text = `${issue.title} ${issue.description || ''}`.toLowerCase();

  // Haiku patterns (simple execution tasks)
  const haikuPatterns = [
    /\b(rename|fix typo|format|lint|scaffold|CRUD|generate)\b/i,
    /\b(add console\.log|update text|change label)\b/i,
    /\b(create endpoint|add route|generate component)\b/i,
  ];

  // Opus patterns (architecture/security)
  const opusPatterns = [
    /\b(architect|architecture|design system|security audit|review)\b/i,
    /\b(authentication|authorization|payment|crypto)\b/i,
    /\b(performance optimization|memory leak|race condition)\b/i,
  ];

  for (const pattern of haikuPatterns) {
    if (pattern.test(text)) {
      return {
        model: 'haiku',
        confidence: 0.85,
        rationale: `Pattern match suggests simple execution task`,
        strategy: 'pattern-match',
      };
    }
  }

  for (const pattern of opusPatterns) {
    if (pattern.test(text)) {
      return {
        model: 'opus',
        confidence: 0.9,
        rationale: `Pattern match suggests complex/critical task`,
        strategy: 'pattern-match',
      };
    }
  }

  return null;
}

/**
 * Analyze task complexity from issue metadata.
 */
export function analyzeComplexity(issue: BeadsIssue): ComplexityAnalysis {
  const text = `${issue.title} ${issue.description || ''}`.toLowerCase();
  const indicators: string[] = [];

  // File count estimation (from metadata or description)
  const fileCount = estimateFileCount(issue);
  if (fileCount) {
    indicators.push(`Estimated ${fileCount} files`);
  }

  // Coordination check
  const requiresCoordination =
    (fileCount !== undefined && fileCount > 3) ||
    /\b(integrate|connect|coordinate|orchestrate)\b/i.test(text);

  if (requiresCoordination) {
    indicators.push('Requires multi-file coordination');
  }

  // Security check
  const labels = issue.labels || [];
  const isSecurityCritical =
    /\b(auth|security|password|token|crypto|payment)\b/i.test(text) ||
    labels.some((l: string) => l === 'security' || l === 'auth');

  if (isSecurityCritical) {
    indicators.push('Security-critical');
  }

  // Determine complexity level
  let level: ComplexityAnalysis['level'] = 'standard';

  if (isSecurityCritical || (fileCount !== undefined && fileCount > 5)) {
    level = 'complex';
  } else if (requiresCoordination || (fileCount !== undefined && fileCount >= 3)) {
    level = 'standard';
  } else if (fileCount === 1 || /\b(typo|rename|format)\b/i.test(text)) {
    level = 'trivial';
  } else if (fileCount !== undefined && fileCount <= 2) {
    level = 'simple';
  }

  return {
    level,
    indicators,
    fileCount,
    requiresCoordination,
    isSecurityCritical,
  };
}

/**
 * Estimate file count from issue description/metadata.
 */
function estimateFileCount(issue: BeadsIssue): number | undefined {
  // Check metadata first (custom field)
  const metadata = issue.metadata as Record<string, any> | undefined;
  if (metadata?.fileCount) {
    return Number(metadata.fileCount);
  }

  // Check for file paths in description
  const filePathPattern = /src\/[\w\/\-\.]+\.(ts|js|svelte|tsx|jsx)/g;
  const matches = (issue.description || '').match(filePathPattern);

  if (matches) {
    return matches.length;
  }

  return undefined;
}

/**
 * Get cost estimate for a routing decision.
 */
export function getCostEstimate(decision: RoutingDecision): {
  cost: number;
  unit: string;
} {
  const costs: Record<ClaudeModelFamily, number> = {
    haiku: 0.001,
    sonnet: 0.01,
    opus: 0.1,
    unknown: 0.01,
  };

  return {
    cost: costs[decision.model],
    unit: 'USD',
  };
}

/**
 * Format routing decision for display.
 */
export function formatRoutingDecision(decision: RoutingDecision): string {
  const cost = getCostEstimate(decision);
  return [
    `Model: ${decision.model.toUpperCase()}`,
    `Confidence: ${(decision.confidence * 100).toFixed(0)}%`,
    `Strategy: ${decision.strategy}`,
    `Cost: ~$${cost.cost}`,
    `Rationale: ${decision.rationale}`,
  ].join('\n');
}

/**
 * Validate that a model selection makes sense for the task.
 */
export function validateModelSelection(
  issue: BeadsIssue,
  model: ClaudeModelFamily
): { valid: boolean; warning?: string } {
  const analysis = analyzeComplexity(issue);

  // Warn if using Haiku for complex/security tasks
  if (model === 'haiku' && (analysis.level === 'complex' || analysis.isSecurityCritical)) {
    return {
      valid: true,
      warning: `Haiku selected for ${analysis.level} task. Consider Sonnet or Opus.`,
    };
  }

  // Warn if using Opus for trivial tasks
  if (model === 'opus' && analysis.level === 'trivial') {
    return {
      valid: true,
      warning: `Opus selected for trivial task. Haiku would be 100x cheaper.`,
    };
  }

  return { valid: true };
}

/**
 * Model improvement suggestion.
 */
export interface ModelSuggestion {
  currentModel: ClaudeModelFamily;
  suggestedModel: ClaudeModelFamily;
  reason: string;
  costSavings?: number;
}

/**
 * Suggest model improvements based on historical patterns.
 */
export function suggestModelImprovement(
  issue: BeadsIssue,
  currentModel: ClaudeModelFamily
): ModelSuggestion | null {
  const optimal = selectModel(issue);

  if (optimal.model === currentModel) {
    return null;
  }

  const currentCost = getCostEstimate({ ...optimal, model: currentModel });
  const suggestedCost = getCostEstimate(optimal);
  const savings = currentCost.cost - suggestedCost.cost;

  return {
    currentModel,
    suggestedModel: optimal.model,
    reason: optimal.rationale,
    costSavings: savings,
  };
}

/**
 * Select model for reviewer type (copied from harness reviewer.ts).
 */
export type ReviewerType = 'security' | 'architecture' | 'quality' | 'custom';

export function selectModelForReviewer(
  type: ReviewerType,
  override?: ClaudeModelFamily
): ClaudeModelFamily {
  if (override) return override;

  switch (type) {
    case 'security':
      return 'haiku'; // Pattern detection (known vulnerabilities)
    case 'architecture':
      return 'opus'; // Deep analysis (DRY violations, coupling)
    case 'quality':
      return 'sonnet'; // Balanced review (conventions, tests)
    case 'custom':
      return 'sonnet'; // Safe default
    default:
      return 'sonnet';
  }
}

/**
 * Check if model should escalate based on failures.
 *
 * Escalation pattern: haiku → sonnet → opus
 */
export function shouldEscalateModel(
  currentModel: ClaudeModelFamily,
  failures: number
): { escalate: boolean; toModel: ClaudeModelFamily; reason: string } {
  if (failures === 0) {
    return { escalate: false, toModel: currentModel, reason: 'No failures' };
  }

  // Escalate after 2 failures at current model
  if (failures >= 2) {
    if (currentModel === 'haiku') {
      return {
        escalate: true,
        toModel: 'sonnet',
        reason: `${failures} failures with Haiku, escalating to Sonnet`,
      };
    } else if (currentModel === 'sonnet') {
      return {
        escalate: true,
        toModel: 'opus',
        reason: `${failures} failures with Sonnet, escalating to Opus`,
      };
    }
  }

  return { escalate: false, toModel: currentModel, reason: 'Below escalation threshold' };
}

/**
 * Generate model cost breakdown for reporting.
 */
export interface ModelCostBreakdown {
  haiku: { sessions: number; cost: number };
  sonnet: { sessions: number; cost: number };
  opus: { sessions: number; cost: number };
  total: number;
}

export function generateModelCostBreakdown(
  sessions: Array<{ model: ClaudeModelFamily; cost: number }>
): ModelCostBreakdown {
  const breakdown: ModelCostBreakdown = {
    haiku: { sessions: 0, cost: 0 },
    sonnet: { sessions: 0, cost: 0 },
    opus: { sessions: 0, cost: 0 },
    total: 0,
  };

  for (const session of sessions) {
    if (session.model === 'haiku') {
      breakdown.haiku.sessions++;
      breakdown.haiku.cost += session.cost;
    } else if (session.model === 'sonnet') {
      breakdown.sonnet.sessions++;
      breakdown.sonnet.cost += session.cost;
    } else if (session.model === 'opus') {
      breakdown.opus.sessions++;
      breakdown.opus.cost += session.cost;
    }

    breakdown.total += session.cost;
  }

  return breakdown;
}

/**
 * Format model cost breakdown for display.
 */
export function formatModelCostBreakdown(breakdown: ModelCostBreakdown): string {
  const lines = [
    'Model Cost Breakdown:',
    '',
    `Haiku:  ${breakdown.haiku.sessions} sessions, $${breakdown.haiku.cost.toFixed(4)}`,
    `Sonnet: ${breakdown.sonnet.sessions} sessions, $${breakdown.sonnet.cost.toFixed(4)}`,
    `Opus:   ${breakdown.opus.sessions} sessions, $${breakdown.opus.cost.toFixed(4)}`,
    '',
    `Total:  $${breakdown.total.toFixed(4)}`,
  ];

  return lines.join('\n');
}
