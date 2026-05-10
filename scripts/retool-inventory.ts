#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type SecretRef = {
  environment: string;
  path: string;
  secret_key: string;
};

type RetoolAuth = {
  type: 'none' | 'bearer' | 'managed_bearer' | 'oauth' | 'custom';
  infisical?: SecretRef;
  notes?: string;
};

type RetoolMcpResource = {
  display_name: string;
  server_url: string;
  auth: RetoolAuth;
  direction: 'retool_to_hub' | 'codex_to_retool';
  exposure: 'operator' | 'client_summary' | 'internal';
  status: 'planned' | 'configured' | 'verified' | 'retired';
  source: string;
  notes?: string;
};

type RetoolResource = {
  display_name: string;
  kind: 'rest_api' | 'mcp_server' | 'generated_manifest' | 'database' | 'workflow';
  status: 'planned' | 'configured' | 'verified' | 'retired';
  source: string;
  base_url?: string;
  auth?: RetoolAuth;
  notes?: string;
};

type RetoolApp = {
  display_name: string;
  status: 'planned' | 'manifest_ready' | 'production' | 'retired';
  visibility: 'private_internal' | 'operator' | 'client_summary' | 'client_audit' | 'public_redacted';
  source: 'manifest_generated' | 'retool_native' | 'manual';
  modules: string[];
  data_sources: string[];
  writes_to_retool_storage: boolean;
  production_ready: boolean;
  evidence: string[];
  notes?: string;
};

type RetoolWorkflow = {
  display_name: string;
  status: 'planned' | 'configured' | 'verified' | 'retired';
  trigger: string;
  write_policy: 'none' | 'requires_approval' | 'disabled';
  evidence: string[];
  notes?: string;
};

type RetoolInventory = {
  version: number;
  workspace: {
    slug: string;
    name: string;
    provider: 'retool_cloud' | 'self_hosted';
    origin: string;
    api_base_url: string;
    mcp_url: string;
  };
  status: 'partial' | 'complete';
  snapshot: {
    last_manual_inventory_at: string;
    source: string;
    notes: string;
  };
  access: {
    daily_mcp_scopes: string[];
    admin_mcp_scopes: string[];
    admin_use_cases: string[];
    rest_api_secret: SecretRef;
    rest_api_smoke_path: string;
    rest_api_smoke_success_scopes: string[];
    rest_api_smoke_ui_scope: string;
    rest_api_smoke_scope_status: 'candidate_visible' | 'verified' | 'blocked_pending_scope';
    rest_api_smoke_notes: string;
    spaces_token_policy: string;
    evidence_system: 'linear';
  };
  mcp_resources: Record<string, RetoolMcpResource>;
  resources: Record<string, RetoolResource>;
  apps: Record<string, RetoolApp>;
  workflows: Record<string, RetoolWorkflow>;
  evals: {
    owner_system: 'braintrust';
    project: string;
    local_command: string;
    published_command?: string;
    required_checks: RetoolEvalCheck[];
    last_verified_at?: string;
    notes?: string;
  };
};

type RetoolEvalCheck =
  | 'manifest_shape'
  | 'vendor_boundary'
  | 'api_health'
  | 'mcp_admin_readiness'
  | 'no_secret_material'
  | 'least_privilege_scopes'
  | 'linear_evidence_path';

type RetoolControlPlane = {
  version: number;
  instance: {
    slug: string;
    baseUrl: string;
    apiBaseUrl: string;
    mcpUrl: string;
  };
  codexMcp: {
    url: string;
    scopes: string[];
  };
  adminCodexMcp?: {
    url: string;
    scopes: string[];
  };
  createSomethingMcpResource?: {
    serverUrl: string;
  };
  lockInBoundary?: {
    retoolRole?: string;
    sourceOfTruth?: string;
    portableArtifacts?: string[];
    nonPortableRetoolState?: string[];
    avoidAsSystemOfRecord?: string[];
  };
};

const ROOT = process.cwd();
const INVENTORY_PATH = resolve(ROOT, 'config/retool/inventory.json');
const SCHEMA_PATH = resolve(ROOT, 'config/retool/inventory.schema.json');
const CONTROL_PLANE_PATH = resolve(ROOT, 'config/retool/control-plane.json');
const GENERATED_DOC_PATH = resolve(ROOT, 'docs/RETOOL_WORKSPACE_INVENTORY.generated.md');
const RETOOL_DOC_PATHS = [
  CONTROL_PLANE_PATH,
  INVENTORY_PATH,
  resolve(ROOT, 'docs/guides/RETOOL_CONTROL_PLANE_SETUP.md'),
  resolve(ROOT, 'docs/guides/RETOOL_VENDOR_BOUNDARY.md'),
  GENERATED_DOC_PATH
];
const REQUIRED_EVAL_CHECKS: RetoolEvalCheck[] = [
  'manifest_shape',
  'vendor_boundary',
  'api_health',
  'mcp_admin_readiness',
  'no_secret_material',
  'least_privilege_scopes',
  'linear_evidence_path'
];
const SECRET_PATTERNS = [
  /retool_[0-9a-z]{20,}/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/,
  /\bsk-[A-Za-z0-9_-]{12,}/i
];

const command = (process.argv[2] ?? 'check').trim().toLowerCase();

if (!['check', 'generate', 'validate'].includes(command)) {
  console.error('Usage: tsx scripts/retool-inventory.ts [check|generate|validate]');
  process.exit(2);
}

for (const path of [INVENTORY_PATH, SCHEMA_PATH, CONTROL_PLANE_PATH]) {
  if (!existsSync(path)) {
    console.error(`Required file missing: ${relativeToRoot(path)}`);
    process.exit(1);
  }
}

const inventory = readJson<RetoolInventory>(INVENTORY_PATH);
const controlPlane = readJson<RetoolControlPlane>(CONTROL_PLANE_PATH);
const errors = validateInventory(inventory, controlPlane);

if (errors.length > 0) {
  console.error('Retool inventory validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const generatedDoc = renderInventoryDoc(inventory);

if (command === 'validate') {
  console.log('Retool inventory validation passed.');
  process.exit(0);
}

if (command === 'generate') {
  writeFileSync(GENERATED_DOC_PATH, generatedDoc, 'utf8');
  console.log(`Wrote ${relativeToRoot(GENERATED_DOC_PATH)}`);
  process.exit(0);
}

if (!isFileContentEqual(GENERATED_DOC_PATH, generatedDoc)) {
  console.error('Retool inventory artifacts are out of date:');
  console.error(`- ${relativeToRoot(GENERATED_DOC_PATH)}`);
  console.error('Run: pnpm retool:inventory:generate');
  process.exit(1);
}

console.log('Retool inventory check passed.');

function validateInventory(inventory: RetoolInventory, controlPlane: RetoolControlPlane): string[] {
  const errors: string[] = [];

  if (inventory.version !== 1) {
    errors.push(`version must be 1 (received ${String(inventory.version)})`);
  }
  if (!isPlainObject(inventory.workspace)) {
    errors.push('workspace must be an object');
  }
  if (inventory.status !== 'partial' && inventory.status !== 'complete') {
    errors.push('status must be "partial" or "complete"');
  }
  if (!isPlainObject(inventory.access)) {
    errors.push('access must be an object');
  }
  if (!isPlainObject(inventory.mcp_resources) || Object.keys(inventory.mcp_resources).length === 0) {
    errors.push('mcp_resources must be a non-empty object');
  }
  if (!isPlainObject(inventory.resources) || Object.keys(inventory.resources).length === 0) {
    errors.push('resources must be a non-empty object');
  }
  if (!isPlainObject(inventory.apps) || Object.keys(inventory.apps).length === 0) {
    errors.push('apps must be a non-empty object');
  }

  validateWorkspace(inventory, controlPlane, errors);
  validateAccess(inventory, controlPlane, errors);
  validateMcpResources(inventory, controlPlane, errors);
  validateResources(inventory, errors);
  validateApps(inventory, errors);
  validateWorkflows(inventory, errors);
  validateEvals(inventory, errors);
  validateNoCredentialMaterial(errors);
  validateNoLoomRefs(errors);

  return errors;
}

function validateWorkspace(
  inventory: RetoolInventory,
  controlPlane: RetoolControlPlane,
  errors: string[]
): void {
  if (inventory.workspace.slug !== controlPlane.instance?.slug) {
    errors.push('workspace.slug must match config/retool/control-plane.json instance.slug');
  }
  if (inventory.workspace.origin !== controlPlane.instance?.baseUrl) {
    errors.push('workspace.origin must match Retool control-plane baseUrl');
  }
  if (inventory.workspace.api_base_url !== controlPlane.instance?.apiBaseUrl) {
    errors.push('workspace.api_base_url must match Retool control-plane apiBaseUrl');
  }
  if (inventory.workspace.mcp_url !== controlPlane.instance?.mcpUrl) {
    errors.push('workspace.mcp_url must match Retool control-plane mcpUrl');
  }
}

function validateAccess(
  inventory: RetoolInventory,
  controlPlane: RetoolControlPlane,
  errors: string[]
): void {
  const dailyScopes = inventory.access?.daily_mcp_scopes ?? [];
  const adminScopes = inventory.access?.admin_mcp_scopes ?? [];

  if (!exactSet(dailyScopes, ['mcp:read'])) {
    errors.push('access.daily_mcp_scopes must be exactly ["mcp:read"]');
  }
  if (!exactSet(controlPlane.codexMcp?.scopes ?? [], ['mcp:read'])) {
    errors.push('control-plane codexMcp.scopes must be exactly ["mcp:read"]');
  }
  if (!adminScopes.includes('mcp:read') || !adminScopes.includes('mcp:admin')) {
    errors.push('access.admin_mcp_scopes must include mcp:read and mcp:admin');
  }
  if (!exactSet(controlPlane.adminCodexMcp?.scopes ?? [], ['mcp:read', 'mcp:admin'])) {
    errors.push('control-plane adminCodexMcp.scopes must be exactly ["mcp:read", "mcp:admin"]');
  }
  if (controlPlane.codexMcp?.url !== inventory.workspace.mcp_url) {
    errors.push('control-plane codexMcp.url must match inventory.workspace.mcp_url');
  }
  if (controlPlane.adminCodexMcp?.url !== inventory.workspace.mcp_url) {
    errors.push('control-plane adminCodexMcp.url must match inventory.workspace.mcp_url');
  }
  if (inventory.access?.evidence_system !== 'linear') {
    errors.push('access.evidence_system must be linear');
  }
  if (!inventory.access?.rest_api_smoke_path?.startsWith('/')) {
    errors.push('access.rest_api_smoke_path must start with /');
  }
  const smokeScopes = inventory.access?.rest_api_smoke_success_scopes ?? [];
  if (!smokeScopes.includes('users:read') || !smokeScopes.includes('mcp:admin')) {
    errors.push('access.rest_api_smoke_success_scopes must include users:read and mcp:admin');
  }
  if (!inventory.access?.rest_api_smoke_ui_scope?.startsWith('Retool RPC')) {
    errors.push('access.rest_api_smoke_ui_scope must document the current Retool UI scope label');
  }
  const smokeScopeStatus = inventory.access?.rest_api_smoke_scope_status;
  if (!['candidate_visible', 'verified', 'blocked_pending_scope'].includes(smokeScopeStatus)) {
    errors.push('access.rest_api_smoke_scope_status must be candidate_visible, verified, or blocked_pending_scope');
  }
  if (smokeScopeStatus !== 'verified' && !inventory.access?.rest_api_smoke_notes?.includes('403')) {
    errors.push('access.rest_api_smoke_notes must record the live 403 scope blocker until verified');
  }
  if (!inventory.access?.spaces_token_policy?.includes('Space')) {
    errors.push('access.spaces_token_policy must document Retool Space token boundaries');
  }
  validateSecretRef('access.rest_api_secret', inventory.access?.rest_api_secret, errors);
}

function validateMcpResources(
  inventory: RetoolInventory,
  controlPlane: RetoolControlPlane,
  errors: string[]
): void {
  for (const [resourceId, resource] of Object.entries(inventory.mcp_resources ?? {})) {
    if (!resource.display_name) errors.push(`mcp resource ${resourceId}: display_name is required`);
    if (!resource.server_url?.startsWith('https://')) {
      errors.push(`mcp resource ${resourceId}: server_url must be https`);
    }
    if (!resource.server_url?.endsWith('/mcp')) {
      errors.push(`mcp resource ${resourceId}: server_url must end with /mcp`);
    }
    if (!resource.auth?.type) errors.push(`mcp resource ${resourceId}: auth.type is required`);
    if (resource.auth?.infisical) validateSecretRef(`mcp resource ${resourceId}`, resource.auth.infisical, errors);
    if (!['planned', 'configured', 'verified', 'retired'].includes(resource.status)) {
      errors.push(`mcp resource ${resourceId}: invalid status`);
    }
  }

  const hub = inventory.mcp_resources?.['create-something-mcp-hub'];
  if (!hub) {
    errors.push('mcp_resources.create-something-mcp-hub is required');
  } else if (hub.server_url !== controlPlane.createSomethingMcpResource?.serverUrl) {
    errors.push('create-something-mcp-hub server_url must match control-plane resource serverUrl');
  }

  const retoolOrgMcp = inventory.mcp_resources?.['retool-organization-mcp'];
  if (!retoolOrgMcp) {
    errors.push('mcp_resources.retool-organization-mcp is required');
  } else if (retoolOrgMcp.server_url !== inventory.workspace.mcp_url) {
    errors.push('retool-organization-mcp server_url must match workspace.mcp_url');
  }
}

function validateResources(inventory: RetoolInventory, errors: string[]): void {
  for (const [resourceId, resource] of Object.entries(inventory.resources ?? {})) {
    if (!resource.display_name) errors.push(`resource ${resourceId}: display_name is required`);
    if (!resource.kind) errors.push(`resource ${resourceId}: kind is required`);
    if (!resource.source) errors.push(`resource ${resourceId}: source is required`);
    if (!['planned', 'configured', 'verified', 'retired'].includes(resource.status)) {
      errors.push(`resource ${resourceId}: invalid status`);
    }
    if (resource.auth?.infisical) validateSecretRef(`resource ${resourceId}`, resource.auth.infisical, errors);
  }

  const restApi = inventory.resources?.['retool-rest-api'];
  if (!restApi) {
    errors.push('resources.retool-rest-api is required');
  } else if (restApi.base_url !== inventory.workspace.api_base_url) {
    errors.push('resources.retool-rest-api base_url must match workspace.api_base_url');
  }
}

function validateApps(inventory: RetoolInventory, errors: string[]): void {
  const knownDataSources = new Set([
    ...Object.keys(inventory.resources ?? {}),
    ...Object.keys(inventory.mcp_resources ?? {}),
    'linear'
  ]);

  for (const [appId, app] of Object.entries(inventory.apps ?? {})) {
    if (!app.display_name) errors.push(`app ${appId}: display_name is required`);
    if (!Array.isArray(app.modules) || app.modules.length === 0) {
      errors.push(`app ${appId}: modules must be a non-empty array`);
    }
    if (!Array.isArray(app.data_sources) || app.data_sources.length === 0) {
      errors.push(`app ${appId}: data_sources must be a non-empty array`);
    }
    for (const dataSource of app.data_sources ?? []) {
      if (!knownDataSources.has(dataSource)) {
        errors.push(`app ${appId}: unknown data_source ${dataSource}`);
      }
    }
    if (app.status === 'production' && app.production_ready !== true) {
      errors.push(`app ${appId}: production status requires production_ready true`);
    }
    if (app.writes_to_retool_storage) {
      errors.push(`app ${appId}: writes_to_retool_storage must remain false for production control-plane surfaces`);
    }
    for (const evidenceId of app.evidence ?? []) {
      if (!/^CRE-\d+$/.test(evidenceId)) {
        errors.push(`app ${appId}: evidence must reference Linear issue IDs`);
      }
    }
  }

  for (const requiredApp of ['operator-console', 'workflow-control-room']) {
    if (!inventory.apps?.[requiredApp]) {
      errors.push(`apps.${requiredApp} is required`);
    }
  }
}

function validateWorkflows(inventory: RetoolInventory, errors: string[]): void {
  for (const [workflowId, workflow] of Object.entries(inventory.workflows ?? {})) {
    if (!workflow.display_name) errors.push(`workflow ${workflowId}: display_name is required`);
    if (workflow.write_policy !== 'none' && workflow.evidence.length === 0) {
      errors.push(`workflow ${workflowId}: write-capable workflows require Linear evidence`);
    }
    for (const evidenceId of workflow.evidence ?? []) {
      if (!/^CRE-\d+$/.test(evidenceId)) {
        errors.push(`workflow ${workflowId}: evidence must reference Linear issue IDs`);
      }
    }
  }
}

function validateEvals(inventory: RetoolInventory, errors: string[]): void {
  if (inventory.evals?.owner_system !== 'braintrust') {
    errors.push('evals.owner_system must be braintrust');
  }
  if (!inventory.evals?.local_command) {
    errors.push('evals.local_command is required');
  }
  const checks = inventory.evals?.required_checks ?? [];
  for (const requiredCheck of REQUIRED_EVAL_CHECKS) {
    if (!checks.includes(requiredCheck)) {
      errors.push(`evals.required_checks must include ${requiredCheck}`);
    }
  }
}

function validateSecretRef(label: string, secretRef: SecretRef | undefined, errors: string[]): void {
  if (!isPlainObject(secretRef)) {
    errors.push(`${label}: secret ref is required`);
    return;
  }
  if (!secretRef.environment) errors.push(`${label}: environment is required`);
  if (!secretRef.path?.startsWith('/')) errors.push(`${label}: path must start with /`);
  if (!secretRef.secret_key) errors.push(`${label}: secret_key is required`);
}

function validateNoCredentialMaterial(errors: string[]): void {
  for (const path of RETOOL_DOC_PATHS) {
    if (!existsSync(path)) continue;
    const body = readFileSync(path, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(body)) {
        errors.push(`Possible secret material in ${relativeToRoot(path)}`);
      }
    }
  }
}

function validateNoLoomRefs(errors: string[]): void {
  for (const path of RETOOL_DOC_PATHS) {
    if (!existsSync(path)) continue;
    const body = readFileSync(path, 'utf8');
    if (/\bloom\b/i.test(body)) {
      errors.push(`Retool artifact must use Linear evidence, not Loom: ${relativeToRoot(path)}`);
    }
  }
}

function renderInventoryDoc(inventory: RetoolInventory): string {
  const lines: string[] = [];
  lines.push('# Retool Workspace Inventory');
  lines.push('');
  lines.push('Generated from `config/retool/inventory.json`. Do not edit this file directly.');
  lines.push('');
  lines.push('## Workspace');
  lines.push('');
  lines.push(`- Name: ${inventory.workspace.name}`);
  lines.push(`- Origin: ${inventory.workspace.origin}`);
  lines.push(`- API base URL: ${inventory.workspace.api_base_url}`);
  lines.push(`- MCP URL: ${inventory.workspace.mcp_url}`);
  lines.push(`- Status: ${inventory.status}`);
  lines.push(`- Snapshot: ${inventory.snapshot.last_manual_inventory_at} from ${inventory.snapshot.source}`);
  lines.push('');
  lines.push('## Access');
  lines.push('');
  lines.push('| Profile | Scopes | Use |');
  lines.push('| --- | --- | --- |');
  lines.push(`| Daily MCP | ${inventory.access.daily_mcp_scopes.join(', ')} | Read-only operator inspection |`);
  lines.push(`| Admin MCP | ${inventory.access.admin_mcp_scopes.join(', ')} | ${inventory.access.admin_use_cases.join(', ')} |`);
  lines.push(
    `| REST API | ${inventory.access.rest_api_secret.path}:${inventory.access.rest_api_secret.secret_key} | Production API smoke and limited platform automation |`
  );
  lines.push('');
  lines.push(`Production REST smoke path: \`${inventory.access.rest_api_smoke_path}\``);
  lines.push(`Production REST smoke success scopes: ${inventory.access.rest_api_smoke_success_scopes.join(', ')}`);
  lines.push(`Current Retool UI scope for smoke: ${inventory.access.rest_api_smoke_ui_scope}`);
  lines.push(`REST smoke scope status: ${inventory.access.rest_api_smoke_scope_status}`);
  lines.push(`REST smoke notes: ${inventory.access.rest_api_smoke_notes}`);
  lines.push(`Spaces token policy: ${inventory.access.spaces_token_policy}`);
  lines.push('');
  lines.push('## MCP Resources');
  lines.push('');
  lines.push('| ID | Direction | Status | URL | Auth |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [resourceId, resource] of Object.entries(inventory.mcp_resources)) {
    lines.push(
      `| ${resourceId} | ${resource.direction} | ${resource.status} | ${resource.server_url} | ${resource.auth.type} |`
    );
  }
  lines.push('');
  lines.push('## Retool Resources');
  lines.push('');
  lines.push('| ID | Kind | Status | Source |');
  lines.push('| --- | --- | --- | --- |');
  for (const [resourceId, resource] of Object.entries(inventory.resources)) {
    lines.push(`| ${resourceId} | ${resource.kind} | ${resource.status} | ${resource.source} |`);
  }
  lines.push('');
  lines.push('## Apps');
  lines.push('');
  lines.push('| ID | Visibility | Status | Production ready | Data sources | Evidence |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [appId, app] of Object.entries(inventory.apps)) {
    lines.push(
      `| ${appId} | ${app.visibility} | ${app.status} | ${String(app.production_ready)} | ${app.data_sources.join(', ')} | ${app.evidence.join(', ')} |`
    );
  }
  lines.push('');
  lines.push('## Workflows');
  lines.push('');
  const workflowEntries = Object.entries(inventory.workflows);
  if (workflowEntries.length === 0) {
    lines.push('No Retool-native workflows are promoted as production source-of-truth workflows.');
  } else {
    lines.push('| ID | Trigger | Status | Write policy | Evidence |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const [workflowId, workflow] of workflowEntries) {
      lines.push(
        `| ${workflowId} | ${workflow.trigger} | ${workflow.status} | ${workflow.write_policy} | ${workflow.evidence.join(', ')} |`
      );
    }
  }
  lines.push('');
  lines.push('## Eval Gates');
  lines.push('');
  lines.push(`- Owner system: ${inventory.evals.owner_system}`);
  lines.push(`- Local command: \`${inventory.evals.local_command}\``);
  lines.push(`- Required checks: ${inventory.evals.required_checks.join(', ')}`);
  lines.push(`- Last verified at: ${inventory.evals.last_verified_at ?? 'not recorded'}`);
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push(
    'Retool is the replaceable UI/control-plane layer. Durable contracts, source code, policy, delivery graph manifests, telemetry, and evidence remain in repo-owned systems and Linear.'
  );
  lines.push('');

  return `${lines.join('\n').trimEnd()}\n`;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function isFileContentEqual(path: string, expected: string): boolean {
  return existsSync(path) && readFileSync(path, 'utf8') === expected;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactSet(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

function relativeToRoot(path: string): string {
  return path.startsWith(ROOT) ? path.slice(ROOT.length + 1) : path;
}
