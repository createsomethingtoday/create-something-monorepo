#!/usr/bin/env node
/**
 * Doc-change detection: diff governed doc_locations against the local
 * openapi-internal checkout. First run baselines; later runs notify doc-path
 * subscribers when a governed doc's latest commit is newer than last_verified_at.
 *
 * Usage (from monorepo root, so infisical resolves):
 *   node packages/app-governance-db/scripts/check-doc-changes.mjs
 * Env: DOCS_REPO_DIR (default ~/Code/openapi-internal), APP_GOVERNANCE_MCP_KEY (else infisical)
 */
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.APP_GOVERNANCE_MCP_URL ?? 'https://app-governance.mcp.createsomething.agency/mcp';
const REPO = process.env.DOCS_REPO_DIR ?? path.join(os.homedir(), 'Code', 'openapi-internal');

function key() {
  if (process.env.APP_GOVERNANCE_MCP_KEY) return process.env.APP_GOVERNANCE_MCP_KEY;
  const out = execFileSync('infisical', ['secrets', 'get', 'APP_GOVERNANCE_MCP_KEY', '--plain'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  return out.trim().split('\n').pop().trim();
}

const KEY = key();
const headers = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'User-Agent': 'app-governance-sync/1.0' };

function parseSse(text) {
  const line = text.split('\n').find((l) => l.startsWith('data:'));
  return line ? JSON.parse(line.slice(5)) : JSON.parse(text);
}

let sessionId = null;
async function rpc(method, params, id) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: sessionId ? { ...headers, 'Mcp-Session-Id': sessionId } : headers,
    body: JSON.stringify({ jsonrpc: '2.0', ...(id !== undefined ? { id } : {}), method, params }),
  });
  if (!res.ok) throw new Error(`${method} → HTTP ${res.status}: ${await res.text()}`);
  sessionId = res.headers.get('mcp-session-id') ?? sessionId;
  const text = await res.text();
  return id !== undefined ? parseSse(text) : null;
}

async function call(name, args, id) {
  const resp = await rpc('tools/call', { name, arguments: args }, id);
  if (resp.error) throw new Error(`${name}: ${JSON.stringify(resp.error)}`);
  return JSON.parse(resp.result.content[0].text);
}

await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'check-doc-changes', version: '1.0' } }, 1);
await rpc('notifications/initialized', {});

if (process.argv.includes('--pull')) {
  try {
    execFileSync('git', ['pull', '--ff-only'], { cwd: REPO, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('repo pulled (ff-only)');
  } catch {
    console.log('repo pull skipped (offline or non-ff) — checking against local state');
  }
}

const locations = await call('governance_list_doc_locations', {}, 2);
console.log(`governed locations: ${locations.length} (repo: ${REPO})`);

const counts = { baseline: 0, unchanged: 0, changed: 0, missing: 0 };
for (const [i, loc] of locations.entries()) {
  let commitIso, subject;
  try {
    commitIso = execFileSync('git', ['log', '-1', '--format=%cI', '--', loc.path], { cwd: REPO, encoding: 'utf-8' }).trim();
    subject = execFileSync('git', ['log', '-1', '--format=%s', '--', loc.path], { cwd: REPO, encoding: 'utf-8' }).trim();
  } catch {
    commitIso = '';
  }
  if (!commitIso) {
    counts.missing += 1;
    console.log(`  ? ${loc.path} — no git history found (moved/renamed?)`);
    continue;
  }
  const result = await call('governance_record_doc_change', {
    path: loc.path,
    commit_iso: commitIso,
    commit_summary: subject,
    actor: 'check-doc-changes',
  }, 10 + i);
  counts[result.action] += 1;
  if (result.action === 'changed') {
    console.log(`  ! CHANGED ${loc.path} (${commitIso}) → notified ${result.subscribers_notified.map((n) => n.target).join(', ') || 'no subscribers'}`);
  }
}
// Record the sync itself: cursor = repo HEAD, so the docs source reads as
// synced alongside every other source.
const headIso = execFileSync('git', ['log', '-1', '--format=%cI'], { cwd: REPO, encoding: 'utf-8' }).trim();
const headSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO, encoding: 'utf-8' }).trim();
await call('governance_set_cursor', {
  source_type: 'docs_repo',
  source_external_id: 'webflow/openapi-internal',
  cursor_value: `${headIso} @ ${headSha}`,
  synced_by: 'check-doc-changes',
  metadata_json: JSON.stringify({ locations: locations.length, ...counts }),
}, 999);
console.log(`cursor set: HEAD ${headSha} (${headIso})`);
console.log('done:', counts);
