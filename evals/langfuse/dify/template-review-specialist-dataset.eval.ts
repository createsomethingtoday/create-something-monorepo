import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Eval } from '../harness.js';

type JsonRecord = Record<string, unknown>;

type DatasetEvalInput = {
  name: string;
};

type DatasetEvalOutput = {
  ok: boolean;
  details: Record<string, boolean>;
  metrics: Record<string, unknown>;
  notes: string[];
};

type Score = {
  name: string;
  score: number | null;
  metadata?: Record<string, unknown>;
};

const PROJECT_NAME = 'create-something-dify-agents';
const EXPERIMENT_NAME = 'template_review_specialist_dataset';
const ROOT = process.cwd();
const TRAINING_PATH = resolve(
  ROOT,
  'output/specialized-models/template-review-specialist/openai-training.jsonl'
);
const MANIFEST_PATH = resolve(
  ROOT,
  'output/specialized-models/template-review-specialist/dataset-manifest.json'
);
const PROFILE_PATH = resolve(ROOT, 'config/specialized-models/template-review-specialist.v0.json');
const TELEMETRY_PATH = resolve(
  ROOT,
  'output/specialized-models/template-review-specialist/telemetry-summary.json'
);
const DRY_RUN_RECEIPT_PATH = resolve(
  ROOT,
  'output/specialized-models/template-review-specialist/openai-finetune-dry-run.json'
);
const CORRECTIONS_EXAMPLE_PATH = resolve(
  ROOT,
  'data/specialized-models/template-review-specialist/approved-corrections.example.jsonl'
);

const SECRET_PATTERN =
  /\b(app-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}|lf_[A-Za-z0-9_-]{12,}|secret_[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{20,})/i;

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, 'utf8')) as JsonRecord;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseTrainingLines(): JsonRecord[] {
  const text = readFileSync(TRAINING_PATH, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as JsonRecord);
}

function hasValidMessages(line: JsonRecord): boolean {
  const messages = array(line.messages).map((message) => record(message));
  if (messages.length < 3) return false;

  return messages.every(
    (message) =>
      ['system', 'user', 'assistant'].includes(String(message.role)) &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0
  );
}

function notes(details: Record<string, boolean>): string[] {
  return Object.entries(details)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} failed`);
}

function runDatasetEval(): DatasetEvalOutput {
  const trainingExists = existsSync(TRAINING_PATH);
  const manifestExists = existsSync(MANIFEST_PATH);
  const profileExists = existsSync(PROFILE_PATH);
  const telemetryExists = existsSync(TELEMETRY_PATH);
  const dryRunReceiptExists = existsSync(DRY_RUN_RECEIPT_PATH);
  const correctionsExampleExists = existsSync(CORRECTIONS_EXAMPLE_PATH);

  const training = trainingExists ? parseTrainingLines() : [];
  const manifest = manifestExists ? readJson(MANIFEST_PATH) : {};
  const profile = profileExists ? readJson(PROFILE_PATH) : {};
  const telemetry = telemetryExists ? readJson(TELEMETRY_PATH) : {};
  const dryRunReceipt = dryRunReceiptExists ? readJson(DRY_RUN_RECEIPT_PATH) : {};
  const records = array(manifest.records).map((value) => record(value));
  const liveRecords = records.filter((value) => value.source === 'dify_live_answer');
  const traceRecords = liveRecords.filter((value) => {
    const trace = record(value.trace);
    return typeof trace.messageId === 'string' && typeof trace.conversationId === 'string';
  });
  const sources = record(manifest.sources);
  const sourceTotal = Object.values(sources).reduce<number>(
    (sum, value) => sum + (typeof value === 'number' ? value : 0),
    0
  );
  const trainingText = trainingExists ? readFileSync(TRAINING_PATH, 'utf8') : '';
  const manifestText = manifestExists ? readFileSync(MANIFEST_PATH, 'utf8') : '';

  const details: Record<string, boolean> = {
    trainingExists,
    manifestExists,
    profileExists,
    telemetryExists,
    dryRunReceiptExists,
    correctionsExampleExists,
    trainingJsonlValid: training.length > 0 && training.every(hasValidMessages),
    manifestCountMatchesTraining: manifest.example_count === training.length,
    sourceCountsMatchManifest: sourceTotal === manifest.example_count,
    includesCuratedPolicy: Number(sources.curated_policy ?? 0) >= 10,
    includesDifyInventorySmoke: Number(sources.dify_inventory_smoke ?? 0) >= 6,
    liveDifyAnswersTracked: typeof sources.dify_live_answer === 'number',
    approvedCorrectionsTracked: typeof sources.approved_correction === 'number',
    liveTraceCoverageComplete:
      liveRecords.length === 0 || traceRecords.length === liveRecords.length,
    telemetryTraceCoverageComplete:
      liveRecords.length === 0
        ? record(telemetry.trace_coverage).trace_join_coverage === null
        : record(telemetry.trace_coverage).trace_join_coverage === 1,
    telemetryReadinessPresent: typeof record(telemetry.readiness).stage === 'string',
    rawTracePayloadsExcluded:
      record(telemetry.trace_coverage).raw_trace_payloads_embedded === false &&
      record(record(profile.observability).langfuse).raw_traces_embedded === false,
    policyBoundaryDeclared: Boolean(
      record(manifest.policy_boundary).permitted && record(manifest.policy_boundary).excluded
    ),
    dryRunReceiptPreserved: dryRunReceipt.dry_run === true,
    noSecretPattern: !SECRET_PATTERN.test(trainingText) && !SECRET_PATTERN.test(manifestText)
  };

  return {
    ok: Object.values(details).every(Boolean),
    details,
    metrics: {
      trainingExamples: training.length,
      sourceCounts: sources,
      liveRecords: liveRecords.length,
      traceRecords: traceRecords.length,
      telemetryReadiness: record(telemetry.readiness).stage,
      fineTuneDryRun: dryRunReceipt.dry_run === true
    },
    notes: notes(details)
  };
}

function score(name: string, keys: string[]) {
  return ({ output }: { output: DatasetEvalOutput }): Score => ({
    name,
    score: keys.every((key) => output.details[key]) ? 1 : 0,
    metadata: {
      keys,
      metrics: output.metrics,
      notes: output.notes
    }
  });
}

void Eval<DatasetEvalInput, DatasetEvalOutput>(PROJECT_NAME, {
  experimentName: EXPERIMENT_NAME,
  data: [
    {
      input: { name: 'template_review_specialist_dataset' },
      metadata: { suite: 'template-review-specialist', eval: 'dataset_contract' }
    }
  ],
  task: async () => runDatasetEval(),
  scores: [
    score('dataset_files_present', [
      'trainingExists',
      'manifestExists',
      'profileExists',
      'telemetryExists',
      'dryRunReceiptExists',
      'correctionsExampleExists'
    ]),
    score('training_jsonl_contract', [
      'trainingJsonlValid',
      'manifestCountMatchesTraining',
      'sourceCountsMatchManifest'
    ]),
    score('source_mix_contract', [
      'includesCuratedPolicy',
      'includesDifyInventorySmoke',
      'liveDifyAnswersTracked',
      'approvedCorrectionsTracked'
    ]),
    score('trace_coverage_contract', [
      'liveTraceCoverageComplete',
      'telemetryTraceCoverageComplete',
      'rawTracePayloadsExcluded'
    ]),
    score('provider_receipt_contract', ['dryRunReceiptPreserved']),
    score('policy_safety_contract', ['policyBoundaryDeclared', 'noSecretPattern'])
  ]
});
