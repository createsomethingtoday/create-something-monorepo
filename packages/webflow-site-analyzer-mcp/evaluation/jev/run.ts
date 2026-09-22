import fs from 'node:fs';
import crypto from 'node:crypto';
import { classifyUrls, classifyUrlsDeterministic } from '../../src/url-classifier.js';
const protocol = JSON.parse(fs.readFileSync(new URL('./protocol.json', import.meta.url), 'utf8'));
const reference = process.env.EVAL_BASELINE === 'openai';
const baselineKey = reference ? 'WEBFLOW_OPENAI_API_KEY' : 'WEBFLOW_GROQ_API_KEY';
if (!process.env.TYPESAFE_API_KEY?.trim()) throw new Error('Missing TYPESAFE_API_KEY');
if (!process.env[baselineKey]?.trim()) throw new Error(`Missing ${baselineKey}`);
const fetchOriginal = globalThis.fetch;
let network: { status: number; host: string }[] = [];
globalThis.fetch = async (...args) => {
  const r = await fetchOriginal(...args);
  network.push({ status: r.status, host: new URL(String(args[0])).host });
  return r;
};
const rows = [];
for (let rep = 0; rep < protocol.repetitions; rep++) {
  for (const group of protocol.groups) {
    for (const arm of rep % 2 ? ['jev', 'incumbent'] : ['incumbent', 'jev']) {
      const urls = group.cases.map((c: { url: string }) => c.url);
      const receipts: unknown[] = [];
      network = [];
      const start = performance.now();
      const results = await classifyUrls(
        urls,
        group.startUrl,
        arm === 'jev'
          ? {
              jev: { apiKey: process.env.TYPESAFE_API_KEY!, onReceipt: (r) => receipts.push(r) }
            }
          : reference
            ? {
                useLLM: true,
                apiKey: process.env.WEBFLOW_OPENAI_API_KEY,
                baseUrl: 'https://api.openai.com/v1',
                model: 'gpt-4o-mini'
              }
            : {
                useLLM: true,
                apiKey: process.env.WEBFLOW_GROQ_API_KEY,
                baseUrl: 'https://api.groq.com/openai/v1',
                model: 'llama-3.3-70b-versatile'
              }
      );
      const elapsedMs = performance.now() - start;
      const deterministic = classifyUrlsDeterministic(urls, group.startUrl);
      const failures = results.flatMap((r, i) =>
        group.cases[i].expected.includes(r.classification)
          ? []
          : [
              {
                path: new URL(r.url).pathname,
                expected: group.cases[i].expected,
                actual: r.classification
              }
            ]
      );
      const row = {
        network,
        baseline: reference ? 'openai-reference' : 'groq-configured',
        rep,
        group: group.id,
        arm,
        elapsedMs,
        correct: results.length - failures.length,
        total: results.length,
        failures,
        receipts,
        results,
        preservedUrls: results.every((r, i) => r.url === urls[i]),
        preservedExact: results.every(
          (r, i) =>
            deterministic[i].confidence === 0.5 ||
            r.classification === deterministic[i].classification
        )
      };
      rows.push(row);
      console.log(
        JSON.stringify({
          rep,
          group: group.id,
          arm,
          elapsedMs,
          correct: row.correct,
          total: row.total,
          failures
        })
      );
    }
  }
}
fs.writeFileSync(
  new URL(reference ? './openai-reference-results.json' : './results.json', import.meta.url),
  JSON.stringify(
    {
      protocolHash: crypto
        .createHash('sha256')
        .update(fs.readFileSync(new URL('./protocol.json', import.meta.url)))
        .digest('hex'),
      rows
    },
    null,
    2
  ) + '\n'
);
