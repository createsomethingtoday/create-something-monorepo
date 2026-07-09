#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolve_service_config, validate_dispatch_config } from '../packages/symphony/src/config.js';
import { MemoryLogger } from '../packages/symphony/src/logger.js';
import { run_reviewed_pilot } from '../packages/symphony/src/reviewed-pilot.js';
import {
  create_codex_stage_executor,
  repository_fingerprint,
} from '../packages/symphony/src/reviewed-loop-runtime.js';
import { LinearTrackerClient } from '../packages/symphony/src/tracker/linear.js';
import { load_workflow_definition } from '../packages/symphony/src/workflow.js';
import { WorkspaceManager } from '../packages/symphony/src/workspace.js';

const WORKFLOW_PATH = 'automation/symphony/code-quality/WORKFLOW.md';
const MODEL_API_KEY_ENV_NAMES = new Set([
  'AI_GATEWAY_API_KEY', 'ANTHROPIC_API_KEY', 'AZURE_OPENAI_API_KEY', 'COHERE_API_KEY',
  'DEEPSEEK_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GROQ_API_KEY',
  'MISTRAL_API_KEY', 'MOONSHOT_API_KEY', 'OPENAI_API_KEY', 'PERPLEXITY_API_KEY',
  'TOGETHER_API_KEY', 'XAI_API_KEY',
]);

function isModelApiKey(name) {
  return MODEL_API_KEY_ENV_NAMES.has(name) || name.endsWith('_OPENAI_API_KEY');
}

export function buildAccountBasedLoopEnv(source = process.env) {
  const env = { ...source };
  const removedKeys = [];
  for (const key of Object.keys(env)) {
    if (!isModelApiKey(key)) continue;
    delete env[key];
    removedKeys.push(key);
  }
  return { env, removedKeys: removedKeys.sort() };
}

export function parseArgs(argv) {
  const args = argv.slice(2).filter((arg) => arg !== '--');
  const output = { issue: null, dispatch: false, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--issue' && args[index + 1]) output.issue = args[++index].toUpperCase();
    else if (arg === '--dispatch') output.dispatch = true;
    else if (arg === '--json') output.json = true;
    else if (arg === '--help' || arg === '-h') output.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return output;
}

function usage() {
  console.log(`Usage:
  pnpm agent:loop-pilot:reviewed:check -- --issue CRE-1154 [--json]
  pnpm agent:loop-pilot:reviewed -- --issue CRE-1154 [--json]

Runs exactly one contract-validated worker -> read-only reviewer -> integrator
pilot. The live command preserves its workspace and comments Linear with proof.`);
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function loadWorkUnits(cwd) {
  const root = resolve(cwd, 'automation/agent-contracts/examples');
  return {
    worker: await loadJson(resolve(root, 'reviewed-pilot.worker.work-unit.json')),
    reviewer: await loadJson(resolve(root, 'reviewed-pilot.reviewer.work-unit.json')),
    integrator: await loadJson(resolve(root, 'reviewed-pilot.integrator.work-unit.json')),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    return;
  }
  if (!args.issue) throw new Error('--issue is required.');

  const cwd = process.cwd();
  const logger = new MemoryLogger();
  const definition = await load_workflow_definition(WORKFLOW_PATH, cwd);
  const config = resolve_service_config(definition, cwd, process.env);
  validate_dispatch_config(config);
  const tracker = new LinearTrackerClient(config, logger);
  const workspace_manager = new WorkspaceManager(config, logger);
  const work_units = await loadWorkUnits(cwd);
  const accountEnv = buildAccountBasedLoopEnv(process.env);
  const receiptDestination = resolve(
    cwd,
    'output',
    'agent-loop-pilot',
    `${args.issue}.reviewed-run-receipt.json`,
  );

  const report = await run_reviewed_pilot({
    issue_identifier: args.issue,
    dispatch: args.dispatch,
    tracker,
    workspace_manager,
    work_units,
    removed_model_api_keys: accountEnv.removedKeys,
    receipt_destination: receiptDestination,
    fingerprint: repository_fingerprint,
    create_stage_executor: ({ issue, workspace_path }) => create_codex_stage_executor({
      issue,
      workspace_path,
      config,
      logger,
      env: accountEnv.env,
    }),
    async write_receipt(receipt) {
      await mkdir(dirname(receiptDestination), { recursive: true });
      await writeFile(receiptDestination, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
      return receiptDestination;
    },
  });

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`# Reviewed Agent Loop Pilot (${report.mode})`);
    console.log(`Issue: ${report.issue.identifier} ${report.issue.title}`);
    console.log(`Contracts: ${report.work_unit_ids.join(', ')}`);
    console.log(`Dispatched: ${report.dispatched ? 'yes' : 'no'}`);
    if (report.receipt_path) console.log(`Receipt: ${report.receipt_path}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
