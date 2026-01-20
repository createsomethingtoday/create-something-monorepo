/**
 * @create-something/orchestration
 *
 * Storage and application of learnings from reflection.
 *
 * Philosophy: Learnings should be persisted to Git and optionally applied
 * to .claude/rules/ files to close the learning loop. This creates a
 * continuous improvement cycle where agents get better over time.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  StoredReflection,
  ReflectionResult,
  Learning,
  ReflectionConfig,
} from './types.js';
import { formatDate } from '../utils/format.js';

const execAsync = promisify(exec);

const REFLECTION_DIR = '.orchestration/reflections';
const RULES_DIR = '.claude/rules';

/**
 * Save a reflection result to Git storage.
 */
export async function saveReflection(
  result: ReflectionResult,
  config: ReflectionConfig,
  cwd: string = process.cwd()
): Promise<StoredReflection> {
  const stored: StoredReflection = {
    reflection: result,
    config,
    appliedLearnings: [],
    pendingLearnings: result.learnings.map((l) => l.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Ensure directory exists
  const dir = path.join(cwd, REFLECTION_DIR);
  await fs.mkdir(dir, { recursive: true });

  // Write reflection file
  const filePath = path.join(dir, `${result.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), 'utf-8');

  // Commit to Git
  try {
    await execAsync(`git add "${filePath}"`, { cwd });
    await execAsync(
      `git commit -m "Reflection: ${result.target.type} ${result.target.id}\n\nExtracted ${result.learnings.length} learnings"`,
      { cwd }
    );
  } catch (error) {
    console.warn('Failed to commit reflection to Git:', error);
  }

  return stored;
}

/**
 * Load a reflection by ID.
 */
export async function loadReflection(
  reflectionId: string,
  cwd: string = process.cwd()
): Promise<StoredReflection | null> {
  const filePath = path.join(cwd, REFLECTION_DIR, `${reflectionId}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as StoredReflection;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * List all reflections.
 */
export async function listReflections(
  cwd: string = process.cwd()
): Promise<StoredReflection[]> {
  const dir = path.join(cwd, REFLECTION_DIR);

  try {
    const files = await fs.readdir(dir);
    const reflectionFiles = files.filter((f) => f.startsWith('refl-') && f.endsWith('.json'));

    const reflections = await Promise.all(
      reflectionFiles.map(async (file) => {
        const content = await fs.readFile(path.join(dir, file), 'utf-8');
        return JSON.parse(content) as StoredReflection;
      })
    );

    // Sort by creation time (newest first)
    reflections.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return reflections;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Apply a learning to its target rule file.
 *
 * Returns true if applied, false if skipped (no target file).
 */
export async function applyLearning(
  learning: Learning,
  cwd: string = process.cwd()
): Promise<boolean> {
  if (!learning.targetRuleFile) {
    return false;
  }

  const ruleFilePath = path.join(cwd, RULES_DIR, learning.targetRuleFile);

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

  // Format the learning as a rule entry
  const learningEntry = formatLearningAsRule(learning);

  // Find or create the "Agent Learnings" section
  const updatedContent = addToLearningsSection(existingContent, learningEntry);

  // Write updated content
  await fs.writeFile(ruleFilePath, updatedContent, 'utf-8');

  // Mark learning as applied
  learning.applied = true;

  return true;
}

/**
 * Apply all pending learnings from a reflection.
 *
 * Returns count of applied learnings.
 */
export async function applyAllLearnings(
  reflection: StoredReflection,
  cwd: string = process.cwd()
): Promise<{ applied: number; skipped: number }> {
  let applied = 0;
  let skipped = 0;

  const pendingLearnings = reflection.reflection.learnings.filter(
    (l) => reflection.pendingLearnings.includes(l.id)
  );

  for (const learning of pendingLearnings) {
    const wasApplied = await applyLearning(learning, cwd);

    if (wasApplied) {
      applied++;
      reflection.appliedLearnings.push(learning.id);
      reflection.pendingLearnings = reflection.pendingLearnings.filter(
        (id) => id !== learning.id
      );
    } else {
      skipped++;
    }
  }

  // Update the stored reflection
  reflection.updatedAt = new Date().toISOString();
  const filePath = path.join(cwd, REFLECTION_DIR, `${reflection.reflection.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(reflection, null, 2), 'utf-8');

  // Commit changes
  try {
    await execAsync(`git add "${RULES_DIR}" "${filePath}"`, { cwd });
    await execAsync(
      `git commit -m "Apply ${applied} learnings from ${reflection.reflection.id}\n\nSkipped: ${skipped} (no target file)"`,
      { cwd }
    );
  } catch (error) {
    console.warn('Failed to commit learning applications:', error);
  }

  return { applied, skipped };
}

/**
 * Format a learning as a rule entry.
 */
function formatLearningAsRule(learning: Learning): string {
  const lines: string[] = [];

  lines.push(`### ${learning.title}`);
  lines.push('');
  lines.push(`**Type**: ${learning.type}`);
  lines.push(`**Confidence**: ${(learning.confidence * 100).toFixed(0)}%`);
  lines.push(`**Learned**: ${formatDate(learning.createdAt)}`);
  lines.push('');
  lines.push('**Pattern**:');
  lines.push(`> ${learning.pattern}`);
  lines.push('');
  lines.push('**Suggestion**:');
  lines.push(learning.suggestion);
  lines.push('');

  if (learning.sources.length > 0) {
    lines.push('**Sources**:');
    for (const source of learning.sources.slice(0, 3)) {
      lines.push(`- ${source.type}: ${source.id}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Add learning to the "Agent Learnings" section of a rule file.
 */
function addToLearningsSection(content: string, learningEntry: string): string {
  const sectionHeader = '## Agent Learnings';
  const sectionDescription = `
This section contains learnings automatically extracted from agent reflection.
These patterns were identified from corrections, failures, and inefficiencies.
Review periodically and promote stable learnings to the main documentation.

`;

  // Check if section exists
  if (content.includes(sectionHeader)) {
    // Find the section and append the learning
    const sectionIndex = content.indexOf(sectionHeader);
    const afterHeader = content.slice(sectionIndex + sectionHeader.length);

    // Find the next major section (## ) or end of file
    const nextSectionMatch = afterHeader.match(/\n## [^#]/);
    const insertPoint = nextSectionMatch
      ? sectionIndex + sectionHeader.length + nextSectionMatch.index! + 1
      : content.length;

    // Insert the learning before the next section
    return (
      content.slice(0, insertPoint) +
      '\n' +
      learningEntry +
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
      learningEntry
    );
  }
}

/**
 * Generate a summary of pending learnings across all reflections.
 */
export async function getPendingLearningSummary(
  cwd: string = process.cwd()
): Promise<{
  total: number;
  byType: Record<string, number>;
  byFile: Record<string, number>;
}> {
  const reflections = await listReflections(cwd);

  const summary = {
    total: 0,
    byType: {} as Record<string, number>,
    byFile: {} as Record<string, number>,
  };

  for (const reflection of reflections) {
    for (const learningId of reflection.pendingLearnings) {
      const learning = reflection.reflection.learnings.find((l) => l.id === learningId);
      if (!learning) continue;

      summary.total++;

      // Count by type
      summary.byType[learning.type] = (summary.byType[learning.type] || 0) + 1;

      // Count by target file
      const file = learning.targetRuleFile || 'unassigned';
      summary.byFile[file] = (summary.byFile[file] || 0) + 1;
    }
  }

  return summary;
}

/**
 * Create a markdown report of all learnings.
 */
export async function generateLearningsReport(
  cwd: string = process.cwd()
): Promise<string> {
  const reflections = await listReflections(cwd);
  const summary = await getPendingLearningSummary(cwd);

  const lines: string[] = [];

  lines.push('# Agent Learnings Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Pending**: ${summary.total}`);
  lines.push('');

  if (Object.keys(summary.byType).length > 0) {
    lines.push('### By Type');
    lines.push('');
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    for (const [type, count] of Object.entries(summary.byType)) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push('');
  }

  if (Object.keys(summary.byFile).length > 0) {
    lines.push('### By Target File');
    lines.push('');
    lines.push('| File | Count |');
    lines.push('|------|-------|');
    for (const [file, count] of Object.entries(summary.byFile)) {
      lines.push(`| ${file} | ${count} |`);
    }
    lines.push('');
  }

  lines.push('## Reflections');
  lines.push('');

  for (const reflection of reflections) {
    const r = reflection.reflection;
    lines.push(`### ${r.target.type}: ${r.target.name}`);
    lines.push('');
    lines.push(`- **ID**: ${r.id}`);
    lines.push(`- **Date**: ${formatDate(r.timestamp)}`);
    lines.push(`- **Learnings**: ${r.learnings.length} (${reflection.pendingLearnings.length} pending)`);
    lines.push('');

    // Stats
    const stats = r.stats;
    lines.push('**Statistics**:');
    lines.push(`- Sessions: ${stats.sessionsAnalyzed}`);
    lines.push(`- Issues: ${stats.issuesCompleted} completed, ${stats.issuesFailed} failed`);
    lines.push(`- Avg iterations: ${stats.avgIterations.toFixed(1)}`);
    lines.push(`- Total cost: $${stats.totalCost.toFixed(4)}`);
    lines.push('');

    // Top learnings
    if (r.learnings.length > 0) {
      lines.push('**Top Learnings**:');
      for (const learning of r.learnings.slice(0, 3)) {
        lines.push(`- [${learning.type}] ${learning.title}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
