import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import fs from 'node:fs';

const NOTION_URL = 'https://createsomething-notion.mcp.workway.co/mcp';
const SUBSTRATE_URL = 'https://substrate.mcp.createsomething.agency/mcp';

const NOTION_TOKEN = process.env.NOTION_SYNC_BEARER_TOKEN;

function readSubstrateTokenFromDisk() {
  const home = process.env.HOME;
  if (!home) return '';
  const tokenPath = `${home}/.config/create-something/substrate/substrate_admin.token`;
  if (!fs.existsSync(tokenPath)) return '';
  return fs.readFileSync(tokenPath, 'utf8').trim();
}

const SUBSTRATE_TOKEN = process.env.SUBSTRATE_ADMIN_TOKEN || process.env.SUBSTRATE_TOKEN || readSubstrateTokenFromDisk();

const WORKSPACE = 'CREATE SOMETHING Agency Ops';

const NOTION_DATABASE_HINTS = {
  clients: ['clients'],
  engagements: ['engagements'],
  services: ['mcp services', 'services'],
  milestones: ['delivery milestones'],
};

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

  const client = new Client({ name: 'agency-ops-sync', version: '1.0.0' }, { capabilities: {} });
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

function plainTextOrEmpty(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  const arr = v.title || v.rich_text || [];
  return Array.isArray(arr) ? arr.map((x) => x.plain_text || '').join('') : '';
}

function asSelect(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.name || '';
}

function toDate(v) {
  return v?.start || null;
}

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

function inferEngagementForMilestone(m) {
  const text = normalize(`${m.title} ${m.deliverable}`);
  const direct = {
    'handoff playbook and support cadence': 'half dozen — mcp fleet',
    'half dozen codex onboarding': 'half dozen — mcp fleet',
    'onboard client + connect mcp endpoints': 'half dozen — mcp fleet',
    'outerfields client video upload pipeline': 'outerfields — pcn platform',
    'outerfields: client video upload pipeline': 'outerfields — pcn platform',
    'outerfields the stack venture support': 'outerfields — the stack',
    'quarterly governance review': null,
  };

  if (direct[text]) return direct[text];

  const map = [
    ['outerfields', 'outerfields — pcn platform'],
    ['pcn', 'outerfields — pcn platform'],
    ['stack', 'outerfields — the stack'],
    ['codex', 'half dozen — mcp fleet'],
    ['gmail', 'half dozen — mcp fleet'],
    ['handoff', 'half dozen — mcp fleet'],
  ];

  for (const [needle, engName] of map) {
    if (text.includes(needle)) return engName;
  }

  return null;
}

async function notionListAllDatabases(callTool, workspace) {
  let startCursor;
  const dbs = [];

  do {
    const page = await callTool('notion_list_databases', {
      workspace,
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });

    if (!page || !Array.isArray(page.data_sources)) {
      throw new Error(`notion_list_databases returned invalid response for ${workspace}`);
    }

    dbs.push(...page.data_sources);
    startCursor = page.has_more ? page.next_cursor : undefined;
  } while (startCursor);

  return dbs;
}

function parseClients(rows) {
  return rows.map((r) => ({
    notion_id: r.id,
    notion_url: r.url,
    name: plainTextOrEmpty(r.properties?.Name),
    status: asSelect(r.properties?.Status?.status),
    primary_channel: asSelect(r.properties?.['Primary channel']?.select),
    priority: asSelect(r.properties?.Priority?.select),
    notes: plainTextOrEmpty(r.properties?.Notes),
  }));
}

function parseEngagements(rows) {
  return rows.map((r) => ({
    notion_id: r.id,
    notion_url: r.url,
    name: plainTextOrEmpty(r.properties?.Name),
    status: asSelect(r.properties?.Status?.status),
    phase: asSelect(r.properties?.Phase?.select),
    contracted_scope: plainTextOrEmpty(r.properties?.['Contracted scope']),
    start_date: toDate(r.properties?.['Start date']?.date),
    criticality: asSelect(r.properties?.Criticality?.select),
    repo_or_config: r.properties?.['Repo / config']?.url || null,
    dependencies: plainTextOrEmpty(r.properties?.Dependencies),
    next_review: toDate(r.properties?.['Next review']?.date),
    sla: asSelect(r.properties?.SLA?.select),
    risk_blockers: plainTextOrEmpty(r.properties?.['Risk / blockers']),
    client_relations: (r.properties?.Client?.relation || []).map((x) => x.id),
    service_relations: (r.properties?.['Services used']?.relation || []).map((x) => x.id),
  }));
}

function parseServices(rows) {
  return rows.map((r) => ({
    notion_id: r.id,
    notion_url: r.url,
    name: plainTextOrEmpty(r.properties?.Service),
    status: asSelect(r.properties?.Status?.select),
    last_review: toDate(r.properties?.['Last Review']?.date),
    endpoint: r.properties?.Endpoint?.url || null,
    repo_or_config: r.properties?.['Repo / Config']?.url || null,
    category: asSelect(r.properties?.Category?.select),
    notes: plainTextOrEmpty(r.properties?.Notes),
    engagement_relations: (r.properties?.Engagements?.relation || []).map((x) => x.id),
  }));
}

function parseMilestones(rows) {
  return rows.map((r) => ({
    notion_id: r.id,
    notion_url: r.url,
    title: plainTextOrEmpty(r.properties?.Milestone),
    status: asSelect(r.properties?.Status?.select),
    due_date: toDate(r.properties?.['Due date']?.date),
    deliverable: plainTextOrEmpty(r.properties?.Deliverable),
    delivery_notes: plainTextOrEmpty(r.properties?.['Delivery notes']),
  }));
}

function tableSchemaByName(name, idByName = {}) {
  const colDefaults = {
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
      { name: 'client_id', type: 'relation', relation_table_id: idByName.clients, required: false },
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
    delivery_milestones: [
      { name: 'milestone', type: 'text', required: true },
      { name: 'status', type: 'select', required: false },
      { name: 'due_date', type: 'date', required: false },
      { name: 'deliverable', type: 'text', required: false },
      { name: 'delivery_notes', type: 'text', required: false },
      { name: 'owner', type: 'text', required: false },
      { name: 'engagement_id', type: 'relation', relation_table_id: idByName.engagements, required: false },
      { name: 'notion_page_id', type: 'text', required: false },
      { name: 'notion_url', type: 'url', required: false },
      { name: 'source_system', type: 'text', required: false },
    ],
  };

  return colDefaults[name] || [];
}

function addMissingColumns(existingCols, desiredCols) {
  const wanted = new Map(existingCols.map((c) => [c.name, c]));
  return desiredCols.filter((col) => !wanted.has(col.name));
}

async function ensureWorkspace(substrate, name) {
  const ws = await substrate.callTool('list_workspaces', {});
  const existing = (ws.workspaces || []).find((w) => w.name === name);
  if (existing) {
    console.log(`Found substrate workspace: ${name} (${existing.id})`);
    return existing;
  }

  const created = await substrate.callTool('create_workspace', {
    name,
    description: 'Source-of-truth ops state for agency engagements and services.',
  });

  if (created.error) throw new Error(created.error);
  console.log(`Created substrate workspace: ${name} (${created.workspace.id})`);
  return created.workspace;
}

async function resolveDataSource(callTool, workspace, candidateTitles) {
  const databases = await notionListAllDatabases(callTool, workspace);
  const normalized = candidateTitles.map(normalize);

  for (const db of databases) {
    const title = plainTextOrEmpty(db.title).toLowerCase();
    if (normalized.includes(title)) {
      return db.id;
    }
  }

  const options = databases.map((db) => plainTextOrEmpty(db.title)).join(', ');
  throw new Error(`Could not find any data source named ${candidateTitles.join(', ')} in ${workspace} workspace. Found: ${options}`);
}

async function ensureTable(substrate, workspaceId, name, description, columns) {
  const ws = await substrate.callTool('list_workspaces', {});
  const targetWorkspace = (ws?.workspaces || []).find((w) => w.id === workspaceId);
  let table = (targetWorkspace?.tables || []).find((t) => t && t.name === name);

  if (!table) {
    const created = await substrate.callTool('define_table', {
      workspace_id: workspaceId,
      name,
      description,
      columns,
    });

    if (created.error) throw new Error(created.error);
    console.log(`Created table ${name} (${created.table.id})`);
    return created.table;
  }

  const missing = addMissingColumns(table.columns || [], columns);
  if (missing.length > 0) {
    const updated = await substrate.callTool('update_table', {
      table_id: table.id,
      columns: [...(table.columns || []), ...missing],
    });

    if (updated.error) throw new Error(updated.error);
    table = updated.table || table;
    console.log(`Updated table ${name}, added ${missing.length} columns.`);
  }

  return table;
}

async function notionQueryAll(callTool, dataSourceId, titleProp) {
  const all = [];
  let cursor;

  do {
    const page = await callTool('notion_query_database', {
      workspace: 'client',
      data_source_id: dataSourceId,
      filter: JSON.stringify({ property: titleProp, title: { is_not_empty: true } }),
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    if (!page || !Array.isArray(page.results)) {
      throw new Error(`notion_query_database returned invalid result for ${dataSourceId}`);
    }

    all.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);

  return all;
}

function findRecordByNotionId(records, notionId) {
  return (records || []).find((r) => r?.data?.notion_page_id === notionId);
}

async function upsertRecords(substrate, tableName, rows, transform) {
  const existingPage = await substrate.callTool('find_records', {
    workspace_name: WORKSPACE,
    table_name: tableName,
    limit: 100,
  });

  if (existingPage.error) throw new Error(existingPage.error);

  const existing = existingPage.records || [];
  const recordByNotion = new Map(existing.map((r) => [r.data?.notion_page_id, r]));
  const out = new Map();

  for (const row of rows) {
    const data = transform(row);
    const existingRecord = findRecordByNotionId(existing, row.notion_id);
    let rec;

    if (existingRecord) {
      const changed = await substrate.callTool('update_record', {
        record_id: existingRecord.id,
        data,
      });
      if (changed.error) throw new Error(changed.error);
      rec = changed.record || changed.data || changed;
      console.log(`Updated ${tableName}: ${data.name || data.milestone || row.notion_id}`);
    } else {
      const created = await substrate.callTool('add_record', {
        workspace_name: WORKSPACE,
        table_name: tableName,
        data,
      });
      if (created.error) throw new Error(created.error);
      rec = created.record;
      console.log(`Created ${tableName}: ${data.name || data.milestone || row.notion_id}`);
    }

    out.set(row.notion_id, rec);
  }

  return out;
}

function isRelationExists(recordInfo, targetId) {
  return (recordInfo?.relations || []).some((r) => r.source_record_id === targetId || r.target_record_id === targetId);
}

function dedupeCreateRelations(relations) {
  const seen = new Set();
  const out = [];

  for (const r of relations) {
    const key = [r.source_table_id, r.source_record_id, r.target_table_id, r.target_record_id, r.relation_name].join('|');
    const rev = [r.target_table_id, r.target_record_id, r.source_table_id, r.source_record_id, r.relation_name].join('|');
    if (seen.has(key) || seen.has(rev)) continue;
    seen.add(key);
    out.push(r);
  }

  return out;
}

async function relationExists(substrate, sourceRecordId, targetRecordId) {
  const rec = await substrate.callTool('get_record', { record_id: sourceRecordId });
  if (rec.error) return false;
  return isRelationExists(rec.record || rec, targetRecordId);
}

async function upsertAgencies(context) {
  const clients = parseClients(await notionQueryAll(context.notion.callTool, context.ids.clients, 'Name'));
  const engagements = parseEngagements(await notionQueryAll(context.notion.callTool, context.ids.engagements, 'Name'));
  const services = parseServices(await notionQueryAll(context.notion.callTool, context.ids.services, 'Service'));
  const milestones = parseMilestones(await notionQueryAll(context.notion.callTool, context.ids.milestones, 'Milestone'));

  console.log(`Fetched Notion rows => clients:${clients.length} engagements:${engagements.length} services:${services.length} milestones:${milestones.length}`);

  const ws = await ensureWorkspace(context.substrate, WORKSPACE);
  const clientsTable = await ensureTable(context.substrate, ws.id, 'clients', 'Client records for agency ops tracking', tableSchemaByName('clients'));
  const servicesTable = await ensureTable(context.substrate, ws.id, 'mcp_services', 'Managed MCP/service artifacts by client and engagement', tableSchemaByName('mcp_services'));
  const engagementsTable = await ensureTable(
    context.substrate,
    ws.id,
    'engagements',
    'Engagements tracked against clients with service dependencies',
    tableSchemaByName('engagements', { clients: clientsTable.id })
  );
  const milestonesTable = await ensureTable(
    context.substrate,
    ws.id,
    'delivery_milestones',
    'Delivery milestones tied to engagements',
    tableSchemaByName('delivery_milestones', { engagements: engagementsTable.id })
  );

  const tableNameMap = {
    clients: clientsTable.id,
    engagements: engagementsTable.id,
    mcp_services: servicesTable.id,
    delivery_milestones: milestonesTable.id,
  };

  const clientRecords = await upsertRecords(context.substrate, 'clients', clients, (c) => ({
    name: c.name,
    status: c.status || 'active',
    primary_channel: c.primary_channel || null,
    priority: c.priority || null,
    notes: c.notes || '',
    notion_page_id: c.notion_id,
    notion_url: c.notion_url,
    source_system: 'notion',
  }));

  const serviceRecords = await upsertRecords(context.substrate, 'mcp_services', services, (s) => ({
    name: s.name,
    status: s.status || 'active',
    last_review: s.last_review || null,
    endpoint: s.endpoint || null,
    repo_or_config: s.repo_or_config || null,
    owner: 'n/a',
    notes: s.notes || '',
    category: s.category || null,
    notion_page_id: s.notion_id,
    notion_url: s.notion_url,
    source_system: 'notion',
  }));

  const engagementRecords = await upsertRecords(context.substrate, 'engagements', engagements, (e) => ({
    name: e.name,
    status: e.status || 'active',
    phase: e.phase || null,
    contracted_scope: e.contracted_scope || '',
    start_date: e.start_date || null,
    criticality: e.criticality || null,
    repo_or_config: e.repo_or_config || null,
    dependencies: e.dependencies || '',
    next_review: e.next_review || null,
    sla: e.sla || null,
    risk_blockers: e.risk_blockers || '',
    notion_page_id: e.notion_id,
    notion_url: e.notion_url,
    source_system: 'notion',
  }));

  const milestoneRecords = await upsertRecords(context.substrate, 'delivery_milestones', milestones, (m) => ({
    milestone: m.title,
    status: m.status || 'in_progress',
    due_date: m.due_date || null,
    deliverable: m.deliverable || '',
    delivery_notes: m.delivery_notes || '',
    owner: '',
    notion_page_id: m.notion_id,
    notion_url: m.notion_url,
    source_system: 'notion',
  }));

  const relationsToCreate = [];

  for (const e of engagements) {
    const eRec = engagementRecords.get(e.notion_id);
    if (!eRec) continue;

    for (const c of e.client_relations) {
      const cRec = clientRecords.get(c);
      if (cRec) {
        relationsToCreate.push({
          source_table_id: tableNameMap.engagements,
          source_record_id: eRec.id,
          target_table_id: tableNameMap.clients,
          target_record_id: cRec.id,
          relation_name: 'client',
        });
      }
    }

    for (const s of e.service_relations) {
      const sRec = serviceRecords.get(s);
      if (sRec) {
        relationsToCreate.push({
          source_table_id: tableNameMap.engagements,
          source_record_id: eRec.id,
          target_table_id: tableNameMap.mcp_services,
          target_record_id: sRec.id,
          relation_name: 'services',
        });
      }
    }
  }

  for (const s of services) {
    const sRec = serviceRecords.get(s.notion_id);
    if (!sRec) continue;

    for (const e of s.engagement_relations) {
      const eRec = engagementRecords.get(e);
      if (eRec) {
        relationsToCreate.push({
          source_table_id: tableNameMap.mcp_services,
          source_record_id: sRec.id,
          target_table_id: tableNameMap.engagements,
          target_record_id: eRec.id,
          relation_name: 'engagement',
        });
      }
    }
  }

  for (const m of milestones) {
    const mRec = milestoneRecords.get(m.notion_id);
    if (!mRec) continue;

    const inferredName = inferEngagementForMilestone(m, engagements);
    if (inferredName) {
      const found = engagements.find((e) => normalize(e.name) === inferredName);
      if (found) {
        const eRec = engagementRecords.get(found.notion_id);
        if (eRec) {
          relationsToCreate.push({
            source_table_id: tableNameMap.delivery_milestones,
            source_record_id: mRec.id,
            target_table_id: tableNameMap.engagements,
            target_record_id: eRec.id,
            relation_name: 'engagement',
          });
        }
      }
    }
  }

  const uniqueRelations = dedupeCreateRelations(relationsToCreate);
  for (const rel of uniqueRelations) {
    try {
      const exists = await relationExists(context.substrate, rel.source_record_id, rel.target_record_id);
      if (exists) {
        continue;
      }
      const created = await context.substrate.callTool('create_relation', {
        source_table_id: rel.source_table_id,
        source_record_id: rel.source_record_id,
        target_table_id: rel.target_table_id,
        target_record_id: rel.target_record_id,
        relation_name: rel.relation_name,
      });

      if (!created?.error) {
        console.log(`Created relation (${rel.relation_name})`);
      }
    } catch (err) {
      console.warn('Relation create failed:', rel, err?.message || err);
    }
  }

  return { clientRecords: clientRecords.size, engagementRecords: engagementRecords.size, serviceRecords: serviceRecords.size, milestoneRecords: milestoneRecords.size };
}

async function build() {
  const notion = await connect(NOTION_URL, NOTION_TOKEN);
  const substrate = await connect(SUBSTRATE_URL, SUBSTRATE_TOKEN);

  try {

    const ids = {
      clients: resolveDataSource(notion.callTool, 'client', NOTION_DATABASE_HINTS.clients),
      engagements: resolveDataSource(notion.callTool, 'client', NOTION_DATABASE_HINTS.engagements),
      services: resolveDataSource(notion.callTool, 'client', NOTION_DATABASE_HINTS.services),
      milestones: resolveDataSource(notion.callTool, 'client', NOTION_DATABASE_HINTS.milestones),
    };

    const resolved = {
      clients: await ids.clients,
      engagements: await ids.engagements,
      services: await ids.services,
      milestones: await ids.milestones,
    };

    const result = await upsertAgencies(
      {
        notion,
        substrate,
        ids: resolved,
      },
    );

    console.log('Agency Ops substrate mirror sync complete.', result);
  } finally {
    notion.close();
    substrate.close();
  }
}

await build();
