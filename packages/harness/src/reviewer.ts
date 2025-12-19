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
  ReviewContext,
  ReviewResult,
  ReviewFinding,
  ReviewOutcome,
  FindingSeverity,
} from './types.js';
import { getPromptForReviewer } from './reviewer-prompts.js';
import { parseModelFromOutput } from './model-detector.js';

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

  contextLines.push('## Git Diff');
  contextLines.push('```diff');
  // Truncate diff to avoid context overflow (50k chars max)
  const truncatedDiff = context.gitDiff.slice(0, 50000);
  contextLines.push(truncatedDiff);
  if (context.gitDiff.length > 50000) {
    contextLines.push('... (diff truncated)');
  }
  contextLines.push('```');
  contextLines.push('');

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
  options: { cwd: string; timeoutMs: number }
): Promise<ReviewResult> {
  const startTime = Date.now();

  const prompt = generateReviewPrompt(config, context);
  const promptFile = join(tmpdir(), `review-${config.id}-${Date.now()}.md`);

  try {
    await writeFile(promptFile, prompt, 'utf-8');

    console.log(`    [${config.id}] Prompt written (${prompt.length} chars)`);

    const result = await executeReviewerSession(promptFile, {
      cwd: options.cwd,
      timeout: options.timeoutMs,
    });

    const parsed = parseReviewResult(config, result, Date.now() - startTime);

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
  options: { cwd: string; timeout: number }
): Promise<ReviewerSessionResult> {
  return new Promise(async (resolve) => {
    const promptContent = await readFile(promptFile, 'utf-8');

    const args = ['-p', '--dangerously-skip-permissions', '--output-format', 'json'];

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
 */
function parseReviewResult(
  config: ReviewerConfig,
  result: ReviewerSessionResult,
  durationMs: number
): ReviewResult {
  try {
    // Try to extract JSON from the output
    // Look for JSON object with "outcome" field
    const jsonMatch = result.output.match(/\{[\s\S]*?"outcome"[\s\S]*?\}/);
    if (!jsonMatch) {
      // Try to find any JSON-like structure
      const anyJsonMatch = result.output.match(/\{[\s\S]*\}/);
      if (!anyJsonMatch) {
        throw new Error('No JSON found in reviewer output');
      }
      // Try parsing it anyway
      const parsed = JSON.parse(anyJsonMatch[0]);
      return buildReviewResult(config, parsed, durationMs);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return buildReviewResult(config, parsed, durationMs);
  } catch (error) {
    // If parsing fails, try to extract meaning from text
    return {
      reviewerId: config.id,
      reviewerType: config.type,
      outcome: 'error',
      findings: [],
      summary: `Failed to parse reviewer output: ${(error as Error).message}`,
      confidence: 0,
      durationMs,
      error: (error as Error).message,
    };
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
  const outcome = validateOutcome(parsed.outcome as string);
  const findings = parseFndings(config.id, parsed.findings as unknown[]);

  return {
    reviewerId: config.id,
    reviewerType: config.type,
    outcome,
    findings,
    summary: (parsed.summary as string) || 'No summary provided',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
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
function parseFndings(reviewerId: string, findings: unknown[]): ReviewFinding[] {
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
