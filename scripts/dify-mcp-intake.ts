#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type CatalogExposureMode = 'direct' | 'brokered' | 'exception_direct';
type ServerLifecycle = 'active' | 'dormant' | 'local';
type DifyAuthType = 'none' | 'bearer' | 'oauth' | 'custom';

type RegistryServer = {
  transport: 'http' | 'stdio';
  url?: string;
  description?: string;
  tags?: string[];
  lifecycle?: ServerLifecycle;
  catalog_exposure_mode?: CatalogExposureMode;
  estimated_tool_count?: number;
  bearer_token_env_var?: string;
  env_http_headers?: Record<string, string>;
  http_headers?: Record<string, string>;
  headers?: Record<string, string>;
  catalog?: {
    include?: boolean;
    name?: string;
    slug?: string;
    category?: string;
    requiresAuth?: boolean;
    authType?: DifyAuthType;
    transports?: string[];
  };
};

type Registry = {
  version: number;
  servers: Record<string, RegistryServer>;
};

type DifyInventory = {
  mcp_servers: Record<
    string,
    {
      source_mcp_registry_server?: string;
      url: string;
    }
  >;
};

type SecretRef = {
  environment: string;
  path: string;
  secret_key: string;
};

type IntakeOptions = {
  registryServerId: string;
  difyServerId: string;
  displayName: string;
  authType: DifyAuthType;
  infisicalEnvironment: string;
  infisicalPath: string;
  secretKey: string;
  owner: string;
  force: boolean;
  write: boolean;
};

type IntakeManifest = {
  version: 1;
  status: 'pending-dify-studio-registration';
  owner: string;
  created_at: string;
  registry_server: {
    id: string;
    transport: 'http';
    url: string;
    description?: string;
    tags: string[];
    catalog_exposure_mode: string;
    estimated_tool_count?: number;
  };
  dify_mcp_server: {
    server_id: string;
    display_name: string;
    transport: 'http';
    url: string;
    auth: {
      type: DifyAuthType;
      infisical?: SecretRef;
    };
  };
  dify_studio_steps: string[];
  inventory_fragment_after_tool_discovery: Record<string, unknown>;
  notes: string[];
};

type ExistingIntakeArtifact = {
  registryServerId: string;
  difyServerId: string | undefined;
  path: string;
  manifest: Partial<IntakeManifest>;
};

const ROOT = process.cwd();
const REGISTRY_PATH = resolve(ROOT, 'config/mcp-hub/registry.json');
const DIFY_INVENTORY_PATH = resolve(ROOT, 'config/dify/inventory.json');
const INTAKE_DIR = resolve(ROOT, 'config/dify-mcp-intake');

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

for (const path of [REGISTRY_PATH, DIFY_INVENTORY_PATH]) {
  if (!existsSync(path)) fail(`Required file missing: ${relativeToRoot(path)}`);
}

const registry = readJson<Registry>(REGISTRY_PATH);
const inventory = readJson<DifyInventory>(DIFY_INVENTORY_PATH);
const existingIntakeArtifacts = readExistingIntakeArtifacts(INTAKE_DIR);

if (args.check) {
  validateIntakeArtifacts(existingIntakeArtifacts, registry, inventory);
  process.exit(0);
}

if (args['all-missing']) {
  runBatchIntake(args, registry, inventory, existingIntakeArtifacts);
  process.exit(0);
}

const options = buildOptions(args, registry);
const server = registry.servers[options.registryServerId];

if (!server) {
  fail(
    `Unknown MCP registry server ${options.registryServerId}. Use docs/DIFY_MCP_COVERAGE.generated.md for candidates.`
  );
}

validateCandidate(options, server, inventory);

const manifest = buildManifest(options, server);
const outputPath = resolve(INTAKE_DIR, `${options.difyServerId}.json`);

if (options.write) {
  if (existsSync(outputPath)) {
    fail(`Refusing to overwrite existing intake artifact: ${relativeToRoot(outputPath)}`);
  }
  mkdirSync(INTAKE_DIR, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

printResult(options, manifest, outputPath);

function runBatchIntake(
  args: Record<string, string | boolean>,
  registry: Registry,
  inventory: DifyInventory,
  existingIntakeArtifacts: ExistingIntakeArtifact[]
): void {
  for (const unsupported of [
    'registry-server-id',
    'server-id',
    'dify-server-id',
    'display-name',
    'auth-type',
    'infisical-path'
  ]) {
    if (args[unsupported]) {
      fail(`--${unsupported} cannot be used with --all-missing.`);
    }
  }

  const existingRegistryIds = new Set(
    existingIntakeArtifacts.map((artifact) => artifact.registryServerId)
  );
  const candidates = Object.entries(registry.servers ?? {})
    .filter(([serverId, server]) => {
      return (
        isBatchCandidate(server) &&
        !existingRegistryIds.has(serverId) &&
        !hasDifyInventoryMapping(serverId, server, inventory)
      );
    })
    .sort(([a], [b]) => a.localeCompare(b));
  const manifests = candidates.map(([registryServerId, server]) => {
    const options = buildOptionsForServer(registryServerId, server, args);
    validateCandidate(options, server, inventory);
    return {
      options,
      manifest: buildManifest(options, server),
      outputPath: resolve(INTAKE_DIR, `${options.difyServerId}.json`)
    };
  });

  validateNoDuplicateDifyServerIds(manifests.map(({ options }) => options.difyServerId));

  const existingOutputPaths = manifests.filter(({ outputPath }) => existsSync(outputPath));
  if (existingOutputPaths.length > 0) {
    fail(
      `Refusing to overwrite existing intake artifact(s): ${existingOutputPaths
        .map(({ outputPath }) => relativeToRoot(outputPath))
        .join(', ')}`
    );
  }

  if (args.write && manifests.length > 0) {
    mkdirSync(INTAKE_DIR, { recursive: true });
    for (const { manifest, outputPath } of manifests) {
      writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    }
  }

  printBatchResult(Boolean(args.write), manifests, existingIntakeArtifacts.length);
}

function buildOptions(args: Record<string, string | boolean>, registry: Registry): IntakeOptions {
  const registryServerId =
    readStringArg(args, 'registry-server-id') ?? readStringArg(args, 'server-id');

  if (!registryServerId) {
    printUsage();
    fail('Missing required --registry-server-id');
  }

  const server = registry.servers[registryServerId];
  if (!server) {
    fail(`Unknown MCP registry server ${registryServerId}.`);
  }

  return buildOptionsForServer(registryServerId, server, args);
}

function buildOptionsForServer(
  registryServerId: string,
  server: RegistryServer,
  args: Record<string, string | boolean>
): IntakeOptions {
  const difyServerId =
    readStringArg(args, 'dify-server-id') ?? server.catalog?.slug ?? slugify(registryServerId);
  const displayName =
    readStringArg(args, 'display-name') ?? server.catalog?.name ?? titleize(difyServerId);
  const authType = readAuthType(args, server);

  assertSlug(difyServerId, 'dify-server-id');

  return {
    registryServerId,
    difyServerId,
    displayName,
    authType,
    infisicalEnvironment: readStringArg(args, 'infisical-env') ?? 'prod',
    infisicalPath: readStringArg(args, 'infisical-path') ?? `/${registryServerId}`,
    secretKey: readStringArg(args, 'secret-key') ?? defaultSecretKeyForAuthType(authType),
    owner: readStringArg(args, 'owner') ?? 'create-something',
    force: Boolean(args.force),
    write: Boolean(args.write)
  };
}

function isBatchCandidate(server: RegistryServer): boolean {
  if (server.transport !== 'http') return false;
  if (server.lifecycle === 'dormant' || server.lifecycle === 'local') return false;
  if (server.catalog_exposure_mode === 'brokered') return false;
  return Boolean(server.url);
}

function validateCandidate(
  options: IntakeOptions,
  server: RegistryServer,
  inventory: DifyInventory
): void {
  if (!options.force) {
    if (server.transport !== 'http') {
      fail(
        `MCP registry server ${options.registryServerId} is ${server.transport}; Dify intake expects HTTP.`
      );
    }
    if (server.lifecycle === 'dormant' || server.lifecycle === 'local') {
      fail(
        `MCP registry server ${options.registryServerId} lifecycle is ${server.lifecycle}; pass --force to scaffold anyway.`
      );
    }
    if (server.catalog_exposure_mode === 'brokered') {
      fail(
        `MCP registry server ${options.registryServerId} is brokered; pass --force only if Dify should connect directly.`
      );
    }
  }

  const existing = Object.entries(inventory.mcp_servers ?? {}).filter(([, difyServer]) => {
    return (
      difyServer.source_mcp_registry_server === options.registryServerId ||
      (Boolean(server.url) && difyServer.url === server.url)
    );
  });

  if (existing.length > 0 && !options.force) {
    fail(
      `MCP registry server ${options.registryServerId} is already mapped to Dify server(s): ${existing
        .map(([serverId]) => serverId)
        .join(', ')}.`
    );
  }
}

function hasDifyInventoryMapping(
  registryServerId: string,
  server: RegistryServer,
  inventory: DifyInventory
): boolean {
  return Object.values(inventory.mcp_servers ?? {}).some((difyServer) => {
    return (
      difyServer.source_mcp_registry_server === registryServerId ||
      (Boolean(server.url) && difyServer.url === server.url)
    );
  });
}

function buildManifest(options: IntakeOptions, server: RegistryServer): IntakeManifest {
  if (server.transport !== 'http' || !server.url) {
    fail(`MCP registry server ${options.registryServerId} must be an HTTP server with a URL.`);
  }

  const auth = buildDifyAuth(options);

  return {
    version: 1,
    status: 'pending-dify-studio-registration',
    owner: options.owner,
    created_at: new Date().toISOString().slice(0, 10),
    registry_server: {
      id: options.registryServerId,
      transport: 'http',
      url: server.url,
      description: server.description,
      tags: server.tags ?? [],
      catalog_exposure_mode: server.catalog_exposure_mode ?? 'unset',
      estimated_tool_count: server.estimated_tool_count
    },
    dify_mcp_server: {
      server_id: options.difyServerId,
      display_name: options.displayName,
      transport: 'http',
      url: server.url,
      auth
    },
    dify_studio_steps: [
      'Open Dify Studio -> Tools -> MCP.',
      `Create an HTTP MCP server card with server ID ${options.difyServerId}.`,
      `Set the MCP URL to ${server.url}.`,
      difyAuthInstruction(auth),
      'Refresh/discover tools in Dify Studio.',
      'Transcribe every discovered tool into config/dify/inventory.json with risk classification.',
      'Run pnpm dify:inventory:generate and pnpm dify:coverage:generate.'
    ],
    inventory_fragment_after_tool_discovery: {
      [options.difyServerId]: {
        display_name: options.displayName,
        source_mcp_registry_server: options.registryServerId,
        transport: 'http',
        url: server.url,
        auth,
        tools: []
      }
    },
    notes: [
      'This intake artifact is not a Dify inventory entry.',
      'Do not paste the inventory fragment until Dify Studio has discovered tools and each tool is classified.',
      'Keep secret values in Infisical only; this artifact stores references, not values.',
      'After the server card is codified, scaffold one or more Dify agents with pnpm dify:agent:scaffold.'
    ]
  };
}

function buildDifyAuth(options: IntakeOptions): IntakeManifest['dify_mcp_server']['auth'] {
  if (options.authType === 'none') return { type: 'none' };

  return {
    type: options.authType,
    infisical: {
      environment: options.infisicalEnvironment,
      path: options.infisicalPath,
      secret_key: options.secretKey
    }
  };
}

function defaultSecretKeyForAuthType(authType: DifyAuthType): string {
  switch (authType) {
    case 'none':
      return 'MCP_AUTH_NOT_REQUIRED';
    case 'bearer':
      return 'MCP_BEARER_TOKEN';
    case 'oauth':
      return 'MCP_OAUTH_CONFIG';
    case 'custom':
      return 'MCP_AUTH_CONFIG';
  }
}

function difyAuthInstruction(auth: IntakeManifest['dify_mcp_server']['auth']): string {
  if (auth.type === 'none') return 'Use no authentication for the server card.';

  const ref = auth.infisical
    ? `${auth.infisical.environment}:${auth.infisical.path}:${auth.infisical.secret_key}`
    : 'the declared secret manager reference';

  if (auth.type === 'oauth') {
    return `Configure OAuth using the credential/config reference in Infisical ${ref}; complete any provider authorization flow required by Dify Studio.`;
  }

  if (auth.type === 'custom') {
    return `Configure custom MCP auth from Infisical ${ref}.`;
  }

  return `Configure bearer auth from Infisical ${ref}.`;
}

function readAuthType(
  args: Record<string, string | boolean>,
  server: RegistryServer
): DifyAuthType {
  const explicit = readStringArg(args, 'auth-type');
  if (explicit) {
    if (['none', 'bearer', 'oauth', 'custom'].includes(explicit)) return explicit as DifyAuthType;
    fail('--auth-type must be one of: none, bearer, oauth, custom');
  }

  if (server.catalog?.authType) return server.catalog.authType;
  if (
    server.catalog?.requiresAuth ||
    server.bearer_token_env_var ||
    server.env_http_headers ||
    server.http_headers ||
    server.headers
  ) {
    return 'bearer';
  }

  return 'none';
}

function printResult(options: IntakeOptions, manifest: IntakeManifest, outputPath: string): void {
  console.log(`# Dify MCP intake: ${options.registryServerId}`);
  console.log('');
  console.log(
    options.write ? `Wrote: ${relativeToRoot(outputPath)}` : 'Dry run: no files written.'
  );
  console.log('');
  console.log('## Dify Studio settings');
  console.log('');
  console.log(`- Server ID: ${manifest.dify_mcp_server.server_id}`);
  console.log(`- Display name: ${manifest.dify_mcp_server.display_name}`);
  console.log(`- URL: ${manifest.dify_mcp_server.url}`);
  console.log(`- Auth: ${manifest.dify_mcp_server.auth.type}`);
  if (manifest.dify_mcp_server.auth.infisical) {
    const secret = manifest.dify_mcp_server.auth.infisical;
    console.log(`- Secret ref: ${secret.environment}:${secret.path}:${secret.secret_key}`);
  }
  console.log('');
  console.log('## Intake manifest');
  console.log('');
  console.log('```json');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('```');
}

function printBatchResult(
  wroteFiles: boolean,
  manifests: Array<{ options: IntakeOptions; outputPath: string }>,
  existingIntakeCount: number
): void {
  console.log('# Dify MCP intake: all missing candidates');
  console.log('');
  console.log(
    wroteFiles ? `Wrote ${manifests.length} intake artifact(s).` : 'Dry run: no files written.'
  );
  console.log(`Existing intake artifacts already present: ${existingIntakeCount}`);
  console.log('');
  console.log('| MCP Registry Server | Dify Server ID | Auth | Output |');
  console.log('| --- | --- | --- | --- |');

  for (const { options, outputPath } of manifests) {
    console.log(
      `| ${options.registryServerId} | ${options.difyServerId} | ${options.authType} | ${relativeToRoot(outputPath)} |`
    );
  }

  if (manifests.length === 0) {
    console.log('| - | - | - | - |');
  }
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (!arg.startsWith('--')) fail(`Unexpected positional argument: ${arg}`);

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');
    if (equalsIndex >= 0) {
      parsed[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[withoutPrefix] = true;
      continue;
    }

    parsed[withoutPrefix] = next;
    index += 1;
  }

  return parsed;
}

function readStringArg(args: Record<string, string | boolean>, name: string): string | undefined {
  const value = args[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function assertSlug(value: string, argName: string): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
    fail(`--${argName} must be a lowercase slug with letters, numbers, and hyphens.`);
  }
}

function titleize(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  return slug || 'dify-mcp-server';
}

function validateNoDuplicateDifyServerIds(serverIds: string[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const serverId of serverIds) {
    if (seen.has(serverId)) duplicates.add(serverId);
    seen.add(serverId);
  }

  if (duplicates.size > 0) {
    fail(`Batch intake would create duplicate Dify server IDs: ${[...duplicates].join(', ')}`);
  }
}

function validateIntakeArtifacts(
  artifacts: ExistingIntakeArtifact[],
  registry: Registry,
  inventory: DifyInventory
): void {
  const errors: string[] = [];

  if (artifacts.length === 0) {
    errors.push('config/dify-mcp-intake must contain at least one intake artifact');
  }

  const registryIds = new Map<string, string[]>();
  const difyServerIds = new Map<string, string[]>();

  for (const artifact of artifacts) {
    addIndexValue(registryIds, artifact.registryServerId, artifact.path);
    if (artifact.difyServerId) addIndexValue(difyServerIds, artifact.difyServerId, artifact.path);
    validateIntakeArtifact(artifact, registry, inventory, errors);
  }

  for (const [registryServerId, paths] of registryIds.entries()) {
    if (paths.length > 1) {
      errors.push(
        `registry server ${registryServerId}: duplicate intake artifacts: ${paths.join(', ')}`
      );
    }
  }

  for (const [difyServerId, paths] of difyServerIds.entries()) {
    if (paths.length > 1) {
      errors.push(`dify server ${difyServerId}: duplicate intake artifacts: ${paths.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    console.error('Dify MCP intake validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Dify MCP intake validation passed for ${artifacts.length} artifact(s).`);
}

function validateIntakeArtifact(
  artifact: ExistingIntakeArtifact,
  registry: Registry,
  inventory: DifyInventory,
  errors: string[]
): void {
  const manifest = artifact.manifest;
  const prefix = artifact.path;
  const registryServerId = manifest.registry_server?.id;
  const difyServerId = manifest.dify_mcp_server?.server_id;
  const registryServer = registryServerId ? registry.servers[registryServerId] : undefined;

  if (manifest.version !== 1) {
    errors.push(`${prefix}: version must be 1`);
  }
  if (manifest.status !== 'pending-dify-studio-registration') {
    errors.push(`${prefix}: status must be pending-dify-studio-registration`);
  }
  if (!manifest.owner) {
    errors.push(`${prefix}: owner is required`);
  }
  if (!manifest.created_at || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.created_at)) {
    errors.push(`${prefix}: created_at must use YYYY-MM-DD`);
  }
  if (!registryServerId) {
    errors.push(`${prefix}: registry_server.id is required`);
    return;
  }
  if (!registryServer) {
    errors.push(`${prefix}: registry_server.id ${registryServerId} is not in MCP registry`);
    return;
  }
  if (!isBatchCandidate(registryServer)) {
    errors.push(`${prefix}: registry server ${registryServerId} is not a Dify-direct candidate`);
  }
  if (manifest.registry_server?.transport !== 'http') {
    errors.push(`${prefix}: registry_server.transport must be http`);
  }
  if (manifest.registry_server?.url !== registryServer.url) {
    errors.push(`${prefix}: registry_server.url must match MCP registry URL`);
  }
  if (!difyServerId) {
    errors.push(`${prefix}: dify_mcp_server.server_id is required`);
  } else {
    validateSlugValue(`${prefix}: dify_mcp_server.server_id`, difyServerId, errors);
    if (artifact.path !== `config/dify-mcp-intake/${difyServerId}.json`) {
      errors.push(`${prefix}: file name must match dify_mcp_server.server_id`);
    }
  }
  if (!manifest.dify_mcp_server?.display_name) {
    errors.push(`${prefix}: dify_mcp_server.display_name is required`);
  }
  if (manifest.dify_mcp_server?.transport !== 'http') {
    errors.push(`${prefix}: dify_mcp_server.transport must be http`);
  }
  if (manifest.dify_mcp_server?.url !== registryServer.url) {
    errors.push(`${prefix}: dify_mcp_server.url must match MCP registry URL`);
  }

  validateIntakeAuth(prefix, manifest.dify_mcp_server?.auth, errors);
  validateInventoryFragment(prefix, manifest, registryServerId, difyServerId, errors);

  if (hasDifyInventoryMapping(registryServerId, registryServer, inventory)) {
    errors.push(
      `${prefix}: registry server ${registryServerId} is already represented in config/dify/inventory.json; remove this intake artifact after inventory promotion`
    );
  }

  validateNoSecretLikeValues(prefix, manifest, errors);
}

function validateIntakeAuth(
  prefix: string,
  auth: IntakeManifest['dify_mcp_server']['auth'] | undefined,
  errors: string[]
): void {
  if (!auth) {
    errors.push(`${prefix}: dify_mcp_server.auth is required`);
    return;
  }
  if (!['none', 'bearer', 'oauth', 'custom'].includes(auth.type)) {
    errors.push(`${prefix}: auth.type must be one of none, bearer, oauth, custom`);
    return;
  }
  if (auth.type === 'none') {
    if (auth.infisical) {
      errors.push(`${prefix}: auth.type none must not declare an Infisical secret reference`);
    }
    return;
  }
  if (!auth.infisical) {
    errors.push(`${prefix}: non-none auth requires an Infisical secret reference`);
    return;
  }
  validateSecretRef(`${prefix}: auth.infisical`, auth.infisical, errors);
}

function validateInventoryFragment(
  prefix: string,
  manifest: Partial<IntakeManifest>,
  registryServerId: string,
  difyServerId: string | undefined,
  errors: string[]
): void {
  const fragment = manifest.inventory_fragment_after_tool_discovery;
  if (!isPlainObject(fragment)) {
    errors.push(`${prefix}: inventory_fragment_after_tool_discovery must be an object`);
    return;
  }

  const fragmentKeys = Object.keys(fragment);
  if (!difyServerId) return;

  if (fragmentKeys.length !== 1 || fragmentKeys[0] !== difyServerId) {
    errors.push(
      `${prefix}: inventory fragment must contain exactly one key matching dify_mcp_server.server_id`
    );
    return;
  }

  const serverFragment = fragment[difyServerId];
  if (!isPlainObject(serverFragment)) {
    errors.push(`${prefix}: inventory fragment ${difyServerId} must be an object`);
    return;
  }

  if (serverFragment.source_mcp_registry_server !== registryServerId) {
    errors.push(
      `${prefix}: inventory fragment source_mcp_registry_server must match registry_server.id`
    );
  }
  if (serverFragment.url !== manifest.dify_mcp_server?.url) {
    errors.push(`${prefix}: inventory fragment url must match dify_mcp_server.url`);
  }
  if (!Array.isArray(serverFragment.tools) || serverFragment.tools.length !== 0) {
    errors.push(`${prefix}: inventory fragment tools must remain empty until Dify discovery`);
  }
}

function validateSecretRef(prefix: string, secret: SecretRef, errors: string[]): void {
  if (!secret.environment) errors.push(`${prefix}: environment is required`);
  if (!secret.path?.startsWith('/')) errors.push(`${prefix}: path must start with /`);
  if (!secret.secret_key) errors.push(`${prefix}: secret_key is required`);
}

function validateNoSecretLikeValues(
  prefix: string,
  value: unknown,
  errors: string[],
  path = '$'
): void {
  if (typeof value === 'string') {
    if (looksLikeSecretValue(value)) {
      errors.push(`${prefix}: ${path} looks like a secret value; store only secret references`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateNoSecretLikeValues(prefix, item, errors, `${path}[${index}]`)
    );
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      validateNoSecretLikeValues(prefix, nested, errors, `${path}.${key}`);
    }
  }
}

function looksLikeSecretValue(value: string): boolean {
  const trimmed = value.trim();

  return [
    /sk-[A-Za-z0-9_-]{20,}/,
    /xox[baprs]-[A-Za-z0-9-]{20,}/,
    /pat_[A-Za-z0-9_]{20,}/,
    /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/,
    /^[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/
  ].some((pattern) => pattern.test(trimmed));
}

function addIndexValue(index: Map<string, string[]>, key: string, value: string): void {
  const values = index.get(key) ?? [];
  values.push(value);
  values.sort();
  index.set(key, values);
}

function validateSlugValue(prefix: string, value: string, errors: string[]): void {
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
    errors.push(`${prefix} must be a lowercase slug with letters, numbers, and hyphens`);
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readExistingIntakeArtifacts(dir: string): ExistingIntakeArtifact[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const path = resolve(dir, entry.name);
      const artifact = readJson<Partial<IntakeManifest>>(path);
      const registryServerId = artifact.registry_server?.id;

      if (!registryServerId) {
        fail(`Dify MCP intake artifact ${relativeToRoot(path)} is missing registry_server.id.`);
      }

      return {
        registryServerId,
        difyServerId: artifact.dify_mcp_server?.server_id,
        path: relativeToRoot(path),
        manifest: artifact
      };
    });
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function relativeToRoot(path: string): string {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}

function printUsage(): void {
  console.log(`Usage:
  pnpm dify:mcp:intake -- --registry-server-id <mcp-registry-server-id> [options]

Options:
  --check                    Validate config/dify-mcp-intake/*.json artifacts.
  --all-missing              Generate intake artifacts for all missing Dify-direct candidates.
  --server-id <id>            Alias for --registry-server-id.
  --dify-server-id <id>       Dify MCP server card ID. Defaults to catalog slug or registry id.
  --display-name <name>       Dify display name. Defaults to catalog name or titleized server id.
  --auth-type <type>          none, bearer, oauth, custom. Defaults from registry auth metadata.
  --infisical-env <env>       Secret environment. Default: prod.
  --infisical-path <path>     Secret path. Default: /<registry-server-id>.
  --secret-key <key>          Secret key. Default depends on auth type.
  --owner <name>              Owner label. Default: create-something.
  --write                     Write config/dify-mcp-intake/<dify-server-id>.json.
  --force                     Allow brokered/dormant/already-mapped servers.

Examples:
  pnpm dify:mcp:intake -- --registry-server-id webflow-template-review-mcp
  pnpm dify:mcp:intake -- --registry-server-id webflow-template-review-mcp --write
  pnpm dify:mcp:intake -- --all-missing
  pnpm dify:mcp:intake -- --all-missing --write
  pnpm dify:mcp:intake -- --check
`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
