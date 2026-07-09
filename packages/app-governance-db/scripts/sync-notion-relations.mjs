#!/usr/bin/env node
/**
 * Import explicit Notion relation properties into app-governance source_record_relations.
 *
 * This is the fidelity pass after source_records exist: it reads Notion data
 * source rows, finds relation properties, maps related Notion page IDs back to
 * captured source_records, and writes explicit/imported relations through the
 * app-governance MCP.
 *
 * Dry run:
 *   node packages/app-governance-db/scripts/sync-notion-relations.mjs --dry-run
 *
 * Write:
 *   NOTION_SYNC_BEARER_TOKEN=... APP_GOVERNANCE_MCP_KEY=... \
 *     node packages/app-governance-db/scripts/sync-notion-relations.mjs --write
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_NOTION_URL = 'https://createsomething-notion.mcp.workway.co/mcp';
const DEFAULT_GOVERNANCE_URL = 'https://app-governance.mcp.createsomething.agency/mcp';

export function normalizeNotionId(value) {
  const compact = String(value ?? '').replace(/-/g, '').trim().toLowerCase();
  const notionId = compact.match(/[0-9a-f]{32}/);
  return notionId ? notionId[0] : compact;
}

function rowId(row) {
  return row.id ?? row.url;
}

function rowProperties(row) {
  if (row.properties) return row.properties;
  return Object.fromEntries(Object.entries(row).filter(([key]) => !['id', 'url', 'createdTime'].includes(key)));
}

function rowRelationProperties(row) {
  const relationProperties = row.__relation_properties;
  return Array.isArray(relationProperties) && relationProperties.length ? new Set(relationProperties) : null;
}

function parseConnectorRelationValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => ({ id: item.id ?? item.url ?? item }));
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed.startsWith('[')) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.map((item) => ({ id: item.id ?? item.url ?? item })) : [];
  } catch {
    return [];
  }
}

function relationTargets(propertyValue) {
  if (Array.isArray(propertyValue?.relation)) return propertyValue.relation;
  return parseConnectorRelationValue(propertyValue);
}

function relationKindForProperty(propertyName, sourceRecord, targetRecord) {
  const property = propertyName.toLowerCase();
  if (property.includes('block')) return 'blocks';
  if (property.includes('depend')) return 'depends_on';
  if (targetRecord?.canonical_type === 'client' || sourceRecord?.canonical_type === 'client') return 'owns';
  if (property.includes('correspond') || property.includes('milestone') || property.includes('deliverable')) return 'corresponds_to';
  return 'references';
}

function orientedRelation(propertyName, sourceRecord, targetRecord) {
  const relationKind = relationKindForProperty(propertyName, sourceRecord, targetRecord);
  if (relationKind === 'owns' && targetRecord?.canonical_type === 'client' && sourceRecord?.canonical_type !== 'client') {
    return {
      source: targetRecord,
      target: sourceRecord,
      relation_kind: relationKind,
    };
  }
  return {
    source: sourceRecord,
    target: targetRecord,
    relation_kind: relationKind,
  };
}

export function extractRelationsFromNotionRows(rows, sourceRecords) {
  const byNotionId = new Map();
  for (const record of sourceRecords) {
    byNotionId.set(normalizeNotionId(record.external_id), record);
  }

  const relations = [];
  const missingTargetIds = new Set();
  const missingSourceIds = new Set();
  const seen = new Set();

  for (const row of rows) {
    const sourceRecord = byNotionId.get(normalizeNotionId(rowId(row)));
    if (!sourceRecord) {
      missingSourceIds.add(rowId(row));
      continue;
    }
    const relationProperties = rowRelationProperties(row);
    for (const [propertyName, propertyValue] of Object.entries(rowProperties(row))) {
      if (relationProperties && !relationProperties.has(propertyName)) continue;
      const related = relationTargets(propertyValue);
      if (!Array.isArray(related) || related.length === 0) continue;
      for (const relationTarget of related) {
        const targetRecord = byNotionId.get(normalizeNotionId(relationTarget.id));
        if (!targetRecord) {
          missingTargetIds.add(relationTarget.id);
          continue;
        }
        const oriented = orientedRelation(propertyName, sourceRecord, targetRecord);
        if (!oriented.source || !oriented.target || oriented.source.id === oriented.target.id) continue;
        const key = [
          oriented.source.external_id,
          oriented.target.external_id,
          oriented.relation_kind,
          'imported',
          propertyName,
        ].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        relations.push({
          source_record_external_id: oriented.source.external_id,
          target_record_external_id: oriented.target.external_id,
          relation_kind: oriented.relation_kind,
          evidence_kind: 'imported',
          confidence: 1,
          reason: `Notion relation property "${propertyName}" links ${sourceRecord.title ?? sourceRecord.external_id} to ${targetRecord.title ?? targetRecord.external_id}`,
          metadata_json: JSON.stringify({
            notion_property: propertyName,
            notion_source_page_id: rowId(row),
            notion_target_page_id: relationTarget.id,
            source_canonical_type: sourceRecord.canonical_type,
            target_canonical_type: targetRecord.canonical_type,
          }),
        });
      }
    }
  }

  return {
    relations,
    missing_source_ids: [...missingSourceIds],
    missing_target_ids: [...missingTargetIds],
  };
}

export function connectorExportsToNotionRows(connectorExports) {
  const exports = Array.isArray(connectorExports) ? connectorExports : connectorExports?.connector_exports;
  if (!Array.isArray(exports)) return [];

  const rows = [];
  for (const sourceExport of exports) {
    const relationProperties = sourceExport.relation_properties ?? [];
    const dataSourceId = sourceExport.data_source_id ?? sourceExport.data_source_url;
    for (const row of sourceExport.rows ?? sourceExport.results ?? []) {
      rows.push({
        ...row,
        id: row.id ?? row.url,
        __source_external_id: dataSourceId ? normalizeSourceExternalId(dataSourceId) : undefined,
        __source_name: sourceExport.name,
        __relation_properties: relationProperties,
      });
    }
  }
  return rows;
}

function normalizeSourceExternalId(value) {
  const raw = String(value ?? '');
  return raw.startsWith('collection://') ? raw.slice('collection://'.length) : raw;
}

function readSecret(name) {
  if (process.env[name]) return process.env[name];
  try {
    const out = execFileSync('infisical', ['secrets', 'get', name, '--plain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim().split('\n').pop().trim();
  } catch {
    return '';
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: true,
    write: false,
    help: false,
    fixture: '',
    connectorExport: '',
    workspace: process.env.NOTION_WORKSPACE || 'client',
    notionUrl: process.env.NOTION_URL || DEFAULT_NOTION_URL,
    governanceUrl: process.env.APP_GOVERNANCE_MCP_URL || DEFAULT_GOVERNANCE_URL,
    actor: process.env.ACTOR || 'sync-notion-relations',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--write') {
      args.write = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
      args.write = false;
    } else if (arg === '--fixture') {
      args.fixture = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--connector-export') {
      args.connectorExport = argv[index + 1] ?? '';
      index += 1;
    } else if (arg === '--workspace') {
      args.workspace = argv[index + 1] ?? args.workspace;
      index += 1;
    } else if (arg === '--notion-url') {
      args.notionUrl = argv[index + 1] ?? args.notionUrl;
      index += 1;
    } else if (arg === '--governance-url') {
      args.governanceUrl = argv[index + 1] ?? args.governanceUrl;
      index += 1;
    }
  }
  return args;
}

async function connectMcp(url, token, clientName) {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
  const client = new Client({ name: clientName, version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  const callTool = async (name, args = {}) => {
    const out = await client.callTool({ name, arguments: args });
    const text = out.content?.[0]?.text;
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`${name} returned non-JSON text: ${text.slice(0, 300)}`, { cause: error });
    }
  };
  return { client, callTool };
}

async function listGovernanceSourceRecords(callTool) {
  const rows = await callTool('governance_list_source_records', {
    source_type: 'notion_database',
    missing_substrate: false,
    limit: 500,
  });
  return Array.isArray(rows) ? rows : [];
}

async function fetchGovernanceSourceRecords(governanceUrl) {
  const governanceKey = readSecret('APP_GOVERNANCE_MCP_KEY');
  if (!governanceKey) throw new Error('Missing APP_GOVERNANCE_MCP_KEY');
  const governance = await connectMcp(governanceUrl, governanceKey, 'sync-notion-relations-governance');
  try {
    return await listGovernanceSourceRecords(governance.callTool);
  } finally {
    await governance.client.close();
  }
}

async function listNotionRowsForSources(callTool, sourceRecords, workspace) {
  const sourceIds = [...new Set(sourceRecords.map((record) => record.source_external_id).filter(Boolean))];
  const rows = [];
  const sourceSummaries = [];
  for (const dataSourceId of sourceIds) {
    let startCursor;
    let count = 0;
    do {
      const page = await callTool('notion_query_database', {
        workspace,
        data_source_id: dataSourceId,
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      });
      const results = page?.results ?? [];
      rows.push(...results);
      count += results.length;
      startCursor = page?.has_more ? page.next_cursor : undefined;
    } while (startCursor);
    sourceSummaries.push({ data_source_id: dataSourceId, rows: count });
  }
  return { rows, sourceSummaries };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node packages/app-governance-db/scripts/sync-notion-relations.mjs [options]

Options:
  --dry-run                 Query and print relation candidates without writing (default)
  --write                   Write imported relations to app-governance via MCP
  --fixture <file>          Read fixture JSON with source_records and notion_rows
  --connector-export <file> Read Notion connector SQL export JSON and governance source records
  --workspace <name>        Notion MCP workspace, default: client
  --notion-url <url>        Notion MCP URL
  --governance-url <url>    App-governance MCP URL

Environment:
  NOTION_SYNC_BEARER_TOKEN  Bearer for createsomething-notion MCP
  APP_GOVERNANCE_MCP_KEY    Bearer for app-governance MCP
`);
    return;
  }
  let sourceRecords;
  let notionRows;
  let sourceSummaries = [];

  if (args.fixture) {
    const fixture = JSON.parse(fs.readFileSync(path.resolve(args.fixture), 'utf8'));
    sourceRecords = fixture.source_records ?? [];
    notionRows = fixture.notion_rows ?? connectorExportsToNotionRows(fixture);
    sourceSummaries = fixture.source_summaries ?? [];
  } else if (args.connectorExport) {
    const connectorExport = JSON.parse(fs.readFileSync(path.resolve(args.connectorExport), 'utf8'));
    sourceRecords = connectorExport.source_records ?? (await fetchGovernanceSourceRecords(args.governanceUrl));
    notionRows = connectorExportsToNotionRows(connectorExport);
    sourceSummaries = (connectorExport.connector_exports ?? []).map((sourceExport) => ({
      data_source_id: normalizeSourceExternalId(sourceExport.data_source_id ?? sourceExport.data_source_url ?? ''),
      rows: (sourceExport.rows ?? sourceExport.results ?? []).length,
      relation_properties: sourceExport.relation_properties ?? [],
    }));
  } else {
    sourceRecords = await fetchGovernanceSourceRecords(args.governanceUrl);

    const notionToken = readSecret('NOTION_SYNC_BEARER_TOKEN');
    if (!notionToken) throw new Error('Missing NOTION_SYNC_BEARER_TOKEN');
    const notion = await connectMcp(args.notionUrl, notionToken, 'sync-notion-relations-notion');
    try {
      const queried = await listNotionRowsForSources(notion.callTool, sourceRecords, args.workspace);
      notionRows = queried.rows;
      sourceSummaries = queried.sourceSummaries;
    } finally {
      await notion.client.close();
    }
  }

  const extracted = extractRelationsFromNotionRows(notionRows, sourceRecords);
  const summary = {
    source_records: sourceRecords.length,
    notion_rows: notionRows.length,
    source_summaries: sourceSummaries,
    relations: extracted.relations.length,
    missing_source_ids: extracted.missing_source_ids.length,
    missing_target_ids: extracted.missing_target_ids.length,
  };

  if (args.dryRun || !extracted.relations.length) {
    console.log(JSON.stringify({ ok: true, dry_run: true, ...summary, sample: extracted.relations.slice(0, 10) }, null, 2));
    return;
  }

  const governanceKey = readSecret('APP_GOVERNANCE_MCP_KEY');
  if (!governanceKey) throw new Error('Missing APP_GOVERNANCE_MCP_KEY');
  const governance = await connectMcp(args.governanceUrl, governanceKey, 'sync-notion-relations-write');
  const writeResults = [];
  try {
    for (let index = 0; index < extracted.relations.length; index += 100) {
      const batch = extracted.relations.slice(index, index + 100);
      writeResults.push(
        await governance.callTool('governance_record_source_record_relations', {
          source_type: 'notion_database',
          relations: batch,
          actor: args.actor,
        }),
      );
    }
  } finally {
    await governance.client.close();
  }
  console.log(JSON.stringify({ ok: true, dry_run: false, ...summary, write_results: writeResults }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
