import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Eval } from 'braintrust';

type JsonRecord = Record<string, unknown>;

type RetoolEvalInput = {
  name:
    | 'manifest_shape'
    | 'vendor_boundary'
    | 'api_health'
    | 'mcp_admin_readiness'
    | 'no_secret_material'
    | 'least_privilege_scopes'
    | 'linear_evidence_path';
};

type RetoolEvalOutput = {
  ok: boolean;
  details: Record<string, boolean>;
  notes: string[];
};

type Score = {
  name: string;
  score: number | null;
  metadata?: Record<string, unknown>;
};

const REPO_ROOT = resolve(process.cwd());
const CONTROL_PLANE_PATH = resolve(REPO_ROOT, 'config/retool/control-plane.json');
const INVENTORY_PATH = resolve(REPO_ROOT, 'config/retool/inventory.json');
const INVENTORY_SCHEMA_PATH = resolve(REPO_ROOT, 'config/retool/inventory.schema.json');
const SETUP_GUIDE_PATH = resolve(REPO_ROOT, 'docs/guides/RETOOL_CONTROL_PLANE_SETUP.md');
const VENDOR_BOUNDARY_PATH = resolve(REPO_ROOT, 'docs/guides/RETOOL_VENDOR_BOUNDARY.md');
const GENERATED_DOC_PATH = resolve(REPO_ROOT, 'docs/RETOOL_WORKSPACE_INVENTORY.generated.md');
const API_SMOKE_PATH = resolve(REPO_ROOT, 'scripts/retool-api-smoke.sh');
const MCP_CONNECT_PATH = resolve(REPO_ROOT, 'scripts/retool-codex-mcp-connect.sh');

const CASES: Array<{ input: RetoolEvalInput; metadata: Record<string, string> }> = [
  { input: { name: 'manifest_shape' }, metadata: { suite: 'retool', eval: 'manifest_shape' } },
  { input: { name: 'vendor_boundary' }, metadata: { suite: 'retool', eval: 'vendor_boundary' } },
  { input: { name: 'api_health' }, metadata: { suite: 'retool', eval: 'api_health' } },
  { input: { name: 'mcp_admin_readiness' }, metadata: { suite: 'retool', eval: 'mcp_admin_readiness' } },
  { input: { name: 'no_secret_material' }, metadata: { suite: 'retool', eval: 'no_secret_material' } },
  { input: { name: 'least_privilege_scopes' }, metadata: { suite: 'retool', eval: 'least_privilege_scopes' } },
  { input: { name: 'linear_evidence_path' }, metadata: { suite: 'retool', eval: 'linear_evidence_path' } }
];

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, 'utf8')) as JsonRecord;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return array(value).filter((item): item is string => typeof item === 'string');
}

function exactSet(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

function fileText(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function allRetoolConfig(): {
  controlPlane: JsonRecord;
  inventory: JsonRecord;
  setupGuide: string;
  vendorBoundary: string;
  generatedDoc: string;
  apiSmoke: string;
  mcpConnect: string;
} {
  return {
    controlPlane: readJson(CONTROL_PLANE_PATH),
    inventory: readJson(INVENTORY_PATH),
    setupGuide: fileText(SETUP_GUIDE_PATH),
    vendorBoundary: fileText(VENDOR_BOUNDARY_PATH),
    generatedDoc: fileText(GENERATED_DOC_PATH),
    apiSmoke: fileText(API_SMOKE_PATH),
    mcpConnect: fileText(MCP_CONNECT_PATH)
  };
}

function hasCredentialMaterial(body: string): boolean {
  return (
    /retool_[0-9a-z]{20,}/.test(body) ||
    /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/.test(body) ||
    /\bsk-[A-Za-z0-9_-]{12,}/i.test(body)
  );
}

async function runRetoolEvalCase(input: RetoolEvalInput): Promise<RetoolEvalOutput> {
  const { controlPlane, inventory, setupGuide, vendorBoundary, generatedDoc, apiSmoke, mcpConnect } =
    allRetoolConfig();
  const details: Record<string, boolean> = {};
  const notes: string[] = [];

  const instance = record(controlPlane.instance);
  const workspace = record(inventory.workspace);
  const apps = record(inventory.apps);
  const resources = record(inventory.resources);
  const mcpResources = record(inventory.mcp_resources);
  const lockInBoundary = record(controlPlane.lockInBoundary);
  const access = record(inventory.access);
  const evals = record(inventory.evals);

  if (input.name === 'manifest_shape') {
    details.schemaExists = existsSync(INVENTORY_SCHEMA_PATH);
    details.generatedDocExists = existsSync(GENERATED_DOC_PATH) && generatedDoc.includes('# Retool Workspace Inventory');
    details.workspaceMatchesControlPlane =
      workspace.origin === instance.baseUrl &&
      workspace.api_base_url === instance.apiBaseUrl &&
      workspace.mcp_url === instance.mcpUrl;
    details.controlPlaneVersioned = controlPlane.version === 1 && inventory.version === 1;
    details.appsDeclared = Boolean(record(apps['operator-console']).display_name) &&
      Boolean(record(apps['workflow-control-room']).display_name);
    details.resourcesDeclared = Boolean(resources['retool-rest-api']) && Boolean(resources['delivery-graph-manifest']);
    details.mcpResourcesDeclared =
      Boolean(mcpResources['create-something-mcp-hub']) && Boolean(mcpResources['retool-organization-mcp']);
  }

  if (input.name === 'vendor_boundary') {
    details.retoolRole =
      lockInBoundary.retoolRole === 'ui_control_plane' && lockInBoundary.sourceOfTruth === 'monorepo';
    details.portableArtifactsIncludeContract =
      stringArray(lockInBoundary.portableArtifacts).includes('contracts') &&
      stringArray(lockInBoundary.portableArtifacts).includes('linear_evidence');
    details.avoidsSystemOfRecord =
      stringArray(lockInBoundary.avoidAsSystemOfRecord).includes('production_business_data') &&
      stringArray(lockInBoundary.avoidAsSystemOfRecord).includes('secrets');
    details.guidesDeclareReplaceableUi =
      setupGuide.includes('UI/control plane') && vendorBoundary.includes('not the durable source of truth');
    details.retoolStorageDisabledForApps = Object.values(apps)
      .map((item) => record(item))
      .every((app) => app.writes_to_retool_storage === false);
  }

  if (input.name === 'api_health') {
    const restApi = record(resources['retool-rest-api']);
    const restAuth = record(restApi.auth);
    const infisical = record(restAuth.infisical);
    details.secretReferenceOnly =
      infisical.environment === 'prod' && infisical.path === '/retool' && infisical.secret_key === 'RETOOL_API_TOKEN';
    details.smokeScriptExists = existsSync(API_SMOKE_PATH);
    details.requiresSuccessfulProductionPath = apiSmoke.includes('RETOOL_API_SMOKE_ACCEPT_FORBIDDEN:-false');
    details.authOnlyForbiddenExplicit = apiSmoke.includes('RETOOL_API_SMOKE_ACCEPT_FORBIDDEN') &&
      setupGuide.includes('auth-only diagnostic');
    details.apiBaseMatchesWorkspace = restApi.base_url === workspace.api_base_url;
    details.successScopesCodified =
      stringArray(access.rest_api_smoke_success_scopes).includes('users:read') &&
      stringArray(access.rest_api_smoke_success_scopes).includes('mcp:admin');
    details.spacesBoundaryCodified =
      typeof access.spaces_token_policy === 'string' && access.spaces_token_policy.includes('Space');
  }

  if (input.name === 'mcp_admin_readiness') {
    const codexMcp = record(controlPlane.codexMcp);
    const adminCodexMcp = record(controlPlane.adminCodexMcp);
    details.dailyCodexReadOnly = exactSet(stringArray(codexMcp.scopes), ['mcp:read']);
    details.adminCodexHasAdmin = exactSet(stringArray(adminCodexMcp.scopes), ['mcp:read', 'mcp:admin']);
    details.packageGuideDocumentsAdminPath =
      setupGuide.includes('pnpm retool:mcp:codex:admin') && setupGuide.includes('mcp:read,mcp:admin');
    details.mcpConnectDefaultsReadOnly = mcpConnect.includes('RETOOL_MCP_SCOPES:-mcp:read');
    details.retoolMcpResourceConfigured = record(mcpResources['retool-organization-mcp']).status === 'configured';
  }

  if (input.name === 'no_secret_material') {
    const scannedBodies = [JSON.stringify(controlPlane), JSON.stringify(inventory), setupGuide, vendorBoundary, generatedDoc];
    details.noRetoolToken = scannedBodies.every((body) => !/retool_[0-9a-z]{20,}/.test(body));
    details.noBearerValue = scannedBodies.every((body) => !/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/.test(body));
    details.noOpenAiKey = scannedBodies.every((body) => !/\bsk-[A-Za-z0-9_-]{12,}/i.test(body));
    details.docsUseSecretRefs = setupGuide.includes('Infisical') && generatedDoc.includes('/retool:RETOOL_API_TOKEN');
    details.scriptDoesNotPrintToken = apiSmoke.includes('without printing the token') || setupGuide.includes('never prints the token');
  }

  if (input.name === 'least_privilege_scopes') {
    details.dailyAccessReadOnly = exactSet(stringArray(access.daily_mcp_scopes), ['mcp:read']);
    details.adminAccessSeparated = exactSet(stringArray(access.admin_mcp_scopes), ['mcp:read', 'mcp:admin']);
    details.noDailyAdmin = !stringArray(access.daily_mcp_scopes).includes('mcp:admin');
    details.adminUseCasesDeclared = stringArray(access.admin_use_cases).length >= 3;
    details.defaultScriptReadOnly = mcpConnect.includes('RETOOL_MCP_SCOPES:-mcp:read');
  }

  if (input.name === 'linear_evidence_path') {
    const retoolBodies = [JSON.stringify(controlPlane), JSON.stringify(inventory), setupGuide, vendorBoundary, generatedDoc];
    details.accessUsesLinear = access.evidence_system === 'linear';
    details.appsReferenceLinearIssues = Object.values(apps)
      .map((item) => record(item))
      .every((app) => stringArray(app.evidence).every((evidenceId) => /^CRE-\d+$/.test(evidenceId)));
    details.noLoomReferences = retoolBodies.every((body) => !/\bloom\b/i.test(body));
    details.requiredCheckDeclared = stringArray(evals.required_checks).includes('linear_evidence_path');
    details.generatedDocMentionsLinear = generatedDoc.includes('Linear');
  }

  if (input.name === 'no_secret_material') {
    details.noScannedCredentialMaterial = !hasCredentialMaterial(
      [JSON.stringify(controlPlane), JSON.stringify(inventory), setupGuide, vendorBoundary, generatedDoc].join('\n')
    );
  }

  for (const [name, passed] of Object.entries(details)) {
    if (!passed) notes.push(`${input.name}: ${name} failed`);
  }

  return {
    ok: Object.values(details).every(Boolean),
    details,
    notes
  };
}

function caseScore(caseName: RetoolEvalInput['name'], scoreName: string) {
  return ({ input, output }: { input: RetoolEvalInput; output: RetoolEvalOutput }): Score => ({
    name: scoreName,
    score: input.name === caseName ? (output.ok ? 1 : 0) : null,
    metadata: input.name === caseName ? { details: output.details, notes: output.notes } : undefined
  });
}

void Eval<RetoolEvalInput, RetoolEvalOutput>('create-something-retool-control-plane', {
  experimentName: 'retool_control_plane_contract',
  maxConcurrency: 1,
  data: CASES,
  task: async (input) => runRetoolEvalCase(input),
  scores: [
    caseScore('manifest_shape', 'manifest_shape'),
    caseScore('vendor_boundary', 'vendor_boundary'),
    caseScore('api_health', 'api_health'),
    caseScore('mcp_admin_readiness', 'mcp_admin_readiness'),
    caseScore('no_secret_material', 'no_secret_material'),
    caseScore('least_privilege_scopes', 'least_privilege_scopes'),
    caseScore('linear_evidence_path', 'linear_evidence_path')
  ]
});
