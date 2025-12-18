/**
 * @create-something/harness
 *
 * Session Spawner: Runs Claude Code sessions with priming context.
 */

import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BeadsIssue, PrimingContext, SessionResult, SessionOutcome } from './types.js';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// DRY Context Discovery
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract meaningful keywords from an issue title.
 */
function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'add', 'update', 'create', 'implement', 'fix', 'use', 'make', 'get',
    'all', 'across', 'properties', 'audit', 'verify', 'check',
  ]);

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}

/**
 * Discover existing patterns and files relevant to an issue.
 * Helps agents avoid duplicating existing work (DRY enforcement).
 */
export async function discoverDryContext(
  issueTitle: string,
  cwd: string
): Promise<{ existingPatterns: string[]; relevantFiles: string[] }> {
  const existingPatterns: string[] = [];
  const relevantFiles: string[] = [];

  const keywords = extractKeywords(issueTitle);

  // Always include CLAUDE.md if it exists
  try {
    await execAsync('test -f CLAUDE.md', { cwd });
    relevantFiles.push('CLAUDE.md');
  } catch {
    // CLAUDE.md doesn't exist
  }

  // Include .claude/rules (max 3)
  try {
    const { stdout } = await execAsync('ls .claude/rules/*.md 2>/dev/null || true', { cwd });
    const rules = stdout.trim().split('\n').filter(Boolean);
    if (rules.length > 0) {
      relevantFiles.push(...rules.slice(0, 3));
      existingPatterns.push('Project rules exist in .claude/rules/ - read before implementing');
    }
  } catch {
    // No rules
  }

  // Search for files by keyword (max 10 files, 3 keywords)
  for (const keyword of keywords.slice(0, 3)) {
    try {
      const { stdout } = await execAsync(
        `find . -type f \\( -name "*.ts" -o -name "*.svelte" -o -name "*.css" \\) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" 2>/dev/null | xargs grep -l -i "${keyword}" 2>/dev/null | head -5`,
        { cwd }
      );
      for (const file of stdout.trim().split('\n').filter(Boolean)) {
        if (!relevantFiles.includes(file) && relevantFiles.length < 10) {
          relevantFiles.push(file);
        }
      }
    } catch {
      // No matches
    }
  }

  // Pattern hints based on issue content
  const lowerTitle = issueTitle.toLowerCase();

  if (lowerTitle.includes('component') || lowerTitle.includes('ui')) {
    existingPatterns.push('Check existing components in packages/components/src/lib/');
  }
  if (lowerTitle.includes('style') || lowerTitle.includes('css')) {
    existingPatterns.push('Use Canon tokens from packages/components/src/lib/styles/canon.css');
  }
  if (lowerTitle.includes('a11y') || lowerTitle.includes('accessibility') || lowerTitle.includes('keyboard')) {
    existingPatterns.push('Use shared a11y actions from packages/components/src/lib/actions/a11y.ts');
  }
  if (lowerTitle.includes('api') || lowerTitle.includes('endpoint')) {
    existingPatterns.push('Follow +server.ts patterns in existing routes');
  }
  if (lowerTitle.includes('focus') || lowerTitle.includes('skip')) {
    existingPatterns.push('Use .skip-to-content and .a11y-focus classes from canon.css');
  }

  return { existingPatterns, relevantFiles };
}

// ─────────────────────────────────────────────────────────────────────────────
// Priming Prompt Generation
// ─────────────────────────────────────────────────────────────────────────────

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

  // DRY Principles (static)
  lines.push('## DRY Principles');
  lines.push('');
  lines.push('Before writing code:');
  lines.push('1. **Read first** - ALWAYS read existing files before modifying or creating');
  lines.push('2. **Search for patterns** - Use Grep/Glob to find existing implementations');
  lines.push("3. **Reuse, don't recreate** - If a pattern exists, USE it");
  lines.push('4. **Edit over create** - Prefer editing existing files over new ones');
  lines.push('');

  // Existing patterns (dynamic)
  if (context.existingPatterns && context.existingPatterns.length > 0) {
    lines.push('## Existing Patterns to Reuse');
    for (const pattern of context.existingPatterns) {
      lines.push(`- ${pattern}`);
    }
    lines.push('');
  }

  // Relevant files (dynamic)
  if (context.relevantFiles && context.relevantFiles.length > 0) {
    lines.push('## Relevant Files to Reference');
    for (const file of context.relevantFiles) {
      lines.push(`- \`${file}\``);
    }
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
  return new Promise(async (resolve) => {
    // Read prompt content
    const { readFile } = await import('node:fs/promises');
    const promptContent = await readFile(promptFile, 'utf-8');

    // Pipe prompt via stdin: echo "prompt" | claude -p
    const args = [
      '-p',
      '--dangerously-skip-permissions',
      '--output-format', 'json',
    ];

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

    // Log that we've started (visible in harness output)
    console.log(`  [Session] Prompt sent (${promptContent.length} chars), waiting for response...`);

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
