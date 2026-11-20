import {createGigs} from './gigs.mjs';
import {icon,entityIcon} from './icons.mjs';
import {statusLabel} from './desktop-polish.mjs';
import {localToday} from './experience.mjs';

const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const finishedTask=value=>['done','complete','completed','cancelled','canceled','archive','archived'].includes(String(value??'').trim().toLowerCase());

// Reuse the collection's cancellation, paging and workspace-scoped view state.
// The native Tasks query applies all date/status/search rules before paging.
export function createTasks({read,...options}) {
  return createGigs({...options,storagePrefix:'gigi:tasks',read:(workspace,criteria,cursor)=>read(workspace,{view:({upcoming:'soon',past:'done',all:'all'})[criteria.view]||'soon',query:criteria.query},cursor)});
}
export function calmHeading(entity,title,description,action='') {
  return `<header class="page-head calm-heading"><div class="calm-heading-title"><span class="calm-page-icon">${icon(entityIcon(entity))}</span><div><h1>${safe(title)}</h1><p class="subhead">${safe(description)}</p></div></div>${action}</header>`;
}
export function taskDateLabel(record,today=localToday()) {
  if(!record.date)return 'No date';
  const date=new Date(`${record.date}T12:00:00`);
  if(!Number.isFinite(date.getTime()))return 'Date needs attention';
  const tomorrow=new Date(`${today}T12:00:00`);tomorrow.setDate(tomorrow.getDate()+1);
  const dateLabel=record.date===today?'Today':record.date===localToday(tomorrow)?'Tomorrow':new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',...(record.date.slice(0,4)!==today.slice(0,4)?{year:'numeric'}:{})}).format(date);
  return `${record.dateSource==='planned'?'Planned · ':''}${dateLabel}${record.date<today&&record.dateSource!=='planned'&&!finishedTask(record.status)?' · overdue':''}`;
}
export function tasksView(state,{busy=false}={}) {
  const s=state||{criteria:{view:'upcoming',query:''}},c=s.criteria,r=s.result,items=r?.items||[],pending=s.loading||s.error||s.stale;
  const tabs=[['upcoming','Due soon','soon'],['all','All open','all'],['past','Done','done']].map(([value,label,key])=>`<button type="button" class="btn" data-tasks-view="${value}" aria-pressed="${c.view===value}">${label}${!pending&&r?.viewCounts?.[key]!==undefined?` <span class="calm-view-count">${r.viewCounts[key]}</span>`:''}</button>`).join('');
  const resultText=s.loading?'Loading tasks…':s.error?'Couldn’t refresh tasks.':s.stale?'Refresh to see the latest tasks.':`${r?.count||0} ${(r?.count||0)===1?'task':'tasks'}${r?.nextCursor?` · showing ${items.length}`:''}`;
  const rows=items.map(record=>`<div class="calm-task-row ${finishedTask(record.status)?'is-finished':''}"><div class="calm-task-name"><input type="checkbox" data-complete-task="${safe(record.id)}" aria-label="${finishedTask(record.status)?'Completed':'Complete'} ${safe(record.title)}" ${finishedTask(record.status)?'checked disabled':busy||pending?'disabled':''}><button type="button" class="calm-record-name" data-open="${safe(record.id)}" data-entity="tasks">${safe(record.title||'Untitled task')}${['high','urgent'].includes(String(record.priority||'').toLowerCase())?`<span class="calm-priority">${safe(record.priority)}</span>`:''}</button></div><span class="calm-date ${record.date&&record.date<(r?.today||localToday())&&record.dateSource!=='planned'&&!finishedTask(record.status)?'is-overdue':''}">${safe(taskDateLabel(record,r?.today||localToday()))}</span><span class="calm-status">${safe(statusLabel(record.status)||'Not set')}</span></div>`).join('');
  const empty=!pending&&!items.length?`<div class="calm-empty">${icon('list-checks')}<h2>${c.query?'No matching tasks.':c.view==='past'?'Completed tasks will appear here.':c.view==='upcoming'?'Nothing due soon.':'No open tasks.'}</h2><p>${c.query?'Try another search.':c.view==='upcoming'?'Overdue tasks and work dated today or tomorrow appear here.':'Add a task when there’s something to do.'}</p>${c.view==='upcoming'?'<button type="button" class="btn" data-tasks-view="all">View all open tasks</button>':''}</div>`:'';
  return `<section class="calm-collection tasks-panel" aria-label="Tasks"><div class="calm-toolbar"><div class="calm-tabs" role="group" aria-label="Task views">${tabs}</div><div class="field calm-search"><label for="tasks-search">Search tasks</label><input id="tasks-search" type="search" value="${safe(c.query)}" maxlength="160" autocomplete="off" aria-controls="tasks-results" placeholder="Find a task"></div></div><div class="calm-list-meta"><span role="status" aria-live="polite">${safe(resultText)}</span><button type="button" class="btn text" data-tasks-refresh="1" ${s.loading?'disabled':''}>Refresh</button></div>${s.error?`<div class="callout" role="alert">${safe(s.error)} <button type="button" class="btn" data-tasks-refresh="1">Try again</button></div>`:''}${pending&&items.length?'<p class="muted">Previous results are shown below.</p>':''}<div id="tasks-results" aria-busy="${Boolean(s.loading)}">${items.length?`<div class="calm-list"><div class="calm-list-columns calm-task-columns"><span>Task</span><span>Date</span><span>Status</span></div>${rows}</div>`:empty}${r?.nextCursor?`<button type="button" class="btn section-gap" data-tasks-more="1" ${pending?'disabled':''}>Load more tasks</button>`:''}</div></section>`;
}

export async function completeTask(bridge,workspace,listed,current=()=>true) {
  const record=await bridge.getRecord(workspace,'tasks',listed.id,'full');
  if(!current())return null;
  if(record.workspaceId&&record.workspaceId!==workspace)throw Error('This task belongs to another workspace.');
  if(listed.updatedAt&&record.updatedAt!==listed.updatedAt)throw Error('This task changed. Refresh it before completing it.');
  if(!finishedTask(record.fields?.Status)) {
    await bridge.saveRecord(workspace,'tasks',{id:record.id,title:record.title,fieldsMode:'replace',expectedRecord:{title:record.title,fields:record.fields,source:record.source},fields:{...record.fields,Status:'Done'}});
  }
  const confirmed=await bridge.getRecord(workspace,'tasks',record.id,'full');
  if(!finishedTask(confirmed.fields?.Status))throw Error('Completion could not be confirmed. Refresh this task before trying again.');
  return confirmed;
}

// Basic fields are visible; every existing field remains in the form or in the
// selected full record merged by editedFields. No date or custom status is lost.
export function calmEditorFields(entity,markup) {
  const basics=entity==='tasks'?['Status','Due Date','Priority']:['Status','Date','Call Time','Set Time','Requirements'];
  return `<div class="form-grid">${basics.map(field=>markup.get(field)||'').join('')}</div><details class="calm-more" data-view-key="work-editor-more"><summary>More details</summary><div class="form-grid">${[...markup].filter(([field])=>!basics.includes(field)).map(([,html])=>html).join('')}</div></details>`;
}
