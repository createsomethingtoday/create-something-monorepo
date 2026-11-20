import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDecisionService, decisionOutcomeSchema, decisionRequestSchema, type DecisionSelector } from '../src/decisions.js';
import { replayDecisionScenarios, decisionScenarioSchema } from '../src/decision-replay.js';
import { FileDecisionRepository } from '../src/decision-files.js';
import { createJevDecisionSelector, createOpenAIDecisionSelector } from '../src/decision-providers.js';

const HELP = `Offline decision evidence CLI (no provider or source calls):
  resolve --request request.json --current current.json --response response.json --provider jev|openai --store /private/store
  observe --outcome outcome.json --store /private/store
  get --scope scope --id decision-id --store /private/store
  replay --suite suite.json --baseline baseline-responses.json --candidate candidate-responses.json --provider jev|openai

resolve validates one previously captured, decoded provider response. Reusing a decision ID requires get/readback, not another resolve.
Minimize supplied evidence: the local receipt retains the question and candidate descriptions.`;

async function json(filename: string): Promise<unknown> {
  const text = await readFile(filename, 'utf8');
  if (Buffer.byteLength(text) > 100_000) throw new Error('Input file exceeds 100 KB');
  return JSON.parse(text) as unknown;
}

export async function runDecisionCli(argv: string[]): Promise<unknown> {
  if (argv.length === 0 || argv[0] === '--help') return HELP;
  const [command, ...args] = argv;
  const allowed: Record<string, string[]> = {
    resolve: ['request', 'current', 'response', 'provider', 'store'],
    observe: ['outcome', 'store'], get: ['scope', 'id', 'store'],
    replay: ['suite', 'baseline', 'candidate', 'provider']
  };
  if (!Object.hasOwn(allowed, command)) throw new Error('Unknown command; use --help');
  const flags: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].slice(2);
    if (!args[index].startsWith('--') || !allowed[command].includes(key) || flags[key] ||
        !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Invalid or repeated flag; use --help');
    flags[key] = args[index + 1];
  }
  if (allowed[command].some(key => !flags[key])) throw new Error('Missing required flag; use --help');
  if (command === 'replay') {
    if (!['jev', 'openai'].includes(flags.provider)) throw new Error('Provider must be jev or openai');
    const rawSuite = await json(flags.suite);
    if (!Array.isArray(rawSuite)) throw new Error('Replay suite must be an array');
    const scenarios = rawSuite.map(value => decisionScenarioSchema.parse(value));
    if (new Set(scenarios.map(scenario => scenario.request.id)).size !== scenarios.length) {
      throw new Error('Offline response-map replay requires unique request IDs across scopes');
    }
    const recorded = async (filename: string, arm: string): Promise<DecisionSelector> => {
      const responses = await json(filename);
      if (!responses || typeof responses !== 'object' || Array.isArray(responses)) throw new Error('Response map must be an object');
      const response = (id: string) => {
        if (!Object.hasOwn(responses, id)) throw new Error('Missing recorded response for replay case');
        return (responses as Record<string, unknown>)[id];
      };
      const adapter = flags.provider === 'jev' ? createJevDecisionSelector(async () => null) :
        createOpenAIDecisionSelector({ decisions: { create: async () => null } });
      return { ...adapter, version: `${adapter.version}-offline-${arm}`,
        async select(request, signal) {
          const raw = response(request.id);
          const selector = flags.provider === 'jev' ? createJevDecisionSelector(async () => raw) :
            createOpenAIDecisionSelector({ decisions: { create: async () => raw } });
          return selector.select(request, signal);
        }
      };
    };
    const report = await replayDecisionScenarios(scenarios, {
      baseline: await recorded(flags.baseline, 'baseline'), candidate: await recorded(flags.candidate, 'candidate')
    });
    return { ...report, mode: 'offline_recorded_response', liveProviderVerified: false };
  }
  const repository = new FileDecisionRepository(flags.store);
  if (command === 'get') return {
    decision: await repository.getDecision(flags.scope, flags.id) ?? null,
    outcome: await repository.getOutcome(flags.scope, flags.id) ?? null
  };
  if (command === 'observe') {
    const outcome = decisionOutcomeSchema.parse(await json(flags.outcome));
    await createDecisionService({ repository }).observe(outcome);
    return { outcome: await repository.getOutcome(outcome.scope, outcome.decisionId) };
  }
  if (!['jev', 'openai'].includes(flags.provider)) throw new Error('Provider must be jev or openai');
  const request = decisionRequestSchema.parse(await json(flags.request));
  const response = await json(flags.response);
  const selector = flags.provider === 'jev' ? createJevDecisionSelector(async () => response) :
    createOpenAIDecisionSelector({ decisions: { create: async () => response } });
  const receipt = await createDecisionService({ repository, selector }).decide(request,
    async () => decisionRequestSchema.parse(await json(flags.current)));
  return { decision: receipt, mode: 'offline_recorded_response', liveProviderVerified: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runDecisionCli(process.argv.slice(2));
    console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
  } catch {
    // Provider payloads and malformed input can contain secrets. Keep CLI errors bounded.
    console.error('Decision evidence operation failed. Check flags, bindings, input schemas and private store; use get to reconcile an uncertain write.');
    process.exitCode = 1;
  }
}
