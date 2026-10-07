import test from 'node:test';
import assert from 'node:assert/strict';
const tick = () => new Promise(resolve => setImmediate(resolve));
const decode = value => String(value ?? '').replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[name]);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

// Small DOM-boundary adapter: replacing markup replaces controls, as innerHTML does.
async function appFixture(exercise, custom = () => undefined) {
  const previous = { document: globalThis.document, __TAURI__: globalThis.__TAURI__, FormData: globalThis.FormData, setTimeout: globalThis.setTimeout, scrollTo: globalThis.scrollTo, scrollX: globalThis.scrollX, scrollY: globalThis.scrollY };
  const handlers = new Map(), calls = [], timers = [], controls = new Map(); let markup = '', form;
  const document = { activeElement: null, querySelector: selector => selector === '#app' ? root : root.querySelector(selector) };
  const root = { loading: false, classList: { toggle(name, value) { if (name === 'loading') root.loading = value; } }, addEventListener: (name, handler) => handlers.set(name, handler),
    get innerHTML() { return markup; }, set innerHTML(value) {
      markup = value; controls.clear(); document.activeElement = null;
      const formTag = value.match(/<form id="record-form"([^>]*)>/);
      form = formTag ? { id:'record-form', dataset:{editorVersion:formTag[1].match(/data-editor-version="([^"]*)"/)?.[1]}, get values(){return Object.fromEntries([...controls.values()].map(control => [control.name, control.value]));} } : null;
      if (form) for (const match of value.matchAll(/<(input|textarea|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>)?/g)) {
        const [, tag, attrs, body] = match; const id = attrs.match(/id="([^"]*)"/)?.[1], name = decode(attrs.match(/name="([^"]*)"/)?.[1]); if (!id || !name) continue;
        const control = { id, name, form, value:decode(tag === 'textarea' ? body : tag === 'select' ? body?.match(/<option value="([^"]*)" selected/)?.[1] || '' : attrs.match(/value="([^"]*)"/)?.[1]), selectionStart:0, selectionEnd:0, selectionDirection:'none', scrollTop:0,
          focus(){document.activeElement=this;}, setSelectionRange(start,end,direction){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}};
        controls.set(id, control);
      }
    }, querySelector(selector) { return selector === '#record-form' ? form : selector.startsWith('#') ? controls.get(selector.slice(1)) || null : null; }, querySelectorAll(){return [];} };
  let record = { id:'g1',title:'Saved title',fields:{Requirements:'Saved notes',Date:'2026-10-03'},source:{kind:'manual'},relations:[] };
  globalThis.document = document; globalThis.scrollX=0; globalThis.scrollY=0;
  globalThis.scrollTo=(x,y)=>{globalThis.scrollX=x;globalThis.scrollY=y;};
  globalThis.setTimeout=(callback,delay)=>{assert.equal(delay,5000);timers.push(callback);return timers.length;};
  globalThis.FormData=class{constructor(target){this.entries=Object.entries(target.values);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}};
  globalThis.__TAURI__={core:{invoke:async(_,{operation,input})=>{
    calls.push({operation,input}); const result=custom(operation,input); if(result!==undefined)return result;
    if(operation==='workspace.get')return{id:'w1',name:'Synthetic only'};
    if(operation==='records.list')return{items:[{id:input.entity==='profile'?'p1':input.entity==='gigs'?'g1':input.entity+'1',title:input.entity}],count:1};
    if(operation==='records.get')return input.entity==='profile'?{fields:{Currency:'CAD'}}:record;
    if(operation==='records.save'){record={...record,title:input.title,fields:input.fields};return record;}
    return{};
  }}};
  const click=async dataset=>{handlers.get('click')({target:{closest:()=>({dataset})}});await tick();};
  const type=(id,value,start=value.length,end=start)=>{const control=controls.get(id);assert.ok(control,id);control.value=value;control.focus();control.setSelectionRange(start,end,'backward');handlers.get('input')({target:control});};
  const submit=async()=>{handlers.get('submit')({preventDefault(){},target:form});await tick();};
  try { await import(`./app.mjs?reliability=${Math.random()}`);await tick();await exercise({root,click,type,submit,controls,timers,handlers,calls,document}); }
  finally {Object.assign(globalThis,previous);}
}

test('toast expiry and unrelated rerenders retain an unsaved editor draft, focus, selection and scroll', async()=>{
 await appFixture(async({root,click,type,submit,controls,timers,handlers,calls,document})=>{
  await click({page:'gigs'});await click({open:'g1',entity:'gigs'});await click({edit:'1'});
  type('title','First synthetic save');await submit();await click({edit:'1'});
  type('title','Unsubmitted next draft');type('field-requirements','Unsubmitted multiline\nnotes <&>',3,15);
  controls.get('field-requirements').scrollTop=27;globalThis.scrollY=190;
  assert.equal(timers.length,1);timers[0]();
  assert.equal(controls.get('title').value,'Unsubmitted next draft');
  assert.equal(controls.get('field-requirements').value,'Unsubmitted multiline\nnotes <&>');
  assert.equal(document.activeElement.id,'field-requirements');
  assert.deepEqual([document.activeElement.selectionStart,document.activeElement.selectionEnd,document.activeElement.selectionDirection],[3,15,'backward']);
  assert.equal(document.activeElement.scrollTop,27);assert.equal(globalThis.scrollY,190);
  // Benign unrelated workspace rerender, without submitting the editor.
  await click({agentProvider:'claude'});
  assert.equal(controls.get('title').value,'Unsubmitted next draft');
  assert.equal(controls.get('field-requirements').value,'Unsubmitted multiline\nnotes <&>');
  assert.equal(calls.filter(({operation})=>operation==='records.save').length,1);
  await click({cancel:'1'});await click({edit:'1'});
  assert.equal(controls.get('title').value,'First synthetic save','Cancel intentionally discards the draft');
 });
});

test('obsolete Person editor responses cannot open a Task editor after navigation', async()=>{
 const full=deferred();const person={id:'contacts1',title:'Person detail',fields:{Role:'Synthetic'},source:{kind:'manual'},relations:[]};
 await appFixture(async({root,click,calls})=>{
  await click({page:'contacts'});await click({open:'contacts1',entity:'contacts'});await click({edit:'1'});
  await click({page:'tasks'});full.resolve(person);await tick();
  assert.doesNotMatch(root.innerHTML,/id="record-form"/);
  assert.match(root.innerHTML,/GiGi \/ Tasks/);assert.doesNotMatch(root.innerHTML,/Person detail/);
  assert.equal(calls.some(({operation})=>/save|delete|import|link/.test(operation)),false);
 },(operation,input)=>operation==='records.get'&&input.entity==='contacts'?(input.detail==='full'?full.promise:person):undefined);
});

test('late collection and detail responses cannot replace newer navigation', async()=>{
 const list=deferred(),summary=deferred();
 await appFixture(async({root,click})=>{
  await click({page:'contacts'});await click({page:'tasks'});list.resolve({items:[{id:'c1',title:'Late Person'}],count:1});await tick();
  assert.doesNotMatch(root.innerHTML,/Late Person/);assert.match(root.innerHTML,/GiGi \/ Tasks/);
  await click({page:'gigs'});await click({open:'g1',entity:'gigs'});await click({page:'tasks'});summary.resolve({financialsComplete:true,currency:'CAD'});await tick();
  assert.doesNotMatch(root.innerHTML,/Record detail/);assert.match(root.innerHTML,/GiGi \/ Tasks/);
 },(operation,input)=>operation==='records.list'&&input.entity==='contacts'?list.promise:operation==='gigs.summary'?summary.promise:undefined);
});

test('repeated editor reads accept only the latest response and ignore obsolete failures', async()=>{
 const first=deferred(),second=deferred();let reads=0;
 await appFixture(async({root,click,controls})=>{
  await click({page:'gigs'});await click({open:'g1',entity:'gigs'});await click({edit:'1'});await click({edit:'1'});
  second.resolve({id:'g1',title:'Latest full read',fields:{Requirements:'Latest notes'},source:{kind:'manual'}});await tick();
  assert.equal(controls.get('title').value,'Latest full read');
  first.reject(Error('obsolete read failed'));await tick();
  assert.equal(controls.get('title').value,'Latest full read');assert.doesNotMatch(root.innerHTML,/obsolete read failed/);
  await click({cancel:'1'});await click({edit:'1'});await click({back:'1'});await tick();
  assert.doesNotMatch(root.innerHTML,/id="record-form"/);
 },(operation,input)=>operation==='records.get'&&input.detail==='full'?(++reads===1?first.promise:reads===2?second.promise:Promise.resolve({id:'g1',title:'Next read',fields:{}})):undefined);
});

test('a save already submitted keeps its original record scope and cannot navigate back over a newer page', async()=>{
 const save=deferred();
 await appFixture(async({root,click,type,submit,calls})=>{
  await click({page:'gigs'});await click({open:'g1',entity:'gigs'});await click({edit:'1'});type('title','Submitted gig title');await submit();
  await click({page:'tasks'});save.resolve({id:'g1',title:'Submitted gig title',fields:{Requirements:'Saved notes'},source:{kind:'manual'}});await tick();
  assert.match(root.innerHTML,/GiGi \/ Tasks/);assert.doesNotMatch(root.innerHTML,/Record detail/);
  const writes=calls.filter(({operation})=>operation==='records.save');assert.equal(writes.length,1);assert.equal(writes[0].input.entity,'gigs');assert.equal(writes[0].input.id,'g1');
 },operation=>operation==='records.save'?save.promise:undefined);
});

test('an obsolete completion cannot unlock the latest operation or report its stale error', async()=>{
 const old=deferred(),latest=deferred();
 await appFixture(async({root,click})=>{
  await click({page:'contacts'});await click({page:'tasks'});assert.equal(root.loading,true);
  old.reject(Error('obsolete collection failure'));await tick();
  assert.equal(root.loading,true);assert.doesNotMatch(root.innerHTML,/obsolete collection failure/);
  latest.resolve({items:[],count:0});await tick();assert.equal(root.loading,false);assert.match(root.innerHTML,/GiGi \/ Tasks/);
 },(operation,input)=>operation==='records.list'&&input.entity==='contacts'?old.promise:operation==='records.list'&&input.entity==='tasks'?latest.promise:undefined);
});

test('save failure retains unsent input and selection; repeated submit while pending cannot duplicate the write', async()=>{
 const save=deferred();
 await appFixture(async({root,click,type,submit,controls,calls,document})=>{
  await click({page:'gigs'});await click({open:'g1',entity:'gigs'});await click({edit:'1'});type('title','Unsaved failed title',2,8);
  await submit();await submit();assert.equal(calls.filter(({operation})=>operation==='records.save').length,1);
  save.reject(Error('synthetic conflict'));await tick();
  assert.equal(controls.get('title').value,'Unsaved failed title');assert.equal(document.activeElement.id,'title');
  assert.deepEqual([document.activeElement.selectionStart,document.activeElement.selectionEnd],[2,8]);
  assert.match(root.innerHTML,/synthetic conflict/);
 },operation=>operation==='records.save'?save.promise:undefined);
});

test('connector sign-in completion cannot navigate away from a newly opened editor', async()=>{
 const signIn=deferred();
 await appFixture(async({root,click,type,controls})=>{
  await click({page:'settings'});await click({signIn:'1'});await click({new:'gigs'});type('title','Draft after navigation');
  signIn.resolve({});await tick();assert.match(root.innerHTML,/id="record-form"/);assert.equal(controls.get('title').value,'Draft after navigation');
  assert.doesNotMatch(root.innerHTML,/Connector sign-in completed/);
 },operation=>operation==='auth.login'?signIn.promise:undefined);
});

test('gig detail remains inspectable when its financial summary fails, without inventing a balance', async()=>{
 await appFixture(async({root,click,calls})=>{
  await click({page:'gigs'});await click({open:'g1',entity:'gigs'});
  assert.match(root.innerHTML,/Record detail/);assert.match(root.innerHTML,/Saved notes/);assert.match(root.innerHTML,/Edit details/);
  assert.match(root.innerHTML,/Financial summary unavailable/);assert.doesNotMatch(root.innerHTML,/\$0\.00/);
  assert.equal(calls.some(({operation})=>/save|delete|import|link/.test(operation)),false);
 },operation=>operation==='gigs.summary'?Promise.reject(Error('synthetic summary failure')):undefined);
});

test('completed chat changes refresh profile currency before subsequent money proposals; read failure never uses cached units', async()=>{
 let currency='USD', reads=0, profileReads=0, failCurrency=false;
 const proposal=(entity,fieldValues,old)=>({sessionId:'s1',state:'approval',messages:[],approvals:[{id:'a1',title:'Approve gigi_records_save',detail:JSON.stringify({entity,title:'Synthetic record',fields:fieldValues,expectedRecord:{title:'Synthetic record',fields:old,source:{kind:'manual'}}})}],recordLinks:[]});
 await appFixture(async({root,click,calls})=>{
  await click({chatOpen:'1'});await click({chatSession:'s1'});await click({chatApproval:'a1',chatDecision:'approve'});await tick();
  assert.equal(profileReads,2);await click({chatSession:'s1'});
  assert.match(root.innerHTML,/CA\$100\.00 CAD/);assert.match(root.innerHTML,/CA\$200\.00 CAD/);assert.doesNotMatch(root.innerHTML,/\$200\.00 USD/);
  failCurrency=true;await click({chatApproval:'a1',chatDecision:'approve'});await tick();await click({chatSession:'s1'});
  assert.match(root.innerHTML,/200\.00 \(currency unavailable\)/);assert.doesNotMatch(root.innerHTML,/CA\$200\.00 CAD/);
  assert.equal(calls.filter(({operation})=>operation==='agent.chat.approve').length,2);
 },(operation,input)=>{
  if(operation==='records.get'&&input.entity==='profile'){profileReads++;return failCurrency?Promise.reject(Error('synthetic profile unavailable')):{fields:{Currency:currency}};}
  if(operation==='agent.chat.status')return{available:true,authenticated:true};
  if(operation==='agent.chat.list')return[{sessionId:'s1'}];
  if(operation==='agent.chat.read')return ++reads===1?proposal('profile',{Currency:'CAD'},{Currency:'USD'}):proposal('gigs',{Fee:20000},{Fee:10000});
  if(operation==='agent.chat.approve'){currency='CAD';return{sessionId:'s1',state:'idle',messages:[],approvals:[],recordLinks:[]};}
 });
});


test('Cancel during a submitted creation retains the write guard until it settles', async()=>{
 const save=deferred();
 await appFixture(async({root,click,type,submit,calls})=>{
  await click({page:'tasks'});await click({new:'tasks'});type('title','Synthetic creation');
  await submit();await click({cancel:'1'});
  assert.equal(root.loading,true);
  await click({new:'tasks'});type('title','Synthetic creation');await submit();
  assert.equal(calls.filter(({operation})=>operation==='records.save').length,1);
  save.resolve({id:'created',title:'Synthetic creation',fields:{},relations:[]});await tick();
  assert.equal(root.loading,false);
 },operation=>operation==='records.save'?save.promise:undefined);
});
