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
 *   harness work <issue-id> --full-context   Deep context retrieval mode
 */
async function handleWork(args: string[], cwd: string): Promise<void> {
  const createTitle = parseStringArg(args, '--create');
  const specFile = parseStringArg(args, '--spec');
  const modelOverride = parseStringArg(args, '--model') as 'opus' | 'sonnet' | 'haiku' | undefined;
  const configPath = parseStringArg(args, '--config');
  const dryRun = args.includes('--dry-run');
  const fullContext = args.includes('--full-context');

  // Load harness configuration
  const { config: harnessConfig, configPath: loadedConfigPath } = await loadConfig(configPath, cwd);

  let issue: BeadsIssue | null = null;

  // Mode 1: Create new issue and work on it
  if (createTitle) {
    console.log(`\n🆕 Creating issue: "${createTitle}"\n`);
    const createResult = await createIssue(createTitle, {
      description: 'Created via harness work --create',
      priority: 2,
      type: 'task',
      dryRun,
    }, cwd);
    
    if (dryRun) {
      const preview = createResult as import('./beads.js').IssuePreview;
      console.log('[DRY RUN] Would create issue:');
      console.log(`  ID: ${preview.id || '(will be generated)'}`);
      console.log(`  Title: ${preview.title}`);
      console.log(`  Type: ${preview.type}`);
      console.log(`  Priority: P${preview.priority}`);
      console.log(`  Status: ${preview.status}`);
      if (preview.labels?.length) {
        console.log(`  Labels: ${preview.labels.join(', ')}`);
      }
      if (preview.description) {
        console.log(`  Description: ${preview.description.slice(0, 100)}${preview.description.length > 100 ? '...' : ''}`);
      }
      console.log('\n[DRY RUN] Would then work on this issue.');
      return;
    }
    
    const issueId = createResult as string;
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
${fullContext ? '\n🔎 Full Context Mode: ENABLED (deep context retrieval)' : ''}
`);

  if (dryRun) {
    console.log('[DRY RUN] Would mark in_progress and spawn Claude Code session');
    if (fullContext) {
      console.log('[DRY RUN] Full context mode would search:');
      console.log('  - .claude/rules/ for relevant patterns');
      console.log('  - Beads history for similar past issues');
      console.log('  - Monorepo for related code patterns');
      console.log('  - .io papers for relevant research');
    }
    return;
  }

  // Mark issue in progress
  console.log(`→ Marking ${issue.id} as in_progress...`);
  await updateIssueStatus(issue.id, 'in_progress', cwd);

  // Gather full context if requested
  let fullContextPriming = '';
  if (fullContext) {
    console.log(`→ Gathering full context...`);
    fullContextPriming = await gatherFullContext(issue, cwd);
    console.log(`   Found ${fullContextPriming.split('\n').length} lines of context\n`);
  }

  // Spawn Claude Code session
  console.log(`→ Spawning Claude Code session with ${model}...\n`);

  const primingContext = {
    currentIssue: issue,
    recentCommits: [],
    lastCheckpoint: null,
    redirectNotes: [],
    sessionGoal: `Complete issue ${issue.id}: ${issue.title}`,
    fullContextPriming: fullContext ? fullContextPriming : undefined,
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

/**
 * Gather full context for an issue.
 *
 * Philosophy: Like RoboDev's "minimum viable prompt" approach, let the agent
 * find context instead of requiring the user to specify it. This searches:
 * 1. .claude/rules/ for relevant patterns
 * 2. Beads history for similar past issues
 * 3. Monorepo for related code patterns
 * 4. .io papers for relevant research
 */
async function gatherFullContext(issue: BeadsIssue, cwd: string): Promise<string> {
  const lines: string[] = [];
  const title = issue.title.toLowerCase();
  const description = (issue.description || '').toLowerCase();
  const labels = issue.labels || [];

  lines.push('## Full Context (Auto-Retrieved)');
  lines.push('');
  lines.push('*This context was automatically gathered based on the issue. Use it to inform your approach.*');
  lines.push('');

  // 1. Search .claude/rules/ for relevant patterns
  const rulesContext = await searchRulesForContext(title, description, labels, cwd);
  if (rulesContext) {
    lines.push('### Relevant Patterns from .claude/rules/');
    lines.push('');
    lines.push(rulesContext);
    lines.push('');
  }

  // 2. Search Beads history for similar issues
  const historyContext = await searchBeadsHistory(title, description, cwd);
  if (historyContext) {
    lines.push('### Similar Past Issues');
    lines.push('');
    lines.push(historyContext);
    lines.push('');
  }

  // 3. Infer related code patterns from labels
  const codeContext = inferCodeContext(labels);
  if (codeContext) {
    lines.push('### Related Code Patterns');
    lines.push('');
    lines.push(codeContext);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Search .claude/rules/ for relevant patterns.
 */
async function searchRulesForContext(
  title: string,
  description: string,
  labels: string[],
  cwd: string
): Promise<string | null> {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');

  const rulesDir = join(cwd, '.claude/rules');
  const relevantFiles: { file: string; relevance: number }[] = [];

  // Keywords to match against rule files
  const keywords = extractKeywords(title + ' ' + description);

  try {
    const files = await readdir(rulesDir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = join(rulesDir, file);
      const content = await readFile(filePath, 'utf-8');
      const lower = content.toLowerCase();

      // Calculate relevance score
      let relevance = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          relevance++;
        }
      }

      // Check labels
      for (const label of labels) {
        if (file.includes(label) || lower.includes(label)) {
          relevance += 2;
        }
      }

      if (relevance > 0) {
        relevantFiles.push({ file, relevance });
      }
    }

    // Sort by relevance and take top 3
    relevantFiles.sort((a, b) => b.relevance - a.relevance);
    const topFiles = relevantFiles.slice(0, 3);

    if (topFiles.length === 0) {
      return null;
    }

    const lines: string[] = [];
    for (const { file } of topFiles) {
      lines.push(`- **${file}**: Review this file for relevant patterns`);
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Search Beads history for similar issues.
 */
async function searchBeadsHistory(
  title: string,
  description: string,
  cwd: string
): Promise<string | null> {
  try {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    // Get closed issues
    const { stdout } = await execAsync('bd list --status closed --json', { cwd });
    const closedIssues = JSON.parse(stdout) as BeadsIssue[];

    if (closedIssues.length === 0) {
      return null;
    }

    // Find similar issues by keyword matching
    const keywords = extractKeywords(title + ' ' + description);
    const similar: { issue: BeadsIssue; score: number }[] = [];

    for (const issue of closedIssues) {
      const issueText = (issue.title + ' ' + (issue.description || '')).toLowerCase();
      let score = 0;

      for (const keyword of keywords) {
        if (issueText.includes(keyword)) {
          score++;
        }
      }

      if (score > 0) {
        similar.push({ issue, score });
      }
    }

    // Sort by score and take top 3
    similar.sort((a, b) => b.score - a.score);
    const topSimilar = similar.slice(0, 3);

    if (topSimilar.length === 0) {
      return null;
    }

    const lines: string[] = [];
    for (const { issue } of topSimilar) {
      lines.push(`- **${issue.id}**: ${issue.title}`);
      if (issue.description) {
        lines.push(`  ${issue.description.slice(0, 100)}...`);
      }
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Infer code context from labels.
 */
function inferCodeContext(labels: string[]): string | null {
  const contexts: string[] = [];

  for (const label of labels) {
    const lower = label.toLowerCase();

    if (lower.includes('cloudflare') || lower.includes('d1') || lower.includes('kv')) {
      contexts.push('- Review `cloudflare-patterns.md` for D1/KV best practices');
    }
    if (lower.includes('svelte') || lower.includes('route')) {
      contexts.push('- Review `sveltekit-conventions.md` for routing patterns');
    }
    if (lower.includes('css') || lower.includes('style')) {
      contexts.push('- Review `css-canon.md` for styling guidelines');
    }
    if (lower.includes('security') || lower.includes('auth')) {
      contexts.push('- Review `error-handling-patterns.md` for security patterns');
    }
    if (lower.includes('api') || lower.includes('endpoint')) {
      contexts.push('- Review `sveltekit-conventions.md` for API patterns');
    }
  }

  if (contexts.length === 0) {
    return null;
  }

  return [...new Set(contexts)].join('\n');
}

/**
 * Extract keywords from text for matching.
 */
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful keywords
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our',
    'you', 'your', 'i', 'me', 'my', 'he', 'him', 'his', 'she', 'her',
  ]);

  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
