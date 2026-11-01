#!/usr/bin/env node
/**
 * Publish dist/index.html to wrop (https://wrop.wf.app), upserting by metadata
 * topic so the URL stays stable across versions.
 *
 * Auth: Cloudflare Access at the edge. Run `cloudflared access login https://wrop.wf.app`
 * once; this script then reads the cached token via `cloudflared access token`.
 *
 * When a previous version exists, its data island is read back first so edits
 * and changelog entries made in the page (the `working` copy) survive a rebuild.
 * Pass --reset to discard them and republish the baseline.
 */
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, WROP_TOPIC } from './build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const BASE = 'https://wrop.wf.app';
const TITLE = 'Marketplace Guidelines Registry';
const DESCRIPTION =
  'Working copy of the developer-docs Marketplace pages for the app review team: read, edit inline or via WebMCP, attach check/owner/legal metadata per rule group, propose changes, export lossless MDX back to webflow/openapi-internal.';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const reset = args.has('--reset');
if (!dryRun && !args.has('--single-publisher')) throw new Error('Publishing requires --single-publisher after coordinating exclusive publishing. wrop atomic version locking is unverified.');

function token() {
  return execFileSync('cloudflared', ['access', 'token', `--app=${BASE}`], { encoding: 'utf8' }).trim();
}

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'cf-access-token': token(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`wrop returned non-JSON for ${path} (HTTP ${res.status}). Re-run: cloudflared access login ${BASE}`);
  }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} → ${res.status} ${JSON.stringify(body)}`);
  return body;
}

const guardContext = vm.createContext({});
vm.runInContext(readFileSync(join(root, 'src/publication-guard.js'), 'utf8') + ';globalThis.guard=PublicationGuard;', guardContext);
const guard = guardContext.guard;

const me = await api('/api/wrops/whoami');
const found = await api(`/api/wrops?metadata.topic=${encodeURIComponent(WROP_TOPIC)}`);
const existing = found.data?.[0] ?? null;

let previous = null;
if (existing && !reset) {
  const response = await fetch(`${BASE}/api/wrops/${existing.slug}/raw?v=${existing.latest_version}`, { headers: { 'cf-access-token': token() } });
  if (!response.ok) throw new Error(`Live readback failed (HTTP ${response.status}); refusing publish`);
  previous = guard.readData(await response.text());
  console.log(`carrying forward working copy from v${existing.latest_version} (${previous.working.changelog.length} changelog entries)`);
}

const { html, data } = build({ previous });
writeFileSync(join(root, 'dist', 'index.html'), html);

if (dryRun) {
  console.log(`dry run — would ${existing ? `PUT /api/wrops/${existing.slug}` : 'POST /api/wrops'} as ${me.email}, ${(html.length / 1024).toFixed(1)} KB`);
  process.exit(0);
}

const metadata = {
  topic: WROP_TOPIC,
  source: `${data.meta.source.repo}@${data.meta.source.sha.slice(0, 8)}`,
  app_version: data.meta.appVersion,
};

let result;
if (existing) {
  if (existing.created_by && existing.created_by !== me.email) {
    throw new Error(`wrop ${existing.slug} is owned by ${existing.created_by}; you are ${me.email} (403 not_owner would follow)`);
  }
  // This detects observed intervening updates; wrop has no attested CAS contract.
  guard.assertVersion(await api(`/api/wrops/${existing.slug}`), existing.latest_version);
  result = await api(`/api/wrops/${existing.slug}`, { method: 'PUT', body: JSON.stringify({ html }) });
  await api(`/api/wrops/${existing.slug}`, { method: 'PATCH', body: JSON.stringify({ description: DESCRIPTION, metadata }) });
} else {
  result = await api('/api/wrops', {
    method: 'POST',
    body: JSON.stringify({ title: TITLE, description: DESCRIPTION, html, metadata }),
  });
}

console.log(`published v${result.latest_version} → ${BASE}${result.url}`);
console.log(`raw: ${BASE}${result.raw_url}`);
