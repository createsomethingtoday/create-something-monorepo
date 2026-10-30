import {eventLabel} from './event-identity.mjs';
import {imageMarkup} from './artwork.mjs';
import {scheduleEntry} from './schedule.mjs';
// Presentation-only adaptation of grantbot 3f39f6468. No new data or permissions.
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createWorkspaceHistory(initial='overview') {
  let pages=[initial], position=0;
  return {
    visit(page,index=null) { if(index!==null && pages[index]===page) position=index; else if(pages[position]!==page) { pages=pages.slice(0,position+1); pages.push(page); position++; } },
    target(delta) { const index=position+delta; return index>=0&&index<pages.length?{page:pages[index],index}:null; }
  };
}
export function referenceHeader({page,sections,workspace,history}) {
  const safe=escapeHtml;
  const primary=['overview','music','gigs','contacts'];
  const title=id=>({overview:'Today',music:'Music',gigs:'Gigs',contacts:'People'}[id] || sections.find(s=>s.id===id)?.label || id);
  const button=id=>`<button type="button" data-page="${safe(id)}" ${page===id?'aria-current="page"':''}>${safe(title(id))}</button>`;
  const other=sections.filter(s=>!primary.includes(s.id)&&s.id!=='settings');
  return `<header class="reference-header"><div class="reference-history"><button type="button" data-workspace-history="-1" aria-label="Previous page" title="Previous page (Command-[)" ${history.target(-1)?'':'disabled'}>‹</button><button type="button" data-workspace-history="1" aria-label="Next page" title="Next page (Command-])" ${history.target(1)?'':'disabled'}>›</button></div><button type="button" class="reference-brand" data-page="overview" aria-label="GiGi Today">GiGi</button><button type="button" class="reference-find" data-find-people="1" title="Open People search (Command-Shift-F)">⌕ <span>Find people</span><kbd>⇧⌘F</kbd></button><nav class="reference-nav" aria-label="Workspace pages">${primary.map(button).join('')}<details class="reference-more" data-view-key="reference-more"><summary data-nav-overflow="1" ${other.some(s=>s.id===page)?'class="selected"':''}>${other.some(s=>s.id===page)?safe(title(page)):'More'} <span aria-hidden="true">⌄</span></summary><div class="reference-menu"><p>${safe(workspace || 'Local workspace')}</p>${other.map(s=>button(s.id)).join('')}<details class="reference-shortcuts" data-view-key="reference-shortcuts"><summary>Keyboard shortcuts</summary><p>Find people: ⇧⌘F (Ctrl-Shift-F)<br>Focus People search: ⌘F (Ctrl-F)<br>Previous / next page: ⌘[ / ⌘]<br>Close More or Ask GiGi: Escape</p></details><small>Stored on this Mac</small></div></details></nav><button type="button" class="reference-ask" data-chat-open="1">Ask GiGi</button><button type="button" class="reference-customize" data-page="appearance" ${page==='appearance'?'aria-current="page"':''}>Customize</button><button type="button" class="reference-settings" data-page="settings" ${page==='settings'?'aria-current="page"':''} aria-label="Settings and connection status" title="Settings and connection status">⚙</button></header>`;
}
export function referenceCards(entity,records,{status,date,money}) {
  const safe=escapeHtml;
  return `<div class="today-grid">${records.map(record=>`<button type="button" class="today-card" data-open="${safe(record.id)}" data-entity="${safe(entity==='events'?record.entity:entity)}">${imageMarkup(record.cover)}<span class="today-card-kind">${safe(['events','gigs','schedule'].includes(entity)?eventLabel(record,entity==='events'?record.entity:entity):{tasks:'Saved task',finances:'Financial record'}[entity])}</span><strong>${safe(record.title || 'Untitled')}</strong><span class="today-card-status">${safe(status(record)||'Status not set')}</span><span class="today-card-footer"><span>${safe(record.date?date(record.date):'No date recorded')}</span><span>${entity==='events'?`${safe(scheduleEntry(record).time)} · `:''}${safe(entity==='finances'?[record.fields?.Direction||'Direction not set',money(record.moneyCents)].join(' · '):'Open record ↗')}</span></span></button>`).join('')}</div>`;
}
