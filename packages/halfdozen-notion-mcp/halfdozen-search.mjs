import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const token = process.env.NOTION_SYNC_BEARER_TOKEN;
const endpoint = 'https://createsomething-notion.mcp.workway.co/mcp';
const transport = new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers: { Authorization: `Bearer ${token}` }}});
const client = new Client({ name: 'halfdozen-search', version: '1.0.0' }, { capabilities: {} });

async function callTool(name,args){
  const out=await client.callTool({name, arguments:args});
  return out.content?.[0]?.text ? JSON.parse(out.content[0].text):null;
}

await client.connect(transport);
const searchAll = await callTool('notion_search',{workspace:'client', query:'Engagements'});
console.log(JSON.stringify(searchAll, null, 2));
await client.close();
