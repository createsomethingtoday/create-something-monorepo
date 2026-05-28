import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  outDir: string;
  mode: 'prompt-only' | 'dry-run' | 'live';
  provider: 'dry_run' | 'openai';
  panelVersion: string;
  judgeIds: string[];
  maxCases?: number;
  criteria?: string[];
  model?: string;
  timeoutMs: number;
};

type SubjectiveEvalBlindCase = {
  case_id: string;
  eval_set_version: string;
  asset_id?: string;
  version_id: string;
  template_name?: string;
  published_url: string;
  criteria: string[];
  allowed_sources: string[];
  required_artifacts: string[];
  precedent_policy: {
    allowed_status: 'approved';
    criterion_scoped: true;
    policy_snapshot_required: true;
  };
  notes: string[];
};

type PanelPrompt = {
  prompt_id: string;
  case_id: string;
  criterion_id: string;
  judge_id: string;
  panel_version: string;
  mode: 'independent_judge';
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  output_schema: Record<string, unknown>;
};

type SubjectivePanelOutput = {
  case_id: string;
  criterion_id: string;
  panel_version: string;
  status: 'shadow' | 'failed';
  panel_band: 'reject' | 'average' | 'good' | 'exceptional' | 'uncertain';
  panel_score: number;
  confidence: 'low' | 'medium' | 'high';
  agreement_level: 'unknown' | 'low' | 'medium' | 'high';
  escalation_required: boolean;
  reasoning_summary: string;
  evidence_references: string[];
  judges: Array<{
    judge_id: string;
    provider: 'dry_run' | 'openai';
    model: string;
    score: number;
    band: 'reject' | 'average' | 'good' | 'exceptional' | 'uncertain';
    confidence: 'low' | 'medium' | 'high';
    reasoning_summary: string;
    cost_usd: number;
    latency_ms: number;
    escalation_required?: boolean;
    error?: string;
  }>;
  cost_usd: number;
  latency_ms: number;
  error?: string;
};

type JudgeResult = SubjectivePanelOutput['judges'][number];

const DEFAULT_JUDGE_IDS = ['judge_1', 'judge_2', 'judge_3'];

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    inputDir: '/tmp/webflow-template-review-subjective-panel-eval',
    outDir: '/tmp/webflow-template-review-subjective-panel-eval',
    mode: 'dry-run',
    provider: 'dry_run',
    panelVersion: 'subjective_panel.v0.1',
    judgeIds: DEFAULT_JUDGE_IDS,
    timeoutMs: 60_000,
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
      if (!options.outDir || options.outDir === '/tmp/webflow-template-review-subjective-panel-eval') options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--mode' && next) {
      if (next !== 'prompt-only' && next !== 'dry-run' && next !== 'live') throw new Error('--mode must be prompt-only, dry-run, or live.');
      options.mode = next;
      i += 1;
      continue;
    }
    if (arg === '--provider' && next) {
      if (next !== 'dry_run' && next !== 'openai') throw new Error('--provider must be dry_run or openai.');
      options.provider = next;
      i += 1;
      continue;
    }
    if (arg === '--panel-version' && next) {
      options.panelVersion = next;
      i += 1;
      continue;
    }
    if (arg === '--model' && next) {
      options.model = next;
      i += 1;
      continue;
    }
    if (arg === '--judge-ids' && next) {
      options.judgeIds = next
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
    if (arg === '--max-cases' && next) {
      options.maxCases = Math.max(1, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--criteria' && next) {
      options.criteria = next
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = Math.max(10_000, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.judgeIds?.length) throw new Error('At least one judge ID is required.');
  if (options.mode === 'live' && options.provider === 'dry_run') {
    throw new Error('Live mode requires a non-dry-run provider. Use --provider openai.');
  }
  if (options.provider === 'openai' && options.mode !== 'prompt-only') {
    options.mode = 'live';
    options.model = options.model ?? process.env.OPENAI_MODEL?.trim();
    if (!options.model) throw new Error('OpenAI provider requires --model <model> or OPENAI_MODEL.');
    if (!process.env.OPENAI_API_KEY?.trim()) throw new Error('OpenAI provider requires OPENAI_API_KEY.');
  }

  return {
    inputDir: options.inputDir ?? '/tmp/webflow-template-review-subjective-panel-eval',
    outDir: options.outDir ?? options.inputDir ?? '/tmp/webflow-template-review-subjective-panel-eval',
    mode: options.mode ?? 'dry-run',
    provider: options.provider ?? 'dry_run',
    panelVersion: options.panelVersion ?? 'subjective_panel.v0.1',
    judgeIds: options.judgeIds,
    maxCases: options.maxCases,
    criteria: options.criteria,
    model: options.model,
    timeoutMs: options.timeoutMs ?? 60_000,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp panel:eval:run -- [options]

Options:
  --input <dir>             Directory with subjective-panel-eval.cases.jsonl.
                            Default: /tmp/webflow-template-review-subjective-panel-eval
  --out <dir>               Output directory. Default: same as input.
  --mode <mode>             prompt-only, dry-run, or live. Default: dry-run
  --provider <provider>     dry_run or openai. Default: dry_run
  --model <model>           Provider model ID. Required for --provider openai unless OPENAI_MODEL is set.
  --panel-version <id>      Panel version label. Default: subjective_panel.v0.1
  --judge-ids <a,b,c>       Judge IDs to generate prompts for. Default: judge_1,judge_2,judge_3
  --max-cases <n>           Optional case cap for local smoke runs.
  --criteria <a,b,c>        Optional criterion filter.
  --timeout-ms <n>          Per live judge request timeout. Default: 60000
  --help                    Show this help.

Behavior:
  Reads blind subjective-panel eval cases and writes independent judge prompts.
  In dry-run mode, also writes conservative shadow panel outputs that always escalate.
  In live mode, calls the selected provider and writes shadow panel outputs only.
  Does not write Airtable, D1, or reviewer feedback.

Environment:
  OPENAI_API_KEY            Required when --provider openai.
  OPENAI_MODEL              Optional model default when --provider openai.
`);
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function writeJsonl(filePath: string, rows: unknown[]) {
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

function criterionList(blindCase: SubjectiveEvalBlindCase, options: CliOptions): string[] {
  if (!options.criteria?.length) return blindCase.criteria;
  const allowed = new Set(options.criteria);
  return blindCase.criteria.filter((criterion) => allowed.has(criterion));
}

function outputSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'case_id',
      'criterion_id',
      'judge_id',
      'band',
      'score',
      'confidence',
      'escalation_required',
      'reasoning_summary',
      'evidence_references',
    ],
    properties: {
      case_id: { type: 'string' },
      criterion_id: { type: 'string' },
      judge_id: { type: 'string' },
      band: { enum: ['reject', 'average', 'good', 'exceptional', 'uncertain'] },
      score: { type: 'number', minimum: 0, maximum: 5 },
      confidence: { enum: ['low', 'medium', 'high'] },
      escalation_required: { type: 'boolean' },
      reasoning_summary: { type: 'string' },
      evidence_references: { type: 'array', items: { type: 'string' } },
    },
  };
}

function buildPrompt(blindCase: SubjectiveEvalBlindCase, criterionId: string, judgeId: string, panelVersion: string): PanelPrompt {
  const system = [
    'You are an independent shadow judge for Webflow Marketplace template review.',
    'Score exactly one subjective rubric criterion using only the supplied blind case and approved artifacts.',
    'Do not infer final approval, rejection, or featured status.',
    'Escalate when evidence is incomplete, precedent is missing, judges may reasonably disagree, or the criterion is taste-sensitive.',
    'Never write creator-facing feedback. Emit structured JSON only.',
  ].join(' ');

  const user = JSON.stringify(
    {
      judge_id: judgeId,
      panel_version: panelVersion,
      case_id: blindCase.case_id,
      criterion_id: criterionId,
      template_name: blindCase.template_name,
      published_url: blindCase.published_url,
      allowed_sources: blindCase.allowed_sources,
      required_artifacts: blindCase.required_artifacts,
      precedent_policy: blindCase.precedent_policy,
      notes: blindCase.notes,
      output_schema: outputSchema(),
    },
    null,
    2,
  );

  return {
    prompt_id: `${blindCase.case_id}:${criterionId}:${judgeId}`,
    case_id: blindCase.case_id,
    criterion_id: criterionId,
    judge_id: judgeId,
    panel_version: panelVersion,
    mode: 'independent_judge',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    output_schema: outputSchema(),
  };
}

function buildDryRunOutput(
  blindCase: SubjectiveEvalBlindCase,
  criterionId: string,
  options: CliOptions,
): SubjectivePanelOutput {
  return {
    case_id: blindCase.case_id,
    criterion_id: criterionId,
    panel_version: options.panelVersion,
    status: 'shadow',
    panel_band: 'uncertain',
    panel_score: 0,
    confidence: 'low',
    agreement_level: 'unknown',
    escalation_required: true,
    reasoning_summary:
      'Dry-run output: no model provider was called, so the criterion must remain escalated for human review.',
    evidence_references: ['dry_run:no_model_call'],
    judges: options.judgeIds.map((judgeId) => ({
      judge_id: judgeId,
      provider: 'dry_run',
      model: 'dry_run_no_model_call',
      score: 0,
      band: 'uncertain',
      confidence: 'low',
      reasoning_summary:
        'Dry-run independent judge placeholder. This is a structural smoke output, not a quality judgment.',
      cost_usd: 0,
      latency_ms: 0,
    })),
    cost_usd: 0,
    latency_ms: 0,
  };
}

function confidenceFromJudges(judges: JudgeResult[]): SubjectivePanelOutput['confidence'] {
  if (judges.length === 0 || judges.some((judge) => judge.confidence === 'low')) return 'low';
  if (judges.every((judge) => judge.confidence === 'high')) return 'high';
  return 'medium';
}

function agreementLevel(judges: JudgeResult[]): SubjectivePanelOutput['agreement_level'] {
  if (judges.length === 0) return 'unknown';
  const counts = new Map<string, number>();
  for (const judge of judges) counts.set(judge.band, (counts.get(judge.band) ?? 0) + 1);
  const topCount = Math.max(...counts.values());
  if (topCount === judges.length) return 'high';
  if (topCount >= Math.ceil(judges.length / 2)) return 'medium';
  return 'low';
}

function aggregateBand(judges: JudgeResult[]): SubjectivePanelOutput['panel_band'] {
  const agreement = agreementLevel(judges);
  if (agreement !== 'high') return 'uncertain';
  return judges[0]?.band ?? 'uncertain';
}

function aggregateScore(judges: JudgeResult[]) {
  if (judges.length === 0) return 0;
  return Number((judges.reduce((sum, judge) => sum + judge.score, 0) / judges.length).toFixed(2));
}

function aggregatePanelOutput(args: {
  blindCase: SubjectiveEvalBlindCase;
  criterionId: string;
  options: CliOptions;
  judges: JudgeResult[];
}): SubjectivePanelOutput {
  const escalationRequired =
    args.judges.length === 0 ||
    args.judges.some((judge) => judge.escalation_required || judge.error) ||
    agreementLevel(args.judges) !== 'high';
  return {
    case_id: args.blindCase.case_id,
    criterion_id: args.criterionId,
    panel_version: args.options.panelVersion,
    status: args.judges.some((judge) => judge.error) ? 'failed' : 'shadow',
    panel_band: escalationRequired ? 'uncertain' : aggregateBand(args.judges),
    panel_score: aggregateScore(args.judges),
    confidence: confidenceFromJudges(args.judges),
    agreement_level: agreementLevel(args.judges),
    escalation_required: escalationRequired,
    reasoning_summary: escalationRequired
      ? 'Panel output requires human review because one or more judges escalated, failed, or did not fully agree.'
      : 'Panel output is a unanimous shadow criterion score. It is not a final review decision.',
    evidence_references: [...new Set(args.judges.flatMap((judge) => (judge.error ? [] : ['judge_output'])))],
    judges: args.judges,
    cost_usd: Number(args.judges.reduce((sum, judge) => sum + judge.cost_usd, 0).toFixed(6)),
    latency_ms: args.judges.reduce((sum, judge) => sum + judge.latency_ms, 0),
    error: args.judges.find((judge) => judge.error)?.error,
  };
}

function parseJudgeJson(value: string): {
  case_id: string;
  criterion_id: string;
  judge_id: string;
  band: JudgeResult['band'];
  score: number;
  confidence: JudgeResult['confidence'];
  escalation_required: boolean;
  reasoning_summary: string;
  evidence_references?: string[];
} {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  const band = parsed.band;
  const confidence = parsed.confidence;
  if (band !== 'reject' && band !== 'average' && band !== 'good' && band !== 'exceptional' && band !== 'uncertain') {
    throw new Error('Provider returned invalid band.');
  }
  if (confidence !== 'low' && confidence !== 'medium' && confidence !== 'high') {
    throw new Error('Provider returned invalid confidence.');
  }
  const score = typeof parsed.score === 'number' && Number.isFinite(parsed.score) ? parsed.score : undefined;
  if (score === undefined) throw new Error('Provider returned invalid score.');
  return {
    case_id: String(parsed.case_id ?? ''),
    criterion_id: String(parsed.criterion_id ?? ''),
    judge_id: String(parsed.judge_id ?? ''),
    band,
    score,
    confidence,
    escalation_required: Boolean(parsed.escalation_required),
    reasoning_summary: String(parsed.reasoning_summary ?? ''),
    evidence_references: Array.isArray(parsed.evidence_references)
      ? parsed.evidence_references.map((item) => String(item))
      : [],
  };
}

function extractResponseText(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  if (typeof record.output_text === 'string') return record.output_text;
  const output = record.output;
  if (!Array.isArray(output)) return undefined;
  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const partRecord = part as Record<string, unknown>;
      if (typeof partRecord.text === 'string') texts.push(partRecord.text);
    }
  }
  return texts.join('\n').trim() || undefined;
}

async function callOpenAiJudge(prompt: PanelPrompt, options: CliOptions): Promise<JudgeResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const model = options.model;
  if (!model) throw new Error('Missing OpenAI model.');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: prompt.messages.find((message) => message.role === 'system')?.content,
        input: prompt.messages.find((message) => message.role === 'user')?.content,
        text: {
          format: {
            type: 'json_schema',
            name: 'subjective_judge_output',
            strict: true,
            schema: outputSchema(),
          },
        },
      }),
    });
    const rawText = await response.text();
    if (!response.ok) throw new Error(`OpenAI Responses API failed (${response.status}): ${rawText.slice(0, 500)}`);
    const responseData = JSON.parse(rawText) as unknown;
    const outputText = extractResponseText(responseData);
    if (!outputText) throw new Error('OpenAI Responses API returned no output text.');
    const parsed = parseJudgeJson(outputText);
    return {
      judge_id: prompt.judge_id,
      provider: 'openai',
      model,
      score: parsed.score,
      band: parsed.band,
      confidence: parsed.confidence,
      reasoning_summary: parsed.reasoning_summary.slice(0, 2000),
      cost_usd: 0,
      latency_ms: Date.now() - startedAt,
      escalation_required: parsed.escalation_required,
    };
  } catch (error) {
    return {
      judge_id: prompt.judge_id,
      provider: 'openai',
      model,
      score: 0,
      band: 'uncertain',
      confidence: 'low',
      reasoning_summary: 'Provider call failed; criterion requires human review.',
      cost_usd: 0,
      latency_ms: Date.now() - startedAt,
      escalation_required: true,
      error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runLivePanel(
  blindCase: SubjectiveEvalBlindCase,
  criterionId: string,
  options: CliOptions,
): Promise<SubjectivePanelOutput> {
  const prompts = options.judgeIds.map((judgeId) => buildPrompt(blindCase, criterionId, judgeId, options.panelVersion));
  const judges: JudgeResult[] = [];
  for (const prompt of prompts) {
    if (options.provider === 'openai') judges.push(await callOpenAiJudge(prompt, options));
  }
  return aggregatePanelOutput({ blindCase, criterionId, options, judges });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const casePath = path.join(options.inputDir, 'subjective-panel-eval.cases.jsonl');
  const allCases = await readJsonl<SubjectiveEvalBlindCase>(casePath);
  const selectedCases = options.maxCases ? allCases.slice(0, options.maxCases) : allCases;

  const prompts: PanelPrompt[] = [];
  const outputs: SubjectivePanelOutput[] = [];

  for (const blindCase of selectedCases) {
    for (const criterionId of criterionList(blindCase, options)) {
      for (const judgeId of options.judgeIds) {
        prompts.push(buildPrompt(blindCase, criterionId, judgeId, options.panelVersion));
      }
      if (options.mode === 'dry-run') outputs.push(buildDryRunOutput(blindCase, criterionId, options));
      if (options.mode === 'live') outputs.push(await runLivePanel(blindCase, criterionId, options));
    }
  }

  const promptFile = path.join(options.outDir, 'subjective-panel-prompts.jsonl');
  const outputFile = path.join(options.outDir, 'subjective-panel-output.jsonl');
  const summaryFile = path.join(options.outDir, 'subjective-panel-run-summary.json');
  await writeJsonl(promptFile, prompts);
  if (options.mode !== 'prompt-only') await writeJsonl(outputFile, outputs);

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    out_dir: options.outDir,
    mode: options.mode,
    provider: options.provider,
    model: options.provider === 'openai' ? options.model : null,
    panel_version: options.panelVersion,
    selected_case_count: selectedCases.length,
    prompt_count: prompts.length,
    output_count: outputs.length,
    judge_ids: options.judgeIds,
    criteria_filter: options.criteria ?? null,
    files: {
      prompts: promptFile,
      outputs: options.mode !== 'prompt-only' ? outputFile : null,
      summary: summaryFile,
    },
    notes: [
      'Prompt-only mode writes prompts for a future provider-backed panel runner.',
      'Dry-run mode writes conservative uncertain outputs that always escalate.',
      'Live mode calls the selected provider but still writes shadow artifacts only.',
      'No external systems were mutated.',
    ],
  };

  await writeFile(summaryFile, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
