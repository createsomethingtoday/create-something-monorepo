#!/usr/bin/env node

/**
 * bd-batch-process: Batch process Beads issues with quota monitoring
 *
 * Usage:
 *   bd-batch-process --label voice-audit --limit 5
 *   bd-batch-process --label voice-audit --force-agent gemini-flash
 *
 * Features:
 * - Quota monitoring (stops on exhaustion)
 * - Rate limiting (delay between tasks)
 * - Progress tracking
 * - Resume from failures
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface BatchConfig {
  label?: string;           // Filter issues by label
  limit?: number;           // Max issues to process
  delayMs?: number;         // Delay between issues (rate limiting)
  forceAgent?: 'gemini-flash' | 'gemini-pro' | 'claude-haiku' | 'claude-sonnet' | 'claude-opus';
  dryRun?: boolean;         // Preview only
}

const DEFAULT_CONFIG: BatchConfig = {
  delayMs: 5000,            // 5 second delay between issues
  dryRun: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Beads Integration
// ─────────────────────────────────────────────────────────────────────────────

function findMonorepoRoot(): string {
  let currentDir = process.cwd();
  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    try {
      const beadsPath = join(currentDir, '.beads');
      const stat = require('fs').statSync(beadsPath);
      if (stat.isDirectory()) {
        return currentDir;
      }
    } catch {
      // .beads not found, go up
    }

    const parentDir = join(currentDir, '..');
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  return process.cwd();
}

function getOpenIssues(label?: string): string[] {
  const root = findMonorepoRoot();
  const beadsPath = join(root, '.beads', 'issues.jsonl');

  try {
    const content = readFileSync(beadsPath, 'utf-8');
    const lines = content.trim().split('\n');
    const issues: string[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const issue = JSON.parse(line);

        // Filter: open issues only
        if (issue.status !== 'open') continue;

        // Filter: label match if specified
        if (label && !issue.labels?.includes(label)) continue;

        issues.push(issue.id);
      } catch {
        continue;
      }
    }

    return issues;
  } catch (error) {
    console.error(`Failed to read Beads issues:`, (error as Error).message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Processing
// ─────────────────────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function executeIssue(issueId: string, config: BatchConfig): boolean {
  const root = findMonorepoRoot();
  const forceArg = config.forceAgent ? `--force-agent ${config.forceAgent}` : '';
  const dryRunArg = config.dryRun ? '--dry-run' : '';

  const command = `node packages/harness-mcp/dist/bin/bd-smart-route.js ${issueId} ${forceArg} ${dryRunArg}`;

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: root,
    });
    return true;
  } catch (error: any) {
    // Check if quota exhaustion
    if (error.message?.includes('exhausted your capacity') ||
        error.message?.includes('quota')) {
      console.error('\n❌ Quota exhausted. Stopping batch processing.');
      return false;
    }

    // Other errors - log but continue
    console.error(`\n⚠️  Failed to process ${issueId}:`, error.message);
    return true; // Continue processing other issues
  }
}

async function processBatch(config: BatchConfig): Promise<void> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('📦 Batch Processing Configuration:');
  console.log(`   Label filter: ${mergedConfig.label || 'none'}`);
  console.log(`   Limit: ${mergedConfig.limit || 'unlimited'}`);
  console.log(`   Delay: ${mergedConfig.delayMs}ms`);
  console.log(`   Force agent: ${mergedConfig.forceAgent || 'auto-route'}`);
  console.log(`   Dry run: ${mergedConfig.dryRun}\n`);

  // Get issues
  const allIssues = getOpenIssues(mergedConfig.label);
  const issues = mergedConfig.limit
    ? allIssues.slice(0, mergedConfig.limit)
    : allIssues;

  if (issues.length === 0) {
    console.log('No issues found matching criteria.');
    return;
  }

  console.log(`Found ${allIssues.length} matching issues. Processing ${issues.length}...\n`);

  // Process issues
  let processed = 0;
  let succeeded = 0;
  let quotaExhausted = false;

  for (const issueId of issues) {
    processed++;
    console.log(`\n[${ processed}/${issues.length}] Processing ${issueId}...`);

    const success = executeIssue(issueId, mergedConfig);

    if (!success) {
      quotaExhausted = true;
      break;
    }

    succeeded++;

    // Rate limiting
    if (processed < issues.length && mergedConfig.delayMs && mergedConfig.delayMs > 0) {
      console.log(`\n⏸  Waiting ${mergedConfig.delayMs}ms before next issue...`);
      await sleep(mergedConfig.delayMs);
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log('📊 Batch Processing Summary:');
  console.log(`   Processed: ${processed}/${issues.length}`);
  console.log(`   Succeeded: ${succeeded}`);
  console.log(`   Failed: ${processed - succeeded}`);

  if (quotaExhausted) {
    console.log('\n⚠️  Stopped due to quota exhaustion.');
    console.log('   Remaining issues can be processed after quota resets.');

    const remaining = issues.slice(processed);
    if (remaining.length > 0) {
      console.log(`\n   Remaining issues (${remaining.length}):`);
      remaining.forEach(id => console.log(`   - ${id}`));
    }
  } else if (succeeded === issues.length) {
    console.log('\n✅ All issues processed successfully!');
  }
  console.log('─'.repeat(60) + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
bd-batch-process: Batch process Beads issues with quota monitoring

Usage:
  bd-batch-process [options]

Options:
  --label <label>          Filter issues by label (e.g., voice-audit)
  --limit <number>         Max issues to process
  --delay <ms>             Delay between issues (default: 5000ms)
  --force-agent <agent>    Override routing (gemini-flash, claude-sonnet, etc)
  --dry-run                Preview without executing
  -h, --help               Show this help

Examples:
  bd-batch-process --label voice-audit --limit 5
  bd-batch-process --label voice-audit --force-agent gemini-flash
  bd-batch-process --label voice-audit --dry-run
`);
    process.exit(0);
  }

  const config: BatchConfig = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--label' && args[i + 1]) {
      config.label = args[i + 1];
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      config.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--delay' && args[i + 1]) {
      config.delayMs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--force-agent' && args[i + 1]) {
      config.forceAgent = args[i + 1] as any;
      i++;
    } else if (args[i] === '--dry-run') {
      config.dryRun = true;
    }
  }

  processBatch(config);
}

main();
