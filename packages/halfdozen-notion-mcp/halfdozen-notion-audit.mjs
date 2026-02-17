import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = 'https://createsomething-notion.mcp.workway.co/mcp';
const token = process.env.NOTION_SYNC_BEARER_TOKEN;
if (!token) {
  throw new Error('Missing NOTION_SYNC_BEARER_TOKEN');
}

const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
});

const client = new Client({ name: 'halfdozen-audit', version: '1.0.0' }, { capabilities: {} });

async function callTool(name, args) {
  const out = await client.callTool({ name, arguments: args });
  const text = out.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

await client.connect(transport);

const dbs = await callTool('notion_list_databases', { workspace: 'client' });
const clients = dbs.data_sources.find((d) => d.title === 'Clients');
const engagements = dbs.data_sources.find((d) => d.title === 'Engagements');
console.log('Clients DS:', clients?.id);
console.log('Engagements DS:', engagements?.id);

if (clients?.id) {
  const c = await callTool('notion_get_database', { workspace: 'client', data_source_id: clients.id });
  console.log('Clients schema:', JSON.stringify(c, null, 2));
}
if (engagements?.id) {
  const e = await callTool('notion_get_database', { workspace: 'client', data_source_id: engagements.id });
  console.log('Engagements schema:', JSON.stringify(e, null, 2));
}

await client.close();
