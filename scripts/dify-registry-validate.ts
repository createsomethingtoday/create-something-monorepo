#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type Registry = {
  version: number;
  api_base_url?: string;
  entries: Record<string, RegistryEntry>;
};

type RegistryEntry = {
  display_name: string;
  kind: 'agent' | 'hub';
  status?: string;
  infisical: {
    environment: string;
    path: string;
    secret_key: string;
  };
};

type ValidationResult = {
  id: string;
  displayName: string;
  kind: string;
  infisicalPath: string;
  secretKey: string;
  secretResolved: boolean;
  siteStatus: number | null;
  siteName: string | null;
  nameMatches: boolean;
  ok: boolean;
  error?: string;
};

const DEFAULT_REGISTRY_PATH = 'config/dify/agents/registry.json';
const DEFAULT_DIFY_API_BASE_URL = 'https://api.dify.ai/v1';

function parseArgs(argv: string[]) {
  let registryPath = DEFAULT_REGISTRY_PATH;
  let json = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--registry':
        if (!next) throw new Error('Missing value for --registry.');
        registryPath = next;
        i += 1;
        break;
      case '--json':
        json = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return { registryPath, json };
}

function printUsage() {
  console.log(`Usage:
  pnpm dify:registry:validate [-- --registry <path>] [-- --json]

Validates config/dify/agents/registry.json against Infisical and Dify /site.

The validator never prints secret values. It checks that each registry entry:
  - has a supported kind
  - has an Infisical environment, path, and secret key reference
  - resolves a secret value from Infisical
  - receives HTTP 200 from Dify /site
  - returns a Dify app name matching display_name
`);
}

function parseRegistry(path: string): Registry {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Registry;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Registry must be a JSON object.');
  }
  if (!parsed.entries || typeof parsed.entries !== 'object' || Array.isArray(parsed.entries)) {
    throw new Error('Registry must include an entries object.');
  }
  return parsed;
}

function readInfisicalSecret(entry: RegistryEntry): string | null {
  const args = [
    'secrets',
    'get',
    entry.infisical.secret_key,
    '--env',
    entry.infisical.environment,
    '--path',
    entry.infisical.path,
    '--silent',
    '--output=json'
  ];

  const raw = execFileSync('infisical', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const secretValue = (item as Record<string, unknown>).secretValue;
      if (typeof secretValue === 'string' && secretValue.trim()) return secretValue.trim();
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const secretValue = (parsed as Record<string, unknown>).secretValue;
    if (typeof secretValue === 'string' && secretValue.trim()) return secretValue.trim();
  }

  return null;
}

async function fetchDifySite(apiBaseUrl: string, token: string) {
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/site`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await response.text();
  let body: Record<string, unknown> | null = null;

  try {
    const parsed = text ? JSON.parse(text) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = null;
  }

  const siteName =
    typeof body?.title === 'string'
      ? body.title
      : typeof body?.name === 'string'
        ? body.name
        : null;

  return {
    status: response.status,
    siteName
  };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function validateEntryShape(id: string, entry: RegistryEntry): string | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry))
    return `${id} must be an object.`;
  if (!['agent', 'hub'].includes(entry.kind))
    return `${id} has unsupported kind ${String(entry.kind)}.`;
  if (!entry.display_name || typeof entry.display_name !== 'string')
    return `${id} is missing display_name.`;
  if (!entry.infisical || typeof entry.infisical !== 'object')
    return `${id} is missing infisical reference.`;
  if (!entry.infisical.environment) return `${id} is missing infisical.environment.`;
  if (!entry.infisical.path) return `${id} is missing infisical.path.`;
  if (!entry.infisical.secret_key) return `${id} is missing infisical.secret_key.`;
  return null;
}

async function validateEntry(
  id: string,
  entry: RegistryEntry,
  apiBaseUrl: string
): Promise<ValidationResult> {
  const shapeError = validateEntryShape(id, entry);
  if (shapeError) {
    return {
      id,
      displayName: entry?.display_name ?? '',
      kind: entry?.kind ?? '',
      infisicalPath: entry?.infisical?.path ?? '',
      secretKey: entry?.infisical?.secret_key ?? '',
      secretResolved: false,
      siteStatus: null,
      siteName: null,
      nameMatches: false,
      ok: false,
      error: shapeError
    };
  }

  try {
    const token = readInfisicalSecret(entry);
    if (!token) {
      return {
        id,
        displayName: entry.display_name,
        kind: entry.kind,
        infisicalPath: entry.infisical.path,
        secretKey: entry.infisical.secret_key,
        secretResolved: false,
        siteStatus: null,
        siteName: null,
        nameMatches: false,
        ok: false,
        error: 'Secret did not resolve to a non-empty value.'
      };
    }

    const site = await fetchDifySite(apiBaseUrl, token);
    const nameMatches =
      site.siteName !== null && normalizeName(site.siteName) === normalizeName(entry.display_name);

    return {
      id,
      displayName: entry.display_name,
      kind: entry.kind,
      infisicalPath: entry.infisical.path,
      secretKey: entry.infisical.secret_key,
      secretResolved: true,
      siteStatus: site.status,
      siteName: site.siteName,
      nameMatches,
      ok: site.status === 200 && nameMatches,
      error:
        site.status === 200 && nameMatches
          ? undefined
          : `Expected Dify /site 200 and name ${entry.display_name}, got status ${site.status} and name ${
              site.siteName ?? 'null'
            }.`
    };
  } catch (error) {
    return {
      id,
      displayName: entry.display_name,
      kind: entry.kind,
      infisicalPath: entry.infisical.path,
      secretKey: entry.infisical.secret_key,
      secretResolved: false,
      siteStatus: null,
      siteName: null,
      nameMatches: false,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = parseRegistry(args.registryPath);
  const apiBaseUrl = registry.api_base_url ?? DEFAULT_DIFY_API_BASE_URL;
  const results: ValidationResult[] = [];

  for (const [id, entry] of Object.entries(registry.entries).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    results.push(await validateEntry(id, entry, apiBaseUrl));
  }

  if (args.json) {
    console.log(JSON.stringify({ ok: results.every((result) => result.ok), results }, null, 2));
  } else {
    for (const result of results) {
      const status = result.ok ? 'ok' : 'fail';
      console.log(
        `${status} ${result.id} (${result.kind}) ${result.secretKey} ${result.siteStatus ?? 'no-status'} ${
          result.siteName ?? 'no-name'
        }`
      );
      if (result.error) console.error(`  ${result.error}`);
    }
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    throw new Error(
      `Dify registry validation failed for ${failures.length} entr${failures.length === 1 ? 'y' : 'ies'}.`
    );
  }
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
