/**
 * @create-something/orchestration
 *
 * Storage and application of postmortem prevention rules.
 *
 * Philosophy: Prevention rules should be persisted to Git and applied
 * to .claude/rules/ files. This closes the loop between incidents and
 * prevention, ensuring future agents don't repeat past mistakes.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  StoredPostmortem,
  Postmortem,
  PreventionRule,
  PostmortemConfig,
} from './types.js';

const execAsync = promisify(exec);

const POSTMORTEM_DIR = '.orchestration/postmortems';
const RULES_DIR = '.claude/rules';

/**
 * Save a postmortem to Git storage.
 */
export async function savePostmortem(
  postmortem: Postmortem,
  config: PostmortemConfig,
  cwd: string = process.cwd()
): Promise<StoredPostmortem> {
  const stored: StoredPostmortem = {
    postmortem,
    config,
    appliedRules: [],
    pendingRules: postmortem.preventionRules.map((r) => r.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Ensure directory exists
  const dir = path.join(cwd, POSTMORTEM_DIR);
  await fs.mkdir(dir, { recursive: true });

  // Write postmortem file
  const filePath = path.join(dir, `${postmortem.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');

  // Commit to Git
  try {
    await execAsync(`git add "${filePath}"`, { cwd });
    await execAsync(
      `git commit -m "Postmortem: ${postmortem.issueId}\n\nTitle: ${postmortem.title}\nRules generated: ${postmortem.preventionRules.length}"`,
      { cwd }
    );
  } catch (error) {
    console.warn('Failed to commit postmortem to Git:', error);
  }

  return stored;
}

/**
 * Load a postmortem by ID.
 */
export async function loadPostmortem(
  postmortemId: string,
  cwd: string = process.cwd()
): Promise<StoredPostmortem | null> {
  const filePath = path.join(cwd, POSTMORTEM_DIR, `${postmortemId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as StoredPostmortem;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * List all postmortems.
 */
export async function listPostmortems(
  cwd: string = process.cwd()
): Promise<StoredPostmortem[]> {
  const dir = path.join(cwd, POSTMORTEM_DIR);

  try {
    const files = await fs.readdir(dir);
    const postmortemFiles = files.filter((f) => f.startsWith('pm-') && f.endsWith('.json'));

    const postmortems = await Promise.all(
      postmortemFiles.map(async (file) => {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        return JSON.parse(content) as StoredPostmortem;
      })
    );

    // Sort by creation time (newest first)
    postmortems.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return postmortems;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Update postmortem status.
 */
export async function updatePostmortemStatus(
  postmortemId: string,
  status: Postmortem['status'],
  cwd: string = process.cwd()
): Promise<StoredPostmortem | null> {
  const stored = await loadPostmortem(postmortemId, cwd);

  if (!stored) {
    return null;
  }

  stored.postmortem.status = status;
  if (status === 'closed' || status === 'applied') {
    stored.postmortem.completedAt = new Date().toISOString();
  }
  stored.updatedAt = new Date().toISOString();

  const filePath = path.join(cwd, POSTMORTEM_DIR, `${postmortemId}.json`);
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');

  return stored;
}

/**
 * Apply a prevention rule to its target rule file.
 */
export async function applyPreventionRule(
  rule: PreventionRule,
  cwd: string = process.cwd()
): Promise<boolean> {
  if (!rule.targetRuleFile) {
    return false;
  }

  const ruleFilePath = path.join(cwd, RULES_DIR, rule.targetRuleFile);

  // Check if file exists
  let existingContent = '';
  try {
    existingContent = await fs.readFile(ruleFilePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // File doesn't exist, we'll create the section
  }

  // Format the rule as a rule entry
  const ruleEntry = formatRuleAsEntry(rule);

  // Find or create the "Incident Prevention Rules" section
  const updatedContent = addToPreventionSection(existingContent, ruleEntry);

  // Write updated content
  await fs.writeFile(ruleFilePath, updatedContent, 'utf-8');

  // Mark rule as applied
  rule.applied = true;

  return true;
}

/**
 * Apply all pending rules from a postmortem.
 */
export async function applyAllRules(
  stored: StoredPostmortem,
  cwd: string = process.cwd()
): Promise<{ applied: number; skipped: number }> {
  let applied = 0;
  let skipped = 0;

  const pendingRules = stored.postmortem.preventionRules.filter(
    (r) => stored.pendingRules.includes(r.id)
  );

  for (const rule of pendingRules) {
    const wasApplied = await applyPreventionRule(rule, cwd);

    if (wasApplied) {
      applied++;
      stored.appliedRules.push(rule.id);
      stored.pendingRules = stored.pendingRules.filter((id) => id !== rule.id);
    } else {
      skipped++;
    }
  }

  // Update status
  if (stored.pendingRules.length === 0) {
    stored.postmortem.status = 'applied';
    stored.postmortem.completedAt = new Date().toISOString();
  }

  // Save updated postmortem
  stored.updatedAt = new Date().toISOString();
  const filePath = path.join(cwd, POSTMORTEM_DIR, `${stored.postmortem.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');

  // Commit changes
  try {
    await execAsync(`git add "${RULES_DIR}" "${filePath}"`, { cwd });
    await execAsync(
      `git commit -m "Apply ${applied} prevention rules from ${stored.postmortem.id}\n\nPostmortem: ${stored.postmortem.title}"`,
      { cwd }
    );
  } catch (error) {
    console.warn('Failed to commit rule applications:', error);
  }

  return { applied, skipped };
}

/**
 * Format a prevention rule as an entry for the rule file.
 */
function formatRuleAsEntry(rule: PreventionRule): string {
  const lines: string[] = [];

  lines.push(`### ${rule.title}`);
  lines.push('');
  lines.push(`**ID**: ${rule.id}`);
  lines.push(`**Confidence**: ${(rule.confidence * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('**Pattern to detect**:');
  lines.push(`> ${rule.pattern}`);
  lines.push('');
  lines.push('**Action**:');
  lines.push(rule.action);
  lines.push('');

  if (rule.badExample) {
    lines.push('**Bad example** (avoid this):');
    lines.push('```');
    lines.push(rule.badExample);
    lines.push('```');
    lines.push('');
  }

  if (rule.goodExample) {
    lines.push('**Good example** (do this):');
    lines.push('```');
    lines.push(rule.goodExample);
    lines.push('```');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Add rule to the "Incident Prevention Rules" section.
 */
function addToPreventionSection(content: string, ruleEntry: string): string {
  const sectionHeader = '## Incident Prevention Rules';
  const sectionDescription = `
These rules were generated from postmortem analysis of production incidents.
Each rule represents a pattern that caused a problem and should be flagged
during code review to prevent recurrence.

`;

  // Check if section exists
  if (content.includes(sectionHeader)) {
    // Find the section and append the rule
    const sectionIndex = content.indexOf(sectionHeader);
    const afterHeader = content.slice(sectionIndex + sectionHeader.length);

    // Find the next major section (## ) or end of file
    const nextSectionMatch = afterHeader.match(/\n## [^#]/);
    const insertPoint = nextSectionMatch
      ? sectionIndex + sectionHeader.length + nextSectionMatch.index! + 1
      : content.length;

    // Insert the rule before the next section
    return (
      content.slice(0, insertPoint) +
      '\n' +
      ruleEntry +
      content.slice(insertPoint)
    );
  } else {
    // Add the section at the end
    return (
      content.trimEnd() +
      '\n\n' +
      sectionHeader +
      '\n' +
      sectionDescription +
      ruleEntry
    );
  }
}

/**
 * Generate a markdown report of a postmortem.
 */
export function formatPostmortemReport(postmortem: Postmortem): string {
  const lines: string[] = [];

  lines.push(`# ${postmortem.title}`);
  lines.push('');
  lines.push(`**ID**: ${postmortem.id}`);
  lines.push(`**Issue**: ${postmortem.issueId}`);
  lines.push(`**Status**: ${postmortem.status}`);
  lines.push(`**Date**: ${formatDate(postmortem.createdAt)}`);
  lines.push('');

  // Description
  lines.push('## Description');
  lines.push('');
  lines.push(postmortem.description);
  lines.push('');

  // Root Cause
  lines.push('## Root Cause');
  lines.push('');
  lines.push(`**Category**: ${postmortem.rootCause.category}`);
  lines.push('');
  lines.push(postmortem.rootCause.description);
  lines.push('');

  if (postmortem.rootCause.codePattern) {
    lines.push('**Code pattern**:');
    lines.push('```');
    lines.push(postmortem.rootCause.codePattern);
    lines.push('```');
    lines.push('');
  }

  if (postmortem.rootCause.files.length > 0) {
    lines.push('**Files involved**:');
    for (const file of postmortem.rootCause.files) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (postmortem.rootCause.contributingFactors.length > 0) {
    lines.push('**Contributing factors**:');
    for (const factor of postmortem.rootCause.contributingFactors) {
      lines.push(`- ${factor}`);
    }
    lines.push('');
  }

  if (postmortem.rootCause.safeguardGaps.length > 0) {
    lines.push('**Safeguard gaps**:');
    for (const gap of postmortem.rootCause.safeguardGaps) {
      lines.push(`- ${gap}`);
    }
    lines.push('');
  }

  // Impact
  lines.push('## Impact');
  lines.push('');
  lines.push(`**Severity**: ${postmortem.impact.severity}`);
  if (postmortem.impact.usersAffected !== null) {
    lines.push(`**Users affected**: ${postmortem.impact.usersAffected}`);
  }
  if (postmortem.impact.durationMinutes !== null) {
    lines.push(`**Duration**: ${postmortem.impact.durationMinutes} minutes`);
  }
  if (postmortem.impact.servicesAffected.length > 0) {
    lines.push(`**Services**: ${postmortem.impact.servicesAffected.join(', ')}`);
  }
  lines.push('');

  // Timeline
  if (postmortem.timeline.length > 0) {
    lines.push('## Timeline');
    lines.push('');
    for (const event of postmortem.timeline) {
      lines.push(`- **${formatTime(event.timestamp)}** [${event.type}] ${event.event} (${event.actor})`);
    }
    lines.push('');
  }

  // Prevention Rules
  if (postmortem.preventionRules.length > 0) {
    lines.push('## Prevention Rules');
    lines.push('');
    for (const rule of postmortem.preventionRules) {
      const status = rule.applied ? '✓' : '○';
      lines.push(`${status} **${rule.title}**`);
      lines.push(`  Target: ${rule.targetRuleFile}`);
      lines.push(`  Pattern: ${rule.pattern}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format date for display.
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for timeline.
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
