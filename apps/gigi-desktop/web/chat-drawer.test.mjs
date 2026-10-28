import test from 'node:test';
import assert from 'node:assert/strict';

test('Ask GiGi opens once, updates its mounted drawer during status changes, and Escape closes it', async () => {
  const listeners = new Map();
  let markup = '', pageWrites = 0, focusReturned = false, panelMounted = false, insertedMarkup = '';
  const contentNode = { scrollTop: 137 };
  let panelMarkup = '';
  const intro = { scrollTop: 0 };
  const closeControl = { dataset: { chatClose:'1' }, focus() { globalThis.document.activeElement = this; } };
  const panel = {
    get innerHTML() { return panelMarkup; },
    set innerHTML(value) { panelMarkup = value; intro.scrollTop = 0; globalThis.document.activeElement = null; },
    querySelector(selector) { return selector === '.chat-intro' ? intro : null; },
    remove() { panelMounted = false; },
  };
  const shellNode = { insertAdjacentHTML(position, value) { assert.equal(position, 'beforeend'); insertedMarkup = value; panelMounted = true; } };
  const root = {
    get innerHTML() { return markup; },
    set innerHTML(value) { markup = value; pageWrites++; panelMounted = value.includes('class="chat-panel'); },
    classList: { toggle() {} },
    addEventListener(type, handler) { listeners.set(type, handler); },
    querySelector(selector) {
      if (selector === '.shell') return markup.includes('class="shell"') ? shellNode : null;
      if (selector === '.content-primary') return contentNode;
      if (selector === '.chat-panel') return panelMounted ? panel : null;
      if (selector === '[data-chat-close]') return closeControl;
      if (selector === '[data-chat-open]') return { focus() { focusReturned = true; } };
      return null;
    },
  };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__ };
  globalThis.document = { activeElement:null, addEventListener(type,handler) { listeners.set('document:'+type,handler); }, querySelector: (selector) => selector === '#app' ? root : null };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation, input }) => {
    if (operation === 'workspace.get') return { id: 'w1', name: 'Private' };
    if (operation === 'records.list') return { items: input.entity === 'profile' ? [{ id: 'p1' }] : [] };
    if (operation === 'records.get') return { id: 'p1', title: 'Owner', fields: { Currency: 'USD' } };
    if (operation === 'agent.chat.status') return { provider: 'codex', available: true, authenticated: true };
    if (operation === 'agent.chat.list') return { sessions: [] };
    return {};
  } } };
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  try {
    await import(`./app.mjs?chat-drawer=${Date.now()}`); await settle();
    const writesBeforeOpen = pageWrites;
    const retainedContent = root.querySelector('.content-primary');
    listeners.get('click')({ target: { closest: () => ({ dataset: { chatOpen: '1' } }) } });
    const writesOnOpen = pageWrites;
    assert.equal(document.activeElement, closeControl, 'opening moves keyboard focus into drawer');
    intro.scrollTop = 137;
    assert.equal(writesOnOpen, writesBeforeOpen, 'opening the drawer must preserve the workspace DOM');
    assert.match(insertedMarkup, /class="chat-panel chat-entering"/);
    assert.equal(root.querySelector('.content-primary'), retainedContent);
    assert.equal(retainedContent.scrollTop, 137);
    await settle();
    assert.equal(pageWrites, writesOnOpen, 'status update should not rebuild the page or reopen the drawer');
    assert.match(panel.innerHTML, /Codex signed in/);
    assert.equal(document.activeElement, closeControl, 'status repaint retains focused drawer action');
    assert.equal(intro.scrollTop, 137, 'status update preserves access to lower conversation entries');
    assert.doesNotMatch(markup, /content-with-chat/);
    let prevented = false;
    globalThis.document.activeElement = null;
    listeners.get('document:keydown')({ key: 'Escape', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(focusReturned, true);
    assert.equal(panelMounted, false);
    assert.equal(pageWrites, writesBeforeOpen, 'closing the drawer must preserve the workspace DOM');
    assert.equal(root.querySelector('.content-primary'), retainedContent);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; }
});

test('first workspace creation initializes Ask GiGi without requiring an app restart', async () => {
  const listeners = new Map(), calls = [];
  const root = { innerHTML: '', classList: { toggle() {} }, addEventListener(type, handler) { listeners.set(type, handler); }, querySelector() { return null; } };
  const previous = { document: globalThis.document, tauri: globalThis.__TAURI__, FormData: globalThis.FormData };
  globalThis.document = { querySelector: () => root };
  globalThis.FormData = class { constructor(form) { this.values = form.values; } [Symbol.iterator]() { return Object.entries(this.values)[Symbol.iterator](); } };
  globalThis.__TAURI__ = { core: { invoke: async (_command, { operation }) => {
    calls.push(operation);
    if (operation === 'workspace.get') return {};
    if (operation === 'workspace.create') return { id: 'fresh', name: 'Fresh synthetic' };
    if (operation === 'agent.chat.status') return { provider: 'codex', available: false, authenticated: false, reason: 'codex_unavailable' };
    if (operation === 'agent.chat.list') return { sessions: [] };
    return {};
  } } };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  try {
    await import(`./app.mjs?first-chat=${Date.now()}`); await settle();
    assert.match(root.innerHTML, /Create private workspace/);
    listeners.get('submit')({ preventDefault() {}, target: { id: 'workspace-form', values: { ownerName: 'Synthetic owner', name: 'Fresh synthetic', currency: 'USD' } } }); await settle();
    assert.match(root.innerHTML, /Your private workspace is ready/);
    listeners.get('click')({ target: { closest: () => ({ dataset: { chatOpen: '1' } }) } }); await settle();
    assert.match(root.innerHTML, /class="chat-panel/);
    assert.ok(calls.includes('agent.chat.status'));
    assert.equal(calls.filter(operation => operation === 'workspace.create').length, 1);
  } finally { globalThis.document = previous.document; globalThis.__TAURI__ = previous.tauri; globalThis.FormData = previous.FormData; }
});

test('Check status restores its control after disabled repaint without stealing a later focus choice', async()=>{
 const handlers=new Map();let markup='',panelMarkup='',mounted=false,statusReads=0,resolveStatus;
 const document={activeElement:null,body:{},documentElement:{},addEventListener(type,handler){handlers.set('document:'+type,handler);},querySelector:()=>root};
 const refresh={dataset:{chatRefresh:'1'},focus(){if(!/data-chat-refresh="1" disabled/.test(panelMarkup))document.activeElement=this;}};
 const close={dataset:{chatClose:'1'},focus(){document.activeElement=this;}};
 const panel={set innerHTML(value){panelMarkup=value;document.activeElement=document.body;},querySelector(){return null;},remove(){mounted=false;}};
 const root={get innerHTML(){return markup;},set innerHTML(value){markup=value;},classList:{toggle(){}},addEventListener(type,handler){handlers.set(type,handler);},querySelector(selector){
  if(selector==='.shell')return{insertAdjacentHTML(_position,value){mounted=true;panelMarkup=value;}};
  if(selector==='.chat-panel')return mounted?panel:null;
  if(selector==='[data-chat-close]')return close;
  if(selector==='[data-chat-refresh]')return refresh;
  return null;
 }};
 const prior={document:globalThis.document,tauri:globalThis.__TAURI__};globalThis.document=document;
 globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
  if(operation==='workspace.get')return{id:'w',name:'Synthetic'};
  if(operation==='records.list')return{items:input.entity==='profile'?[{id:'p'}]:[]};
  if(operation==='records.get')return{fields:{Currency:'USD'}};
  if(operation==='agent.chat.status'){if(++statusReads===1)return{available:false,reason:'codex_unavailable'};return new Promise(resolve=>{resolveStatus=resolve;});}
  if(operation==='agent.chat.list')return{sessions:[]};return{};
 }}};
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 const click=button=>handlers.get('click')({target:{closest:()=>button}});
 try{
  await import(`./app.mjs?refresh-focus=${Date.now()}`);await tick();
  click({dataset:{chatOpen:'1'}});await tick();
  click(refresh);assert.equal(document.activeElement,document.body,'disabled repaint loses browser focus');
  resolveStatus({available:false,reason:'codex_unavailable'});await tick();assert.equal(document.activeElement,refresh);
  click(refresh);document.activeElement=close;handlers.get('document:focusin')({target:close});
  resolveStatus({available:false,reason:'codex_unavailable'});await tick();assert.equal(document.activeElement,close,'retain user focus after completion');
 }finally{globalThis.document=prior.document;globalThis.__TAURI__=prior.tauri;}
});
