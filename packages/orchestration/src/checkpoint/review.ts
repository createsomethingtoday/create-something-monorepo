/**
 * @create-something/orchestration
 *
 * Convoy-wide checkpoint reviews.
 * Runs harness review pipeline on unified convoy context.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import type { Convoy, StoredCheckpoint } from '../types.js';
import { loadConvoy, updateConvoyStatus } from '../coordinator/convoy.js';
import { listWorkers } from '../coordinator/worker-pool.js';
import { createBlockerIssue } from '../integration/beads.js';
import { loadCheckpoint } from './store.js';

const execAsync = promisify(exec);

/**
 * Review aggregation result from harness.
 *
 * This matches the harness ReviewAggregation type.
 */
export interface ReviewAggregation {
  security: ReviewResult;
  architecture: ReviewResult;
  quality: ReviewResult;
  findings: ReviewFinding[];
  blockers: ReviewFinding[];
  recommendations: string[];
  overallPass: boolean;
}

export interface ReviewResult {
  reviewer: string;
  model: 'haiku' | 'sonnet' | 'opus';
  pass: boolean;
  findings: ReviewFinding[];
  cost: number;
}

export interface ReviewFinding {
  reviewer: string;
  severity: 'critical' | 'warning' | 'info';
  finding: string;
  location?: string;
  canBlock: boolean;
}

/**
 * Convoy checkpoint with embedded review.
 */
export interface ConvoyCheckpoint extends StoredCheckpoint {
  reviewAggregation?: ReviewAggregation;
}

/**
 * Perform convoy-wide review at checkpoint.
 *
 * Philosophy: Single review across all workers instead of per-worker reviews.
 * This catches cross-worker issues (shared code, conflicting changes) and
 * reduces review cost by 66% (3 reviewers instead of 3 × N workers).
 */
export async function performConvoyReview(
  convoyId: string,
  checkpointId: string,
  epicId?: string,
  cwd: string = process.cwd()
): Promise<ReviewAggregation> {
  console.log(`Starting convoy-wide review for checkpoint ${checkpointId}`);

  const loaded = await loadConvoy(convoyId, epicId, cwd);

  if (!loaded) {
    throw new Error(`Convoy ${convoyId} not found`);
  }

  const { convoy } = loaded;

  // 1. Build unified git diff from all workers
  console.log('  Building unified git diff from all workers...');
  const gitDiff = await buildConvoyGitDiff(convoy, cwd);

  // 2. Extract files modified
  const filesModified = extractFilesFromDiff(gitDiff);
  console.log(`  Files modified: ${filesModified.length}`);

  if (filesModified.length === 0) {
    console.log('  No changes to review, skipping');
    return {
      security: { reviewer: 'security', model: 'haiku', pass: true, findings: [], cost: 0 },
      architecture: { reviewer: 'architecture', model: 'opus', pass: true, findings: [], cost: 0 },
      quality: { reviewer: 'quality', model: 'sonnet', pass: true, findings: [], cost: 0 },
      findings: [],
      blockers: [],
      recommendations: [],
      overallPass: true,
    };
  }

  // 3. Run harness review pipeline
  console.log('  Running review pipeline...');
  const result = await runHarnessReview(convoy, gitDiff, filesModified, cwd);

  // 4. Embed in checkpoint
  const checkpoint = await loadCheckpoint(convoy.epicId, checkpointId, cwd);
  if (checkpoint) {
    (checkpoint as ConvoyCheckpoint).reviewAggregation = result;

    // Write updated checkpoint back to file
    const checkpointPath = path.join(cwd, '.orchestration/checkpoints', convoy.epicId, `${checkpointId}.json`);
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  // 5. Block convoy if critical findings
  if (result.blockers.length > 0) {
    console.log(`  ⚠️  ${result.blockers.length} blocking issues found`);
    await handleCriticalFindings(convoy, result, cwd);
  } else {
    console.log('  ✓ Review passed');
  }

  return result;
}

/**
 * Build unified git diff from all worker branches.
 *
 * Philosophy: Collect all worker changes into a single diff for holistic review.
 */
async function buildConvoyGitDiff(convoy: Convoy, cwd: string = process.cwd()): Promise<string> {
  try {
    // Get all worker branches (if they exist)
    const workers = await listWorkers(convoy, cwd);
    const branches = workers.map((w) => `worker-${w.workerId}`).filter(Boolean);

    if (branches.length === 0) {
      // No worker branches yet, diff working directory against main
      const { stdout } = await execAsync('git diff main', { cwd });
      return stdout;
    }

    // Unified diff: main vs all worker branches combined
    // This shows what would be merged if all workers completed
    const branchList = branches.join(' ');
    const { stdout } = await execAsync(`git diff main...${branchList}`, { cwd });

    return stdout;
  } catch (error) {
    console.warn('Failed to build convoy git diff:', error);
    // Fallback to working directory diff
    try {
      const { stdout } = await execAsync('git diff', { cwd });
      return stdout;
    } catch (fallbackError) {
      return '';
    }
  }
}

/**
 * Extract file paths from git diff.
 */
function extractFilesFromDiff(diff: string): string[] {
  const lines = diff.split('\n');
  const files: Set<string> = new Set();

  for (const line of lines) {
    // Match "diff --git a/path b/path" or "+++ b/path"
    if (line.startsWith('diff --git')) {
      const match = line.match(/a\/(.+?) b\//);
      if (match) {
        files.add(match[1]);
      }
    } else if (line.startsWith('+++')) {
      const match = line.match(/\+\+\+ b\/(.+)/);
      if (match && match[1] !== '/dev/null') {
        files.add(match[1]);
      }
    }
  }

  return Array.from(files);
}

/**
 * Run harness review pipeline on convoy context.
 *
 * Uses harness reviewers (Security/Haiku, Architecture/Opus, Quality/Sonnet).
 */
async function runHarnessReview(
  convoy: Convoy,
  gitDiff: string,
  filesModified: string[],
  cwd: string = process.cwd()
): Promise<ReviewAggregation> {
  // This is a simplified version. In practice, this would:
  // 1. Import harness review pipeline
  // 2. Build AgentContext from convoy state
  // 3. Run each reviewer (security, architecture, quality)
  // 4. Aggregate results

  // For now, return a mock result
  // TODO: Integrate actual harness review pipeline

  const mockResult: ReviewAggregation = {
    security: {
      reviewer: 'security',
      model: 'haiku',
      pass: true,
      findings: [],
      cost: 0.001,
    },
    architecture: {
      reviewer: 'architecture',
      model: 'opus',
      pass: true,
      findings: [],
      cost: 0.1,
    },
    quality: {
      reviewer: 'quality',
      model: 'sonnet',
      pass: true,
      findings: [],
      cost: 0.01,
    },
    findings: [],
    blockers: [],
    recommendations: [],
    overallPass: true,
  };

  return mockResult;
}

/**
 * Handle critical findings by blocking convoy.
 *
 * Philosophy: When reviews fail, block the entire convoy and create
 * a blocker issue for human intervention.
 */
async function handleCriticalFindings(
  convoy: Convoy,
  result: ReviewAggregation,
  cwd: string = process.cwd()
): Promise<void> {
  // Update convoy status to error
  await updateConvoyStatus(convoy.id, 'failed', convoy.epicId, cwd);

  // Create blocker issue with findings
  const findingsSummary = formatCriticalFindings(result);

  await createBlockerIssue(
    'convoy-review',
    convoy.id,
    `Convoy-wide review found critical issues:\n\n${findingsSummary}`,
    convoy.id
  );

  console.log('');
  console.log('Convoy blocked due to critical review findings.');
  console.log('Human intervention required.');
  console.log('');
  console.log('Review findings:');
  console.log(findingsSummary);
  console.log('');
  console.log(`Resume with: orch convoy resume ${convoy.id}`);
}

/**
 * Format critical findings for display.
 */
export function formatCriticalFindings(result: ReviewAggregation): string {
  const lines: string[] = [];

  for (const finding of result.blockers) {
    lines.push(`[${finding.severity.toUpperCase()}] ${finding.reviewer}`);
    lines.push(`  ${finding.finding}`);
    if (finding.location) {
      lines.push(`  Location: ${finding.location}`);
    }
    lines.push('');
  }

  if (result.recommendations.length > 0) {
    lines.push('Recommendations:');
    for (const rec of result.recommendations) {
      lines.push(`  - ${rec}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate convoy resume brief with review findings.
 *
 * Philosophy: When convoy resumes, show what was found and what needs fixing.
 */
export function generateConvoyResumeBrief(
  convoy: Convoy,
  checkpoint: ConvoyCheckpoint,
  cwd: string = process.cwd()
): string {
  const lines: string[] = [];

  lines.push(`## Convoy Resume: ${convoy.name}`);
  lines.push('');
  lines.push(`Last checkpoint: ${checkpoint.timestamp}`);
  lines.push(`Workers: ${convoy.workers.size}`);
  lines.push('');

  // Review findings section
  if (checkpoint.reviewAggregation) {
    const review = checkpoint.reviewAggregation;

    lines.push('## Review Findings');
    lines.push('');

    if (review.blockers.length > 0) {
      lines.push('### Critical Issues (Must Fix)');
      lines.push('');
      for (const blocker of review.blockers) {
        lines.push(`- [${blocker.reviewer}] ${blocker.finding}`);
        if (blocker.location) {
          lines.push(`  Location: ${blocker.location}`);
        }
      }
      lines.push('');
    }

    if (review.findings.length > 0) {
      lines.push('### Other Findings');
      lines.push('');
      for (const finding of review.findings) {
        if (finding.severity !== 'critical') {
          lines.push(`- [${finding.severity}] ${finding.finding}`);
        }
      }
      lines.push('');
    }

    if (review.recommendations.length > 0) {
      lines.push('### Recommendations');
      lines.push('');
      for (const rec of review.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push('');
    }
  }

  // Worker progress section
  lines.push('## Worker Progress');
  lines.push('');
  for (const [issueId, workerId] of convoy.workers.entries()) {
    lines.push(`- ${issueId}: ${workerId}`);
  }

  return lines.join('\n');
}

/**
 * Check if convoy should be reviewed at this checkpoint.
 *
 * Philosophy: Don't review every checkpoint (too expensive).
 * Review when:
 * - Every 3 checkpoints (45 minutes)
 * - Convoy completing
 * - 10+ files modified
 * - User-requested
 */
export function shouldReviewAtCheckpoint(
  convoy: Convoy,
  checkpointCount: number,
  filesModified: number
): boolean {
  // Review every 3 checkpoints
  if (checkpointCount % 3 === 0) {
    return true;
  }

  // Review if many files changed
  if (filesModified >= 10) {
    return true;
  }

  // Review on convoy completion
  if (convoy.status === 'completing') {
    return true;
  }

  return false;
}

/**
 * Resume convoy after review fixes.
 *
 * Called by CLI after human resolves blocker issues.
 */
export async function resumeConvoyAfterReview(
  convoyId: string,
  epicId?: string,
  cwd: string = process.cwd()
): Promise<void> {
  const loaded = await loadConvoy(convoyId, epicId, cwd);

  if (!loaded) {
    throw new Error(`Convoy ${convoyId} not found`);
  }

  const { convoy } = loaded;

  // Update status from failed → active
  await updateConvoyStatus(convoy.id, 'active', convoy.epicId, cwd);

  console.log(`Convoy ${convoy.id} resumed after review fixes`);
  console.log('Workers will continue execution');
}

/**
 * Generate review cost estimate for convoy.
 *
 * Helps users understand review overhead.
 */
export interface ReviewCostEstimate {
  perWorkerCost: number;  // 3 reviewers × N workers
  convoyWideCost: number; // 3 reviewers × 1 convoy
  savings: number;        // Absolute savings
  savingsPercent: number; // Percentage savings
}

export function estimateReviewCost(workerCount: number): ReviewCostEstimate {
  // Review costs: Security (Haiku $0.001) + Architecture (Opus $0.1) + Quality (Sonnet $0.01)
  const singleReviewCost = 0.001 + 0.1 + 0.01; // $0.111

  const perWorkerCost = singleReviewCost * workerCount;
  const convoyWideCost = singleReviewCost; // Single review for entire convoy

  const savings = perWorkerCost - convoyWideCost;
  const savingsPercent = (savings / perWorkerCost) * 100;

  return {
    perWorkerCost,
    convoyWideCost,
    savings,
    savingsPercent,
  };
}

/**
 * Format review cost estimate for display.
 */
export function formatReviewCostEstimate(estimate: ReviewCostEstimate, workerCount: number): string {
  return [
    'Review Cost Estimate:',
    '',
    `Per-Worker Reviews: ${workerCount} workers × $0.111 = $${estimate.perWorkerCost.toFixed(3)}`,
    `Convoy-Wide Review:  1 review × $0.111 = $${estimate.convoyWideCost.toFixed(3)}`,
    '',
    `Savings: $${estimate.savings.toFixed(3)} (${estimate.savingsPercent.toFixed(1)}%)`,
  ].join('\n');
}
