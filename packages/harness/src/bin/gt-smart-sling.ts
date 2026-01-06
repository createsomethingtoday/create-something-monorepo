#!/usr/bin/env node

/**
 * @create-something/harness
 *
 * Smart Sling: Intelligently route Gastown workers based on Beads labels.
 *
 * Philosophy: Reuse harness model routing logic for Gastown workers.
 * Maps Beads issue complexity to Gastown quality levels:
 * - trivial/haiku → --quality=basic
 * - simple/standard/sonnet → --quality=shiny (default)
 * - complex/opus → --quality=chrome
 *
 * Usage:
 *   gt-smart-sling cs-abc123 csm
 *   gt-smart-sling cs-abc123 csm --force
 *
 * This wrapper:
 * 1. Reads the Beads issue
 * 2. Checks for model: or complexity: labels
 * 3. Maps to appropriate --quality flag
 * 4. Calls gt sling with quality level
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

type QualityLevel = 'basic' | 'shiny' | 'chrome';

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
 * Map routing decision to Gastown quality level.
 */
function modelToQuality(model: ClaudeModelFamily): QualityLevel {
  const mapping: Record<ClaudeModelFamily, QualityLevel> = {
    haiku: 'basic',
    sonnet: 'shiny',
    opus: 'chrome',
    unknown: 'shiny', // Default to Sonnet
  };

  return mapping[model] || 'shiny';
}

/**
 * Select quality level using the harness model routing logic.
 */
function selectQualityLevel(issue: BeadsIssue): { quality: QualityLevel; decision: RoutingDecision } {
  const decision = selectModel(issue);
  const quality = modelToQuality(decision.model);

  return { quality, decision };
}

/**
 * Format quality level for display.
 */
function formatQuality(level: QualityLevel): string {
  const map: Record<QualityLevel, string> = {
    basic: 'basic (Haiku ~$0.001)',
    shiny: 'shiny (Sonnet ~$0.01)',
    chrome: 'chrome (Opus ~$0.10)',
  };
  return map[level];
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
3. Maps to Gastown quality level:
   - trivial/haiku → --quality=basic (Haiku ~$0.001)
   - simple/standard/sonnet → --quality=shiny (Sonnet ~$0.01)
   - complex/opus → --quality=chrome (Opus ~$0.10)
4. Calls gt sling with appropriate quality

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

  // Select quality level using model routing
  const { quality, decision } = selectQualityLevel(issue);

  console.log(`📋 Issue: ${issue.id} - ${issue.title}`);
  console.log(`🎯 Quality: ${formatQuality(quality)}`);
  console.log(`🧠 Routing: ${decision.model} (${decision.strategy}, ${(decision.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`💡 Rationale: ${decision.rationale}`);
  console.log(`🚀 Target: ${target}`);

  // Build gt sling command
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
