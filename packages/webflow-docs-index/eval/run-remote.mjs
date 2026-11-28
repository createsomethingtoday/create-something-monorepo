// Score the deployed index against eval/questions.json through POST /search.
// Usage: DOCS_INDEX_URL=https://... DOCS_INDEX_ADMIN_TOKEN=... node eval/run-remote.mjs [out.json]
import fs from 'node:fs';

const baseUrl = (process.env.DOCS_INDEX_URL ?? '').replace(/\/$/, '');
const token = process.env.DOCS_INDEX_ADMIN_TOKEN;
if (!baseUrl || !token) {
  console.error('Set DOCS_INDEX_URL and DOCS_INDEX_ADMIN_TOKEN.');
  process.exit(1);
}
const { questions } = JSON.parse(fs.readFileSync(new URL('./questions.json', import.meta.url)));

const rows = [];
for (const q of questions) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: q.question, topK: 5 }),
  });
  const body = await response.json();
  const ms = Date.now() - started;
  const passages = body.passages ?? [];
  const fact = new RegExp(q.fact, 'i');
  const rank = passages.findIndex((p) => q.pages.some((f) => p.url.includes(f)) && fact.test(`${p.headingPath}\n${p.text}`)) + 1;
  rows.push({ id: q.id, rank, ms, status: response.status, degraded: body.degraded ?? [], top: passages.slice(0, 3).map((p) => p.url) });
  console.log(`${rank || '-'} ${String(ms).padStart(5)}ms ${q.id}${rows.at(-1).degraded.length ? ` degraded:${rows.at(-1).degraded}` : ''}`);
}
const within = (k) => rows.filter((row) => row.rank > 0 && row.rank <= k).length;
const times = rows.map((row) => row.ms).sort((a, b) => a - b);
const summary = {
  questions: rows.length,
  top1: within(1),
  top3: within(3),
  top5: within(5),
  degradedAnswers: rows.filter((row) => row.degraded.length > 0).length,
  betaOrV1Urls: rows.filter((row) => row.top.some((url) => /\/v2\.0\.0-beta\/|\/v1\.0\.0\//.test(url))).length,
  medianMs: times[times.length >> 1],
  maxMs: times.at(-1),
};
console.log(summary);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ summary, rows }, null, 1));
