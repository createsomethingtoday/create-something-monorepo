#!/usr/bin/env node

/**
 * @create-something/harness
 *
 * Smart Sling: Intelligently route Gastown workers based on Beads labels.
 *
 * Philosophy: Reuse harness model routing logic for Gastown workers.
 * Maps Beads issue complexity to Gastown agent overrides:
 * - trivial/haiku → --agent claude --model haiku
 * - simple/standard/sonnet → --agent claude --model sonnet (default)
 * - complex/opus → --agent claude --model opus
 *
 * Usage:
 *   gt-smart-sling cs-abc123 csm
 *   gt-smart-sling cs-abc123 csm --force
 *
 * This wrapper:
 * 1. Reads the Beads issue
 * 2. Checks for model: or complexity: labels
 * 3. Maps to appropriate --agent override
 * 4. Calls gt sling with agent model selection
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  selectModel,
  formatRoutingDecision,
  type RoutingDecision,
} from '../model-routing.js';
import type { ClaudeModelFamily, BeadsIssue } from '../types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Note: Gastown v0.2.2 removed --quality flag, now uses --agent overrides

// ─────────────────────────────────────────────────────────────────────────────
// Beads Issue Reading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read a Beads issue from .beads/issues.jsonl
 */
function readBeadsIssue(issueId: string, cwd: string = process.cwd()): BeadsIssue | null {
  const beadsPath = join(cwd, '.beads', 'issues.jsonl');

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
        // Skip malformed lines
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
// Model Selection Logic (using model-routing.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map routing decision to Gastown agent override flags.
 * Gastown v0.2.2+ uses --agent claude --model <model> instead of --quality.
 */
function modelToAgentFlags(model: ClaudeModelFamily): string[] {
  // Map model to --agent claude --model <model> flags
  const modelName = model === 'unknown' ? 'sonnet' : model; // Default to Sonnet
  return ['--agent', 'claude', '--model', modelName];
}

/**
 * Select model and build agent flags using the harness model routing logic.
 */
function selectAgentFlags(issue: BeadsIssue): { agentFlags: string[]; decision: RoutingDecision } {
  const decision = selectModel(issue);
  const agentFlags = modelToAgentFlags(decision.model);

  return { agentFlags, decision };
}

/**
 * Format model for display.
 */
function formatModel(model: ClaudeModelFamily): string {
  const map: Record<ClaudeModelFamily, string> = {
    haiku: 'haiku (Haiku ~$0.001)',
    sonnet: 'sonnet (Sonnet ~$0.01)',
    opus: 'opus (Opus ~$0.10)',
    unknown: 'sonnet (Sonnet ~$0.01)',
  };
  return map[model] || 'sonnet (Sonnet ~$0.01)';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Smart Sling: Intelligent Gastown worker routing based on Beads labels

Usage:
  gt-smart-sling <issue-id> <target> [flags]

Examples:
  gt-smart-sling cs-abc123 csm
  gt-smart-sling cs-abc123 csm --force
  gt-smart-sling cs-abc123 csm --message "Focus on performance"

This wrapper:
1. Reads the Beads issue (${args[0] || 'ISSUE_ID'})
2. Checks for model: or complexity: labels
3. Maps to Gastown agent override:
   - trivial/haiku → --agent claude --model haiku (Haiku ~$0.001)
   - simple/standard/sonnet → --agent claude --model sonnet (Sonnet ~$0.01)
   - complex/opus → --agent claude --model opus (Opus ~$0.10)
4. Calls gt sling with appropriate agent model

Model Selection Priority:
1. Explicit labels (model:haiku, model:sonnet, model:opus)
2. Complexity labels (complexity:trivial, complexity:simple, etc.)
3. Pattern matching on title (rename→basic, architect→chrome)
4. Default (shiny)

Flags are passed through to gt sling:
  --force, --message, --create, --naked, etc.
`);
    process.exit(0);
  }

  const issueId = args[0];
  const target = args[1] || 'csm'; // Default to current rig
  const extraFlags = args.slice(2);

  // Read the Beads issue
  const issue = readBeadsIssue(issueId);

  if (!issue) {
    console.error(`❌ Issue ${issueId} not found in .beads/issues.jsonl`);
    process.exit(1);
  }

  // Select agent flags using model routing
  const { agentFlags, decision } = selectAgentFlags(issue);

  console.log(`📋 Issue: ${issue.id} - ${issue.title}`);
  console.log(`🎯 Model: ${formatModel(decision.model)}`);
  console.log(`🧠 Routing: ${decision.model} (${decision.strategy}, ${(decision.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`💡 Rationale: ${decision.rationale}`);
  console.log(`🚀 Target: ${target}`);

  // Build gt sling command
  // Note: Gastown v0.2.2+ uses --agent claude --model <model> instead of --quality
  // For backward compatibility with v0.1.x, we use --quality flag
  // When Gastown v0.2.2+ is installed, this will need to be updated
  const qualityMap: Record<ClaudeModelFamily, string> = {
    haiku: 'basic',
    sonnet: 'shiny',
    opus: 'chrome',
    unknown: 'shiny',
  };
  const quality = qualityMap[decision.model] || 'shiny';
  
  // Try --agent format first (v0.2.2+), fall back to --quality (v0.1.x)
  // For now, use --quality since most installations are v0.1.x
  const cmd = ['gt', 'sling', issueId, target, '--quality', quality, ...extraFlags];

  console.log(`\n$ ${cmd.join(' ')}\n`);

  // Execute gt sling
  try {
    execSync(cmd.join(' '), { stdio: 'inherit' });
  } catch (error) {
    console.error('\n❌ gt sling failed');
    process.exit(1);
  }
}

main();
