import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = 'https://createsomething-notion.mcp.workway.co/mcp';
const token = process.env.NOTION_SYNC_BEARER_TOKEN;
if (!token) throw new Error('Missing NOTION_SYNC_BEARER_TOKEN');

const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
});

const client = new Client({ name: 'halfdozen-ops-enhance', version: '1.0.0' }, { capabilities: {} });

async function callTool(name, args) {
  const out = await client.callTool({ name, arguments: args });
  const text = out.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

function getTitle(item) {
  return (item?.title || []).map((segment) => segment?.plain_text || '').join('');
}

function titleEq(item, target) {
  return getTitle(item) === target;
}

function hasProperty(schema, name) {
  return schema.some((field) => field.name === name);
}

function hasMilestone(ms, title) {
  const milestoneRows = ms.results || [];
  return milestoneRows.some((row) => {
    const raw = row.properties?.Milestone;
    if (!raw || raw.type !== 'title') return false;
    const titleText = (raw.title || []).map((part) => part.plain_text || '').join('');
    return titleText === title;
  });
}

await client.connect(transport);

// Pull database metadata and ids.
const clientsSearch = await callTool('notion_search', {
  workspace: 'client',
  query: 'Clients',
  filter_type: 'data_source',
});
const engagementsSearch = await callTool('notion_search', {
  workspace: 'client',
  query: 'Engagements',
  filter_type: 'data_source',
});

const clientsDS = clientsSearch?.results?.find((d) => titleEq(d, 'Clients'))?.id;
const engagementsDS = engagementsSearch?.results?.find((d) => titleEq(d, 'Engagements'))?.id;

if (!clientsDS || !engagementsDS) {
  throw new Error('Could not resolve Clients or Engagements data sources via notion_search.');
}

const clientsMeta = clientsSearch.results.find((d) => d.id === clientsDS);
const engagementsMeta = engagementsSearch.results.find((d) => d.id === engagementsDS);

const clientsDB = clientsMeta?.parent?.database_id;
const engagementsDB = engagementsMeta?.parent?.database_id;

if (!clientsDB || !engagementsDB) {
  throw new Error('Could not resolve database ids for Clients or Engagements from search metadata.');
}

const clientsSchema = await callTool('notion_get_database', {
  workspace: 'client',
  data_source_id: clientsDS,
});
const engagementsSchema = await callTool('notion_get_database', {
  workspace: 'client',
  data_source_id: engagementsDS,
});

const addEngagementProps = {
  'Service owner': { people: {} },
  'SLA': {
    select: {
      options: [
        { name: 'Critical' },
        { name: 'Standard' },
        { name: 'Best effort' },
      ],
    },
  },
  'Criticality': {
    select: {
      options: [
        { name: 'High' },
        { name: 'Medium' },
        { name: 'Low' },
      ],
    },
  },
  'Contracted scope': { rich_text: {} },
  'Dependencies': { rich_text: {} },
  'Risk / blockers': { rich_text: {} },
};

const engagementPropsToAdd = {};
for (const [name, def] of Object.entries(addEngagementProps)) {
  if (!hasProperty(engagementsSchema.schema, name)) {
    engagementPropsToAdd[name] = def;
  }
}

if (Object.keys(engagementPropsToAdd).length > 0) {
  const updateRes = await callTool('notion_update_database', {
    workspace: 'client',
    database_id: engagementsDB,
    data_source_id: engagementsDS,
    properties: engagementPropsToAdd,
  });
  console.log('Added fields to Engagements:', JSON.stringify(updateRes, null, 2));
} else {
  console.log('Engagement fields already present.');
}

const clientPropsToAdd = {};
if (!hasProperty(clientsSchema.schema, 'Primary channel')) {
  clientPropsToAdd['Primary channel'] = {
    select: {
      options: [
        { name: 'Slack' },
        { name: 'Email' },
        { name: 'Notion' },
        { name: 'Other' },
      ],
    },
  };
}
if (!hasProperty(clientsSchema.schema, 'Priority')) {
  clientPropsToAdd.Priority = {
    select: {
      options: [
        { name: 'P0' },
        { name: 'P1' },
        { name: 'P2' },
      ],
    },
  };
}

if (Object.keys(clientPropsToAdd).length > 0) {
  const updateRes = await callTool('notion_update_database', {
    workspace: 'client',
    database_id: clientsDB,
    data_source_id: clientsDS,
    properties: clientPropsToAdd,
  });
  console.log('Added fields to Clients:', JSON.stringify(updateRes, null, 2));
} else {
  console.log('Client fields already present.');
}

const halfDozenClient = await callTool('notion_query_database', {
  workspace: 'client',
  data_source_id: clientsDS,
  filter: JSON.stringify({
    property: 'Name',
    title: { equals: 'Half Dozen' },
  }),
  page_size: 5,
});

const halfDozenClientPage = halfDozenClient?.results?.[0];
if (halfDozenClientPage?.id) {
  const updatedClient = await callTool('notion_update_page', {
    workspace: 'client',
    page_id: halfDozenClientPage.id,
    properties: {
      'Primary channel': { select: { name: 'Notion' } },
      Priority: { select: { name: 'P1' } },
    },
  });
  console.log('Updated Half Dozen client:', JSON.stringify(updatedClient, null, 2));
} else {
  console.log('Could not find Half Dozen client row.');
}

const halfDozenEngagement = await callTool('notion_query_database', {
  workspace: 'client',
  data_source_id: engagementsDS,
  filter: JSON.stringify({
    property: 'Name',
    title: { equals: 'Half Dozen — MCP Fleet' },
  }),
  page_size: 5,
});

let halfDozenEngagementPage = halfDozenEngagement?.results?.[0];
if (!halfDozenEngagementPage) {
  const fallback = await callTool('notion_query_database', {
    workspace: 'client',
    data_source_id: engagementsDS,
    filter: JSON.stringify({
      property: 'Name',
      title: { equals: 'Half Dozen - MCP Fleet' },
    }),
    page_size: 5,
  });
  halfDozenEngagementPage = fallback?.results?.[0];
}

if (halfDozenEngagementPage?.id) {
  const updatedEngagement = await callTool('notion_update_page', {
    workspace: 'client',
    page_id: halfDozenEngagementPage.id,
    properties: {
      'Service owner': { people: [] },
      'SLA': { select: { name: 'Standard' } },
      Criticality: { select: { name: 'High' } },
      'Contracted scope': {
        rich_text: [
          {
            text: {
              content:
                'Ongoing MCP infrastructure operations and service reliability support for Notion, Gmail, Zoom, YouTube, and telemetry services.',
            },
          },
        ],
      },
      Dependencies: {
        rich_text: [
          {
            text: {
              content: 'Cross-service auth keys and shared access for each MCP integration.',
            },
          },
        ],
      },
      'Risk / blockers': {
        rich_text: [
          {
            text: {
              content: 'Awaiting finalized critical incident escalation routing and final pager ownership for live incidents.',
            },
          },
        ],
      },
      'Start date': { date: { start: '2026-02-17' } },
      'Next review': { date: { start: '2026-03-03' } },
    },
  });
  console.log('Updated Half Dozen engagement:', JSON.stringify(updatedEngagement, null, 2));
} else {
  console.log('Could not find Half Dozen engagement row.');
}

const milestonesName = 'Delivery Milestones';
const existingMilestones = await callTool('notion_search', {
  workspace: 'client',
  query: milestonesName,
  filter_type: 'data_source',
});

let milestonesDS = null;
const engagementPageId = halfDozenEngagementPage?.id;
if (!engagementPageId) {
  console.log('Cannot create delivery milestones without engagement page id.');
} else {
  const found = existingMilestones?.results?.find((item) => {
    const title = getTitle(item);
    const parentPage = item?.database_parent?.page_id;
    return title === milestonesName && parentPage === engagementPageId;
  });
  if (found) {
    milestonesDS = found.id;
    console.log('Delivery Milestones already exists:', milestonesDS);
  } else {
    const createDB = await callTool('notion_create_database', {
      workspace: 'client',
      parent_page_id: engagementPageId,
      title: milestonesName,
      is_inline: true,
      properties: {
        Milestone: { title: {} },
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
        Owner: { people: {} },
        'Due date': { date: {} },
        Deliverable: { rich_text: {} },
        'Delivery notes': { rich_text: {} },
      },
    });
    milestonesDS = createDB.data_source_id;
    console.log('Created Delivery Milestones db:', JSON.stringify(createDB, null, 2));
  }
}

if (milestonesDS) {
  const seeds = [
    {
      title: 'Onboard client + connect MCP endpoints',
      status: 'Done',
      due: '2026-02-17',
      deliverable: 'Confirm access for Notion, Gmail, Zoom, YouTube, and telemetry MCP endpoints and owners.',
      notes: 'Baseline service inventory was created and validated.',
    },
    {
      title: 'Handoff playbook and support cadence',
      status: 'In progress',
      due: '2026-03-03',
      deliverable: 'Stand up weekly status + weekly operations handoff process with owners and escalation path.',
      notes: 'Pending final escalation list from client-side stakeholders.',
    },
    {
      title: 'Quarterly governance review',
      status: 'Planned',
      due: '2026-03-31',
      deliverable: 'Review SLA, ownership, and scope changes ahead of next quarter planning.',
      notes: 'Gate to go/no-go and scope reset will be decided at milestone review.',
    },
  ];

  const existingMilestonesRows = await callTool('notion_query_database', {
    workspace: 'client',
    data_source_id: milestonesDS,
    page_size: 50,
  });

  for (const seed of seeds) {
    if (hasMilestone(existingMilestonesRows, seed.title)) {
      console.log(`Milestone already exists: ${seed.title}`);
      continue;
    }

    const newRow = await callTool('notion_create_page', {
      workspace: 'client',
      data_source_id: milestonesDS,
      properties: {
        Milestone: {
          title: [
            {
              text: {
                content: seed.title,
              },
            },
          ],
        },
        Status: {
          select: {
            name: seed.status,
          },
        },
        Owner: { people: [] },
        'Due date': { date: { start: seed.due } },
        Deliverable: {
          rich_text: [
            {
              text: {
                content: seed.deliverable,
              },
            },
          ],
        },
        'Delivery notes': {
          rich_text: [
            {
              text: {
                content: seed.notes,
              },
            },
          ],
        },
      },
    });
    console.log('Created milestone row:', newRow.id || newRow.url);
  }
}

await client.close();
