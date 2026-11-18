import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createAbundanceHealthcareServer} from '../src/index';
test('retired provider is absent from MCP catalog, resource and readiness schema',async()=>{
 const server=createAbundanceHealthcareServer({});const client=new Client({name:'test',version:'1'});
 const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
 try{const list=await client.listTools();assert.equal(JSON.stringify(list).toLowerCase().includes('clay'),false);
 assert.equal(list.tools.some(t=>t.name==='get_professional_contact_enrichment'||t.name==='request_professional_contact_enrichment'),false);
 const resource=await client.readResource({uri:'abundance-healthcare://status'});assert.equal(JSON.stringify(resource).toLowerCase().includes('clay'),false);
 const rejected=await client.callTool({name:'get_enrichment_readiness',arguments:{provider:'clay'}});assert.equal(rejected.isError,true);
 }finally{await client.close();await server.close();}
});
