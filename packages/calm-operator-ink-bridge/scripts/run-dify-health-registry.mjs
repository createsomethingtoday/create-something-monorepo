#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runHealthCheckedCommand } from './run-health-checked-command.mjs';

const DEFAULT_ORIGIN = 'https://ink.createsomething.agency';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../../..');
const DEFAULT_CONFIG_DIR = 'config/dify-agents';

function usage() {
  return [
    'Usage:',
    '  pnpm dify:ink-health',
    '  pnpm dify:ink-health -- --agent youtube-transcript-notion-agent',
    '',
    'Options:',
    '  --agent <id>           Run one agent by config file id or registry id',
    '  --registry-id <id>     Run one agent by health registry id',
    '  --config-dir <path>    Defaults to config/dify-agents',
    '  --origin <url>         Defaults to https://ink.createsomething.agency',
    '  --url <url>            Full POST /ink/health-snapshot URL',
    '  --token <token>        Defaults to INK_SOURCE_TOKEN or CALM_OPERATOR_BRIDGE_TOKEN',
    '  --source <name>        Override health source for every agent',
    '  --dry-run             Execute commands but do not post to Ink',
    '  --list                Print discovered Dify health registry entries',
    '  --json                Print JSON result',
    '  --fail-fast           Stop after the first failed command or runner error',
    '  --help                Show this help',
    '',
    'Dify agent configs live in config/dify-agents/*.json. Each enabled entry needs',
    'a health.command array; secret scope is derived from dify_app.service_api.'
  ].join('\n');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function booleanValue(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function stringArray(value) {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => stringValue(item)).filter(Boolean);
  return items.length === value.length ? items : null;
}

function stringMap(value) {
  if (!isRecord(value)) return {};
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!key.trim()) continue;
    if (raw === undefined || raw === null) continue;
    result[key] = String(raw);
  }
  return result;
}

function humanizeAgentId(agentId) {
  return agentId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function deriveDifyEnv(config, health) {
  const app = isRecord(config.dify_app) ? config.dify_app : {};
  const serviceApi = isRecord(app.service_api) ? app.service_api : {};
  const secret = isRecord(serviceApi.api_key_secret) ? serviceApi.api_key_secret : {};
  const env = {};

  const baseUrl = stringValue(serviceApi.base_url);
  if (baseUrl) env.DIFY_AGENT_BASE_URL = baseUrl;

  const environment = stringValue(secret.environment);
  if (environment) env.DIFY_AGENT_INFISICAL_ENV = environment;

  const path = stringValue(secret.path);
  if (path) env.DIFY_AGENT_INFISICAL_PATH = path;

  const secretName = stringValue(secret.secret_key);
  if (secretName) {
    env.DIFY_AGENT_API_KEY_ENV = secretName;
    env.DIFY_AGENT_API_KEY_SECRET_NAME = secretName;
  }

  const projectId = stringValue(secret.project_id) ?? stringValue(secret.projectId);
  if (projectId) env.DIFY_AGENT_INFISICAL_PROJECT_ID = projectId;

  return { ...env, ...stringMap(health.env) };
}

function buildRegistryEntry(agentId, filePath, config) {
  const health = isRecord(config.health) ? config.health : {};
  const app = isRecord(config.dify_app) ? config.dify_app : {};
  const component =
    stringValue(health.component) ?? stringValue(app.name) ?? `Dify ${humanizeAgentId(agentId)}`;
  const registryId = stringValue(health.registry_id) ?? `dify.${agentId}`;
  const command = stringArray(health.command) ?? [];
  const enabled = booleanValue(health.enabled, true);
  const errors = [];

  if (enabled && command.length === 0) {
    errors.push('health.command must be a non-empty string array');
  }

  return {
    agent_id: agentId,
    file: filePath,
    enabled,
    valid: errors.length === 0,
    errors,
    component,
    registry_id: registryId,
    type: stringValue(health.type) ?? 'agent',
    source: stringValue(health.source) ?? 'dify-health-registry',
    artifact: stringValue(health.artifact) ?? `Dify app: ${agentId}`,
    action: stringValue(health.action) ?? `Review ${component} smoke output`,
    success_status: stringValue(health.success_status) ?? 'healthy',
    failure_status: stringValue(health.failure_status) ?? 'failed',
    success_reason: stringValue(health.success_reason) ?? `${component} completed successfully.`,
    failure_reason: stringValue(health.failure_reason) ?? `${component} failed.`,
    command,
    env: deriveDifyEnv(config, health)
  };
}

export function parseArgs(argv = process.argv, env = process.env) {
  const args = {
    origin: DEFAULT_ORIGIN,
    token: env.INK_SOURCE_TOKEN ?? env.CALM_OPERATOR_BRIDGE_TOKEN,
    configDir: DEFAULT_CONFIG_DIR,
    continueOnError: true
  };

  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') {
      continue;
    } else if (item === '--help' || item === '-h') {
      args.help = true;
    } else if (item === '--agent') {
      args.agent = argv[++index];
    } else if (item === '--registry-id') {
      args.registryId = argv[++index];
    } else if (item === '--config-dir') {
      args.configDir = argv[++index];
    } else if (item === '--origin') {
      args.origin = argv[++index];
    } else if (item === '--url') {
      args.url = argv[++index];
    } else if (item === '--token') {
      args.token = argv[++index];
    } else if (item === '--source') {
      args.source = argv[++index];
    } else if (item === '--dry-run') {
      args.dryRun = true;
    } else if (item === '--list') {
      args.list = true;
    } else if (item === '--json') {
      args.json = true;
    } else if (item === '--fail-fast') {
      args.continueOnError = false;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  return args;
}

export async function loadDifyHealthRegistry(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const configDir = resolve(repoRoot, options.configDir ?? DEFAULT_CONFIG_DIR);
  const names = await readdir(configDir);
  const jsonFiles = names.filter((name) => name.endsWith('.json')).sort();
  const entries = [];

  for (const name of jsonFiles) {
    const filePath = resolve(configDir, name);
    const raw = await readFile(filePath, 'utf8');
    const config = JSON.parse(raw);
    if (!isRecord(config)) {
      throw new Error(`${filePath} must contain a JSON object`);
    }
    entries.push(buildRegistryEntry(basename(name, '.json'), filePath, config));
  }

  return entries;
}

function selectEntries(entries, args) {
  return entries.filter((entry) => {
    if (!entry.enabled) return false;
    if (args.agent) {
      return entry.agent_id === args.agent || entry.registry_id === args.agent;
    }
    if (args.registryId) return entry.registry_id === args.registryId;
    return true;
  });
}

function publicEntry(entry) {
  return {
    agent_id: entry.agent_id,
    registry_id: entry.registry_id,
    component: entry.component,
    enabled: entry.enabled,
    valid: entry.valid,
    errors: entry.errors,
    type: entry.type,
    source: entry.source,
    artifact: entry.artifact
  };
}

export async function runDifyHealthRegistry(args, options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const entries = await loadDifyHealthRegistry({ repoRoot, configDir: args.configDir });
  const selected = selectEntries(entries, args);
  const results = [];
  let exitCode = 0;

  if (selected.length === 0) {
    throw new Error('No enabled Dify health registry entries matched the requested filter.');
  }

  for (const entry of selected) {
    if (!entry.valid) {
      exitCode = exitCode || 1;
      results.push({
        ok: false,
        agent_id: entry.agent_id,
        registry_id: entry.registry_id,
        component: entry.component,
        error: entry.errors.join('; ')
      });
      if (!args.continueOnError) break;
      continue;
    }

    try {
      const result = await runHealthCheckedCommand(
        {
          origin: args.origin,
          url: args.url,
          token: args.token,
          type: entry.type,
          source: args.source ?? entry.source,
          name: entry.component,
          registryId: entry.registry_id,
          artifact: entry.artifact,
          action: entry.action,
          successStatus: entry.success_status,
          failureStatus: entry.failure_status,
          successReason: entry.success_reason,
          failureReason: entry.failure_reason,
          dryRun: args.dryRun,
          command: entry.command
        },
        {
          cwd: repoRoot,
          env: { ...(options.env ?? process.env), ...entry.env },
          stdio: options.stdio ?? 'inherit',
          spawnSync: options.spawnSync,
          postHealthSnapshot: options.postHealthSnapshot
        }
      );

      const commandExitCode = result.command_exit_code ?? 1;
      if (commandExitCode !== 0) exitCode = exitCode || commandExitCode;
      results.push({
        ok: commandExitCode === 0,
        agent_id: entry.agent_id,
        registry_id: entry.registry_id,
        component: entry.component,
        command_exit_code: commandExitCode,
        status: result.snapshot?.status,
        dry_run: result.dry_run === true
      });
      if (commandExitCode !== 0 && !args.continueOnError) break;
    } catch (error) {
      exitCode = exitCode || 1;
      results.push({
        ok: false,
        agent_id: entry.agent_id,
        registry_id: entry.registry_id,
        component: entry.component,
        error: error instanceof Error ? error.message : String(error)
      });
      if (!args.continueOnError) break;
    }
  }

  return {
    ok: exitCode === 0,
    dry_run: args.dryRun === true,
    checked: results.length,
    failed_count: results.filter((result) => !result.ok).length,
    exit_code: exitCode,
    results
  };
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }

  if (args.list) {
    const entries = await loadDifyHealthRegistry({ configDir: args.configDir });
    const selected = selectEntries(entries, args);
    if (args.json) {
      console.log(JSON.stringify({ entries: selected.map(publicEntry) }, null, 2));
    } else {
      for (const entry of selected) {
        const state = entry.enabled ? (entry.valid ? 'ready' : 'invalid') : 'disabled';
        console.log(`${entry.registry_id}\t${state}\t${entry.component}`);
      }
    }
    return selected.some((entry) => !entry.valid) ? 1 : 0;
  }

  const result = await runDifyHealthRegistry(args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  }
  return result.exit_code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
