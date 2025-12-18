/**
 * @create-something/harness
 *
 * Runner: Main orchestration loop for the harness.
 */

import { readFile } from 'node:fs/promises';
import type {
  HarnessState,
  StartOptions,
  Checkpoint,
  CheckpointPolicy,
  PrimingContext,
  DEFAULT_CHECKPOINT_POLICY,
} from './types.js';
import { parseSpec, formatSpecSummary } from './spec-parser.js';
import {
  createIssuesFromFeatures,
  createHarnessIssue,
  getReadyIssues,
  updateIssueStatus,
  getIssue,
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
  resetTracker,
  formatCheckpointDisplay,
  calculateConfidence,
} from './checkpoint.js';
import {
  takeSnapshot,
  checkForRedirects,
  formatRedirectNotes,
  requiresImmediateAction,
  logRedirect,
} from './redirect.js';

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
  options: { cwd: string; dryRun?: boolean }
): Promise<void> {
  const checkpointTracker = createCheckpointTracker();
  let beadsSnapshot = await takeSnapshot(options.cwd);
  let lastCheckpoint: Checkpoint | null = null;
  let redirectNotes: string[] = [];

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  HARNESS RUNNING: ${harnessState.id}`);
  console.log(`  Branch: ${harnessState.gitBranch}`);
  console.log(`  Features: ${harnessState.featuresTotal}`);
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
        lastCheckpoint = await generateCheckpoint(
          checkpointTracker,
          harnessState,
          formatRedirectNotes(redirectCheck.redirects),
          options.cwd
        );
        console.log('\n' + formatCheckpointDisplay(lastCheckpoint));
        resetTracker(checkpointTracker);
        harnessState.lastCheckpoint = lastCheckpoint.id;
      }
    }

    // 2. Get next work item
    const readyIssues = await getReadyIssues(options.cwd);
    const harnessIssues = readyIssues.filter((issue) =>
      issue.labels?.includes(`harness:${harnessState.id}`)
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

    // 5. Handle session result
    recordSession(checkpointTracker, sessionResult);

    if (sessionResult.outcome === 'success') {
      await updateIssueStatus(nextIssue.id, 'closed', options.cwd);
      harnessState.featuresCompleted++;
      harnessState.sessionsCompleted++;
      console.log(`✅ Task completed: ${nextIssue.id}`);
    } else if (sessionResult.outcome === 'failure') {
      // Keep as in_progress for retry, but track failure
      harnessState.featuresFailed++;
      harnessState.sessionsCompleted++;
      console.log(`❌ Task failed: ${nextIssue.id}`);
      if (sessionResult.error) {
        console.log(`   Error: ${sessionResult.error}`);
      }
    } else if (sessionResult.outcome === 'partial') {
      harnessState.sessionsCompleted++;
      console.log(`◐ Task partially completed: ${nextIssue.id}`);
    } else if (sessionResult.outcome === 'context_overflow') {
      harnessState.sessionsCompleted++;
      console.log(`⚠ Context overflow: ${nextIssue.id}`);
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
      lastCheckpoint = await generateCheckpoint(
        checkpointTracker,
        harnessState,
        formatRedirectNotes(redirectCheck.redirects),
        options.cwd
      );
      console.log('\n' + formatCheckpointDisplay(lastCheckpoint));
      resetTracker(checkpointTracker);
      harnessState.lastCheckpoint = lastCheckpoint.id;
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
        lastCheckpoint = await generateCheckpoint(
          checkpointTracker,
          harnessState,
          `Low confidence pause`,
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

  // Final summary
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  HARNESS ${harnessState.status.toUpperCase()}`);
  console.log(`  Sessions: ${harnessState.sessionsCompleted}`);
  console.log(`  Features: ${harnessState.featuresCompleted}/${harnessState.featuresTotal} completed`);
  console.log(`  Failed: ${harnessState.featuresFailed}`);
  if (harnessState.pauseReason) {
    console.log(`  Pause Reason: ${harnessState.pauseReason}`);
  }
  console.log(`═══════════════════════════════════════════════════════════════\n`);
}

/**
 * Resume a paused harness.
 */
export async function resumeHarness(
  harnessId: string,
  cwd: string
): Promise<void> {
  // TODO: Load harness state from Beads issue
  // For now, just log
  console.log(`Resuming harness: ${harnessId}`);
  console.log('Resume functionality not yet implemented.');
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
  // TODO: Read from Beads
  console.log('Status checking not yet implemented.');
}

/**
 * Sleep for a given duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
