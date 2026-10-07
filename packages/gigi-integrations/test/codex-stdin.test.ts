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
  await writeFile(binary, `#!${process.execPath}\nlet buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;let result={};switch(request.method){case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;case 'account/read':result={account:{type:'chatgpt'}};break;case 'tools/call':result={content:[{type:'text',text:JSON.stringify({id:request.params.arguments.workspaceId})}]};break;case 'tools/list':result={tools:[{name:'gigi_records_get',description:'Read',inputSchema:{type:'object'}}]};break;case 'thread/start':result={thread:{id:'fixture-thread'}};break;case 'plugin/installed':result={marketplaces:[]};break;case 'turn/start':result={turn:{id:'fixture-turn'}};break;}process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});\n`);
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
  await writeFile(binary, `#!${process.execPath}\nlet pluginReads=0;let buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;let result={};switch(request.method){case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;case 'account/read':result={account:{type:'chatgpt'}};break;case 'tools/call':result={content:[{type:'text',text:JSON.stringify({id:request.params.arguments.workspaceId})}]};break;case 'tools/list':result={tools:[{name:'gigi_records_get',description:'Read',inputSchema:{type:'object'}}]};break;case 'thread/start':result={thread:{id:'fixture-thread'}};break;case 'plugin/installed':result=++pluginReads===1?{}:{marketplaces:[]};break;case 'turn/start':result={turn:{id:'fixture-turn'}};break;}process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});\n`);
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
  await writeFile(binary, `#!${process.execPath}\nlet buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;let result={};switch(request.method){case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;case 'account/read':result={account:{type:'chatgpt'}};break;case 'tools/call':result={content:[{type:'text',text:JSON.stringify({id:request.params.arguments.workspaceId})}]};break;case 'tools/list':result={tools:[{name:'gigi_records_get',description:'Read',inputSchema:{type:'object'}}]};break;case 'thread/read':return;case 'turn/interrupt':result={};break;case 'thread/start':result={thread:{id:'fixture-thread'}};break;case 'plugin/installed':result={marketplaces:[]};break;case 'turn/start':result={turn:{id:'fixture-turn'}};break;}process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');}});\n`);
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

test('Codex companion exposes ordinary preflight failures and exits when an owned provider child dies', async () => {
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
