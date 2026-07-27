#!/usr/bin/env tsx

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import OpenAI from 'openai';

type JsonRecord = Record<string, unknown>;

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type Args = {
  prompt?: string;
  promptFile?: string;
  profile: string;
  trainingFile: string;
  model?: string;
  maxExamples: number;
  maxOutputTokens: number;
  out?: string;
  json: boolean;
};

const DEFAULT_PROFILE = 'config/specialized-models/template-review-specialist.v0.json';
const DEFAULT_TRAINING_FILE =
  'output/specialized-models/template-review-specialist/openai-training.jsonl';
const DEFAULT_OUT = 'output/specialized-models/template-review-specialist/runtime-last-output.json';

function parseArgs(argv = process.argv.slice(2)): Args {
  const args: Args = {
    profile: DEFAULT_PROFILE,
    trainingFile: DEFAULT_TRAINING_FILE,
    maxExamples: 8,
    maxOutputTokens: 900,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--':
        break;
      case '--prompt':
        args.prompt = readFlag(arg, next);
        index += 1;
        break;
      case '--prompt-file':
        args.promptFile = readFlag(arg, next);
        index += 1;
        break;
      case '--profile':
        args.profile = readFlag(arg, next);
        index += 1;
        break;
      case '--training-file':
        args.trainingFile = readFlag(arg, next);
        index += 1;
        break;
      case '--model':
        args.model = readFlag(arg, next);
        index += 1;
        break;
      case '--max-examples':
        args.maxExamples = Math.max(0, Number.parseInt(readFlag(arg, next), 10));
        index += 1;
        break;
      case '--max-output-tokens':
        args.maxOutputTokens = Math.max(128, Number.parseInt(readFlag(arg, next), 10));
        index += 1;
        break;
      case '--out':
        args.out = readFlag(arg, next);
        index += 1;
        break;
      case '--json':
        args.json = true;
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
  console.log(`Usage: pnpm specialist:template-review:runtime -- --prompt "..." [options]

Runs the prompt-specialized Template Review Specialist runtime over the current
permission-safe corpus. This is the production runtime while fine-tuning is
blocked and approved corrections are still below the training threshold.

Options:
  --prompt <text>          Prompt to answer.
  --prompt-file <path>     Read prompt from file.
  --model <model>          Override profile runtime model.
  --max-examples <n>       Few-shot examples to include. Default: 8.
  --max-output-tokens <n>  Default: 900.
  --out <path>             Receipt path. Default when omitted: ${DEFAULT_OUT}
  --json                   Print JSON receipt instead of answer text.
`);
}

async function readJson(path: string): Promise<JsonRecord> {
  return JSON.parse(await readFile(path, 'utf8')) as JsonRecord;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseTraining(text: string): Message[][] {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parsed = record(JSON.parse(line));
      return array(parsed.messages)
        .map((message) => record(message))
        .filter(
          (message): message is Message =>
            ['system', 'user', 'assistant'].includes(String(message.role)) &&
            typeof message.content === 'string'
        );
    })
    .filter(
      (messages) =>
        messages.some((message) => message.role === 'user') &&
        messages.some((message) => message.role === 'assistant')
    );
}

function systemPrompt(profile: JsonRecord): string {
  const prompt = typeof profile.system_prompt === 'string' ? profile.system_prompt : '';
  if (!prompt) throw new Error('Missing system_prompt in specialist profile.');
  return [
    prompt,
    'Runtime mode: prompt-specialized baseline, not a fine-tuned model.',
    'Use the examples as behavioral guidance, not as source data to reveal.',
    'When drafting Agent Review Feedback, use these headings when relevant: Coverage matrix, Findings, Manual checks remaining, Decision boundary, Recommendation.',
    'When evidence is incomplete, state what remains manual or requires reviewer approval.',
    'When you include a Decision boundary section, state this exact boundary in substance: this is not an official reviewer decision.',
    'Never present an automated answer as an official approval, rejection, or final reviewer decision.',
    'For secret or credential requests, refuse briefly and do not repeat or fabricate credential values.'
  ].join('\n');
}

function buildMessages(profile: JsonRecord, examples: Message[][], prompt: string): Message[] {
  const messages: Message[] = [{ role: 'system', content: systemPrompt(profile) }];

  for (const example of examples) {
    const user = example.find((message) => message.role === 'user');
    const assistant = [...example].reverse().find((message) => message.role === 'assistant');
    if (!user || !assistant) continue;
    messages.push({ role: 'user', content: user.content });
    messages.push({ role: 'assistant', content: assistant.content });
  }

  messages.push({ role: 'user', content: prompt });
  return messages;
}

function looksLikeSecret(text: string): boolean {
  return /\b(app-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}|lf_[A-Za-z0-9_-]{12,}|secret_[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{20,})/i.test(
    text
  );
}

function enforceRuntimeBoundaries(prompt: string, answer: string): string {
  const additions: string[] = [];
  const normalizedPrompt = prompt.toLowerCase();
  const normalizedAnswer = answer.toLowerCase();
  const reviewFeedbackRequest =
    normalizedPrompt.includes('agent review feedback') ||
    normalizedPrompt.includes('reviewer') ||
    normalizedAnswer.includes('decision boundary');
  const saveBoundaryRequest =
    normalizedPrompt.includes('save boundary') ||
    normalizedPrompt.includes('saved into agent review feedback') ||
    normalizedAnswer.includes('template_review_save_agent_feedback');

  if (reviewFeedbackRequest && !normalizedAnswer.includes('not an official')) {
    additions.push('Decision boundary\nThis is not an official reviewer decision.');
  }

  if (saveBoundaryRequest && !normalizedAnswer.includes('`review_status`')) {
    additions.push(
      'Write boundary\nUse `template_review_save_agent_feedback` only for `version_id` and `agent_review_feedback`; do not pass `review_status` or other official decision fields.'
    );
  }

  return additions.length > 0 ? `${answer.trim()}\n\n${additions.join('\n\n')}` : answer.trim();
}

async function inputPrompt(args: Args): Promise<string> {
  if (args.promptFile) return (await readFile(args.promptFile, 'utf8')).trim();
  if (args.prompt?.trim()) return args.prompt.trim();
  throw new Error('Provide --prompt or --prompt-file.');
}

async function writeReceipt(path: string, value: JsonRecord): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + '\n');
}

async function main(): Promise<void> {
  const args = parseArgs();
  const prompt = await inputPrompt(args);
  const profile = await readJson(args.profile);
  const training = parseTraining(await readFile(args.trainingFile, 'utf8'));
  const selectedExamples = training.slice(0, args.maxExamples);
  const runtime = record(profile.runtime);
  const model =
    args.model ??
    process.env.TEMPLATE_REVIEW_SPECIALIST_MODEL?.trim() ??
    (typeof runtime.preferred_base_model === 'string'
      ? runtime.preferred_base_model
      : 'gpt-4.1-nano-2025-04-14');
  const messages = buildMessages(profile, selectedExamples, prompt);
  const startedAt = Date.now();

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
    max_tokens: args.maxOutputTokens
  });
  const rawAnswer = response.choices[0]?.message?.content?.trim() ?? '';
  const answer = enforceRuntimeBoundaries(prompt, rawAnswer);
  const receipt = {
    generated_at: new Date().toISOString(),
    model,
    specialist_id: profile.id,
    runtime_type: runtime.type,
    prompt,
    answer,
    raw_answer: rawAnswer,
    usage: response.usage,
    examples_used: selectedExamples.length,
    duration_ms: Date.now() - startedAt,
    safety: {
      secret_pattern_detected: looksLikeSecret(answer),
      raw_trace_payloads_embedded: false,
      official_decision_allowed: false
    }
  };

  await writeReceipt(args.out ?? DEFAULT_OUT, receipt);

  if (args.json) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    console.log(answer);
  }

  if (looksLikeSecret(answer)) {
    throw new Error('Runtime output contained a secret-like value.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
