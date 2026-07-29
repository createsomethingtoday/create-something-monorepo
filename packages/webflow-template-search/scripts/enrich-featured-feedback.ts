#!/usr/bin/env tsx

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  FEATURED_REVIEW_FIELD,
  assertFeaturedFeedbackWriteAllowed,
  buildAnthropicReviewRequest,
  buildFeaturedPublishedFormula,
  buildOpenAiReviewRequest,
  normalizeFeaturedRecord,
  parseReviewDraft,
  summarizePublishedSite,
  type AirtableFeaturedRecord,
  type FeaturedReviewDraft,
  type FeaturedReviewItem,
  type FeaturedSiteEvidence,
} from '../src/featuredFeedback.js';

const DEFAULT_BASE_ID = 'appMoIgXMTTTNIc3p';
const DEFAULT_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const FIELDS = [
  'Name',
  FEATURED_REVIEW_FIELD,
  'Reviewer pick (featured templates)',
  '⚙️🆎Type (Text)',
  '🚀Marketplace Status',
  '🥞Is Currently Featured? (🏗️ only)',
  'ℹ️Is Featured? (🖥️, 🏗️only)',
  'ℹ️Description (Short)',
  'ℹ️Description (Long).html',
  '🥞Template Type (🏗️ only)',
  'ℹ️🪣Categories (Text)',
  'ℹ️🪣Category Group(s) (Text)',
  'ℹ️Notes',
  'ℹ️✨Features Highlighted',
  '🖼️Thumbnail Image',
  '🖼️Thumbnail Image (Secondary)',
  '🔗Website URL',
  '🔗Preview Site URL',
  '🔗Listing URL',
  '🏸Admin Detail Page Path (🏗️ only)',
] as const;

type Mode = 'all' | 'existing' | 'missing';
type Provider = 'anthropic' | 'openai';

interface Args {
  apply?: string;
  concurrency: number;
  limit?: number;
  offset: number;
  mode: Mode;
  model: string;
  out: string;
  provider: Provider;
  recordIds: string[];
}

interface Proposal {
  status: 'ready' | 'error';
  recordId: string;
  name: string;
  originalRationale: string;
  proposedRationale?: string;
  model: string;
  provider: Provider;
  createdAt: string;
  reviewUrl: string | null;
  visualSources: string[];
  siteEvidence?: FeaturedSiteEvidence;
  evidence?: string[];
  confidence?: FeaturedReviewDraft['confidence'];
  error?: string;
}

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function parseArgs(argv: string[]): Args {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let modelExplicit = false;
  const args: Args = {
    concurrency: 3,
    offset: 0,
    mode: 'all',
    model: process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-5',
    out: path.resolve('output', 'featured-template-feedback', `${timestamp}.proposals.jsonl`),
    provider: 'anthropic',
    recordIds: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--apply' && next) { args.apply = path.resolve(next); index += 1; }
    else if (arg === '--concurrency' && next) { args.concurrency = Math.max(1, Math.min(6, integer(next, 3))); index += 1; }
    else if (arg === '--limit' && next) { args.limit = Math.max(1, integer(next, 1)); index += 1; }
    else if (arg === '--offset' && next) { args.offset = integer(next, 0); index += 1; }
    else if (arg === '--mode' && next && ['all', 'existing', 'missing'].includes(next)) { args.mode = next as Mode; index += 1; }
    else if (arg === '--model' && next) { args.model = next; modelExplicit = true; index += 1; }
    else if (arg === '--out' && next) { args.out = path.resolve(next); index += 1; }
    else if (arg === '--provider' && next && ['anthropic', 'openai'].includes(next)) { args.provider = next as Provider; index += 1; }
    else if (arg === '--record-id' && next) { args.recordIds.push(next); index += 1; }
    else if (arg === '--help') {
      console.log('Usage: pnpm featured-feedback -- [--provider anthropic|openai] [--mode all|existing|missing] [--record-id rec...] [--limit n] [--offset n] [--concurrency n] [--out file] [--model name] [--apply proposals.jsonl]');
      process.exit(0);
    } else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (args.provider === 'openai' && !modelExplicit) {
    args.model = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
  }
  return args;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function airtableToken(): string {
  return process.env.AIRTABLE_API_KEY?.trim() || process.env.AIRTABLE_API_TOKEN?.trim() || requiredEnv('AIRTABLE_API_KEY');
}

function airtableConfig() {
  return {
    token: airtableToken(),
    baseId: process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_BASE_ID,
    tableId: process.env.AIRTABLE_ASSETS_TABLE_ID?.trim() || DEFAULT_TABLE_ID,
  };
}

async function airtableRequest(url: URL | string, init: RequestInit = {}, attempts = 4): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${airtableToken()}`, 'Content-Type': 'application/json', ...init.headers },
      });
      if (response.ok) return response;
      const body = await response.text();
      lastError = new Error(`Airtable ${response.status}: ${body.slice(0, 600)}`);
      if (response.status !== 429 && response.status < 500) throw lastError;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function listFeaturedRecords(): Promise<AirtableFeaturedRecord[]> {
  const { baseId, tableId } = airtableConfig();
  const records: AirtableFeaturedRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('filterByFormula', buildFeaturedPublishedFormula());
    for (const field of FIELDS) url.searchParams.append('fields[]', field);
    if (offset) url.searchParams.set('offset', offset);
    const response = await airtableRequest(url);
    const body = (await response.json()) as { records?: AirtableFeaturedRecord[]; offset?: string };
    records.push(...(body.records ?? []));
    offset = body.offset;
  } while (offset);
  return records;
}

async function fetchSiteEvidence(item: FeaturedReviewItem): Promise<FeaturedSiteEvidence> {
  if (!item.reviewUrl) throw new Error('No published-site URL is available.');
  let lastError: unknown;
  const candidates = [...new Set([item.reviewUrl, item.previewUrl, item.listingUrl].filter((url): url is string => Boolean(url)))];
  for (const candidate of candidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(candidate, {
          headers: { 'User-Agent': 'create-something-featured-template-review/1.0' },
          redirect: 'follow',
          signal: AbortSignal.timeout(20_000),
        });
        const html = (await response.text()).slice(0, 2_500_000);
        const evidence = summarizePublishedSite(response.url || candidate, response.status, html);
        if (evidence.status !== 200) throw new Error(`Review URL returned ${evidence.status}.`);
        return evidence;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function openAiReview(item: FeaturedReviewItem, model: string, siteEvidence: FeaturedSiteEvidence): Promise<FeaturedReviewDraft> {
  const request = buildOpenAiReviewRequest({ item, model, siteEvidence });
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${requiredEnv('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 800)}`);
      const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content;
      if (!content) throw new Error('OpenAI returned no review content.');
      return parseReviewDraft(content, item, siteEvidence);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 700 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function anthropicImage(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Template image returned ${response.status}.`);
  const mediaType = (response.headers.get('content-type') || 'image/webp').split(';')[0];
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
    throw new Error(`Unsupported template image type: ${mediaType}.`);
  }
  const data = Buffer.from(await response.arrayBuffer()).toString('base64');
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}

async function anthropicReview(item: FeaturedReviewItem, model: string, siteEvidence: FeaturedSiteEvidence): Promise<FeaturedReviewDraft> {
  const imageContent: Array<Record<string, unknown>> = [];
  for (const url of [item.primaryImageUrl, item.secondaryImageUrl]) {
    if (url) imageContent.push(await anthropicImage(url));
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': requiredEnv('ANTHROPIC_API_KEY'),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildAnthropicReviewRequest({ item, model, siteEvidence, imageContent })),
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 800)}`);
      const body = (await response.json()) as { content?: Array<{ type?: string; name?: string; input?: unknown }> };
      const toolUse = body.content?.find((entry) => entry.type === 'tool_use' && entry.name === 'submit_featured_review');
      if (!toolUse?.input) throw new Error('Anthropic returned no structured review.');
      return parseReviewDraft(JSON.stringify(toolUse.input), item, siteEvidence);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 700 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function generateReview(provider: Provider, item: FeaturedReviewItem, model: string, siteEvidence: FeaturedSiteEvidence) {
  return provider === 'anthropic'
    ? anthropicReview(item, model, siteEvidence)
    : openAiReview(item, model, siteEvidence);
}

async function mapConcurrent<T, R>(values: T[], concurrency: number, task: (value: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}

async function generate(args: Args): Promise<void> {
  requiredEnv(args.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY');
  const all = (await listFeaturedRecords()).map(normalizeFeaturedRecord).sort((a, b) => a.name.localeCompare(b.name));
  const selected = all
    .filter((item) => args.mode === 'all' || (args.mode === 'existing' ? Boolean(item.originalRationale) : !item.originalRationale))
    .filter((item) => args.recordIds.length === 0 || args.recordIds.includes(item.id))
    .slice(args.offset, args.limit ? args.offset + args.limit : undefined);
  await mkdir(path.dirname(args.out), { recursive: true });
  console.log(JSON.stringify({ mode: 'proposal', featuredTotal: all.length, selected: selected.length, out: args.out, provider: args.provider, model: args.model }));

  let completed = 0;
  await mapConcurrent(selected, args.concurrency, async (item): Promise<Proposal> => {
    const base: Proposal = {
      status: 'error',
      recordId: item.id,
      name: item.name,
      originalRationale: item.originalRationale,
      model: args.model,
      provider: args.provider,
      createdAt: new Date().toISOString(),
      reviewUrl: item.reviewUrl,
      visualSources: [item.primaryImageUrl, item.secondaryImageUrl].filter((url): url is string => Boolean(url)),
    };
    let proposal: Proposal;
    try {
      if (base.visualSources.length === 0) throw new Error('No current Marketplace template image is available.');
      const siteEvidence = await fetchSiteEvidence(item);
      const draft = await generateReview(args.provider, item, args.model, siteEvidence);
      proposal = {
        ...base,
        status: 'ready',
        proposedRationale: draft.rationale.replace(/\s+/g, ' ').trim(),
        siteEvidence,
        evidence: draft.evidence,
        confidence: draft.confidence,
      };
    } catch (error) {
      proposal = { ...base, error: error instanceof Error ? error.message : String(error) };
    }
    await appendFile(args.out, `${JSON.stringify(proposal)}\n`, 'utf8');
    completed += 1;
    console.log(`${completed}/${selected.length} ${proposal.status.toUpperCase()} ${item.name}`);
    return proposal;
  });
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function isStillPublishedFeatured(record: AirtableFeaturedRecord): boolean {
  const fields = record.fields;
  const isFeatured = (value: unknown) => value === true || value === 1;
  return fields['⚙️🆎Type (Text)'] === 'Template🏗️' &&
    fields['🚀Marketplace Status'] === '3️⃣Published🚀' &&
    (isFeatured(fields['🥞Is Currently Featured? (🏗️ only)']) || isFeatured(fields['ℹ️Is Featured? (🖥️, 🏗️only)']));
}

async function fetchCurrentByIds(ids: string[]): Promise<Map<string, AirtableFeaturedRecord>> {
  const { baseId, tableId } = airtableConfig();
  const records = new Map<string, AirtableFeaturedRecord>();
  for (const group of chunks(ids, 40)) {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('filterByFormula', `OR(${group.map((id) => `RECORD_ID()="${id}"`).join(',')})`);
    for (const field of FIELDS) url.searchParams.append('fields[]', field);
    const response = await airtableRequest(url);
    const body = (await response.json()) as { records?: AirtableFeaturedRecord[] };
    for (const record of body.records ?? []) records.set(record.id, record);
  }
  return records;
}

async function apply(args: Args): Promise<void> {
  const proposalPath = args.apply!;
  assertFeaturedFeedbackWriteAllowed(process.env, proposalPath);
  const lines = (await readFile(proposalPath, 'utf8')).split(/\r?\n/).filter(Boolean);
  const proposals = lines.map((line) => JSON.parse(line) as Proposal).filter((item) => item.status === 'ready' && item.proposedRationale);
  const current = await fetchCurrentByIds(proposals.map((item) => item.recordId));
  const eligible = proposals.filter((proposal) => {
    const record = current.get(proposal.recordId);
    if (!record || !isStillPublishedFeatured(record)) return false;
    return String(record.fields[FEATURED_REVIEW_FIELD] ?? '').trim() === proposal.originalRationale;
  });
  const receiptPath = `${proposalPath}.receipts.jsonl`;
  console.log(JSON.stringify({ mode: 'apply', proposals: proposals.length, eligible: eligible.length, skipped: proposals.length - eligible.length, receipts: receiptPath }));
  const { baseId, tableId } = airtableConfig();
  let written = 0;
  for (const group of chunks(eligible, 10)) {
    const response = await airtableRequest(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        records: group.map((proposal) => ({ id: proposal.recordId, fields: { [FEATURED_REVIEW_FIELD]: proposal.proposedRationale } })),
        typecast: false,
      }),
    });
    await response.json();
    const returned = await fetchCurrentByIds(group.map((proposal) => proposal.recordId));
    for (const proposal of group) {
      const actual = String(returned.get(proposal.recordId)?.fields[FEATURED_REVIEW_FIELD] ?? '').trim();
      const verified = actual === proposal.proposedRationale;
      await appendFile(receiptPath, `${JSON.stringify({ recordId: proposal.recordId, name: proposal.name, verified, writtenAt: new Date().toISOString(), originalRationale: proposal.originalRationale, proposedRationale: proposal.proposedRationale })}\n`, 'utf8');
      if (!verified) throw new Error(`Airtable read-back mismatch for ${proposal.name}.`);
      written += 1;
    }
    console.log(`${written}/${eligible.length} WRITTEN`);
    await new Promise((resolve) => setTimeout(resolve, 240));
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.apply) await apply(args);
else await generate(args);
