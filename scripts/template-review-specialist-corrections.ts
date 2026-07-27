#!/usr/bin/env tsx

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

type JsonRecord = Record<string, unknown>;

type Args = {
  input?: string;
  out: string;
  append: boolean;
  check: boolean;
};

const DEFAULT_OUT = 'data/specialized-models/template-review-specialist/approved-corrections.jsonl';
const SECRET_PATTERN =
  /\b(app-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}|lf_[A-Za-z0-9_-]{12,}|secret_[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{20,})/i;

function parseArgs(argv = process.argv.slice(2)): Args {
  const args: Args = {
    out: DEFAULT_OUT,
    append: false,
    check: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--':
        break;
      case '--input':
        args.input = readFlag(arg, next);
        index += 1;
        break;
      case '--out':
        args.out = readFlag(arg, next);
        index += 1;
        break;
      case '--append':
        args.append = true;
        break;
      case '--check':
        args.check = true;
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
  console.log(`Usage: pnpm specialist:template-review:corrections -- --input correction.jsonl [options]

Validates reviewer-approved correction records before they enter the specialist
training corpus. The default output ledger is:
  ${DEFAULT_OUT}

Options:
  --input <path>  JSON or JSONL correction file to validate/import.
  --out <path>    Output approved-corrections JSONL ledger.
  --append        Append input records to --out after validation.
  --check         Validate --input, or validate --out when --input is omitted.
`);
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function requiredString(value: unknown, field: string, id: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  throw new Error(`Invalid correction ${id}: ${field} is required.`);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

async function readJsonl(path: string): Promise<JsonRecord[]> {
  if (!existsSync(path)) return [];
  const text = await readFile(path, 'utf8');
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) throw new Error(`${path} must contain a JSON array or JSONL.`);
    return parsed.map((item) => record(item));
  }

  return trimmed
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => record(JSON.parse(line)));
}

function normalizeCorrection(value: JsonRecord, index: number): JsonRecord {
  const id = optionalString(value.id) ?? `approved-correction-${index + 1}`;
  const prompt = requiredString(value.prompt, 'prompt', id);
  const acceptedAnswer = requiredString(value.accepted_answer, 'accepted_answer', id);
  const approvedBy = requiredString(value.approved_by, 'approved_by', id);
  const approvedAt = requiredString(value.approved_at, 'approved_at', id);
  const policy = record(value.policy);

  if (policy.permission_safe !== true) {
    throw new Error(`Invalid correction ${id}: policy.permission_safe must be true.`);
  }
  if (policy.excludes_private_data !== true) {
    throw new Error(`Invalid correction ${id}: policy.excludes_private_data must be true.`);
  }
  if (policy.reviewer_approved !== true) {
    throw new Error(`Invalid correction ${id}: policy.reviewer_approved must be true.`);
  }

  const serialized = JSON.stringify(value);
  if (SECRET_PATTERN.test(serialized)) {
    throw new Error(`Invalid correction ${id}: secret-like value detected.`);
  }

  return {
    id,
    approved_at: approvedAt,
    approved_by: approvedBy,
    source: optionalString(value.source) ?? 'reviewer_correction',
    prompt,
    rejected_answer: optionalString(value.rejected_answer),
    accepted_answer: acceptedAnswer,
    reviewer_notes: optionalString(value.reviewer_notes),
    trace: record(value.trace),
    policy: {
      permission_safe: true,
      excludes_private_data: true,
      reviewer_approved: true
    }
  };
}

function dedupe(records: JsonRecord[]): JsonRecord[] {
  const seen = new Set<string>();
  const result: JsonRecord[] = [];

  for (const record of records) {
    const id = String(record.id);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(record);
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const inputPath = args.input ?? args.out;
  const input = await readJsonl(inputPath);
  const normalized = input.map((record, index) => normalizeCorrection(record, index));

  if (args.check && !args.append) {
    console.log(
      JSON.stringify({ ok: true, path: inputPath, correction_count: normalized.length }, null, 2)
    );
    return;
  }

  if (!args.input) {
    throw new Error(
      'Use --input when writing corrections, or --check to validate the existing ledger.'
    );
  }

  const existing = args.append ? await readJsonl(args.out) : [];
  const merged = dedupe([...existing, ...normalized]);
  await mkdir(dirname(resolve(args.out)), { recursive: true });
  await writeFile(args.out, merged.map((record) => JSON.stringify(record)).join('\n') + '\n');

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: args.out,
        input_count: normalized.length,
        total_correction_count: merged.length
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
