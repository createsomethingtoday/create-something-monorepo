import test from 'node:test';
import assert from 'node:assert/strict';

test('desktop exposes durable attention and starts workspace observation outside chat', async () => {
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  const listeners = new Map(), calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(type, fn) { listeners.set(type, fn); }, querySelector() { return null; } };
  globalThis.document = { querySelector: () => root, addEventListener() {}, hasFocus: () => true };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    calls.push({ operation, input });
    if (operation === 'workspace.get') return { id: 'w1', name: 'Synthetic' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [] };
    if (operation === 'records.get') return { id: 'p1', title: 'Synthetic owner', fields: { Currency: 'USD' } };
    if (operation === 'agent.chat.list') return { sessions: [] };
    if (operation.startsWith('attention.')) return { items: [], unreadCount: 0, settings: { enabled: false, reminders: false, detailedPreviews: false, quietStart: 22, quietEnd: 8 } };
    return {};
  } } };
  try {
    await import(`./app.mjs?attention=${Date.now()}`);
    for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
    assert.match(root.innerHTML, /Needs your attention/);
    assert.match(root.innerHTML, /data-attention-home/);
    assert(calls.some(call => call.operation === 'attention.refresh' && call.input.workspaceId === 'w1'));
    assert(!calls.some(call => ['agent.chat.start', 'agent.chat.send', 'agent.chat.approve', 'notifications.request'].includes(call.operation)), 'observation cannot start paid turns, edits or permission prompts');
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; }
});

test('Ask GiGi on an attention source creates the correct context after a workspace chat',async()=>{
 const previous={document:globalThis.document,tauri:globalThis.__TAURI__};const handlers=new Map(),calls=[];let session=0;const contexts=new Map();
 const item={id:'attention-task',revision:'r1',kind:'reminder',entity:'tasks',recordId:'task1',title:'Synthetic task',unread:true};
 const root={innerHTML:'',classList:{toggle(){}},addEventListener(name,fn){handlers.set(name,fn);},querySelector(){return null;}};
 globalThis.document={querySelector:()=>root,addEventListener(){}};
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  calls.push({operation,input});
  if(operation==='workspace.get')return{id:'w1',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'p1'}]:[]};
  if(operation==='records.get')return{fields:{Currency:'USD'}};
  if(operation==='agent.chat.status')return{available:true,authenticated:true};
  if(operation==='agent.chat.list')return{sessions:[...contexts].map(([sessionId,record])=>({sessionId,state:'idle',record}))};
  if(operation==='agent.chat.start'){const sessionId='session'+(++session);contexts.set(sessionId,input.record);return{sessionId};}
  if(operation==='agent.chat.read')return{sessionId:input.sessionId,state:'idle',messages:[],approvals:[],recordLinks:[]};
  if(operation.startsWith('attention.'))return{items:[item],unreadCount:1,settings:{enabled:false}};
  return{};
 }}};
 const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
 const click=async dataset=>{handlers.get('click')({target:{closest:()=>({dataset})}});await settle();};
 try{
  await import(`./app.mjs?attention-context=${Date.now()}`);await settle();
  await click({chatOpen:'1'});await click({chatNew:'1'});await click({attentionAsk:item.id});
  const starts=calls.filter(x=>x.operation==='agent.chat.start');
  assert.equal(starts.length,2);assert.deepEqual(starts[1].input.record,{entity:'tasks',id:'task1'});
  assert(!calls.some(x=>x.operation==='agent.chat.send'),'context preparation does not send a model turn');
 }finally{globalThis.document=previous.document;globalThis.__TAURI__=previous.tauri;}
});
