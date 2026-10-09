import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, writeFileSync, readFileSync, readdirSync, symlinkSync, mkdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createSession, handle } from './server.mjs';
const { createDocument } = await import('../src/lib/document.ts');
function fixture(allow = true, document = createDocument('Synthetic offline canvas')) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'draw-offline-test-')));
  const input = join(root, 'source.json'); writeFileSync(input, JSON.stringify(document));
  return { root, input, session: createSession(input, root, allow) };
}
test('typed proposal preserves original, exports importable v1 and before snapshot', () => {
  const { input, session } = fixture(), bytes = readFileSync(input), before = session.read();
  const result = session.propose({ expectedRevision: before.revision, operations: [{ type: 'set_title', title: 'Reviewed copy' }] });
  assert.equal(JSON.parse(readFileSync(result.documentPath)).title, 'Reviewed copy');
  assert.deepEqual(JSON.parse(readFileSync(result.beforePath)), before.document);
  assert.deepEqual(readFileSync(input), bytes);
  assert.equal(result.status, 'pending-human-import');
});
test('stale revision and invalid atomic batch publish nothing', () => {
  const { root, input, session } = fixture(), revision = session.read().revision;
  assert.throws(() => session.propose({ expectedRevision: revision, operations: [{ type: 'set_title', title: 'Would change' }, { type: 'eval', code: 'bad' }] }), /Invalid/);
  const changed = session.read().document; changed.title = 'Human edit'; writeFileSync(input, JSON.stringify(changed));
  assert.throws(() => session.propose({ expectedRevision: revision, operations: [{ type: 'set_title', title: 'Lost edit' }] }), /Stale/);
  assert.deepEqual(readdirSync(join(root, readdirSync(root).find(n => n.startsWith('draw-session-')))), []);
});
test('read-only grant cannot create proposals', () => {
  const { session } = fixture(false);
  assert.throws(() => session.propose({ expectedRevision: session.read().revision, operations: [{ type: 'set_title', title: 'X' }] }), /Read-only/);
});
test('locked objects and locked group descendants cannot change or unlock', () => {
  const doc = createDocument();
  doc.objects = [{kind:'note',id:'n',createdAt:doc.createdAt,x:0,y:0,width:100,height:100,text:'Locked'}, {kind:'group',id:'g',createdAt:doc.createdAt,x:0,y:0,width:100,height:100,label:'G',childIds:['n'],locked:true}];
  const { session } = fixture(true,doc);
  for (const object of [{...doc.objects[0], text:'Changed'}, {...doc.objects[1], locked:false}])
    assert.throws(() => session.propose({ expectedRevision:session.read().revision,operations:[{type:'put_object',object}] }), /lock/i);
});
test('source scope rejects symlinks, native state and full projects', () => {
  const { root, input } = fixture(); symlinkSync(input, join(root,'link.json'));
  assert.throws(() => createSession(join(root,'link.json'), root), /symlink/);
  for (const value of [{document:createDocument(),clients:{}}, {version:'draw.project.v1',canvas:createDocument()}]) {
    writeFileSync(join(root,'wrong.json'),JSON.stringify(value));
    assert.throws(() => createSession(join(root,'wrong.json'),root), /Canvas/);
  }
});
test('independent sessions never overwrite each other', () => {
  const { root,input,session }=fixture(), second=createSession(input,root,true);
  const args={expectedRevision:session.read().revision,operations:[{type:'set_title',title:'Copy'}]};
  const a=session.propose(args), b=second.propose(args);
  assert.notEqual(a.documentPath,b.documentPath);
  assert.equal(session.read().document.title,'Synthetic offline canvas');
});
test('tool interface rejects path overrides, unknown operations and oversized batches', () => {
  const { session }=fixture();
  for (const params of [{name:'draw_offline_read',arguments:{path:'/etc/passwd'}},{name:'draw_offline_propose',arguments:{expectedRevision:session.read().revision,operations:Array(101).fill({type:'set_title',title:'X'})}},{name:'shell',arguments:{}}])
    assert.equal(handle(session,{jsonrpc:'2.0',id:1,method:'tools/call',params}).result.isError,true);
});
test('real stdio initialize/list/read/propose, no network required', () => {
  const { root,input,session }=fixture();
  const requests=[{method:'initialize',params:{protocolVersion:'2024-11-05'}},{method:'tools/list'},{method:'tools/call',params:{name:'draw_offline_read'}},{method:'tools/call',params:{name:'draw_offline_propose',arguments:{expectedRevision:session.read().revision,operations:[{type:'set_background',background:'#ffffff'}]}}}].map((r,i)=>({jsonrpc:'2.0',id:i,...r}));
  const process=spawnSync(globalThis.process.execPath,[new URL('./server.mjs',import.meta.url).pathname,'--input',input,'--output',root,'--allow-proposals'],{input:requests.map(JSON.stringify).join('\n')+'\n',encoding:'utf8'});
  assert.equal(process.status,0,process.stderr);
  const replies=process.stdout.trim().split('\n').map(JSON.parse);
  assert.equal(replies.length,4); assert.equal(replies[1].result.tools.length,2);
  assert.equal(JSON.parse(replies[3].result.content[0].text).status,'pending-human-import');
});
test('generated plugin is bound to exact source and launchable without installation', () => {
  const {root,input}=fixture();
  const output=join(root,'plugin');
  const child=spawnSync(process.execPath,[new URL('./package-plugin.mjs',import.meta.url).pathname,input,root,output,'--allow-proposals'],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);
  const config=JSON.parse(readFileSync(join(output,'.mcp.json'))).mcpServers['draw-offline'];
  const launched=spawnSync(config.command,config.args,{input:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'draw_offline_read'}})+'\n',encoding:'utf8'});
  assert.equal(launched.status,0,launched.stderr);
  assert.equal(JSON.parse(JSON.parse(launched.stdout).result.content[0].text).document.title,'Synthetic offline canvas');
});

test('replaced source parent and output session symlinks fail after startup', () => {
  const {root}=fixture();
  const selected=join(root,'selected'), outside=join(root,'outside');
  mkdirSync(selected); mkdirSync(outside);
  const input=join(selected,'source.json');
  writeFileSync(input,JSON.stringify(createDocument('Selected')));
  writeFileSync(join(outside,'source.json'),JSON.stringify(createDocument('Outside')));
  const session=createSession(input,root,true);
  renameSync(selected,selected+'-old'); symlinkSync(outside,selected);
  assert.throws(()=>session.read(),/symlink/);
  const f=fixture(), own=readdirSync(f.root).find(n=>n.startsWith('draw-session-'));
  renameSync(join(f.root,own),join(f.root,own+'-old'));
  symlinkSync(outside,join(f.root,own));
  assert.throws(()=>f.session.propose({expectedRevision:f.session.read().revision,operations:[{type:'set_title',title:'X'}]}),/symlink/);
});
