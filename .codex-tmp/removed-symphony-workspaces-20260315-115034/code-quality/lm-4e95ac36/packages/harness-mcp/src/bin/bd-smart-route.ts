#!/usr/bin/env node

/**
 * bd-smart-route: Intelligently route Beads issues to Gemini or Claude
 *
 * Philosophy: Use the right tool for the job. Gemini Flash for trivial/simple tasks,
 * Claude Sonnet for complex work.
 *
 * Usage:
 *   bd-smart-route csm-abc123
 *   bd-smart-route csm-abc123 --dry-run
 *   bd-smart-route csm-abc123 --force-agent gemini-flash
 *
 * This command:
 * 1. Reads the Beads issue
 * 2. Analyzes complexity via labels and patterns
 * 3. Routes to optimal agent (Gemini Flash/Pro or Claude Sonnet/Opus)
 * 4. Executes the work with appropriate tooling
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  routeToAgent,
  formatRoutingDecision,
  calculateSavings,
  type Agent,
  type BeadsIssue,
  type RoutingDecision,
} from '../dual-agent-routing.js';
import { executeWithGeminiAPI } from './gemini-api-executor.js';

// ─────────────────────────────────────────────────────────────────────────────
// Beads Issue Reading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find monorepo root by looking for .beads directory
 */
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
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  // Fallback to cwd
  return process.cwd();
}

/**
 * Read a Beads issue from .beads/issues.jsonl
 */
function readBeadsIssue(issueId: string): BeadsIssue | null {
  const root = findMonorepoRoot();
  const beadsPath = join(root, '.beads', 'issues.jsonl');

  try {
    const content = readFileSync(beadsPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const issue = JSON.parse(line) as BeadsIssue;
        if (issue.id === issueId) {
          return issue;
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`Failed to read Beads issue ${issueId}:`, (error as Error).message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute work with Gemini API (direct)
 */
async function executeWithGemini(issue: BeadsIssue, agent: Agent): Promise<void> {
  const root = findMonorepoRoot();

  try {
    await executeWithGeminiAPI(issue.id, root);
  } catch (error) {
    console.error('\n❌ Gemini execution failed');
    process.exit(1);
  }
}

/**
 * Execute work with Claude Code (via harness)
 */
function executeWithClaude(issue: BeadsIssue, agent: Agent): void {
  const model = agent === 'claude-opus' ? 'opus' : agent === 'claude-haiku' ? 'haiku' : 'sonnet';

  console.log(`\n🤖 Executing with Claude Code...`);
  console.log(`Use harness to work on issue ${issue.id} with ${model}\n`);
  console.log(`Suggested command: bd work ${issue.id}\n`);
  console.log(`⚠️  Manual execution required - Claude Code integration pending`);
  console.log(`    This would call the harness workflow with appropriate model routing.\n`);

  // For now, just show the command
  // TODO: Integrate with harness workflow when available
  process.exit(0);
}

/**
 * Execute work based on routing decision
 */
async function executeWork(issue: BeadsIssue, decision: RoutingDecision): Promise<void> {
  if (decision.agent.startsWith('gemini')) {
    await executeWithGemini(issue, decision.agent);
  } else {
    executeWithClaude(issue, decision.agent);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
bd-smart-route: Intelligent dual-agent routing for Beads issues

Usage:
  bd-smart-route <issue-id> [options]

Options:
  --dry-run                  Show routing decision without executing
  --force-agent <agent>      Override routing logic
  -h, --help                 Show this help

Examples:
  bd-smart-route csm-abc123
  bd-smart-route csm-abc123 --dry-run
  bd-smart-route csm-abc123 --force-agent gemini-flash

Routing Logic:
  1. Explicit labels: agent:gemini-flash, agent:claude-sonnet, etc.
  2. Complexity labels: complexity:trivial → Gemini, complexity:complex → Opus
  3. Pattern matching: "typo" → Gemini, "architect" → Opus
  4. Default: Claude Sonnet (safe choice)

Agents:
  - gemini-flash:   ~$0.0003/task (trivial: typos, formatting)
  - gemini-pro:     ~$0.003/task  (simple: single-file edits)
  - claude-haiku:   ~$0.001/task  (simple with better reasoning)
  - claude-sonnet:  ~$0.01/task   (standard development)
  - claude-opus:    ~$0.10/task   (complex architecture)

Cost Savings: 70-97% on trivial/simple tasks vs Claude Sonnet
`);
    process.exit(0);
  }

  const issueId = args[0];
  const isDryRun = args.includes('--dry-run');
  const forceAgentIndex = args.indexOf('--force-agent');
  const forceAgent = forceAgentIndex !== -1 ? (args[forceAgentIndex + 1] as Agent) : null;

  // Read the Beads issue
  const issue = readBeadsIssue(issueId);

  if (!issue) {
    console.error(`❌ Issue ${issueId} not found in .beads/issues.jsonl`);
    console.error(`   Searched in: ${join(findMonorepoRoot(), '.beads')}`);
    process.exit(1);
  }

  // Route to optimal agent
  let decision: RoutingDecision;

  if (forceAgent) {
    decision = {
      agent: forceAgent,
      confidence: 1.0,
      rationale: `Forced via --force-agent ${forceAgent}`,
      strategy: 'explicit-label',
      estimatedCost: calculateSavings(forceAgent).actualCost,
    };
  } else {
    decision = routeToAgent(issue);
  }

  // Display routing information
  console.log(`\n📋 Issue: ${issue.id} - ${issue.title}`);
  console.log(`\n🎯 Routing Decision:`);
  console.log(formatRoutingDecision(decision));

  // Calculate savings
  const savings = calculateSavings(decision.agent);
  console.log(`\n💰 Cost Analysis:`);
  console.log(`   Actual cost: $${savings.actualCost.toFixed(4)}`);
  console.log(`   Sonnet cost: $${savings.sonnetCost.toFixed(4)}`);
  if (savings.savings > 0) {
    console.log(`   💚 Savings: $${savings.savings.toFixed(4)} (${savings.savingsPercent.toFixed(0)}%)`);
  } else if (savings.savings < 0) {
    console.log(`   ⚠️  Premium: $${Math.abs(savings.savings).toFixed(4)} (${Math.abs(savings.savingsPercent).toFixed(0)}% more for better quality)`);
  } else {
    console.log(`   → Break-even with Sonnet`);
  }

  // Dry run - stop here
  if (isDryRun) {
    console.log(`\n✅ Dry run complete - no work executed`);
    process.exit(0);
  }

  // Execute work
  await executeWork(issue, decision);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
