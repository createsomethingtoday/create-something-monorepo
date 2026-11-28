// Option A: score the docs site's own search tool (generated answer + footnote URLs)
// against eval/questions.json. Usage: node eval/run-docs-site.mjs [out.json]
import fs from 'node:fs';

const ENDPOINT = 'https://developers.webflow.com/_mcp/server';
const { questions } = JSON.parse(fs.readFileSync(new URL('./questions.json', import.meta.url)));

async function searchDocs(query) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'searchDocs', arguments: { query, topK: 5 } } }),
  });
  const raw = await response.text();
  const line = raw.split('\n').find((l) => l.startsWith('data: '));
  const message = JSON.parse(line ? line.slice(6) : raw);
  const text = (message.result?.content ?? []).map((c) => c.text ?? '').join('\n');
  const sources = [...new Set([...text.matchAll(/^\[\^\d+\]:\s*(\S+)/gm)].map((m) => m[1]))];
  return { text, sources };
}

const rows = [];
for (const q of questions) {
  const started = Date.now();
  let result = { text: '', sources: [] };
  let error = null;
  try { result = await searchDocs(q.question); } catch (e) { error = String(e); }
  const gold = result.sources.filter((u) => q.pages.some((f) => u.includes(f)));
  rows.push({
    id: q.id,
    fact: new RegExp(q.fact, 'i').test(result.text),
    citesGold: gold.length > 0,
    oldVersionCited: result.sources.filter((u) => /\/v2\.0\.0-beta\/|\/v1\.0\.0\//.test(u)),
    sources: result.sources,
    ms: Date.now() - started,
    error,
  });
  const r = rows.at(-1);
  console.log(`${r.fact ? 'F' : '-'}${r.citesGold ? 'P' : '-'}${r.oldVersionCited.length ? 'v' : ' '} ${String(r.ms).padStart(6)}ms ${q.id}`);
}
const n = rows.length;
const count = (f) => rows.filter(f).length;
const summary = {
  questions: n,
  factInAnswer: count((r) => r.fact),
  citesGoldPage: count((r) => r.citesGold),
  both: count((r) => r.fact && r.citesGold),
  citesBetaOrV1Url: count((r) => r.oldVersionCited.length > 0),
  medianMs: rows.map((r) => r.ms).sort((a, b) => a - b)[n >> 1],
};
console.log(summary);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ summary, rows }, null, 1));
