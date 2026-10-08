import { connect } from 'node:net';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('Codex companion preserves a message split inside a UTF8 character on stdin', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-stdin-'));
  const binary = join(root, 'fixture-server');
  await writeFile(binary, `#!${process.execPath}\nlet buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;let result={};switch(request.method){case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;case 'account/read':result={account:{type:'chatgpt'}};break;case 'tools/call':result={content:[{type:'text',text:JSON.stringify({id:request.params.arguments.workspaceId})}]};break;case 'tools/list':result={tools:['gigi_workspace_get', 'gigi_schema_describe', 'gigi_records_list', 'gigi_records_get', 'gigi_gigs_summary', 'gigi_history_list', 'gigi_records_save'].map(name=>({name,description:name,inputSchema:{type:'object'}}))};break;case 'thread/start':result={thread:{id:'fixture-thread'}};break;case 'plugin/installed':result={marketplaces:[]};break;case 'turn/start':result={turn:{id:'fixture-turn'}};break;}process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});\n`);
  await chmod(binary, 0o755);
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/codex-main.ts'], { cwd: new URL('..', import.meta.url), env: { ...process.env, GIGI_DATA_DIR: root, GIGI_MCP_BINARY: binary, GIGI_CODEX_BINARY: binary, GIGI_SKILL_PATH: join(root, 'SKILL.md') }, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = '';
  const waiters = new Map<number, (value: any) => void>();
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.on('data', chunk => { buffer += chunk; for (;;) { const n = buffer.indexOf('\n'); if (n < 0) break; const reply = JSON.parse(buffer.slice(0, n)); buffer = buffer.slice(n + 1); waiters.get(reply.id)?.(reply); } });
  const reply = (id: number) => new Promise<any>((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Runner response timed out: ${stderr}`)), 5000); waiters.set(id, value => { clearTimeout(timer); resolve(value); }); });
  const message = 'Danny — café 🎸';
  try {
    const ready = reply(0);
    child.stdin.write(JSON.stringify({ id: 0, operation: 'agent.chat.status', input: {} }) + '\n');
    assert.equal((await ready).ok, true);
    const result = reply(1);
    const bytes = Buffer.from(JSON.stringify({ id: 1, operation: 'agent.chat.start', input: { workspaceId: 'w', message } }) + '\n');
    const split = bytes.indexOf(Buffer.from('🎸')) + 2;
    child.stdin.write(bytes.subarray(0, split));
    await new Promise(resolve => setTimeout(resolve, 50));
    child.stdin.write(bytes.subarray(split));
    assert.equal((await result).ok, true);
    const listed = reply(2);
    child.stdin.write(JSON.stringify({ id: 2, operation: 'agent.chat.list', input: { workspaceId: 'w' } }) + '\n');
    assert.equal((await listed).value.sessions[0].title, message);
  } finally { child.stdin.end(); await new Promise<void>(resolve => child.once('close', () => resolve())); }
});

test('Codex companion exits when an owned provider child dies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-child-failure-'));
  const binary = join(root, 'fixture-server');
  await writeFile(binary, `#!${process.execPath}\nlet buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;if(request.method==='account/read')process.exit(7);const result=request.method==='config/read'?{config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}}:{};process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});\n`);
  await chmod(binary, 0o755);
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/codex-main.ts'], { cwd: new URL('..', import.meta.url), env: { ...process.env, GIGI_DATA_DIR: root, GIGI_MCP_BINARY: binary, GIGI_CODEX_BINARY: binary, GIGI_SKILL_PATH: join(root, 'SKILL.md') }, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.resume(); child.stderr.resume();
  const closed = new Promise<number | null>((resolve, reject) => { const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Outer companion survived provider death')); }, 5000); child.once('close', code => { clearTimeout(timer); resolve(code); }); });
  child.stdin.write(JSON.stringify({ id: 1, operation: 'agent.chat.status', input: {} }) + '\n');
  assert.notEqual(await closed, 0);
});

test('Codex companion preserves definitive malformed plugin preflight and permits an explicit retry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-stdin-'));
  const binary = join(root, 'fixture-server');
  await writeFile(binary, `#!${process.execPath}\nlet pluginReads=0;let buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;let result={};switch(request.method){case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;case 'account/read':result={account:{type:'chatgpt'}};break;case 'tools/call':result={content:[{type:'text',text:JSON.stringify({id:request.params.arguments.workspaceId})}]};break;case 'tools/list':result={tools:['gigi_workspace_get', 'gigi_schema_describe', 'gigi_records_list', 'gigi_records_get', 'gigi_gigs_summary', 'gigi_history_list', 'gigi_records_save'].map(name=>({name,description:name,inputSchema:{type:'object'}}))};break;case 'thread/start':result={thread:{id:'fixture-thread'}};break;case 'plugin/installed':result=++pluginReads===1?{}:{marketplaces:[]};break;case 'turn/start':result={turn:{id:'fixture-turn'}};break;}process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});\n`);
  await chmod(binary, 0o755);
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/codex-main.ts'], { cwd: new URL('..', import.meta.url), env: { ...process.env, GIGI_DATA_DIR: root, GIGI_MCP_BINARY: binary, GIGI_CODEX_BINARY: binary, GIGI_SKILL_PATH: join(root, 'SKILL.md') }, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = '';
  const waiters = new Map<number, (value: any) => void>();
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.on('data', chunk => { buffer += chunk; for (;;) { const n = buffer.indexOf('\n'); if (n < 0) break; const reply = JSON.parse(buffer.slice(0, n)); buffer = buffer.slice(n + 1); waiters.get(reply.id)?.(reply); } });
  const reply = (id: number) => new Promise<any>((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Runner response timed out: ${stderr}`)), 5000); waiters.set(id, value => { clearTimeout(timer); resolve(value); }); });
  const message = 'Danny — café 🎸';
  try {
    const ready = reply(0);
    child.stdin.write(JSON.stringify({ id: 0, operation: 'agent.chat.status', input: {} }) + '\n');
    assert.equal((await ready).ok, true);
    const result = reply(1);
    const bytes = Buffer.from(JSON.stringify({ id: 1, operation: 'agent.chat.start', input: { workspaceId: 'w', message } }) + '\n');
    const split = bytes.indexOf(Buffer.from('🎸')) + 2;
    child.stdin.write(bytes.subarray(0, split));
    await new Promise(resolve => setTimeout(resolve, 50));
    child.stdin.write(bytes.subarray(split));
    assert.equal((await result).error.reason, 'plugin_inventory_unavailable');
    const listed = reply(2);
    child.stdin.write(JSON.stringify({ id: 2, operation: 'agent.chat.list', input: { workspaceId: 'w' } }) + '\n');
    const session = (await listed).value.sessions[0];
    assert.equal(session.title, message);
    const retried = reply(3);
    child.stdin.write(JSON.stringify({ id: 3, operation: 'agent.chat.send', input: { workspaceId: 'w', sessionId: session.sessionId, message } }) + '\n');
    assert.equal((await retried).ok, true);
  } finally { child.stdin.end(); await new Promise<void>(resolve => child.once('close', () => resolve())); }
});

test('private cancellation bypasses a hung companion stdin poll', async () => {
  const root = await mkdtemp('/tmp/gigi-cancel-poll-');
  const binary = join(root, 'fixture-server');
  await writeFile(binary, `#!${process.execPath}\nlet buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;let result={};switch(request.method){case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;case 'account/read':result={account:{type:'chatgpt'}};break;case 'tools/call':result={content:[{type:'text',text:JSON.stringify({id:request.params.arguments.workspaceId})}]};break;case 'tools/list':result={tools:['gigi_workspace_get', 'gigi_schema_describe', 'gigi_records_list', 'gigi_records_get', 'gigi_gigs_summary', 'gigi_history_list', 'gigi_records_save'].map(name=>({name,description:name,inputSchema:{type:'object'}}))};break;case 'thread/read':return;case 'turn/interrupt':result={};break;case 'thread/start':result={thread:{id:'fixture-thread'}};break;case 'plugin/installed':result={marketplaces:[]};break;case 'turn/start':result={turn:{id:'fixture-turn'}};break;}process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});\n`);
  await chmod(binary, 0o755);
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/codex-main.ts'], { cwd: new URL('..', import.meta.url), env: { ...process.env, GIGI_CHAT_CONTROL_SOCKET: join(root, 'control.sock'), GIGI_DATA_DIR: root, GIGI_MCP_BINARY: binary, GIGI_CODEX_BINARY: binary, GIGI_SKILL_PATH: join(root, 'SKILL.md') }, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = '';
  const waiters = new Map<number, (value: any) => void>();
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.on('data', chunk => { buffer += chunk; for (;;) { const n = buffer.indexOf('\n'); if (n < 0) break; const reply = JSON.parse(buffer.slice(0, n)); buffer = buffer.slice(n + 1); waiters.get(reply.id)?.(reply); } });
  const reply = (id: number) => new Promise<any>((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Runner response timed out: ${stderr}`)), 5000); waiters.set(id, value => { clearTimeout(timer); resolve(value); }); });
  const message = 'Danny — café 🎸';
  try {
    const ready = reply(0);
    child.stdin.write(JSON.stringify({ id: 0, operation: 'agent.chat.status', input: {} }) + '\n');
    assert.equal((await ready).ok, true);
    const result = reply(1);
    const bytes = Buffer.from(JSON.stringify({ id: 1, operation: 'agent.chat.start', input: { workspaceId: 'w', message } }) + '\n');
    const split = bytes.indexOf(Buffer.from('🎸')) + 2;
    child.stdin.write(bytes.subarray(0, split));
    await new Promise(resolve => setTimeout(resolve, 50));
    child.stdin.write(bytes.subarray(split));
    assert.equal((await result).ok, true);
    const listed = reply(2);
    child.stdin.write(JSON.stringify({ id: 2, operation: 'agent.chat.list', input: { workspaceId: 'w' } }) + '\n');
    const session = (await listed).value.sessions[0];
    child.stdin.write(JSON.stringify({ id: 3, operation: 'agent.chat.poll', input: { workspaceId: 'w', sessionId: session.sessionId } }) + '\n');
    await new Promise(resolve => setTimeout(resolve, 50));
    const stopped = await new Promise<any>((resolve, reject) => {
      const socket = connect(join(root, 'control.sock')); let bytes = '';
      const timer = setTimeout(() => { socket.destroy(); reject(new Error('Stop waited for the hung poll')); }, 1000);
      socket.on('connect', () => socket.write(JSON.stringify({ id: 4, operation: 'agent.chat.cancel', input: { workspaceId: 'w', sessionId: session.sessionId } }) + '\n'));
      socket.on('data', chunk => { bytes += chunk; });
      socket.on('error', error => { clearTimeout(timer); reject(error); });
      socket.on('end', () => { clearTimeout(timer); resolve(JSON.parse(bytes)); });
    });
    assert.equal(stopped.ok, true); assert.equal(stopped.value.cancelPending, true);
  } finally { child.kill('SIGTERM'); await new Promise<void>(resolve => child.once('close', () => resolve())); }
});

for (const mode of ['empty-catalog', 'correlated-preflight', 'ordinary-preflight']) test(`actual companion exposes ${mode} and permits an explicit retry`, { timeout: 15_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-public-preflight-'));
  const binary = join(root, 'fixture-server.cjs'), readyPath = join(root, 'catalog-ready'), logPath = join(root, 'calls.txt');
  await writeFile(binary, `#!${process.execPath}
const fs=require('node:fs');let buffer='',plugins=0,threads=0;
process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;fs.appendFileSync(process.env.GIGI_FIXTURE_LOG,request.method+'\\n');let result={};switch(request.method){
case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;
case 'account/read':result={account:{type:'chatgpt'}};break;
case 'tools/call':result={content:[{type:'text',text:JSON.stringify({id:request.params.arguments.workspaceId})}]};break;
case 'tools/list':result={tools:process.env.GIGI_FIXTURE_MODE==='empty-catalog'&&!fs.existsSync(process.env.GIGI_FIXTURE_READY)?[]:['gigi_workspace_get', 'gigi_schema_describe', 'gigi_records_list', 'gigi_records_get', 'gigi_gigs_summary', 'gigi_history_list', 'gigi_records_save'].map(name=>({name,description:name,inputSchema:{type:'object'}}))};break;
case 'thread/start':result={thread:process.env.GIGI_FIXTURE_MODE==='ordinary-preflight'&&++threads===1?{}:{id:'fixture-thread'}};break;
case 'plugin/installed':if(process.env.GIGI_FIXTURE_MODE==='correlated-preflight'&&++plugins===1){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,error:{code:-32000,message:'synthetic preflight rejection'}})+'\\n');continue;}result={marketplaces:[]};break;
case 'turn/start':result={turn:{id:'fixture-turn'}};break;
}process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});
`);
  await chmod(binary, 0o755);
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/codex-main.ts'], { cwd: new URL('..', import.meta.url), env: { ...process.env, GIGI_DATA_DIR: root, GIGI_MCP_BINARY: binary, GIGI_CODEX_BINARY: binary, GIGI_SKILL_PATH: join(root, 'SKILL.md'), GIGI_FIXTURE_MODE: mode, GIGI_FIXTURE_READY: readyPath, GIGI_FIXTURE_LOG: logPath }, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = '', nextId = 0;
  const waiters = new Map<number, (value: any) => void>();
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');child.stderr.on('data', chunk => { stderr += chunk; });
  child.stdout.on('data', chunk => { buffer += chunk; for (;;) { const n=buffer.indexOf('\n');if(n<0)break;const result=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);waiters.get(result.id)?.(result); } });
  const call = (operation: string, input: object) => new Promise<any>((resolve, reject) => {
    const id=nextId++;const timer=setTimeout(()=>reject(new Error(`Fixture reply timeout: ${stderr}`)),5000);
    waiters.set(id,value=>{clearTimeout(timer);waiters.delete(id);resolve(value);});child.stdin.write(JSON.stringify({id,operation,input})+'\n');
  });
  try {
    const status = await call('agent.chat.status', {}); assert.equal(status.ok, true);
    assert.equal(status.value.available, mode !== 'empty-catalog');
    if (mode === 'empty-catalog') assert.equal(status.value.reason, 'gigi_tools_unavailable');
    let sessionId;
    if (mode!=='empty-catalog') { const created=await call('agent.chat.start',{workspaceId:'w'}); assert.equal(created.ok,true); sessionId=created.value.sessionId; }
    const failed = mode==='empty-catalog' ? await call('agent.chat.start', { workspaceId:'w' }) : await call('agent.chat.send', { workspaceId:'w',sessionId,message:'Synthetic preflight check' });
    assert.equal(failed.ok, false);
    assert.equal(failed.error.reason, mode==='empty-catalog'?'gigi_tools_unavailable':mode==='correlated-preflight'?'provider_preflight_rejected':'provider_preflight_unavailable');
    const { readFile } = await import('node:fs/promises');
    assert.doesNotMatch(await readFile(logPath,'utf8'), /turn\/start/);
    let retry;
    if (mode==='empty-catalog') { await writeFile(readyPath,'synthetic fixture ready'); const created=await call('agent.chat.start',{workspaceId:'w'}); assert.equal(created.ok,true); retry=await call('agent.chat.send',{workspaceId:'w',sessionId:created.value.sessionId,message:'Explicit retry'}); }
    else { const list=await call('agent.chat.list',{workspaceId:'w'});assert.equal(list.value.sessions.length,1);retry=await call('agent.chat.send',{workspaceId:'w',sessionId:list.value.sessions[0].sessionId,message:'Explicit retry'}); }
    assert.equal(retry.ok,true);assert.equal(retry.value.state,'running');
    assert.equal((await readFile(logPath,'utf8')).split('\n').filter(x=>x==='turn/start').length,1);
  } finally { child.stdin.end(); await new Promise<void>(resolve=>child.once('close',()=>resolve())); }
});
