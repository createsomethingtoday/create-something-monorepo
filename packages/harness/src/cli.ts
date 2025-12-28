#!/usr/bin/env node
/**
 * @create-something/harness
 *
 * CLI Entry Point: Provides `harness` command for running the agent harness.
 *
 * Usage:
 *   harness start <spec-file> [--checkpoint-every N] [--max-hours M] [--dry-run]
 *   harness pause [--reason "..."]
 *   harness resume [--harness-id <id>]
 *   harness status [--harness-id <id>]
 *   harness stop
 */

import { initializeHarness, runHarness, resumeHarness, pauseHarness, getHarnessStatus, selectModelForTask } from './runner.js';
import { getIssue, createIssue, updateIssueStatus } from './beads.js';
import { runSession } from './session.js';
import type { StartOptions, PauseOptions, ResumeOptions, ReviewPipelineConfig, ReviewerType, SwarmConfig, BeadsIssue, HarnessConfig } from './types.js';
import { DEFAULT_REVIEW_PIPELINE_CONFIG, DEFAULT_SWARM_CONFIG, DEFAULT_HARNESS_CONFIG } from './types.js';
import { loadConfig, formatConfigDisplay } from './config/index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const cwd = process.cwd();

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'start':
        await handleStart(args.slice(1), cwd);
        break;
      case 'pause':
        await handlePause(args.slice(1), cwd);
        break;
      case 'resume':
        await handleResume(args.slice(1), cwd);
        break;
      case 'status':
        await handleStatus(args.slice(1), cwd);
        break;
      case 'stop':
        await handleStop(args.slice(1), cwd);
        break;
      case 'work':
        await handleWork(args.slice(1), cwd);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
CREATE SOMETHING Harness - Autonomous agent orchestration with Beads oversight

USAGE:
  harness <command> [options]

COMMANDS:
  work <issue-id>     Work on a single issue (unified entry point)
  work --create "T"   Create new issue and work on it
  start <spec-file>   Start a new harness run from a markdown PRD spec
  pause               Pause the running harness after current session
  resume              Resume a paused harness
  status              Show harness status
  stop                Stop the harness immediately

WORK OPTIONS:
  --create "title"    Create new issue with title and work on it
  --model <m>         Override model selection (opus|sonnet|haiku)
  --config <file>     Use custom harness config (default: harness.config.yaml)
  --dry-run           Show what would happen without executing

OPTIONS:
  --checkpoint-every N   Create checkpoint every N sessions (default: 3)
  --max-hours M          Create checkpoint every M hours (default: 4)
  --config <file>        Use custom harness configuration file
  --dry-run              Print what would happen without executing
  --reason "..."         Reason for pausing (with pause command)
  --harness-id <id>      Specify harness ID (for resume/status)

PEER REVIEW OPTIONS:
  --reviewers <list>     Comma-separated reviewers (default: security,architecture,quality)
  --no-review            Disable peer review at checkpoints
  --review-block-high    Block on high findings (default: block on critical only)

SWARM OPTIONS:
  --swarm                Enable parallel swarm mode (default: disabled)
  --max-agents N         Max parallel agents in swarm (default: 5)
  --min-tasks N          Min independent tasks to trigger swarm (default: 3)

EXAMPLES:
  harness start specs/my-project.md
  harness start specs/api.md --checkpoint-every 5 --dry-run
  harness pause --reason "Need to review auth approach"
  harness resume
  harness status

WORKFLOW:
  1. Write a markdown PRD spec
  2. Run 'harness start <spec>'
  3. Check progress with 'bd progress'
  4. Redirect with 'bd update <id> --priority P0' if needed
  5. Pause/resume as needed

PHILOSOPHY:
  The harness runs autonomously. Humans engage through progress reports—
  reactive steering rather than proactive management.
  "Weniger, aber besser." — Dieter Rams
`);
}

async function handleStart(args: string[], cwd: string): Promise<void> {
  const specFile = args.find((arg) => !arg.startsWith('--'));
  if (!specFile) {
    console.error('Error: spec file required');
    console.error('Usage: harness start <spec-file> [options]');
    process.exit(1);
  }

  const options: StartOptions = {
    specFile,
    checkpointEvery: parseIntArg(args, '--checkpoint-every', 3),
    maxHours: parseIntArg(args, '--max-hours', 4),
    dryRun: args.includes('--dry-run'),
  };

  // Load harness configuration
  const configPath = parseStringArg(args, '--config');
  const { config: harnessConfig, configPath: loadedConfigPath } = await loadConfig(configPath, cwd);

  console.log(formatConfigDisplay(harnessConfig, loadedConfigPath));

  // Parse review configuration
  const noReview = args.includes('--no-review');
  const reviewConfig = noReview ? null : buildReviewConfig(args);

  // Parse swarm configuration
  const swarmConfig = buildSwarmConfig(args);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   CREATE SOMETHING HARNESS                     ║
║                                                               ║
║  "The harness recedes into transparent operation.             ║
║   Review progress. Redirect when needed."                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const { harnessState, featureMap } = await initializeHarness(options, cwd);

  if (options.dryRun) {
    console.log('\n[DRY RUN] Would start harness with the above configuration.');
    console.log('Feature mapping:');
    for (const [featureId, issueId] of featureMap) {
      console.log(`  ${featureId} → ${issueId}`);
    }
    if (reviewConfig) {
      const enabledReviewers = reviewConfig.reviewers.filter(r => r.enabled).map(r => r.id);
      console.log(`\nPeer review: ${enabledReviewers.join(', ')}`);
      console.log(`Block on critical: ${reviewConfig.blockOnCritical}`);
      console.log(`Block on high: ${reviewConfig.blockOnHigh}`);
    } else {
      console.log('\nPeer review: disabled');
    }
    if (swarmConfig.enabled) {
      console.log(`\nSwarm mode: ENABLED`);
      console.log(`Max agents: ${swarmConfig.maxParallelAgents}`);
      console.log(`Min tasks: ${swarmConfig.minTasksForSwarm}`);
    } else {
      console.log('\nSwarm mode: DISABLED');
    }
    return;
  }

  await runHarness(harnessState, {
    cwd,
    dryRun: options.dryRun,
    config: harnessConfig,
    reviewConfig: reviewConfig ?? undefined,
    swarmConfig,
  });
}

async function handlePause(args: string[], cwd: string): Promise<void> {
  const reason = parseStringArg(args, '--reason');
  const harnessId = parseStringArg(args, '--harness-id');

  // TODO: Find active harness if not specified
  if (!harnessId) {
    console.log('Finding active harness...');
  }

  await pauseHarness(harnessId || 'active', reason, cwd);
}

async function handleResume(args: string[], cwd: string): Promise<void> {
  const harnessId = parseStringArg(args, '--harness-id');
  const dryRun = args.includes('--dry-run');

  await resumeHarness(harnessId, cwd, { dryRun });
}

async function handleStatus(args: string[], cwd: string): Promise<void> {
  const harnessId = parseStringArg(args, '--harness-id');
  await getHarnessStatus(harnessId, cwd);
}

async function handleStop(args: string[], cwd: string): Promise<void> {
  console.log('Stop command not yet implemented.');
  console.log('Use Ctrl+C to stop the harness, or create a pause issue.');
}

/**
 * Handle the 'work' command - unified entry point for working on issues.
 *
 * Usage:
 *   harness work <issue-id>              Work on existing issue
 *   harness work --create "Title"        Create and work on new issue
 *   harness work --spec <file>           Parse spec and work through issues
 */
async function handleWork(args: string[], cwd: string): Promise<void> {
  const createTitle = parseStringArg(args, '--create');
  const specFile = parseStringArg(args, '--spec');
  const modelOverride = parseStringArg(args, '--model') as 'opus' | 'sonnet' | 'haiku' | undefined;
  const configPath = parseStringArg(args, '--config');
  const dryRun = args.includes('--dry-run');

  // Load harness configuration
  const { config: harnessConfig, configPath: loadedConfigPath } = await loadConfig(configPath, cwd);

  let issue: BeadsIssue | null = null;

  // Mode 1: Create new issue and work on it
  if (createTitle) {
    console.log(`\n🆕 Creating issue: "${createTitle}"\n`);
    if (dryRun) {
      console.log('[DRY RUN] Would create issue and work on it');
      return;
    }
    const issueId = await createIssue(createTitle, {
      description: 'Created via harness work --create',
      priority: 2,
      type: 'task',
    }, cwd);
    issue = await getIssue(issueId, cwd);
  }
  // Mode 2: Parse spec file and work through issues
  else if (specFile) {
    console.log(`\n📋 Spec mode not yet integrated with work command.`);
    console.log(`   Use: harness start ${specFile}`);
    return;
  }
  // Mode 3: Work on existing issue
  else {
    const issueId = args.find((arg) => !arg.startsWith('--'));
    if (!issueId) {
      console.error('Error: issue ID required');
      console.error('Usage: harness work <issue-id> [--model opus|sonnet|haiku]');
      console.error('       harness work --create "Task title"');
      process.exit(1);
    }
    issue = await getIssue(issueId, cwd);
    if (!issue) {
      console.error(`Error: Issue not found: ${issueId}`);
      process.exit(1);
    }
  }

  if (!issue) {
    console.error('Error: Could not resolve issue');
    process.exit(1);
  }

  // Detect complexity and select model (uses config patterns)
  const detectedModel = selectModelForTask(issue, harnessConfig);
  const model = modelOverride || detectedModel;

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                      HARNESS WORK                              ║
╚═══════════════════════════════════════════════════════════════╝

📋 Issue: ${issue.id}
📝 Title: ${issue.title}
🎯 Priority: P${issue.priority}
🏷️  Labels: ${issue.labels?.join(', ') || 'none'}

🔍 Complexity Detection:
   Detected model: ${detectedModel}
   ${modelOverride ? `Override: ${modelOverride}` : ''}
   Using: ${model.toUpperCase()}
`);

  if (dryRun) {
    console.log('[DRY RUN] Would mark in_progress and spawn Claude Code session');
    return;
  }

  // Mark issue in progress
  console.log(`→ Marking ${issue.id} as in_progress...`);
  await updateIssueStatus(issue.id, 'in_progress', cwd);

  // Spawn Claude Code session
  console.log(`→ Spawning Claude Code session with ${model}...\n`);

  const primingContext = {
    currentIssue: issue,
    recentCommits: [],
    lastCheckpoint: null,
    redirectNotes: [],
    sessionGoal: `Complete issue ${issue.id}: ${issue.title}`,
  };

  const result = await runSession(issue, primingContext, {
    cwd,
    model,
  });

  // Handle result
  if (result.outcome === 'success') {
    console.log(`\n✅ Session completed successfully`);
    if (result.gitCommit) {
      console.log(`   Commit: ${result.gitCommit}`);
    }
    console.log(`   Duration: ${Math.round(result.durationMs / 1000)}s`);
  } else {
    console.log(`\n⚠️  Session ended with: ${result.outcome}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
}

function parseIntArg(args: string[], flag: string, defaultValue: number): number {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return defaultValue;
  }
  const value = parseInt(args[index + 1], 10);
  return isNaN(value) ? defaultValue : value;
}

function parseStringArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }
  return args[index + 1];
}

/**
 * Build review pipeline configuration from CLI args.
 */
function buildReviewConfig(args: string[]): ReviewPipelineConfig {
  // Start with default config
  const config: ReviewPipelineConfig = { ...DEFAULT_REVIEW_PIPELINE_CONFIG };

  // Parse --reviewers flag
  const reviewersArg = parseStringArg(args, '--reviewers');
  if (reviewersArg) {
    const requestedTypes = reviewersArg.split(',').map(s => s.trim().toLowerCase()) as ReviewerType[];
    const validTypes: ReviewerType[] = ['security', 'architecture', 'quality', 'custom'];

    // Disable all reviewers first
    for (const reviewer of config.reviewers) {
      reviewer.enabled = false;
    }

    // Enable only requested reviewers
    for (const type of requestedTypes) {
      if (!validTypes.includes(type)) {
        console.warn(`Warning: Unknown reviewer type '${type}', skipping.`);
        continue;
      }
      const reviewer = config.reviewers.find(r => r.type === type);
      if (reviewer) {
        reviewer.enabled = true;
      }
    }
  }

  // Parse --review-block-high flag
  if (args.includes('--review-block-high')) {
    config.blockOnHigh = true;
  }

  return config;
}

/**
 * Build swarm configuration from CLI args.
 */
function buildSwarmConfig(args: string[]): SwarmConfig {
  const config: SwarmConfig = { ...DEFAULT_SWARM_CONFIG };

  // Enable swarm if --swarm flag is present
  if (args.includes('--swarm')) {
    config.enabled = true;
  }

  // Parse --max-agents flag
  const maxAgents = parseIntArg(args, '--max-agents', DEFAULT_SWARM_CONFIG.maxParallelAgents);
  config.maxParallelAgents = maxAgents;

  // Parse --min-tasks flag
  const minTasks = parseIntArg(args, '--min-tasks', DEFAULT_SWARM_CONFIG.minTasksForSwarm);
  config.minTasksForSwarm = minTasks;

  return config;
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
