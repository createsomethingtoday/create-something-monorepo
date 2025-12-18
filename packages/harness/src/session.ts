/**
 * @create-something/harness
 *
 * Session Spawner: Runs Claude Code sessions with priming context.
 */

import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BeadsIssue, PrimingContext, SessionResult, SessionOutcome } from './types.js';

/**
 * Generate priming context for a session.
 */
export function generatePrimingPrompt(context: PrimingContext): string {
  const lines: string[] = [];

  lines.push('# Harness Session Context');
  lines.push('');
  lines.push('You are running in an automated harness. Complete the assigned task, commit your work, and exit cleanly.');
  lines.push('');

  // Current task
  lines.push('## Current Task');
  lines.push(`**Issue**: ${context.currentIssue.id} - ${context.currentIssue.title}`);
  lines.push(`**Priority**: P${context.currentIssue.priority}`);
  lines.push('');

  if (context.currentIssue.description) {
    lines.push('**Description**:');
    lines.push(context.currentIssue.description);
    lines.push('');
  }

  // Recent progress
  if (context.recentCommits.length > 0) {
    lines.push('## Recent Git Commits');
    for (const commit of context.recentCommits.slice(0, 5)) {
      lines.push(`- ${commit}`);
    }
    lines.push('');
  }

  // Last checkpoint
  if (context.lastCheckpoint) {
    lines.push('## Last Checkpoint Summary');
    lines.push(context.lastCheckpoint.summary);
    lines.push('');
  }

  // Redirect notes
  if (context.redirectNotes.length > 0) {
    lines.push('## Human Redirect Notes');
    for (const note of context.redirectNotes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // Session goal
  lines.push('## Session Goal');
  lines.push(context.sessionGoal);
  lines.push('');

  lines.push('## Instructions');
  lines.push('1. Complete the task described above');
  lines.push('2. Run relevant tests to verify your work');
  lines.push('3. Commit your changes with a clear message');
  lines.push('4. If blocked or unclear, document the issue and move on');
  lines.push('5. Do NOT wait for human input - work autonomously');
  lines.push('');

  lines.push('Begin working on the task now.');

  return lines.join('\n');
}

/**
 * Run a Claude Code session.
 */
export async function runSession(
  issue: BeadsIssue,
  context: PrimingContext,
  options: {
    cwd: string;
    maxTokens?: number;
    timeout?: number; // ms
    dryRun?: boolean;
  }
): Promise<SessionResult> {
  const startTime = Date.now();

  const prompt = generatePrimingPrompt(context);

  if (options.dryRun) {
    console.log('\n=== DRY RUN: Would run session with prompt ===');
    console.log(prompt);
    console.log('=== END DRY RUN ===\n');

    return {
      issueId: issue.id,
      outcome: 'success',
      summary: '[Dry run] Session would have executed',
      gitCommit: null,
      contextUsed: 0,
      durationMs: Date.now() - startTime,
      error: null,
    };
  }

  // Write prompt to temp file
  const promptFile = join(tmpdir(), `harness-prompt-${Date.now()}.md`);
  await writeFile(promptFile, prompt, 'utf-8');

  try {
    const result = await executeClaudeCode(promptFile, {
      cwd: options.cwd,
      timeout: options.timeout || 30 * 60 * 1000, // 30 min default
    });

    return {
      issueId: issue.id,
      outcome: determineOutcome(result),
      summary: extractSummary(result.output),
      gitCommit: extractGitCommit(result.output),
      contextUsed: result.tokensUsed || 0,
      durationMs: Date.now() - startTime,
      error: result.error || null,
    };
  } finally {
    // Clean up temp file
    try {
      await unlink(promptFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

interface ClaudeCodeResult {
  exitCode: number;
  output: string;
  error: string | null;
  tokensUsed?: number;
}

/**
 * Execute Claude Code CLI with the given prompt.
 */
async function executeClaudeCode(
  promptFile: string,
  options: { cwd: string; timeout: number }
): Promise<ClaudeCodeResult> {
  return new Promise((resolve) => {
    const args = [
      '--dangerously-skip-permissions', // Required for autonomous operation
      '--print', // Non-interactive mode
      '--output-format', 'json',
      '-p', `$(cat ${promptFile})`, // Pass prompt via file
    ];

    let output = '';
    let errorOutput = '';

    const proc = spawn('claude', args, {
      cwd: options.cwd,
      shell: true,
      env: { ...process.env },
    });

    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        exitCode: -1,
        output,
        error: 'Session timed out',
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

/**
 * Determine session outcome from Claude Code result.
 */
function determineOutcome(result: ClaudeCodeResult): SessionOutcome {
  if (result.error?.includes('context') || result.error?.includes('token')) {
    return 'context_overflow';
  }

  if (result.exitCode !== 0) {
    return 'failure';
  }

  // Check for partial completion indicators
  const lowerOutput = result.output.toLowerCase();
  if (
    lowerOutput.includes('blocked') ||
    lowerOutput.includes('unable to complete') ||
    lowerOutput.includes('need clarification')
  ) {
    return 'partial';
  }

  return 'success';
}

/**
 * Extract a summary from session output.
 */
function extractSummary(output: string): string {
  // Try to find a summary section in the output
  const summaryMatch = output.match(/##?\s*summary[:\s]*\n([\s\S]*?)(?=\n##|$)/i);
  if (summaryMatch) {
    return summaryMatch[1].trim().slice(0, 500);
  }

  // Fallback: use last meaningful lines
  const lines = output
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .slice(-5);

  return lines.join(' ').slice(0, 500) || 'Session completed';
}

/**
 * Extract git commit hash from session output.
 */
function extractGitCommit(output: string): string | null {
  // Look for commit hash patterns
  const commitMatch = output.match(/commit\s+([a-f0-9]{7,40})/i);
  if (commitMatch) {
    return commitMatch[1];
  }

  // Look for "Created commit" messages
  const createdMatch = output.match(/created commit[:\s]+([a-f0-9]{7,40})/i);
  if (createdMatch) {
    return createdMatch[1];
  }

  return null;
}

/**
 * Get recent git commits for context.
 */
export async function getRecentCommits(cwd: string, limit: number = 10): Promise<string[]> {
  return new Promise((resolve) => {
    const proc = spawn('git', ['log', '--oneline', `-${limit}`], {
      cwd,
      shell: false,
    });

    let output = '';

    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', () => {
      const commits = output
        .trim()
        .split('\n')
        .filter(Boolean);
      resolve(commits);
    });

    proc.on('error', () => {
      resolve([]);
    });
  });
}

/**
 * Create a git branch for the harness run.
 */
export async function createHarnessBranch(
  baseName: string,
  cwd: string
): Promise<string> {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const branchName = `harness/${baseName}-${timestamp}`;

  return new Promise((resolve, reject) => {
    const proc = spawn('git', ['checkout', '-b', branchName], {
      cwd,
      shell: false,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(branchName);
      } else {
        reject(new Error(`Failed to create branch ${branchName}`));
      }
    });

    proc.on('error', reject);
  });
}
