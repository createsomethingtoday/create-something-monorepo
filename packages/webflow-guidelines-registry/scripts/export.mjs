#!/usr/bin/env node
/**
 * Export the live wrop's working copy back to MDX files — the hand-off to a
 * webflow/openapi-internal branch.
 *
 *   node scripts/export.mjs [--out <dir>] [--source dist|wrop]
 *
 * --source wrop (default) reads the published page's data island so edits made
 * in the browser are exported. --source dist exports the last local build.
 * Writes <out>/<page>.mdx plus CHANGES.md (changelog + registry deltas) that
 * can be pasted into the PR body.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializePage } from './mdx.mjs';
import { WROP_TOPIC } from './build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const outDir = arg('--out', join(root, 'dist', 'export'));
const source = arg('--source', 'wrop');
const BASE = 'https://wrop.wf.app';

function readDataIsland(html) {
  const m = html.match(/<script id="wfgr-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no data island found');
  return JSON.parse(m[1].replace(/<\\\/script/g, '</script'));
}

let data;
if (source === 'dist') {
  data = JSON.parse(readFileSync(join(root, 'dist', 'data.json'), 'utf8'));
} else {
  const token = execFileSync('cloudflared', ['access', 'token', `--app=${BASE}`], { encoding: 'utf8' }).trim();
  const headers = { 'cf-access-token': token };
  const found = await fetch(`${BASE}/api/wrops?metadata.topic=${encodeURIComponent(WROP_TOPIC)}`, { headers }).then((r) => r.json());
  const slug = found.data?.[0]?.slug;
  if (!slug) throw new Error('no published registry wrop found');
  const html = await fetch(`${BASE}/api/wrops/${slug}/raw`, { headers }).then((r) => r.text());
  data = readDataIsland(html);
  console.log(`read working copy from ${BASE}/w/${slug}`);
}

mkdirSync(outDir, { recursive: true });
const baselineById = new Map();
for (const p of data.baseline.pages) for (const s of p.sections) baselineById.set(s.id, s);

const changed = [];
for (const page of data.working.pages) {
  const text = serializePage(page);
  writeFileSync(join(outDir, `${page.slug}.mdx`), text);
  for (const s of page.sections) {
    const b = baselineById.get(s.id);
    if (!b || b.raw !== s.raw) changed.push({ page: page.slug, id: s.id, heading: s.heading, added: !b });
  }
}

const lines = [
  `# Marketplace docs changes — exported ${new Date().toISOString()}`,
  '',
  `Source baseline: ${data.meta.source.repo}@${data.meta.source.sha} (${data.meta.source.committedAt})`,
  '',
  `## Changed sections (${changed.length})`,
  ...changed.map((c) => `- \`${c.page}.mdx\` → ${c.heading ?? '(intro)'}${c.added ? ' (new)' : ''}`),
  '',
  '## Changelog (from the registry page)',
  ...(data.working.changelog || []).map(
    (e) => `- ${e.at} — ${e.by || 'unknown'} — ${e.sectionId}: ${e.summary}${e.rationale ? ` — _${e.rationale}_` : ''}`,
  ),
  '',
  '## Registry metadata (check · owner · legal) for changed sections',
  ...changed.map((c) => {
    const r = data.working.registry?.[c.id] || {};
    return `- ${c.id}: check=${r.check || '—'} · owner=${r.owner || '—'} · legal=${r.legal || '—'}${r.notes ? ` · ${r.notes}` : ''}`;
  }),
  '',
];
writeFileSync(join(outDir, 'CHANGES.md'), lines.join('\n'));
console.log(`wrote ${data.working.pages.length} .mdx files + CHANGES.md to ${outDir} (${changed.length} changed sections)`);
