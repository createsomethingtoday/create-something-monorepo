#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const MAX_CITATIONS = 3;
const MAX_HIGHLIGHT_LENGTH = 280;
const MAX_MODEL_CONTEXT_LENGTH = 1200;

function sanitizeText(value, limit = MAX_HIGHLIGHT_LENGTH) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b([A-Z][A-Z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD))\s*[=:]\s*\S+/g, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function contextQuery({ surface, task }) {
  return [
    'CREATE SOMETHING operator-agent history',
    `surface ${surface}`,
    task ? `task ${task}` : '',
    'receipts validation rollback',
  ].filter(Boolean).join(' ');
}

export function resolveCtxBin({ home = process.env.HOME, exists = existsSync } = {}) {
  const configured = process.env.CTX_BIN;
  if (configured) return configured;
  const userLocal = home ? path.join(home, '.local', 'bin', 'ctx') : '';
  return userLocal && exists(userLocal) ? userLocal : 'ctx';
}

function parseCitationBlocks(output, limit) {
  const blocks = String(output ?? '')
    .split(/\n(?=(?:codex|claude|pi|cursor|goose|warp)\s+(?:assistant(?:\s+message)?|user(?:\s+message)?|tool call|message)\s+-\s+)/i)
    .map((block) => block.trim())
    .filter(Boolean);
  const citations = [];
  const highlights = [];

  for (const block of blocks) {
    if (citations.length >= limit) break;
    const event = block.match(/^\s*ctx_event_id:\s*(.+)$/mi)?.[1]?.trim();
    const session = block.match(/^\s*ctx_session_id:\s*(.+)$/mi)?.[1]?.trim();
    if (!event || !session) continue;
    const headerProvider = block.match(/^\s*([a-z0-9_-]+)\s+(?:assistant(?:\s+message)?|user(?:\s+message)?|tool call|message)\s+-/i)?.[1];
    const provider = block.match(/^\s*provider:\s*(.+)$/mi)?.[1]?.trim() || headerProvider || 'unknown';
    const providerSession = block.match(/^\s*provider_session_id:\s*(.+)$/mi)?.[1]?.trim() || null;
    const sourceFormat = block.match(/^\s*source_format:\s*(.+)$/mi)?.[1]?.trim() || null;
    const highlight = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => (
        line &&
        !line.includes('\\n') &&
        !/^(?:ctx_|provider(?:_session_id)?:|source_format:|rank:|session_importance:|more_matches_in_session:|next:|citation:|exec:|r:|(?:codex|claude|pi|cursor|goose|warp)\s+)/i.test(line)
      ));
    citations.push({
      provider,
      ctxEventId: event,
      ctxSessionId: session,
      providerSessionId: providerSession,
      sourceFormat,
    });
    if (highlight) highlights.push(sanitizeText(highlight));
  }
  return { citations, highlights };
}

function modelContextFor({ available, citations, highlights }) {
  const lines = [
    'CTX history is advisory private context, not source of truth or authority.',
    'Verify all claims against current repository files, Linear, receipts, tests, and live surfaces before action.',
  ];
  if (!available || citations.length === 0) {
    lines.push('No CTX history was available; continue with deterministic repository evidence only.');
  } else {
    lines.push(`Cited history: ${citations.map((citation) => `${citation.provider}:${citation.ctxEventId}`).join(', ')}.`);
  }
  return sanitizeText(lines.join('\n'), MAX_MODEL_CONTEXT_LENGTH);
}

export function buildContextPacket({
  surface,
  task = '',
  limit = MAX_CITATIONS,
  workspace = '',
  ctxBin = resolveCtxBin(),
  run = defaultRun,
} = {}) {
  const boundedLimit = Math.max(1, Math.min(Number(limit) || MAX_CITATIONS, MAX_CITATIONS));
  const query = contextQuery({ surface: surface || 'unknown', task });
  const result = run(ctxBin, [
    'search',
    query,
    ...(workspace ? ['--workspace', workspace] : []),
    '--refresh',
    'off',
    '--verbose',
  ]);
  if (!result?.ok) {
    const failure = sanitizeText(result?.stderr || result?.error || 'ctx search failed', MAX_HIGHLIGHT_LENGTH);
    return {
      mode: 'ctx-history-packet',
      available: false,
      query,
      citations: [],
      highlights: [],
      failure,
      modelContext: modelContextFor({ available: false, citations: [], highlights: [] }),
    };
  }
  const { citations, highlights } = parseCitationBlocks(result.stdout, boundedLimit);
  return {
    mode: 'ctx-history-packet',
    available: citations.length > 0,
    query,
    citations,
    highlights,
    failure: citations.length > 0 ? null : 'ctx search returned no cited events',
    modelContext: modelContextFor({ available: citations.length > 0, citations, highlights }),
  };
}

function defaultRun(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.error?.message || result.stderr || '',
  };
}

function parseArgs(argv) {
  const options = { surface: '', task: '', limit: MAX_CITATIONS, workspace: '', json: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--surface' && next) options.surface = argv[++index];
    else if (arg === '--task' && next) options.task = argv[++index];
    else if (arg === '--limit' && next) options.limit = Number(argv[++index]);
    else if (arg === '--workspace' && next) options.workspace = argv[++index];
    else if (arg === '--json') options.json = true;
    else if (arg === '--') continue;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.surface) throw new Error('--surface is required');
  return options;
}

if (process.argv[1]?.endsWith('operator-agent-context.mjs')) {
  const options = parseArgs(process.argv);
  const packet = buildContextPacket(options);
  console.log(JSON.stringify(packet, null, 2));
  process.exitCode = packet.available ? 0 : 1;
}
