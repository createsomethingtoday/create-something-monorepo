import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import fs from 'node:fs';

/**
 * Substrate → Notion view sync for Agency Ops.
 *
 * Canonical: Substrate (CREATE SOMETHING Agency Ops workspace)
 * View: Notion (client workspace of notion-halfdozen-create-something MCP)
 *
 * Goals:
 * - Ensure Substrate has an `agents` table (and required columns across tables)
 * - Ensure Notion ops databases have `Substrate ID` (rich_text) for stable upserts
 * - Ensure Notion has an `Agents` database and MCP Services has a `Client` relation
 * - Upsert Notion pages from Substrate and write back notion_page_id/notion_url into Substrate records
 */

const WORKSPACE_NAME = 'CREATE SOMETHING Agency Ops';

const NOTION_URL = process.env.NOTION_URL || 'https://createsomething-notion.mcp.workway.co/mcp';
const SUBSTRATE_URL = process.env.SUBSTRATE_URL || 'https://substrate.mcp.createsomething.agency/mcp';

const NOTION_TOKEN = process.env.NOTION_SYNC_BEARER_TOKEN;

function readSubstrateTokenFromDisk() {
  const home = process.env.HOME;
  if (!home) return '';
  const tokenPath = `${home}/.config/create-something/substrate/substrate_admin.token`;
  if (!fs.existsSync(tokenPath)) return '';
  return fs.readFileSync(tokenPath, 'utf8').trim();
}

const SUBSTRATE_TOKEN =
  process.env.SUBSTRATE_ADMIN_TOKEN ||
  process.env.SUBSTRATE_TOKEN ||
  readSubstrateTokenFromDisk();

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

// Used only when Agents database doesn't exist and we can't infer it from existing Ops DB parents.
const NOTION_AGENCY_OPS_PARENT_PAGE_ID = process.env.NOTION_AGENCY_OPS_PARENT_PAGE_ID || '';

if (!NOTION_TOKEN) {
  throw new Error('Missing NOTION_SYNC_BEARER_TOKEN');
}
if (!SUBSTRATE_TOKEN) {
  throw new Error('Missing substrate token (SUBSTRATE_ADMIN_TOKEN or SUBSTRATE_TOKEN)');
}

async function connect(url, token) {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const client = new Client({ name: 'agency-ops-view-sync', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const callTool = async (name, args = {}) => {
    const out = await client.callTool({ name, arguments: args });
    const text = out.content?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text);
  };

  return {
    client,
    callTool,
    close: () => client.close(),
  };
}

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

function getTitleFromNotionSearchResult(item) {
  const title = item?.title;
  if (typeof title === 'string') return title;
  if (Array.isArray(title)) return title.map((t) => t?.plain_text || '').join('');
  return '';
}

function getDatabaseIdFromDataSourceSearchResult(item) {
  // Expected: item.parent.database_id (as seen in other repo scripts)
  const direct = item?.parent?.database_id;
  if (typeof direct === 'string' && direct.length > 0) return direct;
  // Defensive fallbacks for any future shape changes
  const alt1 = item?.parent?.id;
  if (typeof alt1 === 'string' && alt1.length > 0) return alt1;
  const alt2 = item?.database_parent?.database_id;
  if (typeof alt2 === 'string' && alt2.length > 0) return alt2;
  return '';
}

function getParentPageIdFromDataSourceSearchResult(item) {
  // Seen in repo scripts: item.database_parent.page_id
  const p1 = item?.database_parent?.page_id;
  if (typeof p1 === 'string' && p1.length > 0) return p1;
  const p2 = item?.parent?.page_id;
  if (typeof p2 === 'string' && p2.length > 0) return p2;
  return '';
}

async function notionListAllDataSources(notionCallTool, workspace) {
  let startCursor;
  const dataSources = [];

  do {
    const page = await notionCallTool('notion_list_databases', {
      workspace,
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });

    if (!page || !Array.isArray(page.data_sources)) {
      throw new Error(`notion_list_databases returned invalid response for ${workspace}`);
    }

    dataSources.push(...page.data_sources);
    startCursor = page.has_more ? page.next_cursor : undefined;
  } while (startCursor);

  return dataSources;
}

function findDataSourceByTitle(dataSources, candidateTitles) {
  // Prefer candidates in the given order. Only treat it as ambiguous if multiple
  // data sources match the same candidate title (true duplicate), not if different
  // aliases exist (e.g. both "MCP Services" and "Services").
  for (const cand of candidateTitles) {
    const wanted = normalize(cand);
    const matches = dataSources.filter((ds) => normalize(ds.title) === wanted);
    if (matches.length === 0) continue;
    if (matches.length > 1) {
      const titles = matches.map((m) => `${m.title} (${m.id})`).join(', ');
      throw new Error(`Ambiguous data source match for "${cand}". Matches: ${titles}`);
    }
    return matches[0];
  }
  return null;
}

async function resolveDataSourceAndMeta(notion, workspace, candidateTitles) {
  const dataSources = await notionListAllDataSources(notion.callTool, workspace);
  const ds = findDataSourceByTitle(dataSources, candidateTitles);
  if (!ds) {
    const available = dataSources.map((d) => d.title).join(', ');
    throw new Error(`Could not find Notion data source for ${candidateTitles.join(', ')}. Available: ${available}`);
  }

  // Use notion_search to get the backing database_id (required for schema updates) and parent page id (for Agents creation).
  const search = await notion.callTool('notion_search', {
    workspace,
    query: ds.title,
    filter_type: 'data_source',
    page_size: 100,
  });
  const results = search?.results || [];
  const meta = results.find((r) => r?.id === ds.id) || results.find((r) => normalize(getTitleFromNotionSearchResult(r)) === normalize(ds.title));
  if (!meta) {
    throw new Error(`Could not resolve notion_search metadata for data source "${ds.title}" (${ds.id}).`);
  }

  const database_id = getDatabaseIdFromDataSourceSearchResult(meta);
  if (!database_id) {
    throw new Error(`Could not resolve backing database_id for data source "${ds.title}" (${ds.id}).`);
  }

  const parent_page_id = getParentPageIdFromDataSourceSearchResult(meta);

  return { data_source_id: ds.id, data_source_title: ds.title, database_id, parent_page_id };
}

function buildPropIndex(schema) {
  const byName = new Map();
  const byNorm = new Map();
  for (const col of schema || []) {
    byName.set(col.name, col.type);
    const n = normalize(col.name);
    if (!byNorm.has(n)) byNorm.set(n, col.name);
    else byNorm.set(n, null); // collision
  }
  return { byName, byNorm };
}

function getTitlePropertyName(schema) {
  const title = (schema || []).find((p) => p.type === 'title');
  return title?.name || '';
}

function safeText(s) {
  return typeof s === 'string' ? s : s == null ? '' : String(s);
}

function notionTitle(content) {
  return { title: [{ text: { content: safeText(content) } }] };
}

function notionRichText(content) {
  const text = safeText(content);
  return { rich_text: text.length > 0 ? [{ text: { content: text } }] : [] };
}

function notionUrl(url) {
  const u = safeText(url);
  return { url: u.length > 0 ? u : null };
}

function notionDate(start) {
  const s = safeText(start);
  return { date: s.length > 0 ? { start: s } : null };
}

function notionSelect(name) {
  const n = safeText(name);
  return { select: n.length > 0 ? { name: n } : null };
}

function notionStatus(name) {
  const n = safeText(name);
  return { status: n.length > 0 ? { name: n } : null };
}

function notionMultiSelect(values) {
  const arr = Array.isArray(values) ? values : values ? [values] : [];
  const cleaned = arr.map((v) => safeText(v)).filter((v) => v.length > 0);
  return { multi_select: cleaned.map((name) => ({ name })) };
}

function notionRelation(pageIds) {
  const ids = Array.isArray(pageIds) ? pageIds : [];
  return { relation: ids.filter(Boolean).map((id) => ({ id })) };
}

function resolveProp(propIndex, desiredName) {
  if (propIndex.byName.has(desiredName)) {
    return { name: desiredName, type: propIndex.byName.get(desiredName) };
  }
  const actual = propIndex.byNorm.get(normalize(desiredName));
  if (typeof actual === 'string' && actual.length > 0) {
    return { name: actual, type: propIndex.byName.get(actual) };
  }
  return null;
}

function buildNotionProperties({ propTypes, titleProp, values }) {
  const props = {};

  // Title is always required for create/update clarity.
  if (titleProp && Object.prototype.hasOwnProperty.call(values, '__title')) {
    props[titleProp] = notionTitle(values.__title);
  }

  for (const [key, val] of Object.entries(values)) {
    if (key === '__title') continue;
    const resolved = resolveProp(propTypes, key);
    if (!resolved) continue; // skip unknown properties (view schema drift)
    const { name, type } = resolved;

    if (type === 'rich_text') props[name] = notionRichText(val);
    else if (type === 'url') props[name] = notionUrl(val);
    else if (type === 'date') props[name] = notionDate(val);
    else if (type === 'datetime') props[name] = notionDate(val);
    else if (type === 'select') props[name] = notionSelect(val);
    else if (type === 'status') props[name] = notionStatus(val);
    else if (type === 'multi_select') props[name] = notionMultiSelect(val);
    else if (type === 'relation') props[name] = notionRelation(val);
    else if (type === 'title') {
      // If schema uses non-standard title name, treat as title override.
      props[name] = notionTitle(val);
    }
  }

  return props;
}

async function ensureNotionProperty(notion, workspace, meta, schema, propertyName, propertyDef) {
  const propIndex = buildPropIndex(schema.schema);
  if (propIndex.byName.has(propertyName)) return;

  if (DRY_RUN) {
    console.log(`[dry-run] Would add Notion property "${propertyName}" to ${meta.data_source_title}`);
    return;
  }

  const updateRes = await notion.callTool('notion_update_database', {
    workspace,
    database_id: meta.database_id,
    data_source_id: meta.data_source_id,
    properties: { [propertyName]: propertyDef },
  });
  if (updateRes?.error) throw new Error(updateRes.error);
  console.log(`Added Notion property "${propertyName}" to ${meta.data_source_title}`);
}

async function ensureNotionDataSourceSchema(notion, workspace, meta, requiredProps) {
  const schema = await notion.callTool('notion_get_database', {
    workspace,
    data_source_id: meta.data_source_id,
  });
  if (schema?.error) throw new Error(schema.error);
  for (const { name, def } of requiredProps) {
    await ensureNotionProperty(notion, workspace, meta, schema, name, def);
  }
}

async function notionQueryAllPages(notion, workspace, data_source_id, titleProp) {
  const all = [];
  let cursor;

  do {
    const page = await notion.callTool('notion_query_database', {
      workspace,
      data_source_id,
      page_size: 100,
      ...(titleProp
        ? { filter: JSON.stringify({ property: titleProp, title: { is_not_empty: true } }) }
        : {}),
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    if (!page || !Array.isArray(page.results)) {
      throw new Error(`notion_query_database returned invalid result for ${data_source_id}`);
    }

    all.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);

  return all;
}

function getPlainTextFromNotionTextArray(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.map((x) => x?.plain_text || '').join('');
}

function getNotionPropertyPlainText(page, propName) {
  const prop = page?.properties?.[propName];
  if (!prop || typeof prop !== 'object') return '';
  if (prop.type === 'rich_text') return getPlainTextFromNotionTextArray(prop.rich_text);
  if (prop.type === 'title') return getPlainTextFromNotionTextArray(prop.title);
  return '';
}

async function buildNotionSubstrateIdMap(notion, workspace, dataSourceMeta, schema) {
  const titleProp = getTitlePropertyName(schema.schema);
  if (!titleProp) {
    throw new Error(`Could not detect title property for data source ${dataSourceMeta.data_source_title}`);
  }

  const pages = await notionQueryAllPages(notion, workspace, dataSourceMeta.data_source_id, titleProp);
  const map = new Map();
  const dups = new Map();

  for (const p of pages) {
    const sid = getNotionPropertyPlainText(p, 'Substrate ID').trim();
    if (!sid) continue;
    if (map.has(sid) && map.get(sid) !== p.id) {
      const existing = map.get(sid);
      dups.set(sid, [existing, p.id]);
      continue;
    }
    map.set(sid, p.id);
  }

  if (dups.size > 0) {
    const lines = [];
    for (const [sid, ids] of dups.entries()) lines.push(`- ${sid}: ${ids.join(', ')}`);
    throw new Error(`Duplicate Notion pages detected with same Substrate ID in "${dataSourceMeta.data_source_title}". Resolve before continuing:\n${lines.join('\n')}`);
  }

  return map;
}

function addMissingColumns(existingCols, desiredCols) {
  const wanted = new Map((existingCols || []).map((c) => [c.name, c]));
  return desiredCols.filter((col) => !wanted.has(col.name));
}

function substrateSchemaByTable(table, idsByName = {}) {
  const schemas = {
    clients: [
      { name: 'name', type: 'text', required: true },
      { name: 'status', type: 'select', required: false },
      { name: 'primary_channel', type: 'select', required: false },
      { name: 'priority', type: 'select', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'notion_page_id', type: 'text', required: false },
      { name: 'notion_url', type: 'url', required: false },
      { name: 'source_system', type: 'text', required: false },
    ],
    engagements: [
      { name: 'name', type: 'text', required: true },
      { name: 'status', type: 'select', required: false },
      { name: 'phase', type: 'select', required: false },
      { name: 'contracted_scope', type: 'text', required: false },
      { name: 'start_date', type: 'date', required: false },
      { name: 'criticality', type: 'select', required: false },
      { name: 'repo_or_config', type: 'url', required: false },
      { name: 'dependencies', type: 'text', required: false },
      { name: 'next_review', type: 'date', required: false },
      { name: 'sla', type: 'select', required: false },
      { name: 'risk_blockers', type: 'text', required: false },
      // Relation columns are optional; relations are modeled via Substrate relations table.
      ...(idsByName.clients ? [{ name: 'client_id', type: 'relation', relation_table_id: idsByName.clients, required: false }] : []),
      { name: 'notion_page_id', type: 'text', required: false },
      { name: 'notion_url', type: 'url', required: false },
      { name: 'source_system', type: 'text', required: false },
    ],
    mcp_services: [
      { name: 'name', type: 'text', required: true },
      { name: 'status', type: 'select', required: false },
      { name: 'last_review', type: 'date', required: false },
      { name: 'endpoint', type: 'url', required: false },
      { name: 'repo_or_config', type: 'url', required: false },
      { name: 'owner', type: 'text', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'category', type: 'select', required: false },
      { name: 'notion_page_id', type: 'text', required: false },
      { name: 'notion_url', type: 'url', required: false },
      { name: 'source_system', type: 'text', required: false },
    ],
    agents: [
      { name: 'name', type: 'text', required: true },
      { name: 'status', type: 'select', required: false, options: ['draft', 'active', 'paused', 'deprecated'] },
      { name: 'purpose', type: 'text', required: false },
      { name: 'primary_interface', type: 'select', required: false, options: ['codex', 'claude', 'cursor', 'slack', 'api'] },
      { name: 'delivery_mode', type: 'select', required: false, options: ['agent-outcome-stack', 'mcp-only'] },
      { name: 'trigger_types', type: 'multi_select', required: false, options: ['schedule', 'manual', 'webhook', 'slack_command', 'api'] },
      { name: 'schedule_utc', type: 'text', required: false },
      { name: 'route', type: 'text', required: false },
      { name: 'repo_or_config', type: 'url', required: false },
      { name: 'notes', type: 'text', required: false },
      { name: 'notion_page_id', type: 'text', required: false },
      { name: 'notion_url', type: 'url', required: false },
      { name: 'source_system', type: 'text', required: false },
    ],
  };

  return schemas[table] || [];
}

async function ensureSubstrateWorkspace(substrate) {
  const wsList = await substrate.callTool('list_workspaces', {});
  const existing = (wsList?.workspaces || []).find((w) => w.name === WORKSPACE_NAME);
  if (existing) return existing;

  if (DRY_RUN) {
    console.log(`[dry-run] Would create Substrate workspace "${WORKSPACE_NAME}"`);
    return null;
  }

  const created = await substrate.callTool('create_workspace', {
    name: WORKSPACE_NAME,
    description: 'Canonical ops state for agency engagements, services, and agents.',
  });
  if (created?.error) throw new Error(created.error);
  console.log(`Created Substrate workspace: ${WORKSPACE_NAME} (${created.workspace.id})`);
  return created.workspace;
}

async function ensureSubstrateTable(substrate, workspace, tableName, description, columns) {
  const wsList = await substrate.callTool('list_workspaces', {});
  const ws = (wsList?.workspaces || []).find((w) => w.id === workspace.id);
  const existing = (ws?.tables || []).find((t) => t && t.name === tableName);

  if (!existing) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would create Substrate table "${tableName}"`);
      return null;
    }
    const created = await substrate.callTool('define_table', {
      workspace_id: workspace.id,
      name: tableName,
      description,
      columns,
    });
    if (created?.error) throw new Error(created.error);
    console.log(`Created Substrate table ${tableName} (${created.table.id})`);
    return created.table;
  }

  const missing = addMissingColumns(existing.columns || [], columns);
  if (missing.length > 0) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would update Substrate table "${tableName}" adding ${missing.length} column(s): ${missing.map((c) => c.name).join(', ')}`);
      return existing;
    }
    const updated = await substrate.callTool('update_table', {
      table_id: existing.id,
      columns: [...(existing.columns || []), ...missing],
    });
    if (updated?.error) throw new Error(updated.error);
    console.log(`Updated Substrate table ${tableName}, added ${missing.length} column(s).`);
    return updated.table || existing;
  }

  return existing;
}

async function substrateFindAllRecords(substrate, table_name) {
  const records = [];
  let offset = 0;

  // Server caps limit at 100.
  // find_records returns { records, total_count, has_more, limit, offset }
  while (true) {
    const page = await substrate.callTool('find_records', {
      workspace_name: WORKSPACE_NAME,
      table_name,
      limit: 100,
      offset,
    });
    if (page?.error) throw new Error(page.error);
    if (!Array.isArray(page.records)) {
      throw new Error(`Unexpected find_records response for ${table_name}`);
    }
    records.push(...page.records);
    if (!page.has_more) break;
    offset += page.limit || 100;
  }

  return records;
}

function relatedRecordIds(relations, currentRecordId, targetTableId) {
  const ids = [];
  for (const r of relations || []) {
    const isSource = r.source_record_id === currentRecordId;
    const isTarget = r.target_record_id === currentRecordId;
    if (!isSource && !isTarget) continue;
    const otherTable = isSource ? r.target_table_id : r.source_table_id;
    if (otherTable !== targetTableId) continue;
    const otherId = isSource ? r.target_record_id : r.source_record_id;
    if (otherId) ids.push(otherId);
  }
  return ids;
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

async function upsertNotionPage({
  notion,
  workspace,
  dataSourceMeta,
  dataSourceSchema,
  substrate,
  substrateRecord,
  notionPageIdFromMap,
  buildValues,
}) {
  const propTypes = buildPropIndex(dataSourceSchema.schema);
  const titleProp = getTitlePropertyName(dataSourceSchema.schema);
  if (!titleProp) throw new Error(`Could not detect title property for ${dataSourceMeta.data_source_title}`);

  const substrateId = substrateRecord.id;
  const recordData = substrateRecord.data || {};

  const values = buildValues();
  // Always write stable key
  values['Substrate ID'] = substrateId;

  // Normalize: pass title under sentinel
  values.__title = values.__title || values.Name || values.Service || values.name || recordData.name || substrateId;

  const properties = buildNotionProperties({ propTypes, titleProp, values });

  const existingNotionId = recordData.notion_page_id || '';
  const mappedNotionId = notionPageIdFromMap?.get(substrateId) || '';

  // Safety: if Substrate points to a page but map says this substrate_id belongs to a different page, stop.
  if (existingNotionId && mappedNotionId && existingNotionId !== mappedNotionId) {
    throw new Error(
      `Notion mapping mismatch for Substrate record ${substrateId} (${dataSourceMeta.data_source_title}): ` +
      `Substrate notion_page_id=${existingNotionId} but Notion Substrate ID map points to ${mappedNotionId}. ` +
      `This indicates drift or duplicates; fix manually before syncing.`
    );
  }

  const targetPageId = existingNotionId || mappedNotionId || '';

  let notionResult;
  if (targetPageId) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would update Notion page ${targetPageId} (${dataSourceMeta.data_source_title}) from Substrate ${substrateId}`);
      notionResult = { id: targetPageId, url: recordData.notion_url || null };
    } else {
      notionResult = await notion.callTool('notion_update_page', {
        workspace,
        page_id: targetPageId,
        properties,
      });
      if (notionResult?.error) throw new Error(notionResult.error);
    }
  } else {
    if (DRY_RUN) {
      console.log(`[dry-run] Would create Notion page in ${dataSourceMeta.data_source_title} from Substrate ${substrateId}`);
      notionResult = { id: '__dry_run__', url: null };
    } else {
      notionResult = await notion.callTool('notion_create_page', {
        workspace,
        data_source_id: dataSourceMeta.data_source_id,
        properties,
      });
      if (notionResult?.error) throw new Error(notionResult.error);
    }
  }

  const newNotionPageId = notionResult?.id || targetPageId;
  const newNotionUrl = notionResult?.url || null;

  // Write back to Substrate for stable mapping.
  // Avoid noisy updates if nothing changed.
  const desiredPatch = {
    notion_page_id: newNotionPageId || null,
    notion_url: newNotionUrl || recordData.notion_url || null,
    source_system: 'substrate',
  };
  const needsUpdate =
    (desiredPatch.notion_page_id && desiredPatch.notion_page_id !== recordData.notion_page_id) ||
    (desiredPatch.notion_url && desiredPatch.notion_url !== recordData.notion_url) ||
    recordData.source_system !== 'substrate';

  if (needsUpdate) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would update Substrate record ${substrateId} with notion_page_id/notion_url`);
    } else {
      const updated = await substrate.callTool('update_record', {
        record_id: substrateId,
        data: desiredPatch,
      });
      if (updated?.error) throw new Error(updated.error);
    }
  }

  return { notion_page_id: newNotionPageId, notion_url: newNotionUrl || recordData.notion_url || null };
}

async function sync() {
  const notion = await connect(NOTION_URL, NOTION_TOKEN);
  const substrate = await connect(SUBSTRATE_URL, SUBSTRATE_TOKEN);

  try {
    console.log(`Sync starting${DRY_RUN ? ' (dry-run)' : ''}...`);
    console.log(`Substrate: ${SUBSTRATE_URL}`);
    console.log(`Notion:    ${NOTION_URL}`);

    // -------------------------------------------------------------------------
    // 1) Substrate bootstrap: ensure workspace + tables (especially agents)
    // -------------------------------------------------------------------------
    const ws = await ensureSubstrateWorkspace(substrate);
    if (!ws && DRY_RUN) {
      console.log('[dry-run] Workspace not created; subsequent table checks will be skipped.');
    }

    // We want table IDs for relation columns (optional) in schemas.
    let tableIdsByName = {};
    if (ws) {
      const wsList = await substrate.callTool('list_workspaces', {});
      const wsExpanded = (wsList?.workspaces || []).find((w) => w.id === ws.id);
      for (const t of wsExpanded?.tables || []) {
        if (t?.name && t?.id) tableIdsByName[t.name] = t.id;
      }

      await ensureSubstrateTable(substrate, ws, 'clients', 'Client records for agency ops tracking', substrateSchemaByTable('clients'));
      await ensureSubstrateTable(substrate, ws, 'mcp_services', 'Managed MCP/service artifacts by client and engagement', substrateSchemaByTable('mcp_services'));
      await ensureSubstrateTable(substrate, ws, 'engagements', 'Engagements tracked against clients with service dependencies', substrateSchemaByTable('engagements', { clients: tableIdsByName.clients }));
      await ensureSubstrateTable(substrate, ws, 'agents', 'Agent artifacts (judgment + automation) tied to engagements and services', substrateSchemaByTable('agents'));
    }

    // Refresh ws/table ids after ensure operations
    const wsListAfter = await substrate.callTool('list_workspaces', {});
    const wsAfter = (wsListAfter?.workspaces || []).find((w) => w.name === WORKSPACE_NAME);
    if (!wsAfter) throw new Error(`Workspace missing in Substrate after ensure: ${WORKSPACE_NAME}`);
    const tableByName = new Map((wsAfter.tables || []).map((t) => [t.name, t]));
    const tableIdToName = new Map((wsAfter.tables || []).map((t) => [t.id, t.name]));

    // -------------------------------------------------------------------------
    // 2) Notion bootstrap: ensure ops data sources and required properties
    // -------------------------------------------------------------------------
    const workspace = 'client';

    const clientsMeta = await resolveDataSourceAndMeta(notion, workspace, ['Clients']);
    const engagementsMeta = await resolveDataSourceAndMeta(notion, workspace, ['Engagements']);
    const servicesMeta = await resolveDataSourceAndMeta(notion, workspace, ['MCP Services', 'MCP services', 'Services', 'mcp services']);

    // Agents DS may not exist yet.
    let agentsMeta = null;
    try {
      agentsMeta = await resolveDataSourceAndMeta(notion, workspace, ['Agents']);
    } catch {
      agentsMeta = null;
    }

    const requiredCommonProps = [{ name: 'Substrate ID', def: { rich_text: {} } }];

    // Ensure Substrate ID exists everywhere
    await ensureNotionDataSourceSchema(notion, workspace, clientsMeta, requiredCommonProps);
    await ensureNotionDataSourceSchema(notion, workspace, engagementsMeta, requiredCommonProps);
    await ensureNotionDataSourceSchema(notion, workspace, servicesMeta, requiredCommonProps);

    // Ensure MCP Services has a Client relation (optional but requested)
    const servicesSchema = await notion.callTool('notion_get_database', { workspace, data_source_id: servicesMeta.data_source_id });
    if (servicesSchema?.error) throw new Error(servicesSchema.error);
    const servicesPropTypes = buildPropIndex(servicesSchema.schema);
    if (!servicesPropTypes.byName.has('Client')) {
      await ensureNotionProperty(notion, workspace, servicesMeta, servicesSchema, 'Client', {
        relation: { database_id: clientsMeta.database_id, type: 'single_property', single_property: {} },
      });
    }

    // Ensure Agents database exists (create if missing)
    if (!agentsMeta) {
      const inferredParent = clientsMeta.parent_page_id || engagementsMeta.parent_page_id || servicesMeta.parent_page_id || '';
      const parent_page_id = NOTION_AGENCY_OPS_PARENT_PAGE_ID || inferredParent;
      if (!parent_page_id) {
        throw new Error(
          'Agents data source does not exist and parent page could not be inferred from existing ops databases. ' +
          'Set NOTION_AGENCY_OPS_PARENT_PAGE_ID to the Notion page where the ops databases live, then rerun.'
        );
      }

      if (DRY_RUN) {
        console.log(`[dry-run] Would create Notion "Agents" database under page ${parent_page_id}`);
        // Leave agentsMeta null; sync will skip agents without DS.
      } else {
        const created = await notion.callTool('notion_create_database', {
          workspace,
          parent_page_id,
          title: 'Agents',
          properties: {
            Name: { title: {} },
            Status: { select: { options: [{ name: 'draft' }, { name: 'active' }, { name: 'paused' }, { name: 'deprecated' }] } },
            Purpose: { rich_text: {} },
            'Primary interface': { select: { options: [{ name: 'codex' }, { name: 'claude' }, { name: 'cursor' }, { name: 'slack' }, { name: 'api' }] } },
            'Delivery mode': { select: { options: [{ name: 'agent-outcome-stack' }, { name: 'mcp-only' }] } },
            'Trigger types': { multi_select: { options: [{ name: 'schedule' }, { name: 'manual' }, { name: 'webhook' }, { name: 'slack_command' }, { name: 'api' }] } },
            'Schedule (UTC)': { rich_text: {} },
            Route: { rich_text: {} },
            'Repo / Config': { url: {} },
            Notes: { rich_text: {} },
            Client: { relation: { database_id: clientsMeta.database_id, type: 'single_property', single_property: {} } },
            Engagements: { relation: { database_id: engagementsMeta.database_id, type: 'single_property', single_property: {} } },
            'MCP services': { relation: { database_id: servicesMeta.database_id, type: 'single_property', single_property: {} } },
            'Substrate ID': { rich_text: {} },
          },
        });
        if (created?.error) throw new Error(created.error);
        console.log(`Created Notion Agents database (db:${created.id}, ds:${created.data_source_id})`);

        // Re-resolve metadata using the new data source id.
        agentsMeta = await resolveDataSourceAndMeta(notion, workspace, ['Agents']);
      }
    } else {
      await ensureNotionDataSourceSchema(notion, workspace, agentsMeta, requiredCommonProps);
    }

    // Load Notion schemas for all tables we will sync
    const clientsSchema = await notion.callTool('notion_get_database', { workspace, data_source_id: clientsMeta.data_source_id });
    if (clientsSchema?.error) throw new Error(clientsSchema.error);
    const engagementsSchema = await notion.callTool('notion_get_database', { workspace, data_source_id: engagementsMeta.data_source_id });
    if (engagementsSchema?.error) throw new Error(engagementsSchema.error);
    const servicesSchema2 = await notion.callTool('notion_get_database', { workspace, data_source_id: servicesMeta.data_source_id });
    if (servicesSchema2?.error) throw new Error(servicesSchema2.error);
    const agentsSchema = agentsMeta
      ? await notion.callTool('notion_get_database', { workspace, data_source_id: agentsMeta.data_source_id })
      : null;
    if (agentsSchema?.error) throw new Error(agentsSchema.error);

    // Build Notion Substrate ID → page ID maps (duplicates fail fast)
    const notionClientsMap = await buildNotionSubstrateIdMap(notion, workspace, clientsMeta, clientsSchema);
    const notionEngagementsMap = await buildNotionSubstrateIdMap(notion, workspace, engagementsMeta, engagementsSchema);
    const notionServicesMap = await buildNotionSubstrateIdMap(notion, workspace, servicesMeta, servicesSchema2);
    const notionAgentsMap = agentsMeta && agentsSchema ? await buildNotionSubstrateIdMap(notion, workspace, agentsMeta, agentsSchema) : new Map();

    // -------------------------------------------------------------------------
    // 3) Upsert Notion pages from Substrate (with write-back pointers)
    // -------------------------------------------------------------------------
    const substrateClients = await substrateFindAllRecords(substrate, 'clients');
    const substrateEngagements = await substrateFindAllRecords(substrate, 'engagements');
    const substrateServices = await substrateFindAllRecords(substrate, 'mcp_services');
    const substrateAgents = tableByName.has('agents') ? await substrateFindAllRecords(substrate, 'agents') : [];

    console.log(`Substrate records: clients=${substrateClients.length} engagements=${substrateEngagements.length} mcp_services=${substrateServices.length} agents=${substrateAgents.length}`);

    const clientIdToNotionPageId = new Map();
    const engagementIdToNotionPageId = new Map();
    const serviceIdToNotionPageId = new Map();
    const agentIdToNotionPageId = new Map();

    // Clients
    for (const rec of substrateClients) {
      const data = rec.data || {};
      const out = await upsertNotionPage({
        notion,
        workspace,
        dataSourceMeta: clientsMeta,
        dataSourceSchema: clientsSchema,
        substrate,
        substrateRecord: rec,
        notionPageIdFromMap: notionClientsMap,
        buildValues: () => ({
          __title: data.name || rec.id,
          Status: data.status || null,
          'Primary channel': data.primary_channel || null,
          Priority: data.priority || null,
          Notes: data.notes || '',
          'Substrate ID': rec.id,
        }),
      });
      if (out.notion_page_id) clientIdToNotionPageId.set(rec.id, out.notion_page_id);
    }

    // Build engagement→client mapping (Substrate IDs) for derived client relations
    const engagementToClientIds = new Map();

    // Engagements
    for (const rec of substrateEngagements) {
      const data = rec.data || {};
      const full = await substrate.callTool('get_record', { record_id: rec.id });
      if (full?.error) throw new Error(full.error);
      const relations = full.relations || [];
      const clientIds = relatedRecordIds(relations, rec.id, tableByName.get('clients')?.id);
      engagementToClientIds.set(rec.id, uniq(clientIds));

      const clientPageIds = uniq(clientIds.map((id) => clientIdToNotionPageId.get(id)).filter(Boolean));
      const out = await upsertNotionPage({
        notion,
        workspace,
        dataSourceMeta: engagementsMeta,
        dataSourceSchema: engagementsSchema,
        substrate,
        substrateRecord: rec,
        notionPageIdFromMap: notionEngagementsMap,
        buildValues: () => ({
          __title: data.name || rec.id,
          Status: data.status || null,
          Phase: data.phase || null,
          'Contracted scope': data.contracted_scope || '',
          'Start date': data.start_date || null,
          Criticality: data.criticality || null,
          'Repo / config': data.repo_or_config || null,
          Dependencies: data.dependencies || '',
          'Next review': data.next_review || null,
          SLA: data.sla || null,
          'Risk / blockers': data.risk_blockers || '',
          Client: clientPageIds,
          'Substrate ID': rec.id,
        }),
      });
      if (out.notion_page_id) engagementIdToNotionPageId.set(rec.id, out.notion_page_id);
    }

    // MCP Services
    for (const rec of substrateServices) {
      const data = rec.data || {};
      const full = await substrate.callTool('get_record', { record_id: rec.id });
      if (full?.error) throw new Error(full.error);
      const relations = full.relations || [];

      const engagementIds = relatedRecordIds(relations, rec.id, tableByName.get('engagements')?.id);
      const directClientIds = relatedRecordIds(relations, rec.id, tableByName.get('clients')?.id);
      const derivedClientIds = uniq([
        ...directClientIds,
        ...engagementIds.flatMap((eid) => engagementToClientIds.get(eid) || []),
      ]);

      const engagementPageIds = uniq(engagementIds.map((id) => engagementIdToNotionPageId.get(id)).filter(Boolean));
      const clientPageIds = uniq(derivedClientIds.map((id) => clientIdToNotionPageId.get(id)).filter(Boolean));

      const out = await upsertNotionPage({
        notion,
        workspace,
        dataSourceMeta: servicesMeta,
        dataSourceSchema: servicesSchema2,
        substrate,
        substrateRecord: rec,
        notionPageIdFromMap: notionServicesMap,
        buildValues: () => ({
          __title: data.name || rec.id,
          Status: data.status || null,
          'Last Review': data.last_review || null,
          Endpoint: data.endpoint || null,
          'Repo / Config': data.repo_or_config || null,
          Category: data.category || null,
          Notes: data.notes || '',
          Engagements: engagementPageIds,
          Client: clientPageIds,
          'Substrate ID': rec.id,
        }),
      });
      if (out.notion_page_id) serviceIdToNotionPageId.set(rec.id, out.notion_page_id);
    }

    // Agents (optional; only if Agents data source exists)
    if (agentsMeta && agentsSchema) {
      for (const rec of substrateAgents) {
        const data = rec.data || {};
        const full = await substrate.callTool('get_record', { record_id: rec.id });
        if (full?.error) throw new Error(full.error);
        const relations = full.relations || [];

        const engagementIds = relatedRecordIds(relations, rec.id, tableByName.get('engagements')?.id);
        const directClientIds = relatedRecordIds(relations, rec.id, tableByName.get('clients')?.id);
        const serviceIds = relatedRecordIds(relations, rec.id, tableByName.get('mcp_services')?.id);

        const derivedClientIds = uniq([
          ...directClientIds,
          ...engagementIds.flatMap((eid) => engagementToClientIds.get(eid) || []),
        ]);

        const engagementPageIds = uniq(engagementIds.map((id) => engagementIdToNotionPageId.get(id)).filter(Boolean));
        const clientPageIds = uniq(derivedClientIds.map((id) => clientIdToNotionPageId.get(id)).filter(Boolean));
        const servicePageIds = uniq(serviceIds.map((id) => serviceIdToNotionPageId.get(id)).filter(Boolean));

        const out = await upsertNotionPage({
          notion,
          workspace,
          dataSourceMeta: agentsMeta,
          dataSourceSchema: agentsSchema,
          substrate,
          substrateRecord: rec,
          notionPageIdFromMap: notionAgentsMap,
          buildValues: () => ({
            __title: data.name || rec.id,
            Status: data.status || null,
            Purpose: data.purpose || '',
            'Primary interface': data.primary_interface || null,
            'Delivery mode': data.delivery_mode || null,
            'Trigger types': data.trigger_types || [],
            'Schedule (UTC)': data.schedule_utc || '',
            Route: data.route || '',
            'Repo / Config': data.repo_or_config || null,
            Notes: data.notes || '',
            Engagements: engagementPageIds,
            Client: clientPageIds,
            'MCP services': servicePageIds,
            'Substrate ID': rec.id,
          }),
        });
        if (out.notion_page_id) agentIdToNotionPageId.set(rec.id, out.notion_page_id);
      }
    } else {
      console.log('Skipping agents sync: Notion Agents data source not available (dry-run create or missing).');
    }

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('Sync complete.', {
      dry_run: DRY_RUN,
      notion: {
        clients: clientIdToNotionPageId.size,
        engagements: engagementIdToNotionPageId.size,
        mcp_services: serviceIdToNotionPageId.size,
        agents: agentIdToNotionPageId.size,
      },
      substrate: {
        workspace: WORKSPACE_NAME,
      },
    });
  } finally {
    notion.close();
    substrate.close();
  }
}

await sync();
