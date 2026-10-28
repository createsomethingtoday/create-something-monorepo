#!/usr/bin/env node
// Run from a checkout. Uses Node built-ins; no models, network or private corpus.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { searchContext } from '../../../../database-layer/scripts/atlas-context.mjs';
const directory = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(directory, '../../../../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const freeze = JSON.parse(fs.readFileSync(path.join(directory, 'freeze.json')));
for (const [name, expected] of Object.entries(freeze.sha256)) {
  if (sha(fs.readFileSync(path.join(directory, name))) !== expected) throw new Error(`Frozen input changed: ${name}`);
}
const queries = JSON.parse(fs.readFileSync(path.join(directory, 'queries.json')));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-atlas-study-'));
const now = Date.parse('2026-10-15T12:00:00Z');
const budgets = [2000, 4000, 12000];
const observed = [];
let checkedCitations = 0, citationFailures = 0, budgetFailures = 0, authorityFailures = 0;
try {
  const wiki = path.join(root, 'packages/database-layer/docs/agent-wiki');
  fs.mkdirSync(wiki, { recursive: true });
  fs.cpSync(path.join(directory, 'corpus'), wiki, { recursive: true });
  for (const question of queries) {
    let full;
    for (const maxBytes of budgets) {
      const result = searchContext(question.query, { root, refresh: 'off', now, maxBytes });
      if (Buffer.byteLength(JSON.stringify(result)) > maxBytes) budgetFailures++;
      if (result.freshness.liveVerified !== false || result.freshness.stale !== true || result.authority !== 'orientation_only') authorityFailures++;
      for (const hit of result.results) {
        checkedCitations++;
        const lines = fs.readFileSync(path.join(root, hit.path), 'utf8').split('\n');
        if (hit.excerpt !== hit.sourceLines.map(n => lines[n - 1]).join('\n') || hit.citation !== `${hit.path}:${hit.sourceLines[0]}`) citationFailures++;
      }
      if (maxBytes === 12000) full = result;
    }
    const top = full.results[0];
    observed.push({ ...question, actualModule: top?.sourceId.replace('atlas-context:', '') ?? null,
      actualHeading: top?.heading ?? null,
      moduleCorrect: top?.sourceId === `atlas-context:${question.expectedModule}`,
      passageCorrect: top?.sourceId === `atlas-context:${question.expectedModule}` && top?.heading === question.expectedHeading,
      expectedInTopFive: full.results.some(hit => hit.sourceId === `atlas-context:${question.expectedModule}` && hit.heading === question.expectedHeading),
      responseBytes: Buffer.byteLength(JSON.stringify(full)) });
  }
  // These existing suites use disposable synthetic roots for the selected cases.
  const groups = [
    ['changed inputs, concurrent reads, renderer failure, timeout and unavailable cache', 'packages/database-layer/test/atlas-context-refresh.test.mjs', 'automatic refresh|one refresh|failure retains|refresh off|unavailable cache'],
    ['changed documents, corrupt parsed cache, unknown dates and hard limits', 'packages/database-layer/test/atlas-context.test.mjs', 'explicit cache detects|unknown freshness']
  ];
  const controls = groups.map(([label, file, pattern]) => {
    const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern', pattern, file], { cwd: repo, encoding: 'utf8', timeout: 30000 });
    return { label, file, pattern, passed: run.status === 0, exitCode: run.status,
      testsPassed: Number(run.stdout?.match(/# pass (\d+)/)?.[1] ?? 0),
      testsFailed: Number(run.stdout?.match(/# fail (\d+)/)?.[1] ?? 0),
      ...(run.status !== 0 ? { diagnostic: (run.stderr || run.error?.message || 'Inspect the named suite with Node test runner.').slice(0,1000) } : {}) };
  });
  const implementationFiles = ['atlas-context.mjs', 'atlas-context-refresh.mjs', 'agent-wiki-passages.mjs'];
  const result = {
    schema: 'selective-context-study/v1', measuredAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    fixtureClock: new Date(now).toISOString(), sourceDate: '2026-10-01',
    method: 'Same-author synthetic holdout, frozen before scoring; no post-score tuning. Module and heading scores are separate. This is not an independent relevance benchmark.',
    implementationSha256: Object.fromEntries(implementationFiles.map(name => [name, sha(fs.readFileSync(path.join(repo, 'packages/database-layer/scripts', name)))])),
    frozenInputs: freeze.sha256,
    summary: { queries: queries.length, modules: 7, authoredSections: 21,
      topModuleCorrect: observed.filter(q => q.moduleCorrect).length,
      topPassageCorrect: observed.filter(q => q.passageCorrect).length,
      expectedPassageInTopFive: observed.filter(q => q.expectedInTopFive).length,
      budgetChecks: queries.length * budgets.length, budgets, budgetFailures,
      checkedCitations, citationFailures, freshnessAndAuthorityFailures: authorityFailures,
      responseBytesMin: Math.min(...observed.map(q => q.responseBytes)), responseBytesMax: Math.max(...observed.map(q => q.responseBytes)) },
    controls, queries: observed
  };
  result.gates = { topModuleAtLeast90Percent: result.summary.topModuleCorrect / queries.length >= .9,
    citationsExact: citationFailures === 0, byteCapsRespected: budgetFailures === 0,
    freshnessAndAuthorityHonest: authorityFailures === 0, syntheticControlsPass: controls.every(c => c.passed) };
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex !== -1) {
    if (!process.argv[outputIndex + 1]) throw new Error('--output requires a filename');
    fs.writeFileSync(path.resolve(process.argv[outputIndex + 1]), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
  if (Object.values(result.gates).some(passed => !passed)) process.exitCode = 1;
} finally { fs.rmSync(root, { recursive: true, force: true }); }
