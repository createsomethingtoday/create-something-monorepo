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
  HarnessConfig,
} from './types.js';
import { DEFAULT_CHECKPOINT_POLICY, DEFAULT_FAILURE_HANDLING_CONFIG, DEFAULT_SWARM_CONFIG, DEFAULT_REVIEW_PIPELINE_CONFIG, DEFAULT_HARNESS_CONFIG } from './types.js';
import { loadConfig, getModelFromConfig, formatConfigDisplay } from './config/index.js';
import { parse as parseMarkdownSpec, formatSpecSummary } from './spec-parser.js';
import { parseYamlSpec } from './yaml-spec-parser.js';
import type { ParsedSpec } from './types.js';
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
  parseCheckpointMetadata,
  parseCheckpointIssues,
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
  getEffectiveModel,
  recordEscalationSuccess,
  formatEscalationLearning,
} from './failure-handler.js';
import { annotateIssueEscalation } from './beads.js';

/**
 * Type guard to check if a checkpoint has review data.
 */
function isReviewedCheckpoint(checkpoint: Checkpoint | ReviewedCheckpoint): checkpoint is ReviewedCheckpoint {
  return 'hasReview' in checkpoint && checkpoint.hasReview === true;
}

/**
 * Select the appropriate model for a task based on its characteristics.
 *
 * Cost optimization: Use cheaper models for simpler tasks.
 * - Haiku (~5% of Opus cost): Simple mechanical tasks
 * - Sonnet (~20% of Opus cost): Standard implementations
 * - Opus (baseline): Complex reasoning, architecture, novel work
 *
 * @param issue - The issue to select a model for
 * @param config - Optional harness config (uses defaults if not provided)
 */
export function selectModelForTask(
  issue: BeadsIssue,
  config: HarnessConfig = DEFAULT_HARNESS_CONFIG
): 'opus' | 'sonnet' | 'haiku' {
  const title = issue.title + ' ' + (issue.description || '');
  const labels = issue.labels || [];

  // Use config-based model selection
  return getModelFromConfig(config, title, labels);
}

/**
 * Initialize a new harness run.
 */
export async function initializeHarness(
  options: StartOptions,
  cwd: string
): Promise<{ harnessState: HarnessState; featureMap: Map<string, string> }> {
  console.log(`\n🚀 Initializing harness from spec: ${options.specFile}\n`);

  // Read and parse spec (detect format by extension)
  const specContent = await readFile(options.specFile, 'utf-8');
  const isYaml = options.specFile.endsWith('.yaml') || options.specFile.endsWith('.yml');
  const spec: ParsedSpec = isYaml ? parseYamlSpec(specContent) : parseMarkdownSpec(specContent);

  console.log(formatSpecSummary(spec));
  console.log(`\nParsed ${spec.features.length} features from spec.\n`);

  const checkpointPolicy: CheckpointPolicy = {
    afterSessions: options.checkpointEvery || 3,
    afterHours: options.maxHours || 4,
    onError: true,
    onConfidenceBelow: 0.7,
    onRedirect: true,
  };

  // Dry run: skip creating real artifacts
  if (options.dryRun) {
    const featureMap = new Map<string, string>();
    for (const feature of spec.features) {
      featureMap.set(feature.id, `(dry-run-${feature.id})`);
    }

    const harnessState: HarnessState = {
      id: '(dry-run)',
      status: 'running',
      specFile: options.specFile,
      gitBranch: '(dry-run)',
      startedAt: new Date().toISOString(),
      currentSession: 0,
      sessionsCompleted: 0,
      featuresTotal: spec.features.length,
      featuresCompleted: 0,
      featuresFailed: 0,
      lastCheckpoint: null,
      checkpointPolicy,
      pauseReason: null,
      totalCost: 0,
      lastSessionId: null,
    };

    return { harnessState, featureMap };
  }

  // Create harness issue
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
    totalCost: 0,
    lastSessionId: null,
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
    swarmConfig?: SwarmConfig;
    /** Path to harness config file, or explicit config object */
    config?: string | HarnessConfig;
  }
): Promise<void> {
  const checkpointTracker = createCheckpointTracker();
  const failureTracker = createFailureTracker();

  // Load harness configuration
  let harnessConfig: HarnessConfig;
  let configPath: string | null = null;

  if (typeof options.config === 'string') {
    // Load from file path
    const loaded = await loadConfig(options.config, options.cwd);
    harnessConfig = loaded.config;
    configPath = loaded.configPath;
  } else if (options.config) {
    // Use provided config object
    harnessConfig = options.config;
  } else {
    // Auto-discover or use defaults
    const loaded = await loadConfig(undefined, options.cwd);
    harnessConfig = loaded.config;
    configPath = loaded.configPath;
  }

  // Use config values for harness options (config takes precedence)
  const failureConfig = options.failureConfig ?? harnessConfig.failureHandling;
  const reviewConfig = options.reviewConfig ?? (harnessConfig.reviewers.enabled ? {
    enabled: harnessConfig.reviewers.enabled,
    minConfidenceToAdvance: harnessConfig.reviewers.minConfidenceToAdvance,
    blockOnCritical: harnessConfig.reviewers.blockOnCritical,
    blockOnHigh: harnessConfig.reviewers.blockOnHigh,
    maxParallelReviewers: 3,
    reviewerTimeoutMs: 5 * 60 * 1000,
    reviewers: harnessConfig.reviewers.reviewers.map(r => ({
      id: r.id,
      type: r.type,
      enabled: r.enabled,
      canBlock: r.canBlock,
    })),
  } : null);
  const swarmConfig = options.swarmConfig ?? harnessConfig.swarm;

  let beadsSnapshot = await takeSnapshot(options.cwd);
  let lastCheckpoint: Checkpoint | ReviewedCheckpoint | null = null;
  let redirectNotes: string[] = [];

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  HARNESS RUNNING: ${harnessState.id}`);
  console.log(`  Branch: ${harnessState.gitBranch}`);
  console.log(`  Features: ${harnessState.featuresTotal}`);
  if (configPath) {
    console.log(`  Config: ${configPath}`);
  } else {
    console.log(`  Config: Built-in CREATE SOMETHING defaults`);
  }
  console.log(`  Failure Handling: retry=${failureConfig.maxRetries}, continue=${failureConfig.continueOnFailure}`);
  if (reviewConfig?.enabled) {
    const reviewerIds = reviewConfig.reviewers.filter(r => r.enabled).map(r => r.id);
    console.log(`  Peer Review: ${reviewerIds.join(', ')}`);
  }
  if (swarmConfig.enabled) {
    console.log(`  Swarm Mode: ENABLED (max ${swarmConfig.maxParallelAgents} agents, min ${swarmConfig.minTasksForSwarm} tasks)`);
  } else {
    console.log(`  Swarm Mode: DISABLED`);
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
      // Create checkpoint before pausing to preserve full context
      if (checkpointTracker.sessionsResults.length > 0) {
        console.log(`\n📊 Creating checkpoint before pause...`);
        lastCheckpoint = await generateReviewedCheckpoint(
          checkpointTracker,
          harnessState,
          `Paused: ${redirectCheck.pauseReason}`,
          reviewConfig,
          options.cwd
        );
        console.log('\n' + formatCheckpointDisplay(lastCheckpoint));
        resetTracker(checkpointTracker);
        harnessState.lastCheckpoint = lastCheckpoint.id;
      }

      harnessState.status = 'paused';
      harnessState.pauseReason = redirectCheck.pauseReason;
      console.log(`\n⏸ Harness paused: ${redirectCheck.pauseReason}`);
      console.log(`\nTo resume: bd work --resume ${harnessState.id}`);
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

    // 2. Get next work item from pending features for this harness
    // Note: We use getPendingFeatures() instead of getReadyIssues() because
    // bd ready --json doesn't include harness-created feature issues
    const pendingFeatures = await getPendingFeatures(harnessState.id, options.cwd);

    if (pendingFeatures.length === 0) {
      // No more work
      harnessState.status = 'completed';
      console.log('\n✅ All tasks completed!');
      break;
    }

    // 3. Detect independent tasks and decide on swarm mode
    const openFeatures = pendingFeatures.filter((issue) => issue.status === 'open');
    const independentTasks = detectIndependentTasks(openFeatures);

    // Check if swarm mode should be used
    const shouldUseSwarm = swarmConfig.enabled &&
      independentTasks.length >= swarmConfig.minTasksForSwarm;

    if (shouldUseSwarm) {
      // Run parallel swarm session
      console.log(`\n🐝 Swarm mode: detected ${independentTasks.length} independent tasks`);
      const swarmResults = await runParallelSessions(
        independentTasks,
        harnessState,
        checkpointTracker,
        {
          cwd: options.cwd,
          dryRun: options.dryRun,
          maxParallel: swarmConfig.maxParallelAgents,
          harnessConfig,
        }
      );

      // Handle swarm results with failure handling
      for (const result of swarmResults) {
        if (result.outcome === 'success') {
          harnessState.featuresCompleted++;
        } else {
          const decision = makeFailureDecision(result, failureTracker, failureConfig);
          console.log(`${getOutcomeIcon(result.outcome)} ${result.issueId}: ${result.outcome}`);
          console.log(`   Decision: ${decision.action} - ${decision.reason}`);

          if (decision.action === 'skip' || decision.action === 'pause' || decision.action === 'escalate') {
            harnessState.featuresFailed++;
          }
        }
        harnessState.sessionsCompleted++;
      }

      // Create swarm checkpoint
      const swarmCheckpoint = await generateSwarmCheckpoint(
        checkpointTracker,
        harnessState,
        redirectNotes.length > 0 ? redirectNotes.join('\n') : null,
        options.cwd
      );
      console.log('\n' + formatCheckpointDisplay(swarmCheckpoint));
      resetTracker(checkpointTracker);
      harnessState.lastCheckpoint = swarmCheckpoint.id;

      // Clear redirect notes
      redirectNotes = [];

      // Continue to next iteration
      if (!options.dryRun) {
        await sleep(2000);
      }
      continue;
    }

    // Fall back to sequential mode for single task or when swarm disabled
    // BUG FIX: Use independentTasks to respect dependency order, not openFeatures
    const nextIssue = independentTasks.length > 0
      ? independentTasks.sort((a, b) => (a.priority || 2) - (b.priority || 2))[0]
      : pendingFeatures.filter(f => f.status !== 'closed').sort((a, b) => (a.priority || 2) - (b.priority || 2))[0];
    console.log(`\n📋 Next task: ${nextIssue.id} - ${nextIssue.title}`);

    // Mark as in progress
    await updateIssueStatus(nextIssue.id, 'in_progress', options.cwd);

    // 4. Build priming context with DRY discovery
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

    // 5. Run session with cost-optimized model selection + escalation
    harnessState.currentSession++;
    const heuristicModel = selectModelForTask(nextIssue, harnessConfig);
    const { model, escalated, reason: modelReason } = getEffectiveModel(
      failureTracker,
      nextIssue.id,
      heuristicModel
    );
    if (escalated) {
      console.log(`\n🔄 Model escalated: ${heuristicModel} → ${model}`);
      console.log(`   Reason: ${modelReason}`);
    }
    console.log(`\n🤖 Starting session #${harnessState.currentSession} [${model}]...`);

    const sessionResult = await runSession(nextIssue, primingContext, {
      cwd: options.cwd,
      dryRun: options.dryRun,
      model,
      resumeSessionId: harnessState.lastSessionId || undefined,
    });

    // 6. Handle session result with graceful failure handling
    recordSession(checkpointTracker, sessionResult);

    // Update totalCost aggregation
    if (sessionResult.costUsd) {
      harnessState.totalCost += sessionResult.costUsd;
    }

    // Update lastSessionId for session continuity
    if (sessionResult.sessionId) {
      harnessState.lastSessionId = sessionResult.sessionId;
      console.log(`  📎 Session ID saved for continuation: ${sessionResult.sessionId.substring(0, 12)}...`);
    }

    if (sessionResult.outcome === 'success') {
      // Check if this was a successful retry
      const attemptCount = getAttemptCount(failureTracker, nextIssue.id);
      if (attemptCount > 0) {
        recordSuccessfulRetry(failureTracker, nextIssue.id);
        console.log(`✅ Task completed on retry (attempt ${attemptCount + 1}): ${nextIssue.id}`);
      } else {
        console.log(`✅ Task completed: ${nextIssue.id}`);
      }

      // Record escalation learning if model was escalated
      if (escalated && heuristicModel !== 'opus') {
        const learning = recordEscalationSuccess(
          failureTracker,
          nextIssue,
          heuristicModel as 'sonnet' | 'haiku',
          model === 'opus'
        );
        console.log(`📚 Learning recorded: ${heuristicModel} → ${model} for "${nextIssue.title.slice(0, 40)}..."`);

        // Annotate the issue with learning for future pattern refinement
        if (!options.dryRun) {
          await annotateIssueEscalation(
            nextIssue.id,
            formatEscalationLearning(learning),
            options.cwd
          );
        }
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

    // 7. Check checkpoint policy
    const checkpointCheck = shouldCreateCheckpoint(
      checkpointTracker,
      harnessState.checkpointPolicy,
      sessionResult,
      redirectNotes.length > 0
    );

    if (checkpointCheck.create) {
      console.log(`\n📊 Creating checkpoint: ${checkpointCheck.reason}`);
      lastCheckpoint = await generateReviewedCheckpoint(
        checkpointTracker,
        harnessState,
        redirectNotes.length > 0 ? redirectNotes.join('\n') : null,
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

    // 8. Check confidence threshold
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
 * Detect independent tasks that can run in parallel.
 * A task is independent if it has no dependencies on other pending tasks.
 */
function detectIndependentTasks(issues: BeadsIssue[]): BeadsIssue[] {
  if (issues.length === 0) return [];

  // Create a map of issue IDs for quick lookup
  const issueIds = new Set(issues.map(i => i.id));

  // Filter for issues with no dependencies on other pending issues
  return issues.filter(issue => {
    const deps = issue.dependencies || [];

    // Check if this issue has any dependencies on other pending issues
    const hasBlockingDeps = deps.some(dep => {
      // Only consider "blocks" dependencies
      if (dep.type !== 'blocks') return false;

      // Check if the dependency is in the pending set
      return issueIds.has(dep.depends_on_id);
    });

    return !hasBlockingDeps;
  });
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
  let restoredTotalCost = 0;
  let restoredLastSessionId: string | null = null;

  if (checkpoints.length > 0) {
    const latestCheckpoint = checkpoints[0];
    lastCheckpointId = latestCheckpoint.id;
    const match = latestCheckpoint.title.match(/Checkpoint #(\d+)/);
    if (match) {
      lastSessionNumber = parseInt(match[1], 10);
    }

    // Parse checkpoint metadata to restore totalCost and lastSessionId
    const checkpointMeta = parseCheckpointMetadata(latestCheckpoint.description || '');
    if (checkpointMeta.totalCost !== undefined) {
      restoredTotalCost = checkpointMeta.totalCost;
      console.log(`Restored total cost from checkpoint: $${restoredTotalCost.toFixed(4)}`);
    }
    if (checkpointMeta.lastSessionId) {
      restoredLastSessionId = checkpointMeta.lastSessionId;
      console.log(`Restored session ID for continuation: ${restoredLastSessionId.substring(0, 12)}...`);
    }

    // Parse checkpoint issue lists to detect state deltas
    const checkpointIssues = parseCheckpointIssues(latestCheckpoint.description || '');

    // Build current state sets for comparison
    const currentCompletedSet = new Set(completedFeatures.map(f => f.id));
    const currentPendingSet = new Set(pendingFeatures.map(f => f.id));

    // Detect deltas: issues completed since checkpoint
    const newCompletions = Array.from(currentCompletedSet).filter(
      id => !checkpointIssues.completed.includes(id)
    );

    // Detect deltas: issues that were completed but now aren't (reopened)
    const reopened = checkpointIssues.completed.filter(
      id => !currentCompletedSet.has(id)
    );

    // Log discrepancies for visibility
    if (newCompletions.length > 0) {
      console.log(`\n⚠ State delta: ${newCompletions.length} issue(s) completed since checkpoint:`);
      for (const id of newCompletions) {
        console.log(`  ✓ ${id}`);
      }
    }

    if (reopened.length > 0) {
      console.log(`\n⚠ State delta: ${reopened.length} issue(s) reopened since checkpoint:`);
      for (const id of reopened) {
        console.log(`  ↻ ${id}`);
      }
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
    totalCost: restoredTotalCost,
    lastSessionId: restoredLastSessionId,
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
    harnessConfig?: HarnessConfig;
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

    // Select model for cost optimization (uses config patterns)
    const model = selectModelForTask(issue, options.harnessConfig ?? DEFAULT_HARNESS_CONFIG);
    console.log(`  [${agentId}] Starting [${model}]: ${issue.id} - ${issue.title.slice(0, 40)}...`);

    try {
      // Run session with selected model
      const result = await runSession(issue, primingContext, {
        cwd: options.cwd,
        dryRun: options.dryRun,
        model,
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
        sessionId: null,
        costUsd: null,
        numTurns: null,
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

  // Record results and aggregate costs
  for (const result of results) {
    recordSession(checkpointTracker, result);
    if (result.costUsd) {
      harnessState.totalCost += result.costUsd;
    }
  }

  return results;
}

/**
 * Sleep for a given duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
