import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSourcePage } from '../worker/index.ts';

test('calendar window is passed to provider on every page', async () => {
  const parameters: Record<string,string> = {};
  const fetcher = async (request: Request) => {
    const body = await request.json() as any;
    for (const parameter of body.parameters ?? []) parameters[parameter.name] = parameter.value;
    return Response.json({ status:200, data: body.endpoint.endsWith('/primary') ? {id:'primary@example.test'} : {items:[]} });
  };
  await readSourcePage({COMPOSIO_API_KEY:'synthetic'}, fetcher as typeof fetch, 'googlecalendar','account',null,
    {from:'2026-11-15T00:00:00.000Z',to:'2027-01-01T00:00:00.000Z',calendarId:'primary'});
  assert.equal(parameters.timeMin,'2026-11-15T00:00:00.000Z');
  assert.equal(parameters.timeMax,'2027-01-01T00:00:00.000Z');
});

test('continuation is scoped to the selected date window and account', async () => {
  let pageTokens:string[]=[];
  const fetcher = async (request: Request) => {
    const body = await request.json() as any;
    pageTokens.push(...(body.parameters ?? []).filter((p:any)=>p.name==='pageToken').map((p:any)=>p.value));
    return Response.json({status:200,data:body.endpoint.endsWith('/primary')?{id:'primary@example.test'}:{items:[],nextPageToken:'provider-token'}});
  };
  const selection={from:'2026-11-15T00:00:00.000Z',to:'2027-01-01T00:00:00.000Z'};
  const page=await readSourcePage({COMPOSIO_API_KEY:'synthetic'},fetcher as typeof fetch,'googlecalendar','account',null,selection) as any;
  await readSourcePage({COMPOSIO_API_KEY:'synthetic'},fetcher as typeof fetch,'googlecalendar','account',page.nextCursor,selection);
  assert.deepEqual(pageTokens,['provider-token']);
  await assert.rejects(readSourcePage({COMPOSIO_API_KEY:'synthetic'},fetcher as typeof fetch,'googlecalendar','other',page.nextCursor,selection));
  await assert.rejects(readSourcePage({COMPOSIO_API_KEY:'synthetic'},fetcher as typeof fetch,'googlecalendar','account',page.nextCursor,{...selection,to:'2027-02-01T00:00:00.000Z'}));
});

import {selectSourceRecords} from '../src/source-selection.ts';
test('all-day selection respects event timezone and exclusive end date',()=>{
 const record:any={fields:{},source:{provider:'googlecalendar',calendarTiming:{start:{date:'2026-11-15',timeZone:'America/Chicago'},end:{date:'2026-11-16',timeZone:'America/Chicago'}}}};
 assert.equal(selectSourceRecords([record],{from:'2026-11-15T06:00:00Z',to:'2026-11-16T06:00:00Z'}).records.length,1);
 assert.equal(selectSourceRecords([record],{from:'2026-11-16T06:00:00Z',to:'2026-11-17T06:00:00Z'}).records.length,0);
 assert.equal(selectSourceRecords([{...record,source:{...record.source,calendarTiming:{start:{date:'2026-11-15'},end:{date:'2026-11-16'}}}}],{from:'2026-11-15T06:00:00Z'}).coverage.unknownDateCount,1);
});
