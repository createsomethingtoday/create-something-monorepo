/**
 * @create-something/harness
 *
 * Runner: Main orchestration loop for the harness.
 */

import { readFile } from 'node:fs/promises';
import type {
  HarnessState,
  HarnessStatus,
  StartOptions,
  Checkpoint,
  CheckpointPolicy,
  PrimingContext,
  FailureHandlingConfig,
  SwarmConfig,
  BeadsIssue,
  SessionResult,
  ReviewPipelineConfig,
  ReviewedCheckpoint,
} from './types.js';
import { DEFAULT_CHECKPOINT_POLICY, DEFAULT_FAILURE_HANDLING_CONFIG, DEFAULT_SWARM_CONFIG, DEFAULT_REVIEW_PIPELINE_CONFIG } from './types.js';
import { parseSpec, formatSpecSummary } from './spec-parser.js';
import {
  createIssuesFromFeatures,
  createHarnessIssue,
  getReadyIssues,
  updateIssueStatus,
  getIssue,
  getHarnessIssue,
  getHarnessCheckpoints,
  getCompletedFeatures,
  getPendingFeatures,
  parseHarnessDescription,
  updateHarnessStatus,
  annotateIssueFailure,
  markIssueSkipped,
  resetIssueForRetry,
} from './beads.js';
import {
  runSession,
  getRecentCommits,
  createHarnessBranch,
  generatePrimingPrompt,
  discoverDryContext,
} from './session.js';
import {
  createCheckpointTracker,
  recordSession,
  shouldCreateCheckpoint,
  shouldPauseForConfidence,
  generateCheckpoint,
  generateReviewedCheckpoint,
  resetTracker,
  formatCheckpointDisplay,
  calculateConfidence,
  // Swarm tracking
  startSwarmBatch,
  registerSwarmAgent,
  updateSwarmAgentStatus,
  completeSwarmBatch,
  generateSwarmCheckpoint,
  formatSwarmProgressDisplay,
} from './checkpoint.js';
import {
  takeSnapshot,
  checkForRedirects,
  formatRedirectNotes,
  requiresImmediateAction,
  logRedirect,
} from './redirect.js';
import {
  createFailureTracker,
  makeFailureDecision,
  recordSuccessfulRetry,
  getAttemptCount,
  formatFailureAnnotation,
  formatFailureStats,
  getFailureStats,
} from './failure-handler.js';

/**
 * Type guard to check if a checkpoint has review data.
 */
function isReviewedCheckpoint(checkpoint: Checkpoint | ReviewedCheckpoint): checkpoint is ReviewedCheckpoint {
  return 'hasReview' in checkpoint && checkpoint.hasReview === true;
}

/**
 * Initialize a new harness run.
 */
export async function initializeHarness(
  options: StartOptions,
  cwd: string
): Promise<{ harnessState: HarnessState; featureMap: Map<string, string> }> {
  console.log(`\n🚀 Initializing harness from spec: ${options.specFile}\n`);

  // Read and parse spec
  const specContent = await readFile(options.specFile, 'utf-8');
  const spec = parseSpec(specContent);

  console.log(formatSpecSummary(spec));
  console.log(`\nParsed ${spec.features.length} features from spec.\n`);

  // Create harness issue
  const checkpointPolicy: CheckpointPolicy = {
    afterSessions: options.checkpointEvery || 3,
    afterHours: options.maxHours || 4,
    onError: true,
    onConfidenceBelow: 0.7,
    onRedirect: true,
  };

  const harnessId = await createHarnessIssue(
    spec.title,
    options.specFile,
    spec.features.length,
    checkpointPolicy,
    cwd
  );

  console.log(`Created harness issue: ${harnessId}`);

  // Create git branch
  const slugTitle = spec.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30);
  const gitBranch = await createHarnessBranch(slugTitle, cwd);
  console.log(`Created git branch: ${gitBranch}`);

  // Create issues from features
  const featureMap = await createIssuesFromFeatures(
    spec.features,
    harnessId,
    cwd
  );
  console.log(`Created ${featureMap.size} issues in Beads.\n`);

  const harnessState: HarnessState = {
    id: harnessId,
    status: 'running',
    specFile: options.specFile,
    gitBranch,
    startedAt: new Date().toISOString(),
    currentSession: 0,
    sessionsCompleted: 0,
    featuresTotal: spec.features.length,
    featuresCompleted: 0,
    featuresFailed: 0,
    lastCheckpoint: null,
    checkpointPolicy,
    pauseReason: null,
  };

  return { harnessState, featureMap };
}

/**
 * Run the harness loop.
 */
export async function runHarness(
  harnessState: HarnessState,
  options: {
    cwd: string;
    dryRun?: boolean;
    failureConfig?: FailureHandlingConfig;
    reviewConfig?: ReviewPipelineConfig;
  }
): Promise<void> {
  const checkpointTracker = createCheckpointTracker();
  const failureTracker = createFailureTracker();
  const failureConfig = options.failureConfig ?? DEFAULT_FAILURE_HANDLING_CONFIG;
  const reviewConfig = options.reviewConfig ?? null; // null = no review
  let beadsSnapshot = await takeSnapshot(options.cwd);
  let lastCheckpoint: Checkpoint | ReviewedCheckpoint | null = null;
  let redirectNotes: string[] = [];

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  HARNESS RUNNING: ${harnessState.id}`);
  console.log(`  Branch: ${harnessState.gitBranch}`);
  console.log(`  Features: ${harnessState.featuresTotal}`);
  console.log(`  Failure Handling: retry=${failureConfig.maxRetries}, continue=${failureConfig.continueOnFailure}`);
  if (reviewConfig?.enabled) {
    const reviewerIds = reviewConfig.reviewers.filter(r => r.enabled).map(r => r.id);
    console.log(`  Peer Review: ${reviewerIds.join(', ')}`);
  }
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  while (harnessState.status === 'running') {
    // 1. Check for redirects
    const redirectCheck = await checkForRedirects(
      beadsSnapshot,
      harnessState.id,
      options.cwd
    );

    beadsSnapshot = redirectCheck.newSnapshot;

    if (redirectCheck.redirects.length > 0) {
      console.log('\n📢 Redirects detected:');
      for (const redirect of redirectCheck.redirects) {
        console.log('  ' + logRedirect(redirect));
      }
      redirectNotes.push(...redirectCheck.redirects.map((r) => r.description));
    }

    // Check for pause request
    if (redirectCheck.shouldPause) {
      harnessState.status = 'paused';
      harnessState.pauseReason = redirectCheck.pauseReason;
      console.log(`\n⏸ Harness paused: ${redirectCheck.pauseReason}`);
      break;
    }

    // Check if redirects require immediate action
    if (requiresImmediateAction(redirectCheck.redirects)) {
      // Create checkpoint before handling redirect
      if (checkpointTracker.sessionsResults.length > 0) {
        lastCheckpoint = await generateReviewedCheckpoint(
          checkpointTracker,
          harnessState,
          formatRedirectNotes(redirectCheck.redirects),
          reviewConfig,
          options.cwd
        );
        console.log('\n' + formatCheckpointDisplay(lastCheckpoint));
        resetTracker(checkpointTracker);
        harnessState.lastCheckpoint = lastCheckpoint.id;

        // Handle review decision
        if (isReviewedCheckpoint(lastCheckpoint) && lastCheckpoint.reviewAggregation && !lastCheckpoint.reviewAggregation.shouldAdvance) {
          harnessState.status = 'paused';
          harnessState.pauseReason = `Review blocked: ${lastCheckpoint.reviewAggregation.blockingReasons.join(', ')}`;
          console.log(`\n⏸ Harness paused for review: ${harnessState.pauseReason}`);
          break;
        }
      }
    }

    // 2. Get next work item (exclude checkpoints and the harness epic itself)
    const readyIssues = await getReadyIssues(options.cwd);
    const harnessIssues = readyIssues.filter((issue) =>
      issue.labels?.includes(`harness:${harnessState.id}`) &&
      !issue.labels?.includes('checkpoint') &&
      issue.issue_type !== 'epic'
    );

    if (harnessIssues.length === 0) {
      // No more work
      harnessState.status = 'completed';
      console.log('\n✅ All tasks completed!');
      break;
    }

    const nextIssue = harnessIssues[0];
    console.log(`\n📋 Next task: ${nextIssue.id} - ${nextIssue.title}`);

    // Mark as in progress
    await updateIssueStatus(nextIssue.id, 'in_progress', options.cwd);

    // 3. Build priming context with DRY discovery
    const recentCommits = await getRecentCommits(options.cwd, 10);
    const dryContext = await discoverDryContext(nextIssue.title, options.cwd);
    const primingContext: PrimingContext = {
      currentIssue: nextIssue,
      recentCommits,
      lastCheckpoint,
      redirectNotes,
      sessionGoal: `Complete: ${nextIssue.title}\n\n${nextIssue.description || ''}`,
      existingPatterns: dryContext.existingPatterns,
      relevantFiles: dryContext.relevantFiles,
    };

    // Clear redirect notes for next iteration
    redirectNotes = [];

    // 4. Run session
    harnessState.currentSession++;
    console.log(`\n🤖 Starting session #${harnessState.currentSession}...`);

    const sessionResult = await runSession(nextIssue, primingContext, {
      cwd: options.cwd,
      dryRun: options.dryRun,
    });

    // 5. Handle session result with graceful failure handling
    recordSession(checkpointTracker, sessionResult);

    if (sessionResult.outcome === 'success') {
      // Check if this was a successful retry
      const attemptCount = getAttemptCount(failureTracker, nextIssue.id);
      if (attemptCount > 0) {
        recordSuccessfulRetry(failureTracker, nextIssue.id);
        console.log(`✅ Task completed on retry (attempt ${attemptCount + 1}): ${nextIssue.id}`);
      } else {
        console.log(`✅ Task completed: ${nextIssue.id}`);
      }

      await updateIssueStatus(nextIssue.id, 'closed', options.cwd);
      harnessState.featuresCompleted++;
      harnessState.sessionsCompleted++;
    } else {
      // Non-success outcome - use failure handler
      harnessState.sessionsCompleted++;

      const decision = makeFailureDecision(sessionResult, failureTracker, failureConfig);
      console.log(`${getOutcomeIcon(sessionResult.outcome)} ${nextIssue.id}: ${sessionResult.outcome}`);
      if (sessionResult.error) {
        console.log(`   Error: ${sessionResult.error.slice(0, 100)}`);
      }
      console.log(`   Decision: ${decision.action} - ${decision.reason}`);

      // Handle the decision
      switch (decision.action) {
        case 'retry':
          // Schedule retry - the issue stays in_progress and will be picked up next iteration
          console.log(`   Waiting ${failureConfig.retryDelayMs}ms before retry...`);
          if (!options.dryRun) {
            await sleep(decision.retryAfterMs ?? failureConfig.retryDelayMs);
          }
          // Reset issue state for retry
          await resetIssueForRetry(nextIssue.id, options.cwd);
          break;

        case 'skip':
          // Mark as skipped and move on
          harnessState.featuresFailed++;
          await markIssueSkipped(nextIssue.id, decision.reason, options.cwd);
          // Annotate the failure if configured
          if (failureConfig.annotateFailures) {
            const record = failureTracker.records.get(nextIssue.id);
            if (record) {
              await annotateIssueFailure(
                nextIssue.id,
                formatFailureAnnotation(record),
                options.cwd
              );
            }
          }
          break;

        case 'pause':
          // Pause the harness for human review
          harnessState.status = 'paused';
          harnessState.pauseReason = decision.reason;
          harnessState.featuresFailed++;
          console.log(`\n⏸ Harness paused: ${decision.reason}`);
          break;

        case 'escalate':
          // Escalate - pause with escalation flag
          harnessState.status = 'paused';
          harnessState.pauseReason = `[ESCALATED] ${decision.reason}`;
          harnessState.featuresFailed++;
          console.log(`\n🚨 Harness escalated: ${decision.reason}`);
          break;
      }

      // Create checkpoint if decision requires it
      if (decision.shouldCreateCheckpoint && checkpointTracker.sessionsResults.length > 0) {
        console.log(`\n📊 Creating checkpoint: ${decision.reason}`);
        lastCheckpoint = await generateReviewedCheckpoint(
          checkpointTracker,
          harnessState,
          `Failure handling: ${decision.action}`,
          reviewConfig,
          options.cwd
        );
        console.log('\n' + formatCheckpointDisplay(lastCheckpoint));
        resetTracker(checkpointTracker);
        harnessState.lastCheckpoint = lastCheckpoint.id;

        // Handle review decision (additional pause if review blocked)
        if (isReviewedCheckpoint(lastCheckpoint) && lastCheckpoint.reviewAggregation && !lastCheckpoint.reviewAggregation.shouldAdvance) {
          if (harnessState.status === 'running') {
            harnessState.status = 'paused';
            harnessState.pauseReason = `Review blocked: ${lastCheckpoint.reviewAggregation.blockingReasons.join(', ')}`;
            console.log(`\n⏸ Harness paused for review: ${harnessState.pauseReason}`);
          }
        }
      }

      // Exit loop if decision says not to continue
      if (!decision.shouldContinue) {
        break;
      }
    }

    // 6. Check checkpoint policy
    const checkpointCheck = shouldCreateCheckpoint(
      checkpointTracker,
      harnessState.checkpointPolicy,
      sessionResult,
      redirectCheck.redirects.length > 0
    );

    if (checkpointCheck.create) {
      console.log(`\n📊 Creating checkpoint: ${checkpointCheck.reason}`);
      lastCheckpoint = await generateReviewedCheckpoint(
        checkpointTracker,
        harnessState,
        formatRedirectNotes(redirectCheck.redirects),
        reviewConfig,
        options.cwd
      );
      console.log('\n' + formatCheckpointDisplay(lastCheckpoint));
      resetTracker(checkpointTracker);
      harnessState.lastCheckpoint = lastCheckpoint.id;

      // Handle review decision
      if (isReviewedCheckpoint(lastCheckpoint) && lastCheckpoint.reviewAggregation && !lastCheckpoint.reviewAggregation.shouldAdvance) {
        harnessState.status = 'paused';
        harnessState.pauseReason = `Review blocked: ${lastCheckpoint.reviewAggregation.blockingReasons.join(', ')}`;
        console.log(`\n⏸ Harness paused for review: ${harnessState.pauseReason}`);
        break;
      }
    }

    // 7. Check confidence threshold
    if (shouldPauseForConfidence(
      checkpointTracker.sessionsResults,
      harnessState.checkpointPolicy.onConfidenceBelow
    )) {
      const confidence = calculateConfidence(checkpointTracker.sessionsResults);
      harnessState.status = 'paused';
      harnessState.pauseReason = `Confidence dropped to ${(confidence * 100).toFixed(0)}%`;
      console.log(`\n⏸ Harness paused: ${harnessState.pauseReason}`);

      // Create final checkpoint before pausing
      if (checkpointTracker.sessionsResults.length > 0) {
        lastCheckpoint = await generateReviewedCheckpoint(
          checkpointTracker,
          harnessState,
          `Low confidence pause`,
          reviewConfig,
          options.cwd
        );
        console.log('\n' + formatCheckpointDisplay(lastCheckpoint));
      }
      break;
    }

    // Small delay between sessions to avoid overwhelming resources
    if (!options.dryRun) {
      await sleep(2000);
    }
  }

  // Final summary with failure statistics
  const failureStats = getFailureStats(failureTracker);
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  HARNESS ${harnessState.status.toUpperCase()}`);
  console.log(`  Sessions: ${harnessState.sessionsCompleted}`);
  console.log(`  Features: ${harnessState.featuresCompleted}/${harnessState.featuresTotal} completed`);
  console.log(`  Failed: ${harnessState.featuresFailed}`);
  if (failureStats.totalRetries > 0) {
    console.log(`  Retries: ${failureStats.totalRetries} (${failureStats.successfulRetries} successful)`);
  }
  if (failureStats.skippedIssues > 0) {
    console.log(`  Skipped: ${failureStats.skippedIssues}`);
  }
  if (harnessState.pauseReason) {
    console.log(`  Pause Reason: ${harnessState.pauseReason}`);
  }
  console.log(`═══════════════════════════════════════════════════════════════\n`);
}

/**
 * Get icon for session outcome.
 */
function getOutcomeIcon(outcome: string): string {
  switch (outcome) {
    case 'success': return '✅';
    case 'failure': return '❌';
    case 'partial': return '◐';
    case 'context_overflow': return '⚠';
    default: return '?';
  }
}

/**
 * Resume a paused harness.
 */
export async function resumeHarness(
  harnessId: string | undefined,
  cwd: string,
  options?: { dryRun?: boolean }
): Promise<void> {
  console.log(`\n🔄 Resuming harness${harnessId ? `: ${harnessId}` : ''}...\n`);

  // 1. Find the harness issue
  const harnessIssue = await getHarnessIssue(harnessId, cwd);
  if (!harnessIssue) {
    if (harnessId) {
      console.log(`❌ Harness not found: ${harnessId}`);
    } else {
      console.log('❌ No active harness found to resume.');
    }
    return;
  }

  console.log(`Found harness: ${harnessIssue.id} - ${harnessIssue.title}`);

  // 2. Parse harness description for metadata
  const metadata = parseHarnessDescription(harnessIssue.description || '');
  if (!metadata.specFile) {
    console.log('❌ Could not determine spec file from harness issue.');
    return;
  }

  console.log(`Spec file: ${metadata.specFile}`);
  console.log(`Total features: ${metadata.featuresTotal}`);

  // 3. Get completed and pending features
  const completedFeatures = await getCompletedFeatures(harnessIssue.id, cwd);
  const pendingFeatures = await getPendingFeatures(harnessIssue.id, cwd);

  console.log(`Completed: ${completedFeatures.length}`);
  console.log(`Pending: ${pendingFeatures.length}`);

  // 4. Get the most recent checkpoint for context
  const checkpoints = await getHarnessCheckpoints(harnessIssue.id, cwd);
  let lastSessionNumber = 0;
  let lastCheckpointId: string | null = null;

  if (checkpoints.length > 0) {
    const latestCheckpoint = checkpoints[0];
    lastCheckpointId = latestCheckpoint.id;
    const match = latestCheckpoint.title.match(/Checkpoint #(\d+)/);
    if (match) {
      lastSessionNumber = parseInt(match[1], 10);
    }
    console.log(`Last checkpoint: ${latestCheckpoint.title}`);
  }

  // 5. Determine git branch
  // Try to find the harness branch or use current branch
  let gitBranch = '';
  try {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);
    const { stdout } = await execAsync('git branch --show-current', { cwd });
    gitBranch = stdout.trim();

    // Check if we need to switch to the harness branch
    if (!gitBranch.startsWith('harness/')) {
      // Look for a harness branch matching this harness
      const { stdout: branches } = await execAsync('git branch --list "harness/*"', { cwd });
      const harnessBranches = branches.trim().split('\n').map((b) => b.trim().replace('* ', ''));

      // Find branch that might match this harness (by partial ID or date)
      const matchingBranch = harnessBranches.find((b) =>
        b.includes(harnessIssue.id.slice(-4)) || b.includes(metadata.startedAt?.slice(0, 10)?.replace(/-/g, '') || '')
      );

      if (matchingBranch) {
        console.log(`Switching to harness branch: ${matchingBranch}`);
        await execAsync(`git checkout ${matchingBranch}`, { cwd });
        gitBranch = matchingBranch;
      } else {
        console.log(`⚠ No harness branch found, continuing on current branch: ${gitBranch}`);
      }
    }
  } catch {
    gitBranch = 'main';
  }

  // 6. Reconstruct harness state
  const harnessState: HarnessState = {
    id: harnessIssue.id,
    status: 'running',
    specFile: metadata.specFile,
    gitBranch,
    startedAt: metadata.startedAt || harnessIssue.created_at,
    currentSession: lastSessionNumber,
    sessionsCompleted: lastSessionNumber,
    featuresTotal: metadata.featuresTotal,
    featuresCompleted: completedFeatures.length,
    featuresFailed: 0, // We don't track failed count in Beads yet
    lastCheckpoint: lastCheckpointId,
    checkpointPolicy: DEFAULT_CHECKPOINT_POLICY,
    pauseReason: null,
  };

  // 7. Update harness status to running
  await updateHarnessStatus(harnessIssue.id, 'running', cwd);

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  HARNESS RESUMING: ${harnessState.id}`);
  console.log(`  Branch: ${harnessState.gitBranch}`);
  console.log(`  Progress: ${harnessState.featuresCompleted}/${harnessState.featuresTotal} features`);
  console.log(`  Last session: #${harnessState.currentSession}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // 8. Run the harness loop
  await runHarness(harnessState, { cwd, dryRun: options?.dryRun });
}

/**
 * Pause a running harness.
 */
export async function pauseHarness(
  harnessId: string,
  reason: string | undefined,
  cwd: string
): Promise<void> {
  // TODO: Signal the running harness to pause
  // For now, create a pause issue
  console.log(`Pausing harness: ${harnessId}`);
  console.log(`Reason: ${reason || 'No reason provided'}`);
  console.log('Pause signaling not yet implemented.');
}

/**
 * Get status of a harness.
 */
export async function getHarnessStatus(
  harnessId: string | undefined,
  cwd: string
): Promise<void> {
  // Find the harness issue
  const harnessIssue = await getHarnessIssue(harnessId, cwd);
  if (!harnessIssue) {
    if (harnessId) {
      console.log(`❌ Harness not found: ${harnessId}`);
    } else {
      console.log('No active harness found.');
    }
    return;
  }

  // Parse metadata
  const metadata = parseHarnessDescription(harnessIssue.description || '');

  // Get feature counts
  const completedFeatures = await getCompletedFeatures(harnessIssue.id, cwd);
  const pendingFeatures = await getPendingFeatures(harnessIssue.id, cwd);

  // Get checkpoints
  const checkpoints = await getHarnessCheckpoints(harnessIssue.id, cwd);

  // Determine status label
  let statusLabel = harnessIssue.status === 'closed' ? 'COMPLETED' :
                    harnessIssue.status === 'open' ? 'PAUSED' : 'RUNNING';

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  HARNESS STATUS: ${statusLabel}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`  ID: ${harnessIssue.id}`);
  console.log(`  Title: ${harnessIssue.title}`);
  console.log(`  Spec: ${metadata.specFile || 'unknown'}`);
  console.log(`  Started: ${metadata.startedAt || harnessIssue.created_at}`);
  console.log(`───────────────────────────────────────────────────────────────`);
  console.log(`  Features:`);
  console.log(`    Total: ${metadata.featuresTotal}`);
  console.log(`    Completed: ${completedFeatures.length}`);
  console.log(`    Pending: ${pendingFeatures.length}`);
  console.log(`    Progress: ${Math.round((completedFeatures.length / metadata.featuresTotal) * 100)}%`);
  console.log(`───────────────────────────────────────────────────────────────`);
  console.log(`  Checkpoints: ${checkpoints.length}`);
  if (checkpoints.length > 0) {
    console.log(`  Latest: ${checkpoints[0].title}`);
  }
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // List pending features
  if (pendingFeatures.length > 0 && pendingFeatures.length <= 10) {
    console.log('Pending features:');
    for (const feature of pendingFeatures) {
      const statusIcon = feature.status === 'in_progress' ? '◐' : '○';
      console.log(`  ${statusIcon} ${feature.id}: ${feature.title}`);
    }
    console.log('');
  } else if (pendingFeatures.length > 10) {
    console.log(`${pendingFeatures.length} features pending (showing first 10):`);
    for (const feature of pendingFeatures.slice(0, 10)) {
      const statusIcon = feature.status === 'in_progress' ? '◐' : '○';
      console.log(`  ${statusIcon} ${feature.id}: ${feature.title}`);
    }
    console.log('');
  }
}

/**
 * Run multiple sessions in parallel for independent tasks.
 * Uses Promise.all to execute up to maxParallel sessions concurrently.
 */
export async function runParallelSessions(
  issues: BeadsIssue[],
  harnessState: HarnessState,
  checkpointTracker: ReturnType<typeof createCheckpointTracker>,
  options: {
    cwd: string;
    dryRun?: boolean;
    maxParallel?: number;
  }
): Promise<SessionResult[]> {
  const maxParallel = options.maxParallel ?? DEFAULT_SWARM_CONFIG.maxParallelAgents;
  const batchSize = Math.min(issues.length, maxParallel);

  console.log(`\n🐝 Starting swarm: ${batchSize} parallel agents`);

  // Start swarm batch tracking
  const batchId = startSwarmBatch(checkpointTracker);

  // Prepare session promises
  const sessionPromises = issues.slice(0, batchSize).map(async (issue, index) => {
    const agentId = `agent-${index.toString().padStart(3, '0')}`;

    // Register agent
    registerSwarmAgent(checkpointTracker, agentId, issue.id);

    // Mark issue as in progress
    await updateIssueStatus(issue.id, 'in_progress', options.cwd);

    // Build priming context
    const recentCommits = await getRecentCommits(options.cwd, 5);
    const dryContext = await discoverDryContext(issue.title, options.cwd);
    const primingContext: PrimingContext = {
      currentIssue: issue,
      recentCommits,
      lastCheckpoint: null,
      redirectNotes: [],
      sessionGoal: `Complete: ${issue.title}\n\n${issue.description || ''}`,
      existingPatterns: dryContext.existingPatterns,
      relevantFiles: dryContext.relevantFiles,
    };

    console.log(`  [${agentId}] Starting: ${issue.id} - ${issue.title.slice(0, 40)}...`);

    try {
      // Run session
      const result = await runSession(issue, primingContext, {
        cwd: options.cwd,
        dryRun: options.dryRun,
      });

      // Update agent status
      updateSwarmAgentStatus(checkpointTracker, agentId, result);

      // Handle result
      if (result.outcome === 'success') {
        await updateIssueStatus(issue.id, 'closed', options.cwd);
        console.log(`  [${agentId}] ✅ Completed: ${issue.id}`);
      } else {
        console.log(`  [${agentId}] ${getOutcomeIcon(result.outcome)} Failed: ${issue.id} - ${result.outcome}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorResult: SessionResult = {
        issueId: issue.id,
        outcome: 'failure',
        summary: 'Session crashed',
        gitCommit: null,
        contextUsed: 0,
        durationMs: 0,
        error: errorMsg,
        model: null,
      };
      updateSwarmAgentStatus(checkpointTracker, agentId, errorResult);
      console.log(`  [${agentId}] ❌ Error: ${issue.id} - ${errorMsg.slice(0, 50)}`);
      return errorResult;
    }
  });

  // Wait for all sessions to complete
  const results = await Promise.all(sessionPromises);

  // Complete swarm batch
  const swarmProgress = completeSwarmBatch(checkpointTracker);
  if (swarmProgress) {
    console.log('\n' + formatSwarmProgressDisplay(swarmProgress));
  }

  // Record results
  for (const result of results) {
    recordSession(checkpointTracker, result);
  }

  return results;
}

/**
 * Sleep for a given duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
