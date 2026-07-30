#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { runOfferFindAgent } from './agent.js';
import { CATEGORY_LABELS, parseOfferSearchCategory } from './discovery.js';
import { findOffers } from './resolve.js';
import type { OfferChannel, OfferObservation, OfferRequest } from './types.js';

type Arguments = Record<string, string | boolean>;

function usage(): string {
  return `Usage:
  offer-resolution resolve --input <evidence.json> [--out <result.json>]
  offer-resolution live (--merchant <name> | --category <name>) --need <text> --budget <amount> --zip <postal> --deadline <YYYY-MM-DD> [options]

Live options:
  --category <name>      Supported: health_and_beauty
  --currency <code>       Default: USD
  --channels <list>       Comma-separated online,pickup,in_store
  --as-of <ISO datetime>  Default: current time
  --model <name>          Default: gpt-5.4-mini
  --max-turns <number>    Default: 10
`;
}

function parseArguments(argv: string[]): { command?: string; values: Arguments } {
  const [command, ...rest] = argv;
  const values: Arguments = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next === undefined || next.startsWith('--')) values[key] = true;
    else {
      values[key] = next;
      index += 1;
    }
  }
  return { command, values };
}

function stringValue(values: Arguments, key: string): string | undefined {
  const value = values[key];
  return typeof value === 'string' ? value : undefined;
}

function required(values: Arguments, keys: string[]): Record<string, string> {
  const missing = keys.filter((key) => !stringValue(values, key));
  if (missing.length)
    throw new Error(`Missing required options: ${missing.map((key) => `--${key}`).join(', ')}`);
  return Object.fromEntries(keys.map((key) => [key, stringValue(values, key)!]));
}

function parseChannels(value: string | undefined): OfferChannel[] {
  const channels = (value ?? 'online,pickup').split(',').map((item) => item.trim());
  const allowed = new Set<OfferChannel>(['online', 'pickup', 'in_store']);
  if (!channels.length || channels.some((channel) => !allowed.has(channel as OfferChannel))) {
    throw new Error('--channels must contain only online,pickup,in_store');
  }
  return [...new Set(channels)] as OfferChannel[];
}

async function writeResult(result: unknown, outPath?: string): Promise<void> {
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outPath) await writeFile(resolve(outPath), serialized, 'utf8');
  else process.stdout.write(serialized);
}

async function resolveCommand(values: Arguments): Promise<void> {
  const inputPath = required(values, ['input']).input;
  const input = JSON.parse(await readFile(resolve(inputPath), 'utf8')) as {
    request: OfferRequest;
    observations: OfferObservation[];
  };
  await writeResult(findOffers(input.request, input.observations), stringValue(values, 'out'));
}

async function liveCommand(values: Arguments): Promise<void> {
  const input = required(values, ['need', 'budget', 'zip', 'deadline']);
  const merchant = stringValue(values, 'merchant');
  const categoryValue = stringValue(values, 'category');
  if (Boolean(merchant) === Boolean(categoryValue)) {
    throw new Error('Provide exactly one of --merchant or --category.');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for the live agent command.');
  }
  const budget = Number(input.budget);
  if (!Number.isFinite(budget) || budget <= 0)
    throw new Error('--budget must be greater than zero');
  const maxTurns = Number(stringValue(values, 'max-turns') ?? '10');
  if (!Number.isInteger(maxTurns) || maxTurns <= 0)
    throw new Error('--max-turns must be a positive integer');

  const searchCategory = categoryValue ? parseOfferSearchCategory(categoryValue) : undefined;
  const request: OfferRequest = {
    merchant: merchant ?? CATEGORY_LABELS[searchCategory!],
    searchCategory,
    need: input.need,
    budget,
    currency: stringValue(values, 'currency') ?? 'USD',
    postalCode: input.zip,
    deadline: input.deadline,
    asOf: stringValue(values, 'as-of') ?? new Date().toISOString(),
    channels: parseChannels(stringValue(values, 'channels'))
  };
  const result = await runOfferFindAgent(request, {
    model: stringValue(values, 'model'),
    maxTurns
  });
  await writeResult(result, stringValue(values, 'out'));
}

async function main(): Promise<void> {
  const { command, values } = parseArguments(process.argv.slice(2));
  if (!command || command === 'help' || values.help) {
    process.stdout.write(usage());
    return;
  }
  if (command === 'resolve') return resolveCommand(values);
  if (command === 'live') return liveCommand(values);
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n${usage()}`);
  process.exitCode = 2;
});
