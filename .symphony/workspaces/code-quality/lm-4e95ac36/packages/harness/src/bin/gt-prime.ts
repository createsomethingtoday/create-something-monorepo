#!/usr/bin/env node

/**
 * @create-something/harness
 *
 * gt-prime: Context recovery for mid-session restoration.
 * Upstream pattern from Gas Town v0.2.2+.
 *
 * Philosophy: When an agent loses context mid-session (crash, context overflow,
 * or just confusion), gt-prime recovers the working state without starting over.
 *
 * Usage:
 *   gt-prime                    # Recover context for current directory
 *   gt-prime --issue cs-abc123  # Recover context for specific issue
 *   gt-prime --inject           # Also inject pending mail
 *   gt-prime --verbose          # Show detailed recovery info
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface HookState {
  issueId: string | null;
  convoyId: string | null;
  status: 'idle' | 'working' | 'blocked' | 'completed';
  lastActivity: string | null;
}

interface RecoveryContext {
  hook: HookState;
  recentCommits: string[];
  modifiedFiles: string[];
  pendingMail: string[];
  checkpointBrief: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Gathering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the current hook state.
 */
function readHookState(cwd: string): HookState {
  const hookFiles = [
    join(cwd, '.gastown', 'hook.json'),
    join(cwd, '.orchestration', 'hook.json'),
    join(cwd, 'deacon', 'state.json'),
  ];

  for (const hookFile of hookFiles) {
    if (existsSync(hookFile)) {
      try {
        const content = readFileSync(hookFile, 'utf-8');
        const state = JSON.parse(content);
        return {
          issueId: state.issueId ?? state.currentIssue ?? null,
          convoyId: state.convoyId ?? state.convoId ?? null,
          status: state.status ?? 'idle',
          lastActivity: state.lastActivity ?? state.updated_at ?? null,
        };
      } catch {
        // Continue to next file
      }
    }
  }

  return {
    issueId: null,
    convoyId: null,
    status: 'idle',
    lastActivity: null,
  };
}

/**
 * Get recent git commits.
 */
function getRecentCommits(cwd: string, count: number = 5): string[] {
  try {
    const output = execSync(
      `git log --oneline -${count} --no-decorate 2>/dev/null`,
      { cwd, encoding: 'utf-8' }
    );
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get modified files.
 */
function getModifiedFiles(cwd: string): string[] {
  try {
    const output = execSync(
      'git status --porcelain 2>/dev/null',
      { cwd, encoding: 'utf-8' }
    );
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => line.slice(3));
  } catch {
    return [];
  }
}

/**
 * Get pending mail messages.
 */
function getPendingMail(cwd: string): string[] {
  const mailDirs = [
    join(cwd, '.gastown', 'mail', 'inbox'),
    join(cwd, '.orchestration', 'mail'),
    join(cwd, 'mail', 'inbox'),
  ];

  const messages: string[] = [];

  for (const mailDir of mailDirs) {
    if (existsSync(mailDir)) {
      try {
        const files = readdirSync(mailDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const content = readFileSync(join(mailDir, file), 'utf-8');
            const msg = JSON.parse(content);
            messages.push(`[${msg.type ?? 'MSG'}] ${msg.subject ?? msg.message ?? file}`);
          } catch {
            // Skip malformed messages
          }
        }
      } catch {
        // Continue to next directory
      }
    }
  }

  return messages;
}

/**
 * Read the latest checkpoint brief if available.
 */
function getCheckpointBrief(cwd: string): string | null {
  const checkpointDirs = [
    join(cwd, '.orchestration', 'checkpoints'),
    join(cwd, '.gastown', 'checkpoints'),
  ];

  for (const checkpointDir of checkpointDirs) {
    if (existsSync(checkpointDir)) {
      try {
        const files = readdirSync(checkpointDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse();

        if (files.length > 0) {
          const latestFile = join(checkpointDir, files[0]);
          const content = readFileSync(latestFile, 'utf-8');
          const checkpoint = JSON.parse(content);
          
          if (checkpoint.summary) {
            return checkpoint.summary;
          }
          if (checkpoint.agentNotes) {
            return checkpoint.agentNotes;
          }
        }
      } catch {
        // Continue to next directory
      }
    }
  }

  return null;
}

/**
 * Read current issue details from Beads.
 */
function getIssueDetails(issueId: string, cwd: string): { title: string; description: string } | null {
  const beadsPaths = [
    join(cwd, '.beads', 'issues.jsonl'),
    join(cwd, 'csm', '.beads', 'issues.jsonl'),
  ];

  for (const beadsPath of beadsPaths) {
    if (existsSync(beadsPath)) {
      try {
        const content = readFileSync(beadsPath, 'utf-8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const issue = JSON.parse(line);
            if (issue.id === issueId) {
              return {
                title: issue.title ?? 'Untitled',
                description: issue.description ?? '',
              };
            }
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Continue to next path
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Brief Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a recovery brief for the agent.
 */
function generateRecoveryBrief(context: RecoveryContext, cwd: string): string {
  const lines: string[] = [];

  lines.push('# Context Recovery Brief');
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push('');

  // Hook state
  lines.push('## Current State');
  if (context.hook.issueId) {
    const issue = getIssueDetails(context.hook.issueId, cwd);
    lines.push(`- **Issue**: ${context.hook.issueId}${issue ? ` - ${issue.title}` : ''}`);
    if (issue?.description) {
      lines.push(`- **Description**: ${issue.description.slice(0, 200)}${issue.description.length > 200 ? '...' : ''}`);
    }
  } else {
    lines.push('- **Issue**: None assigned');
  }
  if (context.hook.convoyId) {
    lines.push(`- **Convoy**: ${context.hook.convoyId}`);
  }
  lines.push(`- **Status**: ${context.hook.status}`);
  if (context.hook.lastActivity) {
    lines.push(`- **Last Activity**: ${context.hook.lastActivity}`);
  }
  lines.push('');

  // Modified files
  if (context.modifiedFiles.length > 0) {
    lines.push('## Modified Files');
    for (const file of context.modifiedFiles.slice(0, 10)) {
      lines.push(`- ${file}`);
    }
    if (context.modifiedFiles.length > 10) {
      lines.push(`- ... and ${context.modifiedFiles.length - 10} more`);
    }
    lines.push('');
  }

  // Recent commits
  if (context.recentCommits.length > 0) {
    lines.push('## Recent Commits');
    for (const commit of context.recentCommits) {
      lines.push(`- ${commit}`);
    }
    lines.push('');
  }

  // Pending mail
  if (context.pendingMail.length > 0) {
    lines.push('## Pending Mail');
    for (const msg of context.pendingMail) {
      lines.push(`- ${msg}`);
    }
    lines.push('');
  }

  // Checkpoint brief
  if (context.checkpointBrief) {
    lines.push('## Last Checkpoint');
    lines.push(context.checkpointBrief);
    lines.push('');
  }

  // Instructions
  lines.push('## Next Steps');
  if (context.hook.status === 'working') {
    lines.push('Continue the work in progress. Check modified files for current state.');
  } else if (context.hook.status === 'blocked') {
    lines.push('Check pending mail and blockers before continuing.');
  } else if (context.hook.issueId) {
    lines.push('Review the assigned issue and begin work.');
  } else {
    lines.push('Check mail for assignments or run `gt hook` to see current state.');
  }
  lines.push('');
  lines.push('---');
  lines.push('*Context recovered via gt-prime*');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();

  // Parse arguments
  const options = {
    issue: null as string | null,
    inject: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--issue' && args[i + 1]) {
      options.issue = args[++i];
    } else if (arg === '--inject') {
      options.inject = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  if (options.help) {
    console.log(`
gt-prime: Context recovery for mid-session restoration

Usage:
  gt-prime                    # Recover context for current directory
  gt-prime --issue cs-abc123  # Recover context for specific issue
  gt-prime --inject           # Also inject pending mail
  gt-prime --verbose          # Show detailed recovery info

What it does:
1. Reads current hook state (assigned work)
2. Gathers recent commits and modified files
3. Checks for pending mail
4. Reads latest checkpoint brief
5. Generates a recovery context for the agent

When to use:
- After a crash or context overflow
- When switching to a new session
- When confused about current state
- After returning from a break

Output:
- Prints a markdown-formatted recovery brief
- Can be piped to clipboard: gt-prime | pbcopy
`);
    process.exit(0);
  }

  // Gather context
  const hook = readHookState(cwd);
  
  // Override issue if specified
  if (options.issue) {
    hook.issueId = options.issue;
  }

  const context: RecoveryContext = {
    hook,
    recentCommits: getRecentCommits(cwd),
    modifiedFiles: getModifiedFiles(cwd),
    pendingMail: getPendingMail(cwd),
    checkpointBrief: getCheckpointBrief(cwd),
  };

  // Generate and print brief
  const brief = generateRecoveryBrief(context, cwd);

  if (options.verbose) {
    console.log('=== Recovery Context ===\n');
    console.log(`Hook State: ${JSON.stringify(context.hook, null, 2)}`);
    console.log(`Recent Commits: ${context.recentCommits.length}`);
    console.log(`Modified Files: ${context.modifiedFiles.length}`);
    console.log(`Pending Mail: ${context.pendingMail.length}`);
    console.log(`Has Checkpoint: ${context.checkpointBrief !== null}`);
    console.log('\n=== Recovery Brief ===\n');
  }

  console.log(brief);

  // Optionally inject mail
  if (options.inject && context.pendingMail.length > 0) {
    console.log('\n=== Injecting Mail ===\n');
    try {
      execSync('gt mail check --inject 2>/dev/null', { cwd, stdio: 'inherit' });
    } catch {
      console.error('Mail injection failed (gt mail not available)');
    }
  }

  // Nudge deacon if available
  if (options.verbose) {
    try {
      execSync('gt nudge deacon session-started 2>/dev/null', { cwd, stdio: 'inherit' });
    } catch {
      // Deacon not available, that's fine
    }
  }
}

main();
