import {statusLabel} from './desktop-polish.mjs';
import {icon} from './icons.mjs';
import {createContactRead} from './contact-read.mjs';
import {scheduleEntry} from './schedule.mjs';
const defaults=()=>({view:'upcoming',sort:'date',query:'',from:'',to:''});
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function criteria(value={}) {
 const next=defaults();
 if(['upcoming','past','all','needs_date'].includes(value.view))next.view=value.view;
 if(['date','updated'].includes(value.sort))next.sort=value.sort;
 for(const key of ['query','from','to'])if(typeof value[key]==='string')next[key]=value[key].slice(0,key==='query'?160:10);
 for(const key of ['status','type'])if(value[key]===null||typeof value[key]==='string')next[key]=value[key];
 return next;
}
/** UI state only, scoped per workspace; business records remain in the domain. */
export function createGigs({read,changed=()=>{},storage=globalThis.localStorage,schedule=setTimeout,clear=clearTimeout}={}) {
 const workspaces=new Map(),reader=createContactRead();let current,active=false,version=0,timer;
 const persist=()=>{try{storage?.setItem(`gigi:gigs:${current.workspace}`,JSON.stringify({criteria:current.criteria,scroll:current.scroll}));}catch{}};
 const stop=()=>{version++;clear(timer);reader.cancel();if(current)current.loading=false;};
 function get(workspace){
  if(!workspaces.has(workspace)){
   let saved;try{saved=JSON.parse(storage?.getItem(`gigi:gigs:${workspace}`)||'null');}catch{}
   workspaces.set(workspace,{workspace,criteria:criteria(saved?.criteria),scroll:Math.max(0,Number(saved?.scroll)||0),focusId:null,result:null,error:'',loading:false,stale:false});
  }
  return workspaces.get(workspace);
 }
 async function load(more=false,restoreCount=0){
  if(!active||!current||(more&&(!current.result?.nextCursor||current.loading||current.stale||current.error)))return;
  stop();const selected=current,id=version;selected.loading=true;selected.error='';changed();
  const requested=JSON.stringify(selected.criteria);
  try{
   if(selected.criteria.from&&selected.criteria.to&&selected.criteria.from>selected.criteria.to)throw Error('Start date must be on or before end date.');
   let result=await reader.read(()=>read(selected.workspace,{...selected.criteria},more?selected.result.nextCursor:null));
   while(!more&&(result.items?.length||0)<restoreCount&&result.nextCursor){
    if(!active||id!==version||selected!==current)return;
    const page=await reader.read(()=>read(selected.workspace,{...selected.criteria},result.nextCursor));
    result={...page,items:[...(result.items||[]),...(page.items||[])]};
   }
   if(!active||id!==version||selected!==current||requested!==JSON.stringify(selected.criteria))return;
   selected.result={...result,items:more?[...selected.result.items,...(result.items||[])]:result.items||[]};selected.stale=false;
  }catch(error){
   if(!active||id!==version||selected!==current||error?.code==='contact_read_superseded')return;
   selected.error=error?.code==='contact_read_timeout'?'Loading took too long. Retry or refresh results.':error instanceof Error?error.message:String(error);
  }finally{if(active&&id===version&&selected===current){selected.loading=false;changed();}}
 }
 return {
  get state(){return current;},
  async open(workspace){stop();current=get(workspace);active=true;return load(false,current.result?.items?.length||0);},
  cancel(){stop();active=false;},
  remember(scroll,focusId){if(current){current.scroll=Math.max(0,Number(scroll)||0);current.focusId=focusId??current.focusId;persist();}},
  update(patch,debounce=true){if(!current)return;stop();current.criteria=criteria({...current.criteria,...patch});current.scroll=0;current.focusId=null;current.loading=true;current.stale=true;current.error='';persist();changed();if(debounce)timer=schedule(()=>void load(),150);else void load();},
  reset(){if(!current)return;stop();current.criteria=defaults();current.stale=true;current.scroll=0;current.focusId=null;persist();void load();},
  invalidate(workspace=current?.workspace){const saved=workspaces.get(workspace);if(!saved)return;saved.stale=true;if(saved===current&&active){stop();changed();}},
  refresh(){return load();},more(){return load(true);}
 };
}
const optionValue=value=>JSON.stringify(value);
export function gigsFilterValue(value){if(!value)return undefined;try{const parsed=JSON.parse(value);return parsed===null||typeof parsed==='string'?parsed:undefined;}catch{return undefined;}}
export function gigsView(state) {
 const s=state||{criteria:defaults()},c=s.criteria,r=s.result||{items:[]},items=r.items||[],total=r.total??r.count??0;
 const chosen=['status','type'].filter(key=>Object.hasOwn(c,key)).length+Number(Boolean(c.from||c.to));
 const options=(key,values)=>`<option value="">Any ${key}</option><option value="null" ${c[key]===null?'selected':''}>Not set</option>${[...new Set([...(values||[]),...(typeof c[key]==='string'?[c[key]]:[])])].map(value=>`<option value="${escape(optionValue(value))}" ${c[key]===value?'selected':''}>${escape(value)}</option>`).join('')}`;
 const viewButton=(value,title,count)=>`<button type="button" class="btn" data-gigs-view="${value}" aria-pressed="${c.view===value}">${title}${Number.isFinite(count)?` (${count})`:''}</button>`;
 const filters=[c.query?`Search: ${c.query}`:'',...['status','type'].filter(k=>Object.hasOwn(c,k)).map(k=>`${k==='status'?'Status':'Type'}: ${c[k]===null?'Not set':c[k]}`),c.from?`From ${c.from}`:'',c.to?`Through ${c.to}`:'',c.sort==='updated'?'Recently updated':''].filter(Boolean);
 const pending=s.loading||s.error||s.stale;
 const resultText=s.loading?'Updating results…':s.error?'Results unavailable':s.stale?'Results need refresh':`Showing ${items.length} of ${r.count??0} matching · ${total} total`;
 const empty=!s.result&&s.loading?'<p class="muted">Loading gigs…</p>':!items.length&&!pending?`<div class="empty"><strong>${total?'No gigs match this view.':'No gigs or shifts yet.'}</strong><p>${total?'Change the view or filters, or reset to Upcoming.':'Keep dates, fees and the people involved together.'}</p><button type="button" class="btn" ${total?'data-gigs-reset="1"':'data-new="gigs"'}>${total?'Reset view':'Add your first gig or shift'}</button></div>`:'';
 const list=items.map(record=>{const entry=scheduleEntry({...record,entity:'gigs'});const date=entry.key?new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${entry.key}T12:00:00`)):'Date needs attention';return `<button type="button" class="row gigs-row" data-open="${escape(record.id)}" data-entity="gigs"><span><strong>${escape(record.title||'Untitled')}</strong><small>${escape([date,entry.key?entry.time:'',statusLabel(record.status),record.type].filter(Boolean).join(' · '))}</small></span><span class="arrow" aria-hidden="true">${icon('arrow-up-right')}</span></button>`;}).join('');
 return `<section class="panel gigs-panel" aria-label="Gigs and shifts"><div class="gigs-toolbar"><div class="field gigs-search"><label for="gigs-search">Search gigs</label><input type="search" id="gigs-search" value="${escape(c.query)}" maxlength="160" autocomplete="off" placeholder="Title, linked person or place" aria-controls="gigs-results" aria-describedby="gigs-help"></div><div class="gigs-views" role="group" aria-label="Gig date view">${viewButton('upcoming','Upcoming',r.viewCounts?.upcoming)}${viewButton('past','Past',r.viewCounts?.past)}${viewButton('all','All',r.viewCounts?.all)}</div><details class="gigs-filters" data-view-key="gigs-filters"><summary class="btn">Filters${chosen?` (${chosen})`:''}</summary><div class="gigs-filter-fields"><div class="field"><label for="gigs-status">Status</label><select id="gigs-status" data-gigs-field="status">${options('status',r.statusOptions)}</select></div><div class="field"><label for="gigs-type">Type</label><select id="gigs-type" data-gigs-field="type">${options('type',r.typeOptions)}</select></div><div class="field"><label for="gigs-from">From date</label><input type="date" id="gigs-from" data-gigs-field="from" value="${escape(c.from)}"></div><div class="field"><label for="gigs-to">Through date</label><input type="date" id="gigs-to" data-gigs-field="to" value="${escape(c.to)}"></div></div></details><div class="field gigs-sort"><label for="gigs-sort">Sort</label><select id="gigs-sort" data-gigs-field="sort"><option value="date" ${c.sort==='date'?'selected':''}>${c.view==='past'?'Date · latest first':'Date · soonest first'}</option><option value="updated" ${c.sort==='updated'?'selected':''}>Recently updated</option></select></div><button type="button" class="btn text" data-gigs-reset="1">Reset</button></div><p id="gigs-help" class="muted gigs-help">Times in ${escape(Intl.DateTimeFormat().resolvedOptions().timeZone)} · Today and ongoing work stay in Upcoming. ⌘F searches gigs; Escape clears search.</p>${filters.length?`<p class="muted gigs-active">${escape(filters.join(' · '))}</p>`:''}<div class="panel-head"><h2>${c.view==='needs_date'?'Date needs attention':'Gigs & shifts'}</h2><span role="status" aria-live="polite">${escape(resultText)}</span></div><div class="gigs-result-actions">${viewButton('needs_date','Needs date',r.needsDateCount)}<button type="button" class="btn text" data-gigs-refresh="1" ${s.loading?'disabled':''}>Refresh results</button></div>${s.error?`<div class="gigs-error" role="alert"><p>${escape(s.error)}</p><button type="button" class="btn" data-gigs-refresh="1">Retry / refresh</button></div>`:''}${pending&&items.length?'<p class="muted">Previous results are shown below.</p>':''}<div id="gigs-results" aria-busy="${Boolean(s.loading)}">${empty}<div class="rows">${list}</div>${r.nextCursor?`<button type="button" class="btn section-gap" data-gigs-more="1" ${pending?'disabled':''}>Load more</button>`:''}</div></section>`;
}
