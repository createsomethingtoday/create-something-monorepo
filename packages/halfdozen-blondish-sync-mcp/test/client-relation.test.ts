import assert from 'node:assert/strict';
import test from 'node:test';
import { preflight, syncSourceTicketsToHalfDozen } from '../src/sync.js';
import type { Env } from '../src/types.js';

const clientId = '1a001918-7ac5-8144-8dd9-e1017010b925';
const env = {
  CLIENT_NOTION_API_KEY: 'test', HALFDOZEN_NOTION_API_KEY: 'test',
  CLIENT_SUPPORT_TICKETS_DATA_SOURCE_ID: 'source', HALFDOZEN_TICKETS_DATA_SOURCE_ID: 'target',
  SYNC_CLIENT_PAGE_ID: clientId,
} as Env;
const response = (value: unknown) => new Response(JSON.stringify(value), {headers: {'content-type':'application/json'}});

test('preflight rejects an inaccessible configured Client relation', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({properties: {
    Ticket: {type:'title'}, Details: {type:'rich_text'}, 'Created By': {type:'created_by'},
    'Page ID': {type:'unique_id'}, URL: {type:'url'}, 'Files & Media': {type:'files'},
    Status: {type:'status'}, Source: {type:'select'}, Owner: {type:'select'},
    'External URL': {type:'url'}, 'External Files & Media': {type:'files'}, 'External Page ID': {type:'rich_text'},
  }}));
  const result = await preflight(env);
  assert.equal(result.ok, false);
  assert.match(JSON.stringify(result.errors), /Client.*relation/);
});

test('preflight rejects a configured client page outside the related data source', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    if (String(input).endsWith(`/pages/${clientId}`)) return response({id:clientId,parent:{data_source_id:'wrong'}});
    return response({properties: {'External Page ID':{type:'rich_text'},Client:{type:'relation',relation:{data_source_id:'clients'}}}});
  });
  const result = await preflight(env);
  assert.equal(result.ok,false);
  assert.match(JSON.stringify(result.errors), /client page.*related data source/i);
});


test('Client-only repair preserves existing relations and statuses and is idempotent', async (t) => {
  const priorId = '22222222-2222-2222-2222-222222222222';
  let current = {id:'ticket',parent:{data_source_id:'target'},properties:{
    Client:{type:'relation',relation:[{id:priorId}],has_more:false},
    Status:{type:'status',status:{name:'Complete'}},
    'External Page ID':{type:'rich_text',rich_text:[{plain_text:'CL-62'}]},
  }};
  const writes: unknown[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/data_sources/source')) return response({properties:{}});
    if (url.endsWith('/data_sources/target')) return response({properties:{'External Page ID':{type:'rich_text'},Client:{type:'relation',relation:{data_source_id:'clients'}}}});
    if (url.endsWith(`/pages/${clientId}`)) return response({id:clientId,parent:{data_source_id:'clients'}});
    if (url.endsWith('/data_sources/source/query')) return response({results:[{id:'source-page',parent:{data_source_id:'source'},properties:{'Page ID':{type:'unique_id',unique_id:{prefix:'CL',number:62}}}}],has_more:false});
    if (url.endsWith('/data_sources/target/query')) return response({results:[current],has_more:false});
    if (url.endsWith('/pages/ticket')) {
      if (init?.method === 'PATCH') {
        const patch = JSON.parse(String(init.body)).properties;
        writes.push(patch);
        current = {...current,properties:{...current.properties,Client:{type:'relation',has_more:false,...patch.Client}}};
      }
      return response(current);
    }
    throw new Error(`Unexpected request: ${init?.method} ${url}`);
  });
  const result = await syncSourceTicketsToHalfDozen(env, {clientOnly:true});
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal(result.updated,1);
  assert.deepEqual(writes,[{Client:{relation:[{id:priorId},{id:clientId}]}}]);
  assert.equal(current.properties.Status.status.name,'Complete');
  const again = await syncSourceTicketsToHalfDozen(env, {clientOnly:true});
  assert.equal(again.ok,true,JSON.stringify(again.errors));
  assert.equal(again.updated,0);
  assert.equal(writes.length,1);
});

for (const failure of ['duplicate', 'truncated', 'changed match', 'missing property']) {
  test(`Client-only repair refuses ${failure} without writes`, async (t) => {
    const page = {id:'ticket',parent:{data_source_id:'target'},properties:{
      'External Page ID':{type:'rich_text',rich_text:[{plain_text:'CL-62'}]},
      Client:{type:'relation',relation:[],has_more:failure==='truncated'},
    }};
    let writes = 0;
    t.mock.method(globalThis,'fetch',async (input: string | URL | Request, init?: RequestInit) => {
      const url=String(input);
      if (init?.method==='PATCH') {writes++; throw new Error('Unexpected write');}
      if(url.endsWith('/data_sources/source')) return response({properties:{}});
      if(url.endsWith('/data_sources/target')) return response({properties:{'External Page ID':{type:'rich_text'},Client:{type:'relation',relation:{data_source_id:'clients'}}}});
      if(url.endsWith(`/pages/${clientId}`)) return response({id:clientId,parent:{data_source_id:'clients'}});
      if(url.endsWith('/data_sources/source/query')) return response({results:[{id:'source-page',parent:{data_source_id:'source'},properties:{'Page ID':{type:'unique_id',unique_id:{prefix:'CL',number:62}}}}],has_more:false});
      if(url.endsWith('/data_sources/target/query')) return response({results:failure==='duplicate'?[page,{...page,id:'another'}]:[page],has_more:false});
      if(url.endsWith('/pages/ticket')) return response(failure==='missing property'?{...page,properties:{}}:failure==='changed match'?{...page,parent:{data_source_id:'other'}}:page);
      throw new Error(`Unexpected request ${url}`);
    });
    const result=await syncSourceTicketsToHalfDozen(env,{clientOnly:true});
    assert.equal(result.ok,false);
    assert.equal(writes,0);
    assert.match(JSON.stringify(result.errors), /Ambiguous|incomplete|changed/);
  });
}

test('new tickets receive the configured Client relation', async (t) => {
  const source={id:'source-page',parent:{data_source_id:'source'},properties:{
    Ticket:{type:'title',title:[{plain_text:'New ticket'}]},
    'Page ID':{type:'unique_id',unique_id:{prefix:'CL',number:63}},
  }};
  const writes: Record<string, any>[]=[];
  t.mock.method(globalThis,'fetch',async(input: string | URL | Request,init?:RequestInit)=>{
    const url=String(input);
    if(url.endsWith('/data_sources/source')) return response({properties:{}});
    if(url.endsWith('/data_sources/target')) return response({properties:{Ticket:{type:'title'},Status:{type:'status'},Source:{type:'select'},Owner:{type:'select'},'External Page ID':{type:'rich_text'},Client:{type:'relation',relation:{data_source_id:'clients'}}}});
    if(url.endsWith(`/pages/${clientId}`)) return response({id:clientId,parent:{data_source_id:'clients'}});
    if(url.endsWith('/data_sources/source/query')) return response({results:[source],has_more:false});
    if(url.endsWith('/data_sources/target/query')) return response({results:[],has_more:false});
    if(url.endsWith('/pages/source-page')) return response(source);
    if(url.includes('/users?') || url.includes('/children')) return response({results:[],has_more:false});
    if(url.endsWith('/pages') && init?.method==='POST') {
      const body=JSON.parse(String(init.body));writes.push(body);
      const properties: Record<string, any>=Object.fromEntries(Object.entries(body.properties).map(([key,value])=>[key,{type:Object.keys(value as object)[0],...(value as object)}]));
      // Notion readback includes plain_text on rich text and title entries.
      for(const key of ['Ticket','External Page ID']) {
        const type=properties[key].type; properties[key][type]=properties[key][type].map((v:any)=>({...v,plain_text:v.text.content}));
      }
      return response({id:'created',parent:{data_source_id:'target'},properties});
    }
    throw new Error(`Unexpected request ${init?.method} ${url}`);
  });
  const result=await syncSourceTicketsToHalfDozen(env);
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal(result.created,1);
  assert.equal(writes.length,1);
  assert.deepEqual(writes[0].properties.Client,{relation:[{id:clientId}]});
});
