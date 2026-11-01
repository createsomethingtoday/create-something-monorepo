import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {runOperation} from '../../../packages/gigi-integrations/src/runner.ts';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=await mkdtemp(join(tmpdir(),'gigi-runner-contract-'));
try {
 await writeFile(join(dataDir,'broker-session.json'),JSON.stringify({baseUrl:'https://gigi-connector.createsomething.workers.dev',accessToken:'synthetic-test-token',clientId:'oauth_contract',sub:'synthetic-user',status:'active',expiresAt:Math.floor(Date.now()/1000)+3600}),{mode:0o600});
 for(const provider of ['gmail','googlecalendar']) {
  const page={provider,connectedAccountId:'ca_contract',nextCursor:null,records:[{externalId:'source-record-1',kind:provider==='gmail'?'message':'event',observedAt:'2026-09-30T10:00:00Z',data:provider==='gmail'?{subject:'Synthetic booking',threadId:'thread-1',from:'Test <test@example.test>',date:'Tue, 29 Sep 2026 12:00:00 +0000',snippet:'Synthetic source preview'}:{calendarId:'calendar-1',summary:'Synthetic set',start:{dateTime:'2026-10-02T19:00:00Z'},end:{dateTime:'2026-10-02T20:00:00Z'},location:'Test venue',description:'Synthetic calendar source'}}]};
  const response=await runOperation({operation:'connections.import',input:{workspaceId:'contract-workspace',provider,connectedAccountId:'ca_contract'}},{dataDir,fetch:async request=>{assert.match(request.url,/\/v1\/gigi\/sources\//);return Response.json(page);}});
  assert.equal(response.ok,true,JSON.stringify(response));
  const path=join(dataDir,provider+'.json');await writeFile(path,JSON.stringify(response.value));
  const result=spawnSync('cargo',['run','--quiet','--manifest-path',join(app,'src-tauri/Cargo.toml'),'--example','verify_import','--',path],{stdio:'inherit'});
  assert.equal(result.status,0,provider+' runner→Rust persistence failed');
 }
}finally{await rm(dataDir,{recursive:true,force:true});}
