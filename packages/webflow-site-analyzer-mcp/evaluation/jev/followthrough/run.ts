import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { classifyUrls as revised } from '../../../src/url-classifier.js';
const root = new URL('./', import.meta.url);
const protocolText = fs.readFileSync(new URL('protocol.json', root), 'utf8');
const protocol = JSON.parse(protocolText);
const split = process.argv[2];
if (!['development', 'heldout', 'regression'].includes(split))
  throw new Error('Select development, heldout or regression');
if (!process.env.TYPESAFE_API_KEY?.trim()) throw new Error('Missing TYPESAFE_API_KEY');
const baselineSha = 'c7ed7a27fe68f488839b13abfca64716edfb3682';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-baseline-'));
fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"module"}');
for (const name of ['url-classifier.ts', 'jev-url-classifier.ts', 'types.ts']) {
  fs.writeFileSync(
    path.join(temp, name),
    execFileSync('git', ['show', `${baselineSha}:packages/webflow-site-analyzer-mcp/src/${name}`])
  );
}
const { classifyUrls: baseline } = await import(
  pathToFileURL(path.join(temp, 'url-classifier.ts')).href
);
const cases =
  split === 'regression'
    ? JSON.parse(fs.readFileSync(new URL('../protocol.json', root), 'utf8')).groups.flatMap(
        (g: any) => g.cases
      )
    : protocol.cases.filter((c: any) => c.split === split);
const approved = JSON.parse(fs.readFileSync(new URL('approved-expectations.json', root), 'utf8'));
if (split === 'regression')
  for (const c of cases) if (approved.overrides[c.url]) c.expected = approved.overrides[c.url];
const groups: Record<string, any[]> = {};
for (const c of cases) (groups[new URL(c.url).origin] ??= []).push(c);
const rows: any[] = [];
for (let repeat = 0; repeat < 2; repeat++) {
  for (const arm of repeat ? ['revised', 'baseline'] : ['baseline', 'revised']) {
    for (const [origin, cases] of Object.entries(groups)) {
      const receipts: any[] = [],
        calls: any[] = [];
      const started = performance.now();
      const results = await (arm === 'baseline' ? baseline : revised)(
        cases.map((c) => c.url),
        origin + '/',
        {
          jev: {
            apiKey: process.env.TYPESAFE_API_KEY,
            onReceipt: (r: any) => receipts.push(r),
            fetchImpl: async (url: any, init: any) => {
              const request = JSON.parse(init.body);
              const start = performance.now();
              try {
                const response = await fetch(url, init);
                const body = await response
                  .clone()
                  .json()
                  .catch(() => null);
                calls.push({
                  request,
                  httpStatus: response.status,
                  elapsedMs: performance.now() - start,
                  response: body
                });
                return response;
              } catch {
                calls.push({ request, elapsedMs: performance.now() - start, error: 'transport' });
                throw new Error('transport');
              }
            }
          }
        }
      );
      const failures = cases.flatMap((c, i) =>
        c.expected.includes(results[i].classification)
          ? []
          : [
              {
                url: c.url,
                expected: c.expected,
                actual: results[i].classification,
                confidence: results[i].confidence
              }
            ]
      );
      const invariant =
        results.length === cases.length &&
        results.every((r: any, i: number) => r.url === cases[i].url);
      rows.push({
        arm,
        repeat,
        origin,
        elapsedMs: performance.now() - started,
        total: cases.length,
        correct: cases.length - failures.length,
        invariant,
        failures,
        receipts,
        calls,
        results
      });
      console.log(
        JSON.stringify({
          arm,
          repeat,
          origin,
          total: cases.length,
          correct: cases.length - failures.length,
          failures
        })
      );
    }
  }
}
const summaries = Object.fromEntries(
  ['baseline', 'revised'].map((arm) => {
    const own = rows.filter((r) => r.arm === arm),
      times = own.map((r) => r.elapsedMs).sort((a, b) => a - b);
    const sweep = protocol.thresholds.map((threshold: number) => {
      let eligible = 0,
        accepted = 0,
        correct = 0,
        abstained = 0;
      for (const r of own)
        for (const call of r.calls)
          for (const [id, a] of Object.entries(call.response?.answers ?? {}) as [string, any][]) {
            eligible++;
            if (a.choice === 'no_match') {
              abstained++;
              continue;
            }
            if (a.confidence < threshold) continue;
            accepted++;
            const c = groups[r.origin][Number(id.slice(1))];
            if (c.expected.includes(a.choice)) correct++;
          }
      return {
        threshold,
        eligible,
        accepted,
        correct,
        abstained,
        coverage: eligible ? accepted / eligible : null,
        acceptedAccuracy: accepted ? correct / accepted : null
      };
    });
    return [
      arm,
      {
        total: own.reduce((n, r) => n + r.total, 0),
        correct: own.reduce((n, r) => n + r.correct, 0),
        medianMs: times[Math.floor(times.length / 2)],
        p95Ms: times[Math.ceil(times.length * 0.95) - 1],
        serviceFallbacks: own.flatMap((r) => r.receipts).filter((r) => r.status === 'fallback')
          .length,
        sweep
      }
    ];
  })
);
fs.writeFileSync(
  new URL(`${split}-results.json`, root),
  JSON.stringify(
    {
      baselineSha,
      protocolHash: crypto.createHash('sha256').update(protocolText).digest('hex'),
      split,
      approvedExpectations: split === 'regression' ? approved : undefined,
      labels: protocol.labels,
      summaries,
      rows
    },
    null,
    2
  ) + '\n'
);
console.log(JSON.stringify(summaries));
fs.rmSync(temp, { recursive: true });

const next = rows.filter((r) => r.arm === 'revised');
const invalid = next.some(
  (r) => !r.invariant || r.receipts.some((receipt: any) => receipt.status !== 'ok')
);
const wrongLicense = next.some((r) =>
  r.failures.some(
    (f: any) => f.actual === 'utility:license' && !f.expected.includes('utility:license')
  )
);
const regression = split === 'regression' && next.some((r) => r.failures.length);
const qualityRegression = summaries.revised.correct < summaries.baseline.correct;
if (invalid || wrongLicense || regression || qualityRegression) process.exitCode = 1;
