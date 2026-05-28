import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  inputDir: string;
  outDir: string;
  evalSetVersion: string;
  criteria: string[];
  approvedGoodLimit: number;
  approvedExceptionalLimit: number;
  rejectedVisualLimit: number;
  appGuidelineControlLimit: number;
};

type GoldenCaseProposal = {
  id: string;
  asset_id?: string;
  version_id: string;
  template_name?: string;
  published_url?: string;
  golden_set_version: string;
  case_label: string;
  normalized_buckets: string[];
  reviewer_confirmed: boolean;
  reviewer?: string;
  evidence: {
    review_status?: string;
    quality_rating?: string;
    rejection_reason?: string;
    decision_date?: string;
    feedback_snippet?: string;
  };
  status: string;
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

type SubjectiveEvalAnswer = {
  case_id: string;
  eval_set_version: string;
  asset_id?: string;
  version_id: string;
  criterion_id: string;
  expected_band: 'reject' | 'average' | 'good' | 'exceptional' | 'control_not_visual_reject';
  expected_source_label: string;
  expected_escalation_allowed: boolean;
  source_evidence: {
    review_status?: string;
    quality_rating?: string;
    rejection_reason?: string;
    decision_date?: string;
    normalized_buckets: string[];
  };
};

const DEFAULT_CRITERIA = ['visual_quality', 'visual_hierarchy', 'polish_and_coherence'];

function parseArgs(argv: string[]): CliOptions {
  const today = new Date().toISOString().slice(0, 10);
  const options: Partial<CliOptions> = {
    outDir: '/tmp/webflow-template-review-subjective-panel-eval',
    evalSetVersion: `subjective_panel_${today}`,
    criteria: DEFAULT_CRITERIA,
    approvedGoodLimit: 10,
    approvedExceptionalLimit: 5,
    rejectedVisualLimit: 10,
    appGuidelineControlLimit: 5,
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
    if (arg === '--eval-set-version' && next) {
      options.evalSetVersion = next;
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
    if (arg === '--approved-good-limit' && next) {
      options.approvedGoodLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--approved-exceptional-limit' && next) {
      options.approvedExceptionalLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--rejected-visual-limit' && next) {
      options.rejectedVisualLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--app-guideline-control-limit' && next) {
      options.appGuidelineControlLimit = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.inputDir) throw new Error('Missing required --input <visual-quality-calibration-dir>');
  if (!options.criteria?.length) throw new Error('At least one criterion is required.');

  return {
    inputDir: options.inputDir,
    outDir: options.outDir ?? '/tmp/webflow-template-review-subjective-panel-eval',
    evalSetVersion: options.evalSetVersion ?? `subjective_panel_${today}`,
    criteria: options.criteria,
    approvedGoodLimit: options.approvedGoodLimit ?? 10,
    approvedExceptionalLimit: options.approvedExceptionalLimit ?? 5,
    rejectedVisualLimit: options.rejectedVisualLimit ?? 10,
    appGuidelineControlLimit: options.appGuidelineControlLimit ?? 5,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp panel:eval:prepare -- [options]

Options:
  --input <dir>                         Visual-quality calibration output directory. Required.
  --out <dir>                           Output directory. Default: /tmp/webflow-template-review-subjective-panel-eval
  --eval-set-version <id>               Eval set ID. Default: subjective_panel_<date>
  --criteria <a,b,c>                    Criteria to evaluate. Default: visual_quality,visual_hierarchy,polish_and_coherence
  --approved-good-limit <n>             Approved Good controls. Default: 10
  --approved-exceptional-limit <n>      Approved Exceptional controls. Default: 5
  --rejected-visual-limit <n>           Rejected visual-quality cases. Default: 10
  --app-guideline-control-limit <n>     Rejected app/guideline controls. Default: 5
  --help                                Show this help.

Behavior:
  Builds a blind subjective-panel eval manifest from proposed visual-quality golden cases.
  Writes private answers separately so panel prompts do not receive outcome labels.
  Does not call model providers and does not write Airtable, D1, or reviewer recommendations.
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

function withPublishedUrls(cases: GoldenCaseProposal[]) {
  return cases.filter((item) => item.published_url?.startsWith('https://'));
}

function selectCases(cases: GoldenCaseProposal[], options: CliOptions): GoldenCaseProposal[] {
  const usable = withPublishedUrls(cases);
  const take = (label: string, limit: number) => usable.filter((item) => item.case_label === label).slice(0, limit);
  return [
    ...take('approved_good', options.approvedGoodLimit),
    ...take('approved_exceptional', options.approvedExceptionalLimit),
    ...take('rejected_visual_quality', options.rejectedVisualLimit),
    ...take('rejected_app_or_guideline_control', options.appGuidelineControlLimit),
  ];
}

function expectedBand(caseLabel: string): SubjectiveEvalAnswer['expected_band'] {
  if (caseLabel === 'approved_exceptional') return 'exceptional';
  if (caseLabel === 'approved_good') return 'good';
  if (caseLabel === 'rejected_visual_quality') return 'reject';
  if (caseLabel === 'rejected_app_or_guideline_control') return 'control_not_visual_reject';
  return 'average';
}

function buildBlindCase(goldenCase: GoldenCaseProposal, options: CliOptions): SubjectiveEvalBlindCase {
  return {
    case_id: `${options.evalSetVersion}:${goldenCase.version_id}`,
    eval_set_version: options.evalSetVersion,
    asset_id: goldenCase.asset_id,
    version_id: goldenCase.version_id,
    template_name: goldenCase.template_name,
    published_url: goldenCase.published_url ?? '',
    criteria: options.criteria,
    allowed_sources: [
      'published_url',
      'deterministic_findings',
      'visual_proxy_artifact',
      'screenshots',
      'approved_precedents',
      'policy_snapshot',
    ],
    required_artifacts: ['policy_snapshot', 'visual_proxy_artifact', 'precedent_retrieval'],
    precedent_policy: {
      allowed_status: 'approved',
      criterion_scoped: true,
      policy_snapshot_required: true,
    },
    notes: [
      'Do not infer final approval or rejection from this manifest.',
      'Do not use Airtable outcome labels or historical private answers in panel prompts.',
      'Emit criterion-level shadow outputs only.',
    ],
  };
}

function buildAnswers(goldenCase: GoldenCaseProposal, options: CliOptions): SubjectiveEvalAnswer[] {
  const caseId = `${options.evalSetVersion}:${goldenCase.version_id}`;
  return options.criteria.map((criterionId) => ({
    case_id: caseId,
    eval_set_version: options.evalSetVersion,
    asset_id: goldenCase.asset_id,
    version_id: goldenCase.version_id,
    criterion_id: criterionId,
    expected_band: expectedBand(goldenCase.case_label),
    expected_source_label: goldenCase.case_label,
    expected_escalation_allowed: true,
    source_evidence: {
      review_status: goldenCase.evidence.review_status,
      quality_rating: goldenCase.evidence.quality_rating,
      rejection_reason: goldenCase.evidence.rejection_reason,
      decision_date: goldenCase.evidence.decision_date,
      normalized_buckets: goldenCase.normalized_buckets,
    },
  }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const goldenCases = await readJsonl<GoldenCaseProposal>(path.join(options.inputDir, 'visual-quality-golden-cases.proposed.jsonl'));
  const selected = selectCases(goldenCases, options);
  const blindCases = selected.map((goldenCase) => buildBlindCase(goldenCase, options));
  const answers = selected.flatMap((goldenCase) => buildAnswers(goldenCase, options));

  const summary = {
    generated_at: new Date().toISOString(),
    input_dir: options.inputDir,
    out_dir: options.outDir,
    eval_set_version: options.evalSetVersion,
    selected_case_count: selected.length,
    criterion_count: options.criteria.length,
    expected_panel_output_count: answers.length,
    criteria: options.criteria,
    by_source_label: selected.reduce<Record<string, number>>((acc, item) => {
      acc[item.case_label] = (acc[item.case_label] ?? 0) + 1;
      return acc;
    }, {}),
    files: {
      blind_cases: path.join(options.outDir, 'subjective-panel-eval.cases.jsonl'),
      private_answers: path.join(options.outDir, 'subjective-panel-eval.answers.private.jsonl'),
      panel_output_template: path.join(options.outDir, 'subjective-panel-output.template.json'),
      summary: path.join(options.outDir, 'subjective-panel-eval-summary.json'),
    },
    gates: [
      'Use only subjective-panel-eval.cases.jsonl for panel prompts.',
      'Keep subjective-panel-eval.answers.private.jsonl hidden until scoring.',
      'Use approved precedents only. Proposed precedents are not prompt context.',
      'Panel outputs are shadow-mode artifacts, not reviewer-facing decisions.',
    ],
  };

  const outputTemplate = {
    case_id: '<case_id from subjective-panel-eval.cases.jsonl>',
    criterion_id: '<one criterion_id>',
    panel_version: 'subjective_panel.v0.1',
    status: 'shadow',
    panel_band: 'good',
    panel_score: 4,
    confidence: 'medium',
    agreement_level: 'medium',
    escalation_required: true,
    reasoning_summary: 'Short evidence-grounded criterion reasoning.',
    evidence_references: ['visual_proxy_artifact', 'approved_precedent:<id>'],
    judges: [
      {
        judge_id: 'judge_1',
        provider: 'openai',
        model: '<model>',
        score: 4,
        band: 'good',
        confidence: 'medium',
        reasoning_summary: 'Short independent reasoning.',
        cost_usd: 0,
        latency_ms: 0,
      },
    ],
    cost_usd: 0,
    latency_ms: 0,
  };

  await writeJsonl(summary.files.blind_cases, blindCases);
  await writeJsonl(summary.files.private_answers, answers);
  await writeFile(summary.files.panel_output_template, `${JSON.stringify(outputTemplate, null, 2)}\n`);
  await writeFile(summary.files.summary, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
