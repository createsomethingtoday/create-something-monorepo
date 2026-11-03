import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const MAX_BYTES = 1024 * 1024;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const QUERIES = Object.freeze([
  ['package-validation', 'package validation tests build'],
  ['release-evidence', 'release evidence deployment verification'],
  ['contract-reconciliation', 'workflow contract historical context reconciliation']
]);

async function defaultRunCtx(args) {
  const { stdout } = await execute('ctx', args, {
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: MAX_BYTES
  });
  return stdout;
}

function fail() {
  // Never attach the underlying exception: CTX errors can contain private history.
  throw new Error('History collection failed: invalid or unavailable bounded CTX response');
}

async function read(runCtx, args) {
  let stdout;
  try {
    stdout = await runCtx(args);
  } catch {
    fail();
  }
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout, 'utf8') > MAX_BYTES) fail();
  let value;
  try {
    value = JSON.parse(stdout);
  } catch {
    fail();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return { stdout, value };
}

function canonicalIds(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    !ID.test(value.ctx_session_id) ||
    !ID.test(value.ctx_event_id)
  )
    fail();
  // Alias fields, when present, must not disagree with the canonical CTX IDs.
  if (value.event_id !== undefined && value.event_id !== value.ctx_event_id) fail();
  if (value.session_id !== undefined && value.session_id !== value.ctx_session_id) fail();
  return { sessionId: value.ctx_session_id, eventId: value.ctx_event_id };
}

function sameIds(value, expected) {
  const actual = canonicalIds(value);
  if (actual.sessionId !== expected.sessionId || actual.eventId !== expected.eventId) fail();
}

/**
 * Retrieve bounded local signals from the existing CTX index. These references
 * prove retrieval only, never an outcome, completion, workflow validity, or approval.
 * No transcripts, snippets, commands, or files are emitted or persisted.
 */
export async function collectHistory({ repoRoot, runCtx = defaultRunCtx } = {}) {
  if (typeof repoRoot !== 'string' || !repoRoot.trim() || typeof runCtx !== 'function') fail();
  const workspace = basename(resolve(repoRoot)) || 'create-something-monorepo';
  const events = [];
  const seen = new Set();
  for (const [pattern, query] of QUERIES) {
    const { value } = await read(runCtx, [
      'search',
      query,
      '--workspace',
      workspace,
      '--primary-only',
      '--refresh',
      'off',
      '--format',
      'json',
      '--limit',
      '4'
    ]);
    if (
      value.schema_version !== 2 ||
      value.payload_type !== 'search_results' ||
      !Array.isArray(value.results) ||
      value.results.length > 4
    )
      fail();
    // Validate every hit before issuing a show command for this response.
    const selected = value.results.map(canonicalIds);
    for (const ids of selected) {
      const key = `${pattern}:${ids.eventId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const evidence = await read(runCtx, [
        'show',
        'event',
        ids.eventId,
        '--window',
        '0',
        '--format',
        'json'
      ]);
      if (
        evidence.value.schema_version !== 1 ||
        evidence.value.payload_type !== 'event_window' ||
        !Array.isArray(evidence.value.events) ||
        evidence.value.events.length !== 1
      )
        fail();
      sameIds(evidence.value, ids);
      sameIds(evidence.value.event, ids);
      sameIds(evidence.value.events[0], ids);
      events.push({
        pattern,
        ...ids,
        evidenceSha256: `sha256:${createHash('sha256').update(evidence.stdout, 'utf8').digest('hex')}`
      });
    }
  }
  return {
    schema: 'workflow-discovery-history@1',
    coverage: 'bounded_existing_index',
    observedAt: new Date().toISOString(),
    events
  };
}
