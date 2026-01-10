/**
 * Dual-Agent Routing: Intelligently route work to Gemini or Claude based on complexity.
 *
 * Philosophy: Right tool for the job. Use Gemini Flash for trivial/simple tasks,
 * Claude Sonnet for complex work requiring architectural decisions.
 *
 * Cost Optimization:
 * - Gemini Flash: ~$0.0003/task (trivial)
 * - Gemini Pro: ~$0.001-0.003/task (simple)
 * - Claude Haiku: ~$0.001/task (simple, better reasoning)
 * - Claude Sonnet: ~$0.01/task (standard development)
 * - Claude Opus: ~$0.10/task (complex architecture)
 *
 * Validated Savings: 70-97% cost reduction on trivial/simple tasks
 */

export type Agent = 'gemini-flash' | 'gemini-pro' | 'claude-haiku' | 'claude-sonnet' | 'claude-opus';
export type Complexity = 'trivial' | 'simple' | 'standard' | 'complex';

export interface RoutingDecision {
  agent: Agent;
  confidence: number; // 0-1
  rationale: string;
  strategy: 'explicit-label' | 'complexity-label' | 'pattern-match' | 'default';
  estimatedCost: number; // in USD
}

export interface BeadsIssue {
  id: string;
  title: string;
  description?: string;
  labels?: string[];
  status?: string;
  priority?: string;
}

/**
 * Main routing function: select optimal agent for a Beads issue
 */
export function routeToAgent(issue: BeadsIssue): RoutingDecision {
  // Strategy 1: Explicit agent label (highest priority)
  const explicitAgent = checkExplicitAgentLabel(issue);
  if (explicitAgent) {
    return explicitAgent;
  }

  // Strategy 2: Complexity label
  const complexityAgent = checkComplexityLabel(issue);
  if (complexityAgent) {
    return complexityAgent;
  }

  // Strategy 3: Pattern matching on title/description
  const patternAgent = checkPatternMatching(issue);
  if (patternAgent) {
    return patternAgent;
  }

  // Strategy 4: Default to Claude Sonnet (safe choice)
  return {
    agent: 'claude-sonnet',
    confidence: 0.6,
    rationale: 'No specific routing indicators, using safe default',
    strategy: 'default',
    estimatedCost: 0.01,
  };
}

/**
 * Strategy 1: Check for explicit agent:* labels
 *
 * Examples:
 * - agent:gemini-flash, agent:gemini, agent:flash
 * - agent:claude, agent:sonnet, agent:opus
 */
function checkExplicitAgentLabel(issue: BeadsIssue): RoutingDecision | null {
  const labels = issue.labels || [];
  const agentLabels = labels.filter((l) => l.startsWith('agent:') || l.startsWith('model:'));

  if (agentLabels.length === 0) return null;

  const label = agentLabels[0];
  const value = label.includes(':') ? label.split(':')[1] : '';

  // Map label values to agents
  const agentMap: Record<string, Agent> = {
    'gemini-flash': 'gemini-flash',
    'gemini-pro': 'gemini-pro',
    'gemini': 'gemini-flash', // Default Gemini to Flash
    'flash': 'gemini-flash',
    'pro': 'gemini-pro',
    'haiku': 'claude-haiku',
    'sonnet': 'claude-sonnet',
    'opus': 'claude-opus',
    'claude': 'claude-sonnet', // Default Claude to Sonnet
  };

  const agent = agentMap[value];
  if (!agent) return null;

  return {
    agent,
    confidence: 1.0,
    rationale: `Explicit agent label: ${label}`,
    strategy: 'explicit-label',
    estimatedCost: estimateCost(agent),
  };
}

/**
 * Strategy 2: Map complexity labels to agents
 *
 * Examples:
 * - complexity:trivial → gemini-flash
 * - complexity:simple → gemini-flash or gemini-pro
 * - complexity:standard → claude-sonnet
 * - complexity:complex → claude-opus
 */
function checkComplexityLabel(issue: BeadsIssue): RoutingDecision | null {
  const labels = issue.labels || [];
  const complexityLabels = labels.filter((l) => l.startsWith('complexity:'));

  if (complexityLabels.length === 0) return null;

  const complexity = complexityLabels[0].replace('complexity:', '') as Complexity;

  const complexityToAgent: Record<Complexity, Agent> = {
    trivial: 'gemini-flash',
    simple: 'gemini-flash', // Could also be gemini-pro, but Flash handles most
    standard: 'claude-sonnet',
    complex: 'claude-opus',
  };

  const agent = complexityToAgent[complexity] || 'claude-sonnet';

  return {
    agent,
    confidence: 0.9,
    rationale: `Complexity label: ${complexity} → ${agent}`,
    strategy: 'complexity-label',
    estimatedCost: estimateCost(agent),
  };
}

/**
 * Strategy 3: Pattern matching on issue title and description
 *
 * Trivial patterns → Gemini Flash:
 * - typo, fix typo, spelling
 * - rename, rename variable
 * - format, formatting, prettier
 * - lint, linting, eslint
 * - add semicolon, add comma
 * - remove unused, remove import
 *
 * Simple patterns → Gemini Flash/Pro:
 * - create function, add function
 * - add test, create test
 * - update component
 * - scaffold, generate
 *
 * Complex patterns → Claude Sonnet/Opus:
 * - design, architect, architecture
 * - security, auth, authentication
 * - refactor (multi-file)
 * - implement feature (vague)
 */
function checkPatternMatching(issue: BeadsIssue): RoutingDecision | null {
  const text = `${issue.title} ${issue.description || ''}`.toLowerCase();

  // Trivial patterns → Gemini Flash
  const trivialPatterns = [
    /\b(typo|spelling|fix typo)\b/,
    /\b(rename|renaming)\b/,
    /\b(format|formatting|prettier)\b/,
    /\b(lint|linting|eslint)\b/,
    /\b(semicolon|comma)\b/,
    /\b(remove unused|remove import)\b/,
    /\b(add console\.log|console\.log)\b/,
  ];

  for (const pattern of trivialPatterns) {
    if (pattern.test(text)) {
      return {
        agent: 'gemini-flash',
        confidence: 0.85,
        rationale: `Trivial pattern detected: ${pattern.source}`,
        strategy: 'pattern-match',
        estimatedCost: 0.0003,
      };
    }
  }

  // Simple patterns → Gemini Flash
  const simplePatterns = [
    /\b(create function|add function|add utility)\b/,
    /\b(add test|create test|test for)\b/,
    /\b(scaffold|generate|create endpoint)\b/,
    /\b(update component|modify component)\b/,
    /\b(add prop|add property)\b/,
  ];

  for (const pattern of simplePatterns) {
    if (pattern.test(text)) {
      return {
        agent: 'gemini-flash',
        confidence: 0.75,
        rationale: `Simple pattern detected: ${pattern.source}`,
        strategy: 'pattern-match',
        estimatedCost: 0.001,
      };
    }
  }

  // Complex patterns → Claude Opus
  const complexPatterns = [
    /\b(design|architect|architecture)\b/,
    /\b(security|auth|authentication|authorization)\b/,
    /\b(payment|stripe|billing)\b/,
    /\b(performance|optimize|optimization)\b/,
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(text)) {
      return {
        agent: 'claude-opus',
        confidence: 0.8,
        rationale: `Complex pattern detected: ${pattern.source}`,
        strategy: 'pattern-match',
        estimatedCost: 0.10,
      };
    }
  }

  // Standard patterns → Claude Sonnet
  const standardPatterns = [
    /\b(implement|implementation)\b/,
    /\b(refactor|refactoring)\b/,
    /\b(feature|add feature)\b/,
    /\b(api|endpoint)\b/,
  ];

  for (const pattern of standardPatterns) {
    if (pattern.test(text)) {
      return {
        agent: 'claude-sonnet',
        confidence: 0.7,
        rationale: `Standard pattern detected: ${pattern.source}`,
        strategy: 'pattern-match',
        estimatedCost: 0.01,
      };
    }
  }

  return null;
}

/**
 * Estimate cost per task based on agent
 */
function estimateCost(agent: Agent): number {
  const costs: Record<Agent, number> = {
    'gemini-flash': 0.0003,
    'gemini-pro': 0.003,
    'claude-haiku': 0.001,
    'claude-sonnet': 0.01,
    'claude-opus': 0.10,
  };

  return costs[agent];
}

/**
 * Format routing decision for display
 */
export function formatRoutingDecision(decision: RoutingDecision): string {
  const agentNames: Record<Agent, string> = {
    'gemini-flash': 'Gemini Flash',
    'gemini-pro': 'Gemini Pro',
    'claude-haiku': 'Claude Haiku',
    'claude-sonnet': 'Claude Sonnet',
    'claude-opus': 'Claude Opus',
  };

  return [
    `Agent: ${agentNames[decision.agent]}`,
    `Cost: ~$${decision.estimatedCost.toFixed(4)}`,
    `Confidence: ${(decision.confidence * 100).toFixed(0)}%`,
    `Strategy: ${decision.strategy}`,
    `Rationale: ${decision.rationale}`,
  ].join('\n');
}

/**
 * Calculate potential savings vs always using Claude Sonnet
 */
export function calculateSavings(actualAgent: Agent): {
  actualCost: number;
  sonnetCost: number;
  savings: number;
  savingsPercent: number;
} {
  const actualCost = estimateCost(actualAgent);
  const sonnetCost = 0.01; // Baseline

  const savings = sonnetCost - actualCost;
  const savingsPercent = (savings / sonnetCost) * 100;

  return {
    actualCost,
    sonnetCost,
    savings,
    savingsPercent,
  };
}
