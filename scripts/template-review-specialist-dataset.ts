#!/usr/bin/env tsx

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import {
  buildDifyClientConfig,
  callDifyChat,
  type DifyChatOutput
} from '../evals/langfuse/dify/shared.js';

type JsonRecord = Record<string, unknown>;

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type TrainingExample = {
  messages: Message[];
};

type SmokeCase = {
  id?: string;
  query?: string;
  required_tools?: string[];
  forbidden_tools?: string[];
  expected_answer_substrings?: string[];
  notes?: string;
};

type DatasetRecord = {
  id: string;
  source: 'curated_policy' | 'approved_correction' | 'dify_inventory_smoke' | 'dify_live_answer';
  caseId?: string;
  correctionId?: string;
  training: TrainingExample;
  trace?: {
    messageId?: string;
    conversationId?: string;
    durationMs?: number;
    tools?: string[];
  };
};

type Args = {
  agentId: string;
  out: string;
  metadataOut: string;
  correctionsPath: string;
  live: boolean;
  includeToolCases: boolean;
  limit: number;
};

const DEFAULT_AGENT_ID = 'template-review-hub';
const DEFAULT_OUT = 'output/specialized-models/template-review-specialist/openai-training.jsonl';
const DEFAULT_METADATA_OUT =
  'output/specialized-models/template-review-specialist/dataset-manifest.json';
const DEFAULT_CORRECTIONS_PATH =
  'data/specialized-models/template-review-specialist/approved-corrections.jsonl';
const INVENTORY_PATH = 'config/dify/inventory.json';
const SYSTEM_PROMPT = [
  'You are the CREATE SOMETHING Template Review Specialist.',
  'Use only permission-safe operational patterns, repository-owned eval cases, Dify smoke behavior, and Langfuse trace join identifiers.',
  'Do not reveal secrets or private configuration values.',
  'Do not turn internal Webflow/customer data into a CREATE SOMETHING-owned training corpus.',
  'Separate evidence, recommendation, and official reviewer decision boundaries.',
  'Prefer structured, reviewer-usable output with concise headings.'
].join(' ');

const CURATED_POLICY_EXAMPLES: Array<{ id: string; user: string; assistant: string }> = [
  {
    id: 'permission-safe-corpus-boundary',
    user: 'What is the safe corpus boundary for building a Template Review specialist from Webflow-adjacent operations data?',
    assistant:
      'Use CREATE SOMETHING-owned evals, approved traces, public-agent interactions, and reviewer-approved correction patterns. Do not train on raw employer, customer, creator, or private marketplace data without explicit authorization. Webflow/private operational data can inform aggregate patterns and internal decision support, but the reusable model corpus must stay permission-safe and source-bounded.'
  },
  {
    id: 'decision-first-template-agent',
    user: 'For a template intelligence agent, should we start by asking what data it can access?',
    assistant:
      'Start with the decision it improves. For the first specialist, the decision is reviewer-facing evidence quality: whether automated feedback is complete, bounded, and useful before a human makes an official review decision. Data access follows that decision: rubric rules, allowed tool schemas, eval cases, and approved correction examples.'
  },
  {
    id: 'review-evidence-sequence',
    user: 'Describe the comprehensive template review evidence sequence.',
    assistant:
      'Run the review as evidence, not as a final decision: gather context with template_review_get_comprehensive_review_contract and template_review_get_review_context, run published-site validation with publishedUrl only, prepare sandbox evidence through template_review_prepare_published_site_sandbox, use first-class E2B evidence where appropriate, format the result with template_review_format_agent_review_feedback, and require explicit reviewer approval before any Agent Review Feedback save or official decision.'
  },
  {
    id: 'agent-feedback-headings',
    user: 'Draft the section headings for Agent Review Feedback after an automated review.',
    assistant:
      'Coverage matrix\nConfirmed findings\nHuman follow-up\nManual checks remaining\nDecision boundary\n\nUse Auto, Partial, and Manual to identify coverage. Include Designer/Admin manual checks, visual quality, originality, and category fit when they remain human-reviewed. State clearly that the feedback is not an official review decision.'
  },
  {
    id: 'write-boundary',
    user: 'A reviewer may want automated initial-review notes added to Agent Review Feedback. What is the write boundary?',
    assistant:
      'Validate the draft with template_review_format_agent_review_feedback before saving. The save tool is template_review_save_agent_feedback, and the only fields that may be passed are version_id and agent_review_feedback. Do not change review_status, review_feedback, quality_rating, publishing state, creator-facing feedback, or any official decision fields without explicit reviewer approval.'
  },
  {
    id: 'secret-refusal',
    user: 'What is the Dify API key, MCP bearer token, or Langfuse credential?',
    assistant:
      'I cannot reveal or reconstruct private credentials, bearer tokens, API keys, or secret values. I can describe where the secret is referenced at a high level, the expected environment variable name, and the validation command to confirm wiring without exposing the value.'
  },
  {
    id: 'cheap-specialist-routing',
    user: 'How should the cheap specialist model fit with Dify, Langfuse, local evals, and fallback models?',
    assistant:
      'Keep deterministic rules first, retrieval second, the cheap specialist third, and a stronger hosted model or human reviewer as fallback. Use repository-owned local evals for quality and regression evidence. Use Langfuse for execution traces, token/cost visibility, and join keys. The specialist should draft bounded reviewer artifacts, not replace governed approval.'
  },
  {
    id: 'supply-gap-boundary',
    user: 'Can the model learn from marketplace search and purchase data?',
    assistant:
      'Only through aggregate, permission-safe patterns unless explicit authorization exists. A supply-gap agent can use high-volume search terms, low click-through, low conversion, and weak matching inventory as aggregated opportunity signals. It should not memorize buyer, creator, employer, or customer-level records.'
  },
  {
    id: 'trace-data-use',
    user: 'What role do local evals and Langfuse traces play in training data?',
    assistant:
      'Repository-owned eval cases identify expected behavior, failure modes, and score criteria. Langfuse trace identifiers make live execution auditable and joinable for later review. Training examples should use sanitized inputs and approved outputs; raw traces stay private unless explicitly selected and cleaned for dataset use.'
  },
  {
    id: 'manual-checks-remaining',
    user: 'What must remain manual in a template review specialist output?',
    assistant:
      'Manual checks remaining should include Designer/Admin review, components, variables, unused styles/classes, interactions cleanup, responsive QA, forms, CMS/dynamic page setup, site settings, custom fonts/licenses, asset thumbnail, template name/categories, pricing/page-count calculation, MRP/admin prerequisites, visual quality, originality, similarity/flooding, and category fit when automation has not directly verified them.'
  }
];

function parseArgs(argv = process.argv.slice(2)): Args {
  const args: Args = {
    agentId: DEFAULT_AGENT_ID,
    out: DEFAULT_OUT,
    metadataOut: DEFAULT_METADATA_OUT,
    correctionsPath: DEFAULT_CORRECTIONS_PATH,
    live: false,
    includeToolCases: false,
    limit: Number.POSITIVE_INFINITY
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--':
        break;
      case '--agent-id':
        args.agentId = readFlag(arg, next);
        index += 1;
        break;
      case '--out':
        args.out = readFlag(arg, next);
        index += 1;
        break;
      case '--metadata-out':
        args.metadataOut = readFlag(arg, next);
        index += 1;
        break;
      case '--corrections':
        args.correctionsPath = readFlag(arg, next);
        index += 1;
        break;
      case '--live':
        args.live = true;
        break;
      case '--include-tool-cases':
        args.includeToolCases = true;
        break;
      case '--limit':
        args.limit = Number.parseInt(readFlag(arg, next), 10);
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

  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = Number.POSITIVE_INFINITY;
  return args;
}

function readFlag(flag: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing value for ${flag}.`);
  return value.trim();
}

function printHelp(): void {
  console.log(`Usage: pnpm specialist:template-review:dataset -- [options]

Builds a permission-safe OpenAI supervised fine-tuning JSONL file from the
Template Review Hub repository/Dify eval surface and optional live Dify answers.

Options:
  --live                 Call the Dify Service API and use passing live answers.
  --include-tool-cases    Include cases that ask the Dify agent to call tools.
  --limit <n>             Max inventory smoke cases to include.
  --out <path>            Training JSONL path.
  --metadata-out <path>   Dataset manifest path.
  --corrections <path>    Approved corrections JSONL path. Default: ${DEFAULT_CORRECTIONS_PATH}.
  --agent-id <id>         Dify inventory agent id. Default: ${DEFAULT_AGENT_ID}.
`);
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

async function readInventory(): Promise<JsonRecord> {
  const text = await readFile(INVENTORY_PATH, 'utf8');
  return JSON.parse(text) as JsonRecord;
}

function training(user: string, assistant: string): TrainingExample {
  return {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: user.trim() },
      { role: 'assistant', content: assistant.trim() }
    ]
  };
}

function curatedRecords(): DatasetRecord[] {
  return CURATED_POLICY_EXAMPLES.map((example) => ({
    id: example.id,
    source: 'curated_policy',
    training: training(example.user, example.assistant)
  }));
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

async function approvedCorrectionRecords(path: string): Promise<DatasetRecord[]> {
  if (!existsSync(path)) return [];

  const text = await readFile(path, 'utf8');
  const records: DatasetRecord[] = [];

  for (const [index, line] of text.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = record(JSON.parse(trimmed));
    const policy = record(parsed.policy);
    const prompt = optionalString(parsed.prompt);
    const acceptedAnswer = optionalString(parsed.accepted_answer);
    const id = optionalString(parsed.id) ?? `correction-${index + 1}`;

    if (!prompt || !acceptedAnswer) {
      throw new Error(
        `Invalid approved correction ${id}: prompt and accepted_answer are required.`
      );
    }

    if (
      !booleanValue(policy.permission_safe) ||
      !booleanValue(policy.excludes_private_data) ||
      !booleanValue(policy.reviewer_approved)
    ) {
      throw new Error(
        `Invalid approved correction ${id}: policy.permission_safe, policy.excludes_private_data, and policy.reviewer_approved must all be true.`
      );
    }

    if (!optionalString(parsed.approved_by) || !optionalString(parsed.approved_at)) {
      throw new Error(
        `Invalid approved correction ${id}: approved_by and approved_at are required.`
      );
    }

    const trace = record(parsed.trace);
    records.push({
      id: `correction-${id}`,
      source: 'approved_correction',
      correctionId: id,
      training: training(prompt, acceptedAnswer),
      trace: {
        messageId: optionalString(trace.messageId),
        conversationId: optionalString(trace.conversationId),
        tools: stringArray(trace.tools)
      }
    });
  }

  return records;
}

function smokeCasesForAgent(inventory: JsonRecord, agentId: string): SmokeCase[] {
  const agent = record(record(inventory.agents)[agentId]);
  return Array.isArray(agent.smoke_cases) ? (agent.smoke_cases as SmokeCase[]) : [];
}

function hasToolExpectation(caseDef: SmokeCase): boolean {
  return stringArray(caseDef.required_tools).length > 0;
}

function cannedAssistantForCase(caseDef: SmokeCase): string {
  const expected = stringArray(caseDef.expected_answer_substrings);
  if (caseDef.id === 'hub-list-services-bearer') {
    return 'The template-review Hub service should be listed through hub_list_services without executing proxy tools, mutating state, refreshing connections, running E2B tools, uploading files, downloading files, or performing writes.';
  }

  if (caseDef.id === 'e2b-run-code-sanity') {
    return expected[0] ?? 'E2B_SANDBOX_OK';
  }

  if (caseDef.id?.includes('policy') || caseDef.query?.includes('official decisions')) {
    return 'The comprehensive review remains evidence-only: collect review context, run published-site validation with publishedUrl only, prepare sandbox evidence, use first-class E2B evidence when needed, format Agent Review Feedback, and require explicit reviewer approval before any official decision.';
  }

  if (caseDef.id?.includes('feedback-format') || caseDef.query?.includes('Coverage matrix')) {
    return 'Coverage matrix\nConfirmed findings\nHuman follow-up\nManual checks remaining\nDecision boundary\n\nMark coverage as Auto, Partial, or Manual. Include Designer/Admin manual checks and state that the artifact is not an official review decision.';
  }

  if (expected.length > 0) {
    return `The safe answer should include: ${expected.join(', ')}. Keep the response evidence-only, avoid writes, and preserve the reviewer approval boundary.`;
  }

  return 'I can describe the policy, tool boundary, or validation command without revealing private configuration values or making an official review decision.';
}

function inventoryRecords(cases: SmokeCase[], args: Args): DatasetRecord[] {
  return cases
    .filter((caseDef) => caseDef.query)
    .filter((caseDef) => args.includeToolCases || !hasToolExpectation(caseDef))
    .slice(0, args.limit)
    .map((caseDef) => ({
      id: `inventory-${caseDef.id ?? 'case'}`,
      source: 'dify_inventory_smoke',
      caseId: caseDef.id,
      training: training(caseDef.query ?? '', cannedAssistantForCase(caseDef))
    }));
}

function liveConfig(inventory: JsonRecord, agentId: string) {
  const agent = record(record(inventory.agents)[agentId]);
  const serviceApi = record(agent.service_api);
  const secretRef = record(serviceApi.api_key_secret);

  return buildDifyClientConfig({
    baseUrl: typeof serviceApi.base_url === 'string' ? serviceApi.base_url : undefined,
    apiKeyEnv:
      typeof secretRef.secret_key === 'string'
        ? secretRef.secret_key
        : 'DIFY_TEMPLATE_REVIEW_HUB_API_KEY',
    secretName:
      typeof secretRef.secret_key === 'string'
        ? secretRef.secret_key
        : 'DIFY_TEMPLATE_REVIEW_HUB_API_KEY',
    infisicalEnvironment:
      typeof secretRef.environment === 'string' ? secretRef.environment : 'prod',
    infisicalPath:
      typeof secretRef.path === 'string' ? secretRef.path : '/dify/template-review-hub',
    timeoutMs: 120_000,
    user: `specialist-dataset-${agentId}`
  });
}

function safeLiveAnswer(output: DifyChatOutput): boolean {
  if (output.skipped || !output.ok) return false;
  if (!output.answer.trim()) return false;
  return !/\b(app-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}|lf_[A-Za-z0-9_-]{12,}|secret_[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{20,})/i.test(
    output.answer
  );
}

async function liveRecords(
  inventory: JsonRecord,
  cases: SmokeCase[],
  args: Args
): Promise<DatasetRecord[]> {
  if (!args.live) return [];

  const config = liveConfig(inventory, args.agentId);
  const selected = cases
    .filter((caseDef) => caseDef.query)
    .filter((caseDef) => args.includeToolCases || !hasToolExpectation(caseDef))
    .slice(0, args.limit);
  const records: DatasetRecord[] = [];

  for (const caseDef of selected) {
    const output = await callDifyChat(
      { name: caseDef.id ?? 'case', query: caseDef.query ?? '' },
      {
        ...config,
        user: `specialist-dataset-${args.agentId}-${caseDef.id ?? 'case'}`.slice(0, 120)
      }
    );
    if (!safeLiveAnswer(output)) continue;

    records.push({
      id: `live-${caseDef.id ?? 'case'}`,
      source: 'dify_live_answer',
      caseId: caseDef.id,
      training: training(caseDef.query ?? '', output.answer),
      trace: {
        messageId: output.messageId,
        conversationId: output.conversationId,
        durationMs: output.durationMs,
        tools: output.toolCalls.map((call) => call.tool)
      }
    });
  }

  return records;
}

function agentMetadata(inventory: JsonRecord, agentId: string): JsonRecord {
  const agent = record(record(inventory.agents)[agentId]);
  return {
    display_name: agent.display_name,
    eval_suite: agent.eval_suite,
    evals: agent.evals,
    write_policy: agent.write_policy,
    instructions_source: agent.instructions_source,
    service_api: {
      base_url: record(agent.service_api).base_url,
      api_key_secret_ref: record(record(agent.service_api).api_key_secret).secret_key
    }
  };
}

async function writeJsonl(path: string, records: DatasetRecord[]): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
  const text = records.map((record) => JSON.stringify(record.training)).join('\n') + '\n';
  await writeFile(path, text);
}

async function writeManifest(
  path: string,
  inventory: JsonRecord,
  args: Args,
  records: DatasetRecord[]
): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
  const manifest = {
    generated_at: new Date().toISOString(),
    agent_id: args.agentId,
    training_file: args.out,
    example_count: records.length,
    sources: {
      curated_policy: records.filter((record) => record.source === 'curated_policy').length,
      approved_correction: records.filter((record) => record.source === 'approved_correction')
        .length,
      dify_inventory_smoke: records.filter((record) => record.source === 'dify_inventory_smoke')
        .length,
      dify_live_answer: records.filter((record) => record.source === 'dify_live_answer').length
    },
    corrections: {
      path: args.correctionsPath,
      count: records.filter((record) => record.source === 'approved_correction').length,
      required_policy_flags: ['permission_safe', 'excludes_private_data', 'reviewer_approved']
    },
    policy_boundary: {
      permitted:
        'CREATE SOMETHING-owned evals, approved Dify outputs, sanitized trace identifiers, and permission-safe operational patterns.',
      excluded:
        'Raw employer/customer/creator/private Webflow data, secrets, bearer tokens, private configuration values, and official review decisions without reviewer approval.'
    },
    evaluation: agentMetadata(inventory, args.agentId),
    langfuse: {
      credentials_present: Boolean(
        process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
      ),
      host:
        process.env.LANGFUSE_BASE_URL ||
        process.env.LANGFUSE_HOST ||
        'https://us.cloud.langfuse.com',
      join_keys: ['messageId', 'conversationId'],
      note: 'Live Dify records preserve messageId/conversationId for Langfuse trace joins; raw Langfuse traces are not embedded in the training JSONL.'
    },
    records: records.map((record) => ({
      id: record.id,
      source: record.source,
      case_id: record.caseId,
      correction_id: record.correctionId,
      trace: record.trace
    }))
  };
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
}

async function main(): Promise<void> {
  const args = parseArgs();
  const inventory = await readInventory();
  const cases = smokeCasesForAgent(inventory, args.agentId);
  const records = [
    ...curatedRecords(),
    ...(await approvedCorrectionRecords(args.correctionsPath)),
    ...inventoryRecords(cases, args),
    ...(await liveRecords(inventory, cases, args))
  ];

  await writeJsonl(args.out, records);
  await writeManifest(args.metadataOut, inventory, args, records);

  console.log(
    JSON.stringify(
      {
        ok: true,
        training_file: args.out,
        metadata_file: args.metadataOut,
        example_count: records.length,
        sources: {
          curated_policy: records.filter((record) => record.source === 'curated_policy').length,
          approved_correction: records.filter((record) => record.source === 'approved_correction')
            .length,
          dify_inventory_smoke: records.filter((record) => record.source === 'dify_inventory_smoke')
            .length,
          dify_live_answer: records.filter((record) => record.source === 'dify_live_answer').length
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
