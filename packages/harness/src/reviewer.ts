/**
 * @create-something/harness
 *
 * Reviewer: Runs peer review sessions using Claude Code.
 * Philosophy: Specialized reviewers analyze code for specific concerns.
 */

import { spawn } from 'node:child_process';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  ReviewerConfig,
  ReviewerDefinition,
  ReviewContext,
  ReviewResult,
  ReviewFinding,
  ReviewOutcome,
  FindingSeverity,
  ReviewerType,
} from './types.js';
import { getPromptForReviewer } from './reviewer-prompts.js';
import {
  getEffectiveModel,
  type FailureTracker,
} from './failure-handler.js';

// ─────────────────────────────────────────────────────────────────────────────
// Model Selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the appropriate model for a reviewer type.
 *
 * Philosophy: Different review types have different cognitive demands.
 * - Security: Pattern detection (vulnerabilities, secrets) → Haiku (fast, cheap)
 * - Architecture: Deep analysis (DRY, coupling, design) → Opus (thorough, expensive)
 * - Quality: Balanced review (conventions, tests) → Sonnet (middle ground)
 * - Custom: User-defined, default to Sonnet
 *
 * @param type - The reviewer type
 * @param override - Optional explicit model override from config
 */
export function getReviewerModel(
  type: ReviewerType,
  override?: 'haiku' | 'sonnet' | 'opus'
): 'haiku' | 'sonnet' | 'opus' {
  // Explicit override from config takes precedence
  if (override) {
    return override;
  }

  // Default routing based on reviewer type
  switch (type) {
    case 'security':
      return 'haiku'; // Pattern scanning for known vulnerabilities
    case 'architecture':
      return 'opus'; // Complex reasoning about system design
    case 'quality':
      return 'sonnet'; // Balanced review of conventions and tests
    case 'custom':
      return 'sonnet'; // Safe default for user-defined reviewers
    default:
      return 'sonnet';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a ReviewerDefinition from HarnessConfig to ReviewerConfig.
 * The `prompt` field from config (which may have been loaded from an external file)
 * becomes the `customPrompt` that overrides the default prompt.
 */
export function convertDefinitionToConfig(def: ReviewerDefinition): ReviewerConfig {
  return {
    id: def.id,
    type: def.type,
    enabled: def.enabled,
    canBlock: def.canBlock,
    customPrompt: def.prompt, // Loaded external prompt becomes customPrompt
    includePatterns: def.includePatterns,
    excludePatterns: def.excludePatterns,
    model: def.model, // Optional model override
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the full prompt for a reviewer session.
 */
export function generateReviewPrompt(
  config: ReviewerConfig,
  context: ReviewContext
): string {
  const basePrompt = getPromptForReviewer(config.type, config.customPrompt);

  // Build context section
  const contextLines: string[] = [];

  contextLines.push('## Files Changed');
  if (context.filesChanged.length > 0) {
    for (const file of context.filesChanged) {
      contextLines.push(`- ${file}`);
    }
  } else {
    contextLines.push('(No files changed)');
  }
  contextLines.push('');

  contextLines.push('## Git Diff (This Checkpoint)');
  contextLines.push('```diff');
  // Truncate diff to avoid context overflow (30k chars for checkpoint)
  const truncatedDiff = context.gitDiff.slice(0, 30000);
  contextLines.push(truncatedDiff);
  if (context.gitDiff.length > 30000) {
    contextLines.push('... (diff truncated)');
  }
  contextLines.push('```');
  contextLines.push('');

  // For architecture reviewer, include full harness diff for DRY detection
  if (config.type === 'architecture' && context.fullHarnessDiff) {
    contextLines.push('## Full Harness Diff (All Changes Since Branch Start)');
    contextLines.push('**IMPORTANT: Check this for DRY violations across all files modified in this harness run.**');
    contextLines.push('```diff');
    // Allocate 20k chars for full harness diff
    const truncatedFullDiff = context.fullHarnessDiff.slice(0, 20000);
    contextLines.push(truncatedFullDiff);
    if (context.fullHarnessDiff.length > 20000) {
      contextLines.push('... (full harness diff truncated)');
    }
    contextLines.push('```');
    contextLines.push('');
  }

  contextLines.push('## Completed Issues');
  if (context.completedIssues.length > 0) {
    for (const issue of context.completedIssues) {
      contextLines.push(`- ${issue.id}: ${issue.title}`);
    }
  } else {
    contextLines.push('(No issues completed)');
  }
  contextLines.push('');

  contextLines.push('## Checkpoint Summary');
  contextLines.push(context.checkpointSummary || '(No summary available)');

  const contextSection = contextLines.join('\n');

  return basePrompt.replace('{CONTEXT}', contextSection);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviewer Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a single reviewer session.
 */
export async function runReviewer(
  config: ReviewerConfig,
  context: ReviewContext,
  options: { cwd: string; timeoutMs: number; failureTracker?: FailureTracker }
): Promise<ReviewResult> {
  const startTime = Date.now();

  const prompt = generateReviewPrompt(config, context);
  const promptFile = join(tmpdir(), `review-${config.id}-${Date.now()}.md`);

  try {
    await writeFile(promptFile, prompt, 'utf-8');

    // Determine effective model (with escalation if failures exist)
    const heuristicModel = getReviewerModel(config.type, config.model);
    let model = heuristicModel;
    let escalated = false;

    if (options.failureTracker) {
      const escalation = getEffectiveModel(
        options.failureTracker,
        config.id, // Use reviewer ID as issue ID for tracking
        heuristicModel
      );
      model = escalation.model;
      escalated = escalation.escalated;

      if (escalated) {
        console.log(`    [${config.id}] 🔄 Model escalated: ${heuristicModel} → ${model}`);
        console.log(`    [${config.id}] Reason: ${escalation.reason}`);
      }
    }

    console.log(`    [${config.id}] Prompt written (${prompt.length} chars) → ${model}`);

    const result = await executeReviewerSession(
      promptFile,
      {
        cwd: options.cwd,
        timeout: options.timeoutMs,
      },
      config.type,
      model // Pass escalated model
    );

    const parsed = parseReviewResult(config, result, Date.now() - startTime);

    // Add model to result for tracking
    parsed.model = model;

    // Filter findings by minimum severity if configured
    if (config.minSeverity && parsed.findings.length > 0) {
      parsed.findings = filterFindingsBySeverity(parsed.findings, config.minSeverity);
    }

    return parsed;
  } catch (error) {
    return {
      reviewerId: config.id,
      reviewerType: config.type,
      outcome: 'error',
      findings: [],
      summary: `Reviewer error: ${(error as Error).message}`,
      confidence: 0,
      durationMs: Date.now() - startTime,
      error: (error as Error).message,
    };
  } finally {
    try {
      await unlink(promptFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

interface ReviewerSessionResult {
  exitCode: number;
  output: string;
  error: string | null;
}

/**
 * Execute Claude Code for review.
 */
async function executeReviewerSession(
  promptFile: string,
  options: { cwd: string; timeout: number },
  reviewerType: ReviewerType,
  model: 'opus' | 'sonnet' | 'haiku'
): Promise<ReviewerSessionResult> {
  return new Promise(async (resolve) => {
    const promptContent = await readFile(promptFile, 'utf-8');

    // Don't use --output-format json - we want the raw model output for parsing
    const args = ['-p', '--dangerously-skip-permissions', '--model', model];

    let output = '';
    let errorOutput = '';

    const proc = spawn('claude', args, {
      cwd: options.cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Write prompt to stdin and close it
    if (proc.stdin) {
      proc.stdin.write(promptContent);
      proc.stdin.end();
    } else {
      resolve({
        exitCode: -1,
        output: '',
        error: 'Failed to open stdin pipe',
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        exitCode: -1,
        output,
        error: 'Reviewer timed out',
      });
    }, options.timeout);

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: code || 0,
        output,
        error: code !== 0 ? errorOutput || `Exit code ${code}` : null,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: -1,
        output,
        error: err.message,
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse the raw output into a structured ReviewResult.
 * The model should output JSON directly based on the prompt instructions.
 */
function parseReviewResult(
  config: ReviewerConfig,
  result: ReviewerSessionResult,
  durationMs: number
): ReviewResult {
  // Check for session-level errors first
  if (result.error || result.exitCode !== 0) {
    const errorMsg = result.error || `Exit code ${result.exitCode}`;
    // If there's output despite error, try to parse it
    if (!result.output.trim()) {
      return {
        reviewerId: config.id,
        reviewerType: config.type,
        outcome: 'error',
        findings: [],
        summary: `Reviewer session failed: ${errorMsg}`,
        confidence: 0,
        durationMs,
        error: errorMsg,
      };
    }
  }

  // Check for empty output
  if (!result.output.trim()) {
    return {
      reviewerId: config.id,
      reviewerType: config.type,
      outcome: 'error',
      findings: [],
      summary: 'Reviewer produced no output',
      confidence: 0,
      durationMs,
      error: 'Empty output',
    };
  }

  try {
    // Try to extract JSON from the output
    const jsonContent = extractJsonFromOutput(result.output);
    if (!jsonContent) {
      throw new Error('No valid JSON found in reviewer output');
    }

    const parsed = JSON.parse(jsonContent);
    return buildReviewResult(config, parsed, durationMs);
  } catch (error) {
    // If parsing fails, return error result with output snippet for debugging
    const outputPreview = result.output.slice(0, 200).replace(/\n/g, ' ');
    return {
      reviewerId: config.id,
      reviewerType: config.type,
      outcome: 'error',
      findings: [],
      summary: `Failed to parse reviewer output: ${(error as Error).message}`,
      confidence: 0,
      durationMs,
      error: `${(error as Error).message} - Output preview: ${outputPreview}`,
    };
  }
}

/**
 * Extract JSON object from Claude output.
 * Handles code blocks, raw JSON, and mixed content.
 */
function extractJsonFromOutput(output: string): string | null {
  // Strategy 1: Try to find JSON in a code block (```json ... ```)
  const codeBlockMatch = output.match(/```json?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    const content = codeBlockMatch[1].trim();
    if (isValidJson(content)) {
      return content;
    }
  }

  // Strategy 2: Find JSON object with balanced braces
  const jsonContent = extractBalancedJson(output);
  if (jsonContent && isValidJson(jsonContent)) {
    return jsonContent;
  }

  // Strategy 3: Try the entire output if it looks like JSON
  const trimmed = output.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}') && isValidJson(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Extract a balanced JSON object from text.
 * Finds the first { and matches until balanced }.
 */
function extractBalancedJson(text: string): string | null {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(startIdx, i + 1);
        }
      }
    }
  }

  return null; // Unbalanced braces
}

/**
 * Quick JSON validation check.
 */
function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a ReviewResult from parsed JSON.
 */
function buildReviewResult(
  config: ReviewerConfig,
  parsed: Record<string, unknown>,
  durationMs: number
): ReviewResult {
  // Validate that we have minimum required fields
  if (!parsed || typeof parsed !== 'object') {
    return {
      reviewerId: config.id,
      reviewerType: config.type,
      outcome: 'error',
      findings: [],
      summary: 'Invalid JSON structure: not an object',
      confidence: 0,
      durationMs,
      error: 'Invalid JSON structure',
    };
  }

  const outcome = validateOutcome(parsed.outcome as string);
  const findings = parseFindings(config.id, parsed.findings as unknown[]);

  // Validate and normalize confidence (should be 0-1)
  let confidence: number;
  if (typeof parsed.confidence === 'number') {
    confidence = Math.max(0, Math.min(1, parsed.confidence));
  } else {
    // If no confidence provided, derive from outcome
    confidence = outcome === 'pass' ? 0.9 : outcome === 'pass_with_findings' ? 0.7 : outcome === 'fail' ? 0.6 : 0;
  }

  return {
    reviewerId: config.id,
    reviewerType: config.type,
    outcome,
    findings,
    summary: (parsed.summary as string) || 'No summary provided',
    confidence,
    durationMs,
  };
}

/**
 * Validate and normalize outcome.
 */
function validateOutcome(outcome: string | undefined): ReviewOutcome {
  const valid: ReviewOutcome[] = ['pass', 'pass_with_findings', 'fail', 'error'];
  if (outcome && valid.includes(outcome as ReviewOutcome)) {
    return outcome as ReviewOutcome;
  }
  return 'error';
}

/**
 * Parse findings array from JSON.
 */
function parseFindings(reviewerId: string, findings: unknown[]): ReviewFinding[] {
  if (!Array.isArray(findings)) return [];

  const results: ReviewFinding[] = [];

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    if (typeof f !== 'object' || f === null) continue;

    const finding = f as Record<string, unknown>;

    const result: ReviewFinding = {
      id: `${reviewerId}-${i}`,
      severity: validateSeverity(finding.severity as string),
      category: (finding.category as string) || 'general',
      title: (finding.title as string) || 'Untitled finding',
      description: (finding.description as string) || '',
    };

    // Only add optional properties if they have values
    if (typeof finding.file === 'string') {
      result.file = finding.file;
    }
    if (typeof finding.line === 'number') {
      result.line = finding.line;
    }
    if (typeof finding.suggestion === 'string') {
      result.suggestion = finding.suggestion;
    }

    results.push(result);
  }

  return results;
}

/**
 * Validate and normalize severity.
 */
function validateSeverity(severity: string | undefined): FindingSeverity {
  const valid: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
  if (severity && valid.includes(severity as FindingSeverity)) {
    return severity as FindingSeverity;
  }
  return 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter findings by minimum severity.
 */
export function filterFindingsBySeverity(
  findings: ReviewFinding[],
  minSeverity: FindingSeverity
): ReviewFinding[] {
  const severityOrder: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const minIndex = severityOrder.indexOf(minSeverity);

  return findings.filter((f) => severityOrder.indexOf(f.severity) <= minIndex);
}

/**
 * Get icon for review outcome.
 */
export function getOutcomeIcon(outcome: ReviewOutcome): string {
  switch (outcome) {
    case 'pass':
      return '✅';
    case 'pass_with_findings':
      return '⚠️';
    case 'fail':
      return '❌';
    case 'error':
      return '💥';
  }
}
