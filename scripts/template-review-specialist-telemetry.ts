#!/usr/bin/env tsx

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

type JsonRecord = Record<string, unknown>;

type Args = {
  manifest: string;
  trainingFile: string;
  profile: string;
  corrections: string;
  jobReceipt: string;
  dryRunReceipt: string;
  out: string;
};

const DEFAULT_BASE = 'output/specialized-models/template-review-specialist';
const DEFAULT_CORRECTIONS =
  'data/specialized-models/template-review-specialist/approved-corrections.jsonl';

function parseArgs(argv = process.argv.slice(2)): Args {
  const args: Args = {
    manifest: `${DEFAULT_BASE}/dataset-manifest.json`,
    trainingFile: `${DEFAULT_BASE}/openai-training.jsonl`,
    profile: 'config/specialized-models/template-review-specialist.v0.json',
    corrections: DEFAULT_CORRECTIONS,
    jobReceipt: `${DEFAULT_BASE}/openai-finetune-job.json`,
    dryRunReceipt: `${DEFAULT_BASE}/openai-finetune-dry-run.json`,
    out: `${DEFAULT_BASE}/telemetry-summary.json`
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--':
        break;
      case '--manifest':
        args.manifest = readFlag(arg, next);
        index += 1;
        break;
      case '--training-file':
        args.trainingFile = readFlag(arg, next);
        index += 1;
        break;
      case '--profile':
        args.profile = readFlag(arg, next);
        index += 1;
        break;
      case '--corrections':
        args.corrections = readFlag(arg, next);
        index += 1;
        break;
      case '--job-receipt':
        args.jobReceipt = readFlag(arg, next);
        index += 1;
        break;
      case '--dry-run-receipt':
        args.dryRunReceipt = readFlag(arg, next);
        index += 1;
        break;
      case '--out':
        args.out = readFlag(arg, next);
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

  return args;
}

function readFlag(flag: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`Missing value for ${flag}.`);
  return value.trim();
}

function printHelp(): void {
  console.log(`Usage: pnpm specialist:template-review:telemetry -- [options]

Builds a local telemetry summary for the Template Review Specialist data flywheel.
The summary contains counts, IDs, and derived metrics, not raw private Langfuse
trace payloads. Generated summaries remain local evidence unless explicitly reviewed.
`);
}

async function readJson(path: string): Promise<JsonRecord> {
  if (!existsSync(path)) return {};
  return JSON.parse(await readFile(path, 'utf8')) as JsonRecord;
}

async function readJsonlCount(path: string): Promise<number> {
  if (!existsSync(path)) return 0;
  const text = await readFile(path, 'utf8');
  return text.split('\n').filter((line) => line.trim().length > 0).length;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countTools(records: JsonRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const recordValue of records) {
    for (const tool of array(record(recordValue.trace).tools)) {
      if (typeof tool !== 'string' || tool.length === 0) continue;
      counts[tool] = (counts[tool] ?? 0) + 1;
    }
  }

  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function readinessStage(approvedCorrections: number): string {
  if (approvedCorrections >= 500) return 'always_on_endpoint_pilot_candidate';
  if (approvedCorrections >= 200) return 'real_specialist_training_pass_candidate';
  if (approvedCorrections >= 50) return 'cheap_lora_experiment_candidate';
  return 'prompt_specialized_runtime';
}

async function main(): Promise<void> {
  const args = parseArgs();
  const manifest = await readJson(args.manifest);
  const profile = await readJson(args.profile);
  const jobReceipt = await readJson(args.jobReceipt);
  const dryRunReceipt = await readJson(args.dryRunReceipt);
  const trainingExamples = await readJsonlCount(args.trainingFile);
  const approvedCorrections = await readJsonlCount(args.corrections);
  const records = array(manifest.records).map((value) => record(value));
  const liveRecords = records.filter((value) => value.source === 'dify_live_answer');
  const correctionRecords = records.filter((value) => value.source === 'approved_correction');
  const traceRecords = liveRecords.filter((value) => {
    const trace = record(value.trace);
    return typeof trace.messageId === 'string' || typeof trace.conversationId === 'string';
  });
  const durations = liveRecords
    .map((value) => numberValue(record(value.trace).durationMs))
    .filter((value): value is number => typeof value === 'number');

  const telemetry = {
    generated_at: new Date().toISOString(),
    specialist_id: profile.id ?? manifest.agent_id ?? 'template-review-specialist-v0',
    corpus: {
      training_examples: trainingExamples,
      manifest_examples: manifest.example_count ?? null,
      source_counts: manifest.sources ?? {},
      approved_corrections_in_ledger: approvedCorrections,
      approved_corrections_in_manifest: correctionRecords.length
    },
    trace_coverage: {
      live_records: liveRecords.length,
      trace_join_records: traceRecords.length,
      trace_join_coverage:
        liveRecords.length === 0
          ? null
          : Number((traceRecords.length / liveRecords.length).toFixed(3)),
      join_keys: record(manifest.langfuse).join_keys ?? ['messageId', 'conversationId'],
      raw_trace_payloads_embedded: false
    },
    latency_ms: {
      count: durations.length,
      average: average(durations),
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      max: durations.length > 0 ? Math.max(...durations) : null
    },
    tool_usage: countTools(liveRecords),
    evals: {
      project: record(record(manifest.evaluation).evals).project,
      experiment: record(record(manifest.evaluation).evals).experiment,
      local_eval_command: record(record(manifest.evaluation).evals).local_command,
      data_flywheel_eval_command: 'pnpm langfuse:eval:dify:template-review-specialist-dataset:local'
    },
    provider: {
      openai_fine_tune_status: jobReceipt.status ?? null,
      openai_blocked_reason: jobReceipt.blocked_reason ?? null,
      dry_run_ok: dryRunReceipt.dry_run === true
    },
    readiness: {
      stage: readinessStage(approvedCorrections),
      next_target_approved_corrections:
        approvedCorrections < 50
          ? 50
          : approvedCorrections < 200
            ? 200
            : approvedCorrections < 500
              ? 500
              : null,
      recommendation:
        approvedCorrections < 50
          ? 'Keep investing in approved correction capture and prompt-specialized runtime.'
          : 'Run the next training-cost/quality experiment before considering always-on hosting.'
    },
    policy_boundary: manifest.policy_boundary ?? profile.policy_boundary ?? {}
  };

  await mkdir(dirname(resolve(args.out)), { recursive: true });
  await writeFile(args.out, JSON.stringify(telemetry, null, 2) + '\n');
  console.log(
    JSON.stringify(
      { ok: true, out: args.out, ...telemetry.corpus, trace_coverage: telemetry.trace_coverage },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
