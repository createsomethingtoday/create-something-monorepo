#!/usr/bin/env tsx

import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import OpenAI from 'openai';

type Args = {
  trainingFile: string;
  manifestFile: string;
  out: string;
  model: string;
  suffix: string;
  epochs: number;
  create: boolean;
};

const DEFAULT_TRAINING_FILE =
  'output/specialized-models/template-review-specialist/openai-training.jsonl';
const DEFAULT_MANIFEST_FILE =
  'output/specialized-models/template-review-specialist/dataset-manifest.json';
const DEFAULT_OUT = 'output/specialized-models/template-review-specialist/openai-finetune-job.json';
const DEFAULT_DRY_RUN_OUT =
  'output/specialized-models/template-review-specialist/openai-finetune-dry-run.json';
const DEFAULT_MODEL = 'gpt-4.1-nano-2025-04-14';
const DEFAULT_SUFFIX = 'cs-template-review-v0';

function parseArgs(argv = process.argv.slice(2)): Args {
  const args: Args = {
    trainingFile: DEFAULT_TRAINING_FILE,
    manifestFile: DEFAULT_MANIFEST_FILE,
    out: DEFAULT_OUT,
    model: DEFAULT_MODEL,
    suffix: DEFAULT_SUFFIX,
    epochs: 1,
    create: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--':
        break;
      case '--training-file':
        args.trainingFile = readFlag(arg, next);
        index += 1;
        break;
      case '--manifest-file':
        args.manifestFile = readFlag(arg, next);
        index += 1;
        break;
      case '--out':
        args.out = readFlag(arg, next);
        index += 1;
        break;
      case '--model':
        args.model = readFlag(arg, next);
        index += 1;
        break;
      case '--suffix':
        args.suffix = readFlag(arg, next);
        index += 1;
        break;
      case '--epochs':
        args.epochs = Math.max(1, Number.parseInt(readFlag(arg, next), 10));
        index += 1;
        break;
      case '--create':
        args.create = true;
        break;
      case '--dry-run':
        args.create = false;
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
  console.log(`Usage: pnpm specialist:template-review:finetune -- --create [options]

Uploads the Template Review Specialist JSONL file and starts an OpenAI
supervised fine-tuning job. Defaults to dry-run unless --create is passed.

Options:
  --create                 Upload and create the fine-tuning job.
  --dry-run                Validate input and write a dry-run receipt.
  --training-file <path>   JSONL file. Default: ${DEFAULT_TRAINING_FILE}
  --manifest-file <path>   Dataset manifest. Default: ${DEFAULT_MANIFEST_FILE}
  --out <path>             Receipt path. Default: ${DEFAULT_OUT}
                           Dry-runs default to ${DEFAULT_DRY_RUN_OUT}
  --model <model>          Base model. Default: ${DEFAULT_MODEL}
  --suffix <suffix>        Fine-tuned model suffix. Default: ${DEFAULT_SUFFIX}
  --epochs <n>             Supervised fine-tuning epochs. Default: 1
`);
}

type TrainingLine = {
  messages?: Array<{ role?: string; content?: string }>;
};

async function validateTrainingFile(
  path: string
): Promise<{ exampleCount: number; bytes: number }> {
  const text = await readFile(path, 'utf8');
  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  for (const [index, line] of lines.entries()) {
    const parsed = JSON.parse(line) as TrainingLine;
    if (!Array.isArray(parsed.messages) || parsed.messages.length < 3) {
      throw new Error(`Invalid JSONL line ${index + 1}: expected at least three messages.`);
    }
    for (const message of parsed.messages) {
      if (!['system', 'user', 'assistant'].includes(String(message.role))) {
        throw new Error(`Invalid JSONL line ${index + 1}: unsupported role ${message.role}.`);
      }
      if (typeof message.content !== 'string' || message.content.trim().length === 0) {
        throw new Error(`Invalid JSONL line ${index + 1}: empty message content.`);
      }
    }
  }

  if (lines.length < 10) {
    throw new Error(`Training file has ${lines.length} examples; keep at least 10 for this lane.`);
  }

  return { exampleCount: lines.length, bytes: Buffer.byteLength(text) };
}

async function readManifest(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

async function writeReceipt(path: string, receipt: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, JSON.stringify(receipt, null, 2) + '\n');
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!args.create && args.out === DEFAULT_OUT) {
    args.out = DEFAULT_DRY_RUN_OUT;
  }
  const validation = await validateTrainingFile(args.trainingFile);
  const manifest = await readManifest(args.manifestFile);

  const baseReceipt = {
    created_at: new Date().toISOString(),
    dry_run: !args.create,
    base_model: args.model,
    suffix: args.suffix,
    epochs: args.epochs,
    training_file: args.trainingFile,
    manifest_file: args.manifestFile,
    validation,
    dataset: {
      agent_id: manifest.agent_id,
      example_count: manifest.example_count,
      sources: manifest.sources,
      evaluation: manifest.evaluation,
      langfuse: manifest.langfuse
    }
  };

  if (!args.create) {
    await writeReceipt(args.out, baseReceipt);
    console.log(JSON.stringify({ ok: true, dry_run: true, out: args.out, ...validation }, null, 2));
    return;
  }

  if (process.env.TEMPLATE_REVIEW_FINE_TUNE_CREATE_APPROVED !== 'CRE-1457') {
    throw new Error(
      'Fine-tune creation requires explicit approval: set TEMPLATE_REVIEW_FINE_TUNE_CREATE_APPROVED=CRE-1457.'
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let uploadedFile: Awaited<ReturnType<typeof client.files.create>> | undefined;

  try {
    uploadedFile = await client.files.create({
      file: createReadStream(args.trainingFile),
      purpose: 'fine-tune'
    });

    const job = await client.fineTuning.jobs.create({
      training_file: uploadedFile.id,
      model: args.model,
      suffix: args.suffix,
      hyperparameters: { n_epochs: args.epochs },
      metadata: {
        source: 'create-something-template-review-specialist',
        agent_id: String(manifest.agent_id ?? 'template-review-hub'),
        evaluation_experiment: 'template_review_hub',
        langfuse_join: 'messageId,conversationId'
      }
    });

    const receipt = {
      ...baseReceipt,
      dry_run: false,
      openai_file: uploadedFile,
      openai_fine_tune_job: job
    };
    await writeReceipt(args.out, receipt);

    console.log(
      JSON.stringify(
        {
          ok: true,
          out: args.out,
          file_id: uploadedFile.id,
          job_id: job.id,
          status: job.status,
          model: args.model,
          suffix: args.suffix
        },
        null,
        2
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let uploadedFileCleanup: Record<string, unknown> | undefined;
    if (uploadedFile) {
      try {
        const deleted = await client.files.delete(uploadedFile.id);
        uploadedFileCleanup = { attempted: true, deleted: deleted.deleted, file_id: deleted.id };
      } catch (cleanupError) {
        uploadedFileCleanup = {
          attempted: true,
          deleted: false,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        };
      }
    }
    await writeReceipt(args.out, {
      ...baseReceipt,
      dry_run: false,
      status: 'blocked',
      blocked_at: new Date().toISOString(),
      blocked_reason: message,
      openai_file: uploadedFile,
      uploaded_file_cleanup: uploadedFileCleanup,
      provider_note:
        'OpenAI accepted dataset validation but rejected fine-tuning job creation for this organization.'
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
