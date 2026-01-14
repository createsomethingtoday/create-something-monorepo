/**
 * @create-something/orchestration
 *
 * Postmortem analyzer - extracts root cause and generates prevention rules.
 *
 * Philosophy: Every incident is a learning opportunity. The analyzer examines
 * the incident context, identifies the root cause, and generates prevention
 * rules that can be applied to .claude/rules/ files.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import type {
  Postmortem,
  RootCause,
  RootCauseCategory,
  Impact,
  TimelineEvent,
  PreventionRule,
  PostmortemConfig,
  DEFAULT_POSTMORTEM_CONFIG,
} from './types.js';
import { getIssue } from '../integration/beads.js';
import { listCheckpoints } from '../checkpoint/store.js';

const execAsync = promisify(exec);

/**
 * Create a new postmortem from an issue.
 */
export async function createPostmortem(
  issueId: string,
  config: PostmortemConfig = DEFAULT_POSTMORTEM_CONFIG,
  cwd: string = process.cwd()
): Promise<Postmortem> {
  // Get issue details
  const issue = await getIssue(issueId);

  if (!issue) {
    throw new Error(`Issue not found: ${issueId}`);
  }

  // Create initial postmortem
  const postmortem: Postmortem = {
    id: `pm-${nanoid(10)}`,
    issueId,
    title: `Postmortem: ${issue.title}`,
    description: issue.description || issue.title,
    rootCause: {
      category: 'other',
      description: '',
      codePattern: null,
      files: [],
      contributingFactors: [],
      safeguardGaps: [],
    },
    impact: {
      severity: 'medium',
      usersAffected: null,
      durationMinutes: null,
      servicesAffected: [],
      dataImpact: null,
      financialImpact: null,
    },
    timeline: [
      {
        timestamp: new Date().toISOString(),
        event: 'Postmortem created',
        actor: 'system',
        type: 'investigation',
      },
    ],
    preventionRules: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    completedAt: null,
    analyst: 'agent',
  };

  return postmortem;
}

/**
 * Analyze root cause from issue and related data.
 */
export async function analyzeRootCause(
  postmortem: Postmortem,
  cwd: string = process.cwd()
): Promise<RootCause> {
  const issueId = postmortem.issueId;

  // Get issue details
  const issue = await getIssue(issueId);
  const description = issue?.description || postmortem.description;

  // Analyze the description and notes to identify root cause
  const category = inferCategory(description);
  const codePattern = extractCodePattern(description);
  const files = extractFiles(description);
  const contributingFactors = extractContributingFactors(description);
  const safeguardGaps = identifySafeguardGaps(description, category);

  return {
    category,
    description: summarizeRootCause(description, category),
    codePattern,
    files,
    contributingFactors,
    safeguardGaps,
  };
}

/**
 * Generate prevention rules from root cause analysis.
 */
export function generatePreventionRules(
  postmortem: Postmortem,
  config: PostmortemConfig
): PreventionRule[] {
  const rules: PreventionRule[] = [];
  const rootCause = postmortem.rootCause;

  // Generate rules based on category
  switch (rootCause.category) {
    case 'missing_validation':
      rules.push(createValidationRule(postmortem));
      break;
    case 'code_logic':
      rules.push(createLogicRule(postmortem));
      break;
    case 'security':
      rules.push(createSecurityRule(postmortem));
      break;
    case 'configuration':
      rules.push(createConfigRule(postmortem));
      break;
    case 'resource_exhaustion':
      rules.push(createResourceRule(postmortem));
      break;
    case 'deployment':
      rules.push(createDeploymentRule(postmortem));
      break;
    default:
      rules.push(createGenericRule(postmortem));
  }

  // Add code pattern-specific rule if we have one
  if (rootCause.codePattern) {
    rules.push(createPatternRule(postmortem));
  }

  // Filter by confidence
  return rules.filter((r) => r.confidence >= config.minConfidence);
}

/**
 * Infer root cause category from description.
 */
function inferCategory(description: string): RootCauseCategory {
  const lower = description.toLowerCase();

  if (lower.includes('validation') || lower.includes('invalid') || lower.includes('sanitize')) {
    return 'missing_validation';
  }
  if (lower.includes('security') || lower.includes('auth') || lower.includes('permission') || lower.includes('injection')) {
    return 'security';
  }
  if (lower.includes('race') || lower.includes('concurrent') || lower.includes('deadlock')) {
    return 'race_condition';
  }
  if (lower.includes('memory') || lower.includes('limit') || lower.includes('timeout') || lower.includes('quota')) {
    return 'resource_exhaustion';
  }
  if (lower.includes('config') || lower.includes('environment') || lower.includes('setting')) {
    return 'configuration';
  }
  if (lower.includes('deploy') || lower.includes('infrastructure') || lower.includes('build')) {
    return 'deployment';
  }
  if (lower.includes('dependency') || lower.includes('external') || lower.includes('api')) {
    return 'dependency';
  }
  if (lower.includes('bug') || lower.includes('logic') || lower.includes('incorrect')) {
    return 'code_logic';
  }

  return 'other';
}

/**
 * Extract code pattern from description.
 */
function extractCodePattern(description: string): string | null {
  // Look for code blocks or patterns mentioned
  const codeBlockMatch = description.match(/```[\s\S]*?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[0].replace(/```\w*\n?/g, '').trim();
  }

  // Look for inline code
  const inlineMatch = description.match(/`([^`]+)`/);
  if (inlineMatch) {
    return inlineMatch[1];
  }

  // Look for common patterns
  const patterns = [
    /SELECT \* FROM \w+ (?!.*LIMIT)/i,
    /eval\s*\(/i,
    /innerHTML\s*=/i,
    /password.*=.*['"][^'"]+['"]/i,
    /api[_-]?key.*=.*['"][^'"]+['"]/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Extract file paths from description.
 */
function extractFiles(description: string): string[] {
  const files: string[] = [];

  // Match file paths
  const pathPattern = /(?:^|\s)([\w\-./]+\.(?:ts|js|svelte|md|json|yaml|yml|sql|py))/g;
  let match;
  while ((match = pathPattern.exec(description)) !== null) {
    files.push(match[1]);
  }

  return [...new Set(files)];
}

/**
 * Extract contributing factors.
 */
function extractContributingFactors(description: string): string[] {
  const factors: string[] = [];
  const lower = description.toLowerCase();

  // Common contributing factors
  const factorPatterns: [RegExp, string][] = [
    [/time pressure|deadline|rush/i, 'Time pressure'],
    [/missing test|no test|untested/i, 'Missing test coverage'],
    [/unclear requirement|ambiguous/i, 'Unclear requirements'],
    [/legacy code|technical debt/i, 'Technical debt'],
    [/manual process|not automated/i, 'Lack of automation'],
    [/no review|skipped review/i, 'Skipped code review'],
    [/documentation.*missing|no doc/i, 'Missing documentation'],
  ];

  for (const [pattern, factor] of factorPatterns) {
    if (pattern.test(description)) {
      factors.push(factor);
    }
  }

  return factors;
}

/**
 * Identify what safeguards should have caught this.
 */
function identifySafeguardGaps(description: string, category: RootCauseCategory): string[] {
  const gaps: string[] = [];

  switch (category) {
    case 'missing_validation':
      gaps.push('Input validation checks in code review');
      gaps.push('Type checking or schema validation');
      break;
    case 'security':
      gaps.push('Security review in peer review pipeline');
      gaps.push('Security scanning in CI/CD');
      break;
    case 'code_logic':
      gaps.push('Unit test coverage');
      gaps.push('Edge case testing');
      break;
    case 'configuration':
      gaps.push('Configuration validation');
      gaps.push('Environment parity checks');
      break;
    case 'resource_exhaustion':
      gaps.push('Load testing');
      gaps.push('Resource monitoring');
      break;
    case 'deployment':
      gaps.push('Deployment verification');
      gaps.push('Rollback automation');
      break;
  }

  return gaps;
}

/**
 * Summarize root cause.
 */
function summarizeRootCause(description: string, category: RootCauseCategory): string {
  const categoryLabels: Record<RootCauseCategory, string> = {
    code_logic: 'A logic error in the code',
    missing_validation: 'Missing input validation',
    race_condition: 'A race condition or concurrency issue',
    resource_exhaustion: 'Resource exhaustion (memory, connections, etc.)',
    configuration: 'A configuration error',
    dependency: 'An external dependency failure',
    security: 'A security vulnerability',
    deployment: 'A deployment or infrastructure issue',
    documentation: 'Missing or incorrect documentation',
    communication: 'A communication failure',
    other: 'An unclassified issue',
  };

  return `${categoryLabels[category]} caused this incident. ${description.slice(0, 200)}...`;
}

/**
 * Create a validation rule.
 */
function createValidationRule(postmortem: Postmortem): PreventionRule {
  const targetFile = inferRuleFile(postmortem.rootCause.files);

  return {
    id: `rule-${nanoid(8)}`,
    title: `Validate input: ${postmortem.title}`,
    pattern: 'User input used without validation',
    action: 'Ensure all user input is validated before use. Check for null, type, length, format.',
    badExample: postmortem.rootCause.codePattern,
    goodExample: null,
    targetRuleFile: targetFile,
    applied: false,
    confidence: 0.85,
  };
}

/**
 * Create a logic rule.
 */
function createLogicRule(postmortem: Postmortem): PreventionRule {
  const targetFile = inferRuleFile(postmortem.rootCause.files);

  return {
    id: `rule-${nanoid(8)}`,
    title: `Logic fix: ${postmortem.title}`,
    pattern: postmortem.rootCause.codePattern || 'Logic error pattern',
    action: 'Add test coverage for this edge case. Consider boundary conditions.',
    badExample: postmortem.rootCause.codePattern,
    goodExample: null,
    targetRuleFile: targetFile,
    applied: false,
    confidence: 0.75,
  };
}

/**
 * Create a security rule.
 */
function createSecurityRule(postmortem: Postmortem): PreventionRule {
  return {
    id: `rule-${nanoid(8)}`,
    title: `Security: ${postmortem.title}`,
    pattern: postmortem.rootCause.codePattern || 'Security vulnerability pattern',
    action: 'Flag this pattern in security review. Never allow without explicit justification.',
    badExample: postmortem.rootCause.codePattern,
    goodExample: null,
    targetRuleFile: 'error-handling-patterns.md',
    applied: false,
    confidence: 0.9,
  };
}

/**
 * Create a config rule.
 */
function createConfigRule(postmortem: Postmortem): PreventionRule {
  return {
    id: `rule-${nanoid(8)}`,
    title: `Config: ${postmortem.title}`,
    pattern: 'Configuration issue',
    action: 'Verify configuration in all environments. Add environment-specific tests.',
    badExample: postmortem.rootCause.codePattern,
    goodExample: null,
    targetRuleFile: 'cloudflare-patterns.md',
    applied: false,
    confidence: 0.8,
  };
}

/**
 * Create a resource rule.
 */
function createResourceRule(postmortem: Postmortem): PreventionRule {
  return {
    id: `rule-${nanoid(8)}`,
    title: `Resource: ${postmortem.title}`,
    pattern: 'Unbounded resource usage',
    action: 'Add limits and pagination. Monitor resource usage.',
    badExample: postmortem.rootCause.codePattern,
    goodExample: null,
    targetRuleFile: 'cloudflare-patterns.md',
    applied: false,
    confidence: 0.85,
  };
}

/**
 * Create a deployment rule.
 */
function createDeploymentRule(postmortem: Postmortem): PreventionRule {
  return {
    id: `rule-${nanoid(8)}`,
    title: `Deployment: ${postmortem.title}`,
    pattern: 'Deployment issue',
    action: 'Add deployment verification step. Ensure rollback plan exists.',
    badExample: null,
    goodExample: null,
    targetRuleFile: 'cloudflare-patterns.md',
    applied: false,
    confidence: 0.75,
  };
}

/**
 * Create a generic rule.
 */
function createGenericRule(postmortem: Postmortem): PreventionRule {
  const targetFile = inferRuleFile(postmortem.rootCause.files);

  return {
    id: `rule-${nanoid(8)}`,
    title: `Prevention: ${postmortem.title}`,
    pattern: postmortem.rootCause.codePattern || postmortem.rootCause.description,
    action: `Prevent: ${postmortem.rootCause.description.slice(0, 100)}`,
    badExample: postmortem.rootCause.codePattern,
    goodExample: null,
    targetRuleFile: targetFile,
    applied: false,
    confidence: 0.7,
  };
}

/**
 * Create a pattern-specific rule.
 */
function createPatternRule(postmortem: Postmortem): PreventionRule {
  const targetFile = inferRuleFile(postmortem.rootCause.files);

  return {
    id: `rule-${nanoid(8)}`,
    title: `Pattern: ${postmortem.rootCause.codePattern?.slice(0, 30)}...`,
    pattern: postmortem.rootCause.codePattern!,
    action: 'This pattern caused an incident. Flag for review.',
    badExample: postmortem.rootCause.codePattern,
    goodExample: null,
    targetRuleFile: targetFile,
    applied: false,
    confidence: 0.9,
  };
}

/**
 * Infer rule file from files involved.
 */
function inferRuleFile(files: string[]): string {
  for (const file of files) {
    if (file.includes('cloudflare') || file.includes('worker') || file.includes('d1') || file.includes('kv')) {
      return 'cloudflare-patterns.md';
    }
    if (file.includes('route') || file.includes('+page') || file.includes('+server') || file.includes('svelte')) {
      return 'sveltekit-conventions.md';
    }
    if (file.includes('.css') || file.includes('style')) {
      return 'css-canon.md';
    }
  }

  return 'error-handling-patterns.md';
}
