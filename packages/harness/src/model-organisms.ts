/**
 * @create-something/harness
 *
 * Model Organisms: Validation framework for model routing decisions
 * Pattern from Anthropic's Bloom (December 2024)
 *
 * Philosophy: "Model organisms" are intentionally crafted test cases with known
 * complexity. They validate that routing logic correctly assigns models to tasks.
 *
 * If Haiku succeeds on "trivial" but fails on "complex", routing is working.
 * If Opus is used for "trivial", we're wasting money.
 */

import type { BeadsIssue } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type OrganismComplexity = 'trivial' | 'simple' | 'standard' | 'complex';

export interface ModelOrganism {
  /** Unique identifier */
  id: string;
  /** Human-readable title */
  title: string;
  /** Task description */
  description: string;
  /** Known complexity level */
  knownComplexity: OrganismComplexity;
  /** Expected model to route to */
  expectedModel: 'haiku' | 'sonnet' | 'opus';
  /** Labels to apply (for routing heuristics) */
  labels: string[];
  /** Success criteria (how to validate completion) */
  successCriteria: string[];
  /** Category for grouping */
  category: 'refactor' | 'feature' | 'bug' | 'test' | 'docs';
}

export interface OrganismValidation {
  /** Organism being validated */
  organism: ModelOrganism;
  /** Model that was actually selected */
  actualModel: 'haiku' | 'sonnet' | 'opus';
  /** Whether routing was correct */
  routingCorrect: boolean;
  /** Whether task completed successfully */
  taskSucceeded: boolean;
  /** Cost in USD */
  costUsd: number;
  /** Duration in ms */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Number of iterations/retries */
  iterations: number;
  /** Whether escalation occurred */
  escalated: boolean;
}

export interface OrganismSuite {
  /** Suite name */
  name: string;
  /** All organisms in this suite */
  organisms: ModelOrganism[];
  /** Validation results */
  validations: OrganismValidation[];
}

export interface RoutingMetrics {
  /** Total organisms tested */
  total: number;
  /** Routing accuracy (correct model selected) */
  routingAccuracy: number;
  /** Task success rate */
  successRate: number;
  /** Average cost per task */
  avgCost: number;
  /** Cost breakdown by complexity */
  costByComplexity: Record<OrganismComplexity, number>;
  /** Success rate by model */
  successByModel: Record<'haiku' | 'sonnet' | 'opus', number>;
  /** Escalation rate */
  escalationRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Organism Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard test organisms for validating routing decisions.
 * Each organism has known complexity and expected routing.
 */
export const STANDARD_ORGANISMS: ModelOrganism[] = [
  // TRIVIAL - Should always route to Haiku (~$0.001)
  {
    id: 'org-trivial-typo',
    title: 'Fix typo in README',
    description: 'Change "hte" to "the" in README.md line 42',
    knownComplexity: 'trivial',
    expectedModel: 'haiku',
    labels: ['complexity:trivial', 'docs', 'model:haiku'],
    successCriteria: ['README.md line 42 contains "the" not "hte"'],
    category: 'docs',
  },
  {
    id: 'org-trivial-console',
    title: 'Add console.log for debugging',
    description: 'Add console.log("User:", user) in handleLogin function',
    knownComplexity: 'trivial',
    expectedModel: 'haiku',
    labels: ['complexity:trivial', 'bug', 'model:haiku'],
    successCriteria: ['console.log appears in handleLogin'],
    category: 'bug',
  },
  {
    id: 'org-trivial-rename',
    title: 'Rename variable getUserData to fetchUser',
    description: 'Rename getUserData function to fetchUser across all files',
    knownComplexity: 'trivial',
    expectedModel: 'haiku',
    labels: ['complexity:trivial', 'refactor', 'model:haiku'],
    successCriteria: ['No references to getUserData remain', 'All calls use fetchUser'],
    category: 'refactor',
  },

  // SIMPLE - Should route to Haiku or Sonnet (~$0.001-$0.01)
  {
    id: 'org-simple-endpoint',
    title: 'Add GET /api/users endpoint',
    description: 'Create a simple GET endpoint that returns all users from the database',
    knownComplexity: 'simple',
    expectedModel: 'haiku',
    labels: ['complexity:simple', 'feature', 'model:haiku'],
    successCriteria: ['Endpoint responds with user list', 'Basic test passes'],
    category: 'feature',
  },
  {
    id: 'org-simple-validation',
    title: 'Add email validation to signup form',
    description: 'Add basic email regex validation to the signup form',
    knownComplexity: 'simple',
    expectedModel: 'haiku',
    labels: ['complexity:simple', 'feature', 'model:haiku'],
    successCriteria: ['Invalid emails rejected', 'Valid emails accepted'],
    category: 'feature',
  },

  // STANDARD - Should route to Sonnet (~$0.01)
  {
    id: 'org-standard-auth',
    title: 'Implement JWT authentication middleware',
    description: 'Create middleware that validates JWT tokens and attaches user to request',
    knownComplexity: 'standard',
    expectedModel: 'sonnet',
    labels: ['complexity:standard', 'feature', 'security'],
    successCriteria: [
      'Middleware validates JWT',
      'User attached to request on valid token',
      'Returns 401 on invalid token',
      'Tests pass',
    ],
    category: 'feature',
  },
  {
    id: 'org-standard-refactor',
    title: 'Extract shared validation logic',
    description: 'Refactor 3 files that duplicate email/phone validation into shared utilities',
    knownComplexity: 'standard',
    expectedModel: 'sonnet',
    labels: ['complexity:standard', 'refactor'],
    successCriteria: [
      'Shared validation module created',
      'All 3 files use shared module',
      'Tests pass',
      'No duplication remains',
    ],
    category: 'refactor',
  },

  // COMPLEX - Should route to Opus (~$0.10)
  {
    id: 'org-complex-architecture',
    title: 'Design payment processing architecture',
    description:
      'Design and implement a payment processing system with Stripe integration, webhook handling, and retry logic',
    knownComplexity: 'complex',
    expectedModel: 'opus',
    labels: ['complexity:complex', 'feature', 'model:opus', 'architecture'],
    successCriteria: [
      'Architecture document created',
      'Payment flow implemented',
      'Webhook handling works',
      'Retry logic handles failures',
      'Security review passes',
      'E2E tests pass',
    ],
    category: 'feature',
  },
  {
    id: 'org-complex-security',
    title: 'Audit and fix auth system security',
    description: 'Complete security audit of authentication system and fix all vulnerabilities',
    knownComplexity: 'complex',
    expectedModel: 'opus',
    labels: ['complexity:complex', 'security', 'model:opus'],
    successCriteria: [
      'Security audit completed',
      'All vulnerabilities fixed',
      'Penetration testing passes',
      'Security review approves',
    ],
    category: 'bug',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Organism → Beads Issue Conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert model organism to Beads issue for testing.
 */
export function organismToBeadsIssue(organism: ModelOrganism): Partial<BeadsIssue> {
  // Map complexity to priority
  const priorityMap: Record<OrganismComplexity, number> = {
    trivial: 3, // P3
    simple: 2, // P2
    standard: 1, // P1
    complex: 0, // P0
  };

  return {
    title: organism.title,
    description: organism.description,
    priority: priorityMap[organism.knownComplexity],
    labels: [...organism.labels, `test:organism`, `organism:${organism.id}`],
    issue_type: organism.category,
    metadata: {
      organism: {
        id: organism.id,
        knownComplexity: organism.knownComplexity,
        expectedModel: organism.expectedModel,
        successCriteria: organism.successCriteria,
      },
    },
  };
}

/**
 * Check if a Beads issue is a model organism.
 */
export function isModelOrganism(issue: BeadsIssue): boolean {
  return issue.labels.includes('test:organism');
}

/**
 * Extract organism metadata from Beads issue.
 */
export function getOrganismMetadata(issue: BeadsIssue): ModelOrganism | null {
  if (!isModelOrganism(issue)) {
    return null;
  }

  const metadata = issue.metadata?.organism as { id: string } | undefined;
  if (!metadata) {
    return null;
  }

  const organism = STANDARD_ORGANISMS.find((o) => o.id === metadata.id);
  return organism || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a routing decision against expected model.
 */
export function validateRouting(
  organism: ModelOrganism,
  actualModel: 'haiku' | 'sonnet' | 'opus'
): boolean {
  // Exact match is always correct
  if (actualModel === organism.expectedModel) {
    return true;
  }

  // Escalation from expected model is acceptable
  // e.g., if we expected Haiku but used Sonnet, that's ok (conservative)
  const modelRank = { haiku: 0, sonnet: 1, opus: 2 };
  const actualRank = modelRank[actualModel];
  const expectedRank = modelRank[organism.expectedModel];

  // Using a more powerful model than expected is acceptable (escalation)
  return actualRank > expectedRank;
}

/**
 * Calculate routing metrics from validation results.
 */
export function calculateRoutingMetrics(validations: OrganismValidation[]): RoutingMetrics {
  if (validations.length === 0) {
    return {
      total: 0,
      routingAccuracy: 0,
      successRate: 0,
      avgCost: 0,
      costByComplexity: {
        trivial: 0,
        simple: 0,
        standard: 0,
        complex: 0,
      },
      successByModel: {
        haiku: 0,
        sonnet: 0,
        opus: 0,
      },
      escalationRate: 0,
    };
  }

  const total = validations.length;
  const routingCorrect = validations.filter((v) => v.routingCorrect).length;
  const succeeded = validations.filter((v) => v.taskSucceeded).length;
  const totalCost = validations.reduce((sum, v) => sum + v.costUsd, 0);
  const escalated = validations.filter((v) => v.escalated).length;

  // Cost by complexity
  const costByComplexity: Record<OrganismComplexity, number> = {
    trivial: 0,
    simple: 0,
    standard: 0,
    complex: 0,
  };

  for (const validation of validations) {
    const complexity = validation.organism.knownComplexity;
    costByComplexity[complexity] += validation.costUsd;
  }

  // Average cost by complexity
  for (const complexity of Object.keys(costByComplexity) as OrganismComplexity[]) {
    const count = validations.filter((v) => v.organism.knownComplexity === complexity).length;
    if (count > 0) {
      costByComplexity[complexity] /= count;
    }
  }

  // Success rate by model
  const successByModel: Record<'haiku' | 'sonnet' | 'opus', number> = {
    haiku: 0,
    sonnet: 0,
    opus: 0,
  };

  for (const model of ['haiku', 'sonnet', 'opus'] as const) {
    const modelValidations = validations.filter((v) => v.actualModel === model);
    if (modelValidations.length > 0) {
      const modelSuccesses = modelValidations.filter((v) => v.taskSucceeded).length;
      successByModel[model] = modelSuccesses / modelValidations.length;
    }
  }

  return {
    total,
    routingAccuracy: routingCorrect / total,
    successRate: succeeded / total,
    avgCost: totalCost / total,
    costByComplexity,
    successByModel,
    escalationRate: escalated / total,
  };
}

/**
 * Format routing metrics for display.
 */
export function formatRoutingMetrics(metrics: RoutingMetrics): string {
  const lines: string[] = [];

  lines.push('┌─────────────────────────────────────────────────────────────┐');
  lines.push('│  MODEL ROUTING VALIDATION RESULTS                           │');
  lines.push('├─────────────────────────────────────────────────────────────┤');

  lines.push(`│  Total organisms: ${metrics.total}`.padEnd(60) + '│');
  lines.push(`│  Routing accuracy: ${(metrics.routingAccuracy * 100).toFixed(1)}%`.padEnd(60) + '│');
  lines.push(`│  Task success rate: ${(metrics.successRate * 100).toFixed(1)}%`.padEnd(60) + '│');
  lines.push(`│  Average cost: $${metrics.avgCost.toFixed(3)}`.padEnd(60) + '│');
  lines.push(`│  Escalation rate: ${(metrics.escalationRate * 100).toFixed(1)}%`.padEnd(60) + '│');

  lines.push('├─────────────────────────────────────────────────────────────┤');
  lines.push('│  Cost by Complexity:                                        │');
  for (const [complexity, cost] of Object.entries(metrics.costByComplexity)) {
    lines.push(`│    ${complexity.padEnd(10)}: $${cost.toFixed(3)}`.padEnd(60) + '│');
  }

  lines.push('├─────────────────────────────────────────────────────────────┤');
  lines.push('│  Success Rate by Model:                                     │');
  for (const [model, rate] of Object.entries(metrics.successByModel)) {
    lines.push(`│    ${model.padEnd(10)}: ${(rate * 100).toFixed(1)}%`.padEnd(60) + '│');
  }

  lines.push('└─────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}

/**
 * Create a validation suite from standard organisms.
 */
export function createStandardSuite(): OrganismSuite {
  return {
    name: 'Standard Routing Validation',
    organisms: STANDARD_ORGANISMS,
    validations: [],
  };
}

/**
 * Create a minimal validation suite for quick testing.
 */
export function createMinimalSuite(): OrganismSuite {
  return {
    name: 'Minimal Routing Validation',
    organisms: [
      STANDARD_ORGANISMS.find((o) => o.id === 'org-trivial-typo')!,
      STANDARD_ORGANISMS.find((o) => o.id === 'org-simple-endpoint')!,
      STANDARD_ORGANISMS.find((o) => o.id === 'org-standard-auth')!,
      STANDARD_ORGANISMS.find((o) => o.id === 'org-complex-architecture')!,
    ],
    validations: [],
  };
}
