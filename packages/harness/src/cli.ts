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

import { initializeHarness, runHarness, resumeHarness, pauseHarness, getHarnessStatus } from './runner.js';
import type { StartOptions, PauseOptions, ResumeOptions } from './types.js';

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
  start <spec-file>   Start a new harness run from a markdown PRD spec
  pause               Pause the running harness after current session
  resume              Resume a paused harness
  status              Show harness status
  stop                Stop the harness immediately

OPTIONS:
  --checkpoint-every N   Create checkpoint every N sessions (default: 3)
  --max-hours M          Create checkpoint every M hours (default: 4)
  --dry-run              Print what would happen without executing
  --reason "..."         Reason for pausing (with pause command)
  --harness-id <id>      Specify harness ID (for resume/status)

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
    return;
  }

  await runHarness(harnessState, { cwd, dryRun: options.dryRun });
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

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
