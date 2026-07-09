#!/usr/bin/env node
/**
 * Print the Notion connector export contract used by sync-notion-relations.mjs.
 *
 * The Codex-installed Notion connector is an agent/MCP read surface, not a local
 * Node dependency. This planner keeps the export sources, relation properties,
 * and SQL shape reproducible for any agent that can query the connector.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = path.resolve(SCRIPT_DIR, '../config/notion-connector-relation-sources.json');

function parseArgs(argv) {
  const args = {
    config: DEFAULT_CONFIG,
    source: '',
    format: 'markdown',
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--config') {
      args.config = argv[index + 1] ?? args.config;
      index += 1;
    } else if (arg === '--source') {
      args.source = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--format') {
      args.format = argv[index + 1] ?? args.format;
      index += 1;
    }
  }
  return args;
}

function loadConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function sqlIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildConnectorSql(source) {
  const columns = ['url', source.title_property ?? 'Name', ...(source.relation_properties ?? [])];
  const uniqueColumns = [...new Set(columns)];
  const tableName = source.sql_table ?? source.data_source_id ?? source.name;
  return `SELECT ${uniqueColumns.map(sqlIdentifier).join(', ')} FROM ${sqlIdentifier(tableName)} LIMIT 1000;`;
}

export function selectSources(config, sourceName = '') {
  const sources = Array.isArray(config.sources) ? config.sources : [];
  if (!sourceName) return sources;
  return sources.filter((source) => source.name.toLowerCase() === sourceName.toLowerCase());
}

export function buildConnectorBundle(config, sourceName = '') {
  const sources = selectSources(config, sourceName);
  return {
    connector_exports: sources.map((source) => ({
      name: source.name,
      data_source_id: source.data_source_id,
      relation_properties: source.relation_properties ?? [],
      query: buildConnectorSql(source),
      rows: [],
    })),
  };
}

function renderMarkdown(config, sourceName = '') {
  const bundle = buildConnectorBundle(config, sourceName);
  const lines = [
    '# Notion connector export plan',
    '',
    `Workspace: ${config.workspace ?? 'unknown'}`,
    '',
    'For each source, query the installed Notion connector and paste the returned rows into the matching `rows` array.',
    '',
  ];
  for (const source of bundle.connector_exports) {
    lines.push(`## ${source.name}`);
    lines.push('');
    lines.push(`Data source: \`${source.data_source_id}\``);
    lines.push(`Relation properties: ${source.relation_properties.map((property) => `\`${property}\``).join(', ')}`);
    lines.push('');
    lines.push('```sql');
    lines.push(source.query);
    lines.push('```');
    lines.push('');
  }
  lines.push('Empty connector export bundle:');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(bundle, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('Import command:');
  lines.push('');
  lines.push('```bash');
  lines.push('node packages/app-governance-db/scripts/sync-notion-relations.mjs --connector-export /path/to/notion-connector-export.json --dry-run');
  lines.push('node packages/app-governance-db/scripts/sync-notion-relations.mjs --connector-export /path/to/notion-connector-export.json --write');
  lines.push('```');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node packages/app-governance-db/scripts/notion-connector-export-plan.mjs [options]

Options:
  --config <file>       Manifest path, default: ${DEFAULT_CONFIG}
  --source <name>       Limit output to one source name
  --format <format>     markdown | json | bundle, default: markdown
`);
    return;
  }

  const config = loadConfig(args.config);
  const selected = selectSources(config, args.source);
  if (args.source && selected.length === 0) {
    throw new Error(`No Notion connector source named "${args.source}" in ${args.config}`);
  }

  if (args.format === 'json' || args.format === 'bundle') {
    console.log(JSON.stringify(buildConnectorBundle(config, args.source), null, 2));
    return;
  }

  if (args.format !== 'markdown') {
    throw new Error(`Unsupported format "${args.format}". Use markdown, json, or bundle.`);
  }
  console.log(renderMarkdown(config, args.source));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
