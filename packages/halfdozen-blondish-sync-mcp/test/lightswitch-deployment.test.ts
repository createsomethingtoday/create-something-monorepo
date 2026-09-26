import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditSync } from '../src/sync.js';
import type { Env } from '../src/types.js';

const config = readFileSync(new URL('../wrangler.lightswitch.toml', import.meta.url), 'utf8');
const value = (key: string) => config.match(new RegExp(`^${key} = "([^"]+)"`, 'm'))?.[1];
const clientId = '18e01918-7ac5-81f1-a1b9-c7c9cdc469c9';
const relatedId = '3789a2d7-e7e7-454d-9ba3-78c522da27d9';
const sourceId = value('CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID')!;
const targetId = value('HALFDOZEN_TICKETS_DATA_SOURCE_ID')!;
const response = (body: unknown) => new Response(JSON.stringify(body));

test('Lightswitch deployment audits matched Client relations without writes or false drift', async (t) => {
  const source = { id: 'source-ticket', properties: {
    Ticket: {type:'title',title:[{plain_text:'Example'}]},
    'Page ID': {type:'unique_id',unique_id:{prefix:'LS',number:1}},
  }};
  const target = { id:'target-ticket', properties: {
    Ticket: {type:'title',title:[{plain_text:'Example'}]},
    Source: {type:'select',select:{name:'Portal / Tag'}},
    'External Page ID': {type:'rich_text',rich_text:[{plain_text:'LS-1'}]},
    Client: {type:'relation',relation:[{id:clientId}],has_more:false},
  }};
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url=String(input);
    if (init?.method && init.method !== 'GET') assert.ok(url.endsWith('/query'), `Unexpected write: ${url}`);
    if (url.endsWith(`/data_sources/${sourceId}`)) return response({properties:{}});
    if (url.endsWith(`/data_sources/${targetId}`)) return response({properties:{
      'External Page ID':{type:'rich_text'}, Client:{type:'relation',relation:{data_source_id:relatedId}},
    }});
    if (url.endsWith(`/pages/${clientId}`)) return response({id:clientId,parent:{data_source_id:relatedId}});
    if (url.endsWith(`/data_sources/${sourceId}/query`)) return response({results:[source],has_more:false});
    if (url.endsWith(`/data_sources/${targetId}/query`)) return response({results:[target],has_more:false});
    if (url.includes('/users?') || url.includes('/children')) return response({results:[],has_more:false});
    throw new Error(`Unexpected request: ${url}`);
  });
  const result = await auditSync({
    CLIENT_NOTION_API_KEY:'test', HALFDOZEN_NOTION_API_KEY:'test',
    CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID:sourceId, HALFDOZEN_TICKETS_DATA_SOURCE_ID:targetId,
    SYNC_CLIENT_PAGE_ID:value('SYNC_CLIENT_PAGE_ID'), SYNC_CLIENT_SLUG:'lightswitch',
    SYNC_CLIENT_LABEL:value('SYNC_CLIENT_LABEL'),
  } as Env);
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal(result.details.matched_rows,1);
  assert.deepEqual(result.details.contract_field_drifts,[]);
});
