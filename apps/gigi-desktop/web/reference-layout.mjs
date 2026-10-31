import {eventLabel} from './event-identity.mjs';
import {imageMarkup} from './artwork.mjs';
import {scheduleEntry} from './schedule.mjs';
import {icon,entityIcon} from './icons.mjs';
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
  const title=id=>({overview:'Today',music:'Music',gigs:'Gigs',contacts:'People',appearance:'Appearance & views'}[id] || sections.find(s=>s.id===id)?.label || id);
  const button=(id,menu=false)=>`<button type="button" data-page="${safe(id)}" ${page===id?'aria-current="page"':''}>${menu?`${icon(entityIcon(id))}<span>${safe(title(id))}</span>${page===id?'<span class="reference-menu-current" aria-hidden="true">✓</span>':''}`:safe(title(id))}</button>`;
  const groups=[['Work',['schedule','tasks','finances','social']],['Library',['companies','locations','notes','documents','interactions','services','tags']],['Workspace',['profile','history','appearance','settings']]];
  const known=new Set(sections.map(s=>s.id));known.add('appearance');
  const grouped=new Set([...primary,...groups.flatMap(([,ids])=>ids)]);
  const additional=sections.filter(s=>!grouped.has(s.id)).map(s=>s.id);
  const menuGroups=groups.map(([name,ids],index)=>`<section class="reference-menu-group" aria-labelledby="reference-group-${index}"><h2 id="reference-group-${index}">${name}</h2>${[...ids,...(name==='Library'?additional:[])].filter(id=>known.has(id)).map(id=>button(id,true)).join('')}</section>`).join('');
  const secondary=!primary.includes(page)&&known.has(page);
  return `<header class="reference-header"><div class="reference-history"><button type="button" data-workspace-history="-1" aria-label="Previous page" title="Previous page (Command-[)" ${history.target(-1)?'':'disabled'}>‹</button><button type="button" data-workspace-history="1" aria-label="Next page" title="Next page (Command-])" ${history.target(1)?'':'disabled'}>›</button></div><button type="button" class="reference-brand" data-page="overview" aria-label="GiGi Today">GiGi</button><button type="button" class="reference-find" data-find-people="1" aria-label="Find people" title="Open People search (Command-Shift-F)">${icon('search')} <span>Find people</span><kbd>⇧⌘F</kbd></button><nav class="reference-nav" aria-label="Workspace pages">${primary.map(id=>button(id)).join('')}<details class="reference-more" data-view-key="reference-more"><summary data-nav-overflow="1" ${secondary?'class="selected"':''} aria-label="More workspace pages${secondary?` · ${safe(title(page))}`:''}">${secondary?safe(title(page)):'More'} <span aria-hidden="true">⌄</span></summary><div class="reference-menu"><div class="reference-menu-workspace"><small>Private workspace</small><p>${safe(workspace || 'Local workspace')}</p></div><nav class="reference-menu-grid" aria-label="More workspace pages">${menuGroups}</nav><div class="reference-menu-footer"><details class="reference-shortcuts" data-view-key="reference-shortcuts"><summary>Keyboard shortcuts</summary><p>Find people: ⇧⌘F (Ctrl-Shift-F)<br>Focus People search: ⌘F (Ctrl-F)<br>Previous / next page: ⌘[ / ⌘]<br>Move through pages: ↑ / ↓<br>Close navigation or Ask GiGi: Escape</p></details><small>Stored on this Mac</small></div></div></details></nav><button type="button" class="reference-ask" data-chat-open="1">Ask GiGi</button><button type="button" class="reference-customize" data-page="appearance" ${page==='appearance'?'aria-current="page"':''}>Customize</button><button type="button" class="reference-settings" data-page="settings" ${page==='settings'?'aria-current="page"':''} aria-label="Settings and connection status" title="Settings and connection status">${icon('settings')}</button></header>`;
}

// The navigation disclosure stays independent of route reads and domain writes.
export function installReferenceMenu(root,document=globalThis.document) {
  const current=()=>root.querySelector?.('.reference-more[open]');
  const dismiss=(restoreFocus=false)=>{const menu=current();if(!menu)return;menu.open=false;if(restoreFocus)menu.querySelector?.('summary')?.focus?.({preventScroll:true});};
  document?.addEventListener?.('pointerdown',event=>{const menu=current();if(menu&&!menu.contains(event.target))dismiss();});
  document?.addEventListener?.('focusin',event=>{const menu=current();if(menu&&!menu.contains(event.target))dismiss();});
  root.addEventListener('click',event=>{const button=event.target.closest?.('button[data-page]');const menu=current();if(button&&menu?.contains(button))dismiss();},true);
  document?.addEventListener?.('keydown',event=>{
    const open=current(),menu=open||root.querySelector?.('.reference-more');
    if(!menu||!menu.contains(event.target))return;
    if(event.key==='Escape'&&open){dismiss(true);event.preventDefault?.();event.stopImmediatePropagation?.();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const summary=menu.querySelector?.('summary');
    if(!open&&event.target!==summary)return;
    const buttons=[...(menu.querySelectorAll?.('.reference-menu [data-page]')||[])];
    if(!buttons.length)return;
    menu.open=true;
    const index=buttons.indexOf(document.activeElement);
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(index+1)%buttons.length:(index<0?buttons.length-1:(index-1+buttons.length)%buttons.length);
    buttons[next].focus?.({preventScroll:false});event.preventDefault?.();event.stopImmediatePropagation?.();
  });
}
export function referenceCards(entity,records,{status,date,money}) {
  const safe=escapeHtml;
  return `<div class="today-grid">${records.map(record=>`<button type="button" class="today-card" data-open="${safe(record.id)}" data-entity="${safe(entity==='events'?record.entity:entity)}">${imageMarkup(record.cover)}<span class="today-card-kind">${safe(['events','gigs','schedule'].includes(entity)?eventLabel(record,entity==='events'?record.entity:entity):{tasks:'Saved task',finances:'Financial record'}[entity])}</span><strong>${safe(record.title || 'Untitled')}</strong><span class="today-card-status">${safe(status(record)||'Status not set')}</span><span class="today-card-footer"><span>${safe(record.date?date(record.date):'No date recorded')}</span><span>${entity==='events'?`${safe(scheduleEntry(record).time)} · `:''}${safe(entity==='finances'?[record.fields?.Direction||'Direction not set',money(record.moneyCents)].join(' · '):'Open record ↗')}</span></span></button>`).join('')}</div>`;
}
