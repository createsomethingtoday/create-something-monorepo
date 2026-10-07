#!/usr/bin/env node
// Aggregate judgments across arms into one Markdown report.
//
//   node scripts/report.mjs [--out runs/REPORT.md]
//
// Reads runs/<arm>/<versionId>/{run.json,judgment.json,result.json}. Reports
// per arm: versions judged, mean recall and precision, unsupported-finding
// rate, verdict agreement with the human decision, cost proxies (tokens,
// wall time), refusals and failures. Then per taxonomy code: how often the
// human raised it and how often each arm covered it.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(here, '..');
const manifest = JSON.parse(readFileSync(join(PKG, 'corpus', 'manifest.json'), 'utf8'));
const byId = new Map(manifest.versions.map((v) => [v.versionId, v]));
const runsRoot = join(PKG, 'runs');
const arms = readdirSync(runsRoot).filter((d) => existsSync(join(runsRoot, d)) && !d.endsWith('.md') && !d.endsWith('.json'));

const rows = [];
const perCode = new Map(); // code -> { human: n, covered: { arm: n } }
for (const arm of arms) {
  const versions = readdirSync(join(runsRoot, arm)).filter((d) => existsSync(join(runsRoot, arm, d, 'run.json')));
  const stats = { arm, n: versions.length, judged: 0, recall: [], precision: [], unsupported: 0, matched: 0, plausible: 0, findings: 0, verdictAgree: 0, verdictTotal: 0, inTok: 0, outTok: 0, seconds: 0, failed: 0, refusals: 0 };
  for (const id of versions) {
    const run = readJson(join(runsRoot, arm, id, 'run.json'));
    const v = byId.get(id);
    if (!run?.ok) {
      stats.failed++;
      if (/refus|safety|policy/i.test(run?.error ?? '')) stats.refusals++;
      continue;
    }
    stats.inTok += run.usage?.input_tokens ?? 0;
    stats.outTok += (run.usage?.output_tokens ?? 0) + (run.usage?.reasoning_output_tokens ?? 0);
    stats.seconds += run.seconds ?? 0;
    const j = readJson(join(runsRoot, arm, id, 'judgment.json'));
    if (!j) continue;
    stats.judged++;
    const m = j.judgment.metrics;
    if (typeof m.recall === 'number') stats.recall.push(m.recall);
    if (typeof m.precision === 'number') stats.precision.push(m.precision);
    // 'Testing site missing' is a workspace artifact (the field never reaches the agent); do not count it.
    const result0 = readJson(join(runsRoot, arm, id, 'result.json'));
    const artifactIdx = new Set((result0?.findings ?? []).map((f, i) => (/testing[- ]site|previewSite/i.test(`${f.title} ${f.evidence}`) ? i : -1)).filter((i) => i >= 0));
    const realFindings = j.judgment.agent_findings.filter((a) => !artifactIdx.has(a.index));
    stats.findings += realFindings.length;
    // All three class counters come from the filtered list, so shares stay consistent with the denominator.
    for (const a of realFindings) {
      if (a.class === 'matched') stats.matched++;
      else if (a.class === 'plausible_new') stats.plausible++;
      else if (a.class === 'unsupported') stats.unsupported++;
    }
    stats.artifacts = (stats.artifacts ?? 0) + artifactIdx.size;
    const result = readJson(join(runsRoot, arm, id, 'result.json'));
    const humanDecision = /approved/i.test(v.decision) ? 'approve' : /changes/i.test(v.decision) ? 'changes_requested' : 'reject';
    if (result?.verdict && result.verdict !== 'cannot_determine') {
      stats.verdictTotal++;
      const agentDecision = result.verdict === 'approve' ? 'approve' : result.verdict === 'reject' ? 'reject' : 'changes_requested';
      if (agentDecision === humanDecision || (agentDecision !== 'approve' && humanDecision !== 'approve')) stats.verdictAgree++;
    }
    for (const h of j.judgment.human_issues) {
      const entry = perCode.get(h.code) ?? { human: 0, covered: {} };
      entry.human++;
      if (h.covered) entry.covered[arm] = (entry.covered[arm] ?? 0) + 1;
      perCode.set(h.code, entry);
    }
  }
  rows.push(stats);
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
const lines = [];
lines.push(`# Agent review experiment: results`);
lines.push('');
lines.push(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Corpus: ${manifest.versions.filter((v) => v.bundle?.path).length} labeled versions with bundles (decided since ${manifest.since}). Judge: Claude (independent of every arm).`);
lines.push('');
lines.push('| Arm | Runs | Failed | Judged | Mean recall | Matched share | Plausible-new share | Unsupported | Verdict agrees | Tokens in / out | Mean minutes |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const s of rows) {
  const ok = s.n - s.failed;
  lines.push(`| ${s.arm} | ${s.n} | ${s.failed}${s.refusals ? ` (${s.refusals} refusals)` : ''} | ${s.judged} | ${pct(mean(s.recall))} | ${s.findings ? pct(s.matched / s.findings) : '—'} | ${s.findings ? pct(s.plausible / s.findings) : '—'} | ${s.findings ? `${s.unsupported}/${s.findings}` : '—'} | ${s.verdictTotal ? `${s.verdictAgree}/${s.verdictTotal}` : '—'} | ${fmt(s.inTok)} / ${fmt(s.outTok)} | ${ok ? (s.seconds / ok / 60).toFixed(1) : '—'} |`);
}
lines.push('');
lines.push('Recall = human issues the agent covered, excluding process notes. Matched share = agent findings that cover a human issue. Plausible-new share = findings with specific evidence the human did not write; these need adjudication before they count as precision. Findings that only say the testing site is missing are excluded as a workspace artifact. Verdict agrees = agent and human both approve, or both do not approve.');
lines.push('');
lines.push('## Coverage by issue category');
lines.push('');
lines.push(`| Code | Human issues | ${arms.map((a) => `${a} covered`).join(' | ')} |`);
lines.push(`| --- | --- | ${arms.map(() => '---').join(' | ')} |`);
for (const [code, e] of [...perCode.entries()].sort((a, b) => b[1].human - a[1].human)) {
  lines.push(`| ${code} | ${e.human} | ${arms.map((a) => `${e.covered[a] ?? 0}`).join(' | ')} |`);
}
lines.push('');
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(runsRoot, 'REPORT.md');
writeFileSync(out, lines.join('\n'));
console.log(lines.join('\n'));
console.log(`\nwrote ${out}`);

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}
function fmt(n) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);
}
