#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LINEAR_API = process.env.LINEAR_API_URL || 'https://api.linear.app/graphql';
const DEFAULT_TEAM_KEY = process.env.LINEAR_TEAM_KEY || 'CRE';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function usage() {
  console.log(`Usage:
  node scripts/linear/sync-registry.mjs [--dry-run] [--team <key>] [--date <yyyy-mm-dd>]

Creates or refreshes dated Linear registry snapshot issues:
  - MCP Fleet Registry
  - Agent Registry

Environment:
  LINEAR_API_KEY  Required unless --dry-run is used
  LINEAR_TEAM_KEY Optional team key, default: CRE
  LINEAR_API_URL  Optional GraphQL endpoint override
`);
}

function parseArgs(argv) {
  const args = argv.slice(2).filter((arg) => arg !== '--');
  const options = {
    dryRun: false,
    date: new Date().toISOString().slice(0, 10),
    team: DEFAULT_TEAM_KEY
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--team' && args[index + 1]) options.team = args[++index];
    else if (arg === '--date' && args[index + 1]) options.date = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function repoPath(relativePath) {
  return path.join(ROOT, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(repoPath(relativePath), 'utf8'));
}

async function readTextIfExists(relativePath) {
  const fullPath = repoPath(relativePath);
  if (!existsSync(fullPath)) return null;
  return readFile(fullPath, 'utf8');
}

function countBy(values) {
  return values.reduce((counts, value) => {
    const key = value || 'unspecified';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function sortCounts(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function tableRows(rows) {
  return rows.map((cells) => `| ${cells.join(' | ')} |`).join('\n');
}

function tomlValue(text, key) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*["']([^"']+)["']`, 'm'));
  return match?.[1] ?? null;
}

function humanizeModuleName(fileName) {
  return fileName
    .replace(/\.py$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactDescription(description, limit = 160) {
  if (!description) return '';
  const oneLine = String(description).replace(/\s+/g, ' ').trim();
  return oneLine.length > limit ? `${oneLine.slice(0, limit - 3)}...` : oneLine;
}

function codeList(values) {
  if (!values?.length) return '';
  return values.map((value) => `\`${value}\``).join(', ');
}

function isLegacyLoomEntry(entry) {
  const id = entry.id.toLowerCase();
  const tags = (entry.tags ?? []).map((tag) => String(tag).toLowerCase());
  return (
    id === 'loom-mcp' ||
    /(^|[-_])loom($|[-_])/.test(id) ||
    tags.some((tag) => tag === 'loom' || tag === 'loom-mcp')
  );
}

async function collectMcpSnapshot(date) {
  const registry = await readJson('config/mcp-hub/registry.json');
  const entries = Object.entries(registry.servers ?? {}).map(([id, server]) => ({ id, ...server }));
  const transportCounts = countBy(entries.map((entry) => entry.transport));
  const exposureCounts = countBy(entries.map((entry) => entry.catalog_exposure_mode));
  const catalogEntries = entries.filter((entry) => entry.catalog?.include);
  const authRequired = entries.filter(
    (entry) => entry.catalog?.requiresAuth || entry.bearer_token_env_var
  );
  const brokeredEntries = entries.filter((entry) => entry.catalog_exposure_mode === 'brokered');
  const estimatedTools = entries.reduce(
    (sum, entry) => sum + Number(entry.estimated_tool_count || 0),
    0
  );
  const tagCounts = countBy(entries.flatMap((entry) => entry.tags ?? []));
  const loomEntries = entries.filter(isLegacyLoomEntry);

  const catalogRows = catalogEntries
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 30)
    .map((entry) => [
      `\`${entry.id}\``,
      entry.catalog?.name ?? entry.id,
      entry.catalog?.category ?? 'uncategorized',
      entry.catalog?.requiresAuth ? 'yes' : 'no',
      entry.catalog_exposure_mode ?? 'unspecified'
    ]);

  const description = [
    `# MCP Fleet Registry Snapshot - ${date}`,
    '',
    'Source: `config/mcp-hub/registry.json`',
    '',
    '## Summary',
    '',
    `- Servers: ${entries.length}`,
    `- Catalog included: ${catalogEntries.length}`,
    `- Auth required or token-backed: ${authRequired.length}`,
    `- Brokered entries: ${brokeredEntries.length}`,
    `- Estimated tool count: ${estimatedTools}`,
    `- Loom entries in local registry: ${loomEntries.length ? loomEntries.map((entry) => `\`${entry.id}\``).join(', ') : 'none'}`,
    '',
    '## Transport Counts',
    '',
    tableRows([
      ['Transport', 'Count'],
      ['---', '---:'],
      ...sortCounts(transportCounts).map(([name, count]) => [name, String(count)])
    ]),
    '',
    '## Exposure Counts',
    '',
    tableRows([
      ['Exposure', 'Count'],
      ['---', '---:'],
      ...sortCounts(exposureCounts).map(([name, count]) => [name, String(count)])
    ]),
    '',
    '## Top Tags',
    '',
    sortCounts(tagCounts)
      .slice(0, 15)
      .map(([tag, count]) => `- \`${tag}\`: ${count}`)
      .join('\n') || '- none',
    '',
    '## Catalog Entries',
    '',
    tableRows([
      ['Server', 'Name', 'Category', 'Auth', 'Exposure'],
      ['---', '---', '---', '---', '---'],
      ...catalogRows
    ]),
    '',
    '## Operating Note',
    '',
    'Linear is the coordination and review surface. The executable MCP registry remains the checked-in registry plus the deployed Hub state.'
  ].join('\n');

  return {
    title: `Review MCP registry snapshot ${date}`,
    project: 'MCP Fleet Registry',
    labels: ['mcp-registry', 'registry-snapshot'],
    description,
    summary: {
      servers: entries.length,
      catalogIncluded: catalogEntries.length,
      authRequired: authRequired.length,
      brokered: brokeredEntries.length,
      estimatedTools,
      loomEntries: loomEntries.map((entry) => entry.id),
      transports: transportCounts,
      exposures: exposureCounts
    }
  };
}

async function listPythonAgentModules() {
  const dir = repoPath('packages/agent-sdk/agents');
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  return files
    .filter((file) => file.endsWith('.py'))
    .filter((file) => file !== '__init__.py')
    .sort()
    .map((file) => ({
      file: `packages/agent-sdk/agents/${file}`,
      name: humanizeModuleName(file)
    }));
}

async function collectPackage(relativePath) {
  const packageJson = await readJson(`${relativePath}/package.json`);
  const wranglerPath = `${relativePath}/wrangler.toml`;
  const wranglerText = await readTextIfExists(wranglerPath);
  return {
    path: relativePath,
    name: packageJson.name ?? path.basename(relativePath),
    version: packageJson.version ?? null,
    description: packageJson.description ?? '',
    workerName: wranglerText ? tomlValue(wranglerText, 'name') : null
  };
}

async function collectAgentSnapshot(date) {
  const pyprojectText = await readTextIfExists('packages/agent-sdk/pyproject.toml');
  const pythonPackage = pyprojectText
    ? {
        path: 'packages/agent-sdk',
        name: tomlValue(pyprojectText, 'name') ?? 'create-something-agents',
        version: tomlValue(pyprojectText, 'version'),
        description: tomlValue(pyprojectText, 'description') ?? ''
      }
    : null;

  const knownPackagePaths = [
    'packages/symphony',
    'packages/agents/coordination',
    'packages/social-agent',
    'packages/notion-agent',
    'packages/notion-agent/workers/scheduler',
    'packages/agent-kit',
    'packages/agency/workers/dental-agent-router',
    'packages/space/workers/agentic-executor',
    'packages/webflow-apps-admin/workers/audit-agent'
  ];
  const packagePaths = [];
  for (const packagePath of knownPackagePaths) {
    const fullPath = repoPath(`${packagePath}/package.json`);
    if (!existsSync(fullPath)) continue;
    packagePaths.push(packagePath);
  }

  const packages = [];
  for (const packagePath of packagePaths) {
    packages.push(await collectPackage(packagePath));
  }

  const pythonModules = await listPythonAgentModules();
  const wranglerServices = packages.filter((pkg) => pkg.workerName);
  const coordinationPackages = packages.filter(
    (pkg) => /symphony|coordination/i.test(pkg.name) || /coordination/i.test(pkg.path)
  );
  const difyInventory = existsSync(repoPath('config/dify/inventory.json'))
    ? await readJson('config/dify/inventory.json')
    : null;
  const difyAgents = Object.entries(difyInventory?.agents ?? {})
    .map(([id, agent]) => ({ id, ...agent }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const difyStatusCounts = countBy(difyAgents.map((agent) => agent.status));
  const difyAudienceCounts = countBy(difyAgents.map((agent) => agent.audience));

  const packageRows = packages.map((pkg) => [
    `\`${pkg.path}\``,
    `\`${pkg.name}\``,
    pkg.workerName ? `\`${pkg.workerName}\`` : '',
    compactDescription(pkg.description)
  ]);

  const moduleRows = pythonModules.map((module) => [`\`${module.file}\``, module.name]);
  const difyRows = difyAgents.map((agent) => [
    `\`${agent.id}\``,
    agent.display_name ?? agent.id,
    `\`${agent.status ?? 'unknown'}\``,
    `\`${agent.audience ?? 'unspecified'}\``,
    agent.dify_app_id ? `\`${agent.dify_app_id}\`` : '',
    codeList(agent.allowed_mcp_servers ?? []),
    String(agent.enabled_tools?.length ?? 0),
    `\`${agent.eval_suite ?? ''}\``
  ]);

  const description = [
    `# Agent Registry Snapshot - ${date}`,
    '',
    'Sources: `packages/agent-sdk`, `packages/agents`, agent worker packages, Linear-backed Symphony coordination, and `config/dify/inventory.json`.',
    '',
    '## Summary',
    '',
    `- Python SDK package: ${pythonPackage ? `\`${pythonPackage.name}\`` : 'not found'}`,
    `- Python agent modules: ${pythonModules.length}`,
    `- Node/worker packages tracked: ${packages.length}`,
    `- Worker services with Wrangler config: ${wranglerServices.length}`,
    `- Coordination packages: ${coordinationPackages.length}`,
    `- Dify agents tracked: ${difyAgents.length}`,
    '',
    '## Python Agent Modules',
    '',
    tableRows([['Module', 'Registry Name'], ['---', '---'], ...moduleRows]),
    '',
    '## Node And Worker Surfaces',
    '',
    tableRows([
      ['Path', 'Package', 'Worker', 'Description'],
      ['---', '---', '---', '---'],
      ...packageRows
    ]),
    '',
    '## Dify Agents',
    '',
    tableRows([
      [
        'Agent',
        'Display Name',
        'Status',
        'Audience',
        'App ID',
        'MCP Servers',
        'Enabled Tools',
        'Eval Suite'
      ],
      ['---', '---', '---', '---', '---', '---', '---:', '---'],
      ...difyRows
    ]),
    '',
    '### Dify Status Counts',
    '',
    tableRows([
      ['Status', 'Count'],
      ['---', '---:'],
      ...sortCounts(difyStatusCounts).map(([name, count]) => [name, String(count)])
    ]),
    '',
    '### Dify Audience Counts',
    '',
    tableRows([
      ['Audience', 'Count'],
      ['---', '---:'],
      ...sortCounts(difyAudienceCounts).map(([name, count]) => [name, String(count)])
    ]),
    '',
    '## Operating Note',
    '',
    'Linear is the coordination and review surface. Runtime behavior remains owned by package code, Dify workspace state, worker deployments, checked-in Dify manifests/DSL exports, and secrets in Infisical. Dify Service API keys must remain stored as Infisical references, not as App IDs.'
  ].join('\n');

  return {
    title: `Review agent registry snapshot ${date}`,
    project: 'Agent Registry',
    labels: ['agent-registry', 'registry-snapshot'],
    description,
    summary: {
      pythonPackage,
      pythonModules: pythonModules.length,
      packages: packages.length,
      wranglerServices: wranglerServices.length,
      coordinationPackages: coordinationPackages.length,
      difyAgents: difyAgents.length,
      difyStatuses: difyStatusCounts,
      difyAudiences: difyAudienceCounts
    }
  };
}

async function gql(query, variables = {}) {
  const token = process.env.LINEAR_API_KEY || '';
  if (!token) throw new Error('LINEAR_API_KEY is required.');

  const response = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ query, variables })
  });
  const body = await response.json();
  if (!response.ok || body.errors) {
    throw new Error(
      JSON.stringify({ status: response.status, errors: body.errors ?? body }, null, 2)
    );
  }
  return body.data;
}

async function bootstrap(teamKey) {
  const data = await gql(`
    query Bootstrap {
      viewer { id name }
      teams(first: 100) { nodes { id key name } }
      issueLabels(first: 250) { nodes { id name } }
      projects(first: 250) { nodes { id name url } }
      issues(first: 250, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          url
          project { id name }
          state { name type }
          updatedAt
        }
      }
    }
  `);
  const team = data.teams.nodes.find((node) => node.key === teamKey) ?? data.teams.nodes[0];
  if (!team) throw new Error('No Linear team is visible to this token.');
  return {
    viewer: data.viewer,
    team,
    labels: data.issueLabels.nodes,
    projects: data.projects.nodes,
    issues: data.issues.nodes
  };
}

function requiredProject(ctx, name) {
  const project = ctx.projects.find((node) => node.name === name);
  if (!project) throw new Error(`Linear project not found: ${name}`);
  return project;
}

function matchingLabelIds(ctx, labels) {
  return labels.map((label) => ctx.labels.find((node) => node.name === label)?.id).filter(Boolean);
}

async function createIssue(ctx, snapshot, project) {
  const data = await gql(
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { id identifier title url } }
    }`,
    {
      input: {
        teamId: ctx.team.id,
        projectId: project.id,
        title: snapshot.title,
        description: snapshot.description,
        priority: 3,
        labelIds: matchingLabelIds(ctx, snapshot.labels)
      }
    }
  );
  return { action: 'created', issue: data.issueCreate.issue };
}

async function commentIssue(issueId, body) {
  const data = await gql(
    `mutation CommentIssue($input: CommentCreateInput!) {
      commentCreate(input: $input) { success comment { id url } }
    }`,
    { input: { issueId, body } }
  );
  return data.commentCreate.comment;
}

async function syncSnapshot(ctx, snapshot) {
  const project = requiredProject(ctx, snapshot.project);
  const existing = ctx.issues.find(
    (issue) => issue.title === snapshot.title && issue.project?.id === project.id
  );
  if (!existing) return createIssue(ctx, snapshot, project);

  const comment = await commentIssue(
    existing.id,
    [
      `Registry snapshot refreshed on ${new Date().toISOString()}.`,
      '',
      'Latest computed summary:',
      '',
      '```json',
      JSON.stringify(snapshot.summary, null, 2),
      '```'
    ].join('\n')
  );
  return { action: 'commented', issue: existing, comment };
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const snapshots = [
    await collectMcpSnapshot(options.date),
    await collectAgentSnapshot(options.date)
  ];

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          date: options.date,
          team: options.team,
          snapshots: snapshots.map((snapshot) => ({
            title: snapshot.title,
            project: snapshot.project,
            labels: snapshot.labels,
            summary: snapshot.summary,
            descriptionBytes: Buffer.byteLength(snapshot.description, 'utf8')
          }))
        },
        null,
        2
      )
    );
    return;
  }

  const ctx = await bootstrap(options.team);
  const results = [];
  for (const snapshot of snapshots) {
    results.push(await syncSnapshot(ctx, snapshot));
  }

  console.log(JSON.stringify({ date: options.date, team: ctx.team.key, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
