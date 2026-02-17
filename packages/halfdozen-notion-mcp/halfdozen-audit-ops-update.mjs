import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = 'https://createsomething-notion.mcp.workway.co/mcp';
const token = process.env.NOTION_SYNC_BEARER_TOKEN;
if (!token) throw new Error('Missing NOTION_SYNC_BEARER_TOKEN');

const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});

const client = new Client({ name: 'halfdozen-ops-audit', version: '1.0.0' }, { capabilities: {} });

async function callTool(name, args) {
  const out = await client.callTool({ name, arguments: args });
  const text = out.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

await client.connect(transport);

function parseResults(rows) {
  return (rows.results || []).map((r) => ({
    id: r.id,
    title: (r.properties?.Name?.title || []).map((x) => x.plain_text || '').join('') || r.plain_text,
    name: r.name,
    object: r.object,
  }));
}

const clientsDS = '761c843e-3e55-4389-a4a0-043e9d0f2e6e';
const engagementsDS = 'd3873b66-762c-4f3a-bd9e-97267f58faf5';

const clientSearch = await callTool('notion_search', {
  workspace: 'client',
  query: 'Clients',
  filter_type: 'data_source',
});
const engagementSearch = await callTool('notion_search', {
  workspace: 'client',
  query: 'Engagements',
  filter_type: 'data_source',
});

const clientsMeta = clientSearch.results?.find((d) => d.title?.[0]?.plain_text === 'Clients');
const engagementsMeta = engagementSearch.results?.find((d) => d.title?.[0]?.plain_text === 'Engagements');

if (!clientsMeta || !engagementsMeta) {
  throw new Error('Could not resolve Clients/Engagements metadata from notion_search.');
}

console.log('Clients meta:', clientsMeta.id, clientsMeta.parent?.database_id ? '' : '');
console.log('Engagements meta:', engagementsMeta.id, engagementsMeta.parent?.database_id ? '' : '');

const clientsDatabaseId = clientsMeta.parent?.database_id;
const engagementsDatabaseId = engagementsMeta.parent?.database_id;
if (!clientsDatabaseId || !engagementsDatabaseId) {
  throw new Error('Could not resolve backing database id from search metadata.');
}

const clientsSchema = await callTool('notion_get_database', { workspace: 'client', data_source_id: clientsDS });
const engagementsSchema = await callTool('notion_get_database', { workspace: 'client', data_source_id: engagementsDS });

console.log('Clients schema names:', clientsSchema.schema.map((s) => s.name));
console.log('Engagements schema names:', engagementsSchema.schema.map((s) => s.name));

// Add missing engagement operational fields.
const addEngagementProps = {
  'Service owner': {
    people: {},
  },
  'SLA': {
    select: {
      options: [
        { name: 'Critical' },
        { name: 'Standard' },
        { name: 'Best effort' },
      ],
    },
  },
  Criticality: {
    select: {
      options: [
        { name: 'High' },
        { name: 'Medium' },
        { name: 'Low' },
      ],
    },
  },
  'Contracted scope': {
    rich_text: {},
  },
  Dependencies: {
    rich_text: {},
  },
  'Risk / blockers': {
    rich_text: {},
  },
};

const clientExistsProp = new Set(engagementsSchema.schema.map((s) => s.name));
const engagementPropertiesToAdd = Object.entries(addEngagementProps).filter(
  ([name]) => !clientExistsProp.has(name),
);

if (engagementPropertiesToAdd.length > 0) {
  const res = await callTool('notion_update_database', {
    workspace: 'client',
    database_id: engagementsDatabaseId,
    data_source_id: engagementsDS,
    properties: Object.fromEntries(engagementPropertiesToAdd),
  });
  console.log('Added engagement properties:', JSON.stringify(res, null, 2));
} else {
  console.log('All requested engagement properties already exist.');
}

// Add missing client setup fields.
const addClientProps = {
  'Primary channel': {
    select: {
      options: [
        { name: 'Slack' },
        { name: 'Email' },
        { name: 'Notion' },
        { name: 'Other' },
      ],
    },
  },
  Priority: {
    select: {
      options: [
        { name: 'P0' },
        { name: 'P1' },
        { name: 'P2' },
      ],
    },
  },
};

const clientSchemaNames = new Set(clientsSchema.schema.map((s) => s.name));
const clientPropertiesToAdd = Object.entries(addClientProps).filter(
  ([name, def]) => {
    const exists = clientsSchema.schema.find((s) => s.name === name);
    // If property exists but type mismatch, we'll still leave it alone for safety.
    if (!exists) return true;
    return false;
  },
);

if (clientPropertiesToAdd.length > 0) {
  const clientRes = await callTool('notion_update_database', {
    workspace: 'client',
    database_id: clientsDatabaseId,
    data_source_id: clientsDS,
    properties: Object.fromEntries(clientPropertiesToAdd),
  });
  console.log('Added client properties:', JSON.stringify(clientRes, null, 2));
} else {
  console.log('Client properties already present.');
}

// Resolve the Half Dozen engagement page and child database IDs
const engQuery = await callTool('notion_query_database', {
  workspace: 'client',
  data_source_id: engagementsDS,
  filter: JSON.stringify({
    property: 'Name',
    title: {
      equals: 'Half Dozen — MCP Fleet',
    },
  }),
  page_size: 10,
});
const milestoneParentPage = engQuery.results?.[0]?.id;
if (!milestoneParentPage) throw new Error('Could not find Half Dozen — MCP Fleet engagement page row.');

// Verify whether Delivery Milestones already exists
const existingMilestones = await callTool('notion_search', {
  workspace: 'client',
  query: 'Delivery Milestones',
  filter_type: 'data_source',
});

const existingInEngagement = existingMilestones.results?.some((item) => {
  if (item.object !== 'data_source') return false;
  const title = item.title?.map((t) => t.plain_text).join('') || '';
  const dbParent = item.database_parent?.page_id;
  return title === 'Delivery Milestones' && dbParent === milestoneParentPage;
});

if (existingInEngagement) {
  console.log('Delivery Milestones already exists under this engagement page.');
} else {
  const createMilestones = await callTool('notion_create_database', {
    workspace: 'client',
    parent_page_id: milestoneParentPage,
    title: 'Delivery Milestones',
    is_inline: true,
    properties: {
      'Milestone': { title: {} },
      Status: {
        select: {
          options: [
            { name: 'Planned' },
            { name: 'In progress' },
            { name: 'Blocked' },
            { name: 'Done' },
          ],
        },
      },
      'Owner': { people: {} },
      'Due date': { date: {} },
      Deliverable: { rich_text: {} },
      'Delivery notes': { rich_text: {} },
      'Engagement': {
        relation: {
          database_id: engagementsDatabaseId,
          type: 'single_property',
          single_property: {},
        },
      },
    },
  });
  console.log('Created Delivery Milestones DB:', JSON.stringify(createMilestones, null, 2));

  const milestonesDataSource = createMilestones.data_source_id;
  // Seed with baseline milestones
  const milestones = [
    {
      Milestone: [{ text: { content: 'Onboard client + connect service endpoints' }],
      Status: { select: { name: 'Done' } },
      'Due date': { date: { start: '2026-02-17' } },
      Deliverable: { rich_text: [{ text: { content: 'Confirm access to all service MCP endpoints and ownership roles.' } } ],
      },
      'Delivery notes': { rich_text: [{ text: { content: 'Baseline environment verified for Notion, Gmail, Zoom, YouTube, Telemetry MCP endpoints.' } } ] },
      'Engagement': [{ id: milestoneParentPage }],
    },
    {
      Milestone: [{ text: { content: 'Stabilize monitoring and alerting handoff' }],
      Status: { select: { name: 'In progress' } },
      'Due date': { date: { start: '2026-03-15' } },
      Deliverable: { rich_text: [{ text: { content: 'Set up weekly review process and incident escalation.' } }] ,
      },
      'Delivery notes': { rich_text: [{ text: { content: 'Create ops rhythm and define criticality thresholds.' } }] },
      'Engagement': [{ id: milestoneParentPage }],
    },
    {
      Milestone: [{ text: { content: 'Service governance + quarterly review' }],
      Status: { select: { name: 'Planned' } },
      'Due date': { date: { start: '2026-03-31' } },
      Deliverable: { rich_text: [{ text: { content: 'Document ownership, change control, and review cadence.' } }] ,
      },
      'Delivery notes': { rich_text: [{ text: { content: 'To be coordinated with client ops lead.' } }] },
      'Engagement': [{ id: milestoneParentPage }],
    },
  ];

  for (const m of milestones) {
    const createRow = await callTool('notion_create_page', {
      workspace: 'client',
      data_source_id: milestonesDataSource,
      properties: {
        Milestone: { title: m.Milestone },
        Status: m.Status,
        Owner: { people: [] },
        'Due date': m['Due date'],
        Deliverable: m.Deliverable,
        'Delivery notes': m['Delivery notes'],
        'Engagement': {
          relation: [{ id: milestoneParentPage }],
        },
      },
    });
    console.log('Created milestone row:', createRow.url || createRow.id);
  }
}

// Ensure Half Dozen client fields populated with operational values
const halfDozenClientQuery = await callTool('notion_query_database', {
  workspace: 'client',
  data_source_id: clientsDS,
  filter: JSON.stringify({
    property: 'Name',
    title: { equals: 'Half Dozen' },
  }),
  page_size: 10,
});
const halfDozenClient = halfDozenClientQuery.results?.[0];
if (halfDozenClient?.id) {
  const updatedClient = await callTool('notion_update_page', {
    workspace: 'client',
    page_id: halfDozenClient.id,
    properties: {
      'Primary channel': { select: { name: 'Notion' } },
      Priority: { select: { name: 'P1' } },
    },
  });
  console.log('Updated Half Dozen client:', JSON.stringify(updatedClient, null, 2));
}

// Set initial governance fields on Half Dozen engagement
const halfDozenEngagement = engQuery.results?.[0];
if (halfDozenEngagement?.id) {
  const updateEng = await callTool('notion_update_page', {
    workspace: 'client',
    page_id: halfDozenEngagement.id,
    properties: {
      'Service owner': { people: [] },
      'SLA': { select: { name: 'Standard' } },
      Criticality: { select: { name: 'High' } },
      'Contracted scope': { rich_text: [{ text: { content: 'Ongoing MCP infrastructure operations and service reliability support for Notion, Gmail, Zoom, YouTube, and telemetry services.' } }] },
      Dependencies: { rich_text: [{ text: { content: 'Cross-service auth keys and client workspace permission for each MCP.' } }] },
      'Risk / blockers': { rich_text: [{ text: { content: 'Awaiting confirmation on escalation and paging ownership for critical incidents.' } }] },
      'Start date': { date: { start: '2026-02-17' } },
      'Next review': { date: { start: '2026-03-03' } },
    },
  });
  console.log('Updated Half Dozen engagement:', JSON.stringify(updateEng, null, 2));
}

await client.close();
