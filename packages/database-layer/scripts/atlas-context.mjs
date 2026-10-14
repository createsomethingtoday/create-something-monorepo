#!/usr/bin/env node
// Local orientation only. Automatic refresh writes ignored projections, never sources.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { refreshProjection } from './atlas-context-refresh.mjs';
import { wikiPassages } from './agent-wiki-passages.mjs';

export const repoRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const prefix = 'packages/database-layer/docs/agent-wiki/';
const modules = ['README', 'operating-loop', 'business-recommendations', 'topology-inventory', 'management-surface', 'operating-slices', 'agent-routes'];
const schema = 'atlas-context/v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const stop = new Set('a an and are as at be by for from how i in is it of on or the to use what when where which with'.split(' '));
const tokens = value => (value.toLowerCase().match(/[a-z0-9_]+/g) ?? []).filter(t => t.length > 1 && !stop.has(t));
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const cacheFile = root => path.join(root, '.cache/atlas-context/index.json');

function sources(root) {
  return modules.flatMap(name => {
    const relative = `${prefix}${name}.md`;
    try {
      const text = fs.readFileSync(path.join(root, relative), 'utf8');
      return [{ sourceId: `atlas-context:${name}`, path: relative, text, contentHash: hash(text) }];
    } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  });
}

function buildIndex(inputs) {
  return inputs.flatMap(source => wikiPassages(source.text, source.sourceId).map(passage => ({
    id: `${source.sourceId}:${hash(passage.excerpt).slice(0, 16)}`,
    sourceId: source.sourceId, path: source.path, ...(source.canonicalPath ? { canonicalPath: source.canonicalPath } : {}), heading: passage.heading,
    citation: `${source.path}:${passage.line}`, sourceLines: passage.sourceLines,
    contentHash: hash(passage.excerpt), fileHash: source.contentHash,
    excerpt: passage.excerpt,
    terms: tokens(`${passage.heading} ${passage.heading} ${passage.excerpt}`),
  })));
}

// Fingerprint generator dependencies as bytes, not modification times. Cached passages
// may accelerate parsing; only matching source evidence preserves a checked projection.
function evidenceHash(root) {
  const directory = path.join(root, 'packages/database-layer/data');
  const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(n => n.endsWith('.json')).sort() : [];
  const digest = createHash('sha256');
  for (const name of files) digest.update(name).update(fs.readFileSync(path.join(directory, name)));
  for (const name of ['generate-agent-wiki.mjs', 'agent-wiki-support.mjs']) {
    const file = path.join(root, 'packages/database-layer/scripts', name);
    if (fs.existsSync(file)) digest.update(name).update(fs.readFileSync(file));
  }
  return digest.digest('hex');
}

function load(root, now, maxAgeDays, ignoreCache, refresh = 'auto') {
  const automatic = ignoreCache ? { snapshot: null, refresh: { status: 'off', serving: 'tracked_wiki' }, current: false } : refreshProjection(root, buildIndex, { enabled: refresh === 'auto' });
  const inputs = automatic.snapshot?.sources ?? sources(root);
  const signature = hash(JSON.stringify(inputs.map(s => [s.path, s.contentHash])));
  let cached;
  if (!ignoreCache) { try { cached = JSON.parse(fs.readFileSync(cacheFile(root), 'utf8')); } catch {} }
  const hit = cached?.schema === schema && cached.signature === signature && Array.isArray(cached.passages)
    && cached.passagesHash === hash(JSON.stringify(cached.passages));
  const snapshotDates = inputs.flatMap(s => [...s.text.matchAll(/^> Source snapshot range \(UTC\): (.+)$/gm)]
    .flatMap(m => m[1].match(/\d{4}-\d\d-\d\dT[\d:.]+Z/g) ?? []));
  const validDates = snapshotDates.map(Date.parse).filter(Number.isFinite);
  const oldest = validDates.length ? Math.min(...validDates) : null;
  const ageDays = oldest === null ? null : Math.max(0, (now - oldest) / 86400000);
  return {
    passages: automatic.snapshot?.passages ?? (hit ? cached.passages : buildIndex(inputs)), signature,
    refresh: automatic.refresh,
    cache: automatic.snapshot ? 'projection' : ignoreCache ? 'bypassed' : hit ? 'hit' : cached ? 'invalid' : 'missing',
    freshness: {
      oldestSnapshot: oldest === null ? null : new Date(oldest).toISOString(),
      ageDays: ageDays === null ? null : Math.round(ageDays * 100) / 100,
      stale: ageDays === null ? null : ageDays > maxAgeDays, maxAgeDays,
      projectionConsistency: automatic.snapshot ? (automatic.refresh.status === 'off' ? 'unchecked_local_projection' : automatic.current ? 'current_local_projection' : 'stale_local_projection') : hit && cached.checked && cached.evidenceHash === evidenceHash(root) ? 'verified_at_index' : 'unverified',
      projectionGeneratedAt: automatic.snapshot?.generatedAt ?? null,
      liveVerified: false,
      missingModules: modules.filter(name => !inputs.some(s => s.sourceId === `atlas-context:${name}`)),
    },
  };
}

export function searchContext(query, { root = repoRoot, limit = 5, maxBytes = 12000, maxAgeDays = 7, now = Date.now(), ignoreCache = false, id = null, domain = null, refresh = 'auto' } = {}) {
  if (!id && (typeof query !== 'string' || !query.trim() || Buffer.byteLength(query) > 2000)) throw new Error('Query must contain 1–2000 UTF-8 bytes');
  if (!Number.isInteger(limit) || limit < 1 || limit > 20 || !Number.isInteger(maxBytes) || maxBytes < 2000 || maxBytes > 50000 || !Number.isFinite(maxAgeDays) || maxAgeDays < 0) throw new Error('Use limit 1–20, max-bytes 2000–50000, and nonnegative max-age-days');
  if (domain && !modules.includes(domain)) throw new Error(`Unknown domain; use ${modules.join(', ')}`);
  if (!['auto', 'off'].includes(refresh)) throw new Error('Use refresh auto or off');
  const loaded = load(root, now, maxAgeDays, ignoreCache, refresh);
  const all = loaded.passages;
  const terms = [...new Set(tokens(query ?? ''))];
  const average = all.reduce((sum, p) => sum + p.terms.length, 0) / (all.length || 1);
  const frequency = new Map(terms.map(t => [t, all.filter(p => p.terms.includes(t)).length]));
  const ranked = all.filter(p => !domain || p.sourceId === `atlas-context:${domain}`).map(p => {
    let score = 0;
    for (const term of terms) {
      const count = p.terms.filter(t => t === term).length;
      const df = frequency.get(term);
      if (count) score += Math.log(1 + (all.length - df + 0.5) / (df + 0.5)) * count * 2.2 / (count + 1.2 * (0.25 + 0.75 * p.terms.length / average));
    }
    return { ...p, score };
  }).filter(p => id ? p.id === id || p.sourceId === id : p.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const result = {
    schema, authority: 'orientation_only', requiresSourceInspection: true,
    status: ranked.length ? 'matches' : 'no_match', cache: loaded.cache,
    freshness: loaded.freshness, refresh: loaded.refresh,
    fallback: 'Read packages/database-layer/docs/agent-wiki/README.md and inspect owning sources; no remote evaluation is automatic.',
    truncated: false, results: [],
  };
  for (const { terms: omitted, ...passage } of ranked.slice(0, limit)) {
    result.results.push(passage);
    if (bytes(result) > maxBytes) { result.results.pop(); result.truncated = true; }
  }
  result.truncated ||= result.results.length < ranked.length;
  if (ranked.length && !result.results.length) result.status = 'budget_exhausted';
  return result;
}

export function indexContext({ root = repoRoot, refresh = 'auto' } = {}) {
  if (refresh === 'auto') {
    const result = refreshProjection(root, buildIndex, { force: true });
    if (!result.current) throw new Error(`Local projection refresh ${result.refresh.status}: ${result.refresh.reason ?? 'try again later'}`);
    return { schema, indexedPassages: result.snapshot.passages.length, cachePath: '.cache/atlas-context/projection.json', refresh: result.refresh, liveVerified: false };
  }
  const check = spawnSync(process.execPath, ['packages/database-layer/scripts/generate-agent-wiki.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  if (check.status !== 0) throw new Error('Projection check failed; inspect agent-wiki:check before indexing. No source refresh was performed.');
  const loaded = load(root, Date.now(), 7, true);
  const cache = { schema, signature: loaded.signature, checked: true, evidenceHash: evidenceHash(root), passages: loaded.passages, passagesHash: hash(JSON.stringify(loaded.passages)) };
  const file = cacheFile(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(cache), { mode: 0o600 });
  fs.renameSync(temporary, file);
  return { schema, indexedPassages: cache.passages.length, cachePath: '.cache/atlas-context/index.json', liveVerified: false };
}

function main(args) {
  args = args.filter(a => a !== '--');
  const command = args.shift();
  if (!command || command === '--help') {
    console.log('atlas-context search "question" [--domain module] [--limit 5] [--max-bytes 12000] [--max-age-days 7] [--refresh auto|off] [--no-cache]\natlas-context show <source-or-passage-id>\natlas-context index\nJSON output. Search/show automatically refresh only ignored local projections on changed inputs (bounded to 2 seconds); --refresh off disables writes. Index forces a local retry. No external refresh, model calls, credentials, or action authority.');
    return;
  }
  if (command === 'index' && !args.length) { console.log(JSON.stringify(indexContext())); return; }
  if (!['search', 'show'].includes(command)) throw new Error('Use search, show, or index; see --help');
  const value = args.shift();
  if (!value || value.startsWith('--')) throw new Error('Provide a query or ID');
  const options = command === 'show' ? { id: value } : {};
  const flags = { '--limit': 'limit', '--max-bytes': 'maxBytes', '--max-age-days': 'maxAgeDays', '--domain': 'domain', '--refresh': 'refresh' };
  while (args.length) {
    const flag = args.shift();
    if (flag === '--no-cache') options.ignoreCache = true;
    else if (flags[flag] && args.length) options[flags[flag]] = ['--domain', '--refresh'].includes(flag) ? args.shift() : Number(args.shift());
    else throw new Error(`Unknown or incomplete flag: ${flag}`);
  }
  console.log(JSON.stringify(searchContext(command === 'search' ? value : '', options)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
