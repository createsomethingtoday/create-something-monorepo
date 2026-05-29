import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type Provider = 'dry-run' | 'openai';
type RouteSignal = 'exceptional_human_review_candidate' | 'not_exceptional_enough' | 'insufficient_exceptional_evidence';

type CliOptions = {
  inputDir: string;
  outDir: string;
  provider: Provider;
  model: string;
  caseIds: string[];
  limit?: number;
  includeScreenshot: boolean;
  maxScreenshots: number;
  imageDetail: 'low' | 'high' | 'auto';
  timeoutMs: number;
  rubricFile: string;
  maxRubricChars: number;
  precedentFile?: string;
  maxExceptionalPrecedents: number;
  maxGoodPrecedents: number;
  maxRejectedPrecedents: number;
};

type BlindCase = {
  case_id: string;
  asset_id: string;
  version_id: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  preview_url?: string;
};

type PrivateOutcome = {
  case_id: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  selection_stratum?: string;
  reviewer?: string;
};

type SandboxResult = {
  case_id: string;
  artifacts?: {
    run_dir?: string;
    normalized_dir?: string;
  };
  normalized_output?: Record<string, unknown>;
};

type GoldenCaseProposal = {
  id: string;
  asset_id?: string;
  version_id: string;
  template_name?: string;
  published_url?: string;
  golden_set_version: string;
  case_label: string;
  normalized_buckets?: string[];
  reviewer_confirmed?: boolean;
  reviewer?: string;
  evidence?: {
    review_status?: string;
    quality_rating?: string;
    rejection_reason?: string;
    decision_date?: string;
    feedback_snippet?: string;
  };
  status?: string;
};

type PrecedentContext = {
  source_file?: string;
  policy: string;
  excluded_target: {
    case_id: string;
    asset_id?: string;
    version_id?: string;
    source_url?: string;
  };
  approved_exceptional: Array<Record<string, unknown>>;
  approved_good: Array<Record<string, unknown>>;
  rejected_visual_quality: Array<Record<string, unknown>>;
  notes: string[];
};

type ExceptionalLaneOutput = {
  schema_version: 'exceptional_candidate_lane.v0.1';
  case_id: string;
  template_name: string;
  source_url: string;
  status: 'shadow' | 'failed';
  route_signal: RouteSignal;
  confidence: 'low' | 'medium' | 'high';
  evidence_basis: {
    screenshot_image_input_attached: boolean;
    screenshot_count: number;
    deterministic_summary_refs: string[];
  };
  positive_signals: Array<{
    bucket: string;
    summary: string;
    evidence_references: string[];
  }>;
  risk_signals: Array<{
    bucket: string;
    severity: 'minor' | 'major' | 'critical';
    summary: string;
    blocks_exceptional: boolean;
    evidence_references: string[];
  }>;
  manual_checks_remaining: string[];
  rationale: string;
  safety: {
    not_final_decision: boolean;
    no_external_writes: boolean;
    private_outcomes_excluded: boolean;
    no_creator_facing_feedback: boolean;
  };
};

type LaneArtifact = {
  generated_at: string;
  provider: Provider;
  model: string;
  latency_ms: number;
  input_dir: string;
  case_id: string;
  screenshot_paths: string[];
  screenshot_count: number;
  screenshot_image_input_attached: boolean;
  private_comparison?: {
    expected_review_status?: string;
    expected_quality_rating?: string;
    selection_stratum?: string;
    reviewer_present: boolean;
    note: string;
  };
  output: ExceptionalLaneOutput;
};

type OpenAiResponse = Record<string, unknown>;

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-8case-multimodal-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-exceptional-candidate-lane';
const DEFAULT_RUBRIC_FILE = 'specs/webflow-marketplace/delivery/template-review-hub/rubric-codification-map.md';
const OPENAI_MAX_ATTEMPTS = 3;

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    provider: 'dry-run',
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-5.5',
    caseIds: [],
    includeScreenshot: true,
    maxScreenshots: 4,
    imageDetail: 'low',
    timeoutMs: 120_000,
    rubricFile: DEFAULT_RUBRIC_FILE,
    maxRubricChars: 12_000,
    maxExceptionalPrecedents: 4,
    maxGoodPrecedents: 2,
    maxRejectedPrecedents: 4,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--input' && next) {
      options.inputDir = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--provider' && next) {
      if (next !== 'dry-run' && next !== 'openai') throw new Error('--provider must be dry-run or openai.');
      options.provider = next;
      index += 1;
      continue;
    }
    if (arg === '--model' && next) {
      options.model = next;
      index += 1;
      continue;
    }
    if (arg === '--case-id' && next) {
      options.caseIds = [...(options.caseIds ?? []), next];
      index += 1;
      continue;
    }
    if (arg === '--limit' && next) {
      options.limit = boundedInt(next, 1, 100, '--limit');
      index += 1;
      continue;
    }
    if (arg === '--include-screenshot') {
      options.includeScreenshot = true;
      continue;
    }
    if (arg === '--no-include-screenshot') {
      options.includeScreenshot = false;
      continue;
    }
    if (arg === '--max-screenshots' && next) {
      options.maxScreenshots = boundedInt(next, 1, 12, '--max-screenshots');
      index += 1;
      continue;
    }
    if (arg === '--image-detail' && next) {
      if (next !== 'low' && next !== 'high' && next !== 'auto') throw new Error('--image-detail must be low, high, or auto.');
      options.imageDetail = next;
      index += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 600_000, '--timeout-ms');
      index += 1;
      continue;
    }
    if (arg === '--rubric-file' && next) {
      options.rubricFile = next;
      index += 1;
      continue;
    }
    if (arg === '--max-rubric-chars' && next) {
      options.maxRubricChars = boundedInt(next, 1_000, 50_000, '--max-rubric-chars');
      index += 1;
      continue;
    }
    if (arg === '--precedent-file' && next) {
      options.precedentFile = next;
      index += 1;
      continue;
    }
    if (arg === '--max-exceptional-precedents' && next) {
      options.maxExceptionalPrecedents = boundedInt(next, 0, 20, '--max-exceptional-precedents');
      index += 1;
      continue;
    }
    if (arg === '--max-good-precedents' && next) {
      options.maxGoodPrecedents = boundedInt(next, 0, 20, '--max-good-precedents');
      index += 1;
      continue;
    }
    if (arg === '--max-rejected-precedents' && next) {
      options.maxRejectedPrecedents = boundedInt(next, 0, 20, '--max-rejected-precedents');
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    provider: options.provider ?? 'dry-run',
    model: options.model ?? 'gpt-5.5',
    caseIds: options.caseIds ?? [],
    limit: options.limit,
    includeScreenshot: options.includeScreenshot ?? true,
    maxScreenshots: options.maxScreenshots ?? 4,
    imageDetail: options.imageDetail ?? 'low',
    timeoutMs: options.timeoutMs ?? 120_000,
    rubricFile: options.rubricFile ?? DEFAULT_RUBRIC_FILE,
    maxRubricChars: options.maxRubricChars ?? 12_000,
    precedentFile: options.precedentFile,
    maxExceptionalPrecedents: options.maxExceptionalPrecedents ?? 4,
    maxGoodPrecedents: options.maxGoodPrecedents ?? 2,
    maxRejectedPrecedents: options.maxRejectedPrecedents ?? 4,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp exceptional:lane:run -- [options]

Options:
  --input <dir>                  Calibration output directory. Default: ${DEFAULT_INPUT_DIR}
  --out <dir>                    Output directory. Default: ${DEFAULT_OUT_DIR}
  --provider <provider>          dry-run or openai. Default: dry-run
  --model <model>                OpenAI model. Default: OPENAI_MODEL or gpt-5.5
  --case-id <id>                 Include one case ID. Repeatable.
  --limit <n>                    Maximum manifest cases to run.
  --include-screenshot           Attach screenshots for OpenAI image-capable runs. Default.
  --no-include-screenshot        Do not attach screenshots.
  --max-screenshots <n>          Maximum screenshots per case. Default: 4
  --image-detail <level>         low, high, or auto. Default: low
  --timeout-ms <n>               Provider timeout. Default: 120000
  --rubric-file <path>           Rubric context file. Default: ${DEFAULT_RUBRIC_FILE}
  --max-rubric-chars <n>         Rubric markdown budget. Default: 12000
  --precedent-file <path>        Optional visual-quality-golden-cases.proposed.jsonl file.
  --max-exceptional-precedents <n>  Approved Exceptional precedents. Default: 4
  --max-good-precedents <n>         Approved Good comparison precedents. Default: 2
  --max-rejected-precedents <n>     Rejected visual-quality counterexamples. Default: 4
  --help                         Show this help.

Behavior:
  Runs the exceptional-candidate specialist lane in shadow mode. The lane can
  only route possible exceptional cases to human lead review, mark cases as not
  exceptional enough, or fail closed to insufficient evidence. Private outcomes
  are joined only after output for calibration scoring.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function optionalJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

async function resolveExistingPath(filePath: string): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), filePath),
    path.resolve(process.cwd(), '..', '..', filePath),
    path.resolve(process.cwd(), '..', '..', '..', filePath),
  ];
  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf8');
      return candidate;
    } catch {
      continue;
    }
  }
  return candidates[0] ?? filePath;
}

function selectCases(cases: BlindCase[], options: CliOptions): BlindCase[] {
  const selected = options.caseIds.length > 0 ? cases.filter((item) => options.caseIds.includes(item.case_id)) : cases;
  if (options.caseIds.length > 0 && selected.length !== options.caseIds.length) {
    const found = new Set(selected.map((item) => item.case_id));
    const missing = options.caseIds.filter((caseId) => !found.has(caseId));
    throw new Error(`Missing requested case_id values: ${missing.join(', ')}`);
  }
  return typeof options.limit === 'number' ? selected.slice(0, options.limit) : selected;
}

function sameTarget(goldenCase: GoldenCaseProposal, blindCase: BlindCase): boolean {
  const sourceUrls = new Set([blindCase.source_url, blindCase.published_url, blindCase.preview_url].filter(Boolean));
  return (
    goldenCase.version_id === blindCase.version_id ||
    Boolean(goldenCase.asset_id && goldenCase.asset_id === blindCase.asset_id) ||
    Boolean(goldenCase.published_url && sourceUrls.has(goldenCase.published_url))
  );
}

function publicPrecedent(goldenCase: GoldenCaseProposal): Record<string, unknown> {
  return {
    precedent_id: goldenCase.id,
    template_name: goldenCase.template_name,
    published_url: goldenCase.published_url,
    case_label: goldenCase.case_label,
    normalized_buckets: goldenCase.normalized_buckets ?? [],
    reviewer_confirmed: Boolean(goldenCase.reviewer_confirmed),
    quality_rating: goldenCase.evidence?.quality_rating,
    rejection_reason: goldenCase.evidence?.rejection_reason,
    feedback_snippet: goldenCase.evidence?.feedback_snippet,
    decision_date: goldenCase.evidence?.decision_date,
  };
}

function selectPrecedents(goldenCases: GoldenCaseProposal[], blindCase: BlindCase, options: CliOptions): PrecedentContext {
  const usable = goldenCases.filter((item) => item.reviewer_confirmed && !sameTarget(item, blindCase) && item.published_url);
  const take = (label: string, limit: number) =>
    usable
      .filter((item) => item.case_label === label)
      .slice(0, limit)
      .map(publicPrecedent);
  return {
    source_file: options.precedentFile,
    policy: 'shadow_calibration_precedents_only; labels describe precedent examples, not the target case outcome',
    excluded_target: {
      case_id: blindCase.case_id,
      asset_id: blindCase.asset_id,
      version_id: blindCase.version_id,
      source_url: blindCase.source_url,
    },
    approved_exceptional: take('approved_exceptional', options.maxExceptionalPrecedents),
    approved_good: take('approved_good', options.maxGoodPrecedents),
    rejected_visual_quality: take('rejected_visual_quality', options.maxRejectedPrecedents),
    notes: [
      'Do not infer the target case private outcome from precedents.',
      'Use precedents only to calibrate the route floor between Good and Exceptional and the counterexamples that block exceptional routing.',
      'If category/style precedent is weak or missing, say so in rationale instead of lowering the route floor silently.',
    ],
  };
}

async function findScreenshots(runDir: string | undefined, maxScreenshots: number): Promise<string[]> {
  if (!runDir) return [];
  try {
    const entries = await readdir(path.join(runDir, 'e2b', 'screenshots'));
    return entries
      .filter((entry) => entry.toLowerCase().endsWith('.png'))
      .sort()
      .slice(0, maxScreenshots)
      .map((entry) => path.join(runDir, 'e2b', 'screenshots', entry));
  } catch {
    return [];
  }
}

async function imageDataUrl(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryableOpenAiStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function outputSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schema_version',
      'case_id',
      'template_name',
      'source_url',
      'status',
      'route_signal',
      'confidence',
      'evidence_basis',
      'positive_signals',
      'risk_signals',
      'manual_checks_remaining',
      'rationale',
      'safety',
    ],
    properties: {
      schema_version: { type: 'string', enum: ['exceptional_candidate_lane.v0.1'] },
      case_id: { type: 'string' },
      template_name: { type: 'string' },
      source_url: { type: 'string' },
      status: { enum: ['shadow', 'failed'] },
      route_signal: {
        enum: ['exceptional_human_review_candidate', 'not_exceptional_enough', 'insufficient_exceptional_evidence'],
      },
      confidence: { enum: ['low', 'medium', 'high'] },
      evidence_basis: {
        type: 'object',
        additionalProperties: false,
        required: ['screenshot_image_input_attached', 'screenshot_count', 'deterministic_summary_refs'],
        properties: {
          screenshot_image_input_attached: { type: 'boolean' },
          screenshot_count: { type: 'number', minimum: 0 },
          deterministic_summary_refs: { type: 'array', items: { type: 'string' } },
        },
      },
      positive_signals: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['bucket', 'summary', 'evidence_references'],
          properties: {
            bucket: { type: 'string' },
            summary: { type: 'string' },
            evidence_references: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      risk_signals: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['bucket', 'severity', 'summary', 'blocks_exceptional', 'evidence_references'],
          properties: {
            bucket: { type: 'string' },
            severity: { enum: ['minor', 'major', 'critical'] },
            summary: { type: 'string' },
            blocks_exceptional: { type: 'boolean' },
            evidence_references: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      manual_checks_remaining: { type: 'array', items: { type: 'string' } },
      rationale: { type: 'string' },
      safety: {
        type: 'object',
        additionalProperties: false,
        required: ['not_final_decision', 'no_external_writes', 'private_outcomes_excluded', 'no_creator_facing_feedback'],
        properties: {
          not_final_decision: { type: 'boolean' },
          no_external_writes: { type: 'boolean' },
          private_outcomes_excluded: { type: 'boolean' },
          no_creator_facing_feedback: { type: 'boolean' },
        },
      },
    },
  };
}

function buildPrompt(args: {
  blindCase: BlindCase;
  normalized: unknown;
  sandboxResult: SandboxResult | undefined;
  rubricText: string;
  screenshotPaths: string[];
  imageInputAttached: boolean;
  precedentContext: PrecedentContext;
}) {
  const system = [
    'You are the exceptional-candidate specialist lane for Webflow Marketplace template review.',
    'Your only job is to decide whether this shadow case deserves human lead review for possible Exceptional or featured consideration.',
    'This lane never approves, rejects, rates, features, or writes creator-facing feedback.',
    'Private Airtable outcomes are intentionally excluded; do not assume them.',
    'Default to not_exceptional_enough unless the evidence shows standout craft across several dimensions and no exceptional-blocking risk.',
    'Treat screenshots as calibration evidence. Strong trend fit alone is not enough.',
    'Do not treat the sandbox page count as full template completeness; the crawler may be capped. Placeholder or untitled routes are page-completeness risks, but a two-page crawl is not.',
    'Do not treat familiar category style as a blocker by itself. Block only when familiarity combines with concrete weak craft, unfinished content, or low differentiation.',
    'Emit structured JSON only.',
  ].join(' ');

  const prompt = {
    task: 'Evaluate one Webflow template for non-final exceptional human-review routing only.',
    route_signals: {
      exceptional_human_review_candidate:
        'Use only when screenshots and artifacts show distinct standout craft across visual design, hierarchy, typography, layout variety, responsive presentation, and page completeness, with no major/critical exceptional blockers.',
      not_exceptional_enough:
        'Use when the case may be acceptable or good, but the evidence does not clear an exceptional route floor or has notable quality risks.',
      insufficient_exceptional_evidence:
        'Use when provider/evidence gaps prevent a route judgment.',
    },
    exceptional_blockers: [
      'unfinished or blank customer-facing regions',
      'placeholder or untitled published routes',
      'outdated/default styling',
      'weak typography or weak visual hierarchy',
      'repetitive default section patterns or low layout variety',
      'generic stock/cutout-heavy composition without strong art direction',
      'awkward mobile crops or obvious responsive presentation problems',
      'major accessibility or semantic issues that indicate incomplete craft',
      'saturated-category sameness without clear differentiation',
    ],
    not_exceptional_blockers_by_themselves: [
      'sandbox page_count is low because max-pages was capped',
      'minor missing alt text that needs context review',
      'overflow or clipped-text candidate counts that were not promoted to substantive findings',
      'familiar category style when craft, hierarchy, typography, and responsive presentation are otherwise strong',
      'large intentional whitespace in wellness, editorial, portfolio, consulting, or premium-minimal categories unless it visibly reads as broken or unfinished',
    ],
    positive_route_floor: [
      'specific standout visual craft',
      'cohesive art direction and imagery',
      'strong typography and hierarchy',
      'intentional layout variety and spacing',
      'desktop and mobile presentation both appear deliberate',
      'minor/manual issues are bounded and do not indicate unfinished craft',
    ],
    precedent_context: args.precedentContext,
    routing_guidance: {
      exceptional_human_review_candidate:
        'route to a human lead when there are four or more specific positive craft signals, no concrete major/critical blockers, only bounded manual checks remain, and the case compares favorably to approved Exceptional precedents rather than merely approved Good controls; this is still not a final rating or feature decision',
      not_exceptional_enough:
        'use when concrete blockers exist, positive signals are generic, the template looks merely competent/good rather than standout, or the approved Exceptional precedents are missing and the evidence does not independently clear the route floor',
      insufficient_exceptional_evidence:
        'use for provider failures, missing screenshots, or evidence too thin to judge route eligibility',
    },
    baseline_rubric_source: 'https://webflow.com/templates/grading-rubric',
    rubric_context_markdown: args.rubricText,
    blind_case: args.blindCase,
    sandbox_result_summary: args.sandboxResult?.normalized_output,
    normalized_sandbox_evidence: args.normalized,
    screenshot_set: {
      image_input_attached: args.imageInputAttached,
      local_artifact_paths: args.screenshotPaths,
      count: args.screenshotPaths.length,
    },
    output_schema: outputSchema(),
  };

  return { system, promptText: JSON.stringify(prompt, null, 2) };
}

function parseOutput(value: string): ExceptionalLaneOutput {
  const parsed = JSON.parse(value) as ExceptionalLaneOutput;
  if (parsed.schema_version !== 'exceptional_candidate_lane.v0.1') throw new Error('Invalid schema_version.');
  if (!parsed.safety?.not_final_decision || !parsed.safety?.no_external_writes || !parsed.safety?.private_outcomes_excluded) {
    throw new Error('Provider output violated safety contract.');
  }
  return parsed;
}

function extractResponseText(data: OpenAiResponse): string | undefined {
  if (typeof data.output_text === 'string') return data.output_text;
  const output = data.output;
  if (!Array.isArray(output)) return undefined;
  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string') texts.push(text);
    }
  }
  return texts.join('\n').trim() || undefined;
}

function dryRunOutput(blindCase: BlindCase, screenshotPaths: string[], imageInputAttached: boolean): ExceptionalLaneOutput {
  return {
    schema_version: 'exceptional_candidate_lane.v0.1',
    case_id: blindCase.case_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    status: 'shadow',
    route_signal: 'insufficient_exceptional_evidence',
    confidence: 'low',
    evidence_basis: {
      screenshot_image_input_attached: imageInputAttached,
      screenshot_count: screenshotPaths.length,
      deterministic_summary_refs: ['dry_run:no_model_call'],
    },
    positive_signals: [],
    risk_signals: [],
    manual_checks_remaining: ['provider_run', 'human_lead_review_if_candidate'],
    rationale: 'Dry-run placeholder. No exceptional-candidate judgment was produced.',
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      private_outcomes_excluded: true,
      no_creator_facing_feedback: true,
    },
  };
}

function failedOutput(blindCase: BlindCase, screenshotPaths: string[], imageInputAttached: boolean, error: unknown): ExceptionalLaneOutput {
  const message = error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800);
  return {
    schema_version: 'exceptional_candidate_lane.v0.1',
    case_id: blindCase.case_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    status: 'failed',
    route_signal: 'insufficient_exceptional_evidence',
    confidence: 'low',
    evidence_basis: {
      screenshot_image_input_attached: imageInputAttached,
      screenshot_count: screenshotPaths.length,
      deterministic_summary_refs: ['provider_call_failed'],
    },
    positive_signals: [],
    risk_signals: [
      {
        bucket: 'provider_failure',
        severity: 'major',
        summary: `Provider call failed: ${message}`,
        blocks_exceptional: true,
        evidence_references: ['provider_call_failed'],
      },
    ],
    manual_checks_remaining: ['provider_retry', 'human_review'],
    rationale: 'The exceptional-candidate lane failed closed because the provider did not return a valid judgment.',
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      private_outcomes_excluded: true,
      no_creator_facing_feedback: true,
    },
  };
}

async function callOpenAi(args: {
  options: CliOptions;
  system: string;
  promptText: string;
  screenshotPaths: string[];
}): Promise<{ output: ExceptionalLaneOutput; raw: OpenAiResponse; latency_ms: number }> {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OPENAI_API_KEY is required for --provider openai.');
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.options.timeoutMs);
  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: args.promptText }];
  for (const screenshotPath of args.screenshotPaths) {
    content.push({
      type: 'input_image',
      image_url: await imageDataUrl(screenshotPath),
      detail: args.options.imageDetail,
    });
  }

  try {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: args.options.model,
            store: false,
            instructions: args.system,
            input: [{ role: 'user', content }],
            text: {
              format: {
                type: 'json_schema',
                name: 'exceptional_candidate_lane_output',
                strict: true,
                schema: outputSchema(),
              },
            },
          }),
        });
        const rawText = await response.text();
        if (!response.ok) {
          const error = new Error(`OpenAI Responses API failed (${response.status}): ${rawText.slice(0, 500)}`);
          if (attempt < OPENAI_MAX_ATTEMPTS && retryableOpenAiStatus(response.status)) {
            lastError = error;
            await sleep(1_000 * attempt);
            continue;
          }
          throw error;
        }
        const raw = JSON.parse(rawText) as OpenAiResponse;
        const outputText = extractResponseText(raw);
        if (!outputText) throw new Error('OpenAI Responses API returned no output text.');
        return {
          output: parseOutput(outputText),
          raw,
          latency_ms: Date.now() - startedAt,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < OPENAI_MAX_ATTEMPTS) {
          await sleep(1_000 * attempt);
          continue;
        }
      }
    }
    throw lastError ?? new Error('OpenAI Responses API failed.');
  } finally {
    clearTimeout(timeout);
  }
}

function safetyOk(output: ExceptionalLaneOutput): boolean {
  return Boolean(
    output.safety?.not_final_decision &&
      output.safety.no_external_writes &&
      output.safety.private_outcomes_excluded &&
      output.safety.no_creator_facing_feedback,
  );
}

function alignmentLabel(output: ExceptionalLaneOutput, privateOutcome: PrivateOutcome | undefined): string {
  const expected = privateOutcome?.selection_stratum;
  if (!expected) return 'no_private_comparison';
  if (!safetyOk(output)) return 'safety_failure';
  if (output.status === 'failed' || output.route_signal === 'insufficient_exceptional_evidence') return 'provider_or_evidence_failed';
  const routedExceptional = output.route_signal === 'exceptional_human_review_candidate';
  if (expected === 'approved_exceptional' && routedExceptional) return 'exceptional_alignment';
  if (expected === 'approved_exceptional' && !routedExceptional) return 'missed_exceptional_candidate';
  if ((expected === 'rejected_low_quality' || expected === 'iterative_review') && routedExceptional) return 'danger_false_exceptional_candidate';
  if (expected === 'approved_good' && routedExceptional) return 'approved_good_overpromotion';
  return 'not_exceptional_alignment';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });
  await mkdir(path.join(options.outDir, 'cases'), { recursive: true });

  const blindCases = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const sandboxResults = await readJsonl<SandboxResult>(path.join(options.inputDir, 'sandbox-results.jsonl'));
  const privateOutcomes = await readJsonl<PrivateOutcome>(path.join(options.inputDir, 'outcomes.private.jsonl')).catch(() => []);
  const selectedCases = selectCases(blindCases, options);
  const rubricPath = await resolveExistingPath(options.rubricFile);
  const rubricText = (await readFile(rubricPath, 'utf8')).slice(0, options.maxRubricChars);
  const precedentCases = options.precedentFile
    ? await readJsonl<GoldenCaseProposal>(await resolveExistingPath(options.precedentFile))
    : [];
  const resultRows: Array<Record<string, unknown>> = [];

  for (const blindCase of selectedCases) {
    const caseDir = path.join(options.outDir, 'cases', blindCase.case_id);
    await mkdir(caseDir, { recursive: true });
    const sandboxResult = sandboxResults.find((item) => item.case_id === blindCase.case_id);
    const runDir = sandboxResult?.artifacts?.run_dir ?? path.join(options.inputDir, 'runs', blindCase.case_id);
    const normalizedDir = sandboxResult?.artifacts?.normalized_dir ?? path.join(runDir, 'e2b', 'normalized');
    const normalized = await optionalJson<unknown>(path.join(normalizedDir, 'published-site-sandbox-normalized.json'));
    const screenshotPaths = options.includeScreenshot ? await findScreenshots(runDir, options.maxScreenshots) : [];
    const imageInputAttached = options.provider === 'openai' && screenshotPaths.length > 0;
    const precedentContext = selectPrecedents(precedentCases, blindCase, options);
    const { system, promptText } = buildPrompt({
      blindCase,
      normalized,
      sandboxResult,
      rubricText,
      screenshotPaths,
      imageInputAttached,
      precedentContext,
    });
    await writeFile(
      path.join(caseDir, 'exceptional-candidate-prompt.json'),
      `${JSON.stringify(
        {
          provider: options.provider,
          model: options.model,
          case_id: blindCase.case_id,
          precedent_counts: {
            approved_exceptional: precedentContext.approved_exceptional.length,
            approved_good: precedentContext.approved_good.length,
            rejected_visual_quality: precedentContext.rejected_visual_quality.length,
          },
          system,
          prompt_text: promptText,
        },
        null,
        2,
      )}\n`,
    );

    let output: ExceptionalLaneOutput;
    let rawResponse: OpenAiResponse | undefined;
    let latencyMs = 0;
    if (options.provider === 'dry-run') {
      output = dryRunOutput(blindCase, screenshotPaths, imageInputAttached);
    } else {
      try {
        const response = await callOpenAi({ options, system, promptText, screenshotPaths });
        output = response.output;
        rawResponse = response.raw;
        latencyMs = response.latency_ms;
      } catch (error) {
        output = failedOutput(blindCase, screenshotPaths, imageInputAttached, error);
      }
    }

    const privateOutcome = privateOutcomes.find((item) => item.case_id === blindCase.case_id);
    const artifact: LaneArtifact = {
      generated_at: new Date().toISOString(),
      provider: options.provider,
      model: options.provider === 'openai' ? options.model : 'dry_run_no_model_call',
      latency_ms: latencyMs,
      input_dir: options.inputDir,
      case_id: blindCase.case_id,
      screenshot_paths: screenshotPaths,
      screenshot_count: screenshotPaths.length,
      screenshot_image_input_attached: imageInputAttached,
      private_comparison: privateOutcome
        ? {
            expected_review_status: privateOutcome.actual_review_status,
            expected_quality_rating: privateOutcome.actual_quality_rating,
            selection_stratum: privateOutcome.selection_stratum,
            reviewer_present: Boolean(privateOutcome.reviewer),
            note: 'Private comparison was not included in the prompt.',
          }
        : undefined,
      output,
    };
    await writeFile(path.join(caseDir, 'exceptional-candidate-output.json'), `${JSON.stringify(artifact, null, 2)}\n`);
    if (rawResponse) {
      await writeFile(
        path.join(caseDir, 'exceptional-candidate-openai-response-metadata.json'),
        `${JSON.stringify({ id: rawResponse.id, model: rawResponse.model, status: rawResponse.status, usage: rawResponse.usage }, null, 2)}\n`,
      );
    }

    const row = {
      case_id: blindCase.case_id,
      template_name: blindCase.template_name,
      source_url: blindCase.source_url,
      provider: options.provider,
      ok: output.status === 'shadow',
      output_status: output.status,
      route_signal: output.route_signal,
      confidence: output.confidence,
      positive_signal_count: output.positive_signals.length,
      risk_signal_count: output.risk_signals.length,
      blocking_risk_count: output.risk_signals.filter((item) => item.blocks_exceptional).length,
      approved_exceptional_precedent_count: precedentContext.approved_exceptional.length,
      approved_good_precedent_count: precedentContext.approved_good.length,
      rejected_visual_precedent_count: precedentContext.rejected_visual_quality.length,
      screenshot_count: screenshotPaths.length,
      screenshot_image_input_attached: imageInputAttached,
      private_expected_review_status: privateOutcome?.actual_review_status,
      private_expected_quality_rating: privateOutcome?.actual_quality_rating,
      selection_stratum: privateOutcome?.selection_stratum,
      reviewer_present: Boolean(privateOutcome?.reviewer),
      alignment_label: alignmentLabel(output, privateOutcome),
      safety_ok: safetyOk(output),
      out_dir: caseDir,
    };
    resultRows.push(row);
    console.log(JSON.stringify(row));
  }

  await writeFile(
    path.join(options.outDir, 'exceptional-candidate-results.jsonl'),
    `${resultRows.map((row) => JSON.stringify(row)).join('\n')}\n`,
  );
  const summary = {
    generated_at: new Date().toISOString(),
    provider: options.provider,
    model: options.provider === 'openai' ? options.model : 'dry_run_no_model_call',
    input_dir: options.inputDir,
    out_dir: options.outDir,
    selected_count: resultRows.length,
    ok_count: resultRows.filter((row) => row.ok).length,
    failed_count: resultRows.filter((row) => !row.ok).length,
    route_signal_counts: countBy(resultRows, 'route_signal'),
    alignment_counts: countBy(resultRows, 'alignment_label'),
    files: {
      results: path.join(options.outDir, 'exceptional-candidate-results.jsonl'),
    },
    notes: [
      'Private Airtable outcomes were excluded from lane prompts and joined only after output for calibration scoring.',
      'This lane is shadow-only and may not approve, reject, rate, feature, or write creator-facing feedback.',
    ],
  };
  await writeFile(path.join(options.outDir, 'exceptional-candidate-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

function countBy(rows: Array<Record<string, unknown>>, field: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = String(row[field] ?? 'unknown');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
