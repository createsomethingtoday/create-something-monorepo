#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL_PLANE_PATH = join(ROOT, 'config/retool/control-plane.json');
const RETOOL_INVENTORY_PATH = join(ROOT, 'config/retool/inventory.json');
const WORKSPACE_LANES_PATH = join(ROOT, 'config/workspace-lanes.json');
const MCP_REGISTRY_PATH = join(ROOT, 'config/mcp-hub/registry.json');
const MCP_FLEET_PATH = join(ROOT, 'config/mcp-hub/fleet.json');
const GENERATED_RETOOL_INVENTORY_DOC_PATH = join(ROOT, 'docs/RETOOL_WORKSPACE_INVENTORY.generated.md');

const SECRET_PATTERNS = [
  /retool_[0-9a-z]{20,}/,
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/,
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(argv) {
  const args = { command: argv[2] ?? 'help', out: null, pretty: true };
  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === '--compact') {
      args.pretty = false;
    } else if (arg === '--help' || arg === '-h') {
      args.command = 'help';
    }
  }
  return args;
}

function packageSummary(packagePath) {
  const absolutePath = join(ROOT, packagePath);
  const packageJsonPath = join(absolutePath, 'package.json');
  const readmePath = join(absolutePath, 'README.md');
  const understandingPath = join(absolutePath, 'UNDERSTANDING.md');
  const exists = existsSync(absolutePath);
  const packageJson = existsSync(packageJsonPath) ? readJson(packageJsonPath) : null;

  return {
    path: packagePath,
    exists,
    packageName: packageJson?.name ?? null,
    private: packageJson?.private ?? null,
    scripts: packageJson?.scripts ? Object.keys(packageJson.scripts).sort() : [],
    agentLegibility: {
      readme: existsSync(readmePath),
      understanding: existsSync(understandingPath),
      optedIn: Boolean(packageJson?.createSomething?.agentLegibilityContract),
    },
  };
}

function expandLanePath(pattern) {
  if (!pattern.includes('*')) {
    return [pattern];
  }

  const [prefix, suffix = ''] = pattern.split('*');
  const absolutePrefix = join(ROOT, prefix);
  if (!existsSync(absolutePrefix)) {
    return [];
  }

  return readdirSync(absolutePrefix)
    .map((entry) => join(absolutePrefix, entry))
    .filter((entryPath) => {
      try {
        return statSync(entryPath).isDirectory();
      } catch {
        return false;
      }
    })
    .map((entryPath) => relative(ROOT, `${entryPath}${suffix}`))
    .filter((entryPath) => existsSync(join(ROOT, entryPath)))
    .sort();
}

function buildWorkstreams(workspaceLanes) {
  return Object.entries(workspaceLanes.lanes).map(([id, patterns]) => {
    const paths = patterns.flatMap(expandLanePath);
    const packages = paths.map(packageSummary);
    return {
      id,
      label: id.replace(/-/g, ' '),
      packageCount: packages.length,
      missingPackageCount: packages.filter((pkg) => !pkg.exists).length,
      packages,
    };
  });
}

function buildMcpRegistry(registry, fleet) {
  const servers = Object.entries(registry.servers ?? {}).map(([id, server]) => ({
    id,
    transport: server.transport ?? null,
    url: server.url ?? null,
    description: server.description ?? null,
    tags: server.tags ?? [],
    requiresAuth: Boolean(server.catalog?.requiresAuth ?? server.bearer_token_env_var),
    bearerTokenEnvVar: server.bearer_token_env_var ?? null,
    catalogExposureMode: server.catalog_exposure_mode ?? null,
    estimatedToolCount: server.estimated_tool_count ?? null,
  }));

  const deployments = Object.entries(fleet.deployments ?? {}).map(([id, deployment]) => ({
    id,
    type: deployment.type ?? null,
    product: deployment.product ?? null,
    client: deployment.client ?? null,
    tenant: deployment.tenant ?? null,
    url: deployment.url ?? null,
    status: deployment.status ?? null,
    account: deployment.account ?? null,
    authType: deployment.auth?.type ?? null,
    secretName: deployment.auth?.bearer_token_env_var ?? null,
    infisicalPath: deployment.auth?.infisical_path ?? null,
    relatedDeployments: deployment.related_deployments ?? [],
    toolkits: deployment.toolkits ?? [],
  }));

  return {
    registryServerCount: servers.length,
    fleetDeploymentCount: deployments.length,
    servers,
    deployments,
  };
}

function buildRetoolInventorySummary(inventory) {
  return {
    status: inventory.status ?? null,
    workspace: inventory.workspace ?? null,
    appCount: Object.keys(inventory.apps ?? {}).length,
    mcpResourceCount: Object.keys(inventory.mcp_resources ?? {}).length,
    resourceCount: Object.keys(inventory.resources ?? {}).length,
    workflowCount: Object.keys(inventory.workflows ?? {}).length,
    evidenceSystem: inventory.access?.evidence_system ?? null,
    evals: {
      ownerSystem: inventory.evals?.owner_system ?? null,
      localCommand: inventory.evals?.local_command ?? null,
      requiredChecks: inventory.evals?.required_checks ?? [],
    },
  };
}

function buildDeliveryGraph() {
  const controlPlane = readJson(CONTROL_PLANE_PATH);
  const retoolInventory = readJson(RETOOL_INVENTORY_PATH);
  const workspaceLanes = readJson(WORKSPACE_LANES_PATH);
  const mcpRegistry = readJson(MCP_REGISTRY_PATH);
  const mcpFleet = readJson(MCP_FLEET_PATH);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      repo: 'create-something-monorepo',
      root: ROOT,
      controlPlanePath: relative(ROOT, CONTROL_PLANE_PATH),
      retoolInventoryPath: relative(ROOT, RETOOL_INVENTORY_PATH),
      workspaceLanesPath: relative(ROOT, WORKSPACE_LANES_PATH),
      mcpRegistryPath: relative(ROOT, MCP_REGISTRY_PATH),
      mcpFleetPath: relative(ROOT, MCP_FLEET_PATH),
    },
    visibilityLevels: ['private_internal', 'operator', 'client_summary', 'client_audit', 'public_redacted'],
    controlPlane,
    surfaces: [
      {
        id: 'operator-console',
        label: 'Operator Console',
        audience: 'internal',
        visibility: 'private_internal',
        purpose: 'Cross-workstream view for decisions, blockers, approvals, deploy evidence, agents, MCP health, and delivery state.',
        modules: ['today', 'workstreams', 'decisions', 'risks', 'approvals', 'mcp_registry', 'agent_registry', 'deploy_evidence'],
      },
      {
        id: 'workflow-control-room',
        label: 'Workflow Control Room',
        audience: 'client',
        visibility: 'client_summary',
        purpose: 'Client-visible project surface for status, decisions needed, risks, artifacts, demos, approvals, and handoff.',
        modules: ['status', 'decisions_needed', 'risks', 'artifacts', 'demos', 'approvals', 'handoff'],
      },
    ],
    retoolInventory: buildRetoolInventorySummary(retoolInventory),
    workstreams: buildWorkstreams(workspaceLanes),
    mcp: buildMcpRegistry(mcpRegistry, mcpFleet),
    policies: {
      executionPath: 'Retool UI -> scoped identity token -> remote brokered MCP hub -> downstream MCP/tool -> telemetry + Linear evidence',
      localHubUse: 'developer_only',
      remoteHubUse: 'operator_and_client_surfaces',
      sourceOfTruth: 'monorepo',
      evidenceSystem: 'linear',
    },
  };
}

function scanForSecrets(paths) {
  const findings = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const body = readFileSync(path, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      const match = body.match(pattern);
      if (match) {
        findings.push({
          path: relative(ROOT, path),
          pattern: pattern.source,
        });
      }
    }
  }
  return findings;
}

function checkGraph(graph) {
  const errors = [];
  const warnings = [];

  if (graph.controlPlane.instance?.baseUrl !== 'https://createsomething.retool.com') {
    errors.push('Retool baseUrl must be https://createsomething.retool.com.');
  }

  if (graph.controlPlane.codexMcp?.url !== 'https://createsomething.retool.com/mcp') {
    errors.push('Codex Retool MCP URL must be https://createsomething.retool.com/mcp.');
  }

  if (graph.controlPlane.codexMcp?.scopes?.join(',') !== 'mcp:read') {
    errors.push('Codex Retool MCP daily profile must request only mcp:read.');
  }

  if (graph.controlPlane.adminCodexMcp?.scopes?.join(',') !== 'mcp:read,mcp:admin') {
    errors.push('Codex Retool MCP admin profile must request mcp:read,mcp:admin.');
  }

  if (!graph.controlPlane.createSomethingMcpResource?.serverUrl?.endsWith('/mcp')) {
    errors.push('CREATE SOMETHING MCP resource must point at an /mcp endpoint.');
  }

  if (graph.controlPlane.lockInBoundary?.sourceOfTruth !== 'monorepo') {
    errors.push('Retool lock-in boundary must keep the monorepo as source of truth.');
  }

  if (graph.controlPlane.lockInBoundary?.retoolRole !== 'ui_control_plane') {
    errors.push('Retool must be configured as the UI/control-plane layer, not the durable data layer.');
  }

  const portableArtifacts = graph.controlPlane.lockInBoundary?.portableArtifacts ?? [];
  if (!portableArtifacts.includes('linear_evidence')) {
    errors.push('Retool portable artifacts must include Linear evidence.');
  }
  if (portableArtifacts.includes('loom_evidence')) {
    errors.push('Retool portable artifacts must not include Loom evidence.');
  }

  if (graph.retoolInventory?.evidenceSystem !== 'linear') {
    errors.push('Retool inventory must use Linear as the evidence system.');
  }

  for (const workstream of graph.workstreams) {
    if (workstream.missingPackageCount > 0) {
      warnings.push(`${workstream.id} has ${workstream.missingPackageCount} missing package path(s).`);
    }
  }

  const secretFindings = scanForSecrets([
    CONTROL_PLANE_PATH,
    RETOOL_INVENTORY_PATH,
    join(ROOT, 'docs/guides/RETOOL_CONTROL_PLANE_SETUP.md'),
    join(ROOT, 'docs/guides/RETOOL_VENDOR_BOUNDARY.md'),
    GENERATED_RETOOL_INVENTORY_DOC_PATH,
  ]);
  for (const finding of secretFindings) {
    errors.push(`Possible secret in ${finding.path}.`);
  }

  return { errors, warnings };
}

function printHelp() {
  console.log(`Usage:
  node scripts/retool-control-plane.mjs manifest [--out <path>] [--compact]
  node scripts/retool-control-plane.mjs check
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.command === 'help') {
    printHelp();
    return;
  }

  const graph = buildDeliveryGraph();

  if (args.command === 'manifest') {
    const payload = JSON.stringify(graph, null, args.pretty ? 2 : 0);
    if (args.out) {
      const outPath = resolve(ROOT, args.out);
      writeFileSync(outPath, `${payload}\n`);
      console.log(`wrote ${relative(ROOT, outPath)}`);
    } else {
      console.log(payload);
    }
    return;
  }

  if (args.command === 'check') {
    const { errors, warnings } = checkGraph(graph);
    for (const warning of warnings) {
      console.warn(`warning: ${warning}`);
    }
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(`error: ${error}`);
      }
      process.exit(1);
    }
    console.log('Retool control-plane check ok.');
    return;
  }

  printHelp();
  process.exit(1);
}

main();
