import {
  createAgencyOpsSuggestionTasks,
  loadAgencyOpsLiveSnapshot,
  loadSnapshotFile,
  writeSnapshot
} from './live-snapshot.js';
import {
  type AgencyOpsSnapshot,
  type AgencyOpsFinding,
  formatAgencyOpsFindingsMarkdown,
  reconcileAgencyOpsSnapshot,
  sampleAgencyOpsSnapshot
} from './reconciliation.js';

type CliOptions = {
  format: 'json' | 'markdown';
  inputPath: string | null;
  live: boolean;
  maxSuggestions: number;
  sample: boolean;
  snapshotOutPath: string | null;
  staleReviewDays: number;
  writeSuggestions: boolean;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = await readSnapshot(options);
  const findings = reconcileAgencyOpsSnapshot(snapshot, {
    staleReviewDays: options.staleReviewDays
  });
  let suggestionResult: Awaited<ReturnType<typeof createAgencyOpsSuggestionTasks>> | null = null;

  if (options.snapshotOutPath) {
    await writeSnapshot(options.snapshotOutPath, snapshot);
  }

  if (options.writeSuggestions) {
    suggestionResult = await createAgencyOpsSuggestionTasks(findings, {
      maxSuggestions: options.maxSuggestions,
      ownerUserId: readOptionalEnv('NOTION_AGENCY_OPS_OWNER_USER_ID'),
      tasksDatabaseId: readOptionalEnv('NOTION_AGENCY_OPS_TASKS_DATABASE_ID') ?? undefined,
      workstreamId: readOptionalEnv('NOTION_AGENCY_OPS_WORKSTREAM_ID')
    });
  }

  if (options.format === 'json') {
    console.log(
      JSON.stringify(
        {
          findingCount: findings.length,
          findings,
          snapshotOutPath: options.snapshotOutPath,
          suggestionResult
        },
        null,
        2
      )
    );
    return;
  }

  console.log(formatAgencyOpsFindingsMarkdown(findings));
  printWriteSummary(findings, options, suggestionResult);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    format: 'markdown',
    inputPath: null,
    live: false,
    maxSuggestions: 10,
    sample: false,
    snapshotOutPath: null,
    staleReviewDays: 7,
    writeSuggestions: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case '--':
        break;
      case '--format': {
        const value = readNextArg(args, ++index, '--format');
        if (value !== 'json' && value !== 'markdown') {
          throw new Error('--format must be "json" or "markdown".');
        }
        options.format = value;
        break;
      }
      case '--input':
        options.inputPath = readNextArg(args, ++index, '--input');
        break;
      case '--live':
        options.live = true;
        break;
      case '--max-suggestions': {
        const value = Number(readNextArg(args, ++index, '--max-suggestions'));
        if (!Number.isFinite(value) || value < 1) {
          throw new Error('--max-suggestions must be a positive number.');
        }
        options.maxSuggestions = Math.trunc(value);
        break;
      }
      case '--sample':
        options.sample = true;
        break;
      case '--snapshot-out':
        options.snapshotOutPath = readNextArg(args, ++index, '--snapshot-out');
        break;
      case '--stale-review-days': {
        const value = Number(readNextArg(args, ++index, '--stale-review-days'));
        if (!Number.isFinite(value) || value < 1) {
          throw new Error('--stale-review-days must be a positive number.');
        }
        options.staleReviewDays = Math.trunc(value);
        break;
      }
      case '--write-suggestions':
        options.writeSuggestions = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const inputModes = [options.sample, options.live, Boolean(options.inputPath)].filter(Boolean).length;
  if (inputModes === 0) {
    throw new Error('Provide --sample, --live, or --input <snapshot.json>.');
  }

  if (inputModes > 1) {
    throw new Error('Use only one of --sample, --live, or --input.');
  }

  return options;
}

async function readSnapshot(options: CliOptions): Promise<AgencyOpsSnapshot> {
  if (options.sample) return sampleAgencyOpsSnapshot();
  if (options.live) {
    return loadAgencyOpsLiveSnapshot({
      databaseIds: {
        deliverables: readOptionalEnv('NOTION_AGENCY_OPS_DELIVERABLES_DATABASE_ID') ?? undefined,
        engagements: readOptionalEnv('NOTION_AGENCY_OPS_ENGAGEMENTS_DATABASE_ID') ?? undefined,
        tasks: readOptionalEnv('NOTION_AGENCY_OPS_TASKS_DATABASE_ID') ?? undefined
      },
      linearApiKey: readOptionalEnv('LINEAR_API_KEY') ?? undefined,
      linearApiUrl: readOptionalEnv('LINEAR_API_URL') ?? undefined,
      linearPageSize: readNumberEnv('LINEAR_SYNC_PAGE_SIZE') ?? undefined,
      linearTeamKey: readOptionalEnv('LINEAR_TEAM_KEY') ?? undefined,
      notionToken: readOptionalEnv('NOTION_API_TOKEN') ?? undefined
    });
  }

  const inputPath = options.inputPath;
  if (!inputPath) {
    throw new Error('Missing input path.');
  }

  return loadSnapshotFile(inputPath);
}

function readNextArg(args: string[], index: number, label: string): string {
  const value = args[index];
  if (!value) throw new Error(`${label} requires a value.`);
  return value;
}

function printHelp(): void {
  console.log(`Usage:
  pnpm reconcile:agency-ops -- --sample
  pnpm reconcile:agency-ops -- --sample --format json
  pnpm reconcile:agency-ops -- --live --snapshot-out agency-ops-snapshot.json
  pnpm reconcile:agency-ops -- --input snapshot.json --stale-review-days 7
  pnpm reconcile:agency-ops -- --input snapshot.json --write-suggestions --max-suggestions 5

Live mode env:
  NOTION_API_TOKEN
  LINEAR_API_KEY
  LINEAR_TEAM_KEY=CRE
  NOTION_AGENCY_OPS_TASKS_DATABASE_ID
  NOTION_AGENCY_OPS_DELIVERABLES_DATABASE_ID
  NOTION_AGENCY_OPS_ENGAGEMENTS_DATABASE_ID

Suggestion write env:
  NOTION_AGENCY_OPS_OWNER_USER_ID
  NOTION_AGENCY_OPS_WORKSTREAM_ID

Input snapshot shape:
{
  "linearIssues": [],
  "notionTasks": [],
  "deliverables": [],
  "engagements": []
}`);
}

function printWriteSummary(
  findings: AgencyOpsFinding[],
  options: CliOptions,
  suggestionResult: Awaited<ReturnType<typeof createAgencyOpsSuggestionTasks>> | null
): void {
  if (options.snapshotOutPath) {
    console.log(`\nSnapshot exported to ${options.snapshotOutPath}`);
  }

  if (!options.writeSuggestions) {
    if (findings.length) {
      console.log('\nNo Notion tasks were created. Pass --write-suggestions to create review-only Agent suggestion tasks.');
    }
    return;
  }

  console.log(
    `\nNotion suggestion write: created ${suggestionResult?.created ?? 0}, skipped ${
      suggestionResult?.skipped ?? 0
    }.`
  );
}

function readOptionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function readNumberEnv(key: string): number | null {
  const value = readOptionalEnv(key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Agency Ops reconciliation failed: ${message}`);
  process.exit(1);
});
