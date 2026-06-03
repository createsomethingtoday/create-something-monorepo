#!/usr/bin/env tsx

import process from 'node:process';

import {
  buildDifyClientConfig,
  callDifyChat,
  type DifyChatOutput
} from '../evals/braintrust/dify/shared.js';
import {
  AirtableClient,
  type TemplateReviewAsset,
  type TemplateReviewVersion
} from '../packages/webflow-template-review-mcp/src/airtable.ts';
import {
  DEFAULT_AIRTABLE_BASE_ID,
  REVIEW_STATUS_OPTIONS
} from '../packages/webflow-template-review-mcp/src/schema.ts';

type Args = {
  write: boolean;
  runDifyDryRun: boolean;
  limit: number;
  sinceDays: number;
  submittedSince?: string;
  versionId?: string;
  viewId?: string;
  statuses: string[];
  concurrency: number;
  timeoutMs: number;
  maxAttempts: number;
  difyUser: string;
};

type Candidate = {
  version: TemplateReviewVersion;
  asset: TemplateReviewAsset;
};

type CandidateResult = {
  versionId: string;
  assetId?: string;
  templateName?: string;
  status: 'dry_run' | 'saved' | 'skipped' | 'failed';
  reason?: string;
  messageId?: string;
  conversationId?: string;
  durationMs?: number;
  feedbackLength?: number;
  tools?: string[];
};

const READY_FOR_REVIEW_VIEW_ID = 'viwlVxrTFxnP0O9xp';
const DEFAULT_LIMIT = 5;
const DEFAULT_SINCE_DAYS = 7;
const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_DIFY_USER = 'template-review-hub-agent-feedback-runner';
const TEMPLATE_REVIEW_HUB_API_KEY_ENV = 'DIFY_TEMPLATE_REVIEW_HUB_API_KEY';
const TEMPLATE_REVIEW_HUB_INFISICAL_PATH = '/dify/template-review-hub';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getAirtableApiKey(): string {
  return (
    process.env.AIRTABLE_API_KEY?.trim() ||
    process.env.AIRTABLE_PAT?.trim() ||
    requireEnv('AIRTABLE_API_KEY')
  );
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function readFlagValue(flag: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing value for ${flag}.`);
  return value.trim();
}

function parseStatuses(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function printHelp(): void {
  console.log(`Usage: pnpm template-review:hub-agent-feedback -- [options]

Runs the TEMPLATE REVIEW HUB Dify agent over recently submitted template Asset Versions
that are Ready for Review and have blank Agent Review Feedback.

Safety:
  The default is a list-only dry run. Use --write to call Dify and authorize the
  agent to save Agent Review Feedback through template_review_save_agent_feedback.

Options:
  --write                    Call Dify and authorize saving Agent Review Feedback.
  --run-dify-dry-run          Call Dify without authorizing any write tools.
  --limit <n>                 Maximum candidate rows. Default: ${DEFAULT_LIMIT}.
  --since-days <n>            Recent submission window. Default: ${DEFAULT_SINCE_DAYS}.
  --submitted-since <iso>     Absolute lower submission boundary.
  --version-id <rec...>       Process one Asset Version record.
  --view-id <viw...>          Airtable view to use. Default: Ready for Review view.
  --no-view                   Do not constrain the Airtable query to a view.
  --status <value[,value]>    Review status filter. Default: ${REVIEW_STATUS_OPTIONS[0]}.
  --concurrency <n>           Concurrent Dify reviews. Default: 1.
  --timeout-ms <n>            Per-Dify-call timeout. Default: ${DEFAULT_TIMEOUT_MS}.
  --max-attempts <n>          Dify attempts per version. Default: ${DEFAULT_MAX_ATTEMPTS}.
  --dify-user <value>         Dify API user id.
  --help                      Show this message.
`);
}

function parseArgs(argv = process.argv.slice(2)): Args {
  let write = false;
  let runDifyDryRun = false;
  let limit = DEFAULT_LIMIT;
  let sinceDays = DEFAULT_SINCE_DAYS;
  let submittedSince: string | undefined;
  let versionId: string | undefined;
  let viewId: string | undefined = READY_FOR_REVIEW_VIEW_ID;
  let statuses = [REVIEW_STATUS_OPTIONS[0]];
  let concurrency = 1;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let maxAttempts = DEFAULT_MAX_ATTEMPTS;
  let difyUser = process.env.DIFY_TEMPLATE_REVIEW_HUB_RUNNER_USER?.trim() || DEFAULT_DIFY_USER;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case '--':
        break;
      case '--write':
        write = true;
        break;
      case '--dry-run':
        write = false;
        break;
      case '--run-dify-dry-run':
        runDifyDryRun = true;
        break;
      case '--limit':
        limit = toPositiveInt(readFlagValue(arg, next), limit);
        index += 1;
        break;
      case '--since-days':
        sinceDays = toPositiveInt(readFlagValue(arg, next), sinceDays);
        index += 1;
        break;
      case '--submitted-since':
        submittedSince = readFlagValue(arg, next);
        index += 1;
        break;
      case '--version-id':
        versionId = readFlagValue(arg, next);
        index += 1;
        break;
      case '--view-id':
        viewId = readFlagValue(arg, next);
        index += 1;
        break;
      case '--no-view':
        viewId = undefined;
        break;
      case '--status':
        statuses = parseStatuses(readFlagValue(arg, next));
        index += 1;
        break;
      case '--concurrency':
        concurrency = Math.min(toPositiveInt(readFlagValue(arg, next), concurrency), 3);
        index += 1;
        break;
      case '--timeout-ms':
        timeoutMs = toPositiveInt(readFlagValue(arg, next), timeoutMs);
        index += 1;
        break;
      case '--max-attempts':
        maxAttempts = toPositiveInt(readFlagValue(arg, next), maxAttempts);
        index += 1;
        break;
      case '--dify-user':
        difyUser = readFlagValue(arg, next);
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (write && runDifyDryRun) {
    throw new Error('Use either --write or --run-dify-dry-run, not both.');
  }
  if (statuses.length === 0) {
    throw new Error('--status must include at least one status value.');
  }

  return {
    write,
    runDifyDryRun,
    limit,
    sinceDays,
    submittedSince,
    versionId,
    viewId,
    statuses,
    concurrency,
    timeoutMs,
    maxAttempts,
    difyUser
  };
}

function sinceBoundary(args: Args): string {
  if (args.submittedSince) return new Date(args.submittedSince).toISOString();
  return new Date(Date.now() - args.sinceDays * 24 * 60 * 60 * 1000).toISOString();
}

function statusMatches(version: TemplateReviewVersion, statuses: string[]): boolean {
  return Boolean(version.reviewStatus && statuses.includes(version.reviewStatus));
}

async function loadCandidates(airtableClient: AirtableClient, args: Args): Promise<Candidate[]> {
  const versions = args.versionId
    ? await (async () => {
        const version = await airtableClient.getVersionById(args.versionId!);
        return version ? [version] : [];
      })()
    : await airtableClient.listVersionsForAgentFeedback({
        limit: args.limit,
        includeStatuses: args.statuses,
        includeExistingFeedback: false,
        submittedSince: sinceBoundary(args),
        sortDirection: 'desc',
        viewId: args.viewId
      });

  const candidates: Candidate[] = [];
  for (const version of versions) {
    if (!version.assetId) continue;
    if (!statusMatches(version, args.statuses)) continue;
    if (version.agentReviewFeedback) continue;

    const asset = await airtableClient.getAssetById(version.assetId);
    if (!asset) continue;
    candidates.push({ version, asset });
  }

  return candidates;
}

function candidatePreview(candidate: Candidate): Record<string, unknown> {
  return {
    version_id: candidate.version.versionId,
    asset_id: candidate.asset.assetId,
    template_name: candidate.asset.templateName,
    review_status: candidate.version.reviewStatus,
    submitted_at: candidate.version.createdAt,
    website_url: candidate.asset.websiteUrl,
    preview_site_url: candidate.asset.previewSiteUrl
  };
}

function buildDifyQuery(candidate: Candidate, write: boolean): string {
  const { version, asset } = candidate;
  const siteUrl = asset.websiteUrl ?? asset.previewSiteUrl ?? '';
  const writeInstruction = write
    ? [
        'This run authorizes exactly one Airtable mutation: save the final summary to Agent Review Feedback.',
        'Use the narrow template_review_save_agent_feedback path only.',
        'Do not call template_review_update_version_review, do not change Review Status, Review Feedback, owner, publishing fields, or any creator-facing field.',
        'After saving, reply with SAVED_AGENT_REVIEW_FEEDBACK and a concise evidence summary.'
      ].join(' ')
    : [
        'Do not execute any write-capable tool and do not save feedback.',
        'Return the Agent Review Feedback text you would save and reply with DRY_RUN_AGENT_REVIEW_FEEDBACK.'
      ].join(' ');

  return `Run a comprehensive supplemental initial review for this Webflow template Asset Version.

Identifiers:
- version_id: ${version.versionId}
- asset_id: ${asset.assetId}
- template_name: ${asset.templateName}
- review_status: ${version.reviewStatus ?? ''}
- published_or_preview_url: ${siteUrl}

Required workflow:
1. Use Hub MCP broker mode to inspect the webflow-template-review-mcp service and the version review context.
2. Use the comprehensive review contract and published-site sandbox bundle tools when available.
3. Treat E2B tools as first-class review tools: run published-site validation and targeted page/content checks through E2B when a URL is available.
4. Format the final result with the Agent Review Feedback formatter when available.
5. Keep the summary internal and reviewer-safe: evidence, caveats, confirmed issues, and next human-review steps. Do not present it as an official review decision.

${writeInstruction}`;
}

function buildDifyConfig(args: Args) {
  return buildDifyClientConfig({
    apiKeyEnv: TEMPLATE_REVIEW_HUB_API_KEY_ENV,
    secretName: TEMPLATE_REVIEW_HUB_API_KEY_ENV,
    infisicalEnvironment: process.env.DIFY_TEMPLATE_REVIEW_HUB_INFISICAL_ENV?.trim() || 'prod',
    infisicalPath:
      process.env.DIFY_TEMPLATE_REVIEW_HUB_INFISICAL_PATH?.trim() ||
      TEMPLATE_REVIEW_HUB_INFISICAL_PATH,
    infisicalProjectId: process.env.DIFY_TEMPLATE_REVIEW_HUB_INFISICAL_PROJECT_ID?.trim(),
    user: args.difyUser,
    timeoutMs: args.timeoutMs
  });
}

async function callDifyWithAttempts(
  candidate: Candidate,
  args: Args,
  write: boolean
): Promise<DifyChatOutput> {
  const config = buildDifyConfig(args);
  let lastOutput: DifyChatOutput | null = null;

  for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
    const output = await callDifyChat(
      {
        name: `template-review-hub-agent-feedback-${candidate.version.versionId}`,
        query: buildDifyQuery(candidate, write)
      },
      config
    );
    lastOutput = output;
    if (output.ok || output.skipped) return output;
  }

  return lastOutput!;
}

async function processCandidate(
  airtableClient: AirtableClient,
  args: Args,
  candidate: Candidate
): Promise<CandidateResult> {
  const latest = await airtableClient.getVersionById(candidate.version.versionId);
  if (!latest) {
    return {
      versionId: candidate.version.versionId,
      assetId: candidate.asset.assetId,
      templateName: candidate.asset.templateName,
      status: 'skipped',
      reason: 'Version no longer exists.'
    };
  }
  if (latest.agentReviewFeedback) {
    return {
      versionId: latest.versionId,
      assetId: candidate.asset.assetId,
      templateName: candidate.asset.templateName,
      status: 'skipped',
      reason: 'Agent Review Feedback is no longer blank.',
      feedbackLength: latest.agentReviewFeedback.length
    };
  }
  if (!statusMatches(latest, args.statuses)) {
    return {
      versionId: latest.versionId,
      assetId: candidate.asset.assetId,
      templateName: candidate.asset.templateName,
      status: 'skipped',
      reason: `Review Status is no longer in scope: ${latest.reviewStatus ?? 'blank'}.`
    };
  }

  if (!args.write && !args.runDifyDryRun) {
    return {
      versionId: latest.versionId,
      assetId: candidate.asset.assetId,
      templateName: candidate.asset.templateName,
      status: 'dry_run',
      reason: 'Candidate listed only; no Dify call made.'
    };
  }

  const output = await callDifyWithAttempts(candidate, args, args.write);
  const tools = output.toolCalls.map((call) => call.tool);

  if (!output.ok) {
    return {
      versionId: latest.versionId,
      assetId: candidate.asset.assetId,
      templateName: candidate.asset.templateName,
      status: 'failed',
      reason:
        output.reason ??
        output.error ??
        `Dify call failed with status ${output.status ?? 'unknown'}.`,
      messageId: output.messageId,
      conversationId: output.conversationId,
      durationMs: output.durationMs,
      tools
    };
  }

  if (!args.write) {
    const afterDryRun = await airtableClient.getVersionById(candidate.version.versionId);
    const unexpectedFeedback = afterDryRun?.agentReviewFeedback?.trim();
    if (unexpectedFeedback) {
      return {
        versionId: latest.versionId,
        assetId: candidate.asset.assetId,
        templateName: candidate.asset.templateName,
        status: 'failed',
        reason: 'Dify dry run completed but Agent Review Feedback is no longer blank.',
        messageId: output.messageId,
        conversationId: output.conversationId,
        durationMs: output.durationMs,
        feedbackLength: unexpectedFeedback.length,
        tools
      };
    }

    return {
      versionId: latest.versionId,
      assetId: candidate.asset.assetId,
      templateName: candidate.asset.templateName,
      status: 'dry_run',
      reason: 'Dify dry run completed without authorized write.',
      messageId: output.messageId,
      conversationId: output.conversationId,
      durationMs: output.durationMs,
      tools
    };
  }

  const saved = await airtableClient.getVersionById(candidate.version.versionId);
  const feedback = saved?.agentReviewFeedback?.trim();
  if (!feedback) {
    return {
      versionId: latest.versionId,
      assetId: candidate.asset.assetId,
      templateName: candidate.asset.templateName,
      status: 'failed',
      reason: 'Dify completed but Agent Review Feedback is still blank.',
      messageId: output.messageId,
      conversationId: output.conversationId,
      durationMs: output.durationMs,
      tools
    };
  }

  return {
    versionId: latest.versionId,
    assetId: candidate.asset.assetId,
    templateName: candidate.asset.templateName,
    status: 'saved',
    reason: 'Agent Review Feedback saved.',
    messageId: output.messageId,
    conversationId: output.conversationId,
    durationMs: output.durationMs,
    feedbackLength: feedback.length,
    tools
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const airtableClient = new AirtableClient({
    apiKey: getAirtableApiKey(),
    baseId: process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_AIRTABLE_BASE_ID
  });

  const candidates = await loadCandidates(airtableClient, args);
  console.log(
    JSON.stringify(
      {
        mode: args.write ? 'write' : args.runDifyDryRun ? 'dify_dry_run' : 'dry_run',
        submitted_since: args.versionId ? undefined : sinceBoundary(args),
        statuses: args.statuses,
        limit: args.limit,
        concurrency: args.concurrency,
        candidate_count: candidates.length,
        candidates: candidates.map(candidatePreview)
      },
      null,
      2
    )
  );

  if (candidates.length === 0) return;

  const results = await mapWithConcurrency(candidates, args.concurrency, (candidate) =>
    processCandidate(airtableClient, args, candidate)
  );

  const summary = {
    ok: results.every((result) => result.status !== 'failed'),
    mode: args.write ? 'write' : args.runDifyDryRun ? 'dify_dry_run' : 'dry_run',
    processed: results.length,
    saved: results.filter((result) => result.status === 'saved').length,
    dry_run: results.filter((result) => result.status === 'dry_run').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
