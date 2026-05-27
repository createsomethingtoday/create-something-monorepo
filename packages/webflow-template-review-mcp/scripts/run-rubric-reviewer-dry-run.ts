import { access, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  outDir: string;
  caseId?: string;
  caseIndex: number;
  rubricFile: string;
  provider: 'dry-run' | 'openai';
  model: string;
  includeScreenshot: boolean;
  maxScreenshots: number;
  imageDetail: 'low' | 'high' | 'auto';
  timeoutMs: number;
  maxRubricChars: number;
};

type BlindCase = {
  case_id: string;
  asset_id: string;
  version_id: string;
  template_name: string;
  source_url: string;
  published_url?: string;
  preview_url?: string;
  version_number?: number;
  submitted_at?: string;
  marketplace_status?: string;
  parent_latest_review_status?: string;
};

type PrivateOutcome = {
  case_id: string;
  actual_review_status?: string;
  actual_quality_rating?: string;
  selection_stratum?: string;
  reviewer?: string;
  review_feedback_snippet?: string;
  rejection_reason?: string;
  rejection_feedback_snippet?: string;
};

type SandboxResult = {
  case_id: string;
  artifacts?: {
    run_dir?: string;
    normalized_dir?: string;
  };
  normalized_output?: {
    rendered_status?: string;
    screenshot_count?: number;
    finding_count?: number;
    substantive_finding_count?: number;
    finding_rule_ids?: string[];
    finding_buckets?: string[];
  };
};

type RubricReviewerOutput = {
  schema_version: 'rubric_reviewer_shadow.v0.1';
  case_id: string;
  template_name: string;
  source_url: string;
  status: 'shadow' | 'failed';
  recommendation:
    | 'likely_rejectable'
    | 'request_changes_average'
    | 'clean_good_candidate'
    | 'exceptional_human_review_candidate'
    | 'manual_review_required'
    | 'insufficient_evidence';
  quality_band: 'reject' | 'average' | 'good_candidate' | 'exceptional_candidate' | 'uncertain';
  confidence: 'low' | 'medium' | 'high';
  rubric_dimensions: Array<{
    dimension_id: string;
    band: 'satisfactory' | 'good' | 'exceptional' | 'uncertain' | 'not_assessed';
    score: number;
    confidence: 'low' | 'medium' | 'high';
    reasoning_summary: string;
    evidence_references: string[];
    manual_review_required: boolean;
  }>;
  standardized_response: {
    internal_summary: string;
    reviewer_action: string;
    creator_safe_feedback_draft: string;
    evidence_bullets: string[];
  };
  standardized_findings: Array<{
    bucket: string;
    severity: 'info' | 'minor' | 'major' | 'critical';
    internal_summary: string;
    creator_safe_feedback: string;
    evidence_references: string[];
    requires_human_review: boolean;
  }>;
  manual_checks_remaining: string[];
  cannot_determine: string[];
  safety: {
    not_final_decision: boolean;
    no_external_writes: boolean;
    private_outcomes_excluded: boolean;
    screenshot_used: boolean;
  };
};

type OpenAiResponse = Record<string, unknown>;

const DEFAULT_INPUT_DIR = '/tmp/webflow-template-review-direct-e2b-calibration-expanded-2026-05-27';
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-rubric-reviewer-dry-run';
const DEFAULT_RUBRIC_FILE = 'specs/webflow-marketplace/delivery/template-review-hub/rubric-codification-map.md';
const OPENAI_MAX_ATTEMPTS = 3;

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: DEFAULT_INPUT_DIR,
    outDir: DEFAULT_OUT_DIR,
    caseIndex: 1,
    rubricFile: DEFAULT_RUBRIC_FILE,
    provider: 'dry-run',
    model: process.env.OPENAI_MODEL?.trim() || 'gpt-5.5',
    includeScreenshot: false,
    maxScreenshots: 4,
    imageDetail: 'low',
    timeoutMs: 120_000,
    maxRubricChars: 12_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--input' && next) {
      options.inputDir = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--case-id' && next) {
      options.caseId = next;
      i += 1;
      continue;
    }
    if (arg === '--case-index' && next) {
      options.caseIndex = boundedInt(next, 1, 100, '--case-index');
      i += 1;
      continue;
    }
    if (arg === '--rubric-file' && next) {
      options.rubricFile = next;
      i += 1;
      continue;
    }
    if (arg === '--provider' && next) {
      if (next !== 'dry-run' && next !== 'openai') throw new Error('--provider must be dry-run or openai.');
      options.provider = next;
      i += 1;
      continue;
    }
    if (arg === '--model' && next) {
      options.model = next;
      i += 1;
      continue;
    }
    if (arg === '--include-screenshot') {
      options.includeScreenshot = true;
      continue;
    }
    if (arg === '--max-screenshots' && next) {
      options.maxScreenshots = boundedInt(next, 1, 12, '--max-screenshots');
      i += 1;
      continue;
    }
    if (arg === '--image-detail' && next) {
      if (next !== 'low' && next !== 'high' && next !== 'auto') throw new Error('--image-detail must be low, high, or auto.');
      options.imageDetail = next;
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 600_000, '--timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--max-rubric-chars' && next) {
      options.maxRubricChars = boundedInt(next, 1_000, 50_000, '--max-rubric-chars');
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    inputDir: options.inputDir ?? DEFAULT_INPUT_DIR,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    caseId: options.caseId,
    caseIndex: options.caseIndex ?? 1,
    rubricFile: options.rubricFile ?? DEFAULT_RUBRIC_FILE,
    provider: options.provider ?? 'dry-run',
    model: options.model ?? 'gpt-5.5',
    includeScreenshot: options.includeScreenshot ?? false,
    maxScreenshots: options.maxScreenshots ?? 4,
    imageDetail: options.imageDetail ?? 'low',
    timeoutMs: options.timeoutMs ?? 120_000,
    maxRubricChars: options.maxRubricChars ?? 12_000,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp rubric:reviewer:dry-run -- [options]

Options:
  --input <dir>              Calibration output directory. Default: ${DEFAULT_INPUT_DIR}
  --out <dir>                Output directory. Default: ${DEFAULT_OUT_DIR}
  --case-id <id>             Case ID to review. Default: selected by --case-index
  --case-index <n>           1-based case index from manifest.blind.jsonl. Default: 1
  --rubric-file <file>       Rubric context markdown. Default: ${DEFAULT_RUBRIC_FILE}
  --provider <provider>      dry-run or openai. Default: dry-run
  --model <model>            OpenAI model. Default: OPENAI_MODEL or gpt-5.5
  --include-screenshot       Include downloaded E2B screenshots as image input when provider supports images.
  --max-screenshots <n>      Maximum screenshots to include. Default: 4
  --image-detail <level>     low, high, or auto. Default: low
  --timeout-ms <n>           OpenAI call timeout. Default: 120000
  --max-rubric-chars <n>     Rubric markdown budget. Default: 12000
  --help                     Show this help.

Environment:
  OPENAI_API_KEY             Required when --provider openai.

Behavior:
  Produces a private shadow standardized review response for one template case.
  It never writes Airtable, D1, R2, Dify, official review status, ratings, or
  creator-facing feedback. Private Airtable outcomes are excluded from the
  model prompt and only joined afterward for calibration comparison.
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

async function resolveExistingPath(filePath: string): Promise<string> {
  if (path.isAbsolute(filePath)) return filePath;
  const candidates = [
    path.resolve(process.cwd(), filePath),
    path.resolve(process.cwd(), '..', '..', filePath),
    path.resolve(process.cwd(), '..', '..', '..', filePath),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common execution root.
    }
  }
  return candidates[0] ?? filePath;
}

async function optionalJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

function outputSchema() {
  const confidence = ['low', 'medium', 'high'];
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schema_version',
      'case_id',
      'template_name',
      'source_url',
      'status',
      'recommendation',
      'quality_band',
      'confidence',
      'rubric_dimensions',
      'standardized_response',
      'standardized_findings',
      'manual_checks_remaining',
      'cannot_determine',
      'safety',
    ],
    properties: {
      schema_version: { type: 'string', enum: ['rubric_reviewer_shadow.v0.1'] },
      case_id: { type: 'string' },
      template_name: { type: 'string' },
      source_url: { type: 'string' },
      status: { enum: ['shadow', 'failed'] },
      recommendation: {
        enum: [
          'likely_rejectable',
          'request_changes_average',
          'clean_good_candidate',
          'exceptional_human_review_candidate',
          'manual_review_required',
          'insufficient_evidence',
        ],
      },
      quality_band: { enum: ['reject', 'average', 'good_candidate', 'exceptional_candidate', 'uncertain'] },
      confidence: { enum: confidence },
      rubric_dimensions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'dimension_id',
            'band',
            'score',
            'confidence',
            'reasoning_summary',
            'evidence_references',
            'manual_review_required',
          ],
          properties: {
            dimension_id: { type: 'string' },
            band: { enum: ['satisfactory', 'good', 'exceptional', 'uncertain', 'not_assessed'] },
            score: { type: 'number', minimum: 0, maximum: 5 },
            confidence: { enum: confidence },
            reasoning_summary: { type: 'string' },
            evidence_references: { type: 'array', items: { type: 'string' } },
            manual_review_required: { type: 'boolean' },
          },
        },
      },
      standardized_response: {
        type: 'object',
        additionalProperties: false,
        required: ['internal_summary', 'reviewer_action', 'creator_safe_feedback_draft', 'evidence_bullets'],
        properties: {
          internal_summary: { type: 'string' },
          reviewer_action: { type: 'string' },
          creator_safe_feedback_draft: { type: 'string' },
          evidence_bullets: { type: 'array', items: { type: 'string' } },
        },
      },
      standardized_findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'bucket',
            'severity',
            'internal_summary',
            'creator_safe_feedback',
            'evidence_references',
            'requires_human_review',
          ],
          properties: {
            bucket: { type: 'string' },
            severity: { enum: ['info', 'minor', 'major', 'critical'] },
            internal_summary: { type: 'string' },
            creator_safe_feedback: { type: 'string' },
            evidence_references: { type: 'array', items: { type: 'string' } },
            requires_human_review: { type: 'boolean' },
          },
        },
      },
      manual_checks_remaining: { type: 'array', items: { type: 'string' } },
      cannot_determine: { type: 'array', items: { type: 'string' } },
      safety: {
        type: 'object',
        additionalProperties: false,
        required: ['not_final_decision', 'no_external_writes', 'private_outcomes_excluded', 'screenshot_used'],
        properties: {
          not_final_decision: { type: 'boolean' },
          no_external_writes: { type: 'boolean' },
          private_outcomes_excluded: { type: 'boolean' },
          screenshot_used: { type: 'boolean' },
        },
      },
    },
  };
}

function parseOutput(value: string): RubricReviewerOutput {
  const parsed = JSON.parse(value) as RubricReviewerOutput;
  if (parsed.schema_version !== 'rubric_reviewer_shadow.v0.1') throw new Error('Invalid schema_version.');
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

async function findScreenshots(runDir: string | undefined, maxScreenshots: number): Promise<string[]> {
  if (!runDir) return [];
  const screenshotDir = path.join(runDir, 'e2b', 'screenshots');
  try {
    const entries = await readdir(screenshotDir);
    return entries
      .filter((entry) => entry.toLowerCase().endsWith('.png'))
      .sort()
      .slice(0, maxScreenshots)
      .map((entry) => path.join(screenshotDir, entry));
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

function buildPrompt(args: {
  blindCase: BlindCase;
  normalized: unknown;
  sandboxResult: SandboxResult | undefined;
  rubricText: string;
  screenshotPaths: string[];
  imageInputAttached: boolean;
}) {
  const instructions = [
    'You are a shadow Webflow Marketplace template review agent.',
    'Your job is to produce a standardized internal review response using the Webflow template grading rubric and supplied evidence.',
    'Do not issue an official approval, rejection, rating, featured decision, or creator-facing final notice.',
    'Do not assume private Airtable outcome labels; they are intentionally excluded from this prompt.',
    'Use screenshot inputs as internal calibration evidence, not as an official decision surface.',
    'If screenshots show neither a strong positive route signal nor a specific negative quality signal, mark manual review required.',
    'Do not suppress an exceptional human-review candidate solely because interactions, optimization, or accessibility context still need manual confirmation.',
    'Prefer standardized rubric buckets over reviewer-specific wording.',
    'Return structured JSON only.',
  ].join(' ');

  const prompt = {
    task: 'Review one Webflow template case in shadow mode and produce a standardized response.',
    allowed_outputs: [
      'shadow recommendation',
      'rubric dimension scores',
      'standardized internal summary',
      'creator-safe draft language for reviewer editing',
      'manual checks remaining',
    ],
    forbidden_outputs: [
      'official approval',
      'official rejection',
      'official quality rating',
      'featured decision',
      'Airtable/D1/R2/Dify write',
    ],
    baseline_rubric_source: 'https://webflow.com/templates/grading-rubric',
    rubric_context_markdown: args.rubricText,
    blind_case: args.blindCase,
    sandbox_result_summary: args.sandboxResult?.normalized_output,
    normalized_sandbox_evidence: args.normalized,
    screenshot_set: args.screenshotPaths.length > 0
      ? {
          image_input_attached: args.imageInputAttached,
          local_artifact_paths: args.screenshotPaths,
          count: args.screenshotPaths.length,
          note: args.imageInputAttached
            ? 'Use these screenshot image inputs cautiously; screenshot-based visual quality remains calibration-only.'
            : 'Screenshot artifacts are available as local paths only; do not infer visual quality from images unless image_input_attached is true.',
        }
      : {
          image_input_attached: false,
          local_artifact_paths: [],
          count: 0,
          note: 'No image input is available; do not infer visual quality beyond text evidence.',
        },
    standardization_policy: {
      low_quality_or_outdated_style: 'manual_review_required unless negative visual evidence is strong and specific',
      missing_alt_text: 'minor accessibility signal unless context makes it severe',
      good_or_exceptional: 'candidate labels only; human reviewer owns final rating',
      exceptional_candidate_signal:
        'allowed only as non-final human-review routing when screenshots show standout craft across multiple visual or UX dimensions, confirmed hard blockers are absent, and remaining unknowns are listed as manual checks',
      minor_manual_issues:
        'minor accessibility, SEO, or guideline issues should become findings and manual checks; do not let them erase an otherwise strong exceptional-candidate route signal',
      unresolved_interaction_or_performance_checks:
        'list as manual checks; do not alone suppress an exceptional candidate signal when visual, hierarchy, layout, and responsive evidence are strongly positive',
      screenshot_visible_quality_risks:
        'actively look for outdated/default styling, weak typography, generic stock or human-cutout-heavy composition, repetitive section patterns, low layout variety, oversized empty/unfinished areas, awkward mobile crops, placeholder or untitled pages, and saturated-category visual sameness',
      positive_route_disqualifiers:
        'do not output clean_good_candidate or exceptional_human_review_candidate when screenshots or static evidence show unfinished/blank content regions, placeholder/untitled customer-facing pages, multiple strong outdated/default style signals, or a combination of weak typography plus repetitive default layouts',
      exceptional_route_floor:
        'exceptional_human_review_candidate requires distinct craft, not just modern trend fit; generic SaaS dark-mode, generic wellness imagery, or acceptable consulting layouts are not enough without standout composition, hierarchy, typography, imagery, and page completeness',
      if_evidence_does_not_support_a_human_like_decision: 'say what cannot be determined',
    },
    recommendation_guidance: {
      exceptional_human_review_candidate:
        'Use only when this should be routed to a human lead for possible exceptional or featured consideration. This is not approval and not a featured decision. Require several specific positive evidence bullets, no confirmed critical or major blockers, and manual_checks_remaining for every unverified area.',
      clean_good_candidate:
        'Use when the case appears solidly approvable after minor checks, but the evidence does not show standout craft or differentiation.',
      manual_review_required:
        'Use when evidence is incomplete and there is not enough positive or negative signal to route as good, exceptional, changes requested, or rejectable.',
      request_changes_average:
        'Use when the likely path is normal revision around average/satisfactory quality or fixable issues.',
      likely_rejectable:
        'Use only when evidence supports low quality, severe guideline failure, or a likely rejection path; explain specific rejectability signals.',
    },
    output_schema: outputSchema(),
  };

  return {
    instructions,
    promptText: JSON.stringify(prompt, null, 2),
  };
}

function dryRunOutput(blindCase: BlindCase, screenshotUsed: boolean): RubricReviewerOutput {
  return {
    schema_version: 'rubric_reviewer_shadow.v0.1',
    case_id: blindCase.case_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    status: 'shadow',
    recommendation: 'manual_review_required',
    quality_band: 'uncertain',
    confidence: 'low',
    rubric_dimensions: [
      {
        dimension_id: 'visual_quality',
        band: 'uncertain',
        score: 0,
        confidence: 'low',
        reasoning_summary: 'Dry-run placeholder; no model provider was called.',
        evidence_references: ['dry_run:no_model_call'],
        manual_review_required: true,
      },
    ],
    standardized_response: {
      internal_summary: 'Dry-run placeholder. No standardized review judgment was produced.',
      reviewer_action: 'Run with --provider openai for a live shadow response.',
      creator_safe_feedback_draft: '',
      evidence_bullets: ['dry_run:no_model_call'],
    },
    standardized_findings: [],
    manual_checks_remaining: ['visual_quality', 'rubric_alignment', 'human_review'],
    cannot_determine: ['all_rubric_bands'],
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      private_outcomes_excluded: true,
      screenshot_used: screenshotUsed,
    },
  };
}

function failedProviderOutput(blindCase: BlindCase, screenshotUsed: boolean, error: unknown): RubricReviewerOutput {
  const message = error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800);
  return {
    schema_version: 'rubric_reviewer_shadow.v0.1',
    case_id: blindCase.case_id,
    template_name: blindCase.template_name,
    source_url: blindCase.source_url,
    status: 'failed',
    recommendation: 'insufficient_evidence',
    quality_band: 'uncertain',
    confidence: 'low',
    rubric_dimensions: [
      {
        dimension_id: 'rubric_review_provider',
        band: 'not_assessed',
        score: 0,
        confidence: 'low',
        reasoning_summary: `Provider call failed: ${message}`,
        evidence_references: ['provider_call_failed'],
        manual_review_required: true,
      },
    ],
    standardized_response: {
      internal_summary: 'The shadow rubric reviewer did not produce a model judgment because the provider call failed.',
      reviewer_action: 'Keep this case in human review and retry the shadow reviewer after provider availability is restored.',
      creator_safe_feedback_draft: '',
      evidence_bullets: ['provider_call_failed'],
    },
    standardized_findings: [],
    manual_checks_remaining: ['provider_retry', 'human_review'],
    cannot_determine: ['rubric_bands', 'standardized_feedback'],
    safety: {
      not_final_decision: true,
      no_external_writes: true,
      private_outcomes_excluded: true,
      screenshot_used: screenshotUsed,
    },
  };
}

async function callOpenAi(args: {
  options: CliOptions;
  instructions: string;
  promptText: string;
  screenshotPaths: string[];
}): Promise<{ output: RubricReviewerOutput; raw: OpenAiResponse; latency_ms: number }> {
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
            instructions: args.instructions,
            input: [
              {
                role: 'user',
                content,
              },
            ],
            text: {
              format: {
                type: 'json_schema',
                name: 'rubric_reviewer_shadow_output',
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const blindCases = await readJsonl<BlindCase>(path.join(options.inputDir, 'manifest.blind.jsonl'));
  const sandboxResults = await readJsonl<SandboxResult>(path.join(options.inputDir, 'sandbox-results.jsonl'));
  const privateOutcomes = await readJsonl<PrivateOutcome>(path.join(options.inputDir, 'outcomes.private.jsonl')).catch(() => []);
  const selected = options.caseId
    ? blindCases.find((item) => item.case_id === options.caseId)
    : blindCases[options.caseIndex - 1];
  if (!selected) throw new Error(`Case not found. case_id=${options.caseId ?? ''} case_index=${options.caseIndex}`);

  const sandboxResult = sandboxResults.find((item) => item.case_id === selected.case_id);
  const runDir = sandboxResult?.artifacts?.run_dir ?? path.join(options.inputDir, 'runs', selected.case_id);
  const normalizedDir = sandboxResult?.artifacts?.normalized_dir ?? path.join(runDir, 'e2b', 'normalized');
  const normalized = await optionalJson<unknown>(path.join(normalizedDir, 'published-site-sandbox-normalized.json'));
  const screenshotPaths = options.includeScreenshot ? await findScreenshots(runDir, options.maxScreenshots) : [];
  const imageInputAttached = options.provider === 'openai' && screenshotPaths.length > 0;
  const rubricPath = await resolveExistingPath(options.rubricFile);
  const rubricRaw = await readFile(rubricPath, 'utf8');
  const rubricText = rubricRaw.slice(0, options.maxRubricChars);
  const { instructions, promptText } = buildPrompt({
    blindCase: selected,
    normalized,
    sandboxResult,
    rubricText,
    screenshotPaths,
    imageInputAttached,
  });

  await writeFile(
    path.join(options.outDir, 'rubric-reviewer-prompt.json'),
    `${JSON.stringify(
      {
        provider: options.provider,
        model: options.provider === 'openai' ? options.model : 'dry_run_no_model_call',
        case_id: selected.case_id,
        screenshot_paths: screenshotPaths,
        screenshot_count: screenshotPaths.length,
        screenshot_image_input_attached: imageInputAttached,
        rubric_file: rubricPath,
        instructions,
        prompt_text: promptText,
      },
      null,
      2,
    )}\n`,
  );

  let output: RubricReviewerOutput;
  let rawResponse: OpenAiResponse | undefined;
  let latencyMs = 0;
  if (options.provider === 'dry-run') {
    output = dryRunOutput(selected, imageInputAttached);
  } else {
    try {
      const response = await callOpenAi({ options, instructions, promptText, screenshotPaths });
      output = response.output;
      rawResponse = response.raw;
      latencyMs = response.latency_ms;
    } catch (error) {
      output = failedProviderOutput(selected, imageInputAttached, error);
    }
  }

  const privateOutcome = privateOutcomes.find((item) => item.case_id === selected.case_id);
  const artifact = {
    generated_at: new Date().toISOString(),
    provider: options.provider,
    model: options.provider === 'openai' ? options.model : 'dry_run_no_model_call',
    latency_ms: latencyMs,
    input_dir: options.inputDir,
    case_id: selected.case_id,
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
  await writeFile(path.join(options.outDir, 'rubric-reviewer-output.json'), `${JSON.stringify(artifact, null, 2)}\n`);

  if (rawResponse) {
    await writeFile(
      path.join(options.outDir, 'rubric-reviewer-openai-response-metadata.json'),
      `${JSON.stringify(
        {
          id: rawResponse.id,
          model: rawResponse.model,
          status: rawResponse.status,
          usage: rawResponse.usage,
        },
        null,
        2,
      )}\n`,
    );
  }

  const summary = {
    ok: true,
    provider: options.provider,
    model: artifact.model,
    case_id: selected.case_id,
    template_name: selected.template_name,
    source_url: selected.source_url,
    screenshot_used: output.safety.screenshot_used,
    screenshot_count: screenshotPaths.length,
    screenshot_image_input_attached: imageInputAttached,
    recommendation: output.recommendation,
    quality_band: output.quality_band,
    confidence: output.confidence,
    standardized_finding_count: output.standardized_findings.length,
    manual_checks_remaining: output.manual_checks_remaining,
    private_expected_review_status: privateOutcome?.actual_review_status,
    private_expected_quality_rating: privateOutcome?.actual_quality_rating,
    out_dir: options.outDir,
  };
  await writeFile(path.join(options.outDir, 'rubric-reviewer-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
