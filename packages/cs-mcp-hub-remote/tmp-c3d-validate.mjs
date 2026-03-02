import fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const env = Object.fromEntries(
  fs.readFileSync('/tmp/c3d_hub_secrets.env', 'utf8').trim().split('\n').map((line) => {
    const [k, ...rest] = line.split('=');
    return [k, rest.join('=')];
  }),
);

const hubToken = env.HUB_API_TOKEN;
const endpoint = 'https://cs-hub-c3denver.createsomething.workers.dev/mcp';

const client = new Client({ name: 'c3d-validate', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${hubToken}`,
    },
  },
});

await client.connect(transport);

const list = await client.callTool({ name: 'hub_list_proxy_tools', arguments: {} });
const proxyTools = list.structuredContent?.proxyTools ?? [];
const onlyGmailNotion = proxyTools.every((name) =>
  name.startsWith('composio-toolkit-gmail__') || name.startsWith('composio-toolkit-notion__')
);

console.log('proxy_tool_count', list.structuredContent?.count ?? null);
console.log('only_gmail_notion', onlyGmailNotion);
console.log('first_25_proxy_tools', proxyTools.slice(0, 25));

const notionLink = await client.callTool({
  name: 'hub_execute_proxy_tool',
  arguments: {
    proxyToolName: 'composio-toolkit-notion__get_connect_link',
    args: {},
  },
});

const gmailLink = await client.callTool({
  name: 'hub_execute_proxy_tool',
  arguments: {
    proxyToolName: 'composio-toolkit-gmail__get_connect_link',
    args: {},
  },
});

console.log('notion_connect_link', JSON.stringify(notionLink.structuredContent ?? notionLink, null, 2));
console.log('gmail_connect_link', JSON.stringify(gmailLink.structuredContent ?? gmailLink, null, 2));

await client.close();
