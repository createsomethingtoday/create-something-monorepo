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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BeadsIssue {
  id: string;
  title: string;
  description: string;
  labels: string[];
  status: string;
}

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
// Model Selection Logic (from harness)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map Beads labels to Gastown quality level.
 *
 * Priority:
 * 1. Explicit model:X labels
 * 2. Complexity:X labels
 * 3. Pattern matching on title
 * 4. Default (shiny)
 */
function selectQualityLevel(issue: BeadsIssue): QualityLevel {
  const labels = issue.labels || [];
  const title = (issue.title + ' ' + (issue.description || '')).toLowerCase();

  // 1. Explicit model labels (highest priority)
  if (labels.includes('model:haiku')) return 'basic';
  if (labels.includes('model:sonnet')) return 'shiny';
  if (labels.includes('model:opus')) return 'chrome';

  // 2. Complexity labels (second priority)
  if (labels.includes('complexity:trivial')) return 'basic';
  if (labels.includes('complexity:simple')) return 'shiny';
  if (labels.includes('complexity:standard')) return 'shiny';
  if (labels.includes('complexity:complex')) return 'chrome';

  // 3. Pattern matching (third priority)
  // Haiku patterns (mechanical tasks)
  const haikuPatterns = [
    'rename', 'typo', 'comment', 'import', 'export',
    'lint', 'format', 'cleanup', 'remove unused',
    'add test', 'update test', 'fix test',
    'bump version', 'update dependency',
  ];

  if (haikuPatterns.some(p => title.includes(p))) {
    return 'basic';
  }

  // Opus patterns (complex reasoning)
  const opusPatterns = [
    'architect', 'design', 'refactor', 'migrate',
    'optimize', 'performance', 'security',
    'integration', 'system',
  ];

  if (opusPatterns.some(p => title.includes(p))) {
    return 'chrome';
  }

  // 4. Default (Sonnet equivalent)
  return 'shiny';
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

  // Select quality level
  const quality = selectQualityLevel(issue);

  console.log(`📋 Issue: ${issue.id} - ${issue.title}`);
  console.log(`🎯 Quality: ${formatQuality(quality)}`);
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
