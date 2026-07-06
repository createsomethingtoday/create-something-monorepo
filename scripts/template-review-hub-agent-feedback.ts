#!/usr/bin/env tsx

import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  buildDifyClientConfig,
  callDifyChat,
  type DifyChatOutput
} from '../evals/langfuse/dify/shared.js';
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

type ReturnedSaveAgentFeedbackRequest = {
  proxyToolName?: unknown;
  args?: {
    version_id?: unknown;
    agent_review_feedback?: unknown;
  };
};

const READY_FOR_REVIEW_VIEW_ID = 'viwlVxrTFxnP0O9xp';
const DEFAULT_LIMIT = 5;
const DEFAULT_SINCE_DAYS = 7;
const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_DIFY_USER = 'template-review-hub-agent-feedback-runner';
const FEEDBACK_READBACK_ATTEMPTS = 3;
const FEEDBACK_READBACK_DELAY_MS = 2_000;
const TEMPLATE_REVIEW_HUB_API_KEY_ENV = 'DIFY_TEMPLATE_REVIEW_HUB_API_KEY';
const TEMPLATE_REVIEW_HUB_INFISICAL_PATH = '/dify/template-review-hub';
export const REQUIRED_MANUAL_CHECK_TOPICS = [
  'components',
  'variables',
  'unused styles/classes',
  'interactions cleanup',
  'Designer responsive QA',
  'forms',
  'CMS/dynamic page setup',
  'site settings',
  'custom fonts/licenses',
  'asset thumbnail',
  'template name/categories',
  'pricing/page-count calculation',
  'MRP/admin publishing prerequisites',
  'visual quality',
  'originality',
  'similarity/flooding',
  'category fit'
] as const;

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

type RetryOptions = {
  attempts: number;
  delayMs: number;
  label: string;
  sleep?: (ms: number) => Promise<void>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryTransientOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: unknown;
  const wait = options.sleep ?? sleep;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= options.attempts) break;

      const delayMs = options.delayMs * attempt;
      console.warn(
        JSON.stringify({
          warning: 'retrying_transient_operation',
          label: options.label,
          attempt,
          attempts: options.attempts,
          next_delay_ms: delayMs,
          error: error instanceof Error ? error.message : String(error)
        })
      );
      await wait(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function waitForAgentReviewFeedback(
  readVersion: () => Promise<TemplateReviewVersion | null>,
  options: Partial<RetryOptions> = {}
): Promise<string | null> {
  const attempts = options.attempts ?? FEEDBACK_READBACK_ATTEMPTS;
  const delayMs = options.delayMs ?? FEEDBACK_READBACK_DELAY_MS;
  const wait = options.sleep ?? sleep;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const version = await readVersion();
    const feedback = version?.agentReviewFeedback?.trim();
    if (feedback) return feedback;
    if (attempt >= attempts) break;

    const nextDelayMs = delayMs * attempt;
    console.warn(
      JSON.stringify({
        warning: 'agent_review_feedback_readback_empty',
        label: options.label ?? 'agent_review_feedback_readback',
        attempt,
        attempts,
        next_delay_ms: nextDelayMs
      })
    );
    await wait(nextDelayMs);
  }

  return null;
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

export function buildDifyQuery(candidate: Candidate, write: boolean): string {
  const { version, asset } = candidate;
  const siteUrl = asset.websiteUrl ?? asset.previewSiteUrl ?? '';
  const manualTopicList = REQUIRED_MANUAL_CHECK_TOPICS.map((topic) => `- ${topic}`).join('\n');
  const writeInstruction = write
    ? [
        'This run authorizes exactly one Airtable mutation: save the final summary to Agent Review Feedback.',
        'Use the narrow template_review_save_agent_feedback path only.',
        'Do not call template_review_update_version_review, do not change Review Status, Review Feedback, owner, publishing fields, or any creator-facing field.',
        'If template_review_format_agent_review_feedback returns COMPREHENSIVE_REVIEW_PACKET_INVALID or missing_manual_check_topics, correct the packet and retry the formatter before saving.',
        'Only reply with SAVED_AGENT_REVIEW_FEEDBACK after template_review_save_agent_feedback reports success, and include a concise evidence summary.'
      ].join(' ')
    : [
        'Do not execute any write-capable tool and do not save feedback.',
        'Return the Agent Review Feedback text you would save and reply with DRY_RUN_AGENT_REVIEW_FEEDBACK. If the formatter rejects the packet, correct the packet and retry before replying.'
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
5. The manual_checks_remaining array passed to template_review_format_agent_review_feedback must explicitly mention every required Designer/Admin/manual topic below. Use the exact topic wording when possible:
${manualTopicList}
6. Keep the summary internal and reviewer-safe: evidence, caveats, confirmed issues, and next human-review steps. Do not present it as an official review decision.
7. Never end by returning a raw JSON object for a proxy tool call. Execute proxy calls through Hub MCP. If a formatter or save call fails, retry with corrected arguments or report the blocker plainly.

${writeInstruction}`;
}

function looksLikeFormattedAgentReviewFeedback(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('supplemental agent initial review evidence') &&
    normalized.includes('manual checks remaining') &&
    normalized.includes('decision boundary') &&
    normalized.includes('not an official review decision')
  );
}

function feedbackMentionsVersion(value: string, expectedVersionId: string): boolean {
  return value.includes(expectedVersionId);
}

function parseLeadingJsonObject(value: string): ReturnedSaveAgentFeedbackRequest | null {
  if (!value.startsWith('{')) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{') {
      depth += 1;
      continue;
    }
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(value.slice(0, index + 1)) as ReturnedSaveAgentFeedbackRequest;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export function extractReturnedSaveAgentFeedback(
  answer: string,
  expectedVersionId: string
): string | null {
  const trimmed = answer.trim();
  const parsed = parseLeadingJsonObject(trimmed);
  if (!parsed) return null;

  if (parsed.proxyToolName !== 'webflow-template-review-mcp__template_review_save_agent_feedback') {
    return null;
  }
  if (!parsed.args || parsed.args.version_id !== expectedVersionId) return null;
  if (typeof parsed.args.agent_review_feedback !== 'string') return null;

  const feedback = parsed.args.agent_review_feedback.trim();
  if (
    !feedback ||
    !looksLikeFormattedAgentReviewFeedback(feedback) ||
    !feedbackMentionsVersion(feedback, expectedVersionId)
  ) {
    return null;
  }
  return feedback;
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseHubExecuteObservation(observation: string): Record<string, unknown> | null {
  const outer = parseJsonRecord(observation);
  const payload = outer?.hub_execute_proxy_tool;
  if (typeof payload === 'string') return parseJsonRecord(payload);
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function parseHubExecuteToolInput(toolInput: string): ReturnedSaveAgentFeedbackRequest | null {
  const outer = parseJsonRecord(toolInput);
  const payload = outer?.hub_execute_proxy_tool ?? outer;
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as ReturnedSaveAgentFeedbackRequest)
    : null;
}

function observationConfirmsSave(
  payload: Record<string, unknown>,
  expectedVersionId: string
): boolean {
  if (payload.ok !== true) return false;

  const data = payload.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return true;

  const updatedVersion = (data as Record<string, unknown>).updated_version;
  if (!updatedVersion || typeof updatedVersion !== 'object' || Array.isArray(updatedVersion)) {
    return true;
  }

  const versionId = (updatedVersion as Record<string, unknown>).versionId;
  return typeof versionId !== 'string' || versionId === expectedVersionId;
}

export function extractSavedAgentFeedbackFromToolCalls(
  toolCalls: DifyChatOutput['toolCalls'],
  expectedVersionId: string
): string | null {
  for (const call of [...toolCalls].reverse()) {
    if (!call.tool.includes('hub_execute_proxy_tool')) continue;
    if (!call.toolInput.includes('template_review_save_agent_feedback')) continue;

    const input = parseHubExecuteToolInput(call.toolInput);
    if (
      input?.proxyToolName !== 'webflow-template-review-mcp__template_review_save_agent_feedback'
    ) {
      continue;
    }
    if (!input.args || input.args.version_id !== expectedVersionId) continue;
    if (typeof input.args.agent_review_feedback !== 'string') continue;

    const observation = parseHubExecuteObservation(call.observation);
    if (!observation || !observationConfirmsSave(observation, expectedVersionId)) continue;

    const feedback = input.args.agent_review_feedback.trim();
    if (
      feedback &&
      looksLikeFormattedAgentReviewFeedback(feedback) &&
      feedbackMentionsVersion(feedback, expectedVersionId)
    ) {
      return feedback;
    }
  }

  return null;
}

export function extractFormattedAgentFeedbackFromToolCalls(
  toolCalls: DifyChatOutput['toolCalls'],
  expectedVersionId: string
): string | null {
  for (const call of [...toolCalls].reverse()) {
    if (!call.tool.includes('hub_execute_proxy_tool')) continue;
    if (!call.toolInput.includes('template_review_format_agent_review_feedback')) continue;

    const payload = parseHubExecuteObservation(call.observation);
    const data = payload?.data;
    if (!payload?.ok || !data || typeof data !== 'object' || Array.isArray(data)) continue;

    const feedback = (data as Record<string, unknown>).agent_review_feedback;
    if (typeof feedback !== 'string') continue;

    const trimmed = feedback.trim();
    if (
      trimmed &&
      looksLikeFormattedAgentReviewFeedback(trimmed) &&
      feedbackMentionsVersion(trimmed, expectedVersionId)
    ) {
      return trimmed;
    }
  }

  return null;
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

  let feedback = await waitForAgentReviewFeedback(() =>
    airtableClient.getVersionById(candidate.version.versionId)
  );
  let savedFromReturnedPayload = false;

  if (!feedback) {
    const returnedFeedback =
      extractReturnedSaveAgentFeedback(output.answer, candidate.version.versionId) ??
      extractSavedAgentFeedbackFromToolCalls(output.toolCalls, candidate.version.versionId) ??
      extractFormattedAgentFeedbackFromToolCalls(output.toolCalls, candidate.version.versionId);
    if (returnedFeedback) {
      await airtableClient.updateVersionReview(candidate.version.versionId, {
        agent_review_feedback: returnedFeedback
      });
      feedback = await waitForAgentReviewFeedback(() =>
        airtableClient.getVersionById(candidate.version.versionId)
      );
      savedFromReturnedPayload = true;
    }
  }

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
    reason: savedFromReturnedPayload
      ? 'Agent Review Feedback saved by runner from validated Dify feedback payload.'
      : 'Agent Review Feedback saved.',
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

  const candidates = await retryTransientOperation(() => loadCandidates(airtableClient, args), {
    attempts: 3,
    delayMs: 2_000,
    label: 'load_agent_feedback_candidates'
  });
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

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (invokedAsScript) {
  main().catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 1;
  });
}
