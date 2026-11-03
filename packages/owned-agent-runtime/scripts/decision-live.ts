import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJevHttpDecisionSelector, createOpenAIHttpDecisionSelector, DecisionTransportError } from '../src/decision-transport.js';
import type { DecisionRequest } from '../src/decisions.js';

// Frozen before live qualification. Expected labels are never sent to providers.
const fixtures = [
  { id: 'framework', task: 'Classify a read-only MCP registry as Database, Automation or Judgment using the Three-Tier Framework.', expected: 'framework' },
  { id: 'host-setup', task: 'Find the public setup playbook and MCP folder structure for a supported coding host.', expected: 'playbook' },
  { id: 'company', task: 'Find public source evidence explaining what CREATE SOMETHING builds and its company thesis.', expected: 'company' },
  { id: 'out-of-scope', task: 'Find a current weather forecast for Paris. None of the listed sources contains weather evidence.', expected: null }
] as const;
const candidates = [
  { id: 'framework', description: 'Public Three-Tier Framework tools: classify components, debug systems, identify policy artifacts.' },
  { id: 'playbook', description: 'Public MCP host setup playbooks, host comparisons, folder structures and workflow guidance.' },
  { id: 'company', description: 'Public CREATE SOMETHING company source search, thesis, MCP connectivity and control layer.' }
];

export async function qualifyDecisionProvider(provider: 'openai' | 'jev') {
  const apiKey = process.env[provider === 'openai' ? 'OPENAI_API_KEY' : 'TYPESAFE_API_KEY'];
  if (!apiKey) throw new Error('Configured provider credential is unavailable');
  const selector = provider === 'openai' ? createOpenAIHttpDecisionSelector(apiKey) : createJevHttpDecisionSelector(apiKey);
  const rows: Array<{ id: string; requestedModel: string; servedModel: string | null; selectedId: string | null;
    expectedId: string | null; passed: boolean; elapsedMs: number; failure: string | null; httpStatus?: number }> = [];
  for (const fixture of fixtures) {
    const request: DecisionRequest = {
      id: fixture.id, scope: 'synthetic-live-qualification', policyVersion: 'evidence-focus-fixtures-v1',
      stateVersion: 'frozen-synthetic-v1', question: `Which offered public source can answer this task? ${fixture.task}`,
      candidates: [...candidates], fallbackId: 'company', mode: 'fresh'
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const start = performance.now();
    try {
      const result = await selector.select(request, controller.signal) as { choice: string | null };
      rows.push({ id: fixture.id, requestedModel: selector.model, servedModel: selector.model,
        selectedId: result.choice, expectedId: fixture.expected, passed: result.choice === fixture.expected,
        elapsedMs: Math.round(performance.now() - start), failure: null });
    } catch (error) {
      rows.push({ id: fixture.id, requestedModel: selector.model, servedModel: null, selectedId: null,
        expectedId: fixture.expected, passed: false, elapsedMs: Math.round(performance.now() - start),
        failure: controller.signal.aborted ? 'timeout' : error instanceof DecisionTransportError ? error.kind : 'invalid_provider_result',
        ...(error instanceof DecisionTransportError && error.status ? { httpStatus: error.status } : {}) });
    } finally { clearTimeout(timer); controller.abort(); }
  }
  return {
    schema: 'agent-decision-live-qualification/v1', recordedAt: new Date().toISOString(), provider,
    requestedModel: selector.model, adapterVersion: selector.version,
    fixtureHash: createHash('sha256').update(JSON.stringify({ fixtures, candidates })).digest('hex'),
    scope: 'synthetic_provider_contract_only', timeoutMs: 5000, retries: 0,
    liveProviderVerified: rows.every(row => row.failure === null),
    fixtureMatches: rows.filter(row => row.passed).length, fixtureCount: rows.length,
    downstreamImprovement: 'not_established', rows
  };
}

async function main(argv: string[]) {
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('Bounded live synthetic qualification: --provider openai|jev --output /private/report.json. Uses the provider credential already in the environment; never retries.');
    return;
  }
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!['--provider', '--output'].includes(key) || flags[key] || !argv[index + 1] || argv[index + 1].startsWith('--')) {
      throw new Error('Invalid qualification arguments');
    }
    flags[key] = argv[index + 1];
  }
  if (!['openai', 'jev'].includes(flags['--provider']) || !flags['--output']) throw new Error('Missing qualification arguments');
  const report = await qualifyDecisionProvider(flags['--provider'] as 'openai' | 'jev');
  await writeFile(resolve(flags['--output']), JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ provider: report.provider, output: resolve(flags['--output']),
    liveProviderVerified: report.liveProviderVerified, fixtureMatches: report.fixtureMatches, fixtureCount: report.fixtureCount }));
  if (!report.liveProviderVerified || report.fixtureMatches !== report.fixtureCount) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(() => {
    console.error('Live decision qualification failed; verify arguments, credential availability and private output destination.');
    process.exitCode = 1;
  });
}
