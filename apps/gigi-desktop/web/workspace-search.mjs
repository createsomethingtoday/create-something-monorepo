import {captureViewState, restoreViewState} from './view-state.mjs';
import {icon, entityIcon} from './icons.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = new Set(['contacts','gigs','finances','tasks']);

export function workspaceSearchShortcut(event) {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key?.toLowerCase() === 'f';
}

export class WorkspaceSearch {
  constructor(read, changed) {
    this.read=read; this.changed=changed;
    this.visible=false; this.query=''; this.groups=[]; this.busy=false; this.error=false;
    this.version=0; this.timer=null;
  }
  open(workspaceId) {
    this.close(false);
    this.workspaceId=workspaceId; this.visible=true; this.query=''; this.groups=[]; this.error=false;
    this.changed();
  }
  close(notify=true) {
    clearTimeout(this.timer); this.version++; this.visible=false; this.busy=false;
    if(notify)this.changed();
  }
  update(query) {
    clearTimeout(this.timer); this.version++;
    this.query=String(query).slice(0,160); this.groups=[]; this.error=false;
    this.busy=Boolean(this.query.trim()); this.changed();
    if(this.busy)this.timer=setTimeout(()=>void this.search(),150);
  }
  async search(entity=null) {
    if(!this.visible || !this.query.trim() || entity && !categories.has(entity))return;
    clearTimeout(this.timer);
    const version=++this.version, workspaceId=this.workspaceId;
    const previous=entity?this.groups.find(group=>group.entity===entity):null;
    if(entity&&!previous?.nextCursor)return;
    this.busy=true; this.error=false; this.changed();
    let timeout;
    try {
      const result=await Promise.race([
        this.read({workspaceId,query:this.query.trim(),limit:6,...(entity?{entity,cursor:previous.nextCursor}:{})}),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Search timed out')),10000);})
      ]);
      if(version!==this.version || !this.visible || workspaceId!==this.workspaceId)return;
      const groups=(result.groups||[]).filter(group=>categories.has(group.entity));
      if(entity){
        const page=groups.find(group=>group.entity===entity);
        if(page)this.groups=this.groups.map(group=>group.entity===entity?{...page,items:[...group.items,...page.items.filter(item=>!group.items.some(old=>old.id===item.id))]}:group);
      }else this.groups=groups;
    }catch {
      if(version===this.version && this.visible)this.error=true;
    }finally {
      clearTimeout(timeout);
      if(version===this.version && this.visible){this.busy=false;this.changed();}
    }
  }
}

function searchResults(search) {
  const groups=search.groups.filter(group=>group.items.length);
  const results=groups.map(group=>`<section class="workspace-search-group" aria-labelledby="search-group-${safe(group.entity)}"><h2 id="search-group-${safe(group.entity)}">${icon(entityIcon(group.entity))}${safe(group.label)}<span>${Number(group.count)||0}</span></h2>${group.items.map(item=>`<button type="button" class="workspace-search-result" data-search-record="${safe(item.id)}" data-search-entity="${safe(group.entity)}"><span>${safe(item.title||'Untitled')}${item.titleTruncated?'…':''}</span><span aria-hidden="true">↗</span></button>`).join('')}${group.nextCursor?`<button type="button" class="workspace-search-more" data-search-more="${safe(group.entity)}" aria-disabled="${search.busy}">Show more ${safe(group.label.toLowerCase())}</button>`:''}</section>`).join('');
  const message=search.error?'<div class="workspace-search-empty" role="alert"><strong>Couldn’t finish this search.</strong><p>Try again to search your local workspace.</p><button type="button" class="btn" data-search-retry="1">Retry search</button></div>':search.busy?'<p class="workspace-search-status" role="status">Searching…</p>':!search.query.trim()?'<div class="workspace-search-empty"><strong>Find something in your workspace.</strong><p>Search people, gigs, finances and tasks.</p></div>':!groups.length?`<div class="workspace-search-empty" role="status"><strong>No results for “${safe(search.query)}”.</strong><p>Try another name or a few words from a title.</p></div>`:'';
  return `${message}${results}`;
}

export function workspaceSearchView(search) {
  if(!search.visible)return '';
  return `<div class="workspace-search-backdrop" data-search-backdrop="1"><section class="workspace-search-dialog" role="dialog" aria-modal="true" aria-label="Search workspace"><div class="workspace-search-input">${icon('search')}<input type="search" id="workspace-search-input" aria-label="Search people, gigs, finances and tasks" placeholder="Search your workspace…" maxlength="160" autocomplete="off" value="${safe(search.query)}" aria-controls="workspace-search-results"><button type="button" data-search-close="1" aria-label="Close search"><kbd>esc</kbd></button></div><div id="workspace-search-results" class="workspace-search-results" aria-busy="${search.busy}">${searchResults(search)}</div><footer><span>↑ ↓ to move</span><span>↵ to open</span><span>esc to close</span></footer></section></div>`;
}

export function workspaceSearchKey(root,event,close) {
  if(event.isComposing)return;
  if(event.key==='Escape'){event.preventDefault?.();close();return;}
  const dialog=root.querySelector?.('.workspace-search-dialog');
  if(!dialog)return;
  const input=dialog.querySelector('#workspace-search-input');
  if(workspaceSearchShortcut(event)){event.preventDefault?.();input?.focus?.();return;}
  const results=[...dialog.querySelectorAll('.workspace-search-result')];
  const active=globalThis.document?.activeElement;
  const index=results.indexOf(active);
  if(event.key==='ArrowDown' && results.length){event.preventDefault?.();results[Math.min(index+1,results.length-1)].focus();}
  else if(event.key==='ArrowUp' && (index>=0 || active===input)){event.preventDefault?.();(index>0?results[index-1]:input)?.focus();}
  else if(event.key==='Enter' && active===input && results.length){event.preventDefault?.();results[0].click();}
  else if(event.key==='Tab'){
    const controls=[...dialog.querySelectorAll('input, button:not(:disabled)')];
    if(!controls.length)return;
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey && (active===first || !dialog.contains(active))){event.preventDefault?.();last.focus();}
    else if(!event.shiftKey && (active===last || !dialog.contains(active))){event.preventDefault?.();first.focus();}
  }
}

export function updateWorkspaceSearchHost(host,search) {
  const focused=host.contains?.(globalThis.document?.activeElement);
  const snapshot=focused?captureViewState(host):null;
  const previousResults=host.querySelector?.('.workspace-search-results');
  const input=host.querySelector?.('#workspace-search-input');
  const scroll=previousResults?.scrollTop || 0;
  // Keep the live input (and its native IME composition) across result reads.
  if(search.visible && previousResults && input){
    previousResults.innerHTML=searchResults(search);
    previousResults.setAttribute('aria-busy',String(search.busy));
    if(globalThis.document?.activeElement!==input)input.value=search.query;
  }else host.innerHTML=workspaceSearchView(search);
  if(!input || globalThis.document?.activeElement!==input)restoreViewState(host,snapshot);
  const results=host.querySelector?.('.workspace-search-results');
  if(results)results.scrollTop=scroll;
  if(focused&&!host.contains?.(globalThis.document?.activeElement))host.querySelector?.('#workspace-search-input')?.focus?.({preventScroll:true});
}
